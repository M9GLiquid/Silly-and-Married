const {
  GUEST_UPLOADS_FOLDER,
  OneDriveError,
  PICTURES_FOLDER,
  VIDEOS_FOLDER,
  buildStoredFileName,
  encodeDrivePath,
  ensureFolderPath,
  getAccessToken,
  getFileKind,
  getPublicError,
  getRequestId,
  getRootFolder,
  graphFetch,
  jsonResponse,
  parseJsonBody,
  sanitizeText
} = require("./onedrive-utils");

const DEFAULT_MAX_UPLOAD_MB = 8192;

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

exports.handler = async (event) => {
  const requestId = getRequestId(event);

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      error: "Method not allowed.",
      code: "method_not_allowed",
      requestId
    });
  }

  try {
    const body = parseJsonBody(event);
    const originalFileName = sanitizeText(body.fileName, 240);
    const mimeType = sanitizeText(body.mimeType, 120).toLowerCase();
    const size = Number(body.size || 0);
    const kind = getFileKind(mimeType, originalFileName);
    const configuredMaxUploadMb = Number(process.env.MAX_UPLOAD_MB || DEFAULT_MAX_UPLOAD_MB);
    const maxUploadMb = Number.isFinite(configuredMaxUploadMb) && configuredMaxUploadMb > 0
      ? configuredMaxUploadMb
      : DEFAULT_MAX_UPLOAD_MB;
    const maxBytes = maxUploadMb * 1024 * 1024;

    if (!originalFileName || !kind) {
      return jsonResponse(400, {
        error: originalFileName
          ? `“${originalFileName}” is not a supported photo or video.`
          : "The selected file has no name. Choose it again.",
        code: "unsupported_file_type",
        requestId
      });
    }
    if (!Number.isFinite(size) || size <= 0) {
      return jsonResponse(400, {
        error: `“${originalFileName}” is empty (0 B) and cannot be uploaded.`,
        code: "empty_file",
        fileName: originalFileName,
        attemptedBytes: Number.isFinite(size) ? size : 0,
        maxBytes,
        requestId
      });
    }
    if (size > maxBytes) {
      return jsonResponse(400, {
        error: `“${originalFileName}” is ${formatFileSize(size)}. The maximum file size is ${formatFileSize(maxBytes)}. Choose a smaller file and try again.`,
        code: "file_too_large",
        fileName: originalFileName,
        attemptedBytes: size,
        maxBytes,
        requestId
      });
    }

    const rootFolder = getRootFolder();
    const mediaFolder = kind === "picture" ? PICTURES_FOLDER : VIDEOS_FOLDER;
    const storedFileName = buildStoredFileName({
      originalFileName,
      mimeType
    });
    const accessToken = await getAccessToken();

    await ensureFolderPath(accessToken, [rootFolder, GUEST_UPLOADS_FOLDER, mediaFolder]);

    const filePath = [rootFolder, GUEST_UPLOADS_FOLDER, mediaFolder, storedFileName];
    const graphPath = `/me/drive/root:/${encodeDrivePath(filePath)}:/createUploadSession`;
    const session = await graphFetch(accessToken, graphPath, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "rename",
          name: storedFileName
        }
      }),
      retryAttempts: 4
    });

    if (!session?.uploadUrl) {
      throw new OneDriveError("Microsoft did not return an upload session URL.", {
        status: 502,
        code: "missing_upload_url"
      });
    }

    return jsonResponse(200, {
      uploadUrl: session.uploadUrl,
      expiresAt: session.expirationDateTime,
      kind,
      originalFileName,
      storedFileName,
      sourceFolder: GUEST_UPLOADS_FOLDER,
      folder: mediaFolder,
      metadataFileName: storedFileName.replace(/\.[^/.]+$/, ".json"),
      requestId
    });
  } catch (error) {
    console.error("OneDrive upload session failure", {
      requestId,
      code: error?.code,
      status: error?.status,
      message: error instanceof Error ? error.message : String(error)
    });
    const publicError = getPublicError(
      error,
      "Could not prepare the OneDrive upload.",
      requestId
    );
    return jsonResponse(publicError.status, publicError.body);
  }
};

exports.handler = require('../lib/require-media-session.cjs').withMediaSession(exports.handler);
