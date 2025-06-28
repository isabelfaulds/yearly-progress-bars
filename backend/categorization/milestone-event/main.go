package main

import (
	"context"
	"encoding/json" // unmarshal , remarshal
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/aws/aws-lambda-go/events" // import for sqs events
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

// SQS Message Body : {"EventUID": ""}
type EventMessageBody struct {
	EventUID                  string `json:"EventUID"`
}

//  Calendar Event in dynamo
type CalendarEvent struct {
	Event_UID    string `dynamodbav:"event_uid"`      // partition_key
	User_ID string `dynamodbav:"user_id"` 
	Category  string `dynamodbav:"category,omitempty"` // attributes
	Category_UID string    `dynamodbav:"category_uid,omitempty"`
	Event_Name string    `dynamodbav:"event_name,omitempty"`
	Event_Startdate string `dynamodbav:"event_startdate,omitempty"`
	Minutes int    `dynamodbav:"minutes,omitempty"`
}


// Milestone
type UserMilesone struct {
	Milestone_User_Datetime_UID string `dynamodbav:"milestone_user_datetime_uid"`
	Milestone string `dynamodbav:"milestone"`
	Category_UID string `dynamodbav:"category_uid"`
	User_ID string `dynamodbav:"user_id"`
}

var svc *dynamodb.Client
var tableName string
var openaiClient openai.Client
var sysprompt string

func init() {
	
	// Setup dynamo
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	svc = dynamodb.NewFromConfig(cfg)	
	tableName = "pb_events"

	// Setup open ai
    openai_key := os.Getenv("OPENAPI_KEY")
    openaiClient = openai.NewClient(option.WithAPIKey(openai_key))
    sysprompt = `You are a highly precise classifier. Your task is to determine if a given calendar event directly contributes to a specific user-defined Project. You will be given the description of one calendar event and the name of one project. Respond only with 'yes' if the event clearly helps progress the project, or 'unknown' if it does not or the relationship is unclear.
**Your response must be only one word: "yes" or "unknown".**`
}

func QueryMilestonesByCategoryUID(ctx context.Context, targetCategoryUID string) ([]UserMilesone, error){
	keyConditionExpression := "#category_uid = :category_uid_val"
	expressionAttributeNames := map[string]string{
		"#category_uid": "category_uid",
	}
	expressionAttributeValues, err := attributevalue.MarshalMap(map[string]string{
		":category_uid_val": targetCategoryUID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal expression attribute values: %w", err)
	}

	input := &dynamodb.QueryInput{
		TableName:                 aws.String("pb_milestones"),
		IndexName:                 aws.String("UserCategoryIndex"),
		KeyConditionExpression:    aws.String(keyConditionExpression),
		ExpressionAttributeNames:  expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		// returning certain attributes
		ProjectionExpression: aws.String("milestone_user_datetime_uid, milestone, category_uid, user_id"),
		ConsistentRead: aws.Bool(false), // gsi always eventually consistent
	}

	result, err := svc.Query(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to query DynamoDB index %s: %w", "UserCategoryIndex", err)
	}

	var milestones []UserMilesone
	err = attributevalue.UnmarshalListOfMaps(result.Items, &milestones)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal query results: %w", err)
	}

	return milestones, nil

}

// format prompt
func formatUserPrompt(eventName string, milestone string) string {
    return fmt.Sprintf(`Calendar Event: %s
	Project: %s
	Does this event contribute to this project?`, eventName, milestone)
}

func HandleRequest(ctx context.Context, sqsEvent events.SQSEvent) error {
	batchItemFailures := []events.SQSBatchItemFailure{}

	for _, message := range sqsEvent.Records {
		messageID := message.MessageId
		fmt.Printf("Received SQS message ID: %s\n", message.MessageId)
		fmt.Printf("Message Body: %s\n", message.Body)
		// Unmarshal json body
		var eventData EventMessageBody
		err := json.Unmarshal([]byte(message.Body), &eventData)
		if err != nil {
			fmt.Printf("Error unmarshaling message body: %v\n", err)
			// Continue with rest of batch
			continue
		}
		fmt.Printf("Processing event ID: %s", eventData.EventUID)

		// Fetch current category from dynamodb
		// Marshal key for get event
		key, err := attributevalue.MarshalMap(map[string]string{"event_uid": eventData.EventUID})
		if err != nil {
			log.Fatalf("failed to marshal key: %v", err)
		}
		// Get Event
		getItemInput := &dynamodb.GetItemInput{
			TableName: aws.String(tableName), 
			Key:       key,                
		}
		result, err := svc.GetItem(context.TODO(), getItemInput)
		if err != nil {
			fmt.Printf("failed to get item from DynamoDB: %v", err)
			batchItemFailures = append(batchItemFailures, events.SQSBatchItemFailure{
				ItemIdentifier: message.MessageId,
			})
			continue // Move to the next message in the batch
		}
		if result.Item == nil {
			fmt.Printf("Event with ID '%s' not found in table '%s'\n", eventData.EventUID, tableName)
			batchItemFailures = append(batchItemFailures, events.SQSBatchItemFailure{
				ItemIdentifier: message.MessageId,
			})
			continue // Move to the next message in the batch
		}
		// End if no category
		var calendarEvent CalendarEvent
		err = attributevalue.UnmarshalMap(result.Item, &calendarEvent)
		if err != nil {
			fmt.Printf("failed to unmarshal item: %v", err)
			batchItemFailures = append(batchItemFailures, events.SQSBatchItemFailure{
				ItemIdentifier: message.MessageId,
			})
			continue // Move to the next message in the batch
		}

		if calendarEvent.Category == "" {
           fmt.Printf("INFO: Event %s has no category set. Skipping further processing and marking as handled.\n", calendarEvent.Event_UID)
            continue // Move to the next message in the batch
		}

		// Fetch milestones for category
		fmt.Printf("INFO: Event %s has category set. Checking for milestones.", calendarEvent.Event_UID)
		fmt.Println("INFO: Event", calendarEvent)
		categoryMilestones, err := QueryMilestonesByCategoryUID(ctx, calendarEvent.Category_UID)
		if err != nil {
			log.Printf("ERROR: Failed to query milestones for Category_UID %s (Message ID: %s): %v\n", calendarEvent.Category_UID, messageID, err)
			batchItemFailures = append(batchItemFailures, events.SQSBatchItemFailure{ ItemIdentifier: messageID })
			continue
		}
		fmt.Println("CategoryMilestones", categoryMilestones)
		// End if no milestones
		if len(categoryMilestones) == 0 {
           fmt.Printf("INFO: Event %s has no related milestones set. Skipping further processing and marking as handled.\n", calendarEvent.Event_UID)
            continue // Move to the next message in the batch
		}

		// For each milestone:
		for _ , milestone := range categoryMilestones {
			userprompt := formatUserPrompt(calendarEvent.Event_Name, milestone.Milestone)
			log.Println(userprompt)
			// Configure llm api
			// Query if milestone event match


			chatCompletion, err := openaiClient.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
				Messages: []openai.ChatCompletionMessageParamUnion{
					openai.UserMessage(userprompt),
					openai.SystemMessage(sysprompt),
				},
				Model: openai.ChatModelGPT4o,
			})
			if err != nil {
			log.Printf("Error calling OpenAI API for event '%s': %v", calendarEvent.Event_Name, err)
				continue
			}
			result := chatCompletion.Choices[0].Message.Content
			log.Println("result", result)
			if result == "yes" {
				// Put to dynamodb
				input := &dynamodb.PutItemInput{
					TableName: aws.String("pb_milestone_sessions"),
					Item: map[string]types.AttributeValue{
						"milestone_session_uid":  &types.AttributeValueMemberS{Value: calendarEvent.Event_UID+":"+milestone.Milestone_User_Datetime_UID },
						"milestone_user_datetime_uid": &types.AttributeValueMemberS{Value: milestone.Milestone_User_Datetime_UID},
						"milestone": &types.AttributeValueMemberS{Value: milestone.Milestone},
						"event_name": &types.AttributeValueMemberS{Value: calendarEvent.Event_Name},
						"user_id": &types.AttributeValueMemberS{Value: calendarEvent.User_ID},
						"category": &types.AttributeValueMemberS{Value: calendarEvent.Category},
						"category_uid": &types.AttributeValueMemberS{Value: calendarEvent.Category_UID},
						"event_startdate": &types.AttributeValueMemberS{Value: calendarEvent.Event_Startdate},
						"minutes":      &types.AttributeValueMemberN{Value: strconv.Itoa(calendarEvent.Minutes)},
					},
				}
				_, err := svc.PutItem(context.TODO(), input)
				if err != nil {
				log.Printf("Error inserting milestone calendar session event '%s': %v", calendarEvent.Event_Name, err)
					continue
				}
				log.Printf("Inserted calendar calendar session event '%s' for milestone '%s'", calendarEvent.Event_Name, milestone.Milestone )

			} else {
				log.Println("No match for milestone")
			}

			
		}



		fmt.Println("--- End of message processing ---")
	}
	return nil // Return nil, all messages in the batch processed successfully
}

func main() {
	lambda.Start(HandleRequest)
}