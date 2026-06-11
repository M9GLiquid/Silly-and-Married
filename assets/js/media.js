const mediaStatus = document.getElementById("media-gallery-status");
const mediaViewerTitle = document.getElementById("media-viewer-title");
const eventTabsWrap = document.getElementById("media-event-tabs");
const mediaEventDescription = document.getElementById("media-event-description");
const tabsWrap = document.getElementById("media-category-tabs");
const categorySelectMobile = document.getElementById("media-category-select-mobile");
const uploadBtnMobile = document.getElementById("media-upload-btn-mobile");
const photosGrid = document.getElementById("media-photos-grid");
const videosGrid = document.getElementById("media-videos-grid");
const photosEmpty = document.getElementById("media-photos-empty");
const videosEmpty = document.getElementById("media-videos-empty");
const photosCount = document.getElementById("media-photos-count");
const videosCount = document.getElementById("media-videos-count");
const photosSentinel = document.getElementById("media-photos-sentinel");
const videosSentinel = document.getElementById("media-videos-sentinel");
const mediaTypeTabs = Array.from(document.querySelectorAll("[data-media-type-tab]"));
const mediaPhotosSection = document.getElementById("media-photos-section");
const mediaVideosSection = document.getElementById("media-videos-section");
const mediaUploadSection = document.getElementById("media-upload-category-section");
const videoModal = document.getElementById("video-modal");
const videoModalPlayer = document.getElementById("video-modal-player");
const videoModalCaption = document.getElementById("video-modal-caption");
const videoModalClose = document.getElementById("video-modal-close");
const uploadForm = document.getElementById("media-upload-form");
const uploadPhotographerPanel = document.getElementById("media-upload-photographer-panel");
const uploadPhotographerSame = document.getElementById("media-upload-photographer-same");
const uploadPhotographerAll = document.getElementById("media-upload-photographer-all");
const uploadPhotographerList = document.getElementById("media-upload-photographer-list");
const uploadInput = document.getElementById("media-upload-input");
const uploadDropzone = document.getElementById("media-upload-dropzone");
const uploadSubmit = document.getElementById("media-upload-submit");
const uploadFilesTitle = document.getElementById("media-upload-files-title");
const uploadFilesList = document.getElementById("media-upload-files-list");
const uploadValidation = document.getElementById("media-upload-validation");

const PHOTO_BATCH_SIZE = 24;
const VIDEO_BATCH_SIZE = 6;
const PREFETCH_AHEAD_SIZE = 24;
const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024;

let categories = [];
let allCategories = [];
let events = [];
let activeEventSlug = "";
let activeCategorySlug = "";
let activeMediaType = "photos";
let photoRenderCount = 0;
let videoRenderCount = 0;
let loadingMorePhotos = false;
let loadingMoreVideos = false;
let renderVersion = 0;
let photosObserver = null;
let videosObserver = null;
let selectedUploadFiles = [];
let uploadCategoryOptions = [];
let invalidUploadIndexes = new Set();
let uploadInProgress = false;
let uploadPhotographerStepShown = false;

const setStatus = (message, isError = false, isHint = false) => {
  if (!mediaStatus) return;
  mediaStatus.textContent = message;
  mediaStatus.classList.toggle("is-error", isError);
  mediaStatus.classList.toggle("is-hint", isHint);
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const dedupeFiles = (files) => {
  const map = new Map();
  files.forEach((file) => {
    const key = `${file.name}::${file.size}::${file.lastModified}`;
    if (!map.has(key)) {
      map.set(key, file);
    }
  });
  return Array.from(map.values());
};

const isUploadCategoryActive = () => activeCategorySlug === "upload";

const isAllowedUploadFile = (file) => {
  if (!file || typeof file.type !== "string") return false;
  return file.type.startsWith("image/") || file.type.startsWith("video/");
};

const updateUploadSubmitState = () => {
  if (!uploadSubmit) return;
  const hasFiles = selectedUploadFiles.length > 0;
  uploadSubmit.disabled = uploadInProgress || !hasFiles;
};

const setUploadValidationMessage = (message = "", isError = false) => {
  if (!uploadValidation) return;
  uploadValidation.textContent = message;
  uploadValidation.hidden = !message;
  uploadValidation.classList.toggle("is-error", isError);
};

const setPhotographerStepVisible = (isVisible) => {
  uploadPhotographerStepShown = isVisible;
  if (uploadPhotographerPanel) uploadPhotographerPanel.hidden = !isVisible;
  if (uploadSubmit) {
    uploadSubmit.lastChild.textContent = isVisible ? " Upload Now" : " Submit Upload";
  }
};

const renderPhotographerFields = () => {
  if (!uploadPhotographerList) return;
  const useSame = uploadPhotographerSame ? uploadPhotographerSame.checked : true;
  uploadPhotographerList.hidden = useSame;
  uploadPhotographerList.innerHTML = "";
  if (useSame) return;

  const fragment = document.createDocumentFragment();
  selectedUploadFiles.forEach((entry, index) => {
    const label = document.createElement("label");
    label.className = "media-upload-photographer-file";

    const name = document.createElement("span");
    name.className = "media-upload-file-name";
    name.textContent = entry.file.name;

    const input = document.createElement("input");
    input.className = "media-upload-text-input";
    input.type = "text";
    input.maxLength = 120;
    input.value = entry.photographer || "";
    input.placeholder = "Photographer";
    input.addEventListener("input", () => {
      selectedUploadFiles[index].photographer = input.value;
    });

    label.appendChild(name);
    label.appendChild(input);
    fragment.appendChild(label);
  });
  uploadPhotographerList.appendChild(fragment);
};

const renderSelectedUploadFiles = () => {
  if (!uploadFilesList || !uploadFilesTitle) return;
  uploadFilesList.innerHTML = "";
  if (!selectedUploadFiles.length) {
    uploadFilesTitle.textContent = "No files selected yet.";
    updateUploadSubmitState();
    return;
  }
  uploadFilesTitle.textContent = `${selectedUploadFiles.length} file${selectedUploadFiles.length === 1 ? "" : "s"} selected`;
  const fragment = document.createDocumentFragment();
  selectedUploadFiles.forEach((entry, index) => {
    const file = entry.file;
    const item = document.createElement("li");
    item.className = "media-upload-file-item";
    if (invalidUploadIndexes.has(index)) {
      item.classList.add("is-invalid");
    }
    if (entry.status) {
      item.classList.add(`is-${entry.status}`);
    }

    const name = document.createElement("span");
    name.className = "media-upload-file-name";
    name.textContent = file.name;

    const meta = document.createElement("span");
    meta.className = "media-upload-file-meta";
    meta.textContent = formatFileSize(file.size);

    const categorySelect = document.createElement("select");
    categorySelect.className = "media-upload-file-select";
    categorySelect.setAttribute("aria-label", `Category for ${file.name}`);
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select category";
    categorySelect.appendChild(placeholder);
    uploadCategoryOptions.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
    categorySelect.value = entry.categorySlug || "";
    if (invalidUploadIndexes.has(index)) {
      categorySelect.classList.add("is-invalid");
    }
    categorySelect.disabled = uploadInProgress;
    categorySelect.addEventListener("change", () => {
      selectedUploadFiles[index].categorySlug = categorySelect.value;
      if (categorySelect.value) {
        invalidUploadIndexes.delete(index);
      }
      updateUploadSubmitState();
      setUploadValidationMessage("");
      renderSelectedUploadFiles();
    });

    const status = document.createElement("span");
    status.className = "media-upload-file-status";
    if (entry.status === "uploading") {
      status.textContent = `${entry.progress || 0}%`;
    } else if (entry.status === "complete") {
      status.textContent = "Uploaded";
    } else if (entry.status === "error") {
      status.textContent = "Failed";
    } else {
      status.textContent = "";
    }

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "media-upload-file-remove";
    removeButton.disabled = uploadInProgress;
    removeButton.setAttribute("aria-label", `Remove ${file.name}`);
    const removeIcon = document.createElement("span");
    removeIcon.className = "material-symbols-outlined";
    removeIcon.setAttribute("aria-hidden", "true");
    removeIcon.textContent = "delete";
    removeButton.appendChild(removeIcon);
    removeButton.addEventListener("click", () => {
      selectedUploadFiles = selectedUploadFiles.filter((_, candidateIndex) => candidateIndex !== index);
      renderSelectedUploadFiles();
    });

    item.appendChild(removeButton);
    item.appendChild(name);
    item.appendChild(meta);
    item.appendChild(categorySelect);
    item.appendChild(status);
    fragment.appendChild(item);
  });
  uploadFilesList.appendChild(fragment);
  renderPhotographerFields();
  updateUploadSubmitState();
};

const mergeSelectedUploadFiles = (incomingFiles) => {
  const filtered = incomingFiles.filter((file) => isAllowedUploadFile(file));
  const existing = selectedUploadFiles.map((entry) => entry.file);
  const mergedFiles = dedupeFiles([...existing, ...filtered]);
  selectedUploadFiles = mergedFiles.map((file) => {
    const previous = selectedUploadFiles.find((entry) => entry.file.name === file.name && entry.file.size === file.size && entry.file.lastModified === file.lastModified);
    return { file, categorySlug: previous?.categorySlug || "", photographer: previous?.photographer || "", status: previous?.status || "", progress: previous?.progress || 0 };
  });
  invalidUploadIndexes = new Set();
  setPhotographerStepVisible(false);
  setUploadValidationMessage("");
  renderSelectedUploadFiles();
};

const getActiveCategory = () =>
  categories.find((category) => category.slug === activeCategorySlug) || null;

const getActiveEvent = () =>
  events.find((event) => event.slug === activeEventSlug) || null;

const updateEmptyMediaStatus = (activeCategory) => {
  if (!activeCategory) {
    if (photosEmpty) photosEmpty.hidden = true;
    if (videosEmpty) videosEmpty.hidden = true;
    if (photosGrid) photosGrid.hidden = false;
    if (videosGrid) videosGrid.hidden = false;
    setStatus("");
    return;
  }
  const photosAreEmpty = (activeCategory.photos?.length || 0) === 0;
  const videosAreEmpty = (activeCategory.videos?.length || 0) === 0;
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
  if (photosEmpty) photosEmpty.hidden = !photosAreEmpty;
  if (videosEmpty) videosEmpty.hidden = !videosAreEmpty;
  if (photosEmpty) photosEmpty.innerHTML = photoEmptyCopy;
  if (videosEmpty) videosEmpty.innerHTML = videoEmptyCopy;
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

const updateUploadCategoryOptions = () => {
  const activeEvent = getActiveEvent();
  const list = Array.isArray(activeEvent?.categories) ? activeEvent.categories : [];
  uploadCategoryOptions = list.filter((category) => !category.isUpload).map((category) => ({ slug: category.slug, name: category.name }));
  selectedUploadFiles = selectedUploadFiles.map((entry) => {
    const stillValid = uploadCategoryOptions.some((category) => category.slug === entry.categorySlug);
    return { ...entry, categorySlug: stillValid ? entry.categorySlug : "" };
  });
  invalidUploadIndexes = new Set();
  setUploadValidationMessage("");
  renderSelectedUploadFiles();
  updateUploadSubmitState();
};

const updateUploadFileEntry = (index, patch) => {
  selectedUploadFiles = selectedUploadFiles.map((entry, candidateIndex) =>
    candidateIndex === index ? { ...entry, ...patch } : entry
  );
  renderSelectedUploadFiles();
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
    throw new Error(data.error || data.details || `Request failed with ${response.status}`);
  }
  return data;
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
      throw new Error(errorText || `OneDrive upload failed with ${response.status}`);
    }
    start = end;
    onProgress(Math.round((start / file.size) * 100));
  }
};

const uploadOneDriveFile = async (entry, index, photographer) => {
  updateUploadFileEntry(index, { status: "uploading", progress: 0 });
  const category = uploadCategoryOptions.find((option) => option.slug === entry.categorySlug) || null;
  const session = await postJson("/api/onedrive-create-upload-session", {
    photographer,
    categorySlug: entry.categorySlug,
    categoryName: category?.name || entry.categorySlug,
    fileName: entry.file.name,
    mimeType: entry.file.type,
    size: entry.file.size
  });
  await uploadFileToSession(entry.file, session.uploadUrl, (progress) => {
    updateUploadFileEntry(index, { status: "uploading", progress });
  });
  await postJson("/api/onedrive-save-metadata", {
    photographer: session.photographer,
    categorySlug: session.categorySlug,
    categoryName: session.categoryName,
    kind: session.kind,
    folder: session.folder,
    originalFileName: session.originalFileName,
    storedFileName: session.storedFileName,
    metadataFileName: session.metadataFileName
  });
  updateUploadFileEntry(index, { status: "complete", progress: 100 });
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

const renderTabs = () => {
  if (!tabsWrap) return;
  tabsWrap.innerHTML = "";
  const fragment = document.createDocumentFragment();
  categories.forEach((category) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "media-category-tab";
    if (category.isUpload) {
      tab.classList.add("is-upload");
    }
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(category.slug === activeCategorySlug));
    tab.textContent = category.name;
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
    categorySelectMobile.innerHTML = "";
    const albums = categories.filter((c) => !c.isUpload);
    albums.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name;
      if (category.slug === activeCategorySlug) option.selected = true;
      categorySelectMobile.appendChild(option);
    });
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
      updateEventDescription();
      updateUploadCategoryOptions();
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
  activeMediaType = type === "videos" ? "videos" : "photos";
  const activeCategory = getActiveCategory();
  const photosActive = activeMediaType === "photos";
  mediaTypeTabs.forEach((tab) => {
    const isActive = tab.dataset.mediaTypeTab === activeMediaType;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  if (mediaPhotosSection) mediaPhotosSection.hidden = !photosActive;
  if (mediaVideosSection) mediaVideosSection.hidden = photosActive;
  if (!photosActive && videoRenderCount === 0) {
    loadMoreVideos();
  }
  updateEmptyMediaStatus(activeCategory);
};

const updateCounters = (activeCategory) => {
  if (photosCount) {
    photosCount.textContent = `${photoRenderCount} / ${activeCategory.photos.length} loaded`;
  }
  if (videosCount) {
    videosCount.textContent = `${videoRenderCount} / ${activeCategory.videos.length} loaded`;
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

const teardownObservers = () => {
  if (photosObserver) photosObserver.disconnect();
  if (videosObserver) videosObserver.disconnect();
  photosObserver = null;
  videosObserver = null;
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
};

const renderActiveCategory = async () => {
  const active = getActiveCategory();
  if (!active || !photosGrid || !videosGrid) return;

  if (mediaViewerTitle) {
    const currentEvent = getActiveEvent();
    mediaViewerTitle.textContent = currentEvent?.name || "Wedding Memories";
  }

  if (isUploadCategoryActive()) {
    teardownObservers();
    if (mediaPhotosSection) mediaPhotosSection.hidden = true;
    if (mediaVideosSection) mediaVideosSection.hidden = true;
    if (mediaUploadSection) mediaUploadSection.hidden = false;
    setStatus("");
    return;
  }

  renderVersion += 1;
  const currentRenderVersion = renderVersion;
  photosGrid.innerHTML = "";
  videosGrid.innerHTML = "";
  loadingMorePhotos = false;
  loadingMoreVideos = false;
  if (mediaUploadSection) mediaUploadSection.hidden = true;
  if (mediaPhotosSection) mediaPhotosSection.hidden = false;
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

const loadMedia = async () => {
  if (!tabsWrap || !photosGrid || !videosGrid || !eventTabsWrap) return;

  try {
    const data = await fetchMediaData();
    allCategories = Array.isArray(data.categories)
      ? data.categories.filter((category) => (category.photos?.length || 0) + (category.videos?.length || 0) > 0)
      : [];
    if (!allCategories.length) {
      setStatus("No media categories found in /media folders.");
      return;
    }

    const uploadCategory = { slug: "upload", name: "Upload", photos: [], videos: [], total: 0, isUpload: true };
    const wedding2026CategorySeeds = [
      { slug: "church", name: "Church" },
      { slug: "venue", name: "Venue" },
      { slug: "dancing", name: "Dancing" },
      { slug: "guests", name: "Guests & Group Photos" },
      { slug: "ceremony", name: "Ceremony Moments" },
      { slug: "reception", name: "Reception Moments" }
    ];
    const emptyWeddingCategories = wedding2026CategorySeeds.map((category) => ({
      slug: category.slug,
      name: category.name,
      photos: [],
      videos: [],
      total: 0
    }));
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
          "Use the upload flow and tag each file with a category - then it will appear in the matching folder below. <a href=\"#\" class=\"media-inline-link\" data-open-upload>Upload your own photos or videos</a>."
        ],
        categories: [...emptyWeddingCategories, uploadCategory]
      }
    ];

    const defaultEvent = events.find((event) => event.slug === "wedding-2026") || events[0];
    activeEventSlug = defaultEvent.slug;
    categories = defaultEvent.categories;
    activeCategorySlug = categories[0].slug;
    updateEventDescription();
    updateUploadCategoryOptions();
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
    mergeSelectedUploadFiles(files);
    uploadInput.value = "";
  });
}

if (uploadPhotographerSame) {
  uploadPhotographerSame.addEventListener("change", () => {
    setUploadValidationMessage("");
    renderPhotographerFields();
  });
}

if (uploadPhotographerAll) {
  uploadPhotographerAll.addEventListener("input", () => {
    setUploadValidationMessage("");
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
    mergeSelectedUploadFiles(files);
  });
}

if (uploadForm) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (uploadInProgress) return;
    if (!selectedUploadFiles.length) {
      setUploadValidationMessage("Please add at least one file before submitting.", true);
      return;
    }
    const missingIndexes = [];
    selectedUploadFiles.forEach((entry, index) => {
      if (!entry.categorySlug) {
        missingIndexes.push(index);
      }
    });
    if (missingIndexes.length) {
      invalidUploadIndexes = new Set(missingIndexes);
      setUploadValidationMessage("Please choose a category for each highlighted file.", true);
      renderSelectedUploadFiles();
      return;
    }
    invalidUploadIndexes = new Set();
    if (!uploadPhotographerStepShown) {
      setPhotographerStepVisible(true);
      renderPhotographerFields();
      uploadPhotographerAll?.focus();
      setUploadValidationMessage("Photographer is optional. Add a name for recognition, or leave it empty and upload.");
      return;
    }

    const useSamePhotographer = uploadPhotographerSame ? uploadPhotographerSame.checked : true;
    const sharedPhotographer = uploadPhotographerAll?.value.trim() || "";
    uploadInProgress = true;
    updateUploadSubmitState();
    setUploadValidationMessage("Uploading. Please keep this page open.");
    renderSelectedUploadFiles();

    let failures = 0;
    for (let index = 0; index < selectedUploadFiles.length; index += 1) {
      try {
        const photographer = useSamePhotographer ? sharedPhotographer : selectedUploadFiles[index].photographer?.trim() || "";
        await uploadOneDriveFile(selectedUploadFiles[index], index, photographer);
      } catch (_error) {
        failures += 1;
        updateUploadFileEntry(index, { status: "error" });
      }
    }

    uploadInProgress = false;
    updateUploadSubmitState();
    if (failures) {
      setUploadValidationMessage(`${failures} file${failures === 1 ? "" : "s"} could not be uploaded. Please try again.`, true);
      return;
    }
    setUploadValidationMessage("Upload complete. Thank you!");
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && videoModal && !videoModal.classList.contains("hidden")) {
    closeVideoModal();
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadMedia, { once: true });
} else {
  loadMedia();
}
