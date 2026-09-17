// uniVERSE — forgot password
// Facebook-style flow: one form, then a confirmation message in place of it.
// No real email/SMS is sent yet — this is the UI ready for the backend.

(function () {
  const form = document.getElementById("reset-form");
  if (!form) return;

  const identifier = document.getElementById("identifier");
  const requestCard = document.getElementById("request-card");
  const confirmCard = document.getElementById("confirm-card");
  const confirmText = document.getElementById("confirm-text");

  function setError(input, errorEl, message) {
    if (message) {
      input.classList.add("is-invalid");
      errorEl.textContent = message;
    } else {
      input.classList.remove("is-invalid");
      errorEl.textContent = "";
    }
  }

  function validateIdentifier() {
    const el = document.getElementById("identifier-error");
    const val = identifier.value.trim();
    if (!val) {
      setError(identifier, el, "Enter your email or phone number");
      return false;
    }
    setError(identifier, el, "");
    return true;
  }

  identifier.addEventListener("blur", validateIdentifier);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!validateIdentifier()) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const value = identifier.value.trim();
    const isEmail = value.includes("@");

    let targetEmail = value;

    if (!isEmail) {
      // They typed a phone number — resolve it to the real email on file.
      const { data: resolvedEmail } = await supabaseClient.rpc(
        "get_email_by_phone",
        { p_phone: value }
      );
      targetEmail = resolvedEmail;
    }

    // Always show the same confirmation message whether or not a match
    // was found — this avoids revealing which phone numbers/emails are
    // registered to someone probing the form.
    if (targetEmail) {
      await supabaseClient.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin + "/reset-password",
      });
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Recover password";

    confirmText.textContent =
      "If an account matches \u201c" + value + "\u201d, a password reset link is on its way.";

    requestCard.hidden = true;
    confirmCard.hidden = false;
  });
})();
