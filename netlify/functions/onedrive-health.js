const {
  GUEST_UPLOADS_FOLDER,
  METADATA_FOLDER,
  OUR_UPLOADS_FOLDER,
  PICTURES_FOLDER,
  VIDEOS_FOLDER,
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
    await ensureFolderPath(accessToken, [rootFolder, GUEST_UPLOADS_FOLDER, PICTURES_FOLDER]);
    await ensureFolderPath(accessToken, [rootFolder, GUEST_UPLOADS_FOLDER, VIDEOS_FOLDER]);
    await ensureFolderPath(accessToken, [rootFolder, OUR_UPLOADS_FOLDER, PICTURES_FOLDER]);
    await ensureFolderPath(accessToken, [rootFolder, OUR_UPLOADS_FOLDER, VIDEOS_FOLDER]);
    await ensureFolderPath(accessToken, [rootFolder, METADATA_FOLDER]);

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

exports.handler = require('../lib/require-media-session.cjs').withMediaSession(exports.handler);
