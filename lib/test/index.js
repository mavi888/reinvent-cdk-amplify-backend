const https = require("https");
const AWS = require("aws-sdk");
const codepipeline = new AWS.CodePipeline();

const fetchPage = (url) => {
  let page = {
    body: "",
    statusCode: 0,
  };
  return new Promise((resolve, reject) => {
    https.get(url, function (response) {
      page.statusCode = response.statusCode;
      response.on("data", function (chunk) {
        page.body += chunk;
      });
      response.on("end", function () {
        resolve(page);
      });
      response.on("error", (error) => {
        reject(error);
      });
      response.resume();
    });
  });
};

const putJobSuccess = async (jobId, message) => {
  await codepipeline
    .putJobSuccessResult({
      jobId: jobId,
    })
    .promise();
  return message;
};

const putJobFailure = async (jobId, message, executionId) => {
  await codepipeline
    .putJobFailureResult({
      jobId: jobId,
      failureDetails: {
        message: JSON.stringify(message),
        type: "JobFailed",
        externalExecutionId: executionId,
      },
    })
    .promise();
  return message;
};

exports.handler = async (event, context) => {
  // Retrieve event data
  const jobId = event["CodePipeline.job"].id;
  const userParameters = JSON.parse(event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters);
  const url = userParameters.endpointUrl;

  // Validate URL
  if (!url || !url.includes("https://")) {
    return await putJobFailure(jobId, "Invalid URL: " + url, context.invokeid);
  }

  try {
    const page = await fetchPage(url);
    if (page.statusCode === 200) {
      return await putJobSuccess(jobId, "Tests passed.");
    } else {
      return await putJobFailure(
        jobId,
        "Invalid status code: " + page.statusCode,
        context.invokeid
      );
    }
  } catch (error) {
    return await putJobFailure(jobId, "Couldn't fetch page", context.invokeid);
  }
};
