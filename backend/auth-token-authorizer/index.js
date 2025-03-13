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

const getCookieValue = (cookieString, cookieName) => {
  const cookies = cookieString.split("; ");
  for (let cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === cookieName) return value;
  }
  return null;
};

exports.handler = async (event) => {
  const cookies = event.headers.Cookie || event.headers.cookie;
  try {
    const accessToken = getCookieValue(cookies, "accessToken");
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
