variable "lambda_auth_file_name" {
  description = "The name of the Firebase Admin SDK service account file"
  type        = string
}

variable "lambda_auth_bucket_name" {
  description = "The name of the S3 bucket containing the Firebase Admin SDK service account file"
  type        = string
}

variable "jwt_secret" {
  description = "String used for jwt tokens"
  type        = string
}

variable "api_id" {
  description = "api gateway id"
  type = string
}