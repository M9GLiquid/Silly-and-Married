const {
  encodeDrivePath,
  getAccessToken,
  getRootFolder,
  graphFetch,
  jsonResponse,
  sanitizeText
} = require("./onedrive-utils");

const MAX_ITEMS = 800;
const METADATA_CONCURRENCY = 10;
const CATEGORY_CONFIG = [
  { slug: "church", name: "Church" },
  { slug: "venue", name: "Venue" },
  { slug: "dancing", name: "Dancing" },
  { slug: "guests", name: "Guests & Group Photos" },
  { slug: "ceremony", name: "Ceremony Moments" },
  { slug: "reception", name: "Reception Moments" },
  { slug: "others", name: "Others" }
];

const toGraphPath = (nextLink) => {
  const url = new URL(nextLink);
  return `${url.pathname.replace(/^\/v1\.0/, "")}${url.search}`;
};

const listFolderItems = async (accessToken, rootFolder, folder, expandThumbnails = false) => {
  let graphPath = `/me/drive/root:/${encodeDrivePath([rootFolder, folder])}:/children?$top=200`;
  if (expandThumbnails) graphPath += "&$expand=thumbnails";
  const items = [];

  while (graphPath && items.length < MAX_ITEMS) {
    const data = await graphFetch(accessToken, graphPath);
    items.push(...(Array.isArray(data?.value) ? data.value : []));
    graphPath = data?.["@odata.nextLink"] ? toGraphPath(data["@odata.nextLink"]) : "";
  }

  return items.slice(0, MAX_ITEMS);
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

const readMetadataItem = async (accessToken, item) => {
  try {
    const downloadUrl = item?.["@microsoft.graph.downloadUrl"];
    if (downloadUrl) {
      const response = await fetch(downloadUrl, { headers: { accept: "application/json" } });
      if (!response.ok) return null;
      return await response.json();
    }
    return await graphFetch(accessToken, `/me/drive/items/${encodeURIComponent(item.id)}/content`);
  } catch (_error) {
    return null;
  }
};

const getCaption = (metadata, kind) => {
  const photographer = sanitizeText(metadata?.photographer, 120);
  const fallback = kind === "picture" ? "Wedding photo" : "Wedding video";
  return photographer ? `${fallback} by ${photographer}` : fallback;
};

const buildUploadedCategories = ({ metadataEntries, pictureItems, videoItems }) => {
  const categoryMap = new Map(
    CATEGORY_CONFIG.map((category) => [category.slug, { ...category, photos: [], videos: [], total: 0 }])
  );
  const itemById = new Map();
  const itemByName = new Map();

  pictureItems.forEach((item) => {
    const record = { item, kind: "picture" };
    itemById.set(item.id, record);
    itemByName.set(String(item.name || "").toLowerCase(), record);
  });
  videoItems.forEach((item) => {
    const record = { item, kind: "video" };
    itemById.set(item.id, record);
    itemByName.set(String(item.name || "").toLowerCase(), record);
  });

  metadataEntries
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.uploadedAt || 0) - Date.parse(left.uploadedAt || 0))
    .forEach((metadata) => {
      const category = categoryMap.get(sanitizeText(metadata.categorySlug, 120).toLowerCase());
      if (!category) return;
      const record =
        itemById.get(sanitizeText(metadata.driveItemId, 240)) ||
        itemByName.get(sanitizeText(metadata.storedFileName, 240).toLowerCase());
      if (!record?.item?.id) return;

      const mediaId = encodeURIComponent(record.item.id);
      const media = {
        id: `onedrive:${record.item.id}`,
        type: record.kind === "picture" ? "photo" : "video",
        caption: getCaption(metadata, record.kind),
        src: `/api/onedrive-media?id=${mediaId}`,
        thumbnailSrc:
          record.kind === "picture"
            ? record.item.thumbnails?.[0]?.large?.url || `/api/onedrive-media?id=${mediaId}`
            : "",
        isFavorite: false,
        uploadedAt: sanitizeText(metadata.uploadedAt, 80)
      };

      if (record.kind === "picture") category.photos.push(media);
      else category.videos.push(media);
      category.total += 1;
    });

  return CATEGORY_CONFIG.map((config) => categoryMap.get(config.slug));
};

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const accessToken = await getAccessToken();
    const rootFolder = getRootFolder();
    const [pictureItems, videoItems, metadataItems] = await Promise.all([
      listFolderItems(accessToken, rootFolder, "Pictures", true),
      listFolderItems(accessToken, rootFolder, "Videos", false),
      listFolderItems(accessToken, rootFolder, "Metadata", false)
    ]);
    const metadataEntries = await mapWithConcurrency(metadataItems, METADATA_CONCURRENCY, (item) =>
      readMetadataItem(accessToken, item)
    );
    const categories = buildUploadedCategories({ metadataEntries, pictureItems, videoItems });
    const count = categories.reduce((sum, category) => sum + category.total, 0);

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
      },
      body: JSON.stringify({ source: "onedrive-uploads", count, categories })
    };
  } catch (error) {
    return jsonResponse(500, {
      error: "Could not load uploaded wedding media.",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

exports.buildUploadedCategories = buildUploadedCategories;
