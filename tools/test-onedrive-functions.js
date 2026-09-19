const assert = require("assert");

const utilsPath = require.resolve("../netlify/functions/onedrive-utils");
const createPath = require.resolve("../netlify/functions/onedrive-create-upload-session");
const metadataPath = require.resolve("../netlify/functions/onedrive-save-metadata");
const healthPath = require.resolve("../netlify/functions/onedrive-health");
const verifyPath = require.resolve("../netlify/functions/onedrive-verify-upload");

const resetModules = () => {
  [utilsPath, createPath, metadataPath, healthPath, verifyPath].forEach((filePath) => {
    delete require.cache[filePath];
  });
};

const jsonResponse = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });

const event = (method, body = null) => ({
  httpMethod: method,
  headers: { "x-nf-request-id": "test-request" },
  body: body === null ? null : JSON.stringify(body)
});

const runCreateSessionTest = async () => {
  resetModules();
  let tokenCalls = 0;
  const createdFolders = new Set();

  global.fetch = async (url, options = {}) => {
    if (url.includes("/oauth2/v2.0/token")) {
      tokenCalls += 1;
      return jsonResponse(200, { access_token: "access", expires_in: 3600 });
    }
    if (options.method === "GET" && url.includes("/root:/")) {
      const drivePath = decodeURIComponent(url.split("/root:/")[1].split("?")[0]);
      if (createdFolders.has(drivePath)) {
        return jsonResponse(200, { id: drivePath, folder: {} });
      }
      return jsonResponse(404, { error: { code: "itemNotFound" } });
    }
    if (options.method === "POST" && url.endsWith("/children")) {
      const requestBody = JSON.parse(options.body);
      const parentMatch = url.match(/root:\/(.+):\/children$/);
      const parent = parentMatch ? decodeURIComponent(parentMatch[1]) : "";
      createdFolders.add(parent ? `${parent}/${requestBody.name}` : requestBody.name);
      return jsonResponse(201, { id: requestBody.name, folder: {} });
    }
    if (url.includes("/createUploadSession")) {
      return jsonResponse(200, {
        uploadUrl: "https://example.up.1drv.com/up/session",
        expirationDateTime: "2030-01-01T00:00:00Z"
      });
    }
    throw new Error(`Unexpected fetch ${options.method || "GET"} ${url}`);
  };

  const { handler } = require(createPath);
  const response = await handler(
    event("POST", {
      photographer: "",
      categorySlug: "guests",
      categoryName: "Guests",
      fileName: "IMG_0001.HEIC",
      mimeType: "",
      size: 1234
    })
  );

  assert.equal(response.statusCode, 200);
  const responseBody = JSON.parse(response.body);
  assert.ok(responseBody.uploadUrl);
  assert.equal(responseBody.kind, "picture");
  assert.equal(tokenCalls, 1);
  assert.ok(createdFolders.has("Wedding Ceremoni 2/Pictures"));
};

const runMetadataBestEffortTest = async () => {
  resetModules();
  global.fetch = async (url) => {
    if (url.includes("/oauth2/v2.0/token")) {
      return jsonResponse(200, { access_token: "access", expires_in: 3600 });
    }
    return jsonResponse(503, {
      error: { code: "serviceNotAvailable", message: "Temporary" }
    });
  };

  const { handler } = require(metadataPath);
  const response = await handler(
    event("POST", {
      categorySlug: "guests",
      categoryName: "Guests",
      storedFileName: "file.jpg",
      metadataFileName: "file.json",
      kind: "picture",
      folder: "Pictures",
      originalFileName: "photo.jpg"
    })
  );

  assert.equal(response.statusCode, 200);
  const responseBody = JSON.parse(response.body);
  assert.equal(responseBody.ok, false);
  assert.ok(responseBody.warning.includes("uploaded"));
};

const run = async () => {
  process.env.MS_CLIENT_ID = "client";
  process.env.MS_CLIENT_SECRET = "secret";
  process.env.MS_REFRESH_TOKEN = "refresh";
  process.env.MS_TENANT_ID = "common";
  process.env.ONEDRIVE_ROOT_FOLDER = "Wedding Ceremoni 2";

  await runCreateSessionTest();
  await runMetadataBestEffortTest();
  console.log("OneDrive function integration tests passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
