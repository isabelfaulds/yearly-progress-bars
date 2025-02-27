const {
  DynamoDBClient,
  GetItemCommand,
  DeleteItemCommand,
} = require("@aws-sdk/client-dynamodb");

const dynamoClient = new DynamoDBClient({ region: "us-west-1" });

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

  const accessToken = getCookieValue(cookies, "accessToken");
  console.log(accessToken);

  if (!accessToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Access token missing from cookies." }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Logout successful",
    }),
  };
};
