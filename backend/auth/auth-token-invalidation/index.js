const {
  DynamoDBClient,
  ScanCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");

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
const dynamoClient = new DynamoDBClient({ region: "us-west-1" });

async function getUserID(accessToken) {
  try {
    const scanResult = await dynamoClient.send(
      new ScanCommand({
        TableName: "pb_cookie_tokens",
        FilterExpression: "accessToken = :accessToken",
        ExpressionAttributeValues: {
          ":accessToken": { S: accessToken },
        },
      })
    );

    if (scanResult.Items && scanResult.Items.length > 0) {
      const item = unmarshall(scanResult.Items[0]); // Assuming only one item matches
      return item.user_id;
    } else {
      return null; // Item not found
    }
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

async function deleteItem(userID) {
  try {
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: "pb_user_tokens",
        Key: {
          user_id: { S: userID },
        },
      })
    );
    console.log("Item deleted successfully.");
    const params = {
      TableName: "pb_cookie_tokens",
      Key: {
        user_id: { S: userID },
      },
    };
    await dynamoClient.send(new DeleteItemCommand(params));
    console.log("Item deleted successfully.");
  } catch (error) {
    console.error("Error deleting item:", error);
  }
}

exports.handler = async (event) => {
  let origin = event.headers.origin;
  let accessControlAllowOrigin = null;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }
  const cookies = event.headers["Cookie"] || event.headers["cookie"];
  const getCookieValue = (cookieString, cookieName) => {
    const cookies = cookieString.split("; ");
    for (let cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === cookieName) return value;
    }
    return null;
  };

  const accessToken = getCookieValue(cookies, "accessToken");
  console.log(accessToken);

  if (!accessToken) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Access token missing from cookies.",
      }),
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
    };
  }
  const userID = await getUserID(accessToken);
  console.log("Logging out", userID);
  deleteItem(userID);
  const pastDate = new Date(0).toUTCString(); // Invalidate with expire date Jan 1 1970

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Login invalidated",
    }),
    headers: {
      "Access-Control-Allow-Origin": accessControlAllowOrigin,
      ...corsheaders,
      "Set-Cookie": `accessToken=; Path=/; HttpOnly; Expires=${pastDate}; Secure; SameSite=None; Domain=year-progress-bar.com`,
      "set-cookie": `refreshToken=; Path=/; HttpOnly; Expires=${pastDate}; Secure; SameSite=None; Domain=year-progress-bar.com`,
    },
  };
};
