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

func formatCategoryList(categories []string) string {
	return fmt.Sprintf("(%s)", strings.Join(categories, ","))
}

func formatUserPrompt(eventName string, categories string) string {
    return fmt.Sprintf("Classify the following calendar event name: \"%s\" into one of the categories: %s or 'uncategorized'", eventName, categories)
}

func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (ResponseBody, error) {
	// Format , log input
	log.Println("Raw event body:", event.Body)
    	var body RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		log.Printf("Failed to parse body: %v", err)
		return ResponseBody{}, err
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
	return responseBody, nil
}

func main() {
    lambda.Start(Handler) 
}
