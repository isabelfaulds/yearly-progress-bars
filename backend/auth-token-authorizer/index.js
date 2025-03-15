const jwt = require("jsonwebtoken");

function generatePolicy(principalId, effect, resource) {
  const authResponse = {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
  return authResponse;
}

exports.handler = async (event) => {
  const accessToken = event.headers["login-auth-token"];
  try {
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    console.log("User ID from JWT:", userId);
    return generatePolicy(
      userId,
      "Allow",
      `arn:aws:execute-api:${event.region}:${event.accountId}:${event.apiId}/${event.stage}/*/*`
    );
  } catch (error) {
    console.error("JWT verification failed:", error);
    return generatePolicy(
      "user",
      "Deny",
      `arn:aws:execute-api:${event.region}:${event.accountId}:${event.apiId}/${event.stage}/*/*`
    );
  }
};
