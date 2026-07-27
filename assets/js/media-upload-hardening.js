(() => {
  const originalFetch = window.fetch.bind(window);
  const uploadForm = document.getElementById("media-upload-form");
  const uploadFilesList = document.getElementById("media-upload-files-list");
  const uploadValidation = document.getElementById("media-upload-validation");
  const sourceCategorySelect = document.getElementById("media-category-select-mobile");
  const uploadNote = document.getElementById("media-upload-panel-note");
  const eventDescription = document.getElementById("media-event-description");
  const lastFailure = { message: "", requestId: "" };

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

  const isUploadApi = (url, method) =>
    method === "POST" &&
    !!url &&
    url.origin === window.location.origin &&
    (url.pathname.endsWith("/api/onedrive-create-upload-session") ||
      url.pathname.endsWith("/api/onedrive-save-metadata"));

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

  if (!uploadForm || !uploadFilesList || !sourceCategorySelect) return;

  const categoryLabel = Array.from(
    uploadForm.querySelectorAll(".media-upload-field-label")
  ).find((label) => label.textContent.toLowerCase().includes("category"));

  if (!categoryLabel) return;

  categoryLabel.textContent = "Category for all selected files";

  const categorySelect = document.createElement("select");
  categorySelect.id = "media-upload-batch-category";
  categorySelect.className = "media-upload-file-select";
  categorySelect.required = true;
  categorySelect.setAttribute("aria-label", "Category for all selected files");
  categoryLabel.insertAdjacentElement("afterend", categorySelect);

  const categoryHint = document.createElement("p");
  categoryHint.className = "media-upload-batch-category-hint";
  categoryHint.textContent =
    "Every picture and video in this upload will use the same category.";
  categorySelect.insertAdjacentElement("afterend", categoryHint);

  const style = document.createElement("style");
  style.textContent = `
    #media-upload-batch-category {
      max-width: 24rem;
    }

    .media-upload-batch-category-hint {
      margin: -0.35rem 0 0;
      color: rgb(43 43 43 / 68%);
      font-size: 0.74rem;
    }

    .media-upload-file-item .media-upload-file-select {
      display: none !important;
    }

    .media-upload-file-item {
      grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 4.75rem) !important;
    }

    @media (max-width: 700px) {
      .media-upload-file-item {
        grid-template-columns: auto minmax(0, 1fr) minmax(0, 4rem) !important;
      }

      .media-upload-file-item .media-upload-file-meta {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);

  if (uploadNote) {
    uploadNote.textContent =
      "Choose one category for all selected files, then upload your photos or videos.";
  }

  const updateEventDescriptionCopy = () => {
    if (!eventDescription) return;
    eventDescription.querySelectorAll("p").forEach((paragraph) => {
      if (!paragraph.textContent.includes("tag each file with a category")) return;
      paragraph.innerHTML =
        'Choose one category for your whole upload batch, then it will appear in the matching folder below. <a href="#" class="media-inline-link" data-open-upload>Upload your own photos or videos</a>.';
    });
  };

  const refreshCategoryOptions = () => {
    const previousValue = categorySelect.value;
    categorySelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select category";
    categorySelect.appendChild(placeholder);

    Array.from(sourceCategorySelect.options).forEach((sourceOption) => {
      if (!sourceOption.value) return;
      const option = document.createElement("option");
      option.value = sourceOption.value;
      option.textContent = sourceOption.textContent;
      categorySelect.appendChild(option);
    });

    if (
      Array.from(categorySelect.options).some(
        (option) => option.value === previousValue
      )
    ) {
      categorySelect.value = previousValue;
    }
  };

  const applyBatchCategory = () => {
    const categoryValue = categorySelect.value;
    const perFileSelects = Array.from(
      uploadFilesList.querySelectorAll(".media-upload-file-select")
    );
    perFileSelects.forEach((select) => {
      if (select.value === categoryValue) return;
      select.value = categoryValue;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  };

  let applyQueued = false;
  const queueBatchCategoryApplication = () => {
    if (applyQueued) return;
    applyQueued = true;
    window.requestAnimationFrame(() => {
      applyQueued = false;
      applyBatchCategory();
    });
  };

  categorySelect.addEventListener("change", () => {
    categorySelect.classList.remove("is-invalid");
    applyBatchCategory();
  });

  uploadForm.addEventListener(
    "submit",
    (event) => {
      const hasFiles = uploadFilesList.querySelector(".media-upload-file-item");
      if (!hasFiles) return;

      if (!categorySelect.value) {
        event.preventDefault();
        event.stopImmediatePropagation();
        categorySelect.classList.add("is-invalid");
        if (uploadValidation) {
          uploadValidation.textContent =
            "Please choose one category for all selected files.";
          uploadValidation.hidden = false;
          uploadValidation.classList.add("is-error");
        }
        categorySelect.focus();
        return;
      }

      applyBatchCategory();
    },
    true
  );

  const fileListObserver = new MutationObserver(queueBatchCategoryApplication);
  fileListObserver.observe(uploadFilesList, {
    childList: true,
    subtree: true
  });

  const categoryOptionsObserver = new MutationObserver(() => {
    refreshCategoryOptions();
    queueBatchCategoryApplication();
  });
  categoryOptionsObserver.observe(sourceCategorySelect, { childList: true });

  if (eventDescription) {
    const eventDescriptionObserver = new MutationObserver(updateEventDescriptionCopy);
    eventDescriptionObserver.observe(eventDescription, {
      childList: true,
      subtree: true
    });
  }

  refreshCategoryOptions();
  updateEventDescriptionCopy();
})();
