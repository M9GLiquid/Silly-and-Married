document.addEventListener("click", (e) => {
  const link = e.target.closest("a[data-scroll-to]");
  if (!link) return;
  const targetId = link.getAttribute("data-scroll-to");
  const target = targetId ? document.getElementById(targetId) : null;
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
});

const scrollIndicator = document.getElementById("scroll-indicator");
if (scrollIndicator) {
  const hideThreshold = 80;
  const checkScroll = () => {
    if (window.scrollY > hideThreshold) {
      scrollIndicator.classList.add("is-hidden");
    } else {
      scrollIndicator.classList.remove("is-hidden");
    }
  };
  window.addEventListener("scroll", checkScroll, { passive: true });
  checkScroll();

  scrollIndicator.addEventListener("click", () => {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
  });
}

const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");
const menuOverlay = document.getElementById("menu-overlay");
const menuClose = document.getElementById("menu-close");
const desktopBreakpoint = 1200;

if (menuToggle && mainNav) {
  const isDesktop = () => window.innerWidth >= desktopBreakpoint;

  const openMenu = () => {
    menuToggle.setAttribute("aria-expanded", "true");
    mainNav.classList.add("is-open");
    mainNav.setAttribute("aria-hidden", "false");
    mainNav.inert = false;
    if (menuOverlay) {
      menuOverlay.hidden = false;
      menuOverlay.setAttribute("aria-hidden", "false");
    }
    document.body.style.overflow = "hidden";
  };

  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("is-open");
    mainNav.setAttribute("aria-hidden", "true");
    mainNav.inert = true;
    if (menuOverlay) {
      menuOverlay.hidden = true;
      menuOverlay.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "";
  };

  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    if (isExpanded) {
      closeMenu();
      return;
    }
    openMenu();
  });

  if (menuClose) {
    menuClose.addEventListener("click", closeMenu);
  }

  const navLinks = mainNav.querySelectorAll("a");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (!isDesktop()) {
        closeMenu();
      }
    });
  });

  if (menuOverlay) {
    menuOverlay.addEventListener("click", closeMenu);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !isDesktop()) {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (isDesktop()) {
      menuToggle.setAttribute("aria-expanded", "false");
      mainNav.classList.remove("is-open");
      mainNav.setAttribute("aria-hidden", "false");
      mainNav.inert = false;
      if (menuOverlay) {
        menuOverlay.hidden = true;
        menuOverlay.setAttribute("aria-hidden", "true");
      }
      document.body.style.overflow = "";
      return;
    }

    if (menuToggle.getAttribute("aria-expanded") === "true") {
      mainNav.classList.add("is-open");
      mainNav.setAttribute("aria-hidden", "false");
      mainNav.inert = false;
      if (menuOverlay) {
        menuOverlay.hidden = false;
        menuOverlay.setAttribute("aria-hidden", "false");
      }
      document.body.style.overflow = "hidden";
    } else {
      mainNav.classList.remove("is-open");
      mainNav.setAttribute("aria-hidden", "true");
      mainNav.inert = true;
      if (menuOverlay) {
        menuOverlay.hidden = true;
        menuOverlay.setAttribute("aria-hidden", "true");
      }
      document.body.style.overflow = "";
    }
  });

  if (isDesktop()) {
    mainNav.setAttribute("aria-hidden", "false");
    mainNav.inert = false;
    if (menuOverlay) {
      menuOverlay.hidden = true;
      menuOverlay.setAttribute("aria-hidden", "true");
    }
  } else {
    mainNav.setAttribute("aria-hidden", "true");
    mainNav.inert = true;
    if (menuOverlay) {
      menuOverlay.hidden = true;
      menuOverlay.setAttribute("aria-hidden", "true");
    }
  }
}

const travelCardToggles = document.querySelectorAll(".travel-card-toggle");
const travelCardsContainer = document.querySelector(".travel-cards-list");
travelCardToggles.forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".travel-card-collapsible");
    const body = card?.querySelector(".travel-card-body");
    const isExpanded = card?.getAttribute("data-expanded") === "true";
    if (!card || !body) return;
    if (isExpanded) {
      card.removeAttribute("data-expanded");
      body.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    } else {
      travelCardsContainer?.querySelectorAll(".travel-card-collapsible[data-expanded]").forEach((other) => {
        other.removeAttribute("data-expanded");
        const otherBody = other.querySelector(".travel-card-body");
        const otherBtn = other.querySelector(".travel-card-toggle");
        if (otherBody) otherBody.hidden = true;
        if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
      });
      card.setAttribute("data-expanded", "true");
      body.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

const copyAddressButtons = document.querySelectorAll(".copy-address-btn");
const copyFeedback = { success: "Copied", failure: "Failed", successAria: "Address copied", failureAria: "Copy failed" };

const fallbackCopyText = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "absolute";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);
  return copied;
};

if (copyAddressButtons.length) {
  copyAddressButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const targetId = button.getAttribute("data-copy-target");
      if (!targetId) {
        return;
      }

      const addressElement = document.getElementById(targetId);
      if (!addressElement) {
        return;
      }

      const addressText = addressElement.innerText.trim();
      let isCopied = false;

      try {
        await navigator.clipboard.writeText(addressText);
        isCopied = true;
      } catch (_error) {
        isCopied = fallbackCopyText(addressText);
      }

      const label = button.querySelector(".copy-label");
      if (!label) {
        return;
      }

      const originalLabel = label.textContent;
      const originalAriaLabel = button.getAttribute("aria-label");
      label.textContent = isCopied ? copyFeedback.success : copyFeedback.failure;
      button.setAttribute("aria-label", isCopied ? copyFeedback.successAria : copyFeedback.failureAria);

      window.setTimeout(() => {
        label.textContent = originalLabel;
        if (originalAriaLabel) {
          button.setAttribute("aria-label", originalAriaLabel);
        } else {
          button.removeAttribute("aria-label");
        }
      }, 1600);
    });
  });
}
