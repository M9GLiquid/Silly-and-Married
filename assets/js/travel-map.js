document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("regional-map-canvas");
  if (!mapElement || typeof L === "undefined") return;
  const dataApi = window.travelEventData;
  const detailViewApi = window.travelEventDetailView;
  if (!dataApi || !detailViewApi) return;

  const detailModal = document.getElementById("map-detail-modal");
  const detailTitle = document.getElementById("map-detail-title");
  const detailTitleText = document.getElementById("map-detail-title-text");
  const detailIcon = document.getElementById("map-detail-icon");
  const detailType = document.getElementById("map-detail-type");
  const detailBody = document.getElementById("map-detail-body");
  const detailDirections = document.getElementById("map-detail-directions");
  const detailClose = document.getElementById("map-detail-close");
  const mapFocusList = document.getElementById("map-focus-list");
  let galleryData = {};
  const inferGoogleMapsUrl = (links) => {
    if (!Array.isArray(links)) return "";
    const match = links.find((link) => {
      const href = link && typeof link.href === "string" ? link.href : "";
      return /google\.[^/]+\/maps\//i.test(href);
    });
    return match && typeof match.href === "string" ? match.href : "";
  };

  const map = L.map("regional-map-canvas", {
    scrollWheelZoom: true,
    touchZoom: true,
    dragging: true,
    zoomControl: true
  }).setView([48.78, 17.78], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const baseLocations = [
    {
      title: "Vienna Airport (VIE)",
      type: "Airport",
      lat: 48.1179477,
      lng: 16.5662578,
      markerClass: "is-airport",
      icon: "flight_takeoff",
      description:
        "Main airport for international arrivals. Most guests continue from here to Trenčín by bus, train, or rental car.",
      links: [
        {
          label: "Vienna Airport transport overview",
          href: "https://www.viennaairport.com/en/passengers/arrival__parking"
        }
      ],
      mapsUrl: "https://www.google.com/maps/place/Vienna+International+Airport/@48.1193276,16.4513178,12.79z/data=!4m6!3m5!1s0x476c55ab471abe9b:0x247a52108dd29b4b!8m2!3d48.1179477!4d16.5662578!16zL20vMDE1MzFk?entry=ttu&g_ep=EgoyMDI2MDMxMS4wIKXMDSoASAFQAw%3D%3D"
    },
    {
      title: "Wedding Church (Zemianske Podhradie)",
      type: "Wedding Church",
      lat: 48.8391,
      lng: 17.8360,
      markerClass: "is-priority-church",
      icon: "church",
      description:
        "Ceremony location in Zemianske Podhradie.",
      links: [
        {
          label: "Open church location in Google Maps",
          href: "https://www.google.com/maps/search/?api=1&query=48.8391,17.8360"
        }
      ],
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=48.8391,17.8360"
    },
    {
      title: "Wedding Venue (zelenyden, Bosaca)",
      type: "Wedding Venue",
      lat: 48.8278,
      lng: 17.8391,
      markerClass: "is-priority-venue",
      icon: "celebration",
      description:
        "Reception and celebration venue in Bošáca.",
      links: [
        {
          label: "Open venue location in Google Maps",
          href: "https://www.google.com/maps/search/?api=1&query=48.8278,17.8391"
        }
      ],
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=48.8278,17.8391"
    }
  ];
  const locationById = new Map();
  const markerByLocationId = new Map();
  const markerByFocusKey = new Map([
    ["wedding-church", []],
    ["wedding-venue", []],
    ["airport", []]
  ]);
  const bounds = [];
  let legendContainerRef = null;

  const createPinIcon = (location) =>
    L.divIcon({
      className: "regional-map-pin-wrap",
      html: `
        <span class="regional-map-pin ${location.markerClass || "is-event"}" data-location-id="${location.id}">
          <span class="material-symbols-outlined regional-map-pin-glyph notranslate" aria-hidden="true" translate="no">${location.icon || "place"}</span>
        </span>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -28]
    });

  const closeMapDetail = () => {
    if (!detailModal) return;
    detailModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    if (detailBody) detailBody.innerHTML = "";
  };

  const openMapDetail = (location) => {
    if (!detailModal || !detailType || !detailBody || !detailDirections) return;
    if (detailTitleText) {
      detailTitleText.textContent = location.title;
    } else if (detailTitle) {
      detailTitle.textContent = location.title;
    }
    if (detailIcon) {
      detailIcon.textContent = location.icon || "event";
    }
    detailType.textContent = location.type;
    detailDirections.href = detailViewApi.buildDirectionsUrl(location);
    detailBody.innerHTML = "";
    const contentNode = detailViewApi.buildDetailContent(location, galleryData);
    detailBody.appendChild(contentNode);
    detailModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  };

  const assignLocationIds = (locations) => {
    locationById.clear();
    locations.forEach((location, index) => {
      const id = `map-location-${index + 1}`;
      location.id = id;
      locationById.set(id, location);
    });
  };

  const addMarkers = (locations) => {
    markerByLocationId.clear();
    locations.forEach((location) => {
      const zIndexOffsetByType = {
        "Wedding Church": 900,
        "Wedding Venue": 950,
        Airport: 850,
        Event: 100
      };
      const marker = L.marker([location.lat, location.lng], {
        icon: createPinIcon(location),
        zIndexOffset: zIndexOffsetByType[location.type] || 0
      }).addTo(map);
      marker.on("click", () => openMapDetail(location));
      markerByLocationId.set(location.id, marker);
      if (location.type === "Wedding Church") markerByFocusKey.get("wedding-church").push(marker);
      if (location.type === "Wedding Venue") markerByFocusKey.get("wedding-venue").push(marker);
      if (location.type === "Airport") markerByFocusKey.get("airport").push(marker);
      bounds.push([location.lat, location.lng]);
    });
  };

  const focusLocationById = (locationId) => {
    const location = locationById.get(locationId);
    const marker = markerByLocationId.get(locationId);
    if (!location || !marker) return;
    const zoomByType = {
      "Wedding Church": 12,
      "Wedding Venue": 12,
      Airport: 10
    };
    map.flyTo(marker.getLatLng(), zoomByType[location.type] || 11, { duration: 0.55 });
  };

  const getFocusPrimaryRank = (location) => {
    const byType = {
      Airport: 0,
      "Wedding Venue": 1,
      "Wedding Church": 2
    };
    return byType[location.type] ?? 10;
  };

  const distanceKm = (a, b) => {
    // Lightweight equirectangular approximation is enough for local ordering.
    const toRad = Math.PI / 180;
    const avgLat = ((a.lat + b.lat) * 0.5) * toRad;
    const x = (b.lng - a.lng) * Math.cos(avgLat);
    const y = b.lat - a.lat;
    return Math.sqrt(x * x + y * y) * 111.32;
  };

  const sortLocationsForFocusList = (locations) => {
    const priority = [...locations]
      .filter((location) => getFocusPrimaryRank(location) < 10)
      .sort((a, b) => getFocusPrimaryRank(a) - getFocusPrimaryRank(b));
    const remaining = locations.filter((location) => getFocusPrimaryRank(location) >= 10);

    const ordered = [...priority];
    let current = ordered.length ? ordered[ordered.length - 1] : null;

    while (remaining.length) {
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      remaining.forEach((candidate, index) => {
        const d = current ? distanceKm(current, candidate) : 0;
        if (d < bestDistance) {
          bestDistance = d;
          bestIndex = index;
        }
      });

      const [next] = remaining.splice(bestIndex, 1);
      ordered.push(next);
      current = next;
    }

    return ordered;
  };

  const renderFocusList = (locations) => {
    if (!mapFocusList) return;
    mapFocusList.innerHTML = "";
    const sortedLocations = sortLocationsForFocusList(locations);
    sortedLocations.forEach((location, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "regional-map-focus-item";
      button.setAttribute("role", "listitem");

      const icon = document.createElement("span");
      icon.className = "material-symbols-outlined regional-map-focus-item-icon notranslate";
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("translate", "no");
      icon.textContent = location.icon || "place";
      button.appendChild(icon);

      const label = document.createElement("span");
      label.className = "regional-map-focus-item-label";
      label.textContent = location.title;
      button.appendChild(label);

      button.addEventListener("click", () => focusLocationById(location.id));
      mapFocusList.appendChild(button);

      if (index < sortedLocations.length - 1) {
        const separator = document.createElement("span");
        separator.className = "regional-map-focus-sep";
        separator.setAttribute("aria-hidden", "true");
        separator.textContent = "•";
        mapFocusList.appendChild(separator);
      }
    });
  };

  const legend = L.control({ position: "bottomright" });
  legend.onAdd = () => {
    const container = L.DomUtil.create("div", "regional-map-legend");
    container.innerHTML = `
      <h3 class="regional-map-legend-title">Map key</h3>
      <ul class="regional-map-legend-list">
        <li><button type="button" class="regional-map-legend-focus" data-focus="wedding-church"><span class="swatch is-priority-church"></span><span>Wedding church</span><span class="material-symbols-outlined regional-map-legend-focus-icon notranslate" aria-hidden="true" translate="no">pin_drop</span></button></li>
        <li><button type="button" class="regional-map-legend-focus" data-focus="wedding-venue"><span class="swatch is-priority-venue"></span><span>Wedding venue</span><span class="material-symbols-outlined regional-map-legend-focus-icon notranslate" aria-hidden="true" translate="no">pin_drop</span></button></li>
        <li><button type="button" class="regional-map-legend-focus" data-focus="airport"><span class="swatch is-airport"></span><span>Airport</span><span class="material-symbols-outlined regional-map-legend-focus-icon notranslate" aria-hidden="true" translate="no">pin_drop</span></button></li>
        <li><span class="swatch is-event"></span>Event</li>
      </ul>
    `;
    L.DomEvent.disableClickPropagation(container);
    legendContainerRef = container;
    return container;
  };
  legend.addTo(map);

  const focusMarkers = (focusKey) => {
    const markers = markerByFocusKey.get(focusKey) || [];
    if (!markers.length) return;
    if (markers.length === 1) {
      map.flyTo(markers[0].getLatLng(), 11, { duration: 0.5 });
      return;
    }
    const markerBounds = L.latLngBounds(markers.map((m) => m.getLatLng()));
    map.fitBounds(markerBounds, { padding: [80, 80], maxZoom: 11 });
  };

  if (legendContainerRef) {
    legendContainerRef.querySelectorAll(".regional-map-legend-focus").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        const focusKey = btn.getAttribute("data-focus");
        if (!focusKey) return;
        focusMarkers(focusKey);
      });
    });
  }

  if (detailClose) {
    detailClose.addEventListener("click", closeMapDetail);
  }

  // Fallback: open details even if Leaflet marker click is swallowed.
  mapElement.addEventListener("click", (event) => {
    const pin = event.target.closest(".regional-map-pin[data-location-id]");
    if (!pin) return;
    const locationId = pin.getAttribute("data-location-id");
    const location = locationId ? locationById.get(locationId) : null;
    if (!location) return;
    event.preventDefault();
    event.stopPropagation();
    openMapDetail(location);
  });

  if (detailModal) {
    detailModal.addEventListener("click", (event) => {
      if (event.target === detailModal) closeMapDetail();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMapDetail();
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [36, 36] });
  }

  const loadEventLocations = async () => {
    let eventLocations = [];
    try {
      const loaded = await dataApi.loadTravelEventData();
      eventLocations = Array.isArray(loaded.eventLocations) ? loaded.eventLocations : [];
      galleryData = loaded.galleryData;
    } catch {
      assignLocationIds(baseLocations);
      addMarkers(baseLocations);
      renderFocusList(baseLocations);
      if (bounds.length) map.fitBounds(bounds, { padding: [36, 36] });
      return;
    }

    const allLocations = [...baseLocations, ...eventLocations];
    allLocations.forEach((location) => {
      if (!location.mapsUrl) location.mapsUrl = inferGoogleMapsUrl(location.links);
    });
    assignLocationIds(allLocations);
    addMarkers(allLocations);
    renderFocusList(allLocations);
    if (bounds.length) map.fitBounds(bounds, { padding: [36, 36] });
  };

  loadEventLocations();
});
