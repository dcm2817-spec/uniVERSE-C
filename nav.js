// uniVERSE — hamburger nav toggle
// Shown only below the 640px breakpoint (see style.css); the nav row
// renders normally above that with no JS involvement at all.

(function () {
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("header-actions");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", function () {
    var isOpen = nav.classList.toggle("is-open");
    toggle.classList.toggle("is-active", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", function (e) {
    if (
      nav.classList.contains("is-open") &&
      !nav.contains(e.target) &&
      e.target !== toggle &&
      !toggle.contains(e.target)
    ) {
      nav.classList.remove("is-open");
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
})();
