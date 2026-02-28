const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");
const galleryItems = document.querySelectorAll(".gallery-item");
const thumbTriggers = document.querySelectorAll(".thumb-lightbox-trigger");

const getCaption = (el) => el.getAttribute("data-caption") || "";

let currentGroup = [];
let currentIndex = 0;

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) return;
  lightbox.classList.add("hidden");
  lightboxImage.src = "";
  lightboxImage.alt = "";
  currentGroup = [];
  if (lightboxPrev) lightboxPrev.hidden = true;
  if (lightboxNext) lightboxNext.hidden = true;
};

const showImage = (src, caption, alt) => {
  if (!lightbox || !lightboxImage) return;
  lightboxImage.src = src;
  lightboxImage.alt = alt || caption;
  if (lightboxCaption) lightboxCaption.textContent = caption;
  lightbox.classList.remove("hidden");
};

const updateNavState = () => {
  const hasMultiple = currentGroup.length > 1;
  if (lightboxPrev) {
    lightboxPrev.hidden = !hasMultiple;
    lightboxPrev.disabled = currentIndex <= 0;
  }
  if (lightboxNext) {
    lightboxNext.hidden = !hasMultiple;
    lightboxNext.disabled = currentIndex >= currentGroup.length - 1;
  }
};

const showAtIndex = (index) => {
  if (index < 0 || index >= currentGroup.length) return;
  currentIndex = index;
  const btn = currentGroup[index];
  const src = btn.getAttribute("data-fullsrc");
  const caption = getCaption(btn);
  const img = btn.querySelector("img");
  if (src) showImage(src, caption, img ? img.alt : "");
  updateNavState();
};

galleryItems.forEach((button) => {
  button.addEventListener("click", () => {
    const fullSrc = button.getAttribute("data-fullsrc");
    const caption = getCaption(button);
    const thumbImage = button.querySelector("img");
    if (!lightbox || !lightboxImage || !fullSrc) return;
    currentGroup = [];
    showImage(fullSrc, caption, thumbImage ? thumbImage.alt : caption);
    if (lightboxPrev) lightboxPrev.hidden = true;
    if (lightboxNext) lightboxNext.hidden = true;
  });
});

thumbTriggers.forEach((button) => {
  button.addEventListener("click", () => {
    const container = button.closest(".travel-card-thumbs");
    const group = container ? Array.from(container.querySelectorAll(".thumb-lightbox-trigger")) : [button];
    const idx = group.indexOf(button);
    currentGroup = group;
    // Location cards (6 thumbs): always start at index 0; Events (3 thumbs): start at clicked index
    currentIndex = container && container.classList.contains("location-thumbs") ? 0 : (idx >= 0 ? idx : 0);
    showAtIndex(currentIndex);
  });
});

if (lightboxPrev) {
  lightboxPrev.addEventListener("click", (e) => {
    e.stopPropagation();
    if (lightboxPrev.disabled || !currentGroup.length) return;
    showAtIndex(Math.max(0, currentIndex - 1));
  });
}

if (lightboxNext) {
  lightboxNext.addEventListener("click", (e) => {
    e.stopPropagation();
    if (lightboxNext.disabled || !currentGroup.length) return;
    showAtIndex(Math.min(currentGroup.length - 1, currentIndex + 1));
  });
}

if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLightbox();
  if (lightbox && !lightbox.classList.contains("hidden") && currentGroup.length) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showAtIndex(Math.max(0, currentIndex - 1));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      showAtIndex(Math.min(currentGroup.length - 1, currentIndex + 1));
    }
  }
});
