const {
  buildStoredFileName,
  encodeDrivePath,
  getAccessToken,
  getFileKind,
  getRootFolder,
  graphFetch,
  jsonResponse,
  parseJsonBody,
  sanitizeText
} = require("./onedrive-utils");

const DEFAULT_MAX_UPLOAD_MB = 2048;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = parseJsonBody(event);
    const title = sanitizeText(body.title, 120);
    const description = sanitizeText(body.description, 1500);
    const originalFileName = sanitizeText(body.fileName, 240);
    const mimeType = sanitizeText(body.mimeType, 120).toLowerCase();
    const size = Number(body.size || 0);
    const kind = getFileKind(mimeType);
    const maxBytes = Number(process.env.MAX_UPLOAD_MB || DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;

    if (!title) {
      return jsonResponse(400, { error: "Title is required." });
    }
    if (!originalFileName || !kind) {
      return jsonResponse(400, { error: "Only photos and videos can be uploaded." });
    }
    if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
      return jsonResponse(400, { error: `File must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.` });
    }

    const rootFolder = getRootFolder();
    const mediaFolder = kind === "picture" ? "Pictures" : "Videos";
    const storedFileName = buildStoredFileName({ title, originalFileName, mimeType });
    const filePath = [rootFolder, mediaFolder, storedFileName];
    const graphPath = `/me/drive/root:/${encodeDrivePath(filePath)}:/createUploadSession`;
    const accessToken = await getAccessToken();
    const session = await graphFetch(accessToken, graphPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "rename",
          name: storedFileName
        }
      })
    });

    return jsonResponse(200, {
      uploadUrl: session.uploadUrl,
      expiresAt: session.expirationDateTime,
      kind,
      title,
      description,
      originalFileName,
      storedFileName,
      folder: mediaFolder,
      metadataFileName: storedFileName.replace(/\.[^/.]+$/, ".json")
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Could not create OneDrive upload session.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
