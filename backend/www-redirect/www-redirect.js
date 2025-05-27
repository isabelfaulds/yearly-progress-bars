function handler(event) {
  var request = event.request;
  var headers = request.headers;

  // Check if the Host header is www.year-progress-bar.com
  if (headers.host && headers.host.value === "www.year-progress-bar.com") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: { value: "https://year-progress-bar.com" + request.uri },
      },
    };
  }
  return request;
}
