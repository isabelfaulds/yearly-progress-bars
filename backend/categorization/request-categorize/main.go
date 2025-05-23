package main

import (
	"context"
	"encoding/json"
	"log"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	sdk_lambda "github.com/aws/aws-sdk-go-v2/service/lambda"
	sdk_lambda_types "github.com/aws/aws-sdk-go-v2/service/lambda/types"
)

type Event struct {
	EventName string `json:"eventName"`
	EventUID int `json:"eventUID"`
}

type RequestBody struct {
	Categories []string `json:"categories"`
	Events []Event `json:"events"`
}

type ResponseBody struct {
	Events []Event `json:"labeledEvents"`
}

type CategorizeLambdaRequest struct {
	Operation string `json:"operation"`
	Data string `json:"data"`
}

type CategorizeLambdaResponse struct {
	EventName string`json:"eventName"`
	Category string `json:"category"`
}

func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (ResponseBody, error) {
	log.Println("Raw event body:", event.Body)
    	var body RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		log.Printf("Failed to parse body: %v", err)
		return ResponseBody{}, err
	}

	categories := body.Categories
	log.Println("Categories:", categories)


	return ResponseBody{}, nil
}

func main() {
	lambda.Start(Handler)
}