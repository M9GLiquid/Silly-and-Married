/**
 * Auto-translation via Google Translate widget.
 * Persists language in cookie + localStorage. No manual dictionaries.
 */
(function () {
  const storageKey = "wedding_lang";
  const defaultLanguage = "en";
  const cookieName = "googtrans";
  const cookiePath = "/";

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "sk", label: "Slovenčina" },
    { value: "sv", label: "Svenska" },
  ];
  const supportedLanguages = languageOptions.map((option) => option.value);

  const protectIconGlyphs = () => {
    const iconElements = document.querySelectorAll(".material-symbols-outlined");
    iconElements.forEach((element) => {
      element.classList.add("notranslate");
      element.setAttribute("translate", "no");
    });
  };

  const watchForNewIcons = () => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver((mutations) => {
      let needsRefresh = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains("material-symbols-outlined")) {
            needsRefresh = true;
            return;
          }
          if (node.querySelector(".material-symbols-outlined")) needsRefresh = true;
        });
      });
      if (needsRefresh) protectIconGlyphs();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : "";
  };

  const setCookie = (name, value, path) => {
    const maxAge = value ? "max-age=31536000" : "max-age=0";
    document.cookie = `${name}=${value}; path=${path}; ${maxAge}; SameSite=Lax`;
  };

  const getStoredLanguage = () => {
    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;
    const cookie = getCookie(cookieName);
    if (cookie) {
      const parts = cookie.split("/").filter(Boolean);
      if (parts.length >= 2) return parts[1];
    }
    return null;
  };

  const getEffectiveLanguage = () => {
    const stored = getStoredLanguage();
    if (stored && supportedLanguages.includes(stored)) return stored;
    const browserLang = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
    return supportedLanguages.includes(browserLang) ? browserLang : defaultLanguage;
  };

  const applyLanguage = (lang) => {
    const targetLanguage = supportedLanguages.includes(lang) ? lang : defaultLanguage;
    if (targetLanguage === defaultLanguage) {
      setCookie(cookieName, "", cookiePath);
    } else {
      setCookie(cookieName, `/${defaultLanguage}/${targetLanguage}`, cookiePath);
    }
    localStorage.setItem(storageKey, targetLanguage);
    location.reload();
  };

  window.googleTranslateElementInit = function () {
    try {
      const container = document.getElementById("google_translate_element");
      if (!container || typeof google === "undefined" || !google.translate) return;
      new google.translate.TranslateElement(
        {
          pageLanguage: defaultLanguage,
          includedLanguages: supportedLanguages.join(","),
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    } catch (err) {
      console.warn("Google Translate widget init failed:", err);
    }
  };

  const ensureCookieForWidget = () => {
    const effective = getEffectiveLanguage();
    if (effective === defaultLanguage) {
      setCookie(cookieName, "", cookiePath);
      return;
    }
    const cookie = getCookie(cookieName);
    if (cookie) return;
    setCookie(cookieName, `/${defaultLanguage}/${effective}`, cookiePath);
  };

  const init = () => {
    protectIconGlyphs();
    watchForNewIcons();
    const flagButtons = Array.from(document.querySelectorAll(".lang-flag-btn"));
    if (!flagButtons.length) return;

    ensureCookieForWidget();

    const activeLanguage = getEffectiveLanguage();

    flagButtons.forEach((button) => {
      const buttonLanguage = button.getAttribute("data-lang");
      const isActive = buttonLanguage === activeLanguage;
      button.classList.toggle("is-active", isActive);
      button.disabled = isActive;
      button.classList.add("notranslate");
      button.setAttribute("translate", "no");
      button.addEventListener("click", () => {
        if (!buttonLanguage) return;
        applyLanguage(buttonLanguage);
      });
    });
  };

  window.weddingAutoTranslate = {
    getLanguage: () => getStoredLanguage() || getEffectiveLanguage(),
    setLanguage: applyLanguage,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  const script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  script.onerror = () => console.warn("Google Translate script failed to load.");
  document.head.appendChild(script);
})();
