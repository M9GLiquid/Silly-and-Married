const {
  getAccessToken,
  getRootFolder,
  graphFetch,
  jsonResponse,
  sanitizeText
} = require("./onedrive-utils");

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

const isAllowedMediaItem = (item, rootFolder) => {
  if (!item?.file || !item?.parentReference?.path) return false;
  let parentPath = String(item.parentReference.path);
  try {
    parentPath = decodeURIComponent(parentPath);
  } catch (_error) {
    // Keep the original path if it is not URI encoded.
  }
  const normalizedPath = parentPath.replace(/\\/g, "/").toLowerCase();
  const normalizedRoot = String(rootFolder || "").replace(/\\/g, "/").toLowerCase();
  return normalizedPath.endsWith(`/${normalizedRoot}/pictures`) || normalizedPath.endsWith(`/${normalizedRoot}/videos`);
};

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const id = sanitizeText(event.queryStringParameters?.id, 240);
    if (!id) return jsonResponse(400, { error: "Media id is required." });

    const accessToken = await getAccessToken();
    const item = await graphFetch(
      accessToken,
      `/me/drive/items/${encodeURIComponent(id)}?$select=id,name,file,parentReference`
    );
    if (!isAllowedMediaItem(item, getRootFolder())) {
      return jsonResponse(404, { error: "Media was not found." });
    }

    const downloadResponse = await fetch(`${GRAPH_ROOT}/me/drive/items/${encodeURIComponent(id)}/content`, {
      headers: { authorization: `Bearer ${accessToken}` },
      redirect: "manual"
    });
    const downloadUrl = downloadResponse.headers.get("location");
    if (!downloadUrl) return jsonResponse(404, { error: "Media download is unavailable." });

    return {
      statusCode: 302,
      headers: {
        location: downloadUrl,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      },
      body: ""
    };
  } catch (error) {
    return jsonResponse(500, {
      error: "Could not open wedding media.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

exports.isAllowedMediaItem = isAllowedMediaItem;
