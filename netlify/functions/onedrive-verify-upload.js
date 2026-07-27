const {
  OneDriveError,
  encodeDrivePath,
  getAccessToken,
  getPublicError,
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

  try {
    const body = parseJsonBody(event);
    const folder = sanitizeText(body.folder, 40);
    const storedFileName = sanitizeText(body.storedFileName, 240);
    const expectedSize = Number(body.expectedSize || 0);

    if (!["Pictures", "Videos"].includes(folder) || !storedFileName) {
      return jsonResponse(400, {
        error: "Invalid upload verification request.",
        code: "invalid_verification_request",
        requestId
      });
    }

    const rootFolder = getRootFolder();
    const graphPath = `/me/drive/root:/${encodeDrivePath([
      rootFolder,
      folder,
      storedFileName
    ])}?$select=id,name,size,file`;
    const accessToken = await getAccessToken();

    let item;
    try {
      item = await graphFetch(accessToken, graphPath, {
        method: "GET",
        retryAttempts: 3
      });
    } catch (error) {
      if (error instanceof OneDriveError && error.status === 404) {
        return jsonResponse(200, {
          exists: false,
          sizeMatches: false,
          requestId
        });
      }
      throw error;
    }

    const actualSize = Number(item?.size || 0);
    return jsonResponse(200, {
      exists: !!item?.id,
      sizeMatches:
        Number.isFinite(expectedSize) &&
        expectedSize > 0 &&
        actualSize === expectedSize,
      requestId
    });
  } catch (error) {
    console.error("OneDrive upload verification failure", {
      requestId,
      code: error?.code,
      status: error?.status,
      message: error instanceof Error ? error.message : String(error)
    });
    const publicError = getPublicError(
      error,
      "Could not verify the completed OneDrive upload.",
      requestId
    );
    return jsonResponse(publicError.status, publicError.body);
  }
};
