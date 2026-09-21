(() => {
  const COPY = {
    en: { title: "Something went wrong", close: "Close" },
    sk: { title: "Niečo sa nepodarilo", close: "Zavrieť" },
    sv: { title: "Något gick fel", close: "Stäng" }
  };
  let popup = null;
  let lastFocused = null;

  const getCopy = () => {
    const language = window.weddingAutoTranslate?.getLanguage?.() || document.documentElement.lang || "en";
    return COPY[language.toLowerCase().split("-")[0]] || COPY.en;
  };

  const close = () => {
    if (!popup || popup.backdrop.hidden) return;
    popup.backdrop.hidden = true;
    document.body.classList.remove("guest-error-popup-open");
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
    lastFocused = null;
  };

  const ensurePopup = () => {
    if (popup) return popup;
    const style = document.createElement("style");
    style.textContent = `
      body.guest-error-popup-open{overflow:hidden}
      .guest-error-popup-backdrop[hidden]{display:none}
      .guest-error-popup-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:20px;background:rgba(43,31,38,.58);backdrop-filter:blur(4px)}
      .guest-error-popup{width:min(100%,440px);position:relative;padding:34px 28px 26px;border:1px solid rgba(129,61,110,.28);border-radius:18px;background:#fffaf6;color:#2b2b2b;box-shadow:0 24px 70px rgba(43,31,38,.32);text-align:center}
      .guest-error-popup-icon{width:54px;height:54px;margin:0 auto 15px;display:grid;place-items:center;border-radius:50%;background:#f8dce5;color:#813d6e;font:700 30px/1 system-ui,sans-serif}
      .guest-error-popup-title{margin:0;color:#553044;font:400 28px/1.2 Georgia,serif}
      .guest-error-popup-message{margin:14px 0 24px;color:#51484d;font:16px/1.55 system-ui,sans-serif;overflow-wrap:anywhere;white-space:pre-wrap}
      .guest-error-popup-close{min-width:150px;min-height:46px;padding:11px 24px;border:1px solid #813d6e;border-radius:999px;background:#813d6e;color:#fff;font:700 15px/1 system-ui,sans-serif;cursor:pointer}
      .guest-error-popup-close:hover{background:#6c315c}.guest-error-popup-close:focus-visible{outline:3px solid #d7adcd;outline-offset:3px}
      @media(max-width:480px){.guest-error-popup-backdrop{padding:14px}.guest-error-popup{padding:30px 20px 22px;border-radius:15px}.guest-error-popup-title{font-size:24px}}
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement("div");
    backdrop.className = "guest-error-popup-backdrop";
    backdrop.hidden = true;

    const dialog = document.createElement("section");
    dialog.className = "guest-error-popup";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "guest-error-popup-title");
    dialog.setAttribute("aria-describedby", "guest-error-popup-message");

    const icon = document.createElement("div");
    icon.className = "guest-error-popup-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "!";

    const title = document.createElement("h2");
    title.id = "guest-error-popup-title";
    title.className = "guest-error-popup-title";

    const message = document.createElement("p");
    message.id = "guest-error-popup-message";
    message.className = "guest-error-popup-message";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "guest-error-popup-close";
    closeButton.addEventListener("click", close);

    dialog.append(icon, title, message, closeButton);
    backdrop.appendChild(dialog);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) close();
    });
    document.body.appendChild(backdrop);
    popup = { backdrop, dialog, title, message, closeButton };
    return popup;
  };

  const show = (message, options = {}) => {
    const normalizedMessage = String(message || "").replace(/\s+/g, " ").trim();
    if (!normalizedMessage) return;
    const copy = getCopy();
    const current = ensurePopup();
    if (current.backdrop.hidden) lastFocused = document.activeElement;
    current.title.textContent = options.title || copy.title;
    current.message.textContent = normalizedMessage;
    current.closeButton.textContent = options.closeLabel || copy.close;
    current.backdrop.hidden = false;
    document.body.classList.add("guest-error-popup-open");
    window.requestAnimationFrame(() => current.closeButton.focus());
  };

  document.addEventListener("keydown", (event) => {
    if (!popup || popup.backdrop.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      popup.closeButton.focus();
    }
  });

  window.weddingGuestError = { show, close };

  const showServerError = () => {
    const serverError = document.querySelector("[data-guest-error]");
    if (serverError?.textContent) show(serverError.textContent);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showServerError, { once: true });
  } else {
    showServerError();
  }
})();
