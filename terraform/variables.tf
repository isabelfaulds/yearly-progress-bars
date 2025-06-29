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

variable "client_id" {
  description = "client id"
  type = string
}

variable "client_secret" {
  description = "client secret"
  type = string
}

variable "openai_key" {
  description = "open ai key"
  type = string
}

variable "milestone_event_queue" {
  description = "Milestone event queue"
  type = string
}