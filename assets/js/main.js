const menuToggle = document.getElementById("menu-toggle");
const mainNav = document.getElementById("main-nav");
const menuOverlay = document.getElementById("menu-overlay");
const menuClose = document.getElementById("menu-close");
const desktopBreakpoint = 1024;

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

const copyAddressButtons = document.querySelectorAll(".copy-address-btn");

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
      label.textContent = isCopied ? "Copied" : "Failed";
      button.setAttribute("aria-label", isCopied ? "Address copied" : "Copy failed");

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
