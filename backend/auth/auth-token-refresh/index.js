const {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const jwt = require("jsonwebtoken");

const dynamoClient = new DynamoDBClient({ region: "us-west-1" });
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

function expiredToken(isoDateString, expiresInSeconds) {
  const date = new Date(isoDateString);
  const expirationTime = new Date(date.getTime() + expiresInSeconds * 1000); // expires in to milliseconds
  const currentTime = new Date();
  return expirationTime.getTime() < currentTime.getTime();
}

// get refresh token from nosql, user & expiration
async function getToken(refreshToken) {
  try {
    const scanResult = await dynamoClient.send(
      new ScanCommand({
        TableName: "pb_cookie_tokens",
        FilterExpression: "refreshToken = :refreshToken",
        ExpressionAttributeValues: {
          ":refreshToken": { S: refreshToken },
        },
      })
    );

    if (scanResult.Items && scanResult.Items.length > 0) {
      const item = unmarshall(scanResult.Items[0]); // assume 1
      return {
        userID: item.user_id,
        tokenTimestamp: item.tokenTimestamp,
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

// store access, refresh, & expirations for user
async function updateToken(
  userID,
  tokenTimestamp,
  refreshCookieToken,
  oldRefreshCookieToken
) {
  try {
    const cookieTokenUpdateResult = await dynamoClient.send(
      new UpdateItemCommand({
        TableName: "pb_cookie_tokens",
        Key: {
          user_id: { S: userID },
        },
        UpdateExpression:
          "SET refreshToken = :newRefreshToken , tokenTimestamp = :tokenTimestamp",
        ConditionExpression: "refreshToken = :oldRefreshToken",
        ExpressionAttributeValues: {
          ":newRefreshToken": { S: refreshCookieToken },
          ":oldRefreshToken": { S: oldRefreshCookieToken },
          ":tokenTimestamp": { S: tokenTimestamp },
        },
      })
    );

    console.log(
      "Inserting userID ",
      userID,
      "refreshCookieToken - ",
      refreshCookieToken,
      "pb_cookie_tokens insert result:",
      cookieTokenUpdateResult
    );
    return { success: true, data: cookieTokenUpdateResult };
  } catch (error) {
    console.error("Error adding user and tokens:", error);
    return { success: false, data: error };
  }
}

exports.handler = async (event) => {
  // Set Origin
  let origin = event.headers.origin;
  let accessControlAllowOrigin = null;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }
  // Access cookie
  const cookies = event.headers["Cookie"] || event.headers["cookie"];
  console.log("Cookies - ", cookies);

  const getCookieValue = (cookieString, cookieName) => {
    const cookies = cookieString.split("; ");
    for (let cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === cookieName) return value;
    }
    return null;
  };

  const refreshToken = getCookieValue(cookies, "refreshToken");
  console.log("Refresh Token - ", refreshToken);
  // Fail if no refresh token
  if (!refreshToken) {
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

  // Check db for refresh token
  const userAuth = await getToken(refreshToken);
  if (!userAuth) {
    console.log("Couldn't find ", refreshToken);
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "No token stored for user",
      }),
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
    };
  }

  // Fail if refresh token expired TODO: make ddb expire instead
  expired = expiredToken(userAuth.tokenTimestamp, userAuth.expiresIn);
  if (expired) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Session expired",
      }),
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
    };
  } else {
    // Re encode new
    const userID = userAuth.userID;
    const cookieToken = jwt.sign({ userID }, process.env.JWT_SECRET, {
      expiresIn: "1hr",
    });
    const refreshCookieToken = jwt.sign({ userID }, process.env.JWT_SECRET, {
      expiresIn: "10hr",
    });
    const tokenTimestamp = new Date().toISOString();
    // Store async function updateToken(userID, tokenTimestamp, refreshCookieToken, oldRefreshCookieToken)
    try {
      const updateResult = await updateToken(
        userID,
        tokenTimestamp,
        refreshCookieToken,
        refreshToken
      );
      console.log(
        "New refreshCookieTokenl stored ",
        userID,
        " ",
        refreshCookieToken,
        "\nReplacing old token ",
        userID,
        " ",
        refreshToken
      );
      if (updateResult.success) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Authorized and refreshed login",
          }),
          headers: {
            "Access-Control-Allow-Origin": accessControlAllowOrigin,
            ...corsheaders,
            "Set-Cookie": `refreshToken=${refreshCookieToken}; Path=/; Max-Age=36000; HttpOnly; SameSite=None; Secure; domain=year-progress-bar.com`,
            "set-cookie": `accessToken=${cookieToken}; Path=/; Max-Age=3600; HttpOnly; SameSite=None; Secure; domain=year-progress-bar.com`,
          },
        };
      } else {
        return {
          statusCode: 401,
          body: JSON.stringify({
            message: "Session expired",
          }),
          headers: {
            "Access-Control-Allow-Origin": accessControlAllowOrigin,
            ...corsheaders,
          },
        };
      }
    } catch {
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal server error",
        }),
        headers: {
          "Access-Control-Allow-Origin": accessControlAllowOrigin,
          ...corsheaders,
        },
      };
    }
  }
};
