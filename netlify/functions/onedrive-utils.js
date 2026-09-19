const { randomUUID } = require("crypto");

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const IMAGE_PREFIX = "image/";
const VIDEO_PREFIX = "video/";
const TOKEN_EXPIRY_SAFETY_MS = 2 * 60 * 1000;
const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp"
]);
const VIDEO_EXTENSIONS = new Set([
  ".3gp",
  ".avi",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".webm"
]);

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;
const ensuredFolderPaths = new Set();

class OneDriveError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "OneDriveError";
    this.status = Number(options.status || 500);
    this.code = String(options.code || "onedrive_error");
    this.data = options.data ?? null;
    this.retryAfterMs = Number(options.retryAfterMs || 0);
    if (options.cause) this.cause = options.cause;
  }
}

const sleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new OneDriveError(`Missing required Netlify environment variable: ${name}`, {
      status: 503,
      code: "missing_environment_variable"
    });
  }
  return value;
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  },
  body: JSON.stringify(body)
});

const parseJsonBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new OneDriveError("The upload request contained invalid JSON.", {
      status: 400,
      code: "invalid_json",
      cause: error
    });
  }
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
  const match = String(fileName || "").match(/\.([a-z0-9]{1,10})$/i);
  if (match) return `.${match[1].toLowerCase()}`;
  if (String(mimeType || "").startsWith(IMAGE_PREFIX)) return ".jpg";
  if (String(mimeType || "").startsWith(VIDEO_PREFIX)) return ".mp4";
  return "";
};

const getFileKind = (mimeType, fileName = "") => {
  const type = String(mimeType || "").toLowerCase();
  if (type.startsWith(IMAGE_PREFIX)) return "picture";
  if (type.startsWith(VIDEO_PREFIX)) return "video";

  const extension = getFileExtension(fileName, "").toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) return "picture";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return "";
};

const encodeDrivePath = (segments) =>
  segments.map((segment) => encodeURIComponent(segment)).join("/");

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
};

const readRetryAfterMs = (response, attempt) => {
  const headerValue = response.headers.get("retry-after");
  if (headerValue) {
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 30000);
    }
    const retryDate = Date.parse(headerValue);
    if (Number.isFinite(retryDate)) {
      return Math.min(Math.max(retryDate - Date.now(), 0), 30000);
    }
  }
  return Math.min(500 * 2 ** attempt + Math.floor(Math.random() * 250), 8000);
};

const invalidateAccessToken = () => {
  cachedAccessToken = "";
  cachedAccessTokenExpiresAt = 0;
};

const getAccessToken = async ({ forceRefresh = false } = {}) => {
  if (
    !forceRefresh &&
    cachedAccessToken &&
    Date.now() < cachedAccessTokenExpiresAt - TOKEN_EXPIRY_SAFETY_MS
  ) {
    return cachedAccessToken;
  }

  const form = new URLSearchParams();
  form.set("client_id", getRequiredEnv("MS_CLIENT_ID"));
  form.set("client_secret", getRequiredEnv("MS_CLIENT_SECRET"));
  form.set("refresh_token", getRequiredEnv("MS_REFRESH_TOKEN"));
  form.set("grant_type", "refresh_token");

  const tenantId = process.env.MS_TENANT_ID || "common";
  const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString()
      });
      const data = await parseResponseBody(response);

      if (response.ok && data?.access_token) {
        cachedAccessToken = data.access_token;
        const expiresInSeconds = Math.max(Number(data.expires_in || 3600), 300);
        cachedAccessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
        return cachedAccessToken;
      }

      const oauthCode = sanitizeText(data?.error, 100) || "token_refresh_failed";
      const oauthDescription = sanitizeText(data?.error_description, 500);
      const authorizationExpired =
        oauthCode === "invalid_grant" ||
        oauthCode === "interaction_required" ||
        oauthCode === "invalid_client";

      const message = authorizationExpired
        ? "OneDrive authorization expired or was revoked. Run npm run auth:onedrive again and replace MS_REFRESH_TOKEN in Netlify."
        : `Could not refresh the Microsoft access token${oauthDescription ? `: ${oauthDescription}` : "."}`;

      lastError = new OneDriveError(message, {
        status: authorizationExpired ? 503 : response.status || 503,
        code: oauthCode,
        data,
        retryAfterMs: readRetryAfterMs(response, attempt)
      });

      if (!TRANSIENT_STATUSES.has(response.status) || attempt === 2) {
        throw lastError;
      }
      await sleep(lastError.retryAfterMs);
    } catch (error) {
      if (error instanceof OneDriveError) {
        lastError = error;
        if (!TRANSIENT_STATUSES.has(error.status) || attempt === 2) throw error;
        await sleep(error.retryAfterMs || 500 * 2 ** attempt);
        continue;
      }

      lastError = new OneDriveError("The Microsoft sign-in service could not be reached.", {
        status: 503,
        code: "token_network_error",
        cause: error
      });
      if (attempt === 2) throw lastError;
      await sleep(500 * 2 ** attempt);
    }
  }

  throw lastError || new OneDriveError("Could not refresh the Microsoft access token.");
};

const graphFetch = async (accessToken, path, options = {}) => {
  const {
    retryAttempts = 4,
    allowTokenRefresh = true,
    ...fetchOptions
  } = options;
  let token = accessToken;
  let refreshedToken = false;
  let lastError = null;

  for (let attempt = 0; attempt < retryAttempts; attempt += 1) {
    let response;
    try {
      response = await fetch(`${GRAPH_ROOT}${path}`, {
        ...fetchOptions,
        headers: {
          authorization: `Bearer ${token}`,
          ...(fetchOptions.headers || {})
        }
      });
    } catch (error) {
      lastError = new OneDriveError("Microsoft Graph could not be reached.", {
        status: 503,
        code: "graph_network_error",
        cause: error
      });
      if (attempt === retryAttempts - 1) throw lastError;
      await sleep(Math.min(500 * 2 ** attempt, 8000));
      continue;
    }

    const data = await parseResponseBody(response);
    if (response.ok) return data;

    const graphCode = sanitizeText(data?.error?.code, 120) || `http_${response.status}`;
    const graphMessage =
      sanitizeText(data?.error?.message, 500) ||
      sanitizeText(typeof data === "string" ? data : "", 500) ||
      `Microsoft Graph request failed with status ${response.status}.`;

    if (
      response.status === 401 &&
      allowTokenRefresh &&
      !refreshedToken
    ) {
      invalidateAccessToken();
      token = await getAccessToken({ forceRefresh: true });
      refreshedToken = true;
      continue;
    }

    lastError = new OneDriveError(graphMessage, {
      status: response.status,
      code: graphCode,
      data,
      retryAfterMs: readRetryAfterMs(response, attempt)
    });

    if (!TRANSIENT_STATUSES.has(response.status) || attempt === retryAttempts - 1) {
      throw lastError;
    }
    await sleep(lastError.retryAfterMs);
  }

  throw lastError || new OneDriveError("Microsoft Graph request failed.");
};

const getDriveItemByPath = async (accessToken, segments) => {
  const graphPath = `/me/drive/root:/${encodeDrivePath(segments)}?$select=id,name,folder`;
  try {
    return await graphFetch(accessToken, graphPath, {
      method: "GET",
      retryAttempts: 3
    });
  } catch (error) {
    if (error instanceof OneDriveError && error.status === 404) return null;
    throw error;
  }
};

const ensureFolderPath = async (accessToken, segments) => {
  const cleanSegments = segments
    .map((segment) => sanitizeText(segment, 120))
    .filter(Boolean);
  let parentPath = [];

  for (const segment of cleanSegments) {
    const currentPath = [...parentPath, segment];
    const cacheKey = currentPath.join("/").toLowerCase();

    if (!ensuredFolderPaths.has(cacheKey)) {
      let existingItem = await getDriveItemByPath(accessToken, currentPath);

      if (!existingItem) {
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
            }),
            retryAttempts: 3
          });
        } catch (error) {
          const nameConflict =
            error instanceof OneDriveError &&
            (error.status === 409 || error.code === "nameAlreadyExists");
          if (!nameConflict) throw error;
        }

        existingItem = await getDriveItemByPath(accessToken, currentPath);
      }

      if (!existingItem?.folder) {
        throw new OneDriveError(
          `OneDrive contains an item named "${segment}" where an upload folder is required.`,
          {
            status: 409,
            code: "upload_path_is_not_folder",
            data: { path: currentPath.join("/") }
          }
        );
      }

      ensuredFolderPaths.add(cacheKey);
    }

    parentPath = currentPath;
  }
};

const buildStoredFileName = ({
  categoryName,
  photographer,
  originalFileName,
  mimeType
}) => {
  const extension = getFileExtension(originalFileName, mimeType);
  const categoryPart = sanitizeFilePart(categoryName, "wedding-upload");
  const photographerPart = sanitizeFilePart(photographer, "");
  const originalPart = sanitizeFilePart(
    String(originalFileName || "").replace(/\.[^/.]+$/, ""),
    "file"
  );
  const uniquePart = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const nameParts = [uniquePart, categoryPart, photographerPart, originalPart].filter(Boolean);
  return `${nameParts.join("-")}${extension}`;
};

const getRootFolder = () =>
  sanitizeText(process.env.ONEDRIVE_ROOT_FOLDER || "Wedding Ceremoni 2", 120);

const getRequestId = (event = {}) =>
  sanitizeText(
    event.headers?.["x-nf-request-id"] ||
      event.headers?.["x-request-id"] ||
      randomUUID(),
    120
  );

const getPublicError = (error, fallbackMessage, requestId) => {
  const knownError = error instanceof OneDriveError;
  const message = knownError ? sanitizeText(error.message, 600) : fallbackMessage;
  const status = knownError && error.status >= 400 && error.status < 600
    ? error.status
    : 500;
  return {
    status,
    body: {
      error: message || fallbackMessage,
      code: knownError ? error.code : "unexpected_error",
      requestId
    }
  };
};

module.exports = {
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
};
