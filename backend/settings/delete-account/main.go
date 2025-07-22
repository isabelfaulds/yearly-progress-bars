package main

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// table : user index name
type TableInfo struct {
	GSIIndexName string
	PartitionKeyName string
}
var deleteTables = map[string]TableInfo{
	"pb_calendars": {
		GSIIndexName:   "UserIndex",
		PartitionKeyName: "calendar_uid",
	},
	"pb_categories": {
		GSIIndexName:   "UserIdIndex",
		PartitionKeyName: "category_uid",
	},
	"pb_day_metrics": {
		GSIIndexName:   "UserIndex",
		PartitionKeyName: "user_date_uid",
	},
	"pb_events": {
		GSIIndexName:   "UserIdDateIndex",
		PartitionKeyName: "event_uid", 
	},
	"pb_gtasklists": {
		GSIIndexName:   "UserIndex",
		PartitionKeyName: "tasklist_id",
	},
	"pb_milestones": {
		GSIIndexName:   "UserIndex",
		PartitionKeyName: "milestone_user_datetime_uid",
	},
}

// Allowed origins for CORS
var allowedOrigins = []string{
	"https://year-progress-bar.com",
	"https://localhost:5173",
}

// Common CORS headers
var corsHeaders = map[string]string{
	"Access-Control-Allow-Methods":     "GET, OPTIONS", 
	"Access-Control-Allow-Headers":     "Content-Type, Origin",
	"Access-Control-Allow-Credentials": "true",
	"Content-Type":                     "application/json",
}

// Helper to check if a string is in a slice
func contains(slice []string, item string) bool {
	for _, a := range slice {
		if a == item {
			return true
		}
	}
	return false
}


func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

// Set response headers for CORS
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

// Get User
	userID := event.Headers["user-id"]
	if userID == "" {
		log.Println("ERROR: Missing 'user-id' header")
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    returnHeaders,
			Body:       `{"message": "Missing 'user-id' header"}`,
		}, nil
	}
	log.Printf("Processing deletion for user ID: %s", userID)

// Create DynamoDB client
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {
		log.Printf("ERROR: unable to load SDK config, %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Could not load AWS config"}`,
		}, nil
	}
	svc := dynamodb.NewFromConfig(cfg)

// Query and Delete from Each

	for tableName, details := range deleteTables {
		fmt.Printf("Table: %s, User Index Name: %s, PK Name: %s", tableName, details.GSIIndexName, details.PartitionKeyName)
		// Query for rows containing user_id using SI
		queryOutput, err := svc.Query(ctx, &dynamodb.QueryInput{
			TableName:              aws.String(tableName),
			IndexName:              aws.String(details.GSIIndexName),
			// attribute name always user_id
			KeyConditionExpression: aws.String("user_id = :uid"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":uid": &types.AttributeValueMemberS{Value: userID},
			},
		})

		if err != nil {
			fmt.Printf("failed to query items for %s, %v\n", tableName, err)
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers:    returnHeaders,
				Body:       `{"message": "Failed to delete user data"}`,
			}, nil
		}

		if len(queryOutput.Items) == 0 {
			fmt.Printf("No %s items found for user_id: %s\n", tableName, userID)
			continue
		}

		fmt.Printf("Found %d items in table %s for user_id '%s'. Deleting...\n",
			len(queryOutput.Items), tableName, userID)

		deleteRequests := []types.WriteRequest{}
		for _, item := range queryOutput.Items {
			baseTableKey := make(map[string]types.AttributeValue)
			// Using the partition key from the queried rows
			pkAttr, pkExists := item[details.PartitionKeyName] 
			if !pkExists {
				fmt.Printf("Warning: Item from table %s is missing primary key '%s'. Skipping delete for item: %v\n", tableName, details.PartitionKeyName, item)
				continue
			}
			pk := pkAttr.(*types.AttributeValueMemberS).Value // string partition keys
			baseTableKey[details.PartitionKeyName] = &types.AttributeValueMemberS{Value: pk}

			deleteRequests = append(deleteRequests, types.WriteRequest{
				DeleteRequest: &types.DeleteRequest{Key: baseTableKey},
			})

		}

		if len(deleteRequests) == 0 {
			log.Printf("INFO: No valid delete requests compiled for table %s.\n", tableName)
			continue
		}

		// Perform batch deletions, loop through batches of 25
		for i := 0; i < len(deleteRequests); i += 25 {
			end := i + 25
			if end > len(deleteRequests) {
				end = len(deleteRequests)
			}
			batch := deleteRequests[i:end]
			_, err := svc.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{
				RequestItems: map[string][]types.WriteRequest{
					tableName: batch,
				},
			})
			if err != nil {
				errMessage := fmt.Errorf("ERROR: failed to batch delete items from table %s, %w", tableName, err)
				fmt.Println(errMessage)
				continue
			}
			fmt.Printf("Successfully sent batch delete request for %d items from table %s\n", len(batch), tableName)
		}
	}


	fmt.Printf("Completed deletion process for user: %s", userID)
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    returnHeaders,
		Body:       "Deleted user data",
	}, nil
}

func main() {
	lambda.Start(Handler)
}