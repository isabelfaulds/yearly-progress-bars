package main

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

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

		// Setup dynamo
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	dbClient := dynamodb.NewFromConfig(cfg)
	tableName := "pb_users"

	// Create base key for DynamoDB update
	key := map[string]types.AttributeValue{
    "user_id": &types.AttributeValueMemberS{Value: dynamoKey},
}

	input := &dynamodb.GetItemInput{
	TableName:      &tableName,
	Key:           key,
	ProjectionExpression: aws.String("categoryIconStyle"), // hard coded attribute, TODO: generalize
}

    result, err := dbClient.GetItem(ctx, input)
    if err != nil {
		log.Printf("unable to get item, %v", err)
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers: returnHeaders,
				Body: fmt.Sprintf(`{"message": "Failed to fetch categoryIconStyle"}`),
			}, nil
    }

	    // Handle missing item or attribute
    if result.Item == nil || result.Item["categoryIconStyle"] == nil {
        return events.APIGatewayProxyResponse{
            StatusCode: 200,
            Headers:    returnHeaders,
            Body:       `{"categoryIconStyle": null}`,  // Explicit null
        }, nil
    }
	
    // Extract the attribute value
    var iconStyle string
    if err := attributevalue.Unmarshal(result.Item["categoryIconStyle"], &iconStyle); err != nil {
		log.Printf("unable to unmarshal item, %v", err)
			return events.APIGatewayProxyResponse{
				StatusCode: 500,
				Headers: returnHeaders,
				Body: fmt.Sprintf(`{"message": "Failed to fetch categoryIconStyle"}`),
			}, nil
    }


	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: returnHeaders,
		Body:       fmt.Sprintf(`{"categoryIconStyle": %s}`, iconStyle),
	}, nil
}


func main() {
	lambda.Start(Handler)
}