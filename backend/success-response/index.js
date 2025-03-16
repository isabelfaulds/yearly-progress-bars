const corsheaders = {
  "Access-Control-Allow-Origin": "https://www.year-progress-bar.com",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Origin, X-Amz-Date, X-Api-Key, X-Amz-Security-Token",
  "Access-Control-Allow-Credentials": "true",
};

exports.handler = (event, context, callback) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Validated",
    }),
    headers: {
      ...corsheaders,
    },
  };
};
