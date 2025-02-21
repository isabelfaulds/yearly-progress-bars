const admin = require("firebase-admin");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
} = require("@aws-sdk/client-dynamodb");

const s3Client = new S3Client({ region: "us-west-1" });
const dynamoClient = new DynamoDBClient({ region: "us-west-1" });

const jwt = require("jsonwebtoken");

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });

let initialized = false;

exports.handler = async (event) => {
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
    initialized = true;
  }

  const requestBody = JSON.parse(event.body);
  const token = requestBody.token;
  const refreshToken = requestBody.refreshToken;
  const datetime = requestBody.datetime;
  const expiresIn = requestBody.expiresIn;
  const userID = requestBody.user_id;
  const email = requestBody.email;

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("Decoded Token:", decodedToken);
    const accessToken = jwt.sign({ userID }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshToken = jwt.sign({ userID }, process.env.JWT_SECRET, {
      expiresIn: "1hr",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Firebase user authenticated!",
      }),
    };
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to initialize Firebase Admin.",
        error: error.message,
      }),
    };
  }
};
