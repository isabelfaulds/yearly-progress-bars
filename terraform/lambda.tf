
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
      }
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
      }
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

# module path.function_name
  handler = "index.handler"
  runtime = "nodejs22.x"  

  role = aws_iam_role.lambda_execution_role.arn
  timeout = 100
  memory_size = 128

  environment {
    variables = {
        FILE_NAME = var.lambda_auth_file_name
        BUCKET_NAME = var.lambda_auth_bucket_name
        JWT_SECRET = var.jwt_secret
    }
  }
}

