resource "aws_sqs_queue" "event_milestone_queue" {
  name                              = "event-milestone-linking-queue"
  delay_seconds                     = 300 # 5 minutes delay (300 seconds)
  max_message_size                  = 262144 # 256 KB
  message_retention_seconds         = 345600 # 4 days (345600 seconds)
  receive_wait_time_seconds         = 20 # Longer polling 20 seconds
  visibility_timeout_seconds        = 30 # Default visibility timeout

}

output "event_milestone_queue_arn" {
  description = "The ARN of the milestone SQS queue"
  value       = aws_sqs_queue.event_milestone_queue.arn
}