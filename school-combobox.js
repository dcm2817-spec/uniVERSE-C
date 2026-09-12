// uniVERSE — searchable school picker
// Filters the UNIVERSITIES dataset (universities.js) as the user types,
// matching against name, short form, and state. Falls back to "Other".

(function () {
  const wrap = document.getElementById("school-combobox");
  if (!wrap || typeof UNIVERSITIES === "undefined") return;

  const input = document.getElementById("school-search");
  const hidden = document.getElementById("school-value");
  const list = document.getElementById("school-listbox");

  const MAX_RESULTS = 8;
  let activeIndex = -1;

  function debounce(fn, delay) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function renderOptions(query) {
    activeIndex = -1;
    const q = query.trim().toLowerCase();
    let matches;

    if (!q) {
      matches = UNIVERSITIES.slice(0, MAX_RESULTS);
    } else {
      matches = UNIVERSITIES.filter(function (u) {
        return (
          u.name.toLowerCase().includes(q) ||
          u.short.toLowerCase().includes(q) ||
          u.state.toLowerCase().includes(q)
        );
      }).slice(0, MAX_RESULTS);
    }

    list.innerHTML = "";

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "combobox-empty";
      li.textContent = "No match — select \u201cOther\u201d below";
      list.appendChild(li);
    } else {
      matches.forEach(function (u) {
        const li = document.createElement("li");
        li.className = "combobox-option";
        li.setAttribute("role", "option");
        li.tabIndex = -1;
        li.dataset.id = u.id;
        li.dataset.name = u.name;
        li.innerHTML =
          '<span class="opt-name">' + u.name + "</span>" +
          '<span class="opt-meta">' + u.short + " \u00B7 " + u.state + "</span>";
        list.appendChild(li);
      });
    }

    const otherLi = document.createElement("li");
    otherLi.className = "combobox-option combobox-other";
    otherLi.setAttribute("role", "option");
    otherLi.tabIndex = -1;
    otherLi.dataset.id = "other";
    otherLi.dataset.name = "Other / not listed";
    otherLi.innerHTML = '<span class="opt-name">Other / not listed</span>';
    list.appendChild(otherLi);

    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function getOptionEls() {
    return Array.from(list.querySelectorAll(".combobox-option"));
  }

  function setActive(index) {
    const opts = getOptionEls();
    opts.forEach(function (el) { el.classList.remove("is-active"); });
    if (opts[index]) {
      opts[index].classList.add("is-active");
      opts[index].scrollIntoView({ block: "nearest" });
    }
    activeIndex = index;
  }

  function selectOption(li) {
    input.value = li.dataset.name;
    hidden.value = li.dataset.id;
    closeList();
  }

  function closeList() {
    list.hidden = true;
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
  }

  input.addEventListener("focus", function () {
    renderOptions(input.value);
  });

  input.addEventListener("input", debounce(function () {
    // Typing again invalidates any prior selection (including "Other").
    hidden.value = "";
    renderOptions(input.value);
  }, 120));

  list.addEventListener("click", function (e) {
    const li = e.target.closest(".combobox-option");
    if (li) selectOption(li);
  });

  document.addEventListener("click", function (e) {
    if (!wrap.contains(e.target)) closeList();
  });

  input.addEventListener("keydown", function (e) {
    const opts = getOptionEls();

    if (e.key === "Escape") {
      closeList();
      return;
    }

    if (list.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      renderOptions(input.value);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIndex + 1, opts.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && opts[activeIndex]) {
        e.preventDefault();
        selectOption(opts[activeIndex]);
      }
    }
  });
})();
