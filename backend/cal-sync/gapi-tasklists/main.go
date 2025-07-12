package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

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

// APIToken structure for DynamoDB
type APIToken struct {
	User_ID      string `dynamodbav:"user_id"`       // partition_key
	AccessToken  string `dynamodbav:"accessToken,omitempty"`
	RefreshToken string `dynamodbav:"refreshToken,omitempty"`
}

// TaskListInfo represents a single task list to be returned in the API response
type TaskListInfo struct {
	ID    string `json:"id"`
	Title string `json:"title"`
}

// TaskListsResponseBody is the structure for the overall API response
type TaskListsResponseBody struct {
	TaskLists []TaskListInfo `json:"task_lists"`
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

// Get Auth Token	
	userID := event.Headers["user-id"]
	if userID == "" {
		log.Println("ERROR: Missing 'user-id' header")
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    returnHeaders,
			Body:       `{"message": "Missing 'user-id' header"}`,
		}, nil
	}

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
	tableName := "pb_user_tokens"

	key, err := attributevalue.MarshalMap(map[string]string{"user_id": userID})
	if err != nil {
		log.Printf("ERROR: failed to marshal key for DynamoDB: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Failed to prepare DynamoDB key"}`,
		}, nil
	}

	getItemInput := &dynamodb.GetItemInput{
		TableName: aws.String(tableName),
		Key:       key,
	}
	result, err := svc.GetItem(context.TODO(), getItemInput)
	if err != nil {
		log.Printf("ERROR: failed to get item from DynamoDB: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Failed to retrieve token from database"}`,
		}, nil
	}
	if result.Item == nil {
		log.Printf("INFO: Item with ID '%s' not found in table '%s'\n", userID, tableName)
		return events.APIGatewayProxyResponse{
			StatusCode: 404,
			Headers:    returnHeaders,
			Body:       `{"message": "User token not found"}`,
		}, nil
	}

	var authToken APIToken
	err = attributevalue.UnmarshalMap(result.Item, &authToken)
	if err != nil {
		log.Printf("ERROR: failed to unmarshal item from DynamoDB: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Failed to process token data"}`,
		}, nil
	}
	fmt.Printf("User: %s \n accessToken present: %t \n refreshToken present: %t\n", authToken.User_ID, authToken.AccessToken != "", authToken.RefreshToken != "")

// Setup API Client
	googleClientID := os.Getenv("CLIENT_ID")
	googleClientSecret := os.Getenv("CLIENT_SECRET")

	if googleClientID == "" || googleClientSecret == "" {
		log.Println("ERROR: Missing CLIENT_ID or CLIENT_SECRET environment variables")
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Google API credentials not configured"}`,
		}, nil
	}

	oauthConfig := &oauth2.Config{
		ClientID:     googleClientID,
		ClientSecret: googleClientSecret,
		RedirectURL:  "urn:ietf:wg:oauth:2.0:oob", // Placeholder, server-side token refresh
		Scopes:       []string{"https://www.googleapis.com/auth/tasks.readonly"}, // Scope for tasks
		Endpoint:     google.Endpoint,
	}

	token := &oauth2.Token{
		AccessToken:  authToken.AccessToken,
		RefreshToken: authToken.RefreshToken,
		TokenType:    "Bearer",
		// Expiry:       time.Now().Add(-time.Hour), // Set expiry to past to force refresh on first use
	}

	// tokenSource will automatically handle token refreshing if refreshToken is valid
	tokenSource := oauthConfig.TokenSource(ctx, token)
	httpClient := oauth2.NewClient(ctx, tokenSource)
	log.Println("INFO: Initialized HTTP client for Google API")

	srv, err := tasks.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		log.Printf("ERROR: Unable to create Google Tasks service: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Could not initialize Google Tasks API service"}`,
		}, nil
	}

	fmt.Println(srv,"srv created")

// --- Get Task Lists ---
	taskListsResp, err := srv.Tasklists.List().Do()
	if err != nil {
		log.Printf("ERROR: Unable to retrieve task lists: %v", err)
		// Check for specific OAuth errors, e.g., invalid_grant for expired refresh token
		if oauthErr, ok := err.(*oauth2.RetrieveError); ok {
			log.Printf("OAuth Token Retrieval Error: %s", oauthErr.Error())
			return events.APIGatewayProxyResponse{
				StatusCode: 401, // Unauthorized
				Headers:    returnHeaders,
				Body:       `{"message": "Authentication failed. Please re-authenticate with Google."}`,
			}, nil
		}
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Failed to retrieve task lists"}`,
		}, nil
	}

	// Prepare response body
	var taskLists []TaskListInfo
	if taskListsResp.Items != nil {
		for _, taskList := range taskListsResp.Items {
			taskLists = append(taskLists, TaskListInfo{
				ID:    taskList.Id,
				Title: taskList.Title,
			})
			fmt.Printf("Task List ID: %s, Title: %s\n", taskList.Id, taskList.Title)
		}
	} else {
		log.Println("INFO: No task lists found for user:", userID)
	}

	responseBody := TaskListsResponseBody{
		TaskLists: taskLists,
	}

	jsonResponse, err := json.Marshal(responseBody)
	if err != nil {
		log.Printf("ERROR: Failed to marshal task lists to JSON: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: JSON marshaling failed"}`,
		}, nil
	}

	// --- Final Response ---
	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    returnHeaders,
		Body:       string(jsonResponse),
	}, nil
}

func main() {
	lambda.Start(Handler)
}