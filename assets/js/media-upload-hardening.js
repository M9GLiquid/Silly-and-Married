(() => {
  const originalFetch = window.fetch.bind(window);
  const uploadForm = document.getElementById("media-upload-form");
  const uploadFilesList = document.getElementById("media-upload-files-list");
  const uploadInput = document.getElementById("media-upload-input");
  const uploadValidation = document.getElementById("media-upload-validation");
  const uploadSubmit = document.getElementById("media-upload-submit");
  const lastFailure = { message: "", requestId: "" };
  const uploadSessions = new Map();
  let healthReadyUntil = 0;
  let healthCheckInProgress = false;

  const mimeTypeByExtension = new Map([
    [".avif", "image/avif"],
    [".bmp", "image/bmp"],
    [".gif", "image/gif"],
    [".heic", "image/heic"],
    [".heif", "image/heif"],
    [".jpeg", "image/jpeg"],
    [".jpg", "image/jpeg"],
    [".png", "image/png"],
    [".tif", "image/tiff"],
    [".tiff", "image/tiff"],
    [".webp", "image/webp"],
    [".3gp", "video/3gpp"],
    [".avi", "video/x-msvideo"],
    [".m4v", "video/x-m4v"],
    [".mkv", "video/x-matroska"],
    [".mov", "video/quicktime"],
    [".mp4", "video/mp4"],
    [".webm", "video/webm"]
  ]);

  const inferMimeType = (fileName) => {
    const match = String(fileName || "").toLowerCase().match(/(\.[a-z0-9]{1,10})$/);
    return match ? mimeTypeByExtension.get(match[1]) || "" : "";
  };

  const normaliseFileTypes = () => {
    if (
      !uploadInput?.files?.length ||
      typeof DataTransfer === "undefined" ||
      typeof File === "undefined"
    ) {
      return;
    }

    const files = Array.from(uploadInput.files);
    let changed = false;
    const transfer = new DataTransfer();

    files.forEach((file) => {
      const genericType =
        !file.type || file.type.toLowerCase() === "application/octet-stream";
      const inferredType = genericType ? inferMimeType(file.name) : "";
      if (inferredType) {
        changed = true;
        transfer.items.add(
          new File([file], file.name, {
            type: inferredType,
            lastModified: file.lastModified
          })
        );
        return;
      }
      transfer.items.add(file);
    });

    if (changed) uploadInput.files = transfer.files;
  };

  if (uploadInput) {
    uploadInput.addEventListener("change", normaliseFileTypes, true);
  }

  const wait = (milliseconds) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });

  const toUrl = (input) => {
    if (typeof input === "string") return new URL(input, window.location.href);
    if (input instanceof URL) return input;
    if (input instanceof Request) return new URL(input.url, window.location.href);
    return null;
  };

  const isOneDriveUpload = (url, method) =>
    method === "PUT" &&
    !!url &&
    (url.hostname.endsWith(".up.1drv.com") ||
      url.hostname.endsWith(".up.1drv.net") ||
      url.pathname.includes("/up/"));

  const isUploadApi = (url, method) => {
    if (!url || url.origin !== window.location.origin) return false;
    if (
      method === "POST" &&
      (url.pathname.endsWith("/api/onedrive-create-upload-session") ||
        url.pathname.endsWith("/api/onedrive-save-metadata") ||
        url.pathname.endsWith("/api/onedrive-verify-upload"))
    ) {
      return true;
    }
    return method === "GET" && url.pathname.endsWith("/api/onedrive-health");
  };

  const retryableStatus = (status) =>
    [408, 429, 500, 502, 503, 504].includes(status);

  const retryDelay = (response, attempt) => {
    const retryAfter = response?.headers?.get("retry-after");
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000, 30000);
      }
      const dateValue = Date.parse(retryAfter);
      if (Number.isFinite(dateValue)) {
        return Math.min(Math.max(dateValue - Date.now(), 0), 30000);
      }
    }
    return Math.min(600 * 2 ** attempt + Math.floor(Math.random() * 250), 8000);
  };

  const rememberFailure = async (response, fallbackMessage) => {
    let message = fallbackMessage;
    let requestId = response?.headers?.get("x-nf-request-id") || "";

    if (response) {
      try {
        const data = await response.clone().json();
        message =
          data?.error?.message ||
          data?.error ||
          data?.details ||
          data?.warning ||
          message;
        requestId = data?.requestId || requestId;
      } catch (_error) {
        try {
          const text = await response.clone().text();
          if (text) message = text;
        } catch (_textError) {
        }
      }
    }

    lastFailure.message = String(message || "Upload request failed.")
      .replace(/\s+/g, " ")
      .slice(0, 260);
    lastFailure.requestId = String(requestId || "").slice(0, 120);
  };

  const captureUploadSession = async (url, response) => {
    if (
      !response.ok ||
      !url?.pathname.endsWith("/api/onedrive-create-upload-session")
    ) {
      return;
    }
    try {
      const data = await response.clone().json();
      if (!data?.uploadUrl) return;
      uploadSessions.set(data.uploadUrl, {
        folder: data.folder,
        storedFileName: data.storedFileName
      });
    } catch (_error) {
    }
  };

  const parseContentRange = (headers) => {
    const value = headers.get("content-range") || "";
    const match = value.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/i);
    if (!match) return null;
    return {
      start: Number(match[1]),
      end: Number(match[2]),
      total: Number(match[3])
    };
  };

  const verifyCompletedUpload = async (uploadUrl, range) => {
    const session = uploadSessions.get(uploadUrl);
    if (!session || range.end + 1 !== range.total) return false;

    try {
      const response = await originalFetch("/api/onedrive-verify-upload", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json"
        },
        body: JSON.stringify({
          folder: session.folder,
          storedFileName: session.storedFileName,
          expectedSize: range.total
        }),
        cache: "no-store"
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data?.exists === true && data?.sizeMatches === true;
    } catch (_error) {
      return false;
    }
  };

  const resolveRangeConflict = async (url, headers, response) => {
    if (response.status !== 416) return null;
    const range = parseContentRange(headers);
    if (!range) return null;

    try {
      const statusResponse = await originalFetch(url.href, {
        method: "GET",
        cache: "no-store",
        credentials: "omit"
      });
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const expectedRange = statusData?.nextExpectedRanges?.[0] || "";
        const expectedStart = Number(String(expectedRange).split("-")[0]);
        if (Number.isFinite(expectedStart) && expectedStart > range.end) {
          return new Response(JSON.stringify(statusData), {
            status: 202,
            headers: { "content-type": "application/json" }
          });
        }
      }
    } catch (_error) {
    }

    if (await verifyCompletedUpload(url.href, range)) {
      return new Response(JSON.stringify({ verified: true }), {
        status: 201,
        headers: { "content-type": "application/json" }
      });
    }

    return null;
  };

  window.fetch = async (input, init = {}) => {
    const url = toUrl(input);
    const method = String(
      init.method || (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const oneDriveUpload = isOneDriveUpload(url, method);
    const uploadApi = isUploadApi(url, method);

    if (!oneDriveUpload && !uploadApi) {
      return originalFetch(input, init);
    }

    const maxAttempts = oneDriveUpload ? 5 : 3;
    let lastNetworkError = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const headers = new Headers(init.headers || {});
        if (oneDriveUpload && !headers.has("content-type")) {
          headers.set("content-type", "application/octet-stream");
        }

        const response = await originalFetch(input, {
          ...init,
          headers,
          cache: "no-store",
          credentials: oneDriveUpload ? "omit" : init.credentials
        });

        if (uploadApi) await captureUploadSession(url, response);
        if (oneDriveUpload && response.status === 416) {
          const resolvedResponse = await resolveRangeConflict(url, headers, response);
          if (resolvedResponse) return resolvedResponse;
        }

        if (response.ok) return response;

        await rememberFailure(
          response,
          `${oneDriveUpload ? "OneDrive upload" : "Upload service"} returned ${response.status}.`
        );

        if (!retryableStatus(response.status) || attempt === maxAttempts - 1) {
          return response;
        }

        await wait(retryDelay(response, attempt));
      } catch (error) {
        lastNetworkError = error;
        lastFailure.message = navigator.onLine
          ? "The connection to the upload service was interrupted."
          : "The device is offline.";
        if (attempt === maxAttempts - 1) throw error;
        await wait(Math.min(600 * 2 ** attempt, 8000));
      }
    }

    throw lastNetworkError || new Error("Upload request failed.");
  };

  if (uploadValidation) {
    const validationObserver = new MutationObserver(() => {
      const text = uploadValidation.textContent || "";
      if (
        !text.includes("could not be uploaded") ||
        !lastFailure.message ||
        text.includes("Last error:")
      ) {
        return;
      }

      const reference = lastFailure.requestId
        ? ` Reference: ${lastFailure.requestId}.`
        : "";
      uploadValidation.textContent =
        `${text} Last error: ${lastFailure.message}.${reference}`.replace("..", ".");
    });
    validationObserver.observe(uploadValidation, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  if (!uploadForm || !uploadFilesList) return;

  const setValidationMessage = (message, isError = false) => {
    if (!uploadValidation) return;
    uploadValidation.textContent = message;
    uploadValidation.hidden = !message;
    uploadValidation.classList.toggle("is-error", isError);
  };

  const checkUploadHealth = async () => {
    if (Date.now() < healthReadyUntil) return;

    const response = await window.fetch("/api/onedrive-health", {
      method: "GET",
      headers: { accept: "application/json" },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true) {
      throw new Error(
        data?.error ||
          "The upload service is unavailable. Please try again shortly."
      );
    }
    healthReadyUntil = Date.now() + 5 * 60 * 1000;
  };

  uploadForm.addEventListener(
    "submit",
    async (event) => {
      const hasFiles = uploadFilesList.querySelector(".media-upload-file-item");
      if (!hasFiles) return;

      if (Date.now() < healthReadyUntil) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (healthCheckInProgress) return;

      healthCheckInProgress = true;
      if (uploadSubmit) uploadSubmit.disabled = true;
      setValidationMessage("Checking the upload service...");

      try {
        await checkUploadHealth();
        setValidationMessage("");
        if (uploadSubmit) uploadSubmit.disabled = false;
        uploadForm.requestSubmit();
      } catch (error) {
        setValidationMessage(
          error instanceof Error ? error.message : "The upload service is unavailable.",
          true
        );
        if (uploadSubmit) uploadSubmit.disabled = false;
      } finally {
        healthCheckInProgress = false;
      }
    },
    true
  );
})();
