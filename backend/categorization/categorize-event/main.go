package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

// Original Event
type UserEvent struct {
	EventName  string   `json:"eventName"`
	EventUID string `json:"eventUID"`
}

// Labeled Event
type LabeledUserEvent struct {
	EventUID string `json:"eventUID"` 
	Category string `json:"category"`
}

// Request Struct
type RequestBody struct {
	UserEvents  []UserEvent   `json:"events"`
	Categories []string `json:"categories"`
}

// Response Struct
type ResponseBody struct {
	LabeledEvents        []LabeledUserEvent
}

// Allowed origins
var allowedOrigins = []string{
	"https://year-progress-bar.com",
	"https://localhost:5173",
}

var corsHeaders = map[string]string{
	"Access-Control-Allow-Methods":      "POST",
	"Access-Control-Allow-Headers":      "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
	"Access-Control-Allow-Credentials":  "true",
	"Content-Type":                      "application/json",
}

// check if string in slice
func contains(slice []string, item string) bool {
	for _, a := range slice {
		if a == item {
			return true
		}
	}
	return false
}

// format comma list string
func formatCategoryList(categories []string) string {
	return fmt.Sprintf("(%s)", strings.Join(categories, ","))
}

// format prompt
func formatUserPrompt(eventName string, categories string) string {
    return fmt.Sprintf("Classify the following calendar event name: \"%s\" into one of the categories: %s or 'uncategorized'", eventName, categories)
}

func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// set response headers
	accessControlAllowOrigin := allowedOrigins[0]
	origin, ok := event.Headers["origin"]
	if !ok {
		origin, ok = event.Headers["Origin"]
	}
	if ok && contains(allowedOrigins, origin) { 
		accessControlAllowOrigin = origin
	}
	returnHeaders := make(map[string]string)
	for k, v := range corsHeaders {
		returnHeaders[k] = v
	}
	returnHeaders["Access-Control-Allow-Origin"] = accessControlAllowOrigin
	
	// Format , log input
	log.Println("Raw event body:", event.Body)
    	var body RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		log.Printf("Failed to parse body: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: returnHeaders,
			Body: fmt.Sprintf(`{"message": "Error marshaling response: %v"}`, err),
		}, nil
	}
	log.Println("Parsed event body:", body)
    userEvents := body.UserEvents
    log.Println("Events:", userEvents)
	for i, evt := range userEvents {
	log.Printf("Event %d: Name='%s', UID='%s'", i, evt.EventName, evt.EventUID)
	}
    formattedCategories := formatCategoryList(body.Categories)
	log.Println("Categories:", formattedCategories)

	// Setup open ai
    openai_key := os.Getenv("OPENAPI_KEY")
    client := openai.NewClient(option.WithAPIKey(openai_key))
    sysprompt := "You are a helpful assistant that classifies calendar event names into predefined categories. Return only one category from the list below or 'uncategorized' if none apply. Respond with exactly one category and no punctuation."
    
	// Setup dynamo
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	dbClient := dynamodb.NewFromConfig(cfg)
	tableName := "pb_events"

	var labeledEvents []LabeledUserEvent
	for _, value := range userEvents {

		// gpt query
		fmt.Println("Value", value.EventName)
		userprompt := formatUserPrompt(value.EventName, formattedCategories)
    	log.Println(userprompt)
		chatCompletion, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(userprompt),
				openai.SystemMessage(sysprompt),
			},
			Model: openai.ChatModelGPT4o,
		})
		if err != nil {
           log.Printf("Error calling OpenAI API for event '%s': %v", value.EventName, err)
            continue
		}
		// Add to response
		labeledEvents = append(labeledEvents, LabeledUserEvent{
			EventUID : value.EventUID,
			Category : chatCompletion.Choices[0].Message.Content,
		})

		// Update dynamo
		updateInput := &dynamodb.UpdateItemInput{
			TableName: &tableName,
			Key: map[string]types.AttributeValue{
				"event_uid": &types.AttributeValueMemberS{Value: value.EventUID},
			},
			UpdateExpression: aws.String("SET #cat = :category_val"),
			ExpressionAttributeNames: map[string]string{
				// dynamodb table attribute
				"#cat": "category",
			},
			ExpressionAttributeValues: map[string]types.AttributeValue{
				// new category value
				":category_val": &types.AttributeValueMemberS{Value: chatCompletion.Choices[0].Message.Content}, 
			},
			ReturnValues: types.ReturnValueUpdatedNew,
		}
		_, err = dbClient.UpdateItem(ctx, updateInput)
		if err != nil {
			log.Fatalf("failed to update item, %v", err)
		} else {
			log.Printf("Successfully updated DynamoDB for EventUID '%s' with category '%s'", value.EventUID,  chatCompletion.Choices[0].Message.Content)
		}

	}

	responseBody := ResponseBody{
			LabeledEvents : labeledEvents,
		}
	// Make response into string return
	jsonResponseBody, err := json.Marshal(responseBody)
    if err != nil {
        log.Printf("Failed to marshal response body: %v", err)
        return events.APIGatewayProxyResponse{
            StatusCode: 500,
            Headers: returnHeaders,
            Body: fmt.Sprintf(`{"message": "Failed to generate JSON response: %v"}`, err),
        }, nil
    }
	return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers: returnHeaders,
			Body: string(jsonResponseBody),
		}, nil
	}

func main() {
    lambda.Start(Handler) 
}
