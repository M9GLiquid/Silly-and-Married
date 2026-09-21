const {
  GUEST_UPLOADS_FOLDER,
  METADATA_FOLDER,
  OneDriveError,
  OUR_UPLOADS_FOLDER,
  PICTURES_FOLDER,
  VIDEOS_FOLDER,
  encodeDrivePath,
  getAccessToken,
  getFileKind,
  getRootFolder,
  graphFetch,
  jsonResponse,
  sanitizeText
} = require("./onedrive-utils");

const MAX_ITEMS_PER_FOLDER = 2000;
const METADATA_CONCURRENCY = 10;

const toGraphPath = (nextLink) => {
  const url = new URL(nextLink);
  return `${url.pathname.replace(/^\/v1\.0/, "")}${url.search}`;
};

const listFolderItems = async (
  accessToken,
  rootFolder,
  pathSegments,
  expandThumbnails = false
) => {
  let graphPath = `/me/drive/root:/${encodeDrivePath([
    rootFolder,
    ...pathSegments
  ])}:/children?$top=200`;
  if (expandThumbnails) graphPath += "&$expand=thumbnails";
  const items = [];

  try {
    while (graphPath && items.length < MAX_ITEMS_PER_FOLDER) {
      const data = await graphFetch(accessToken, graphPath);
      items.push(...(Array.isArray(data?.value) ? data.value : []));
      graphPath = data?.["@odata.nextLink"] ? toGraphPath(data["@odata.nextLink"]) : "";
    }
  } catch (error) {
    if (error instanceof OneDriveError && error.status === 404) return [];
    throw error;
  }

  return items.slice(0, MAX_ITEMS_PER_FOLDER);
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

const getCaption = (kind) => kind === "picture" ? "Wedding photo" : "Wedding video";

const itemDate = (item, metadata) =>
  sanitizeText(
    metadata?.uploadedAt || item?.createdDateTime || item?.lastModifiedDateTime,
    80
  );

const newestFirst = (left, right) => {
  const leftDate = Date.parse(left.uploadedAt || 0);
  const rightDate = Date.parse(right.uploadedAt || 0);
  return (Number.isFinite(rightDate) ? rightDate : 0) -
    (Number.isFinite(leftDate) ? leftDate : 0);
};

const buildUploadedGallery = ({
  metadataEntries = [],
  guestPictureItems = [],
  guestVideoItems = [],
  ourPictureItems = [],
  ourVideoItems = []
}) => {
  const metadataByItemId = new Map();
  const metadataByName = new Map();
  metadataEntries.filter(Boolean).forEach((metadata) => {
    const driveItemId = sanitizeText(metadata.driveItemId, 240);
    const storedFileName = sanitizeText(metadata.storedFileName, 240).toLowerCase();
    if (driveItemId) metadataByItemId.set(driveItemId, metadata);
    if (storedFileName) metadataByName.set(storedFileName, metadata);
  });

  const photos = [];
  const videos = [];
  const seenIds = new Set();
  const sources = [
    { source: "guest", kind: "picture", items: guestPictureItems },
    { source: "guest", kind: "video", items: guestVideoItems },
    { source: "ours", kind: "picture", items: ourPictureItems },
    { source: "ours", kind: "video", items: ourVideoItems }
  ];

  sources.forEach(({ source, kind, items }) => {
    items.forEach((item) => {
      if (!item?.id || item.folder || seenIds.has(item.id)) return;
      if (getFileKind(item.file?.mimeType, item.name) !== kind) return;
      seenIds.add(item.id);

      const metadata =
        metadataByItemId.get(String(item.id)) ||
        metadataByName.get(String(item.name || "").toLowerCase()) ||
        null;
      const mediaId = encodeURIComponent(item.id);
      const media = {
        id: `onedrive:${item.id}`,
        type: kind === "picture" ? "photo" : "video",
        source,
        caption: getCaption(kind),
        src: `/api/onedrive-media?id=${mediaId}`,
        thumbnailSrc:
          item.thumbnails?.[0]?.large?.url ||
          item.thumbnails?.[0]?.medium?.url ||
          (kind === "picture" ? `/api/onedrive-media?id=${mediaId}` : ""),
        isFavorite: false,
        uploadedAt: itemDate(item, metadata)
      };

      if (kind === "picture") photos.push(media);
      else videos.push(media);
    });
  });

  photos.sort(newestFirst);
  videos.sort(newestFirst);
  return [{
    slug: "all-uploads",
    name: "All uploads",
    photos,
    videos,
    total: photos.length + videos.length
  }];
};

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const accessToken = await getAccessToken();
    const rootFolder = getRootFolder();
    const [
      guestPictureItems,
      guestVideoItems,
      ourPictureItems,
      ourVideoItems,
      metadataItems
    ] = await Promise.all([
      listFolderItems(accessToken, rootFolder, [GUEST_UPLOADS_FOLDER, PICTURES_FOLDER], true),
      listFolderItems(accessToken, rootFolder, [GUEST_UPLOADS_FOLDER, VIDEOS_FOLDER], true),
      listFolderItems(accessToken, rootFolder, [OUR_UPLOADS_FOLDER, PICTURES_FOLDER], true),
      listFolderItems(accessToken, rootFolder, [OUR_UPLOADS_FOLDER, VIDEOS_FOLDER], true),
      listFolderItems(accessToken, rootFolder, [METADATA_FOLDER], false)
    ]);
    const metadataEntries = await mapWithConcurrency(
      metadataItems,
      METADATA_CONCURRENCY,
      (item) => readMetadataItem(accessToken, item)
    );
    const categories = buildUploadedGallery({
      metadataEntries,
      guestPictureItems,
      guestVideoItems,
      ourPictureItems,
      ourVideoItems
    });
    const count = categories[0].total;

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

exports.buildUploadedGallery = buildUploadedGallery;

exports.handler = require('../lib/require-media-session.cjs').withMediaSession(exports.handler);
