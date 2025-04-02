const corsheaders = {
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
};

const allowedOrigins = [
  "https://year-progress-bar.com",
  "https://localhost:5173",
];

exports.handler = async (event) => {
  let origin = event.headers.origin;
  let accessControlAllowOrigin = null;
  if (allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": accessControlAllowOrigin,
      ...corsheaders,
    },
    body: JSON.stringify({
      message: "Validated",
    }),
    isBase64Encoded: false,
  };
};
