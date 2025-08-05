
### IAM

resource "aws_iam_role" "api_gateway_logging_dynamo_role" {
  name = "APIGatewayDyanmoCloudWatchRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "apigateway.amazonaws.com"
      }
    }]
  })
}



resource "aws_iam_policy" "apigateway_logging_dynamo_policy" {
  name = "apigateway_dynamo_logging_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ],
        Effect   = "Allow",
        Resource = "*"
      },
      {
        Action = ["dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
        ]
        Effect   = "Allow",
        Resource =[
        aws_dynamodb_table.user_tokens.arn,
        aws_dynamodb_table.calendar_events.arn,
        aws_dynamodb_table.milestones.arn,
        aws_dynamodb_table.task_lists.arn,
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_events/index/UserIdDateIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_milestones/index/UserIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_calendars/index/UserIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_tasklists/index/UserIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_milestone_sessions/index/MilestoneIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_milestone_sessions/index/UserIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_day_metrics/index/UserIndex",
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_category_day_metrics/index/UserDateIndex",
        

        ]
      },
    ]
  })
}

resource "aws_iam_policy_attachment" "api_gateway_logging_dynamo_policy_attachment" {
  name       = "api_gateway_dynamo_logging_policy"
  policy_arn = aws_iam_policy.apigateway_logging_dynamo_policy.arn
  roles      = [aws_iam_role.api_gateway_logging_dynamo_role.name]
}

resource "aws_api_gateway_account" "api_gateway_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_logging_dynamo_role.arn
}


### API Gateway

resource "aws_api_gateway_rest_api" "user_data_api" {
  name = "pb_user_data_api"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "user_data_deployment" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  triggers = {
    redeployment = sha1(jsonencode([
      # auth lambda
      aws_api_gateway_method.validate_auth_method,
      aws_api_gateway_integration.auth_lambda_integration,
      aws_api_gateway_method_response.auth_user_response,
      # auth cors preflight confirmation
      aws_api_gateway_method.auth_options_method,
      aws_api_gateway_integration.auth_options_integration,
      aws_api_gateway_method_response.auth_options_method_response,
      aws_api_gateway_integration_response.auth_options_integration_response,
      # logout
      aws_api_gateway_resource.users_auth_logout,
      aws_api_gateway_method.logout_post_method,
      aws_api_gateway_method.logout_options_method,
      aws_api_gateway_integration.auth_logout_options_integration,
      aws_api_gateway_method_response.auth_logout_options_method_response,
      aws_api_gateway_integration_response.auth_logout_options_integration_response
    ]))
  }
}

resource "aws_api_gateway_stage" "dev" { 
  deployment_id = aws_api_gateway_deployment.user_data_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  stage_name    = "dev"
  lifecycle {
    create_before_destroy = true # Recreate before destroying
  }
}

output "api_endpoint" {
  value = aws_api_gateway_stage.dev.invoke_url # Use the stage's invoke_url
}


### Auth User Gateway

resource "aws_api_gateway_resource" "users_auth" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "users_auth"
}

### Login

# post token data method
resource "aws_api_gateway_method" "validate_auth_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth.id
  http_method   = "POST"
  authorization = "NONE"
}

# facilitates cross origin (client side) preflight requests options
resource "aws_api_gateway_method" "auth_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.validate_auth_method.resource_id
  http_method = "OPTIONS"
  type        = "MOCK"  # mock integration for OPTIONS

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }

  passthrough_behavior = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_method_response" "auth_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.auth_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin" = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
  
}


resource "aws_api_gateway_integration_response" "auth_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.auth_options_method] 

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin" = "'https://localhost:5173'"
    "method.response.header.Access-Control-Allow-Credentials": "'true'"
  }

  response_templates = {
    "application/json" = jsonencode({
      statusCode = 200
      headers = {
        "Access-Control-Allow-Origin"      = "'https://localhost:5173'"
        "Access-Control-Allow-Methods"     = "POST, OPTIONS"
        "Access-Control-Allow-Headers"     = "'Content-Type'"
        "Access-Control-Allow-Credentials" = "'true'" # Client expects string
      }
    })
  }
}


resource "aws_api_gateway_integration" "auth_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.validate_auth_method.resource_id
  http_method = aws_api_gateway_method.validate_auth_method.http_method

  type                    = "AWS_PROXY" # Lambda
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  content_handling = "CONVERT_TO_TEXT"
  uri = aws_lambda_function.node_auth_token_creation.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "auth_user_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.validate_auth_method.resource_id
  http_method   = aws_api_gateway_method.validate_auth_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}


### logout
resource "aws_api_gateway_resource" "users_auth_logout" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.users_auth.id
  path_part   = "logout"
}

resource "aws_api_gateway_method" "logout_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_logout.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "logout_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_logout.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Integration for OPTIONS (CORS preflight)
resource "aws_api_gateway_integration" "auth_logout_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.users_auth_logout.id
  http_method = "OPTIONS"
  type        = "MOCK"  # mock integration for OPTIONS

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.logout_options_method]
}

resource "aws_api_gateway_method_response" "auth_logout_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_logout.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.logout_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "auth_logout_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_logout.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.auth_logout_options_integration,
    aws_api_gateway_method_response.auth_logout_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }


}

resource "aws_api_gateway_integration" "auth_logout_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.logout_post_method.resource_id
  http_method = aws_api_gateway_method.logout_post_method.http_method

  type                    = "AWS_PROXY" # Lambda

  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.node_auth_token_invalidation.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "logout_user_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.logout_post_method.resource_id
  http_method   = aws_api_gateway_method.logout_post_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}


#### refresh

resource "aws_api_gateway_resource" "users_auth_refresh" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.users_auth.id
  path_part   = "refresh"
}

resource "aws_api_gateway_method" "refresh_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_refresh.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_method" "refresh_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_refresh.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_refresh_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.users_auth_refresh.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.refresh_options_method]
}

resource "aws_api_gateway_method_response" "auth_refresh_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_refresh.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.refresh_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "auth_refresh_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_refresh.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.auth_refresh_options_integration,
    aws_api_gateway_method_response.auth_refresh_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }

}

resource "aws_api_gateway_integration" "auth_refresh_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.refresh_post_method.resource_id
  http_method = aws_api_gateway_method.refresh_post_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.node_auth_token_refresh.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}
resource "aws_api_gateway_method_response" "refresh_user_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.refresh_post_method.resource_id
  http_method   = aws_api_gateway_method.refresh_post_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}



#### auth check

resource "aws_api_gateway_resource" "users_auth_check" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.users_auth.id
  path_part   = "auth_check"
}

resource "aws_api_gateway_method" "auth_check_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_check.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_method" "auth_check_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_check.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_check_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.users_auth_check.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.auth_check_options_method]
}

resource "aws_api_gateway_method_response" "auth_check_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_check.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.auth_check_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "auth_check_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_auth_check.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.auth_check_options_integration,
    aws_api_gateway_method_response.auth_check_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

resource "aws_api_gateway_integration" "auth_check_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.auth_check_post_method.resource_id
  http_method = aws_api_gateway_method.auth_check_post_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.node_success_response.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "auth_check_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.auth_check_post_method.resource_id
  http_method   = aws_api_gateway_method.auth_check_post_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}

#### get calendar events

resource "aws_api_gateway_resource" "calendar_data_api" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "calendar"
}

resource "aws_api_gateway_resource" "calendar_events" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_data_api.id
  path_part   = "events"
}


resource "aws_api_gateway_integration" "calendar_events_get_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.calendar_events_get_method.resource_id
  http_method = aws_api_gateway_method.calendar_events_get_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.get_calendar_events.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "calendar_events_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.calendar_events_get_method.resource_id
  http_method   = aws_api_gateway_method.calendar_events_get_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}

resource "aws_api_gateway_method" "calendar_events_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_events.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_method" "calendar_events_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_events.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "calendar_events_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.calendar_events.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.calendar_events_options_method]
}

resource "aws_api_gateway_method_response" "calendar_events_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_events.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.calendar_events_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "calendar_events_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_events.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.calendar_events_options_integration,
    aws_api_gateway_method_response.calendar_events_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

#### patch calendar events

resource "aws_api_gateway_resource" "calendar_event" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_events.id
  path_part   = "{event_uid}"
}

resource "aws_api_gateway_method" "calendar_events_patch_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_event.id 
  http_method   = "PATCH"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
  
  request_parameters = {
    "method.request.path.event_uid" = true
  }
}

resource "aws_api_gateway_integration" "calendar_events_patch_lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_method.calendar_events_patch_method.resource_id
  http_method             = aws_api_gateway_method.calendar_events_patch_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.patch_calendar_events.invoke_arn
  passthrough_behavior    = "WHEN_NO_MATCH"
  
  request_parameters = {
    "integration.request.path.event_uid" = "method.request.path.event_uid"
  }
}

resource "aws_api_gateway_method_response" "calendar_events_patch_response" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.calendar_events_patch_method.resource_id
  http_method = aws_api_gateway_method.calendar_events_patch_method.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Credentials" = true,
  }
}


resource "aws_api_gateway_method" "calendar_event_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_event.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "calendar_event_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.calendar_event.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }

  passthrough_behavior = "WHEN_NO_MATCH"

  depends_on = [aws_api_gateway_method.calendar_event_options_method]
}

resource "aws_api_gateway_method_response" "calendar_event_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_event.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.calendar_event_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "calendar_event_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_event.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.calendar_event_options_integration,
    aws_api_gateway_method_response.calendar_event_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,PATCH'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}



#### gapi events

resource "aws_api_gateway_resource" "calendar_sync" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_data_api.id
  path_part   = "sync"
}

resource "aws_api_gateway_resource" "calendar_sync_gcal" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_sync.id
  path_part   = "gcal"
}

resource "aws_api_gateway_method" "sync_gcal_post" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_integration" "sync_gcal_post_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.sync_gcal_post.resource_id
  http_method = aws_api_gateway_method.sync_gcal_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.node_gapi_day_pull.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "sync_gcal_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.sync_gcal_post.resource_id
  http_method   = aws_api_gateway_method.sync_gcal_post.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}

resource "aws_api_gateway_method" "sync_gcal_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sync_gcal_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method = "OPTIONS"
  type        = "MOCK" 
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.sync_gcal_options]
}

resource "aws_api_gateway_method_response" "sync_gcal_options_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.sync_gcal_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "sync_gcal_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.sync_gcal_options_integration,
    aws_api_gateway_method_response.sync_gcal_options_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

### get gcal sync list

resource "aws_api_gateway_method" "get_gcal_sync" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_gcal_sync" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method             = aws_api_gateway_method.get_gcal_sync.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    #set($userId = $input.params().header.get('user-id'))
{
  "TableName": "pb_calendars",
  "IndexName": "UserIndex",
  "KeyConditionExpression": "user_id = :user",
  "ExpressionAttributeValues": {
    ":user": { "S": "$userId" }
  }
}
    EOF
      }
}

resource "aws_api_gateway_method_response" "get_gcal_sync" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_gcal_sync]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_gcal_sync" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.calendar_sync_gcal.id
  http_method = aws_api_gateway_method.get_gcal_sync.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_gcal_sync,
  ]
  response_templates = {
    "application/json" = <<EOF
        #set($calendars = $input.path('$.Items'))
        {
          "calendars": [
          #foreach($item in $calendars)
            {
              "calendar_uid": "$item.calendar_uid.S",
              "calendar_name" :"$item.calendar_name.S",
              #if ($item.default_category.S == "")
                "default_category": null,
              #else
                "default_category": "$item.default_category.S",
              #end
               #if ($item.default_category_uid.S == "")
                 "default_category_uid" : null,
              #else
                  "default_category_uid": "$item.default_category_uid.S",
              #end
              "sync": $item.sync.BOOL
              }#if($foreach.hasNext),#end
          #end
          ]
        }
        EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

# get gtask sync list

resource "aws_api_gateway_method" "get_gtask_sync" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_gtask_sync" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method             = aws_api_gateway_method.get_gtask_sync.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    #set($userId = $input.params().header.get('user-id'))
{
  "TableName": "pb_tasklists",
  "IndexName": "UserIndex",
  "KeyConditionExpression": "user_id = :user",
  "ExpressionAttributeValues": {
    ":user": { "S": "$userId" }
  }
}
    EOF
      }
}

resource "aws_api_gateway_method_response" "get_gtask_sync" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_gtask_sync]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_gtask_sync" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method = aws_api_gateway_method.get_gtask_sync.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_gtask_sync,
  ]
  response_templates = {
    "application/json" = <<EOF
        #set($tasklists = $input.path('$.Items'))
        {
          "tasklist": [
          #foreach($item in $tasklists)
            {
              "tasklist_uid": "$item.tasklist_uid.S",
              "tasklist_name" :"$item.tasklist_name.S",
              #if ($item.default_category.S == "")
                "default_category": null,
              #else
                "default_category": "$item.default_category.S",
              #end
               #if ($item.default_category_uid.S == "")
                 "default_category_uid" : null,
              #else
                  "default_category_uid": "$item.default_category_uid.S",
              #end
              "sync": $item.sync.BOOL
              }#if($foreach.hasNext),#end
          #end
          ]
        }
        EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

### get categories
resource "aws_api_gateway_resource" "categories_api" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "categories"
}

resource "aws_api_gateway_method" "categories_get_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.categories_api.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_integration" "categories_get_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.categories_get_method.resource_id
  http_method = aws_api_gateway_method.categories_get_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.get_categories.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "categories_get_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.categories_get_method.resource_id
  http_method   = aws_api_gateway_method.categories_get_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}

resource "aws_api_gateway_method" "categories_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.categories_api.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "categories_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.categories_api.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.categories_options_method]
}

resource "aws_api_gateway_method_response" "categories_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.categories_api.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.categories_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "categories_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.categories_api.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.categories_options_integration,
    aws_api_gateway_method_response.categories_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}


### update categories
resource "aws_api_gateway_method" "categories_post_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.categories_api.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_integration" "categories_post_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.categories_post_method.resource_id
  http_method = aws_api_gateway_method.categories_post_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.update_categories.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "categories_post_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.categories_post_method.resource_id
  http_method   = aws_api_gateway_method.categories_post_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}


### categorize events
resource "aws_api_gateway_resource" "labeling" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "labeling"
}

resource "aws_api_gateway_resource" "labeling_categories" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.labeling.id
  path_part   = "categories"
}

resource "aws_api_gateway_method" "labeling_categories_post" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.labeling_categories.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_integration" "labeling_categories_post_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.labeling_categories_post.resource_id
  http_method = aws_api_gateway_method.labeling_categories_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.gpt_categorize_event.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "labeling_categories_post_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.labeling_categories_post.resource_id
  http_method   = aws_api_gateway_method.labeling_categories_post.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}



resource "aws_api_gateway_method" "labeling_categories_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.labeling_categories.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "labeling_categories_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.labeling_categories.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.labeling_categories_options_method]
}

resource "aws_api_gateway_method_response" "labeling_categories_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.labeling_categories.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.labeling_categories_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "labeling_categories_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.labeling_categories.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.labeling_categories_options_integration,
    aws_api_gateway_method_response.labeling_categories_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

#### Update User 
resource "aws_api_gateway_resource" "settings" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "settings"
}

resource "aws_api_gateway_method" "user_settings_patch" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.settings.id
  http_method   = "PATCH"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_integration" "user_settings_patch_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.user_settings_patch.resource_id
  http_method = aws_api_gateway_method.user_settings_patch.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.patch_settings.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "user_settings_patch_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.user_settings_patch.resource_id
  http_method   = aws_api_gateway_method.user_settings_patch.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}

resource "aws_api_gateway_method" "user_settings_get" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.settings.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
}

resource "aws_api_gateway_integration" "user_settings_get_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.user_settings_get.resource_id
  http_method = aws_api_gateway_method.user_settings_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_parameters = {}
  request_templates = {}
  uri = aws_lambda_function.get_settings.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_method_response" "user_settings_get_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.user_settings_get.resource_id
  http_method   = aws_api_gateway_method.user_settings_get.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}


resource "aws_api_gateway_method" "user_settings_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.settings.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "user_settings_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.settings.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.user_settings_options_method]
}

resource "aws_api_gateway_method_response" "user_settings_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.settings.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.user_settings_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "user_settings_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.settings.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.user_settings_options_integration,
    aws_api_gateway_method_response.user_settings_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,PATCH'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

#### delete account
resource "aws_api_gateway_resource" "account" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.settings.id
  path_part   = "account"
}

resource "aws_api_gateway_method" "account_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.account.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "account_options" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.account.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.account_options]
}

resource "aws_api_gateway_method_response" "account_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.account.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.account_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "account_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.account.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.account_options,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,DELETE'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}


resource "aws_api_gateway_method" "account_delete" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.account.id
  http_method   = "DELETE"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
  request_parameters = {
    "method.request.header.user-id" = true,
  }
}

resource "aws_api_gateway_integration" "account_delete" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.account_delete.resource_id
  http_method = aws_api_gateway_method.account_delete.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  uri = aws_lambda_function.settings_delete_account.invoke_arn
}

resource "aws_api_gateway_method_response" "account_delete" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.account.id
  http_method   = aws_api_gateway_method.account_delete.http_method
  status_code   = "200"
  depends_on = [aws_api_gateway_method.account_delete]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "account_delete" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.account.id
  http_method   = aws_api_gateway_method.account_delete.http_method
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.account_delete,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,DELETE'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  
}


#### saved items
resource "aws_api_gateway_resource" "saved_items" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "saved_items"
}


resource "aws_api_gateway_method" "saved_items_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "saved_items_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.saved_items.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.saved_items_options_method]
}

resource "aws_api_gateway_method_response" "saved_items_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.saved_items_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "saved_items_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.saved_items_options_integration,
    aws_api_gateway_method_response.saved_items_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

# store saved item method
resource "aws_api_gateway_method" "post_saved_item_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
  request_parameters = {
    "method.request.header.user-id" = true
  }
}

# ddb insertions
resource "aws_api_gateway_integration" "post_saved_item_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.post_saved_item_method.resource_id
  http_method = aws_api_gateway_method.post_saved_item_method.http_method
  integration_http_method = "POST"
  type                    = "AWS" 
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  uri = "arn:aws:apigateway:us-west-1:dynamodb:action/PutItem"
  passthrough_behavior = "WHEN_NO_MATCH"


# 400 if improper template
  request_templates = {
    "application/json" = <<EOF
    #set($inputRoot = $input.path('$'))
    #set($userId = $input.params().header.get('user-id'))
    #set($url = $inputRoot.url)
    {
      "TableName": "pb_saved_items",
      "Item": {
        "saved_item_uid": { "S": "$userId:$url" }
        ,"user_id" : { "S": "$userId" }
        #if($inputRoot.category && $inputRoot.category != "")
          ,"category_uid": { "S": "$userId:$inputRoot.category" }
        #end
        #if( $inputRoot.title && $inputRoot.title != "" )
          ,"title": { "S": "$inputRoot.title" }
        #end
        #if( $inputRoot.description && $inputRoot.description != "")
          ,"description": { "S": "$inputRoot.description" }
        #end
      },
    }
EOF
  }
}

resource "aws_api_gateway_method_response" "post_saved_item_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "POST"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.post_saved_item_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}


resource "aws_api_gateway_integration_response" "saved_items_post_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "POST"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.post_saved_item_integration,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  response_templates = {
          "application/json" = <<EOF
      #set($inputRoot = $input.path('$'))
      #set($userId = $input.params().header.get('user-id'))
      #set($url = $inputRoot.url)
      {
        "user_id": "$userId",
      }
      EOF
        }
}

# Get items
resource "aws_api_gateway_method" "get_items_by_index" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
    "method.request.querystring.category" = true
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_items_by_index_integration" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.saved_items.id
  http_method             = aws_api_gateway_method.get_items_by_index.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    {
      "TableName": "pb_saved_items",
      "IndexName": "UserCategoryIndex",
      "KeyConditionExpression": "category_uid = :cat AND user_id = :uid",
      "ExpressionAttributeValues": {
        ":cat": {
          "S": "$input.params().header.get('user-id'):$input.params('category')"
        },
        ":uid": {
          "S": "$input.params('user-id')"
        }
      }
    }

    EOF
      }
}

resource "aws_api_gateway_method_response" "get_items_by_index_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.saved_items.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_items_by_index]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_items_by_index_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.saved_items.id
  http_method = aws_api_gateway_method.get_items_by_index.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_items_by_index_integration,
    aws_api_gateway_method_response.get_items_by_index_method_response
  ]
  response_templates = {
    "application/json" = <<EOF
#set($items = $input.path('$.Items'))
{
  "items": [
  #foreach($item in $items)
    {
      "saved_item_uid": "$item.saved_item_uid.S",
      "category_uid": "$item.category_uid.S",
      "description": "$item.description.S",
      "title": "$item.title.S",
      "image": "$item.image.S"
    }#if($foreach.hasNext),#end
  #end
  ]
}
EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

resource "aws_api_gateway_resource" "milestones" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "milestones"
}


resource "aws_api_gateway_method" "milestones_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "milestones_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.milestones.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.milestones_options_method]
}

resource "aws_api_gateway_method_response" "milestones_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.milestones_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "milestones_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.milestones_options_integration,
    aws_api_gateway_method_response.milestones_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST,PATCH,DELETE'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}


# Get milestones
resource "aws_api_gateway_method" "get_milestones_by_index" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
    "method.request.querystring.category" = false # optional
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_milestones_by_index_integration" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.milestones.id
  http_method             = aws_api_gateway_method.get_milestones_by_index.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    #set($category = $input.params('category'))
    #set($userId = $input.params().header.get('user-id'))
    #if($category && $category != "" )
        {
          "TableName": "pb_milestones",
          "IndexName": "UserCategoryIndex",
          "KeyConditionExpression": "category_uid = :cat",
          "ExpressionAttributeValues": {
            ":cat": {"S": "$userId:$category"}
          }
        }
    #else
        {
          "TableName": "pb_milestones",
          "IndexName": "UserIndex",
          "KeyConditionExpression": "user_id = :user",
          "ExpressionAttributeValues": {
            ":user": { "S": "$userId" }
          }
        }
    #end
    EOF
      }
}

resource "aws_api_gateway_method_response" "get_milestones_by_index_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_milestones_by_index]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_milestones_by_index_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.milestones.id
  http_method = aws_api_gateway_method.get_milestones_by_index.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_milestones_by_index_integration,
    aws_api_gateway_method_response.get_milestones_by_index_method_response
  ]
  response_templates = {
    "application/json" = <<EOF
        #set($milestones = $input.path('$.Items'))
        {
          "milestones": [
          #foreach($item in $milestones)
            #set($minutes= $item.minutes_invested.N)
            #set($timeframe=$item.timeframe_weeks.N)
            #set($completed=$item.completed.BOOL)
            {
              "milestone_user_datetime_uid": "$item.milestone_user_datetime_uid.S",
              "milestone": "$item.milestone.S",
              "category_uid": "$item.category_uid.S",
              "created_timestamp": "$item.created_timestamp.S",
              "interest" : $item.interest.N,
              "minutes_invested" : 
                #if ($minutes && $minutes != "") $minutes
                #else null #end ,
              "timeframe_weeks" : 
                #if ($timeframe && $timeframe != "") $timeframe
                #else null #end ,
              "completed" :
                #if ($completed && $completed != "") $completed
                #else null #end
            }#if($foreach.hasNext),#end
          #end
          ]
        }
        EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST,PATCH,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

# milestone insertions

resource "aws_api_gateway_method" "post_milestone_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }
}

resource "aws_api_gateway_integration" "post_milestone_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.post_milestone_method.resource_id
  http_method = aws_api_gateway_method.post_milestone_method.http_method
  integration_http_method = "POST"
  type                    = "AWS" 
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  uri = "arn:aws:apigateway:us-west-1:dynamodb:action/PutItem"
  passthrough_behavior = "WHEN_NO_MATCH"


  # 400 if improper template
  request_templates = {
    "application/json" = <<EOF
    #set($inputRoot = $input.path('$'))
    #set($userId = $input.params().header.get('user-id'))
    #set($dateTime = $inputRoot.dateTime)
    #set($interest = $inputRoot.interestScore)
    #set($milestone = $inputRoot.milestone)
    #set($timeframe = $inputRoot.timeFrameWeeks)

    {
      "TableName": "pb_milestones",
      "Item": {
        "milestone_user_datetime_uid": { "S": "$userId:$dateTime" }
        ,"user_id" : { "S": "$userId" }
        ,"created_timestamp" : {"S" : "$dateTime"}
        , "milestone" : { "S" : "$milestone" }
        ,"interest" : { "N" : "$interest.toString()" }
        #if($inputRoot.category && $inputRoot.category != "")
          ,"category_uid": { "S": "$userId:$inputRoot.category" }
        #end
        #if( $inputRoot.timeframe && $inputRoot.timeFrameWeeks != "" )
          ,"timeframe_weeks": { "N": "$timeframe.toString()" }
        #end
      }
    }
EOF
  }
}

resource "aws_api_gateway_method_response" "post_milestone_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "POST"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.post_milestone_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "post_milestone_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "POST"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.post_milestone_integration,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  response_templates = {
          "application/json" = <<EOF
      #set($inputRoot = $input.path('$'))
      #set($userId = $input.params().header.get('user-id'))
      #set($url = $inputRoot.url)
      {
        "user_id": "$userId"
      }
      EOF
        }
}

# milestone deletes
resource "aws_api_gateway_method" "delete_milestone" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method   = "DELETE"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
   "method.request.querystring.milestone_uid"       = true
  }
}

resource "aws_api_gateway_integration" "delete_milestone" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.delete_milestone.resource_id
  http_method = aws_api_gateway_method.delete_milestone.http_method
  integration_http_method = "POST"
  type                    = "AWS" 
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  uri = "arn:aws:apigateway:us-west-1:dynamodb:action/DeleteItem"
  passthrough_behavior = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
     #set($uid = $input.params().querystring.get('milestone_uid'))
    {
      "TableName": "pb_milestones",
      "Key": {
        "milestone_user_datetime_uid": {
          "S": "$uid"
        }
      }
    }
    EOF
      }
}

resource "aws_api_gateway_method_response" "delete_milestone" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method = aws_api_gateway_method.delete_milestone.http_method
  status_code   = "200"
  depends_on = [aws_api_gateway_method.delete_milestone]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "delete_milestone" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestones.id
  http_method = aws_api_gateway_method.delete_milestone.http_method
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.delete_milestone,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST,DELETE'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  response_templates = {
          "application/json" = <<EOF
      {
        "message": "Milestone deleted"
      }
      EOF
        }
}


### list calendars

resource "aws_api_gateway_resource" "cal_list" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_sync_gcal.id
  path_part   = "list"
}


resource "aws_api_gateway_method" "cal_list_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cal_list_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.cal_list.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.cal_list_options_method]
}

resource "aws_api_gateway_method_response" "cal_list_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.cal_list_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "cal_list_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.cal_list_options_integration,
    aws_api_gateway_method_response.cal_list_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}


# Get calendars
resource "aws_api_gateway_method" "get_calendars_list_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }

}

resource "aws_api_gateway_integration" "get_calendars_list_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.get_calendars_list_method.resource_id
  http_method = aws_api_gateway_method.get_calendars_list_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  uri = aws_lambda_function.sync_gcal_list.invoke_arn
}

resource "aws_api_gateway_method_response" "get_calendars_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_calendars_list_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_calendars_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "GET"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.get_calendars_list_lambda_integration,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  
}

### post preferences

resource "aws_api_gateway_method" "post_calendars_list_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }
}

resource "aws_api_gateway_integration" "post_calendar_list" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.post_calendars_list_method.resource_id
  http_method = aws_api_gateway_method.post_calendars_list_method.http_method
  integration_http_method = "POST"
  type                    = "AWS" 
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  uri = "arn:aws:apigateway:us-west-1:dynamodb:action/PutItem"
  passthrough_behavior = "WHEN_NO_MATCH"


# 400 if improper template
  request_templates = {
    "application/json" = <<EOF
    #set($inputRoot = $input.path('$'))
    #set($userId = $input.params().header.get('user-id'))
    #set($calendarID = $inputRoot.calendarID)
    #set($defaultCategory = $inputRoot.defaultCategory)
    #set($sync = $inputRoot.sync)
    #set($summary = $inputRoot.summary)


    {
      "TableName": "pb_calendars",
      "Item": {
        "calendar_uid" : {"S" : "$userId:$calendarID"}
        ,"user_id" : { "S": "$userId" }
        ,"sync" : {"BOOL" : $sync}
        ,"calendar_name" : { "S": "$summary" }
        #if($inputRoot.defaultCategory && $inputRoot.defaultCategory != "")
          , "default_category_uid" : { "S" : "$userId:$inputRoot.defaultCategory" }
          , "default_category" : { "S" : "$inputRoot.defaultCategory" }
        #end

      }
    }
EOF
  }
}

resource "aws_api_gateway_method_response" "post_calendar_list_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "POST"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.post_calendars_list_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "post_calendar_list_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.cal_list.id
  http_method   = "POST"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.post_calendar_list,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  response_templates = {
          "application/json" = <<EOF
      {"message": "Updated calendar settings"}
      EOF
        }
}

### tasklists
### tasklist options

resource "aws_api_gateway_resource" "calendar_sync_gtask" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_sync.id
  path_part   = "gtasks"
}

resource "aws_api_gateway_resource" "gtasks_list" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  path_part   = "list"
}


resource "aws_api_gateway_method" "gtasks_list_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "gtasks_list_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.gtasks_list.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.gtasks_list_options_method]
}

resource "aws_api_gateway_method_response" "gtasks_list_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.gtasks_list_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "gtasks_list_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.gtasks_list_options_integration,
    aws_api_gateway_method_response.gtasks_list_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

# Get tasklists
resource "aws_api_gateway_method" "get_gtasks_list_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }

}

resource "aws_api_gateway_integration" "get_gtasks_list_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.get_gtasks_list_method.resource_id
  http_method = aws_api_gateway_method.get_gtasks_list_method.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  uri = aws_lambda_function.sync_gcal_tasklist.invoke_arn
}

resource "aws_api_gateway_method_response" "get_gtasks_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_gtasks_list_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_gtasks_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "GET"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.get_gtasks_list_lambda_integration,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  
}

### post preferences

resource "aws_api_gateway_method" "post_gtasks_lists" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }
}

resource "aws_api_gateway_integration" "post_gtasks_lists" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.post_gtasks_lists.resource_id
  http_method = aws_api_gateway_method.post_gtasks_lists.http_method
  integration_http_method = "POST"
  type                    = "AWS" 
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  uri = "arn:aws:apigateway:us-west-1:dynamodb:action/PutItem"
  passthrough_behavior = "WHEN_NO_MATCH"


# 400 if improper template
  request_templates = {
    "application/json" = <<EOF
    #set($inputRoot = $input.path('$'))
    #set($userId = $input.params().header.get('user-id'))
    #set($tasklistID = $inputRoot.tasklistID)
    #set($defaultCategory = $inputRoot.defaultCategory)
    #set($sync = $inputRoot.sync)
    #set($title = $inputRoot.title)

    {
      "TableName": "pb_tasklists",
      "Item": {
        "tasklist_uid" : {"S" : "$userId:$tasklistID"}
        ,"user_id" : { "S": "$userId" }
        ,"sync" : {"BOOL" : $sync}
        ,"tasklist_name" : { "S": "$title" }
        #if($inputRoot.defaultCategory && $inputRoot.defaultCategory != "")
          , "default_category_uid" : { "S" : "$userId:$inputRoot.defaultCategory" }
          , "default_category" : { "S" : "$inputRoot.defaultCategory" }
        #end

      }
    }
EOF
  }
}

resource "aws_api_gateway_method_response" "post_gtasks_lists" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "POST"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.post_gtasks_lists]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "post_gtasks_lists" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.gtasks_list.id
  http_method   = "POST"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.post_gtasks_lists,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
  response_templates = {
          "application/json" = <<EOF
      {"message": "Updated tasklist settings"}
      EOF
        }
}


# Get milestone sessions

resource "aws_api_gateway_resource" "milestone_sessions" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.milestones.id
  path_part   = "sessions"
}


resource "aws_api_gateway_method" "get_milestone_sessions" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestone_sessions.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
    "method.request.querystring.milestone_user_datetime_uid" = false # optional
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_milestone_sessions_integration" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.milestone_sessions.id
  http_method             = aws_api_gateway_method.get_milestone_sessions.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    #set($milestone = $input.params('milestone_uid'))
    #set($userId = $input.params().header.get('user-id'))
    #if($milestone && $milestone != "" )
        {
          "TableName": "pb_milestone_sessions",
          "IndexName": "UserCategoryIndex",
          "KeyConditionExpression": "milestone_user_datetime_uid = :milestone",
          "ExpressionAttributeValues": {
            ":milestone": {"S": "$milestone"}
          }
        }
    #else
        {
          "TableName": "pb_milestone_sessions",
          "IndexName": "UserIndex",
          "KeyConditionExpression": "user_id = :user",
          "ExpressionAttributeValues": {
            ":user": { "S": "$userId" }
          }
        }
    #end
    EOF
      }
}

resource "aws_api_gateway_method_response" "get_milestone_sessions_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestone_sessions.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_milestone_sessions]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_milestone_sessions_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.milestone_sessions.id
  http_method = aws_api_gateway_method.get_milestone_sessions.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_milestone_sessions_integration,
    aws_api_gateway_method_response.get_milestone_sessions_method_response
  ]
  response_templates = {
    "application/json" = <<EOF
        #set($milestone_sessions = $input.path('$.Items'))
        {
          "sessions": [
          #foreach($item in $milestone_sessions)
            #set($minutes= $item.minutes.N)
            #set($event_startdate= $item.event_startdate.S)
            #set($event_name= $item.event_name.S)

            {
              "milestone_user_datetime_uid": "$item.milestone_user_datetime_uid.S",
              "milestone_session_uid": "$item.milestone_session_uid.S",

              "event_startdate" : 
                #if ($event_startdate && $event_startdate != "") "$event_startdate"
                #else null #end ,
              "event_name" :
                #if ($event_name && $event_name != "") "$event_name"
                #else null #end,
              "minutes" : 
                #if ($minutes && $minutes != "") $minutes
                #else null #end
            }#if($foreach.hasNext),#end
          #end
          ]
        }
        EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

resource "aws_api_gateway_method" "milestone_sessions_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestone_sessions.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "milestone_sessions_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.milestone_sessions.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.milestone_sessions_options_method]
}

resource "aws_api_gateway_method_response" "milestone_sessions_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestone_sessions.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.milestone_sessions_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "milestone_sessions_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.milestone_sessions.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.milestone_sessions_options_integration,
    aws_api_gateway_method_response.milestone_sessions_options_method_response
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

# Get day scores

resource "aws_api_gateway_resource" "aggregates" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.calendar_data_api.id
  path_part   = "aggregates"
}

resource "aws_api_gateway_resource" "daily_agg" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.aggregates.id
  path_part   = "daily"
}

resource "aws_api_gateway_method" "get_daily_aggregates" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_agg.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_daily_aggregates_integration" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.daily_agg.id
  http_method             = aws_api_gateway_method.get_daily_aggregates.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    #set($userId = $input.params().header.get('user-id'))
{
  "TableName": "pb_day_metrics",
  "IndexName": "UserIndex",
  "KeyConditionExpression": "user_id = :user",
  "ExpressionAttributeValues": {
    ":user": { "S": "$userId" }
  }
}
    EOF
      }
}

resource "aws_api_gateway_method_response" "get_daily_aggregates_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_agg.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_daily_aggregates]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_daily_aggregates_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.daily_agg.id
  http_method = aws_api_gateway_method.get_daily_aggregates.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_daily_aggregates_integration,
  ]
  response_templates = {
    "application/json" = <<EOF
        #set($day_totals = $input.path('$.Items'))
        {
          "day_totals": [
          #foreach($item in $day_totals)
            #set($calendar_date = $item.calendar_date.S)
            #set($avg_category_score = $item.avg_category_score.N)
            {
              "calendar_date": "$calendar_date",
              "avg_category_score" : $avg_category_score
              
              }#if($foreach.hasNext),#end
          #end
          ]
        }
        EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

resource "aws_api_gateway_method" "daily_aggregates_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_agg.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "daily_aggregates_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.daily_agg.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.daily_aggregates_options_method]
}

resource "aws_api_gateway_method_response" "daily_aggregates_options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_agg.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.daily_aggregates_options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "daily_aggregates_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_agg.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.daily_aggregates_options_integration
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}


### get daily category aggregates 

resource "aws_api_gateway_resource" "daily_category_agg" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_resource.daily_agg.id
  path_part   = "categories"
}

resource "aws_api_gateway_method" "get_daily_category_agg" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_category_agg.id
  http_method   = "GET"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id

  request_parameters = {
    "method.request.header.user-id" = true,
  }

  request_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration" "get_daily_category_agg" {
  rest_api_id             = aws_api_gateway_rest_api.user_data_api.id
  resource_id             = aws_api_gateway_resource.daily_category_agg.id
  http_method             = aws_api_gateway_method.get_daily_category_agg.http_method
  integration_http_method = "POST"
  type                    = "AWS"
  uri                     = "arn:aws:apigateway:us-west-1:dynamodb:action/Query"
  credentials             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/APIGatewayDyanmoCloudWatchRole"
  passthrough_behavior    = "WHEN_NO_MATCH"

  request_templates = {
    "application/json" = <<EOF
    #set($userId = $input.params('user-id'))
    #set($start = $input.params('start-date'))
    #set($end = $input.params('end-date'))

    #if($end == "")
      #set($end = $start)
    #end

    {
      "TableName": "pb_category_day_metrics",
      "IndexName": "UserDateIndex",
      "KeyConditionExpression": "user_id = :uid AND calendar_date BETWEEN :start AND :end",
      "ExpressionAttributeValues": {
        ":uid":   { "S": "$userId" },
        ":start": { "S": "$start" },
        ":end":   { "S": "$end" }
      }
    }
    EOF
      }
}

resource "aws_api_gateway_method_response" "get_daily_category_agg" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_category_agg.id
  http_method   = "GET"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.get_daily_category_agg]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "get_daily_category_agg" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.daily_category_agg.id
  http_method = aws_api_gateway_method.get_daily_category_agg.http_method
  status_code = "200"
  depends_on = [
    aws_api_gateway_integration.get_daily_category_agg,
  ]
  response_templates = {
    "application/json" = <<EOF
      #set($day_category_totals = $input.path('$.Items'))
      {
        "day_category_totals": [
        #foreach($item in $day_category_totals)
          #set($calendar_date = $item.calendar_date.S)
          #set($consistency_score = $item.consistency_score.N)
          #set($fulfillment_score = $item.fulfillment_score.N)
          #set($category = $item.category.S.toLowerCase())
          { "$calendar_date" : {
            "category_date_id": "$item.category_date_id.S",
            "category": "$category",
            "consistency_score": $consistency_score,
            "fulfillment_score": $fulfillment_score
          } } #if($foreach.hasNext),#end
        #end
        ]
      }
    EOF
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

resource "aws_api_gateway_method" "daily_category_agg_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_category_agg.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "daily_category_agg_options" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.daily_category_agg.id
  http_method = "OPTIONS"
  type        = "MOCK" 

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
  depends_on = [aws_api_gateway_method.daily_aggregates_options_method]
}

resource "aws_api_gateway_method_response" "daily_category_agg_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_category_agg.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.daily_category_agg_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

resource "aws_api_gateway_integration_response" "daily_category_agg_options" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.daily_category_agg.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.daily_category_agg_options
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,GET'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}



### get today task 
resource "aws_api_gateway_method" "sync_gtask_today" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "POST"
  authorization = "CUSTOM"
  authorizer_id = aws_api_gateway_authorizer.login_token_gateway_authorizer.id
  request_parameters = {}
}

resource "aws_api_gateway_integration" "sync_gtask_today_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.sync_gtask_today.resource_id
  http_method = aws_api_gateway_method.sync_gtask_today.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  credentials             = null
  request_templates = {}
  request_parameters = {}
  uri = aws_lambda_function.gapi_task_pull.invoke_arn
  passthrough_behavior = "WHEN_NO_MATCH" 
}

resource "aws_api_gateway_integration_response" "sync_gtask_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "POST"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.sync_gtask_today_lambda_integration,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type, Origin'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}


resource "aws_api_gateway_method_response" "sync_gtask_today_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.sync_gtask_today.resource_id
  http_method   = aws_api_gateway_method.sync_gtask_today.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Credentials": true,

  }
}

resource "aws_api_gateway_method" "sync_gtask_options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "sync_gtask_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method = "OPTIONS"
  type        = "MOCK" 
  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
  passthrough_behavior = "WHEN_NO_MATCH"
}


resource "aws_api_gateway_integration_response" "sync_gtask_options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "OPTIONS"
  status_code   = "200"

  depends_on = [
    aws_api_gateway_integration.sync_gtask_options_integration,
  ]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = "'Content-Type, Origin'",
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://localhost:5173'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

resource "aws_api_gateway_method_response" "sync_gtask_options_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.calendar_sync_gtask.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.sync_gcal_options]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers"     = true,
    "method.response.header.Access-Control-Allow-Methods"     = true,
    "method.response.header.Access-Control-Allow-Origin"      = true,
    "method.response.header.Access-Control-Allow-Credentials" = true
  }
}

