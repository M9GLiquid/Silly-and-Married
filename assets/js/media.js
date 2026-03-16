const mediaStatus = document.getElementById("media-gallery-status");
const tabsWrap = document.getElementById("media-category-tabs");
const photosGrid = document.getElementById("media-photos-grid");
const videosGrid = document.getElementById("media-videos-grid");
const photosCount = document.getElementById("media-photos-count");
const videosCount = document.getElementById("media-videos-count");
const photosSentinel = document.getElementById("media-photos-sentinel");
const videosSentinel = document.getElementById("media-videos-sentinel");
const mediaTypeTabs = Array.from(document.querySelectorAll("[data-media-type-tab]"));
const mediaPhotosSection = document.getElementById("media-photos-section");
const mediaVideosSection = document.getElementById("media-videos-section");
const videoModal = document.getElementById("video-modal");
const videoModalPlayer = document.getElementById("video-modal-player");
const videoModalCaption = document.getElementById("video-modal-caption");
const videoModalClose = document.getElementById("video-modal-close");

const PHOTO_BATCH_SIZE = 24;
const VIDEO_BATCH_SIZE = 6;
const PREFETCH_AHEAD_SIZE = 24;

let categories = [];
let activeCategorySlug = "";
let activeMediaType = "photos";
let photoRenderCount = 0;
let videoRenderCount = 0;
let loadingMorePhotos = false;
let loadingMoreVideos = false;
let renderVersion = 0;
let photosObserver = null;
let videosObserver = null;

const setStatus = (message, isError = false) => {
  if (!mediaStatus) return;
  mediaStatus.textContent = message;
  mediaStatus.classList.toggle("is-error", isError);
};

const getActiveCategory = () =>
  categories.find((category) => category.slug === activeCategorySlug) || null;

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
};

const setActiveMediaType = (type) => {
  activeMediaType = type === "videos" ? "videos" : "photos";
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

  renderVersion += 1;
  const currentRenderVersion = renderVersion;
  photosGrid.innerHTML = "";
  videosGrid.innerHTML = "";
  loadingMorePhotos = false;
  loadingMoreVideos = false;
  photoRenderCount = Math.min(active.photos.length, PHOTO_BATCH_SIZE);
  videoRenderCount = 0;

  appendPhotoBatch(active, 0, photoRenderCount, currentRenderVersion, false);
  updateCounters(active);
  preloadNextPhotoBatch(active);
  setupObservers();
  setStatus("");
};

const fetchMediaData = async () => {
  const endpoints = [
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
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No media function endpoint is reachable");
};

const loadMedia = async () => {
  if (!tabsWrap || !photosGrid || !videosGrid) return;

  try {
    const data = await fetchMediaData();
    categories = Array.isArray(data.categories)
      ? data.categories.filter((category) => (category.photos?.length || 0) + (category.videos?.length || 0) > 0)
      : [];
    if (!categories.length) {
      setStatus("No media categories found in /media folders.");
      return;
    }

    activeCategorySlug = categories[0].slug;
    renderTabs();
    await renderActiveCategory();
    setActiveMediaType(activeMediaType);
  } catch (_error) {
    setStatus("Could not load Beach Wedding media.", true);
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

