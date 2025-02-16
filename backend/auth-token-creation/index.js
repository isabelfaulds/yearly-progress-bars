const admin = require("firebase-admin");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ region: "us-west-1" });

const streamToString = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });

exports.handler = async (event) => {
  console.log("Firebase Admin initialized successfully.");
  const bucketName = process.env.BUCKET_NAME;
  const fileName = process.env.FILE_NAME;

  console.log("Bucket Name:", bucketName);
  console.log("File Name:", fileName);

  const data = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    })
  );
  try {
    const rawContent = await streamToString(data.Body);
    console.log("Raw Content from S3:", rawContent);
    const serviceAccount = JSON.parse(rawContent);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Firebase Admin initialized!",
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
