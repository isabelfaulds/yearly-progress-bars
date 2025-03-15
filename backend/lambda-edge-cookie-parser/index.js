exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const headers = request.headers;

  if (headers.cookie) {
    const cookies = headers.cookie[0].value.split("; ");
    const accessToken = cookies
      .find((cookie) => cookie.startsWith("accessToken="))
      ?.split("=")[1];

    if (accessToken) {
      headers["login-auth-token"] = [
        { key: "login-auth-token", value: accessToken },
      ];
    }
    delete headers.cookie; // Remove cookie from the request
  }

  callback(null, request);
};
