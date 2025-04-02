import boto3
from datetime import datetime
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import jwt
import os

def lambda_handler(event, context):
    jwt_secret = os.environ.get('JWT_SECRET')
    client_id = os.environ.get('CLIENT_ID')
    client_secret = os.environ.get('CLIENT_SECRET')
    dynamodb = boto3.resource('dynamodb')

    try:
        pb_access_token = event['headers']['login-auth-token']
        decoded_token = jwt.decode(pb_access_token, jwt_secret, algorithms=['HS256'])
        user_id = decoded_token.get('userID')

        token_table = dynamodb.Table('pb_user_tokens')
        response = token_table.get_item(Key={'user_id': user_id})
        item = response.get('Item')

        if not item:
            return {
                'statusCode': 404,
                'body': 'No gapi token found',
            }

        gapi_access_token, gapi_refresh_token = item['accessToken'], item['refreshToken']

        creds = Credentials(
            token=gapi_access_token,
            refresh_token=gapi_refresh_token,
            token_uri="https://accounts.google.com/o/oauth2/token",
            client_id=client_id,
            client_secret=client_secret,
        )

        calendar_service = build('calendar', 'v3', credentials=creds)
        calendar_events = dynamodb.Table('pb_events')

        events, page_token = [], None
        while True:
            events_result = calendar_service.events().list(
                calendarId=user_id,
                timeMin=datetime.now().isoformat()[:10] + 'T00:00:00.000000Z',
                singleEvents=True,
                orderBy='startTime',
                pageToken=page_token,
                timeMax=datetime.now().isoformat()[:10] + 'T23:59:00.000000Z',
            ).execute()

            events.extend(events_result.get('items', []))
            page_token = events_result.get('nextPageToken')
            if not page_token:
                break

        for event in events:
            event_bod = {
                "event_uid": f"{user_id}#cal#{event['id']}@google.com",
                "user_id": user_id,
                "event_name": event['summary'],
                "event_startdate": event['start']['dateTime'][:10],
                "event_starttime": event['start']['dateTime'].split('T')[1].split('-')[0],
                "event_enddate": event['end']['dateTime'][:10],
                "event_endtime": event['end']['dateTime'].split('T')[1].split('-')[0],
            }

            calendar_events.put_item(Item=event_bod)

        return {
            'statusCode': 200,
            'body': 'Events processed successfully',
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': f'Internal server error: {e}',
        }