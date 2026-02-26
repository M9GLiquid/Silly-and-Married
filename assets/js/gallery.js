const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCaption = document.getElementById("lightbox-caption");
const lightboxClose = document.getElementById("lightbox-close");
const galleryItems = document.querySelectorAll(".gallery-item");

const closeLightbox = () => {
  if (!lightbox || !lightboxImage) {
    return;
  }
  lightbox.classList.add("hidden");
  lightboxImage.src = "";
  lightboxImage.alt = "";
};

galleryItems.forEach((button) => {
  button.addEventListener("click", () => {
    const fullSrc = button.getAttribute("data-fullsrc");
    const caption = button.getAttribute("data-caption") || "";
    const thumbImage = button.querySelector("img");

    if (!lightbox || !lightboxImage || !fullSrc) {
      return;
    }

    lightboxImage.src = fullSrc;
    lightboxImage.alt = thumbImage ? thumbImage.alt : caption;
    if (lightboxCaption) {
      lightboxCaption.textContent = caption;
    }
    lightbox.classList.remove("hidden");
  });
});

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
  }
});
