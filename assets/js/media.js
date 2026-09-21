const mediaStatus = document.getElementById("media-gallery-status");
const mediaViewerTitle = document.getElementById("media-viewer-title");
const eventTabsWrap = document.getElementById("media-event-tabs");
const mediaEventDescription = document.getElementById("media-event-description");
const tabsWrap = document.getElementById("media-category-tabs");
const categorySelectMobile = document.getElementById("media-category-select-mobile");
const categorySelectMobileWrap = categorySelectMobile?.closest(".media-category-select-mobile-wrap") || null;
const uploadBtnMobile = document.getElementById("media-upload-btn-mobile");
const photosGrid = document.getElementById("media-photos-grid");
const videosGrid = document.getElementById("media-videos-grid");
const mixGrid = document.getElementById("media-mix-grid");
const photosEmpty = document.getElementById("media-photos-empty");
const videosEmpty = document.getElementById("media-videos-empty");
const mixEmpty = document.getElementById("media-mix-empty");
const photosCount = document.getElementById("media-photos-count");
const videosCount = document.getElementById("media-videos-count");
const mixCount = document.getElementById("media-mix-count");
const photosSentinel = document.getElementById("media-photos-sentinel");
const videosSentinel = document.getElementById("media-videos-sentinel");
const mixSentinel = document.getElementById("media-mix-sentinel");
const mediaTypeTabs = Array.from(document.querySelectorAll("[data-media-type-tab]"));
const mediaTypeTabsWrap = document.querySelector(".media-type-tabs-global");
const mediaMixSection = document.getElementById("media-mix-section");
const mediaPhotosSection = document.getElementById("media-photos-section");
const mediaVideosSection = document.getElementById("media-videos-section");
const mediaUploadSection = document.getElementById("media-upload-category-section");
const videoModal = document.getElementById("video-modal");
const videoModalPlayer = document.getElementById("video-modal-player");
const videoModalCaption = document.getElementById("video-modal-caption");
const videoModalClose = document.getElementById("video-modal-close");
const uploadForm = document.getElementById("media-upload-form");
const uploadSuccessToast = document.getElementById("media-upload-success-toast");
const uploadInput = document.getElementById("media-upload-input");
const uploadDropzone = document.getElementById("media-upload-dropzone");
const uploadSubmit = document.getElementById("media-upload-submit");
const uploadFilesTitle = document.getElementById("media-upload-files-title");
const uploadFilesList = document.getElementById("media-upload-files-list");
const uploadValidation = document.getElementById("media-upload-validation");
const mediaLogoutForm = document.getElementById("media-logout-form");
const uploadPanelTitle = document.getElementById("media-upload-panel-title");
const uploadPanelNote = document.getElementById("media-upload-panel-note");
const uploadDropzoneTitle = document.querySelector(".media-upload-dropzone-title");
const uploadDropzoneCopy = document.querySelector(".media-upload-dropzone-copy");
const uploadSubmitLabel = document.querySelector("[data-upload-submit-label]");
const uploadSuccessLabel = document.querySelector("[data-upload-success-label]");
const uploadMobileLabel = document.querySelector("[data-upload-mobile-label]");
const uploadCore = window.WeddingMediaUpload;

const PHOTO_BATCH_SIZE = 24;
const VIDEO_BATCH_SIZE = 6;
const PREFETCH_AHEAD_SIZE = 24;
const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024;
const UPLOAD_FILE_CONCURRENCY = 3;
const WEDDING_2026_GALLERY_SLUG = "all-uploads";
const MEDIA_UI_COPY = {
  en: {
    all: "All",
    photos: "Photos",
    videos: "Videos",
    upload: "Upload",
    uploadMobile: "Upload photos or videos",
    uploadHeading: "Share Your Photos and Videos",
    uploadNote: "Drop or choose your files, then tap the upload button.",
    dropTitle: "Drop photos or videos here",
    chooseFiles: "or click to choose them",
    uploadSelected: "Upload selected files",
    uploadedThanks: "Uploaded — thank you!"
  },
  sk: {
    all: "Všetko",
    photos: "Fotografie",
    videos: "Videá",
    upload: "Nahrať",
    uploadMobile: "Nahrať fotografie alebo videá",
    uploadHeading: "Zdieľajte svoje fotografie a videá",
    uploadNote: "Presuňte alebo vyberte súbory a potom klepnite na tlačidlo nahrať.",
    dropTitle: "Presuňte sem fotografie alebo videá",
    chooseFiles: "alebo kliknite a vyberte ich",
    uploadSelected: "Nahrať vybrané súbory",
    uploadedThanks: "Nahrané — ďakujeme!"
  },
  sv: {
    all: "Alla",
    photos: "Foton",
    videos: "Videor",
    upload: "Ladda upp",
    uploadMobile: "Ladda upp foton eller videor",
    uploadHeading: "Dela dina foton och videor",
    uploadNote: "Släpp eller välj dina filer och tryck sedan på uppladdningsknappen.",
    dropTitle: "Släpp foton eller videor här",
    chooseFiles: "eller klicka för att välja dem",
    uploadSelected: "Ladda upp valda filer",
    uploadedThanks: "Uppladdat — tack!"
  }
};
const UPLOAD_COPY = {
  en: {
    failed: "Failed",
    files: (count) => `${count} file${count === 1 ? "" : "s"}`,
    ready: "Ready to upload. Tap Upload selected files.",
    remove: "Remove",
    uploaded: "Uploaded",
    uploading: (completed, total) => `Uploading ${completed} of ${total} — please keep this page open.`,
    uploadComplete: "Upload complete. Thank you!",
    uploadFailures: (count) => `${count} file${count === 1 ? "" : "s"} could not be uploaded. Please try again.`,
    unsupportedFile: (name) => `“${name}” was skipped. Only photos and videos can be uploaded.`,
    emptyFile: (name) => `“${name}” is empty (0 B) and cannot be uploaded.`,
    fileTooLarge: (name, attempted, maximum) => `“${name}” is ${attempted}. The maximum file size is ${maximum}. Choose a smaller file and try again.`,
    missingFile: "A selected file could not be read. Choose it again.",
    uploadBusy: "An upload is already in progress. Please wait a moment.",
    addFile: "Please add at least one photo or video.",
    moreRejected: (count) => `${count} more file${count === 1 ? " was" : "s were"} skipped.`,
    moreFailures: (count) => `${count} more failure${count === 1 ? " is" : "s are"} shown beside the affected file${count === 1 ? "" : "s"}.`,
    genericFailure: "The upload did not finish. Check your connection and try this file again.",
    waiting: "Waiting for photos or videos."
  },
  sk: {
    failed: "Nepodarilo sa",
    files: (count) => `${count} ${count === 1 ? "súbor" : count < 5 ? "súbory" : "súborov"}`,
    ready: "Pripravené na nahratie. Klepnite na Nahrať vybrané súbory.",
    remove: "Odstrániť",
    uploaded: "Nahrané",
    uploading: (completed, total) => `Nahráva sa ${completed} z ${total} — nechajte túto stránku otvorenú.`,
    uploadComplete: "Nahrávanie je dokončené. Ďakujeme!",
    uploadFailures: (count) => `${count} ${count === 1 ? "súbor sa nepodarilo" : "súbory sa nepodarilo"} nahrať. Skúste to znova.`,
    unsupportedFile: (name) => `Súbor „${name}“ bol vynechaný. Nahrať je možné iba fotografie a videá.`,
    emptyFile: (name) => `Súbor „${name}“ je prázdny (0 B) a nedá sa nahrať.`,
    fileTooLarge: (name, attempted, maximum) => `Súbor „${name}“ má ${attempted}. Maximálna veľkosť súboru je ${maximum}. Vyberte menší súbor a skúste to znova.`,
    missingFile: "Vybraný súbor sa nepodarilo prečítať. Vyberte ho znova.",
    uploadBusy: "Nahrávanie už prebieha. Chvíľu počkajte.",
    addFile: "Pridajte aspoň jednu fotografiu alebo video.",
    moreRejected: (count) => `Ďalšie súbory boli vynechané: ${count}.`,
    moreFailures: (count) => `Ďalšie chyby (${count}) sú zobrazené pri príslušných súboroch.`,
    genericFailure: "Nahrávanie sa nedokončilo. Skontrolujte pripojenie a skúste tento súbor znova.",
    waiting: "Čaká sa na fotografie alebo videá."
  },
  sv: {
    failed: "Misslyckades",
    files: (count) => `${count} ${count === 1 ? "fil" : "filer"}`,
    ready: "Redo att ladda upp. Tryck på Ladda upp valda filer.",
    remove: "Ta bort",
    uploaded: "Uppladdad",
    uploading: (completed, total) => `Laddar upp ${completed} av ${total} — håll sidan öppen.`,
    uploadComplete: "Uppladdningen är klar. Tack!",
    uploadFailures: (count) => `${count} ${count === 1 ? "fil" : "filer"} kunde inte laddas upp. Försök igen.`,
    unsupportedFile: (name) => `”${name}” hoppades över. Endast foton och videor kan laddas upp.`,
    emptyFile: (name) => `”${name}” är tom (0 B) och kan inte laddas upp.`,
    fileTooLarge: (name, attempted, maximum) => `”${name}” är ${attempted}. Den största tillåtna filstorleken är ${maximum}. Välj en mindre fil och försök igen.`,
    missingFile: "En vald fil kunde inte läsas. Välj den igen.",
    uploadBusy: "En uppladdning pågår redan. Vänta en stund.",
    addFile: "Lägg till minst ett foto eller en video.",
    moreRejected: (count) => `${count} fil${count === 1 ? "" : "er"} till hoppades över.`,
    moreFailures: (count) => `${count} fel till visas bredvid ${count === 1 ? "den berörda filen" : "de berörda filerna"}.`,
    genericFailure: "Uppladdningen slutfördes inte. Kontrollera anslutningen och försök med filen igen.",
    waiting: "Väntar på foton eller videor."
  }
};

let categories = [];
let allCategories = [];
let events = [];
let activeEventSlug = "";
let activeCategorySlug = "";
let activeMediaType = "mix";
let photoRenderCount = 0;
let videoRenderCount = 0;
let mixRenderCount = 0;
let loadingMorePhotos = false;
let loadingMoreVideos = false;
let loadingMoreMix = false;
let renderVersion = 0;
let photosObserver = null;
let videosObserver = null;
let mixObserver = null;
let selectedUploadFiles = [];
let uploadInProgress = false;
let uploadSuccessToastTimer = null;

const getUploadCopy = () => {
  const language = window.weddingAutoTranslate?.getLanguage?.() || "en";
  return UPLOAD_COPY[language] || UPLOAD_COPY.en;
};

const getMediaUiCopy = () => {
  const language = window.weddingAutoTranslate?.getLanguage?.() || "en";
  return MEDIA_UI_COPY[language] || MEDIA_UI_COPY.en;
};

const setOwnedText = (element, text) => {
  if (!element) return;
  element.textContent = text;
  element.classList.add("notranslate");
  element.setAttribute("translate", "no");
};

const applyMediaUiCopy = () => {
  const copy = getMediaUiCopy();
  mediaTypeTabs.forEach((tab) => {
    const label = tab.querySelector("[data-media-type-label]");
    setOwnedText(label, copy[tab.dataset.mediaTypeTab] || copy.all);
  });
  setOwnedText(uploadMobileLabel, copy.uploadMobile);
  setOwnedText(uploadPanelTitle, copy.uploadHeading);
  setOwnedText(uploadPanelNote, copy.uploadNote);
  setOwnedText(uploadDropzoneTitle, copy.dropTitle);
  setOwnedText(uploadDropzoneCopy, copy.chooseFiles);
  setOwnedText(uploadSubmitLabel, copy.uploadSelected);
  setOwnedText(uploadSuccessLabel, copy.uploadedThanks);
};

const setStatus = (message, isError = false, isHint = false) => {
  if (!mediaStatus) return;
  mediaStatus.textContent = message;
  mediaStatus.classList.toggle("is-error", isError);
  mediaStatus.classList.toggle("is-hint", isHint);
  if (isError && message) window.weddingGuestError?.show(message);
};

const formatFileSize = uploadCore.formatFileSize;
const dedupeFiles = uploadCore.dedupeFiles;

const isUploadCategoryActive = () => activeCategorySlug === "upload";

const describeFileValidation = (file, validation, copy = getUploadCopy()) => {
  const name = String(file?.name || "").trim();
  if (validation.code === "unsupported_file_type") return copy.unsupportedFile(name);
  if (validation.code === "empty_file") return copy.emptyFile(name);
  if (validation.code === "file_too_large") {
    return copy.fileTooLarge(
      name,
      formatFileSize(validation.size),
      formatFileSize(validation.maxBytes)
    );
  }
  return copy.missingFile;
};

const updateUploadSubmitState = () => {
  if (!uploadSubmit) return;
  const hasPendingFiles = selectedUploadFiles.some((entry) => entry.status !== "complete");
  uploadSubmit.hidden = false;
  uploadSubmit.disabled = uploadInProgress || !hasPendingFiles;
};

const setUploadValidationMessage = (message = "", isError = false) => {
  if (!uploadValidation) return;
  uploadValidation.textContent = message;
  uploadValidation.hidden = !message;
  uploadValidation.classList.toggle("is-error", isError);
  uploadValidation.setAttribute("role", isError ? "alert" : "status");
  uploadValidation.setAttribute("aria-live", isError ? "assertive" : "polite");
  if (isError && message) window.weddingGuestError?.show(message);
};

const showUploadSuccessToast = () => {
  if (!uploadSuccessToast) return;
  if (uploadSuccessToastTimer) window.clearTimeout(uploadSuccessToastTimer);
  uploadSuccessToast.hidden = false;
  requestAnimationFrame(() => {
    uploadSuccessToast.classList.add("is-visible");
  });
  uploadSuccessToastTimer = window.setTimeout(() => {
    uploadSuccessToast.classList.remove("is-visible");
    uploadSuccessToastTimer = window.setTimeout(() => {
      uploadSuccessToast.hidden = true;
    }, 220);
  }, 3600);
};

const renderSelectedUploadFiles = () => {
  if (!uploadFilesList || !uploadFilesTitle) return;
  uploadFilesList.innerHTML = "";
  const copy = getUploadCopy();
  if (!selectedUploadFiles.length) {
    uploadFilesTitle.textContent = copy.waiting;
    updateUploadSubmitState();
    return;
  }
  uploadFilesTitle.textContent = copy.files(selectedUploadFiles.length);
  const fragment = document.createDocumentFragment();
  selectedUploadFiles.forEach((entry, index) => {
    const file = entry.file;
    const item = document.createElement("li");
    item.className = "media-upload-file-item";
    item.dataset.uploadIndex = String(index);
    if (entry.status) {
      item.classList.add(`is-${entry.status}`);
    }

    const name = document.createElement("span");
    name.className = "media-upload-file-name";
    name.textContent = file.name;

    const meta = document.createElement("span");
    meta.className = "media-upload-file-meta";
    meta.textContent = formatFileSize(file.size);

    const status = document.createElement("span");
    status.className = "media-upload-file-status";
    if (entry.status === "uploading") {
      status.textContent = `${entry.progress || 0}%`;
    } else if (entry.status === "complete") {
      status.textContent = copy.uploaded;
    } else if (entry.status === "error") {
      status.textContent = entry.error ? `${copy.failed}: ${entry.error}` : copy.failed;
    } else {
      status.textContent = "";
    }

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "media-upload-file-remove";
    removeButton.disabled = uploadInProgress || entry.status === "complete";
    removeButton.setAttribute("aria-label", `${copy.remove}: ${file.name}`);
    removeButton.title = copy.remove;
    const removeIcon = document.createElement("span");
    removeIcon.className = "material-symbols-outlined";
    removeIcon.setAttribute("aria-hidden", "true");
    removeIcon.textContent = "delete";
    removeButton.appendChild(removeIcon);
    removeButton.addEventListener("click", () => {
      if (uploadInProgress || entry.status === "complete") return;
      selectedUploadFiles = selectedUploadFiles.filter((_candidate, candidateIndex) => candidateIndex !== index);
      setUploadValidationMessage(selectedUploadFiles.length ? copy.ready : "");
      renderSelectedUploadFiles();
    });

    item.appendChild(name);
    item.appendChild(meta);
    item.appendChild(status);
    item.appendChild(removeButton);
    fragment.appendChild(item);
  });
  uploadFilesList.appendChild(fragment);
  updateUploadSubmitState();
};

const mergeSelectedUploadFiles = (incomingFiles) => {
  const reviewed = incomingFiles.map((file) => ({
    file,
    validation: uploadCore.validateUploadFile(file)
  }));
  const filtered = reviewed.filter((entry) => entry.validation.ok).map((entry) => entry.file);
  const rejected = reviewed.filter((entry) => !entry.validation.ok);
  const existing = selectedUploadFiles.map((entry) => entry.file);
  const mergedFiles = dedupeFiles([...existing, ...filtered]);
  selectedUploadFiles = mergedFiles.map((file) => {
    const previous = selectedUploadFiles.find((entry) => entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified);
    return {
      file,
      status: previous?.status || "",
      progress: previous?.progress || 0,
      error: previous?.error || ""
    };
  });
  const readyMessage = filtered.length ? getUploadCopy().ready : "";
  const rejectedMessage = [
    ...rejected
      .slice(0, 5)
      .map(({ file, validation }) => describeFileValidation(file, validation)),
    ...(rejected.length > 5 ? [getUploadCopy().moreRejected(rejected.length - 5)] : [])
  ].join(" ");
  setUploadValidationMessage([readyMessage, rejectedMessage].filter(Boolean).join(" "), rejected.length > 0);
  renderSelectedUploadFiles();
  return filtered.length;
};

const queueSelectedUploadFiles = (files) => {
  if (uploadInProgress) {
    setUploadValidationMessage(getUploadCopy().uploadBusy, true);
    return;
  }
  mergeSelectedUploadFiles(files);
};

const getActiveCategory = () =>
  categories.find((category) => category.slug === activeCategorySlug) || null;

const getActiveEvent = () =>
  events.find((event) => event.slug === activeEventSlug) || null;

const updateEmptyMediaStatus = (activeCategory) => {
  if (!activeCategory) {
    if (photosEmpty) photosEmpty.hidden = true;
    if (videosEmpty) videosEmpty.hidden = true;
    if (mixEmpty) mixEmpty.hidden = true;
    if (photosGrid) photosGrid.hidden = false;
    if (videosGrid) videosGrid.hidden = false;
    if (mixGrid) mixGrid.hidden = false;
    setStatus("");
    return;
  }
  const photosAreEmpty = (activeCategory.photos?.length || 0) === 0;
  const videosAreEmpty = (activeCategory.videos?.length || 0) === 0;
  const mixIsEmpty = photosAreEmpty && videosAreEmpty;
  const activeEvent = getActiveEvent();
  const isWedding2026 = activeEvent?.slug === "wedding-2026";
  const photoEmptyCopy = isWedding2026
    ? 'No photos are in this folder yet. <a href="#" class="media-inline-link" data-open-upload>Upload your own photos</a>.'
    : "No photos are in this folder yet.";
  const videoEmptyCopy = isWedding2026
    ? 'No videos are in this folder yet. <a href="#" class="media-inline-link" data-open-upload>Upload your own videos</a>.'
    : "No videos are in this folder yet.";
  if (photosGrid) photosGrid.hidden = photosAreEmpty;
  if (videosGrid) videosGrid.hidden = videosAreEmpty;
  if (mixGrid) mixGrid.hidden = mixIsEmpty;
  if (photosEmpty) photosEmpty.hidden = !photosAreEmpty;
  if (videosEmpty) videosEmpty.hidden = !videosAreEmpty;
  if (mixEmpty) mixEmpty.hidden = !mixIsEmpty;
  if (photosEmpty) photosEmpty.innerHTML = photoEmptyCopy;
  if (videosEmpty) videosEmpty.innerHTML = videoEmptyCopy;
  if (mixEmpty) mixEmpty.innerHTML = isWedding2026
    ? 'No photos or videos have been shared yet. <a href="#" class="media-inline-link" data-open-upload>Share yours</a>.'
    : "No photos or videos are in this album yet.";
  setStatus("");
};

const updateEventDescription = () => {
  if (!mediaEventDescription) return;
  const activeEvent = getActiveEvent();
  const paragraphs = Array.isArray(activeEvent?.description) ? activeEvent.description : [];
  mediaEventDescription.innerHTML = paragraphs.map((text) => `<p>${text}</p>`).join("");
};

const openUploadCategory = () => {
  const uploadCategory = categories.find((category) => category.isUpload);
  if (!uploadCategory) return;
  activeCategorySlug = uploadCategory.slug;
  renderTabs();
  renderActiveCategory();
};

const updateUploadFileEntry = (index, patch) => {
  const currentEntry = selectedUploadFiles[index];
  if (!currentEntry) return;
  const nextEntry = { ...currentEntry, ...patch };
  selectedUploadFiles[index] = nextEntry;

  const item = uploadFilesList?.querySelector(`[data-upload-index="${index}"]`);
  if (!item) return;
  item.classList.remove("is-uploading", "is-complete", "is-error");
  if (nextEntry.status) item.classList.add(`is-${nextEntry.status}`);

  const status = item.querySelector(".media-upload-file-status");
  if (status) {
    const copy = getUploadCopy();
    if (nextEntry.status === "uploading") {
      status.textContent = `${nextEntry.progress || 0}%`;
    } else if (nextEntry.status === "complete") {
      status.textContent = copy.uploaded;
    } else if (nextEntry.status === "error") {
      status.textContent = nextEntry.error ? `${copy.failed}: ${nextEntry.error}` : copy.failed;
    } else {
      status.textContent = "";
    }
  }
};

const postJson = async (url, body) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || data.details || `Request failed with ${response.status}`);
    error.requestId = data.requestId || response.headers.get("x-nf-request-id") || "";
    throw error;
  }
  return data;
};

const readableUploadError = (error, fallback = getUploadCopy().genericFailure) => {
  const rawMessage = error instanceof Error ? error.message : String(error || "");
  const message = rawMessage.replace(/\s+/g, " ").trim();
  return (message || fallback).slice(0, 320);
};

const uploadFileToSession = async (file, uploadUrl, onProgress) => {
  let start = 0;
  while (start < file.size) {
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "content-range": `bytes ${start}-${end - 1}/${file.size}`
      },
      body: chunk
    });
    if (![200, 201, 202].includes(response.status)) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = "";
      try {
        const data = JSON.parse(errorText);
        errorMessage = data?.error?.message || data?.error || data?.message || "";
      } catch (_error) {
        errorMessage = errorText;
      }
      throw new Error(
        readableUploadError(
          errorMessage,
          `The file upload stopped with status ${response.status}. Please try this file again.`
        )
      );
    }
    start = end;
    onProgress(Math.round((start / file.size) * 100));
  }
};

const uploadOneDriveFile = async (entry, index) => {
  updateUploadFileEntry(index, { status: "uploading", progress: 0 });
  const session = await postJson("/api/onedrive-create-upload-session", {
    fileName: entry.file.name,
    mimeType: entry.file.type,
    size: entry.file.size
  });
  await uploadFileToSession(entry.file, session.uploadUrl, (progress) => {
    updateUploadFileEntry(index, { status: "uploading", progress });
  });
  await postJson("/api/onedrive-save-metadata", {
    sourceFolder: session.sourceFolder,
    kind: session.kind,
    folder: session.folder,
    originalFileName: session.originalFileName,
    storedFileName: session.storedFileName,
    metadataFileName: session.metadataFileName
  });
  updateUploadFileEntry(index, { status: "complete", progress: 100 });
};

const uploadSelectedFiles = async () => {
  const pendingIndexes = selectedUploadFiles
    .map((entry, index) => (entry.status === "complete" ? -1 : index))
    .filter((index) => index >= 0);
  if (!pendingIndexes.length) return;

  uploadInProgress = true;
  if (uploadInput) uploadInput.disabled = true;
  if (uploadDropzone) uploadDropzone.setAttribute("aria-disabled", "true");
  if (uploadForm) uploadForm.setAttribute("aria-busy", "true");
  updateUploadSubmitState();
  const copy = getUploadCopy();
  setUploadValidationMessage(copy.uploading(0, pendingIndexes.length));
  renderSelectedUploadFiles();

  let completed = 0;
  const results = await uploadCore.runBoundedQueue(
    pendingIndexes,
    UPLOAD_FILE_CONCURRENCY,
    async (index) => {
      try {
        await uploadOneDriveFile(selectedUploadFiles[index], index);
      } catch (error) {
        const reason = readableUploadError(error);
        const reference = error?.requestId ? ` Reference: ${error.requestId}.` : "";
        updateUploadFileEntry(index, { status: "error", error: `${reason}${reference}` });
        throw error;
      } finally {
        completed += 1;
        setUploadValidationMessage(copy.uploading(completed, pendingIndexes.length));
      }
    }
  );
  const failures = results.filter((result) => result.status === "rejected").length;

  uploadInProgress = false;
  if (uploadInput) uploadInput.disabled = false;
  if (uploadDropzone) uploadDropzone.removeAttribute("aria-disabled");
  if (uploadForm) uploadForm.removeAttribute("aria-busy");
  renderSelectedUploadFiles();
  updateUploadSubmitState();
  if (failures) {
    const failedEntries = selectedUploadFiles
      .filter((entry) => entry.status === "error" && entry.error)
      .map((entry) => `${entry.file.name}: ${entry.error}`);
    const failedDetails = [
      ...failedEntries.slice(0, 3),
      ...(failedEntries.length > 3 ? [copy.moreFailures(failedEntries.length - 3)] : [])
    ].join(" ");
    setUploadValidationMessage(`${copy.uploadFailures(failures)} ${failedDetails}`.trim(), true);
    return;
  }
  setUploadValidationMessage(copy.uploadComplete);
  showUploadSuccessToast();
  selectedUploadFiles = [];
  renderSelectedUploadFiles();
  await loadMedia({
    eventSlug: "wedding-2026",
    categorySlug: WEDDING_2026_GALLERY_SLUG,
    mediaType: "mix"
  });
};

const preloadImage = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
    if (image.complete) resolve();
  });

const preloadImages = async (items) => {
  if (!items.length) return;
  await Promise.allSettled(items.map((item) => preloadImage(item.thumbnailSrc || item.src)));
};

const createPhotoButton = (item, absoluteIndex = 0) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumb-lightbox-trigger media-gallery-item";
  button.setAttribute("data-fullsrc", item.src);
  button.setAttribute("data-caption", item.caption);
  button.setAttribute("aria-label", `Open photo: ${item.caption}`);

  const image = document.createElement("img");
  image.className = "media-gallery-thumb";
  image.src = item.thumbnailSrc || item.src;
  image.alt = item.caption;
  image.loading = absoluteIndex < 6 ? "eager" : "lazy";
  image.decoding = "async";
  if (absoluteIndex < 3) image.fetchPriority = "high";

  button.appendChild(image);
  if (item.isFavorite) {
    const favoriteBadge = document.createElement("span");
    favoriteBadge.className = "media-favorite-badge";
    favoriteBadge.setAttribute("aria-hidden", "true");
    favoriteBadge.setAttribute("data-tooltip", "One of Our Favorite");
    favoriteBadge.textContent = "★";
    button.appendChild(favoriteBadge);
  }
  return button;
};

const openVideoModal = (videoItem) => {
  if (!videoModal || !videoModalPlayer) return;
  videoModalPlayer.src = videoItem.src;
  videoModalPlayer.load();
  if (videoModalCaption) {
    videoModalCaption.textContent = videoItem.caption || "";
  }
  videoModal.classList.remove("hidden");
  const playPromise = videoModalPlayer.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
};

const closeVideoModal = () => {
  if (!videoModal || !videoModalPlayer) return;
  videoModal.classList.add("hidden");
  videoModalPlayer.pause();
  videoModalPlayer.removeAttribute("src");
  videoModalPlayer.load();
  if (videoModalCaption) videoModalCaption.textContent = "";
};

const createVideoCard = (item) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "media-video-card";
  button.setAttribute("aria-label", `Play video: ${item.caption}`);
  button.addEventListener("click", () => openVideoModal(item));

  const preview = document.createElement("video");
  preview.className = "media-video-thumb";
  preview.src = item.src;
  preview.preload = "metadata";
  preview.muted = true;
  preview.playsInline = true;
  preview.setAttribute("aria-hidden", "true");

  const overlay = document.createElement("span");
  overlay.className = "media-video-play";
  overlay.textContent = "Play";

  const caption = document.createElement("p");
  caption.className = "media-video-caption";
  caption.textContent = item.caption;

  button.appendChild(preview);
  button.appendChild(overlay);
  button.appendChild(caption);
  return button;
};

const getMixedMediaItems = (activeCategory) => {
  const photos = Array.isArray(activeCategory?.photos) ? activeCategory.photos : [];
  const videos = Array.isArray(activeCategory?.videos) ? activeCategory.videos : [];
  const toEntry = (item, kind, index, sourceOrder) => {
    const parsedTimestamp = Date.parse(item?.uploadedAt || "");
    return {
      item,
      kind,
      index,
      sourceOrder,
      timestamp: Number.isFinite(parsedTimestamp) ? parsedTimestamp : null
    };
  };
  const entries = [
    ...photos.map((item, index) => toEntry(item, "photo", index, index * 2)),
    ...videos.map((item, index) => toEntry(item, "video", index, index * 2 + 1))
  ];
  if (entries.some((entry) => entry.timestamp !== null)) {
    return entries.sort((left, right) => {
      const timestampDifference = (right.timestamp ?? Number.NEGATIVE_INFINITY) -
        (left.timestamp ?? Number.NEGATIVE_INFINITY);
      return timestampDifference || left.sourceOrder - right.sourceOrder;
    });
  }

  const interleaved = [];
  const itemCount = Math.max(photos.length, videos.length);
  for (let index = 0; index < itemCount; index += 1) {
    if (photos[index]) interleaved.push(toEntry(photos[index], "photo", index, index * 2));
    if (videos[index]) interleaved.push(toEntry(videos[index], "video", index, index * 2 + 1));
  }
  return interleaved;
};

const renderTabs = () => {
  if (!tabsWrap) return;
  tabsWrap.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const isCategoryFreeGallery = getActiveEvent()?.slug === "wedding-2026";
  const visibleCategories = isCategoryFreeGallery
    ? categories.filter((category) => category.isUpload)
    : categories;
  visibleCategories.forEach((category) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "media-category-tab";
    if (category.isUpload) {
      tab.classList.add("is-upload");
    }
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(category.slug === activeCategorySlug));
    tab.textContent = category.isUpload ? getMediaUiCopy().upload : category.name;
    if (category.isUpload) {
      tab.classList.add("notranslate");
      tab.setAttribute("translate", "no");
    }
    if (category.slug === activeCategorySlug) {
      tab.classList.add("is-active");
    }
    tab.addEventListener("click", () => {
      activeCategorySlug = category.slug;
      renderTabs();
      renderActiveCategory();
    });
    fragment.appendChild(tab);
  });
  tabsWrap.appendChild(fragment);

  if (categorySelectMobile) {
    categorySelectMobileWrap?.classList.toggle("is-category-free", isCategoryFreeGallery);
    categorySelectMobile.innerHTML = "";
    if (!isCategoryFreeGallery) {
      const albums = categories.filter((c) => !c.isUpload);
      albums.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.slug;
        option.textContent = category.name;
        if (category.slug === activeCategorySlug) option.selected = true;
        categorySelectMobile.appendChild(option);
      });
    }
  }

  if (uploadBtnMobile) {
    uploadBtnMobile.hidden = !categories.some((c) => c.isUpload);
    uploadBtnMobile.classList.toggle("is-active", isUploadCategoryActive());
  }
};

if (categorySelectMobile) {
  categorySelectMobile.addEventListener("change", () => {
    const slug = categorySelectMobile.value;
    if (slug && slug !== activeCategorySlug) {
      activeCategorySlug = slug;
      renderTabs();
      renderActiveCategory();
    }
  });
}

if (uploadBtnMobile) {
  uploadBtnMobile.addEventListener("click", () => {
    const uploadCategory = categories.find((c) => c.isUpload);
    if (!uploadCategory || activeCategorySlug === uploadCategory.slug) return;
    activeCategorySlug = uploadCategory.slug;
    renderTabs();
    renderActiveCategory();
  });
}

const renderEventTabs = () => {
  if (!eventTabsWrap) return;
  eventTabsWrap.innerHTML = "";
  const fragment = document.createDocumentFragment();
  events.forEach((eventItem) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "media-event-tab";
    button.setAttribute("role", "tab");
    const isActive = eventItem.slug === activeEventSlug;
    button.setAttribute("aria-selected", String(isActive));
    if (isActive) button.classList.add("is-active");
    button.textContent = eventItem.name;
    button.addEventListener("click", () => {
      if (eventItem.slug === activeEventSlug) return;
      activeEventSlug = eventItem.slug;
      categories = eventItem.categories;
      activeCategorySlug = categories[0]?.slug || "";
      activeMediaType = "mix";
      updateEventDescription();
      renderEventTabs();
      renderTabs();
      renderActiveCategory();
    });
    fragment.appendChild(button);
  });
  eventTabsWrap.appendChild(fragment);
};

const setActiveMediaType = (type) => {
  if (isUploadCategoryActive()) return;
  activeMediaType = type === "photos" || type === "videos" ? type : "mix";
  const activeCategory = getActiveCategory();
  const mixActive = activeMediaType === "mix";
  const photosActive = activeMediaType === "photos";
  const videosActive = activeMediaType === "videos";
  mediaTypeTabs.forEach((tab) => {
    const isActive = tab.dataset.mediaTypeTab === activeMediaType;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  if (mediaMixSection) mediaMixSection.hidden = !mixActive;
  if (mediaPhotosSection) mediaPhotosSection.hidden = !photosActive;
  if (mediaVideosSection) mediaVideosSection.hidden = !videosActive;
  if (mixActive && mixRenderCount === 0) {
    loadMoreMixed();
  }
  if (videosActive && videoRenderCount === 0) {
    loadMoreVideos();
  }
  updateEmptyMediaStatus(activeCategory);
};

const updateCounters = (activeCategory) => {
  if (mixCount) {
    mixCount.textContent = `${mixRenderCount} / ${getMixedMediaItems(activeCategory).length}`;
  }
  if (photosCount) {
    photosCount.textContent = `${photoRenderCount} / ${activeCategory.photos.length}`;
  }
  if (videosCount) {
    videosCount.textContent = `${videoRenderCount} / ${activeCategory.videos.length}`;
  }
};

const appendPhotoBatch = async (activeCategory, start, end, currentRenderVersion, usePreload = true) => {
  const nextBatch = activeCategory.photos.slice(start, end);
  if (usePreload) {
    await preloadImages(nextBatch.slice(0, 10));
  }
  if (currentRenderVersion !== renderVersion || !photosGrid) return;
  const fragment = document.createDocumentFragment();
  nextBatch.forEach((item, offset) => {
    fragment.appendChild(createPhotoButton(item, start + offset));
  });
  photosGrid.appendChild(fragment);
};

const appendVideoBatch = (activeCategory, start, end, currentRenderVersion) => {
  if (currentRenderVersion !== renderVersion || !videosGrid) return;
  const nextBatch = activeCategory.videos.slice(start, end);
  const fragment = document.createDocumentFragment();
  nextBatch.forEach((item) => fragment.appendChild(createVideoCard(item)));
  videosGrid.appendChild(fragment);
};

const appendMixedBatch = (activeCategory, start, end, currentRenderVersion) => {
  if (currentRenderVersion !== renderVersion || !mixGrid) return;
  const nextBatch = getMixedMediaItems(activeCategory).slice(start, end);
  const fragment = document.createDocumentFragment();
  nextBatch.forEach((entry) => {
    fragment.appendChild(
      entry.kind === "video" ? createVideoCard(entry.item) : createPhotoButton(entry.item, entry.index)
    );
  });
  mixGrid.appendChild(fragment);
};

const preloadNextPhotoBatch = (activeCategory) => {
  const nextStart = photoRenderCount;
  if (nextStart >= activeCategory.photos.length) return;
  const nextEnd = Math.min(activeCategory.photos.length, nextStart + PREFETCH_AHEAD_SIZE);
  preloadImages(activeCategory.photos.slice(nextStart, nextEnd));
};

const shouldAutoLoadMore = (sentinel) => {
  if (!sentinel) return false;
  const rect = sentinel.getBoundingClientRect();
  return rect.top <= window.innerHeight + 320;
};

const loadMorePhotos = async () => {
  const active = getActiveCategory();
  if (!active || loadingMorePhotos || photoRenderCount >= active.photos.length) return;
  loadingMorePhotos = true;
  const currentRenderVersion = renderVersion;
  const start = photoRenderCount;
  const end = Math.min(active.photos.length, photoRenderCount + PHOTO_BATCH_SIZE);
  photoRenderCount = end;
  appendPhotoBatch(active, start, end, currentRenderVersion, false);
  updateCounters(active);
  preloadNextPhotoBatch(active);
  loadingMorePhotos = false;
  if (photoRenderCount < active.photos.length && activeMediaType === "photos" && shouldAutoLoadMore(photosSentinel)) {
    requestAnimationFrame(() => {
      loadMorePhotos();
    });
  }
};

const loadMoreVideos = () => {
  const active = getActiveCategory();
  if (!active || loadingMoreVideos || videoRenderCount >= active.videos.length) return;
  loadingMoreVideos = true;
  const currentRenderVersion = renderVersion;
  const start = videoRenderCount;
  const end = Math.min(active.videos.length, videoRenderCount + VIDEO_BATCH_SIZE);
  videoRenderCount = end;
  appendVideoBatch(active, start, end, currentRenderVersion);
  updateCounters(active);
  loadingMoreVideos = false;
  if (videoRenderCount < active.videos.length && activeMediaType === "videos" && shouldAutoLoadMore(videosSentinel)) {
    requestAnimationFrame(() => {
      loadMoreVideos();
    });
  }
};

const loadMoreMixed = () => {
  const active = getActiveCategory();
  if (!active || loadingMoreMix) return;
  const mixedItems = getMixedMediaItems(active);
  if (mixRenderCount >= mixedItems.length) return;
  loadingMoreMix = true;
  const currentRenderVersion = renderVersion;
  const start = mixRenderCount;
  const end = Math.min(mixedItems.length, mixRenderCount + PHOTO_BATCH_SIZE);
  mixRenderCount = end;
  appendMixedBatch(active, start, end, currentRenderVersion);
  updateCounters(active);
  loadingMoreMix = false;
  if (mixRenderCount < mixedItems.length && activeMediaType === "mix" && shouldAutoLoadMore(mixSentinel)) {
    requestAnimationFrame(() => {
      loadMoreMixed();
    });
  }
};

const teardownObservers = () => {
  if (photosObserver) photosObserver.disconnect();
  if (videosObserver) videosObserver.disconnect();
  if (mixObserver) mixObserver.disconnect();
  photosObserver = null;
  videosObserver = null;
  mixObserver = null;
};

const setupObservers = () => {
  teardownObservers();
  if (photosSentinel) {
    photosObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && activeMediaType === "photos") {
            loadMorePhotos();
          }
        });
      },
      { root: null, rootMargin: "1000px 0px", threshold: 0 }
    );
    photosObserver.observe(photosSentinel);
  }

  if (videosSentinel) {
    videosObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && activeMediaType === "videos") {
            loadMoreVideos();
          }
        });
      },
      { root: null, rootMargin: "450px 0px", threshold: 0 }
    );
    videosObserver.observe(videosSentinel);
  }

  if (mixSentinel) {
    mixObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && activeMediaType === "mix") {
            loadMoreMixed();
          }
        });
      },
      { root: null, rootMargin: "1000px 0px", threshold: 0 }
    );
    mixObserver.observe(mixSentinel);
  }
};

const renderActiveCategory = async () => {
  const active = getActiveCategory();
  if (!active || !mixGrid || !photosGrid || !videosGrid) return;

  if (mediaViewerTitle) {
    const currentEvent = getActiveEvent();
    mediaViewerTitle.textContent = currentEvent?.name || "Wedding Memories";
  }

  if (isUploadCategoryActive()) {
    teardownObservers();
    if (mediaTypeTabsWrap) mediaTypeTabsWrap.hidden = true;
    if (mediaMixSection) mediaMixSection.hidden = true;
    if (mediaPhotosSection) mediaPhotosSection.hidden = true;
    if (mediaVideosSection) mediaVideosSection.hidden = true;
    if (mediaUploadSection) mediaUploadSection.hidden = false;
    setStatus("");
    return;
  }

  renderVersion += 1;
  const currentRenderVersion = renderVersion;
  mixGrid.innerHTML = "";
  photosGrid.innerHTML = "";
  videosGrid.innerHTML = "";
  loadingMoreMix = false;
  loadingMorePhotos = false;
  loadingMoreVideos = false;
  if (mediaTypeTabsWrap) mediaTypeTabsWrap.hidden = false;
  if (mediaUploadSection) mediaUploadSection.hidden = true;
  mixRenderCount = 0;
  photoRenderCount = Math.min(active.photos.length, PHOTO_BATCH_SIZE);
  videoRenderCount = 0;

  appendPhotoBatch(active, 0, photoRenderCount, currentRenderVersion, false);
  updateCounters(active);
  preloadNextPhotoBatch(active);
  setupObservers();
  updateEmptyMediaStatus(active);
  setActiveMediaType(activeMediaType);
};

const fetchMediaData = async () => {
  const endpoints = [
    "/assets/data/media-list.json",
    "./assets/data/media-list.json",
    "/.netlify/functions/media-list",
    "./.netlify/functions/media-list",
    "/api/media-list"
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "default"
      });
      if (!response.ok) {
        throw new Error(`${endpoint} returned ${response.status}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.categories)) {
        return data;
      }
      throw new Error("Invalid media list format");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No media list is reachable");
};

const fetchUploadedMediaData = async () => {
  const endpoints = ["/api/onedrive-upload-list", "/.netlify/functions/onedrive-upload-list"];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && Array.isArray(data.categories)) return data;
    } catch (_error) {
      // A plain static server has no OneDrive functions; keep the local gallery working.
    }
  }
  return { source: "onedrive-uploads", count: 0, categories: [] };
};

const loadMedia = async (options = {}) => {
  if (!tabsWrap || !mixGrid || !photosGrid || !videosGrid || !eventTabsWrap) return;

  try {
    const [data, uploadedData] = await Promise.all([fetchMediaData(), fetchUploadedMediaData()]);
    allCategories = Array.isArray(data.categories)
      ? data.categories.filter((category) => (category.photos?.length || 0) + (category.videos?.length || 0) > 0)
      : [];

    const uploadCategory = { slug: "upload", name: "Upload", photos: [], videos: [], total: 0, isUpload: true };
    const uploadedCategories = Array.isArray(uploadedData.categories) ? uploadedData.categories : [];
    const newestFirst = (left, right) => Date.parse(right.uploadedAt || 0) - Date.parse(left.uploadedAt || 0);
    const wedding2026Photos = uploadedCategories
      .flatMap((category) => (Array.isArray(category.photos) ? category.photos : []))
      .sort(newestFirst);
    const wedding2026Videos = uploadedCategories
      .flatMap((category) => (Array.isArray(category.videos) ? category.videos : []))
      .sort(newestFirst);
    const wedding2026Gallery = {
      slug: WEDDING_2026_GALLERY_SLUG,
      name: "All uploads",
      photos: wedding2026Photos,
      videos: wedding2026Videos,
      total: wedding2026Photos.length + wedding2026Videos.length
    };
    events = [
      {
        slug: "beach-2024",
        name: "2024 Beach Ceremony",
        description: [
          "<strong>In 2024, we invited our closest 30 people</strong> to join us for a symbolic beach ceremony in northern Denmark - no priest and no legal status, just love and celebration.",
          "The day unfolded in three beautiful moments: we exchanged vows in the dunes, celebrated with champagne and a run into the sea, and then continued to Benthe and Claus' venue for pizza and a proper party."
        ],
        categories: allCategories
      },
      {
        slug: "wedding-2026",
        name: "2026 Wedding",
        description: [
          "<strong>This story is still being written.</strong> We would love your photos and videos so we can tell it properly.",
          "Drop or choose your photos and videos, then tap the upload button to add them to the wedding gallery. <a href=\"#\" class=\"media-inline-link\" data-open-upload>Share your photos or videos</a>."
        ],
        categories: [wedding2026Gallery, uploadCategory]
      }
    ];

    const requestedEventSlug = typeof options?.eventSlug === "string" ? options.eventSlug : "wedding-2026";
    const defaultEvent = events.find((event) => event.slug === requestedEventSlug) || events[0];
    activeEventSlug = defaultEvent.slug;
    categories = defaultEvent.categories;
    const requestedCategorySlug = typeof options?.categorySlug === "string" ? options.categorySlug : "";
    activeCategorySlug = categories.some((category) => category.slug === requestedCategorySlug)
      ? requestedCategorySlug
      : categories[0].slug;
    if (options?.mediaType === "mix" || options?.mediaType === "photos" || options?.mediaType === "videos") {
      activeMediaType = options.mediaType;
    }
    updateEventDescription();
    renderEventTabs();
    renderTabs();
    await renderActiveCategory();
  } catch (_error) {
    setStatus("Could not load wedding media.", true);
  }
};

mediaTypeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveMediaType(tab.dataset.mediaTypeTab));
});

if (videoModalClose) {
  videoModalClose.addEventListener("click", closeVideoModal);
}

if (videoModal) {
  videoModal.addEventListener("click", (event) => {
    if (event.target === videoModal) closeVideoModal();
  });
}

if (uploadInput) {
  uploadInput.addEventListener("change", () => {
    const files = Array.from(uploadInput.files || []);
    if (!files.length) return;
    queueSelectedUploadFiles(files);
    uploadInput.value = "";
  });
}

if (uploadDropzone) {
  ["dragenter", "dragover"].forEach((eventName) => {
    uploadDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadDropzone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    uploadDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadDropzone.classList.remove("is-dragover");
    });
  });
  uploadDropzone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) return;
    queueSelectedUploadFiles(files);
  });
}

if (uploadForm) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (uploadInProgress) return;
    if (!selectedUploadFiles.length) {
      setUploadValidationMessage(getUploadCopy().addFile, true);
      return;
    }
    setUploadValidationMessage("");
    await uploadSelectedFiles();
  });
}

if (mediaLogoutForm) {
  mediaLogoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lockButton = mediaLogoutForm.querySelector("button[type='submit']");
    if (lockButton) lockButton.disabled = true;
    try {
      const response = await fetch(mediaLogoutForm.action, {
        method: "POST",
        body: new URLSearchParams(),
        credentials: "same-origin",
        redirect: "manual"
      });
      if (response.type === "opaqueredirect" || response.status === 303) {
        window.location.assign("/media-access");
        return;
      }
      throw new Error(`Gallery lock failed with ${response.status}`);
    } catch (_error) {
      if (lockButton) lockButton.disabled = false;
      setStatus("Could not lock the gallery. Please try again.", true);
    }
  });
}

if (mediaEventDescription) {
  mediaEventDescription.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-open-upload]") : null;
    if (!trigger) return;
    event.preventDefault();
    openUploadCategory();
  });
}

if (photosEmpty) {
  photosEmpty.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-open-upload]") : null;
    if (!trigger) return;
    event.preventDefault();
    openUploadCategory();
  });
}

if (videosEmpty) {
  videosEmpty.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-open-upload]") : null;
    if (!trigger) return;
    event.preventDefault();
    openUploadCategory();
  });
}

if (mixEmpty) {
  mixEmpty.addEventListener("click", (event) => {
    const trigger = event.target instanceof Element ? event.target.closest("[data-open-upload]") : null;
    if (!trigger) return;
    event.preventDefault();
    openUploadCategory();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && videoModal && !videoModal.classList.contains("hidden")) {
    closeVideoModal();
  }
});

const initializeMedia = () => {
  applyMediaUiCopy();
  loadMedia();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMedia, { once: true });
} else {
  initializeMedia();
}
