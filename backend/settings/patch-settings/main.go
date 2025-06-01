package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

// Allowed origins
var allowedOrigins = []string{
	"https://year-progress-bar.com",
	"https://localhost:5173",
}

var corsHeaders = map[string]string{
	"Access-Control-Allow-Methods":      "PATCH,GET,OPTIONS",
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

// Update Event
type UpdateEvent struct {
	UpdateAttribute  string   `json:"updateAttribute"`
	UpdateValue string `json:"updateValue"`
}

// Request Struct
type RequestBody struct {
	Updates  []UpdateEvent   `json:"updates"`
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
	dynamoKey := event.Headers["user-id"]
	log.Println("user" , dynamoKey)

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

	// Setup dynamo
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: returnHeaders,
			Body: fmt.Sprintf(`{"message": "Error in dynamodb configuration: %v"}`, err),
		}, nil
	}
	dbClient := dynamodb.NewFromConfig(cfg)
	tableName := "pb_users"

	// Create base key for DynamoDB update
	key := map[string]types.AttributeValue{
    "user_id": &types.AttributeValueMemberS{Value: dynamoKey},
}
	// Update each item, assumes strings
	for _, update := range body.Updates {
		updateExpression := "SET " + update.UpdateAttribute + " = :val"
		input := &dynamodb.UpdateItemInput{
			TableName: &tableName,
			Key: key,
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":val": &types.AttributeValueMemberS{Value: update.UpdateValue},
			},
			UpdateExpression: &updateExpression,
		}

		_, err = dbClient.UpdateItem(ctx, input)
		if err != nil {
			log.Printf("Failed to update attribute %s: %v", update.UpdateAttribute, err)
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers: returnHeaders,
				Body: fmt.Sprintf(`{"message": "Failed to update %s"}`, update.UpdateAttribute),
			}, nil
		
		}

	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: returnHeaders,
		Body:       `{"message": "User settings updated successfully"}`,
	}, nil
}


func main() {
	lambda.Start(Handler)
}