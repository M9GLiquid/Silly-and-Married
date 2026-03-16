/**
 * Shared helpers for gallery image resolution (used by gallery.js and event-detail-view.js).
 */
(function () {
  const resolvePhotoSrc = (photo, base) => {
    if (typeof photo === "string") return base + photo;
    if (photo && photo.src) return photo.src;
    if (photo && photo.name) return base + photo.name;
    return "";
  };

  const resolveThumbnailSrc = (photo, base) => {
    const src = resolvePhotoSrc(photo, base);
    if (!src || src.startsWith("http://") || src.startsWith("https://")) return src;
    if (src.startsWith("images/")) return src.replace(/\.(jpg|jpeg|png|webp)$/i, ".webp").replace(/^images\//, "images-thumbs/");
    return src;
  };

  window.galleryUtils = { resolvePhotoSrc, resolveThumbnailSrc };
})();
