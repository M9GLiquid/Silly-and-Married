const {
  ensureFolderPath,
  getAccessToken,
  getPublicError,
  getRequestId,
  getRootFolder,
  graphFetch,
  jsonResponse
} = require("./onedrive-utils");

exports.handler = async (event) => {
  const requestId = getRequestId(event);

  if (!["GET", "HEAD"].includes(event.httpMethod)) {
    return jsonResponse(405, {
      error: "Method not allowed.",
      code: "method_not_allowed",
      requestId
    });
  }

  try {
    const rootFolder = getRootFolder();
    const accessToken = await getAccessToken();

    await graphFetch(accessToken, "/me/drive?$select=id,driveType", {
      method: "GET",
      retryAttempts: 3
    });
    await ensureFolderPath(accessToken, [rootFolder, "Pictures"]);
    await ensureFolderPath(accessToken, [rootFolder, "Videos"]);
    await ensureFolderPath(accessToken, [rootFolder, "Metadata"]);

    return jsonResponse(200, {
      ok: true,
      service: "onedrive-upload",
      foldersReady: true,
      requestId
    });
  } catch (error) {
    console.error("OneDrive health check failure", {
      requestId,
      code: error?.code,
      status: error?.status,
      message: error instanceof Error ? error.message : String(error)
    });
    const publicError = getPublicError(
      error,
      "The OneDrive upload service is unavailable.",
      requestId
    );
    return jsonResponse(publicError.status, {
      ok: false,
      ...publicError.body
    });
  }
};
