(function () {
  const toFiniteNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const normalizeCoordinate = (value) => {
    const num = toFiniteNumber(value);
    return num === null ? null : num.toFixed(6);
  };

  const isGoogleMapsUrl = (value) =>
    typeof value === "string" && /^https:\/\/www\.google\.com\/maps\//.test(value);

  const buildDirectionsUrl = (locationOrLat, maybeLng) => {
    if (locationOrLat && typeof locationOrLat === "object") {
      if (isGoogleMapsUrl(locationOrLat.mapsUrl)) return locationOrLat.mapsUrl;
      const latValue = normalizeCoordinate(locationOrLat.lat);
      const lngValue = normalizeCoordinate(locationOrLat.lng);
      if (!latValue || !lngValue) return "#";
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latValue},${lngValue}`)}`;
    }
    const lat = locationOrLat;
    const lng = maybeLng;
    const latValue = normalizeCoordinate(lat);
    const lngValue = normalizeCoordinate(lng);
    if (!latValue || !lngValue) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latValue},${lngValue}`)}`;
  };

  const buildLinksList = (links) => {
    if (!links || !links.length) return null;
    const list = document.createElement("ul");
    list.className = "travel-links";
    links.forEach((link) => {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label;
      item.appendChild(anchor);
      list.appendChild(item);
    });
    return list;
  };

  const resolvePhotoSrc = (photo, base) => {
    if (typeof photo === "string") return `${base}${photo}`;
    if (photo && photo.src) return photo.src;
    if (photo && photo.name) return `${base}${photo.name}`;
    return "";
  };

  const buildEventThumbs = (galleryData, galleryKey) => {
    if (!galleryData || !galleryKey) return null;
    const gallery = galleryData.events && galleryData.events[galleryKey] ? galleryData.events[galleryKey] : null;
    if (!gallery || !Array.isArray(gallery.photos) || !gallery.photos.length) return null;

    const thumbs = document.createElement("div");
    thumbs.className = "travel-card-thumbs";
    thumbs.setAttribute("data-gallery", `events-${galleryKey}`);
    const base = gallery.src || "";

    gallery.photos.forEach((photo) => {
      const src = resolvePhotoSrc(photo, base);
      if (!src) return;
      const caption = typeof photo === "string" ? "" : (photo.caption || "");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "thumb-lightbox-trigger";
      button.setAttribute("data-fullsrc", src);
      button.setAttribute("data-caption", caption);
      const image = document.createElement("img");
      image.className = "travel-card-thumb";
      image.src = src;
      image.alt = caption;
      image.loading = "lazy";
      button.appendChild(image);
      thumbs.appendChild(button);
    });

    return thumbs;
  };

  const buildStaticDetailContent = (location) => {
    const wrapper = document.createElement("div");
    wrapper.className = "map-detail-content";
    if (location.description) {
      const paragraph = document.createElement("p");
      paragraph.textContent = location.description;
      wrapper.appendChild(paragraph);
    }
    const linksList = buildLinksList(location.links);
    if (linksList) wrapper.appendChild(linksList);
    return wrapper;
  };

  const buildEventDetailContent = (location, galleryData) => {
    const wrapper = document.createElement("div");
    wrapper.className = "map-detail-content events-cards-grid";
    if (location.description) {
      const descriptionNode = document.createElement("p");
      descriptionNode.textContent = location.description;
      wrapper.appendChild(descriptionNode);
    }
    const linksList = buildLinksList(location.links);
    const thumbs = buildEventThumbs(galleryData, location.galleryKey);
    if (linksList || thumbs) {
      const bottom = document.createElement("div");
      bottom.className = "travel-card-bottom";
      if (linksList) bottom.appendChild(linksList);
      if (thumbs) bottom.appendChild(thumbs);
      wrapper.appendChild(bottom);
    }

    return wrapper;
  };

  const buildDetailContent = (location, galleryData) => {
    if (location.type === "Event") return buildEventDetailContent(location, galleryData);
    return buildStaticDetailContent(location);
  };

  window.travelEventDetailView = {
    buildDirectionsUrl,
    buildDetailContent
  };
})();
