// uniVERSE — blog listing page
// Renders category filter chips and the post card grid from
// BLOG_POSTS (blog-posts.js). No backend — pure static data.

(function () {
  const grid = document.getElementById("blog-grid");
  const filtersEl = document.getElementById("blog-filters");

  const CATEGORIES = [
    "All",
    "Academic Power",
    "Student Intelligence",
    "Systems & Execution",
    "Opportunities & Exposure",
    "Faith & Alignment",
    "Campus Connection",
    "Transformation Stories",
  ];

  let activeCategory = "All";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function renderFilters() {
    filtersEl.innerHTML = "";
    CATEGORIES.forEach(function (cat) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "blog-chip" + (cat === activeCategory ? " is-active" : "");
      chip.textContent = cat;
      chip.addEventListener("click", function () {
        activeCategory = cat;
        renderFilters();
        renderGrid();
      });
      filtersEl.appendChild(chip);
    });
  }

  function renderGrid() {
    const posts = typeof BLOG_POSTS !== "undefined" ? BLOG_POSTS : [];
    const filtered = activeCategory === "All"
      ? posts
      : posts.filter(function (p) { return p.category === activeCategory; });

    // Newest first.
    const sorted = filtered.slice().sort(function (a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    grid.innerHTML = "";

    if (sorted.length === 0) {
      grid.innerHTML = '<p class="empty-state">No posts in this category yet.</p>';
      return;
    }

    sorted.forEach(function (post) {
      const card = document.createElement("a");
      card.className = "note blog-card";
      card.href = "/blog-post?slug=" + encodeURIComponent(post.slug);
      card.innerHTML =
        '<span class="tag">' + escapeHtml(post.category) + '</span>' +
        '<h3>' + escapeHtml(post.title) + '</h3>' +
        '<p>' + escapeHtml(post.excerpt) + '</p>' +
        '<span class="blog-card-date">' + formatDate(post.date) + '</span>';
      grid.appendChild(card);
    });
  }

  renderFilters();
  renderGrid();
})();
