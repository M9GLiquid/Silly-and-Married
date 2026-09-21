(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WeddingMediaUpload = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const DEFAULT_MAX_UPLOAD_MB = 8192;
  const DEFAULT_MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
  const IMAGE_EXTENSIONS = new Set([
    ".avif", ".bmp", ".gif", ".heic", ".heif", ".jpeg", ".jpg", ".png",
    ".tif", ".tiff", ".webp"
  ]);
  const VIDEO_EXTENSIONS = new Set([
    ".3gp", ".avi", ".m4v", ".mkv", ".mov", ".mp4", ".webm"
  ]);

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const fileExtension = (fileName) => {
    const match = String(fileName || "").toLowerCase().match(/(\.[a-z0-9]{1,10})$/);
    return match ? match[1] : "";
  };

  const getFileKind = (file) => {
    const type = String(file?.type || "").toLowerCase();
    if (type.startsWith("image/")) return "picture";
    if (type.startsWith("video/")) return "video";
    const extension = fileExtension(file?.name);
    if (IMAGE_EXTENSIONS.has(extension)) return "picture";
    if (VIDEO_EXTENSIONS.has(extension)) return "video";
    return "";
  };

  const validateUploadFile = (file, maxBytes = DEFAULT_MAX_UPLOAD_BYTES) => {
    const size = Number(file?.size);
    const effectiveMax = Number.isFinite(maxBytes) && maxBytes > 0
      ? maxBytes
      : DEFAULT_MAX_UPLOAD_BYTES;
    if (!file || !String(file.name || "").trim()) {
      return { ok: false, code: "missing_file", size: 0, maxBytes: effectiveMax };
    }
    if (!getFileKind(file)) {
      return { ok: false, code: "unsupported_file_type", size, maxBytes: effectiveMax };
    }
    if (!Number.isFinite(size) || size <= 0) {
      return { ok: false, code: "empty_file", size, maxBytes: effectiveMax };
    }
    if (size > effectiveMax) {
      return { ok: false, code: "file_too_large", size, maxBytes: effectiveMax };
    }
    return { ok: true, code: "ok", size, maxBytes: effectiveMax, kind: getFileKind(file) };
  };

  const fileIdentity = (file) =>
    `${String(file?.name || "")}::${Number(file?.size || 0)}::${Number(file?.lastModified || 0)}`;

  const dedupeFiles = (files) => {
    const unique = new Map();
    for (const file of files || []) {
      const key = fileIdentity(file);
      if (!unique.has(key)) unique.set(key, file);
    }
    return Array.from(unique.values());
  };

  const runBoundedQueue = async (items, concurrency, worker) => {
    const queue = Array.from(items || []);
    const limit = Math.max(1, Math.min(Math.floor(Number(concurrency) || 1), queue.length || 1));
    const results = new Array(queue.length);
    let cursor = 0;
    const runWorker = async () => {
      while (cursor < queue.length) {
        const index = cursor;
        cursor += 1;
        try {
          results[index] = { status: "fulfilled", value: await worker(queue[index], index) };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, () => runWorker()));
    return results;
  };

  return {
    DEFAULT_MAX_UPLOAD_MB,
    DEFAULT_MAX_UPLOAD_BYTES,
    dedupeFiles,
    fileIdentity,
    formatFileSize,
    getFileKind,
    runBoundedQueue,
    validateUploadFile
  };
});
