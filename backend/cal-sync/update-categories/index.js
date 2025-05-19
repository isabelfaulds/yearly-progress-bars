const {
  DynamoDBClient,
  UpdateItemCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
} = require("@aws-sdk/client-dynamodb");

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
const client = new DynamoDBClient({ region: "us-west-1" });
const tableName = "pb_categories";

// Updates
async function handleUpdates(updates) {
  if (updates && updates.length > 0) {
    const updatePromises = updates.map(async (item) => {
      const { category_uid, minutes } = item;
      const params = {
        TableName: tableName,
        Key: { category_uid: { S: category_uid } },
        UpdateExpression: "SET #t = :minutes",
        ExpressionAttributeNames: { "#t": "minutes" },
        ExpressionAttributeValues: { ":minutes": { N: minutes.toString() } },
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
    });
    return Promise.all(updatePromises);
  }
  return [];
}

// Adds
async function handleAdds(adds, userId) {
  if (adds && adds.length > 0) {
    const createdAt = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

    const putRequests = adds.map((item) => {
      console.log("log add", {
        category_uid: { S: `${userId}:${item.category}` },
        category: { S: item.category },
        minutes: { N: item.minutes.toString() },
        user_id: { S: userId },
        created_at: { S: createdAt },
      });
      return {
        PutRequest: {
          Item: {
            category_uid: { S: `${userId}:${item.category}` },
            category: { S: item.category },
            minutes: { N: item.minutes.toString() },
            user_id: { S: userId },
            created_at: { S: createdAt },
          },
        },
      };
    });

    const batchWriteParams = {
      RequestItems: {
        [tableName]: putRequests,
      },
    };

    try {
      const response = await client.send(
        new BatchWriteItemCommand(batchWriteParams)
      );
      return response; // Return any unprocessed
    } catch (error) {
      console.error("Error batch writing items:", error);
      return { error: error.message };
    }
  }
  return {};
}

// deletes
async function handleDeletes(deletes) {
  if (deletes && deletes.length > 0) {
    const deletePromises = deletes.map(async (item) => {
      console.log(item);
      const { category_uid } = item;

      const params = {
        TableName: tableName,
        Key: { category_uid: { S: category_uid } },
      };

      const command = new DeleteItemCommand(params);

      try {
        const response = await client.send(command);
        return [];
      } catch (error) {
        console.error("Error deleting item:", error);
        return { error: error.message, item };
      }
    });
    return Promise.all(deletePromises);
  }
  return [];
}

exports.handler = async (event) => {
  let accessControlAllowOrigin = allowedOrigins[0];
  let origin = event.headers.origin;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }
  let body;

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

    if (event.body !== null && event.body !== undefined) {
      body = JSON.parse(event.body);
      console.log("body", body);
    }
    console.log(userId);
    let updates = body && body.update ? body.update : [];
    let deletes = body && body.delete ? body.delete : [];
    let adds = body && body.add ? body.add : [];

    console.log("updates", updates);
    console.log("deletes", deletes);
    console.log("adds", adds);

    const updateResults = await handleUpdates(updates);
    const addResults = await handleAdds(adds, userId);
    const deleteResults = await handleDeletes(deletes);

    console.log("updateResults", updateResults);
    console.log("addResults", addResults);
    console.log("deleteResults", deleteResults);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": accessControlAllowOrigin,
        ...corsheaders,
      },
      body: JSON.stringify({
        message: "Operations processed",
      }),
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
