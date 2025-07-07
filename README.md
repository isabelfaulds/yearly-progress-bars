# yearly-progress-bars

https://www.year-progress-bar.com

S3 website bucket , Route 53 & Cloudfront

##### Reuploading s3 files

- run build, test with `serve -s dist`
- apply replacement
- invalidate distribution cache

```
npm run build
serve -s dist
terraform apply -replace=aws_s3_bucket_object.dist_files
source .env
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*"
```

##### Seeing seo

- track in [search console](https://search.google.com/search-console/welcome?utm_source=about-page) - needs viewer permissions to access
- cname domain verification record for search in route 53 created in tf
- <meta name="description"> for content in search engine results below title
- social media link sharing tags ie "og:image" for social link snippets

##### Lambdas

- Creating new golang lambdas
  - using "provided.al2" runtime

```
go mod init lambda-name
go get github.com/aws/aws-lambda-go/lambda
# after script finished
go mod tidy
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip -r9 ./lambda-function.zip bootstrap

#making json encoded strings for testing
echo '{
        "EventUID": "test2",
        "userID": "testuser",
        "eventName": "testname"
      }' | \
python3 -c 'import json, sys; data = json.loads(sys.stdin.read()); print(json.dumps(data))' | \
sed 's/"/\\"/g' | sed 's/^/"/' | sed 's/$/"/'
```

- Redeploying lambdas : redeploy s3 object , delete function , redeploy

```
terraform replace --target=aws_s3_bucket_object.function_name
aws lambda delete-function --function-name function-name
terraform apply --target=aws_lambda_function.function_name
```
