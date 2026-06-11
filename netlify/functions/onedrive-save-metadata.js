const {
  encodeDrivePath,
  getAccessToken,
  getRootFolder,
  graphFetch,
  jsonResponse,
  parseJsonBody,
  sanitizeText
} = require("./onedrive-utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = parseJsonBody(event);
    const categorySlug = sanitizeText(body.categorySlug, 120);
    const categoryName = sanitizeText(body.categoryName, 120);
    const storedFileName = sanitizeText(body.storedFileName, 240);
    const metadataFileName = sanitizeText(body.metadataFileName, 240);

    if (!categorySlug || !categoryName || !storedFileName || !metadataFileName) {
      return jsonResponse(400, { error: "Missing metadata fields." });
    }

    const metadata = {
      photographer: sanitizeText(body.photographer, 120),
      categorySlug,
      categoryName,
      kind: sanitizeText(body.kind, 40),
      folder: sanitizeText(body.folder, 80),
      originalFileName: sanitizeText(body.originalFileName, 240),
      storedFileName,
      uploadedAt: new Date().toISOString()
    };
    const rootFolder = getRootFolder();
    const graphPath = `/me/drive/root:/${encodeDrivePath([rootFolder, "Metadata", metadataFileName])}:/content`;
    const accessToken = await getAccessToken();
    await graphFetch(accessToken, graphPath, {
      method: "PUT",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(metadata, null, 2)
    });

    return jsonResponse(200, { ok: true, metadata });
  } catch (error) {
    return jsonResponse(500, {
      error: "Could not save upload metadata.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};
