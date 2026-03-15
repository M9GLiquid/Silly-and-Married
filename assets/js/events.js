document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("events-cards-container");
  const note = document.getElementById("events-last-verified");
  if (!container) return;

  let data;
  try {
    const response = await fetch("assets/data/events.json");
    data = await response.json();
  } catch {
    return;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  container.innerHTML = "";

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "travel-card";

    const heading = document.createElement("h2");
    heading.className = "travel-heading";
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined notranslate";
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("translate", "no");
    icon.textContent = item.icon || "event";
    heading.appendChild(icon);
    heading.appendChild(document.createTextNode(item.title || ""));
    article.appendChild(heading);

    const description = document.createElement("p");
    description.textContent = item.description || "";
    article.appendChild(description);

    const bottom = document.createElement("div");
    bottom.className = "travel-card-bottom";

    const links = document.createElement("ul");
    links.className = "travel-links";
    (item.links || []).forEach((link) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = link.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = link.label;
      li.appendChild(a);
      links.appendChild(li);
    });
    bottom.appendChild(links);

    const thumbs = document.createElement("div");
    thumbs.className = "travel-card-thumbs";
    thumbs.setAttribute("data-gallery", `events-${item.galleryKey || ""}`);
    bottom.appendChild(thumbs);

    article.appendChild(bottom);
    container.appendChild(article);
  });

  if (note && data.lastVerified) {
    note.textContent = data.lastVerified;
  }

  document.dispatchEvent(new CustomEvent("events:rendered"));
});
