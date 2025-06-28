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
    name = "event_startdate"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIdDateIndex"
    hash_key        = "user_id"
    range_key       = "event_startdate"
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


resource "aws_dynamodb_table" "saved_items" {
  name = "pb_saved_items"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "saved_item_uid"

  attribute {
    name = "saved_item_uid"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "category_uid"
    type = "S"
  }

  global_secondary_index {
    name            = "UserCategoryIndex"
    hash_key        = "user_id"
    range_key        = "category_uid"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "milestones" {
  name = "pb_milestones"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key = "milestone_user_datetime_uid"

  attribute {
    name = "milestone_user_datetime_uid"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "category_uid"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "UserCategoryIndex"
    hash_key        = "category_uid"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }

}

resource "aws_dynamodb_table" "calendars" {
  name = "pb_calendars"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "calendar_uid"

  attribute {
    name = "calendar_uid"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_dynamodb_table" "pb_milestone_sessions" {
  name = "pb_milestone_sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "milestone_session_uid"

  attribute {
    name = "milestone_session_uid"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "category_uid"
    type = "S"
  }

  global_secondary_index {
    name            = "UserIndex"
    hash_key        = "user_id"
    projection_type = "ALL"
  }
  
  global_secondary_index {
    name            = "UserCategoryIndex"
    hash_key        = "category_uid"
    projection_type = "ALL"
  }

  server_side_encryption {
    enabled = true
  }  
}