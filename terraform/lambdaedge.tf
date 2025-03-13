
# S3 Bucket in us-east-1 for Lambda@Edge code
resource "aws_s3_bucket" "pbars_lambdas_edge_bucket" {
  provider = aws.us_east_1
  bucket   = "pbars-lambda-edge-bucket"
}

### token authorizer
resource "aws_s3_bucket_object" "lambda_edge_cookie_parser" {
  provider = aws.us_east_1 
  bucket = aws_s3_bucket.pbars_lambdas_edge_bucket.bucket
  source = "../backend/lambda-edge-cookie-parser/lambda-edge-cookie-parser.zip"
  key    = "lambda-edge-cookie-parser.zip"
  content_type  = "application/zip"
  etag = filemd5("../backend/lambda-edge-cookie-parser/lambda-edge-cookie-parser.zip")
}

# Lambda@Edge Function , has to be us east 1
resource "aws_lambda_function" "lambda_edge_cookie_parser" {
  provider = aws.us_east_1 
  function_name = "lambda-edge-cookie-parser"
  handler       = "index.handler"
  s3_bucket     = aws_s3_bucket.pbars_lambdas_edge_bucket.bucket
  s3_key        = aws_s3_bucket_object.lambda_edge_cookie_parser.key

  runtime = "nodejs22.x"  
  depends_on = [aws_s3_bucket_object.lambda_edge_cookie_parser]
  publish       = true # Required for Lambda@Edge

  role = aws_iam_role.lambda_edge_role.arn
  timeout = 5
  memory_size = 128
}

# iam needs lamnda & edge lambda
resource "aws_iam_role" "lambda_edge_role" {
  name = "lambda-edge-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
        }
      }
    ]
  })
}

resource "aws_iam_policy" "lambda_edge_policy" {
  name = "lambda-edge-policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect = "Allow",
        Resource = "arn:aws:logs:*:*:log-group:/aws/lambda/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_edge_policy_attach" {
  role       = aws_iam_role.lambda_edge_role.name
  policy_arn = aws_iam_policy.lambda_edge_policy.arn
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "api_cloudfront_distribution" {
  origin {
    domain_name =  element(split("/", replace("${aws_api_gateway_deployment.user_data_deployment.invoke_url}", "https://", "")), 0)
    origin_id   = "APIGatewayOrigin"

    custom_origin_config {
      http_port             = 80
      https_port            = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "APIGatewayOrigin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "all"
      }
      headers = ["Authorization"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = "${aws_lambda_function.lambda_edge_cookie_parser.arn}:${aws_lambda_function.lambda_edge_cookie_parser.version}"
      include_body = true
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

