data "aws_caller_identity" "current" {}

### IAM
resource "aws_iam_role" "lambda_execution_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
      {
           Action    = "sts:AssumeRole"
           Effect    = "Allow"
           Principal = {
               Service = "apigateway.amazonaws.com"
            }
        },
    ]
  })
}

resource "aws_iam_policy_attachment" "lambda_policy_attachment" {
  name       = "lambda-policy-attachment"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  roles      = [aws_iam_role.lambda_execution_role.name]
}

resource "aws_iam_policy" "s3_dynamodb_full_access_policy" {
  name        = "s3-dynamodb-full-access-policy"
  description = "Policy for full access to S3 and DynamoDB"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:*"
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "dynamodb:*"
        Resource = "*"
      },
      
    ]
  })
}

# TODO: Fine grain
resource "aws_iam_role_policy_attachment" "s3_dynamo_full_access_attachment" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = aws_iam_policy.s3_dynamodb_full_access_policy.arn
}


### Zip & Lambda

resource "aws_s3_bucket" "pbars_lambdas_bucket" {
  bucket = "year-progress-bar-lambdas" 

  tags = {
    Name    = "Progress Bars Lambda Bucket"
    Project = "Progress Bars"
  }
}


resource "aws_s3_bucket_object" "auth_token_creation_zip" {
  bucket = aws_s3_bucket.pbars_lambdas_bucket.bucket
  source = "../backend/auth-token-creation/auth-token-creation.zip"
  key    = "auth-token-creation.zip"
  content_type  = "application/zip"
}

resource "aws_lambda_function" "node_auth_token_creation" {
  function_name = "node-auth-token-creation"
  s3_bucket     = aws_s3_bucket.pbars_lambdas_bucket.bucket
  s3_key        = aws_s3_bucket_object.auth_token_creation_zip.key

  handler = "index.handler"
  runtime = "nodejs22.x"  

  role = aws_iam_role.lambda_execution_role.arn
  timeout = 100
  memory_size = 128

  environment {
    variables = {
        FILE_NAME = var.lambda_auth_file_name
        BUCKET_NAME = var.lambda_auth_bucket_name
        JWT_SECRET = var.jwt_secret # openssl rand -base64 64 generated
    }
  }
}

resource "aws_lambda_permission" "allow_apigateway_invocation" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.node_auth_token_creation.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-west-1:${data.aws_caller_identity.current.account_id}:${var.api_id}/*/POST/users_auth"
}


resource "aws_s3_bucket_object" "auth_token_invalidation_zip" {
  bucket = aws_s3_bucket.pbars_lambdas_bucket.bucket
  source = "../backend/auth-token-invalidation/auth-token-invalidation.zip"
  key    = "auth-token-invalidation.zip"
  content_type  = "application/zip"
}

resource "aws_lambda_function" "node_auth_token_invalidation" {
  function_name = "node-auth-token-invalidation"
  s3_bucket     = aws_s3_bucket.pbars_lambdas_bucket.bucket
  s3_key        = aws_s3_bucket_object.auth_token_invalidation_zip.key

  handler = "index.handler"
  runtime = "nodejs22.x"  

  role = aws_iam_role.lambda_execution_role.arn
  timeout = 100
  memory_size = 128
}

resource "aws_lambda_permission" "allow_apigateway_invocation_invalidation" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.node_auth_token_invalidation.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-west-1:${data.aws_caller_identity.current.account_id}:${var.api_id}/*/POST/users_auth/logout"
}


### token refresh
resource "aws_s3_bucket_object" "node_auth_token_refresh" {
  bucket = aws_s3_bucket.pbars_lambdas_bucket.bucket
  source = "../backend/auth-token-refresh/auth-token-refresh.zip"
  key    = "auth-token-refresh.zip"
  content_type  = "application/zip"
}

resource "aws_lambda_function" "node_auth_token_refresh" {
  function_name = "node-auth-token-refresh"
  s3_bucket     = aws_s3_bucket.pbars_lambdas_bucket.bucket
  s3_key        = aws_s3_bucket_object.node_auth_token_refresh.key

  handler = "index.handler"
  runtime = "nodejs22.x"  
  depends_on = [aws_s3_bucket_object.node_auth_token_refresh]


  role = aws_iam_role.lambda_execution_role.arn
  timeout = 100
  memory_size = 128

  environment {
    variables = {
        JWT_SECRET = var.jwt_secret
    }
  }
}

resource "aws_lambda_permission" "allow_apigateway_invocation_refresh" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.node_auth_token_refresh.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-west-1:${data.aws_caller_identity.current.account_id}:${var.api_id}/*/POST/users_auth/refresh"
}


resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name = "/aws/lambda/node-auth-token-refresh"
  retention_in_days = 7
}

### token authorizer
resource "aws_s3_bucket_object" "node_auth_token_authorizer" {
  bucket = aws_s3_bucket.pbars_lambdas_bucket.bucket
  source = "../backend/auth-token-authorizer/auth-token-authorizer.zip"
  key    = "auth-token-authorizer.zip"
  content_type  = "application/zip"
}

resource "aws_lambda_function" "node_auth_token_authorizer" {
  function_name = "node-auth-token-authorizer"
  s3_bucket     = aws_s3_bucket.pbars_lambdas_bucket.bucket
  s3_key        = aws_s3_bucket_object.node_auth_token_authorizer.key

  handler = "index.handler"
  runtime = "nodejs22.x"  
  depends_on = [aws_s3_bucket_object.node_auth_token_authorizer]


  role = aws_iam_role.lambda_execution_role.arn
  timeout = 100
  memory_size = 128

  environment {
    variables = {
        JWT_SECRET = var.jwt_secret
    }
  }
}

resource "aws_lambda_permission" "allow_apigateway_invocation_authorizer" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.node_auth_token_refresh.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-west-1:${data.aws_caller_identity.current.account_id}:${var.api_id}/*/POST/*/*"
}




#### api gateway authorizer

resource "aws_iam_role" "api_gateway_authorizer_role" {
  name = "api-gateway-authorizer-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_lambda_permission" "api_gateway_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.node_auth_token_authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.user_data_api.execution_arn}/*/*"
}

resource "aws_iam_policy" "lambda_invoke_policy" {
  name        = "lambda-invoke-policy"
  description = "Policy to allow API Gateway to invoke Lambda authorizer"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "lambda:InvokeFunction"
        ],
        Effect = "Allow",
        Resource = aws_lambda_function.node_auth_token_authorizer.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "api_gateway_lambda_invoke" {
  role       = aws_iam_role.api_gateway_authorizer_role.name
  policy_arn = aws_iam_policy.lambda_invoke_policy.arn
}

resource "aws_api_gateway_authorizer" "login_token_gateway_authorizer" {
  name            = "TokenAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.user_data_api.id
  authorizer_uri  = aws_lambda_function.node_auth_token_authorizer.invoke_arn 
  type            = "REQUEST"
  identity_source = "method.request.header.login-auth-token"
  authorizer_credentials = aws_iam_role.api_gateway_authorizer_role.arn
  authorizer_result_ttl_in_seconds = 300 # token caching
}

### generic 200 endpoint
resource "aws_s3_bucket_object" "node_success_response" {
  bucket = aws_s3_bucket.pbars_lambdas_bucket.bucket
  source = "../backend/success-response/node-success-response.zip"
  key    = "node-success-response.zip"
  content_type  = "application/zip"
}

resource "aws_lambda_function" "node_success_response" {
  function_name = "node-success-response"
  s3_bucket     = aws_s3_bucket.pbars_lambdas_bucket.bucket
  s3_key        = aws_s3_bucket_object.node_success_response.key

  handler = "index.handler"
  runtime = "nodejs22.x"  
  depends_on = [aws_s3_bucket_object.node_success_response]


  role = aws_iam_role.lambda_execution_role.arn
  timeout = 100
  memory_size = 128

  environment {
    variables = {
        JWT_SECRET = var.jwt_secret
    }
  }
}

resource "aws_lambda_permission" "allow_apigateway_success_response" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.node_success_response.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:us-west-1:${data.aws_caller_identity.current.account_id}:${var.api_id}/*/POST/*/*"
}