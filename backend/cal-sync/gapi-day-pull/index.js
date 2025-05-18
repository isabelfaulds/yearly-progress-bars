const {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const { DateTime } = require("luxon");
const dynamodb = new DynamoDBClient({ region: "us-west-1" });
const calendar = google.calendar("v3");

const allowedOrigins = [
  "https://year-progress-bar.com",
  "https://localhost:5173",
];

const corsheaders = {
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
  "Content-Type": "application/json",
};

function calculateMinuteDifferenceWithDate(
  startDateTimeString,
  endDateTimeString
) {
  try {
    const startTime = DateTime.fromISO(startDateTimeString);
    const endTime = DateTime.fromISO(endDateTimeString);

    const duration = endTime.diff(startTime, "minutes");

    return duration.minutes;
  } catch (error) {
    console.error("Error calculating minute difference:", error);
    return 0;
  }
}

exports.handler = async (event) => {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  let accessControlAllowOrigin = allowedOrigins[0];
  let origin = event.headers.origin;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }
  console.log(origin);
  console.log(accessControlAllowOrigin);
  // get token
  const userId = event.headers["user-id"];
  const tokenResponse = await dynamodb.send(
    new GetItemCommand({
      TableName: "pb_user_tokens",
      Key: { user_id: { S: userId } },
    })
  );

  const item = tokenResponse.Item ? unmarshall(tokenResponse.Item) : null;
  if (!item) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: "No gapi token found" }),
    };
  }
  const { accessToken: gapiAccessToken, refreshToken: gapiRefreshToken } = item;

  const oauth2Client = new OAuth2Client(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: gapiAccessToken,
    refresh_token: gapiRefreshToken,
    token_type: "Bearer",
  });

  // fetch paginated events
  const now = DateTime.now().setZone("America/Los_Angeles");
  const timeMin = now.startOf("day").toUTC().toISO();
  const timeMax = now.endOf("day").toUTC().toISO();
  let events = [];
  let pageToken = null;

  do {
    const eventsResult = await calendar.events.list({
      auth: oauth2Client,
      calendarId: userId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });

    events = events.concat(eventsResult.data.items || []);
    pageToken = eventsResult.data.nextPageToken;
  } while (pageToken);

  // store in dynamo
  const putRequests = events.map((event) => {
    const startDateTime = event.start.dateTime;
    const endDateTime = event.end.dateTime;
    let minutes = calculateMinuteDifferenceWithDate(startDateTime, endDateTime);
    return dynamodb.send(
      new PutItemCommand({
        TableName: "pb_events",
        Item: {
          event_uid: { S: `${userId}#cal#${event.id}@google.com` },
          user_id: { S: userId },
          event_name: { S: event.summary },
          event_startdate: { S: startDateTime.substring(0, 10) },
          event_starttime: { S: startDateTime.split("T")[1].split("-")[0] },
          event_enddate: { S: endDateTime.substring(0, 10) },
          event_endtime: { S: endDateTime.split("T")[1].split("-")[0] },
          minutes: { N: minutes.toString() },
        },
      })
    );
  });

  await Promise.all(putRequests);

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": accessControlAllowOrigin,
      ...corsheaders,
    },
    body: JSON.stringify({
      message: "Day records updated",
    }),
  };
};
