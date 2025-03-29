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
  for_each = fileset("../frontend-web/dist", "**")
  bucket   = aws_s3_bucket.pbars_site_bucket.bucket
  key      = each.value
  source   = "../frontend-web/dist/${each.value}"
  etag     = filemd5("../frontend-web/dist/${each.value}")

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
  source = "frontend-web/assets/site-screenshot.png"  
  content_type  = "image/png"
}
