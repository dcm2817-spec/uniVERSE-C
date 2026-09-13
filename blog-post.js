// uniVERSE — single blog post page
// Reads the "slug" query param, finds the matching post in
// BLOG_POSTS, and renders it. Shows a not-found state otherwise.

(function () {
  const wrap = document.getElementById("post-wrap");

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const posts = typeof BLOG_POSTS !== "undefined" ? BLOG_POSTS : [];
  const post = posts.find(function (p) { return p.slug === slug; });

  if (!post) {
    wrap.innerHTML =
      '<a href="blog.html" class="back-link-static">\u2190 Back to blog</a>' +
      '<h1 class="post-title">Post not found</h1>' +
      '<p class="post-meta">That post doesn\u2019t exist or may have been moved.</p>';
    document.title = "Post not found — uniVERSE Blog";
    return;
  }

  document.title = post.title + " — uniVERSE Blog";

  const paragraphsHtml = post.content
    .map(function (para) { return "<p>" + escapeHtml(para) + "</p>"; })
    .join("");

  wrap.innerHTML =
    '<a href="blog.html" class="back-link-static">\u2190 Back to blog</a>' +
    '<span class="tag post-category-tag">' + escapeHtml(post.category) + '</span>' +
    '<h1 class="post-title">' + escapeHtml(post.title) + '</h1>' +
    '<p class="post-meta">' + formatDate(post.date) + '</p>' +
    '<div class="post-body">' + paragraphsHtml + '</div>' +
    '<a href="register.html" class="btn btn-primary btn-hero post-cta">Join uniVERSE</a>';
})();
