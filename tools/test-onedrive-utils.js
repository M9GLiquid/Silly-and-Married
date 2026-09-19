const assert = require("assert");

const modulePath = require.resolve("../netlify/functions/onedrive-utils");

const loadFresh = () => {
  delete require.cache[modulePath];
  return require(modulePath);
};

const jsonResponse = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });

const run = async () => {
  process.env.MS_CLIENT_ID = "client";
  process.env.MS_CLIENT_SECRET = "secret";
  process.env.MS_REFRESH_TOKEN = "refresh";
  process.env.MS_TENANT_ID = "common";

  {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      return jsonResponse(200, { access_token: "token", expires_in: 3600 });
    };
    const utils = loadFresh();
    const first = await utils.getAccessToken();
    const second = await utils.getAccessToken();
    assert.equal(first, "token");
    assert.equal(second, "token");
    assert.equal(calls, 1);
    assert.equal(utils.getFileKind("", "photo.HEIC"), "picture");
    assert.equal(utils.getFileKind("", "clip.MOV"), "video");
  }

  {
    let calls = 0;
    global.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(503, { error: { code: "serviceNotAvailable" } });
      }
      return jsonResponse(200, { id: "drive" });
    };
    const utils = loadFresh();
    const data = await utils.graphFetch("token", "/me/drive", {
      method: "GET",
      retryAttempts: 2,
      allowTokenRefresh: false
    });
    assert.equal(data.id, "drive");
    assert.equal(calls, 2);
  }

  {
    const calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push({ url, method: options.method || "GET" });
      if (options.method === "GET") {
        const createdCount = calls.filter((call) => call.method === "POST").length;
        if (createdCount === 0 || (createdCount === 1 && url.includes("Pictures"))) {
          return jsonResponse(404, { error: { code: "itemNotFound" } });
        }
        return jsonResponse(200, { id: "folder", folder: {} });
      }
      return jsonResponse(201, { id: "folder", folder: {} });
    };
    const utils = loadFresh();
    await utils.ensureFolderPath("token", ["Wedding", "Pictures"]);
    assert.equal(calls.filter((call) => call.method === "POST").length, 2);
  }

  {
    global.fetch = async () =>
      jsonResponse(400, {
        error: "invalid_grant",
        error_description: "The refresh token has expired."
      });
    const utils = loadFresh();
    await assert.rejects(
      () => utils.getAccessToken(),
      (error) =>
        error.code === "invalid_grant" &&
        error.message.includes("npm run auth:onedrive")
    );
  }

  console.log("OneDrive utility tests passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
