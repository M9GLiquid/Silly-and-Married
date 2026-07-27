const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const IMAGE_PREFIX = "image/";
const VIDEO_PREFIX = "video/";

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  },
  body: JSON.stringify(body)
});

const parseJsonBody = (event) => {
  if (!event.body) return {};
  return JSON.parse(event.body);
};

const sanitizeText = (value, maxLength = 500) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const sanitizeFilePart = (value, fallback = "upload") => {
  const cleaned = String(value || "")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
};

const getFileExtension = (fileName, mimeType) => {
  const match = String(fileName || "").match(/\.([a-z0-9]{1,8})$/i);
  if (match) return `.${match[1].toLowerCase()}`;
  if (String(mimeType || "").startsWith(IMAGE_PREFIX)) return ".jpg";
  if (String(mimeType || "").startsWith(VIDEO_PREFIX)) return ".mp4";
  return "";
};

const getFileKind = (mimeType) => {
  const type = String(mimeType || "").toLowerCase();
  if (type.startsWith(IMAGE_PREFIX)) return "picture";
  if (type.startsWith(VIDEO_PREFIX)) return "video";
  return "";
};

const encodeDrivePath = (segments) => segments.map((segment) => encodeURIComponent(segment)).join("/");

const getAccessToken = async () => {
  const form = new URLSearchParams();
  form.set("client_id", getRequiredEnv("MS_CLIENT_ID"));
  form.set("client_secret", getRequiredEnv("MS_CLIENT_SECRET"));
  form.set("refresh_token", getRequiredEnv("MS_REFRESH_TOKEN"));
  form.set("grant_type", "refresh_token");

  const tenantId = process.env.MS_TENANT_ID || "common";
  const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Could not refresh Microsoft access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
};

const graphFetch = async (accessToken, path, options = {}) => {
  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_error) {
      data = text;
    }
  }
  if (!response.ok) {
    throw new Error(`Microsoft Graph request failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
};

const ensureFolderPath = async (accessToken, segments) => {
  let parentPath = [];

  for (const rawSegment of segments) {
    const segment = sanitizeText(rawSegment, 120);
    if (!segment) continue;

    const parentEndpoint = parentPath.length
      ? `/me/drive/root:/${encodeDrivePath(parentPath)}:/children`
      : "/me/drive/root/children";

    try {
      await graphFetch(accessToken, parentEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: segment,
          folder: {},
          "@microsoft.graph.conflictBehavior": "fail"
        })
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const alreadyExists = message.includes("409") || message.includes("nameAlreadyExists");
      if (!alreadyExists) throw error;
    }

    parentPath.push(segment);
  }
};

const buildStoredFileName = ({ categoryName, photographer, originalFileName, mimeType }) => {
  const extension = getFileExtension(originalFileName, mimeType);
  const categoryPart = sanitizeFilePart(categoryName, "wedding-upload");
  const photographerPart = sanitizeFilePart(photographer, "");
  const originalPart = sanitizeFilePart(String(originalFileName || "").replace(/\.[^/.]+$/, ""), "file");
  const uniquePart = `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 9)}`;
  const nameParts = [uniquePart, categoryPart, photographerPart, originalPart].filter(Boolean);
  return `${nameParts.join("-")}${extension}`;
};

const getRootFolder = () => sanitizeText(process.env.ONEDRIVE_ROOT_FOLDER || "Wedding Ceremoni 2", 120);

module.exports = {
  encodeDrivePath,
  ensureFolderPath,
  getAccessToken,
  getFileKind,
  getRootFolder,
  graphFetch,
  jsonResponse,
  parseJsonBody,
  sanitizeText,
  buildStoredFileName
};
