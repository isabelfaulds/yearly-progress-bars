const {
  DynamoDBClient,
  ScanCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { unmarshall } = require("@aws-sdk/util-dynamodb");
const jwt = require("jsonwebtoken");

const dynamoClient = new DynamoDBClient({ region: "us-west-1" });
const corsheaders = {
  "Access-Control-Allow-Origin": "https://year-progress-bar.com",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
};

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
        datetime: item.datetime,
        refreshTokenexpiresIn: item.refreshToken,
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
async function putToken(userID, datetime, cookieToken, refreshCookieToken) {
  try {
    console.log(userID, datetime);
    const cookieTokenResult = await dynamoClient.send(
      new PutItemCommand({
        TableName: "pb_cookie_tokens",
        Item: {
          user_id: { S: userID },
          accessToken: { S: cookieToken },
          refreshToken: { S: refreshCookieToken },
          datetime: { S: datetime },
          accessTokenexpiresIn: { N: "3600" },
          refreshTokenexpiresIn: { N: "36000" },
        },
      })
    );
    console.log("pb_cookie_tokens insert result:", cookieTokenResult);
    return { cookieTokenResult };
  } catch (error) {
    console.error("Error adding user and tokens:", error);
    throw error;
  }
}

exports.handler = async (event) => {
  const cookies = event.headers["Cookie"] || event.headers["cookie"];
  const getCookieValue = (cookieString, cookieName) => {
    const cookies = cookieString.split("; ");
    for (let cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === cookieName) return value;
    }
    return null;
  };
  const refreshToken = getCookieValue(cookies, "refreshToken");
  if (!refreshToken) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Access token missing from cookies.",
      }),
      headers: {
        ...corsheaders,
      },
    };
  }
  const userAuth = await getToken(refreshToken);
  if (!userAuth) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "No token stored for user",
      }),
      headers: {
        ...corsheaders,
      },
    };
  }

  expired = expiredToken(userAuth.datetime, userAuth.expiresIn);
  if (expired) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        message: "Stale login",
      }),
      headers: {
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
    putToken(userID, new Date().toISOString(), cookieToken, refreshCookieToken);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Authorized and refreshed login",
      }),
      headers: {
        ...corsheaders,
        "Set-Cookie": `refreshToken=${refreshCookieToken}; Path=/; HttpOnly; Max-Age=36000; Secure; SameSite=None`,
        "set-cookie": `accessToken=${cookieToken}; Path=/; Max-Age=3600; HttpOnly; SameSite=None`,
      },
    };
  }
};
