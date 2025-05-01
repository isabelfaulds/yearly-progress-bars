const {
  UpdateItemCommand,
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const corsheaders = {
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
};

const allowedOrigins = [
  "https://year-progress-bar.com",
  "https://localhost:5173",
];

const client = new DynamoDBClient({ region: "us-west-1" });
const tableName = "pb_events";

// Updates
async function handleUpdate(item) {
  if (item) {
    const { event_uid, category_uid, category } = item;
    const params = {
      TableName: tableName,
      Key: { event_uid: { S: event_uid } },
      UpdateExpression:
        "SET category_uid = :category_uid, category = :category",
      ExpressionAttributeValues: {
        ":category_uid": { S: category_uid },
        ":category": { S: category },
      },
      ReturnValues: "ALL_NEW",
    };
    const command = new UpdateItemCommand(params);
    try {
      const response = await client.send(command);
      return response.Attributes;
    } catch (error) {
      console.error("Error updating item:", error);
      return { error: error.message, item };
    }
  }
  return null;
}

exports.handler = async (event) => {
  let origin = event.headers.origin;
  let accessControlAllowOrigin = null;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }
  if (event.body !== null && event.body !== undefined) {
    body = JSON.parse(event.body);
    console.log("body", body);
  }

  try {
    let userId = event.headers["user-id"];
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing user-id" }),
        headers: {
          "Access-Control-Allow-Origin": accessControlAllowOrigin,
          ...corsheaders,
        },
      };
    }

    let event_uid = event.pathParameters.event_uid;
    if (!event_uid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing event_uid" }),
        headers: {
          "Access-Control-Allow-Origin": accessControlAllowOrigin,
          ...corsheaders,
        },
      };
    }

    let category_uid = body.category_uid;
    let category = body.category;

    const updatedItem = await handleUpdate({
      event_uid,
      category_uid,
      category,
    });

    console.log("updatedItem", updatedItem);

    if (!category_uid || !category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing category_uid or category" }),
        headers: {
          "Access-Control-Allow-Origin": accessControlAllowOrigin,
          ...corsheaders,
        },
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
      body: JSON.stringify({
        message: "Event Updated",
      }),
      isBase64Encoded: false,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
      isBase64Encoded: false,
    };
  }
};
