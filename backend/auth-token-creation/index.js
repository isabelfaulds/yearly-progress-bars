const admin = require("firebase-admin");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");
const jwt = require("jsonwebtoken");
const s3Client = new S3Client({ region: "us-west-1" });
const dynamoClient = new DynamoDBClient({ region: "us-west-1" });

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
};
const allowedOrigins = [
  "https://year-progress-bar.com",
  "https://localhost:5173",
];

async function addUserAndTokens(
  userID,
  email,
  datetime,
  gapiToken,
  refreshToken,
  expiresIn,
  cookieToken,
  refreshCookieToken
) {
  try {
    console.log(userID, email, datetime);

    const userResult = await dynamoClient.send(
      // Await each operation
      new PutItemCommand({
        TableName: "pb_users",
        Item: {
          user_id: { S: userID },
          email: { S: email },
          datetime: { S: datetime },
        },
      })
    );
    console.log("pb_users insert result:", userResult); // Log the result

    const tokenResult = await dynamoClient.send(
      new PutItemCommand({
        TableName: "pb_user_tokens",
        Item: {
          user_id: { S: userID },
          provider: { S: "firebase" },
          accessToken: { S: gapiToken },
          refreshToken: { S: refreshToken },
          datetime: { S: datetime },
          expiresIn: { N: "3600" },
        },
      })
    );
    console.log("pb_user_tokens insert result:", tokenResult); // Log the result

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
    return { userResult, tokenResult, cookieTokenResult };
  } catch (error) {
    console.error("Error adding user and tokens:", error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log(event.headers);
  let origin = event.headers.origin;
  let accessControlAllowOrigin = null;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsHeaders,
      },
      body: "",
    };
  }

  let requestBody = event.body;
  if (typeof requestBody === "string") {
    requestBody = JSON.parse(requestBody);
  }
  const userID = requestBody.userID;
  const email = requestBody.email;
  const token = requestBody.token;
  const gapiToken = requestBody.gapiToken;
  const refreshToken = requestBody.refreshToken;
  const datetime = requestBody.datetime;
  const expiresIn = requestBody.expiresIn;
  console.log("Request Body:", requestBody);
  console.log("token", token);

  if (!admin.apps.length) {
    const bucketName = process.env.BUCKET_NAME;
    const fileName = process.env.FILE_NAME;
    const data = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      })
    );
    const rawContent = await streamToString(data.Body);
    const serviceAccount = JSON.parse(rawContent);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized.");
  }
  console.log("Admin apps length", admin.apps.length);
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("Decoded Token:", decodedToken);
    const cookieToken = jwt.sign({ userID }, process.env.JWT_SECRET, {
      expiresIn: "1hr",
    });
    const refreshCookieToken = jwt.sign({ userID }, process.env.JWT_SECRET, {
      expiresIn: "8d",
    });

    const results = await addUserAndTokens(
      userID,
      email,
      datetime,
      gapiToken,
      refreshToken,
      expiresIn,
      cookieToken,
      refreshCookieToken
    );
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Authentication Success!",
      }),
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsHeaders,
        "Set-Cookie": `refreshToken=${refreshCookieToken}; Path=/; Max-Age=691200; HttpOnly; SameSite=None; Secure; Domain=year-progress-bar.com`,
        "set-cookie": `accessToken=${cookieToken}; Path=/; Max-Age=3600; HttpOnly; SameSite=None; Secure; Domain=year-progress-bar.com`,
      },
    };
  } catch (error) {
    console.error("Error validating user:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request" }),
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsHeaders,
      },
    };
  }
};
