const {
  GUEST_UPLOADS_FOLDER,
  METADATA_FOLDER,
  PICTURES_FOLDER,
  VIDEOS_FOLDER,
  encodeDrivePath,
  ensureFolderPath,
  getAccessToken,
  getRequestId,
  getRootFolder,
  graphFetch,
  jsonResponse,
  parseJsonBody,
  sanitizeText
} = require("./onedrive-utils");

exports.handler = async (event) => {
  const requestId = getRequestId(event);

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed.",
      code: "method_not_allowed",
      requestId
    });
  }

  let body;
  try {
    body = parseJsonBody(event);
  } catch (error) {
    console.warn("OneDrive metadata request was invalid", {
      requestId,
      message: error instanceof Error ? error.message : String(error)
    });
    return jsonResponse(200, {
      ok: false,
      warning: "The file uploaded, but its optional metadata could not be saved.",
      requestId
    });
  }

  const sourceFolder = sanitizeText(body.sourceFolder, 80) || GUEST_UPLOADS_FOLDER;
  const kind = sanitizeText(body.kind, 40);
  const folder = sanitizeText(body.folder, 80);
  const storedFileName = sanitizeText(body.storedFileName, 240);
  const metadataFileName = sanitizeText(body.metadataFileName, 240);

  const folderMatchesKind =
    (kind === "picture" && folder === PICTURES_FOLDER) ||
    (kind === "video" && folder === VIDEOS_FOLDER);
  if (
    sourceFolder !== GUEST_UPLOADS_FOLDER ||
    !folderMatchesKind ||
    !storedFileName ||
    !metadataFileName
  ) {
    console.warn("OneDrive metadata fields were incomplete", { requestId });
    return jsonResponse(200, {
      ok: false,
      warning: "The file uploaded, but its optional metadata was incomplete.",
      requestId
    });
  }

  try {
    const metadata = {
      source: "guest",
      sourceFolder,
      kind,
      folder,
      originalFileName: sanitizeText(body.originalFileName, 240),
      storedFileName,
      uploadedAt: new Date().toISOString()
    };
    const rootFolder = getRootFolder();
    const accessToken = await getAccessToken();

    await ensureFolderPath(accessToken, [rootFolder, METADATA_FOLDER]);

    const graphPath = `/me/drive/root:/${encodeDrivePath([
      rootFolder,
      METADATA_FOLDER,
      metadataFileName
    ])}:/content`;
    await graphFetch(accessToken, graphPath, {
      method: "PUT",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(metadata, null, 2),
      retryAttempts: 4
    });

    return jsonResponse(200, { ok: true, metadata, requestId });
  } catch (error) {
    console.warn("OneDrive metadata save failure", {
      requestId,
      code: error?.code,
      status: error?.status,
      message: error instanceof Error ? error.message : String(error)
    });
    return jsonResponse(200, {
      ok: false,
      warning: "The file uploaded successfully, but its optional metadata could not be saved.",
      requestId
    });
  }
};

exports.handler = require('../lib/require-media-session.cjs').withMediaSession(exports.handler);
