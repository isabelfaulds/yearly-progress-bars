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
  "https://year-progress-bar.com",
];
const dynamodb = new DynamoDBClient({ region: "us-west-1" });

exports.handler = async (event) => {
  let accessControlAllowOrigin = allowedOrigins[0];
  let origin = event.headers.origin;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
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
    console.log("User ID:", userId);

    // DynamoDB query
    const params = {
      TableName: "pb_categories",
      IndexName: "UserIdIndex",
      KeyConditionExpression: "user_id = :user_id",
      ExpressionAttributeValues: {
        ":user_id": { S: userId },
      },
      Select: "ALL_ATTRIBUTES",
    };

    const result = await dynamodb.send(new QueryCommand(params));

    // Formatting
    const formattedCategories = result.Items.map((item) => ({
      category_uid: item.category_uid.S,
      category: item.category.S,
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
      body: JSON.stringify({ categories: formattedCategories }),
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
