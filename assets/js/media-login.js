(() => {
  const form = document.querySelector("form[action='/media-access']");
  const passwordInput = document.getElementById("password");
  const submitButton = form?.querySelector("button[type='submit']");
  if (!form || !passwordInput || !submitButton || typeof window.fetch !== "function") return;

  const showMessage = (message) => {
    let messageElement = document.getElementById("password-message");
    if (!messageElement) {
      messageElement = document.createElement("p");
      messageElement.id = "password-message";
      messageElement.className = "message";
      messageElement.setAttribute("role", "alert");
      form.before(messageElement);
      passwordInput.setAttribute("aria-describedby", "password-message");
    }
    messageElement.textContent = message;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");

    try {
      const response = await window.fetch(form.action, {
        method: "POST",
        body: new URLSearchParams(new FormData(form)),
        credentials: "same-origin",
        redirect: "manual"
      });

      if (response.type === "opaqueredirect" || response.status === 303) {
        window.location.assign("/media.html#media");
        return;
      }

      if (response.status === 401) {
        showMessage("That password doesn't look right. Please try the one we sent you.");
      } else if (response.status === 429) {
        showMessage("Too many attempts. Please wait a moment and try again.");
      } else {
        showMessage("Wedding memories are temporarily unavailable. Please try again later.");
      }
      passwordInput.focus();
      passwordInput.select();
    } catch (_error) {
      showMessage("The connection was interrupted. Please check your internet and try again.");
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute("aria-busy");
    }
  });
})();
