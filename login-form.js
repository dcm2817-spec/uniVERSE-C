// uniVERSE — login form validation
// Email is the account's real identifier now (needed for password
// reset to work), so login signs in directly with it — no phone
// lookup needed here anymore.

(function () {
  const form = document.getElementById("login-form");
  if (!form) return;

  const email = document.getElementById("email");
  const password = document.getElementById("password");

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(input, errorEl, message) {
    if (message) {
      input.classList.add("is-invalid");
      errorEl.textContent = message;
    } else {
      input.classList.remove("is-invalid");
      errorEl.textContent = "";
    }
  }

  function validateEmail() {
    const el = document.getElementById("email-error");
    const val = email.value.trim();
    if (!val) return (setError(email, el, "Enter your email"), false);
    if (!EMAIL_RE.test(val)) {
      setError(email, el, "That email doesn't look right");
      return false;
    }
    setError(email, el, "");
    return true;
  }

  function validatePassword() {
    const el = document.getElementById("password-error");
    if (!password.value) return (setError(password, el, "Enter your password"), false);
    setError(password, el, "");
    return true;
  }

  email.addEventListener("blur", validateEmail);
  password.addEventListener("blur", validatePassword);

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const checks = [validateEmail(), validatePassword()];

    if (!checks.every(Boolean)) {
      const firstInvalid = form.querySelector(".is-invalid");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email.value.trim(),
      password: password.value,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";

    if (error) {
      const el = document.getElementById("password-error");
      setError(password, el, "Email or password is incorrect");
      return;
    }

    window.location.href = "/app";
  });
})();
