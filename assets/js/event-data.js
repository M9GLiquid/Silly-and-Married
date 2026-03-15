(function () {
  const toFiniteNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const loadJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load ${url}`);
    return response.json();
  };

  const inferGoogleMapsUrl = (links) => {
    if (!Array.isArray(links)) return "";
    const match = links.find((link) => {
      const href = link && typeof link.href === "string" ? link.href : "";
      return /google\.[^/]+\/maps\//i.test(href);
    });
    return match && typeof match.href === "string" ? match.href : "";
  };

  const mapItemToLocation = (item) => {
    const lat = toFiniteNumber(item && item.map ? item.map.lat : null);
    const lng = toFiniteNumber(item && item.map ? item.map.lng : null);
    if (lat === null || lng === null) return null;

    return {
      title: item.title || "",
      type: "Event",
      description: item.description || "",
      links: Array.isArray(item.links) ? item.links : [],
      galleryKey: item.galleryKey || "",
      mapsUrl: item.mapsUrl || inferGoogleMapsUrl(item.links),
      lat,
      lng,
      markerClass: "is-event",
      icon: item.icon || "event"
    };
  };

  const loadTravelEventData = async () => {
    const [eventsData, galleryData] = await Promise.all([
      loadJson("assets/data/events.json"),
      loadJson("images/gallery.json")
    ]);

    const items = Array.isArray(eventsData.items) ? eventsData.items : [];
    const eventLocations = items.map(mapItemToLocation).filter(Boolean);

    return {
      eventsData,
      galleryData: galleryData || {},
      eventLocations
    };
  };

  window.travelEventData = {
    loadTravelEventData
  };
})();
