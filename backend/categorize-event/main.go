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
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

// Request Struct
type RequestBody struct {
	EventName  string   `json:"event_name"`
	Categories []string `json:"categories"`
    
}

// Response Struct
type ResponseBody struct {
	EventName        string `json:"eventName"`
	NewEventCategory string `json:"newEventCategory"`
}

func formatCategoryList(categories []string) string {
	return fmt.Sprintf("(%s)", strings.Join(categories, ","))
}

func formatUserPrompt(eventName string, categories string) string {
    return fmt.Sprintf("Classify the following calendar event name: \"%s\" into one of the categories: %s or 'uncategorized'", eventName, categories)
}

func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (ResponseBody, error) {
	log.Println("Raw event body:", event.Body)
    	var body RequestBody
	if err := json.Unmarshal([]byte(event.Body), &body); err != nil {
		log.Printf("Failed to parse body: %v", err)
		return ResponseBody{}, err
	}
    eventName := body.EventName
	categories := body.Categories
    log.Println("Event Name:", eventName)
	log.Println("Categories:", categories)

    formattedCategories := formatCategoryList(body.Categories)
	log.Println("Categories:", formattedCategories)

    openai_key := os.Getenv("OPENAPI_KEY")
    sysprompt := "You are a helpful assistant that classifies calendar event names into predefined categories. Return only one category from the list below or 'uncategorized' if none apply. Respond with exactly one category and no punctuation."
    userprompt := formatUserPrompt(eventName, formattedCategories)
    log.Println(userprompt)
    client := openai.NewClient(option.WithAPIKey(openai_key))
	chatCompletion, err := client.Chat.Completions.New(context.TODO(), openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(userprompt),
            openai.SystemMessage(sysprompt),
		},
		Model: openai.ChatModelGPT4o,
	})
	if err != nil {
		panic(err.Error())
	}
    newEventCategory := chatCompletion.Choices[0].Message.Content
	println(newEventCategory)
    responseBody := ResponseBody{
		EventName:        eventName,
		NewEventCategory: newEventCategory,
	}

	return responseBody, nil
}

func main() {
    lambda.Start(Handler) 
}
