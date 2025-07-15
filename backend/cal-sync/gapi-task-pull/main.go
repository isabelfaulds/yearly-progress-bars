package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"strings"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
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
	Event_UID string `json:"event_uid"`
	User_ID string `json:"user_id"`
	Event_Name    string `json:"event_name"`
	Event_StartDate string `json:"event_startdate"`
	Event_EndDate string `json:"event_enddate"`
	Type string `json:"type"`
	TaskList_UID    string `json:"tasklist_uid"`
}

type TaskList struct {
	User_ID string `json:"user_id"`
	TaskList_UID    string `json:"tasklist_uid"`
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
	returnHeaders["Access-Control-Allow-Origin"] = accessControlAllowOrigin;


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

// Get Task lists
	queryInput := &dynamodb.QueryInput{
		TableName: aws.String("pb_tasklists"),
		IndexName: aws.String("UserIndex"),
		KeyConditionExpression: aws.String("#uid = :uid_val"),
		ExpressionAttributeNames: map[string]string{
			"#uid": "user_id",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":uid_val": &types.AttributeValueMemberS{Value: user_id},
		},
	}
    queryResult, err := svc.Query(context.TODO(), queryInput)
    if err != nil {
        log.Printf("ERROR: failed to query tasks from DynamoDB: %v", err)
        return events.APIGatewayProxyResponse{
            StatusCode: 500,
            Headers:    returnHeaders,
            Body:       `{"message": "Internal server error: Failed to query tasklist from database"}`,
        }, nil
    }

	var taskLists []TaskList
	err = attributevalue.UnmarshalListOfMaps(queryResult.Items, &taskLists)
	if err != nil {
		log.Printf("ERROR: failed to unmarshal query results: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       `{"message": "Internal server error: Failed to parse tasklist from database"}`,
		}, nil
	}

	if len(taskLists) == 0 {
		// taskLists is empty
		log.Println("No task lists found for user, no tasks fetched.")
		return events.APIGatewayProxyResponse{
				StatusCode: 200,
				Headers: returnHeaders,
				Body: string("jsonResponse"),
			}, nil
	}

// Get Auth Token
	tokenTable := "pb_user_tokens"
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
		TableName: aws.String(tokenTable), 
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
		fmt.Printf("Item with ID '%s' not found in table '%s'\n", user_id, tokenTable)
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
		RedirectURL:  "urn:ietf:wg:oauth:2.0:oob", // Placeholder, server-side token refresh
		Scopes:       []string{"https://www.googleapis.com/auth/tasks.readonly"}, // Scope for tasks
		Endpoint:     google.Endpoint,
	}

	token := &oauth2.Token{
		AccessToken:  authToken.AccessToken,
		RefreshToken: authToken.RefreshToken,
		TokenType:    "Bearer",
        // Expiry:       time.Now().Add(-time.Hour),
    }

    tokenSource := oauthConfig.TokenSource(ctx, token)

	httpClient := oauth2.NewClient(ctx, tokenSource)
	log.Println("Initialized HTTP client for Google API:", httpClient)
	srv, err := tasks.NewService(ctx, option.WithHTTPClient(httpClient))
	if err != nil {
		log.Printf("ERROR: unable to set up task service: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    returnHeaders,
			Body:       "{\"message\": \"Internal server error: Couldn't query user tasks\"}",
		}, nil
	}
	log.Println("srv", srv)

	var todayStart time.Time
	now := time.Now()
	
	// Use UTC given
	taskDateStr, ok := event.QueryStringParameters["task_date"];
	if ok {
		const dateFormat = "2006-01-02" // Represents YYYY-MM-DD
		parsedTaskDate, err := time.Parse(dateFormat, taskDateStr)
		if err != nil {
			log.Printf("ERROR: Could not parse task_date '%s'. Expected format YYYY-MM-DD. Error: %v", taskDateStr, err)
			return events.APIGatewayProxyResponse{
				StatusCode: 400, // Bad Request due to invalid date format
				Headers:    returnHeaders,
				Body:       fmt.Sprintf("{\"message\": \"Bad Request: Invalid task_date format for '%s'. Expected YYYY-MM-DD\"}", taskDateStr),
			}, nil
		}
		todayStart = parsedTaskDate
		log.Printf("Using provided task_date: %s", taskDateStr)
	} else {
		// Use current UTC
		todayStart = time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		log.Println("DEBUG: 'task_date' query parameter not found, using today utc")
	}
	tomorrowStart := todayStart.Add(24 * time.Hour)
	dueMin := todayStart.Format(time.RFC3339)
	dueMax := tomorrowStart.Format(time.RFC3339)

	var tasks []TaskInfo = make([]TaskInfo, 0)

	for _, taskList := range taskLists {
		log.Println("taskList", strings.SplitN(taskList.TaskList_UID, ":", 2)[1])
		var taskListID = strings.SplitN(taskList.TaskList_UID, ":", 2)[1]
		tasksResp, err := srv.Tasks.List(taskListID).
		ShowCompleted(true). // Including completed tasks
		DueMin(dueMin).
		DueMax(dueMax).
		Do()
		if err != nil {
		// Not returning 500 , continuing to any next
			log.Printf("Could not query tasklist %s, due to %s", taskListID, err)
			continue
		}

		if len(tasksResp.Items) == 0 {
			fmt.Println("No tasks for today.")
		} else if (len(tasksResp.Items) > 0 ) {
			for _, task := range tasksResp.Items {
				event_uid := fmt.Sprintf("%s#task#%s", user_id, task.Id)

				tasks = append(tasks, TaskInfo{
					Event_UID: event_uid,
					User_ID: user_id,
					Event_Name: task.Title,
					Event_StartDate: task.Due,
					Event_EndDate: task.Due,
					Type: "task",
					TaskList_UID: taskList.TaskList_UID,
				});

				fmt.Printf("Task ID: %s, Title %s\n", task.Id, task.Title)

				// Construct event_uid

				// Create item for pb_events table
				eventItem := map[string]types.AttributeValue{
					"event_uid":   &types.AttributeValueMemberS{Value: event_uid},
					"user_id":     &types.AttributeValueMemberS{Value: user_id},
					"event_name":  &types.AttributeValueMemberS{Value: task.Title},
					"event_startdate": &types.AttributeValueMemberS{Value: task.Due},
					"event_enddate":   &types.AttributeValueMemberS{Value: task.Due},
					"type": &types.AttributeValueMemberS{Value: "task"},
					"tasklist_uid": &types.AttributeValueMemberS{Value: taskList.TaskList_UID,},

				}

				// PutItem request
				_, err := svc.PutItem(context.TODO(), &dynamodb.PutItemInput{
					TableName: aws.String("pb_events"),
					Item:      eventItem,
				})
				if err != nil {
					log.Printf("ERROR: Failed to put event %s into pb_events: %v", event_uid, err)
				}
				log.Printf("Inserted task event: %s", event_uid)

			}
		} 


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
