package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"os"
	// "strings"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
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

type MyItem struct {
	User_ID    string `dynamodbav:"user_id"`      // partition_key
	AccessToken  string `dynamodbav:"accessToken,omitempty"` // attribute
	RefreshToken string    `dynamodbav:"refreshToken,omitempty"`
}

type CalendarInfo struct {
	CalendarID string `json:"calendarID"`
	Summary    string `json:"summary"`
}

type ResponseBody struct {
	Calendars []CalendarInfo `json:"calendars"`
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

	// Get Token
	// Setup dynamo
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion("us-west-1"),
	)
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	svc := dynamodb.NewFromConfig(cfg)
	tableName := "pb_user_tokens"
	// Marshal key for get item
	key, err := attributevalue.MarshalMap(map[string]string{"user_id": user_id})
	if err != nil {
		log.Fatalf("failed to marshal key: %v", err)
	}
	// Get Item
	getItemInput := &dynamodb.GetItemInput{
		TableName: aws.String(tableName), 
		Key:       key,                
	}
	result, err := svc.GetItem(context.TODO(), getItemInput)
	if err != nil {
		log.Fatalf("failed to get item from DynamoDB: %v", err)
	}
	if result.Item == nil {
		fmt.Printf("Item with ID '%s' not found in table '%s'\n", user_id, tableName)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: returnHeaders,
			Body: string("Item not found in table"),
		}, nil
	}
	// Unmarshal the retrieved item into your Go struct
	var item MyItem
	err = attributevalue.UnmarshalMap(result.Item, &item)
	if err != nil {
		log.Fatalf("failed to unmarshal item: %v", err)
	}
	fmt.Printf("User: %s \n accessToken %s \n refreshToken %s", item.User_ID, item.AccessToken,  item.RefreshToken)


	// Create oauth 

	googleClientID := os.Getenv("CLIENT_ID")
	googleClientSecret := os.Getenv("CLIENT_SECRET")
	log.Println(googleClientID, googleClientSecret)

	oauthConfig := &oauth2.Config{
    ClientID:     googleClientID,
    ClientSecret: googleClientSecret,
    RedirectURL:  "urn:ietf:wg:oauth:2.0:oob", // A common placeholder for server-side if not doing full auth flow
    Scopes:       []string{calendar.CalendarReadonlyScope },
    Endpoint:     google.Endpoint, // Standard Google OAuth2 endpoint
}

	token := &oauth2.Token{
		AccessToken:  item.AccessToken,
		RefreshToken: item.RefreshToken,
		TokenType:    "Bearer",
		// Expiry:       time.Now().Add(time.Hour), // Optionally set a known expiry if you have it
	}
	tokenSource := oauthConfig.TokenSource(ctx, token)
	httpClient := oauth2.NewClient(ctx, tokenSource)
	log.Println("Initialized HTTP client for Google API:", httpClient)

	srv, err := calendar.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		// Handle error
		log.Fatalf("Unable to create Calendar service: %v", err)
	}

	// Now you can use the service client to make API calls
	r, err := srv.CalendarList.List().Do()
	if err != nil {
		// Handle error
		log.Fatalf("Unable to retrieve calendar list: %v", err)
	}

	var calendars []CalendarInfo
	if r.Items != nil {
		for _, cal := range r.Items {
			calendars = append(calendars, CalendarInfo{
				CalendarID: cal.Id,
				Summary: cal.Summary,
			})
			fmt.Printf("Calendar ID: %s, Summary: %s\n", cal.Id, cal.Summary)
		}
	} else {
		log.Println("No calendars found for user:", user_id)
	}

	responseBody := ResponseBody{
		Calendars: calendars,
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