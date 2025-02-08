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
