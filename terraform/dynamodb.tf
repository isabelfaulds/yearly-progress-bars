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

resource "aws_dynamodb_table" "cookie_tokens" {
  name = "pb_cookie_tokens"
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


resource "aws_dynamodb_table" "users" {
  name = "pb_users"
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

resource "aws_dynamodb_table" "calendar_events" {
  name = "pb_events"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "event_uid"

  attribute {
    name = "event_uid"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "event_date"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdDateIndex"
    hash_key        = "user_id"
    range_key       = "event_date"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "user_categories" {
  name = "pb_categories"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "category_uid"

  attribute {
    name = "category_uid"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }
}