const {
  OneDriveError,
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

const DEFAULT_MAX_UPLOAD_MB = 2048;

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
    const photographer = sanitizeText(body.photographer, 120);
    const categorySlug = sanitizeText(body.categorySlug, 120);
    const categoryName = sanitizeText(body.categoryName, 120);
    const originalFileName = sanitizeText(body.fileName, 240);
    const mimeType = sanitizeText(body.mimeType, 120).toLowerCase();
    const size = Number(body.size || 0);
    const kind = getFileKind(mimeType, originalFileName);
    const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || DEFAULT_MAX_UPLOAD_MB);
    const maxBytes = maxUploadMb * 1024 * 1024;

    if (!categorySlug || !categoryName) {
      return jsonResponse(400, {
        error: "Choose a category before uploading.",
        code: "category_required",
        requestId
      });
    }
    if (!originalFileName || !kind) {
      return jsonResponse(400, {
        error: "Only supported picture and video files can be uploaded.",
        code: "unsupported_file_type",
        requestId
      });
    }
    if (!Number.isFinite(size) || size <= 0 || size > maxBytes) {
      return jsonResponse(400, {
        error: `The file must be smaller than ${Math.round(maxUploadMb)} MB.`,
        code: "invalid_file_size",
        requestId
      });
    }

    const rootFolder = getRootFolder();
    const mediaFolder = kind === "picture" ? "Pictures" : "Videos";
    const storedFileName = buildStoredFileName({
      categoryName,
      photographer,
      originalFileName,
      mimeType
    });
    const accessToken = await getAccessToken();

    await ensureFolderPath(accessToken, [rootFolder, mediaFolder]);

    const filePath = [rootFolder, mediaFolder, storedFileName];
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
      photographer,
      categorySlug,
      categoryName,
      originalFileName,
      storedFileName,
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
