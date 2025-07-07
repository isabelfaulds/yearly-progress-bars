const jwt = require("jsonwebtoken");

exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  try {
    const cookies = headers.cookie[0].value.split("; ");
    const accessToken = cookies
      .find((cookie) => cookie.startsWith("accessToken="))
      ?.split("=")[1];
    const decodedToken = jwt.verify(accessToken, jwt_secret);
    const userID = decodedToken.userID;
    console.log(decodedToken);

    if (userID) {
      headers["login-auth-token"] = [
        { key: "login-auth-token", value: accessToken },
      ];
      headers["user-id"] = [{ key: "user-id", value: userID }];
    }
  } catch (error) {
    console.log("Caught error", error);
  }

  callback(null, request);
};
