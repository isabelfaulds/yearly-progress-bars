
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
        "dynamodb:Query"
        ]
        Effect   = "Allow",
        Resource =[
        aws_dynamodb_table.user_tokens.arn,
        aws_dynamodb_table.calendar_events.arn,
        "arn:aws:dynamodb:us-west-1:${data.aws_caller_identity.current.account_id}:table/pb_events/index/UserIdDateIndex"
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
    "method.response.header.Access-Control-Allow-Origin" = "'https://year-progress-bar.com'"
    "method.response.header.Access-Control-Allow-Credentials": "'true'"
  }

  response_templates = {
    "application/json" = jsonencode({
      statusCode = 200
      headers = {
        "Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'"
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}

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
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
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
      }
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
    "method.response.header.Access-Control-Allow-Methods"     = "'OPTIONS,POST'",
    "method.response.header.Access-Control-Allow-Origin"      = "'https://year-progress-bar.com'",
    "method.response.header.Access-Control-Allow-Credentials" = "'true'"
  }
}