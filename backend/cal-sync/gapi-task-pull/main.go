package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"os"
	"time"

	// "strings"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/option"
	"google.golang.org/api/tasks/v1"
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

type APIToken struct {
	User_ID    string `dynamodbav:"user_id"`      // partition_key
	AccessToken  string `dynamodbav:"accessToken,omitempty"` // attribute
	RefreshToken string    `dynamodbav:"refreshToken,omitempty"`
}

type TaskInfo struct {
	User_ID string `json:"user_id"`
	Title    string `json:"title"`
	Event_date string `json:"event_date"`
}

type ResponseBody struct {
	Tasks []TaskInfo `json:"tasks"`
}

func Handler(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	user_id := event.Headers["user-id"] // Partition key value
	// Set response headers
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

// Get Auth Token
	// Setup dynamo
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {

		log.Printf("ERROR: unable to load SDK config: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: SDK config failure\"}",
		}, nil
	}
	svc := dynamodb.NewFromConfig(cfg)
	tableName := "pb_user_tokens"
	// Marshal user id
	key, err := attributevalue.MarshalMap(map[string]string{"user_id": user_id})
	if err != nil {
		log.Printf("ERROR: unable to marshal key: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: Couldn't query user\"}",
		}, nil
	}
	// Get Token
	getItemInput := &dynamodb.GetItemInput{
		TableName: aws.String(tableName), 
		Key:       key,                
	}
	result, err := svc.GetItem(context.TODO(), getItemInput)
	if err != nil {
		log.Printf("ERROR: unable to marshal key: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: Couldn't query user\"}",
		}, nil
	}
	if result.Item == nil {
		fmt.Printf("Item with ID '%s' not found in table '%s'\n", user_id, tableName)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: returnHeaders,
			Body: string("Item not found in table"),
		}, nil
	}
	// Unmarshal
	var authToken APIToken
	err = attributevalue.UnmarshalMap(result.Item, &authToken)
	if err != nil {
		log.Printf("ERROR: unable to marshal key: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: Couldn't query user\"}",
		}, nil
	}
	fmt.Printf("User: %s \n accessToken %s \n refreshToken %s", authToken.User_ID, authToken.AccessToken, authToken.RefreshToken)


// Create oauth 
	googleClientID := os.Getenv("CLIENT_ID")
	googleClientSecret := os.Getenv("CLIENT_SECRET")
	log.Println(googleClientID, googleClientSecret)

	oauthConfig := &oauth2.Config{
    ClientID:     googleClientID,
    ClientSecret: googleClientSecret,
    RedirectURL:  "urn:ietf:wg:oauth:2.0:oob", // placeholder for server-side, not doing full auth flow
    Scopes:       []string{"https://www.googleapis.com/auth/tasks.readonly"},
    Endpoint:     google.Endpoint, // Standard Google OAuth2 endpoint
}

	token := &oauth2.Token{
		AccessToken:  authToken.AccessToken,
		RefreshToken: authToken.RefreshToken,
		TokenType:    "Bearer",
	}
	tokenSource := oauthConfig.TokenSource(ctx, token)
	httpClient := oauth2.NewClient(ctx, tokenSource)
	log.Println("Initialized HTTP client for Google API:", httpClient)

// Specify Query
	// Test ID
	var testTaskListID = user_id; // fauldisabel@gmail.com, switch to dynamodb get task ids
	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	tomorrowStart := todayStart.Add(24 * time.Hour)
	dueMin := todayStart.Format(time.RFC3339)
	dueMax := tomorrowStart.Format(time.RFC3339)

// Get Tasks
	srv, err := tasks.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		log.Printf("ERROR: unable to marshal key: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: Couldn't query user tasks\"}",
		}, nil
	}
	tasksResp, err := srv.Tasks.List(testTaskListID).
	ShowCompleted(true). // Including completed tasks
	DueMin(dueMin).
	DueMax(dueMax).
	Do()
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: Unable to query user tasks\"}",
		}, nil
	}
	if len(tasksResp.Items) == 0 {
		fmt.Println("No tasks for today.")
	} 
	var tasks[] TaskInfo;
	if tasksResp.Items != nil {
		for _, task := range tasksResp.Items {
			tasks = append(tasks, TaskInfo{
				User_ID: user_id,
				Title: task.Title,
				Event_date: task.Due,
			});
			fmt.Printf("Task ID: %s, Title %s\n", task.Id, task.Title)

		}
	} else {
			log.Println("No tasks found for user:", user_id)
		} 

	responseBody := ResponseBody{
		Tasks: tasks,
	}
	jsonResponse, err := json.Marshal(responseBody)
	if err != nil {
		log.Printf("ERROR: Failed to marshal calendar list to JSON: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: JSON marshaling failed\"}",
		}, nil
	}

	return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers: returnHeaders,
			Body: string(jsonResponse),
		}, nil
}

func main() {
	lambda.Start(Handler)
}