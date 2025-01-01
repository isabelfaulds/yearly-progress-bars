# yearly-progress-bars

https://www.year-progress-bar.com

S3 website bucket , Route 53 & Cloudfront

Reuploading s3 files
- `terraform taint aws_s3_bucket_object.index_html`
- `terraform apply`
- `source .env`
- `aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --paths "/*" `
