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
  // Broader arn for less invocations
  const methodArn = event.methodArn;
  const arnParts = methodArn.split(":");
  const apiGatewayArn = arnParts[5].split("/");
  const region = arnParts[3];
  const accountId = arnParts[4];
  const apiId = apiGatewayArn[0];
  const stage = apiGatewayArn[1];
  try {
    const decodedToken = jwt.verify(accessToken, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    console.log(
      "Permitting",
      `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/*`
    );
    return generatePolicy(
      userId,
      "Allow",
      `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/*`
    );
  } catch (error) {
    console.error("JWT verification failed:", error);
    return generatePolicy(
      "user",
      "Deny",
      `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/*`
    );
  }
};
