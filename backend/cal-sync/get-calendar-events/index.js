const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");

const corsheaders = {
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
  "Content-Type": "application/json",
};

const allowedOrigins = [
  "https://year-progress-bar.com",
  "https://localhost:5173",
];
const dynamodb = new DynamoDBClient({ region: "us-west-1" });

function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

exports.handler = async (event) => {
  let accessControlAllowOrigin = allowedOrigins[0];

  try {
    let origin = event.headers.origin;
    if (allowedOrigins.includes(origin)) {
      accessControlAllowOrigin = origin;
    }
    let userId = event.headers["user-id"];
    const eventDate = event.queryStringParameters.event_date;
    if (!userId || !eventDate) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing user-id or event_date" }),
        headers: {
          "Access-Control-Allow-Origin": accessControlAllowOrigin,
          ...corsheaders,
        },
      };
    }
    console.log("User ID:", userId);
    console.log("Event Date:", eventDate);

    // DynamoDB query
    const params = {
      TableName: "pb_events",
      IndexName: "UserIdDateIndex",
      KeyConditionExpression:
        "user_id = :user_id AND event_startdate = :event_date",
      ExpressionAttributeValues: {
        ":user_id": { S: userId },
        ":event_date": { S: eventDate },
      },
      Select: "ALL_ATTRIBUTES",
    };

    const result = await dynamodb.send(new QueryCommand(params));

    // Formatting
    const formattedEvents = result.Items.map((item) => ({
      event_uid: item.event_uid.S,
      category: item.category?.S ? titleCase(item.category.S) : "Placeholder",
      start_date: item.event_startdate.S,
      // tasks can be without time
      start_time: item.event_starttime?.S ? item.event_starttime.S : null,
      event_name: item.event_name.S,
      minutes: Number(item.minutes.N),
    }));
    console.log("Returning Formatted Events:", formattedEvents);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
      body: JSON.stringify({ events: formattedEvents }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
    };
  }
};
