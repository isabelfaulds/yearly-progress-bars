# nearest provider
provider "aws" {
  region = "us-west-1"
}

# second provider for us east 1 cloudfront certs
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# already created domain
data "aws_route53_zone" "progress_bars_domain" {
  name = "year-progress-bar.com"
}

resource "aws_s3_bucket" "pbars_site_bucket" {
  bucket = "year-progress-bar.com" 

  tags = {
    Name    = "Progress Bars Site Bucket"
    Project = "Progress Bars"
  }
}

# Disable Block Public Access for the S3 Bucket
resource "aws_s3_bucket_public_access_block" "pbars_site_public_access" {
  bucket = aws_s3_bucket.pbars_site_bucket.bucket

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket Policy for Public Read Access
resource "aws_s3_bucket_policy" "pbars_site_bucket_policy" {
  bucket = aws_s3_bucket.pbars_site_bucket.bucket

  policy = data.aws_iam_policy_document.pbars_site_bucket_policy.json
}

# IAM Policy Document for Public Access
data "aws_iam_policy_document" "pbars_site_bucket_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["arn:aws:s3:::year-progress-bar.com/*"]

    # Allow public access to the bucket
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket_website_configuration" "pbars_website" {
  bucket = aws_s3_bucket.pbars_site_bucket.bucket

  index_document {
    suffix = "index.html"  # default page
  }

  error_document {
    key = "index.html"  # same page for spa
  }
}

resource "aws_s3_bucket_versioning" "pbars_versioning" {
  bucket = aws_s3_bucket.pbars_site_bucket.bucket

  versioning_configuration {
    status = "Enabled"  # You can also set this to "Suspended" to disable versioning
  }
}


# Cloudfront ACM Certificates live in us-east-1
resource "aws_acm_certificate" "progress_bars_site_cert" {
  provider = aws.us_east_1 

  domain_name = "year-progress-bar.com"
  validation_method = "DNS"

  # including www.
  subject_alternative_names = [
    "www.year-progress-bar.com"
  ]

  tags = {
    Name = "Progress Bars Site Cert",
    Project = "Progress Bars"
  }
}

# DNS Validation Record for ACM Certificate root domain
resource "aws_route53_record" "pbars_root_cert_validation" {
depends_on = [aws_acm_certificate.progress_bars_site_cert]

  zone_id = data.aws_route53_zone.progress_bars_domain.zone_id
  name    = tolist(aws_acm_certificate.progress_bars_site_cert.domain_validation_options)[0].resource_record_name
  type    = tolist(aws_acm_certificate.progress_bars_site_cert.domain_validation_options)[0].resource_record_type
  ttl     = "60"
  records = [tolist(aws_acm_certificate.progress_bars_site_cert.domain_validation_options)[0].resource_record_value]
}

# DNS Validation Record for ACM Certificate www subdomain
resource "aws_route53_record" "pbars_www_cert_validation" {
  depends_on = [aws_acm_certificate.progress_bars_site_cert]

  zone_id = data.aws_route53_zone.progress_bars_domain.zone_id
  name    = tolist(aws_acm_certificate.progress_bars_site_cert.domain_validation_options)[1].resource_record_name
  type    = tolist(aws_acm_certificate.progress_bars_site_cert.domain_validation_options)[1].resource_record_type
  ttl     = "60"
  records = [tolist(aws_acm_certificate.progress_bars_site_cert.domain_validation_options)[1].resource_record_value]
}


resource "aws_cloudfront_distribution" "pbars_cloudfront" {
  depends_on = [aws_acm_certificate.progress_bars_site_cert]
  aliases = ["year-progress-bar.com", "www.year-progress-bar.com"]

# custom origin not s3 origin when it's for s3 website ie s3-us-west-1.amazonaws.com
  origin {
    domain_name = "year-progress-bar.com.s3-website-us-west-1.amazonaws.com"
    origin_id   = "S3-year-progress-bar"
    custom_origin_config {
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"
    origin_ssl_protocols    = ["TLSv1.2"]
  }

  }

  enabled          = true
  is_ipv6_enabled  = true

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.progress_bars_site_cert.arn
    ssl_support_method   = "sni-only"
  }

  default_cache_behavior {
    target_origin_id = "S3-year-progress-bar"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods = ["GET", "HEAD"]
    cached_methods = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl = 0  # Minimum TTL for caching
    default_ttl = 86400  # Default TTL for caching (1 day)
    max_ttl = 86400  # Maximum TTL for caching
  }

  # Edges for Americas, Europe, Asia 
  price_class = "PriceClass_200"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }



}


resource "aws_route53_record" "root_pbar_domain" {
  zone_id = data.aws_route53_zone.progress_bars_domain.zone_id
  name    = "year-progress-bar.com"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.pbars_cloudfront.domain_name
    zone_id                = aws_cloudfront_distribution.pbars_cloudfront.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www_pbar_domain" {
  zone_id = data.aws_route53_zone.progress_bars_domain.zone_id
  name    = "www.year-progress-bar.com"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.pbars_cloudfront.domain_name
    zone_id                = aws_cloudfront_distribution.pbars_cloudfront.hosted_zone_id
    evaluate_target_health = false
  }
}

# seo records
resource "aws_route53_record" "google_site_verification" {
  zone_id = data.aws_route53_zone.progress_bars_domain.zone_id
  name    = "6beufh4he43j"        # Google domain verification
  type    = "CNAME"
  ttl     = 300
  records = ["gv-65kx35byon4ykz.dv.googlehosted.com"]  # Google domain verification
}


#### S3 Frontend Files

resource "aws_s3_bucket_object" "dist_files" {
  for_each = fileset("frontend-web/dist", "**")
  bucket   = aws_s3_bucket.pbars_site_bucket.bucket
  key      = each.value
  source   = "frontend-web/dist/${each.value}"
  etag     = filemd5("frontend-web/dist/${each.value}")

  content_type = lookup({
    "html" = "text/html",
    "css"  = "text/css",
    "js"   = "application/javascript",
    "svg"  = "image/svg+xml"
  }, split(".", each.value)[length(split(".", each.value)) - 1], "application/octet-stream")
}

resource "aws_s3_bucket_object" "background_image" {
  bucket = aws_s3_bucket.pbars_site_bucket.bucket
  key    = "images/blue-gradient-background.svg"
  source = "frontend/Desktop Shape Frame.svg"  
  content_type  = "image/svg+xml"
}

resource "aws_s3_bucket_object" "thumbnail_screenshot" {
  bucket = aws_s3_bucket.pbars_site_bucket.bucket
  key    = "images/site-screenshot.png"
  source = "frontend/assets/site-screenshot.png"  
  content_type  = "image/png"
}

### IAM
resource "aws_iam_role" "apigateway_dynamodb_role" {
  name = "pb_apigateway_dynamodb_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_policy" "apigateway_dynamodb_policy" {
  name = "apigateway_dynamodb_policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "dynamodb:PutItem",
        Effect   = "Allow",
        Resource = aws_dynamodb_table.user_tokens.arn
      },
    ]
  })
}

resource "aws_iam_policy_attachment" "apigateway_dynamodb_policy_attachment" {
  name       = "apigateway_dynamodb_policy_attachment"
  policy_arn = aws_iam_policy.apigateway_dynamodb_policy.arn
  roles       = [aws_iam_role.apigateway_dynamodb_role.name]
}

resource "aws_iam_role" "api_gateway_logging_role" {
  name = "APIGatewayCloudWatchRole"

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

resource "aws_iam_policy_attachment" "api_gateway_logging_policy" {
  name       = "api_gateway_logging_policy"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
  roles      = [aws_iam_role.api_gateway_logging_role.name]
}

resource "aws_api_gateway_account" "api_gateway_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_logging_role.arn
}

### Backend Tables

resource "aws_dynamodb_table" "user_tokens" {
  name = "pb_user_tokens"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }
}

### API Gateway

resource "aws_api_gateway_rest_api" "user_data_api" {
  name = "pb_user_data_api"
}

resource "aws_api_gateway_resource" "users_resource" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  parent_id   = aws_api_gateway_rest_api.user_data_api.root_resource_id
  path_part   = "user_tokens"
}

# post token data method
resource "aws_api_gateway_method" "store_user_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

# facilitates cross origin (client side) preflight requests options
resource "aws_api_gateway_method" "options_method" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_resource.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.store_user_method.resource_id
  http_method = "OPTIONS"
  type        = "MOCK"  # mock integration for OPTIONS

# required for preflight access
  request_templates = {
      "application/json" = jsonencode(
        {
          statusCode = 200
        }
      )
    }

  passthrough_behavior = "WHEN_NO_MATCH"
}

resource "aws_api_gateway_method_response" "options_method_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_resource.id
  http_method   = "OPTIONS"
  status_code   = "200"
  depends_on = [aws_api_gateway_method.options_method]

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true,
    "method.response.header.Access-Control-Allow-Methods" = true,
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "options_integration_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_resource.users_resource.id
  http_method   = "OPTIONS"
  status_code   = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type, Authorization, Origin'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS, POST'"
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  response_templates = {
    "application/json" = jsonencode({
      statusCode = 200
      headers = {
        "Access-Control-Allow-Origin"  = "*"
        "Access-Control-Allow-Methods" = "POST, OPTIONS"
        "Access-Control-Allow-Headers" = "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token"
      }
    })
  }
}

# ddb insertions
resource "aws_api_gateway_integration" "dynamodb_integration" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.store_user_method.resource_id
  http_method = aws_api_gateway_method.store_user_method.http_method
  integration_http_method = "POST" # put item
  type                    = "AWS" 
  credentials             = aws_iam_role.apigateway_dynamodb_role.arn

  uri = "arn:aws:apigateway:us-west-1:dynamodb:action/PutItem"

# 400 if template improperly formed
  request_templates = {
    "application/json" = <<EOF
{
  "TableName": "pb_user_tokens",
  "Item": {
    "user_id": { "S": "$input.path('$.user_id')" },
    "email": { "S": "$input.path('$.email')" },
    "token": { "S": "$input.path('$.token')" },
    "refresh_token": { "S": "$input.path('$.refresh_token')" },
    "datetime": { "S": "$input.path('$.datetime')" },
    "expires_in": { "S": "$input.path('$.expires_in')" }
  }
}
EOF
  }
  passthrough_behavior = "WHEN_NO_MATCH"
}


# API Gateway Method 200 Response
resource "aws_api_gateway_method_response" "store_user_response" {
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  resource_id   = aws_api_gateway_method.store_user_method.resource_id
  http_method   = aws_api_gateway_method.store_user_method.http_method
  status_code   = "200"

  response_parameters = {
      "method.response.header.Access-Control-Allow-Origin": true,
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,


  }
  
}

# API Gateway Integration 200 Response
resource "aws_api_gateway_integration_response" "dynamodb_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  resource_id = aws_api_gateway_method.store_user_method.resource_id
  http_method = aws_api_gateway_method.store_user_method.http_method
  status_code = aws_api_gateway_method_response.store_user_response.status_code

  depends_on = [aws_api_gateway_integration.dynamodb_integration] 
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin": "'*'"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "user_data_deployment" {
  rest_api_id = aws_api_gateway_rest_api.user_data_api.id
  triggers = {
    redeployment = sha1(jsonencode([
      # api gateway db placements
      aws_api_gateway_method.store_user_method,
      aws_api_gateway_integration.dynamodb_integration,
      aws_api_gateway_method_response.store_user_response,
      aws_api_gateway_integration_response.dynamodb_integration_response,
      # api gateway options for cors preflight confirmation
      aws_api_gateway_method.options_method,
      aws_api_gateway_integration.options_integration,
      aws_api_gateway_method_response.options_method_response,
      aws_api_gateway_integration_response.options_integration_response
    ]))
  }
}

resource "aws_api_gateway_stage" "dev" { 
  deployment_id = aws_api_gateway_deployment.user_data_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.user_data_api.id
  stage_name    = "dev"
}

output "api_endpoint" {
  value = aws_api_gateway_stage.dev.invoke_url # Use the stage's invoke_url
}
