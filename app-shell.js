// uniVERSE — app shell
// Swaps content inside #app-view based on the bottom nav, no page reload.

(function () {
  const view = document.getElementById("app-view");
  const navItems = document.querySelectorAll(".nav-item");

  // ---------- Shared helpers ----------

  function showToast(message) {
    let toast = document.getElementById("app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast";
      toast.className = "app-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2500);
  }

  function debounce(fn, delay) {
    let timer;
    return function () {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
  }

  function skeletonHTML(count) {
    let html = '<div class="skeleton-group">';
    for (let i = 0; i < (count || 3); i++) {
      html += '<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-90"></div><div class="skeleton-line w-40"></div></div>';
    }
    return html + '</div>';
  }

  // Shared "Report" flow — used for posts, group posts, and people.
  // Opens a tiny inline reason picker anchored under the trigger button;
  // submitting inserts a row into `reports` and shows a toast. No admin
  // UI reads this back — reviewing reports happens directly in the
  // Supabase dashboard table editor.
  function openReportPopover(triggerBtn, targetType, targetId) {
    const existing = document.querySelector(".report-popover");
    if (existing) existing.remove();

    const popover = document.createElement("div");
    popover.className = "report-popover";
    popover.innerHTML =
      '<p class="report-popover-title">Report this ' + (targetType === "profile" ? "person" : "post") + '</p>' +
      '<select class="report-reason">' +
        '<option value="Spam">Spam</option>' +
        '<option value="Harassment">Harassment or bullying</option>' +
        '<option value="Inappropriate content">Inappropriate content</option>' +
        '<option value="Other">Other</option>' +
      '</select>' +
      '<textarea class="report-details" placeholder="Add detail (optional)"></textarea>' +
      '<div class="upload-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm report-cancel">Cancel</button>' +
        '<button type="button" class="btn btn-primary btn-sm report-submit">Submit</button>' +
      '</div>';

    document.body.appendChild(popover);
    const rect = triggerBtn.getBoundingClientRect();
    popover.style.position = "fixed";
    popover.style.top = Math.min(rect.bottom + 6, window.innerHeight - 220) + "px";
    popover.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 260)) + "px";

    function close() { popover.remove(); }

    popover.querySelector(".report-cancel").addEventListener("click", close);

    popover.querySelector(".report-submit").addEventListener("click", async function () {
      const reason = popover.querySelector(".report-reason").value;
      const details = popover.querySelector(".report-details").value.trim();

      const { data: userRes } = await supabaseClient.auth.getUser();
      const user = userRes.user;
      if (!user) { close(); return; }

      await supabaseClient.from("reports").insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason: reason,
        details: details || null,
      });

      close();
      showToast("Report submitted");
    });

    setTimeout(function () {
      document.addEventListener("click", function onOutside(e) {
        if (!popover.contains(e.target) && e.target !== triggerBtn) {
          close();
          document.removeEventListener("click", onOutside);
        }
      });
    }, 0);
  }

  // Small "⋮" menu shared by any card showing a person — Report or
  // Block. Kept separate from the report popover since it offers two
  // actions, not one form. Reused by Connect's connected list and
  // Profile's My Connections.
  function openPersonMenu(triggerBtn, person, onBlocked) {
    const existing = document.querySelector(".person-menu");
    if (existing) existing.remove();

    const menu = document.createElement("div");
    menu.className = "person-menu";
    menu.innerHTML =
      '<button type="button" class="person-menu-item person-menu-report">Report</button>' +
      '<button type="button" class="person-menu-item person-menu-block">Block</button>';

    document.body.appendChild(menu);
    const rect = triggerBtn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.top = Math.min(rect.bottom + 4, window.innerHeight - 100) + "px";
    menu.style.left = Math.max(12, Math.min(rect.left - 100, window.innerWidth - 160)) + "px";

    function close() { menu.remove(); }

    menu.querySelector(".person-menu-report").addEventListener("click", function () {
      close();
      openReportPopover(triggerBtn, "profile", person.id);
    });

    menu.querySelector(".person-menu-block").addEventListener("click", async function () {
      close();
      if (!window.confirm("Block " + person.full_name + "? They won't be able to message you, and you won't see each other on Connect.")) return;

      const { data: userRes } = await supabaseClient.auth.getUser();
      const user = userRes.user;
      await supabaseClient.from("blocked_users").insert({ blocker_id: user.id, blocked_id: person.id });
      showToast(person.full_name + " blocked");
      if (onBlocked) onBlocked();
    });

    setTimeout(function () {
      document.addEventListener("click", function onOutside(e) {
        if (!menu.contains(e.target) && e.target !== triggerBtn) {
          close();
          document.removeEventListener("click", onOutside);
        }
      });
    }, 0);
  }

  // Sub-views reached from Profile (My groups, Settings, Downloaded, My
  // connections, group detail) support real back-navigation: opening one
  // pushes a history entry, and the browser/hardware back button, the
  // Escape key, or the visible close (\u2715) all just call history.back() —
  // one popstate handler (registered once here, not per-render) does the
  // actual showing/hiding, keyed off location.hash.
  const SUBVIEW_HASHES = ["#groups", "#group-detail", "#settings", "#downloads", "#connections", "#messages", "#message-thread"];
  let subviewPopHandler = null;

  // Cross-view bridge: tapping "Message" on a connection card (in the
  // Connect tab or Profile's My Connections) needs to switch to the
  // Profile tab AND jump straight into that person's thread. Since each
  // bottom-nav view is an independent render closure, this shared
  // variable is how Connect hands off to Profile without them knowing
  // about each other directly.
  let pendingMessageTarget = null;

  function openSubView(hash, mainEl, viewEl, afterOpen) {
    mainEl.hidden = true;
    viewEl.hidden = false;
    history.pushState({ universeSubview: hash }, "", hash);
    if (afterOpen) afterOpen();
  }

  function registerSubviewNav(mainEl, views) {
    // views: { groups: el, settings: el, downloads: el, connections: el }
    // reRenderGroups: called whenever landing back on #groups so stale
    // group-detail content doesn't linger.
    if (subviewPopHandler) window.removeEventListener("popstate", subviewPopHandler);

    subviewPopHandler = function () {
      const hash = window.location.hash;
      Object.keys(views).forEach(function (key) {
        if (views[key].el) views[key].el.hidden = true;
      });

      if (hash === "#groups" || hash === "#group-detail") {
        mainEl.hidden = true;
        views.groups.el.hidden = false;
        if (hash === "#groups" && views.groups.onShow) views.groups.onShow();
      } else if (hash === "#settings") {
        mainEl.hidden = true;
        views.settings.el.hidden = false;
      } else if (hash === "#downloads") {
        mainEl.hidden = true;
        views.downloads.el.hidden = false;
      } else if (hash === "#connections") {
        mainEl.hidden = true;
        views.connections.el.hidden = false;
      } else if (hash === "#messages" || hash === "#message-thread") {
        mainEl.hidden = true;
        views.messages.el.hidden = false;
        if (hash === "#messages" && views.messages.onShow) views.messages.onShow();
      } else {
        mainEl.hidden = false;
      }
    };

    window.addEventListener("popstate", subviewPopHandler);
  }

  // Escape key closes whichever sub-view is open, registered once.
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && SUBVIEW_HASHES.indexOf(window.location.hash) !== -1) {
      history.back();
    }
  });

  const renderers = {
    feed: renderFeed,
    materials: renderMaterials,
    connect: renderConnect,
    profile: renderProfile,
  };

  function setActive(name) {
    navItems.forEach(function (btn) {
      const isActive = btn.dataset.view === name;
      btn.classList.toggle("is-active", isActive);
      if (isActive) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.removeAttribute("aria-current");
      }
    });
  }

  function showView(name) {
    const renderer = renderers[name];
    if (!renderer) return;
    view.innerHTML = "";
    view.appendChild(renderer());
    view.scrollTop = 0;
    setActive(name);
  }

  navItems.forEach(function (btn) {
    btn.addEventListener("click", function () {
      showView(btn.dataset.view);
    });
  });

  // ---------- Feed ----------

  function renderFeed() {
    const wrap = document.createElement("div");
    wrap.className = "view-inner";

    wrap.innerHTML =
      '<form class="group-post-form" id="feed-post-form">' +
        '<textarea id="feed-post-text" placeholder="Share something with your campus..." required></textarea>' +
        '<button type="submit" class="btn btn-primary btn-sm">Post</button>' +
      '</form>' +
      '<div id="feed-list">' + skeletonHTML(3) + '</div>';

    const feedList = wrap.querySelector("#feed-list");
    let currentUser = null;
    let mySchoolId = null;
    let likedPostIds = new Set();
    let likeCounts = {};

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str || "";
      return div.innerHTML;
    }

    function timeAgo(dateStr) {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return mins + "m";
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + "h";
      return Math.floor(hrs / 24) + "d";
    }

    async function loadFeed() {
      const { data: userRes } = await supabaseClient.auth.getUser();
      currentUser = userRes.user;
      if (!currentUser) return;

      const { data: myProfile } = await supabaseClient
        .from("profiles")
        .select("school_id")
        .eq("id", currentUser.id)
        .single();

      mySchoolId = myProfile ? myProfile.school_id : null;

      const { data: posts } = await supabaseClient
        .from("posts")
        .select("id, content, created_at, updated_at, author_id, profiles(full_name)")
        .is("group_id", null)
        .eq("school_id", mySchoolId)
        .order("created_at", { ascending: false })
        .limit(20);

      const { data: materials } = await supabaseClient
        .from("materials")
        .select("id, title, course_code, created_at")
        .eq("school_id", mySchoolId)
        .order("created_at", { ascending: false })
        .limit(10);

      const postItems = (posts || []).map(function (p) {
        return {
          kind: "post",
          id: p.id,
          author: p.profiles ? p.profiles.full_name : "Member",
          author_id: p.author_id,
          content: p.content,
          created_at: p.created_at,
          updated_at: p.updated_at,
        };
      });

      const materialItems = (materials || []).map(function (m) {
        return {
          kind: "material",
          id: m.id,
          title: m.title,
          course: m.course_code,
          created_at: m.created_at,
        };
      });

      const combined = postItems.concat(materialItems).sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      const postIds = postItems.map(function (p) { return p.id; });
      if (postIds.length > 0) {
        const { data: reactions } = await supabaseClient
          .from("post_reactions")
          .select("post_id, profile_id")
          .in("post_id", postIds)
          .eq("type", "like");

        likeCounts = {};
        likedPostIds = new Set();
        (reactions || []).forEach(function (r) {
          likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1;
          if (r.profile_id === currentUser.id) likedPostIds.add(r.post_id);
        });
      }

      renderList(combined);
    }

    function renderList(items) {
      feedList.innerHTML = "";

      if (items.length === 0) {
        feedList.innerHTML = '<p class="empty-state">Nothing here yet — be the first to post on your campus.</p>';
        return;
      }

      items.forEach(function (item) {
        const card = document.createElement("article");
        card.className = "feed-card";

        if (item.kind === "material") {
          card.innerHTML =
            '<div class="feed-card-top">' +
              '<span class="feed-tag feed-tag-material">New material</span>' +
              '<span class="feed-school">' + timeAgo(item.created_at) + '</span>' +
            '</div>' +
            '<p class="feed-text">' + escapeHtml(item.title) + '</p>' +
            '<p class="feed-meta">' + escapeHtml(item.course || "General") + '</p>';
          feedList.appendChild(card);
          return;
        }

        const isLiked = likedPostIds.has(item.id);
        const count = likeCounts[item.id] || 0;
        const isMine = item.author_id === currentUser.id;
        const editedTag = item.updated_at ? ' <span class="edited-tag">(edited)</span>' : '';

        card.innerHTML =
          '<div class="feed-card-top">' +
            '<span class="feed-tag feed-tag-discussion">Post</span>' +
            '<span class="feed-school">' + timeAgo(item.created_at) + editedTag + '</span>' +
          '</div>' +
          '<p class="feed-author">' + escapeHtml(item.author) + '</p>' +
          '<p class="feed-text" id="post-text-' + item.id + '">' + escapeHtml(item.content) + '</p>' +
          '<div class="feed-actions">' +
            '<button type="button" class="like-btn' + (isLiked ? ' is-liked' : '') + '" data-post-id="' + item.id + '">' +
              (isLiked ? '&#9829;' : '&#9825;') + ' <span class="like-count">' + count + '</span>' +
            '</button>' +
            (isMine ? '<button type="button" class="post-edit-btn">Edit</button><button type="button" class="post-delete-btn">Delete</button>' : '<button type="button" class="post-report-btn">Report</button>') +
          '</div>';

        card.querySelector(".like-btn").addEventListener("click", function () {
          toggleLike(item.id, card.querySelector(".like-btn"));
        });

        if (isMine) {
          card.querySelector(".post-edit-btn").addEventListener("click", function () {
            startEditPost(item, card);
          });
          card.querySelector(".post-delete-btn").addEventListener("click", function () {
            deletePost(item, card);
          });
        } else {
          card.querySelector(".post-report-btn").addEventListener("click", function (e) {
            openReportPopover(e.target, "post", item.id);
          });
        }

        feedList.appendChild(card);
      });
    }

    function startEditPost(item, card) {
      const textEl = card.querySelector("#post-text-" + item.id);
      const original = item.content;
      const actionsRow = card.querySelector(".feed-actions");
      if (actionsRow) actionsRow.hidden = true;

      textEl.outerHTML =
        '<div class="post-edit-form" id="post-edit-' + item.id + '">' +
          '<textarea class="post-edit-textarea">' + escapeHtml(original) + '</textarea>' +
          '<div class="upload-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm post-edit-cancel">Cancel</button>' +
            '<button type="button" class="btn btn-primary btn-sm post-edit-save">Save</button>' +
          '</div>' +
        '</div>';

      const formEl = card.querySelector("#post-edit-" + item.id);
      const textarea = formEl.querySelector(".post-edit-textarea");

      formEl.querySelector(".post-edit-cancel").addEventListener("click", function () {
        loadFeed();
      });

      formEl.querySelector(".post-edit-save").addEventListener("click", async function () {
        const newContent = textarea.value.trim();
        if (!newContent) return;

        const saveBtn = formEl.querySelector(".post-edit-save");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const { error } = await supabaseClient
          .from("posts")
          .update({ content: newContent })
          .eq("id", item.id);

        if (!error) {
          showToast("Post updated");
          loadFeed();
        } else {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        }
      });
    }

    async function deletePost(item, card) {
      if (!window.confirm("Delete this post? This can't be undone.")) return;

      const { error } = await supabaseClient
        .from("posts")
        .delete()
        .eq("id", item.id);

      if (!error) {
        card.remove();
        showToast("Post deleted");
      }
    }

    async function toggleLike(postId, btn) {
      const isLiked = likedPostIds.has(postId);

      if (isLiked) {
        likedPostIds.delete(postId);
        likeCounts[postId] = Math.max(0, (likeCounts[postId] || 1) - 1);
        await supabaseClient
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("profile_id", currentUser.id)
          .eq("type", "like");
      } else {
        likedPostIds.add(postId);
        likeCounts[postId] = (likeCounts[postId] || 0) + 1;
        await supabaseClient
          .from("post_reactions")
          .insert({ post_id: postId, profile_id: currentUser.id, type: "like" });
      }

      btn.classList.toggle("is-liked", likedPostIds.has(postId));
      btn.innerHTML = (likedPostIds.has(postId) ? '&#9829;' : '&#9825;') + ' <span class="like-count">' + likeCounts[postId] + '</span>';
    }

    wrap.querySelector("#feed-post-form").addEventListener("submit", async function (e) {
      e.preventDefault();

      const textarea = wrap.querySelector("#feed-post-text");
      const content = textarea.value.trim();
      if (!content || !currentUser) return;

      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Posting...";

      const { error } = await supabaseClient.from("posts").insert({
        author_id: currentUser.id,
        content: content,
        group_id: null,
        category: "general",
        school_id: mySchoolId,
      });

      submitBtn.disabled = false;
      submitBtn.textContent = "Post";

      if (!error) {
        textarea.value = "";
        loadFeed();
      }
    });

    loadFeed();

    return wrap;
  }

  // ---------- Materials ----------

  function renderMaterials() {
    const wrap = document.createElement("div");
    wrap.className = "view-inner";

    wrap.innerHTML =
      '<div class="view-heading"><h2>Materials</h2><p>Search past questions, notes, and handouts.</p></div>' +
      '<button class="add-material-card" id="add-material-toggle" type="button">' +
        '<span class="add-material-plus">+</span>' +
        '<span>Add material</span>' +
      '</button>' +
      '<form class="upload-form" id="upload-form" hidden>' +
        '<label class="field">' +
          '<span class="field-label">Title</span>' +
          '<input type="text" id="upload-title" placeholder="e.g. GEE 202 — Complete Notes" required>' +
          '<span class="field-error" id="upload-title-error"></span>' +
        '</label>' +
        '<label class="field">' +
          '<span class="field-label">Course code</span>' +
          '<input type="text" id="upload-course" placeholder="e.g. GEE 202">' +
        '</label>' +
        '<label class="field">' +
          '<span class="field-label">School</span>' +
          '<input type="text" id="upload-school" placeholder="Loading your school...">' +
        '</label>' +
        '<label class="field">' +
          '<span class="field-label">PDF file</span>' +
          '<input type="file" id="upload-file" accept="application/pdf" required>' +
          '<span class="field-error" id="upload-file-error"></span>' +
        '</label>' +
        '<div class="upload-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" id="upload-cancel">Cancel</button>' +
          '<button type="submit" class="btn btn-primary btn-sm" id="upload-submit">Upload</button>' +
        '</div>' +
      '</form>' +
      '<input type="text" class="materials-search" placeholder="Search by course or title...">' +
      '<div class="materials-list">' + skeletonHTML(3) + '</div>';

    const list = wrap.querySelector(".materials-list");
    const searchInput = wrap.querySelector(".materials-search");
    const toggleBtn = wrap.querySelector("#add-material-toggle");
    const uploadForm = wrap.querySelector("#upload-form");
    const schoolField = wrap.querySelector("#upload-school");

    let allMaterials = [];
    let currentUser = null;
    let currentSchoolId = null;

    // Prefill the school field from the logged-in user's own profile.
    supabaseClient.auth.getUser().then(function (res) {
      currentUser = res.data.user;
      if (!currentUser) return;
      return supabaseClient
        .from("profiles")
        .select("school_id, school_name")
        .eq("id", currentUser.id)
        .single();
    }).then(function (result) {
      if (result && result.data) {
        currentSchoolId = result.data.school_id;
        schoolField.value = result.data.school_name || "";
        schoolField.placeholder = "e.g. University of Benin";
      }
    });

    function renderList(items) {
      list.innerHTML = "";
      if (items.length === 0) {
        list.innerHTML = '<p class="empty-state">No materials match that search yet.</p>';
        return;
      }
      items.forEach(function (m) {
        const card = document.createElement("div");
        card.className = "material-card";
        card.dataset.path = m.file_path;
        card.dataset.id = m.id;
        card.innerHTML =
          '<div>' +
            '<p class="material-title">' + escapeHtml(m.title) + '</p>' +
            '<p class="material-meta">' + escapeHtml(m.course_code || "General") + ' \u00B7 ' + escapeHtml(m.school_name || "") + '</p>' +
          '</div>' +
          '<span class="material-downloads">Download</span>';
        card.addEventListener("click", function () {
          downloadMaterial(m);
        });
        list.appendChild(card);
      });
    }

    async function loadMaterials() {
      const { data, error } = await supabaseClient
        .from("materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        list.innerHTML = '<p class="empty-state">Couldn\u2019t load materials right now.</p>';
        return;
      }

      allMaterials = data || [];
      renderList(allMaterials);
    }

    async function downloadMaterial(m) {
      const { data, error } = await supabaseClient
        .storage
        .from("materials")
        .createSignedUrl(m.file_path, 60); // link valid for 60 seconds

      if (error || !data) return;

      window.open(data.signedUrl, "_blank");

      if (currentUser) {
        supabaseClient.from("material_downloads").insert({
          material_id: m.id,
          profile_id: currentUser.id,
        });
      }
    }

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    loadMaterials();

    searchInput.addEventListener("input", debounce(function () {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = allMaterials.filter(function (m) {
        return (
          m.title.toLowerCase().includes(q) ||
          (m.course_code || "").toLowerCase().includes(q) ||
          (m.school_name || "").toLowerCase().includes(q)
        );
      });
      renderList(filtered);
    }, 150));

    // ---------- Inline upload form ----------

    toggleBtn.addEventListener("click", function () {
      uploadForm.hidden = !uploadForm.hidden;
      toggleBtn.hidden = !uploadForm.hidden;
    });

    wrap.querySelector("#upload-cancel").addEventListener("click", function () {
      uploadForm.hidden = true;
      toggleBtn.hidden = false;
      uploadForm.reset();
    });

    uploadForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const titleInput = wrap.querySelector("#upload-title");
      const fileInput = wrap.querySelector("#upload-file");
      const courseInput = wrap.querySelector("#upload-course");
      const titleError = wrap.querySelector("#upload-title-error");
      const fileError = wrap.querySelector("#upload-file-error");

      titleError.textContent = "";
      fileError.textContent = "";

      const title = titleInput.value.trim();
      const file = fileInput.files[0];

      let hasError = false;
      if (!title) {
        titleError.textContent = "Give it a title";
        hasError = true;
      }
      if (!file) {
        fileError.textContent = "Choose a PDF file";
        hasError = true;
      } else if (file.type !== "application/pdf") {
        fileError.textContent = "Only PDF files are supported";
        hasError = true;
      }
      if (hasError || !currentUser) return;

      const submitBtn = wrap.querySelector("#upload-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading...";

      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const uniqueId = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random());
      const path = (currentSchoolId || "general") + "/" + uniqueId + "-" + safeName;

      const { error: uploadError } = await supabaseClient
        .storage
        .from("materials")
        .upload(path, file);

      if (uploadError) {
        fileError.textContent = "Upload failed: " + uploadError.message;
        submitBtn.disabled = false;
        submitBtn.textContent = "Upload";
        return;
      }

      const { error: insertError } = await supabaseClient
        .from("materials")
        .insert({
          uploader_id: currentUser.id,
          title: title,
          course_code: courseInput.value.trim() || null,
          school_id: currentSchoolId,
          school_name: schoolField.value.trim() || null,
          file_path: path,
        });

      submitBtn.disabled = false;
      submitBtn.textContent = "Upload";

      if (insertError) {
        fileError.textContent = "Something went wrong saving it. Try again.";
        return;
      }

      uploadForm.reset();
      uploadForm.hidden = true;
      toggleBtn.hidden = false;
      loadMaterials();
      showToast("Material uploaded");
    });

    return wrap;
  }

  // ---------- Connect ----------

  function renderConnect() {
    const wrap = document.createElement("div");
    wrap.className = "view-inner";

    wrap.innerHTML =
      '<div class="view-heading"><h2>Connect</h2><p>People from your school on uniVERSE.</p></div>' +
      '<div id="requests-section"></div>' +
      '<div id="connected-section"></div>' +
      '<h3 class="connect-subheading">Suggested</h3>' +
      '<div class="connect-list" id="suggested-list">' + skeletonHTML(3) + '</div>';

    const requestsSection = wrap.querySelector("#requests-section");
    const connectedSection = wrap.querySelector("#connected-section");
    const suggestedList = wrap.querySelector("#suggested-list");

    let currentUser = null;

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str || "";
      return div.innerHTML;
    }

    function personCard(person, actionsHtml) {
      const card = document.createElement("div");
      card.className = "connect-card";
      card.innerHTML =
        '<div class="connect-avatar">' + (person.full_name || "?").charAt(0).toUpperCase() + '</div>' +
        '<div class="connect-info">' +
          '<p class="connect-name">' + escapeHtml(person.full_name) + '</p>' +
          '<p class="connect-school">' + escapeHtml(person.school_name || "") + '</p>' +
        '</div>' +
        '<div class="connect-actions">' + actionsHtml + '</div>';
      return card;
    }

    async function loadConnectData() {
      const { data: userRes } = await supabaseClient.auth.getUser();
      currentUser = userRes.user;
      if (!currentUser) return;

      const { data: myProfile } = await supabaseClient
        .from("profiles")
        .select("school_id")
        .eq("id", currentUser.id)
        .single();

      const mySchoolId = myProfile ? myProfile.school_id : null;

      const { data: myConnections } = await supabaseClient
        .from("connections")
        .select("id, requester_id, receiver_id, status")
        .or("requester_id.eq." + currentUser.id + ",receiver_id.eq." + currentUser.id);

      const rows = myConnections || [];

      const { data: blockedRows } = await supabaseClient
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", currentUser.id);
      const blockedIds = new Set((blockedRows || []).map(function (r) { return r.blocked_id; }));

      // Anyone already involved in a connection row, regardless of
      // status, is excluded from "Suggested" — pending/accepted/declined
      // are all shown in their own section instead of being re-suggested.
      // Blocked people are excluded everywhere on this tab entirely.
      const excludeIds = new Set(blockedIds);
      const incomingRequests = []; // { connectionId, otherId }
      const connectedIds = [];

      rows.forEach(function (row) {
        const otherId = row.requester_id === currentUser.id ? row.receiver_id : row.requester_id;
        if (blockedIds.has(otherId)) return;
        excludeIds.add(otherId);
        if (row.status === "accepted") {
          connectedIds.push(otherId);
        } else if (row.status === "pending" && row.receiver_id === currentUser.id) {
          incomingRequests.push({ connectionId: row.id, otherId: otherId });
        }
      });

      // Fetch profile details for anyone we need to display: incoming
      // requesters + accepted connections.
      const neededIds = incomingRequests.map(function (r) { return r.otherId; }).concat(connectedIds);
      let otherProfiles = {};
      if (neededIds.length > 0) {
        const { data: profilesData } = await supabaseClient
          .from("profiles")
          .select("id, full_name, school_name")
          .in("id", neededIds);
        (profilesData || []).forEach(function (p) { otherProfiles[p.id] = p; });
      }

      renderRequests(incomingRequests, otherProfiles);
      renderConnected(connectedIds, otherProfiles);
      loadSuggested(excludeIds, mySchoolId);
    }

    function renderRequests(incomingRequests, otherProfiles) {
      requestsSection.innerHTML = "";
      if (incomingRequests.length === 0) return;

      const heading = document.createElement("h3");
      heading.className = "connect-subheading";
      heading.textContent = "Requests";
      requestsSection.appendChild(heading);

      incomingRequests.forEach(function (req) {
        const person = otherProfiles[req.otherId];
        if (!person) return;
        const card = personCard(person,
          '<button class="btn btn-primary btn-sm accept-btn">Accept</button>' +
          '<button class="btn btn-ghost btn-sm decline-btn">Decline</button>'
        );
        card.querySelector(".accept-btn").addEventListener("click", function () {
          respondToRequest(req.connectionId, "accepted");
        });
        card.querySelector(".decline-btn").addEventListener("click", function () {
          respondToRequest(req.connectionId, "declined");
        });
        requestsSection.appendChild(card);
      });
    }

    function renderConnected(connectedIds, otherProfiles) {
      connectedSection.innerHTML = "";
      if (connectedIds.length === 0) return;

      const heading = document.createElement("h3");
      heading.className = "connect-subheading";
      heading.textContent = "Your connections";
      connectedSection.appendChild(heading);

      connectedIds.forEach(function (id) {
        const person = otherProfiles[id];
        if (!person) return;
        const card = personCard(person,
          '<span class="connected-badge">Connected</span>' +
          '<button type="button" class="btn btn-ghost btn-sm message-btn">Message</button>' +
          '<button type="button" class="card-more-btn" aria-label="More options">\u22ee</button>'
        );
        card.querySelector(".message-btn").addEventListener("click", function () {
          pendingMessageTarget = { id: person.id, full_name: person.full_name };
          document.querySelector('.nav-item[data-view="profile"]').click();
        });
        card.querySelector(".card-more-btn").addEventListener("click", function (e) {
          openPersonMenu(e.target, person, function () { loadConnectData(); });
        });
        connectedSection.appendChild(card);
      });
    }

    async function loadSuggested(excludeIds, mySchoolId) {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name, school_id, school_name")
        .neq("id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        suggestedList.innerHTML = '<p class="empty-state">Couldn\u2019t load suggestions right now.</p>';
        return;
      }

      const filtered = (data || []).filter(function (p) { return !excludeIds.has(p.id); });

      // Same-school people surface first.
      filtered.sort(function (a, b) {
        const aMatch = a.school_id === mySchoolId ? 0 : 1;
        const bMatch = b.school_id === mySchoolId ? 0 : 1;
        return aMatch - bMatch;
      });

      suggestedList.innerHTML = "";

      if (filtered.length === 0) {
        suggestedList.innerHTML = '<p class="empty-state">No new suggestions right now — check back soon.</p>';
        return;
      }

      filtered.forEach(function (person) {
        const sameSchool = person.school_id === mySchoolId;
        const card = personCard(person,
          '<button class="btn btn-ghost btn-sm connect-btn">Connect</button>'
        );
        if (sameSchool) {
          const tag = document.createElement("span");
          tag.className = "same-school-tag";
          tag.textContent = "Same school";
          card.querySelector(".connect-info").appendChild(tag);
        }
        const btn = card.querySelector(".connect-btn");
        btn.addEventListener("click", function () {
          sendRequest(person.id, btn);
        });
        suggestedList.appendChild(card);
      });
    }

    async function sendRequest(receiverId, btn) {
      btn.disabled = true;
      btn.textContent = "Sending...";

      const { error } = await supabaseClient.from("connections").insert({
        requester_id: currentUser.id,
        receiver_id: receiverId,
        status: "pending",
      });

      if (error) {
        btn.disabled = false;
        btn.textContent = "Connect";
        return;
      }

      btn.textContent = "Requested";
      showToast("Request sent");
    }

    async function respondToRequest(connectionId, status) {
      await supabaseClient
        .from("connections")
        .update({ status: status })
        .eq("id", connectionId);

      loadConnectData();
    }

    loadConnectData();

    return wrap;
  }

  // ---------- Profile ----------

  function renderProfile() {
    const wrap = document.createElement("div");
    wrap.className = "view-inner";

    wrap.innerHTML =
      '<div id="profile-main">' +
        '<div class="profile-card" id="profile-display">' +
          '<div class="profile-avatar" id="profile-avatar">U</div>' +
          '<p class="profile-name" id="profile-name">Loading...</p>' +
          '<p class="profile-school" id="profile-school-display"></p>' +
          '<button class="btn btn-ghost btn-sm" id="edit-profile-toggle">Edit profile</button>' +
        '</div>' +
        '<form class="upload-form" id="edit-profile-form" hidden>' +
          '<label class="field">' +
            '<span class="field-label">Full name</span>' +
            '<input type="text" id="edit-fullname" required>' +
            '<span class="field-error" id="edit-fullname-error"></span>' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Profile photo</span>' +
            '<input type="file" id="edit-avatar" accept="image/*">' +
            '<span class="field-error" id="edit-avatar-error"></span>' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Faculty <span class="optional-tag">(optional)</span></span>' +
            '<input type="text" id="edit-faculty" placeholder="e.g. Engineering">' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Department <span class="optional-tag">(optional)</span></span>' +
            '<input type="text" id="edit-department" placeholder="e.g. Geomatics Engineering">' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Level <span class="optional-tag">(optional)</span></span>' +
            '<input type="text" id="edit-level" placeholder="e.g. 200L">' +
          '</label>' +
          '<div class="field-label" style="margin-top: 6px;">Interests (up to 5)</div>' +
          '<div id="edit-interests-container"></div>' +
          '<div class="upload-actions">' +
            '<button type="button" class="btn btn-ghost btn-sm" id="edit-cancel">Cancel</button>' +
            '<button type="submit" class="btn btn-primary btn-sm" id="edit-submit">Save</button>' +
          '</div>' +
        '</form>' +
        '<div class="profile-links">' +
          '<a href="#" class="profile-link" id="downloads-link">Downloaded</a>' +
          '<a href="#" class="profile-link" id="connections-link">My connections</a>' +
          '<a href="#" class="profile-link" id="messages-link">Messages</a>' +
          '<a href="#" class="profile-link" id="my-groups-link">My groups</a>' +
          '<a href="#" class="profile-link" id="settings-link">Settings</a>' +
          '<a href="login.html" id="logout-link" class="profile-link profile-link-danger">Log out</a>' +
        '</div>' +
      '</div>' +
      '<div id="groups-view" hidden></div>' +
      '<div id="settings-view" hidden></div>' +
      '<div id="downloads-view" hidden></div>' +
      '<div id="connections-view" hidden></div>' +
      '<div id="messages-view" hidden></div>';

    const nameEl = wrap.querySelector("#profile-name");
    const schoolEl = wrap.querySelector("#profile-school-display");
    const avatarEl = wrap.querySelector("#profile-avatar");
    const editToggle = wrap.querySelector("#edit-profile-toggle");
    const editForm = wrap.querySelector("#edit-profile-form");
    const editNameInput = wrap.querySelector("#edit-fullname");
    const displayCard = wrap.querySelector("#profile-display");

    let currentUser = null;
    let currentProfile = null;
    let interestPicker = null;
    let savedInterestIds = [];

    function paintAvatar(url, name) {
      if (url) {
        avatarEl.innerHTML = '<img src="' + url + '" alt="Profile photo" class="profile-avatar-img">';
      } else {
        avatarEl.textContent = (name || "U").charAt(0).toUpperCase();
      }
    }

    async function loadProfile() {
      const { data: userRes } = await supabaseClient.auth.getUser();
      currentUser = userRes.user;
      if (!currentUser) return;

      const { data, error } = await supabaseClient
        .from("profiles")
        .select("full_name, school_name, avatar_url, faculty, department, level")
        .eq("id", currentUser.id)
        .single();

      if (error || !data) {
        nameEl.textContent = "Couldn\u2019t load profile";
        return;
      }

      currentProfile = data;
      nameEl.textContent = data.full_name;
      schoolEl.textContent = data.school_name || "";
      editNameInput.value = data.full_name;
      wrap.querySelector("#edit-faculty").value = data.faculty || "";
      wrap.querySelector("#edit-department").value = data.department || "";
      wrap.querySelector("#edit-level").value = data.level || "";
      paintAvatar(data.avatar_url, data.full_name);

      const { data: myInterests } = await supabaseClient
        .from("profile_interests")
        .select("interest_id")
        .eq("profile_id", currentUser.id);

      savedInterestIds = (myInterests || []).map(function (r) { return r.interest_id; });
    }

    loadProfile();

    editToggle.addEventListener("click", async function () {
      editForm.hidden = false;
      displayCard.hidden = true;
      const interestsContainer = wrap.querySelector("#edit-interests-container");
      interestPicker = await renderInterestPicker(interestsContainer, {
        max: 5,
        selectedIds: savedInterestIds,
      });
    });

    wrap.querySelector("#edit-cancel").addEventListener("click", function () {
      editForm.hidden = true;
      displayCard.hidden = false;
    });

    editForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const nameError = wrap.querySelector("#edit-fullname-error");
      const avatarError = wrap.querySelector("#edit-avatar-error");
      nameError.textContent = "";
      avatarError.textContent = "";

      const newName = editNameInput.value.trim();
      if (!newName) {
        nameError.textContent = "Name can't be empty";
        return;
      }

      const submitBtn = wrap.querySelector("#edit-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving...";

      let newAvatarUrl = currentProfile ? currentProfile.avatar_url : null;
      const fileInput = wrap.querySelector("#edit-avatar");
      const file = fileInput.files[0];

      if (file) {
        if (!file.type.startsWith("image/")) {
          avatarError.textContent = "Choose an image file";
          submitBtn.disabled = false;
          submitBtn.textContent = "Save";
          return;
        }

        const ext = file.name.split(".").pop();
        const path = currentUser.id + "/avatar." + ext;

        const { error: uploadError } = await supabaseClient
          .storage
          .from("avatars")
          .upload(path, file, { upsert: true });

        if (uploadError) {
          avatarError.textContent = "Photo upload failed: " + uploadError.message;
          submitBtn.disabled = false;
          submitBtn.textContent = "Save";
          return;
        }

        const { data: publicUrlData } = supabaseClient
          .storage
          .from("avatars")
          .getPublicUrl(path);

        // Cache-bust so the new photo shows immediately instead of a
        // cached copy of the old one at the same path.
        newAvatarUrl = publicUrlData.publicUrl + "?t=" + Date.now();
      }

      const newFaculty = wrap.querySelector("#edit-faculty").value.trim();
      const newDepartment = wrap.querySelector("#edit-department").value.trim();
      const newLevel = wrap.querySelector("#edit-level").value.trim();

      const { error: updateError } = await supabaseClient
        .from("profiles")
        .update({
          full_name: newName,
          avatar_url: newAvatarUrl,
          faculty: newFaculty || null,
          department: newDepartment || null,
          level: newLevel || null,
        })
        .eq("id", currentUser.id);

      // Save interest changes: insert newly picked ones, remove
      // unpicked ones. New picks trigger the auto-join-groups trigger
      // on the database side automatically.
      if (interestPicker) {
        const newSelection = interestPicker.getSelected();
        const toAdd = newSelection.filter(function (id) { return savedInterestIds.indexOf(id) === -1; });
        const toRemove = savedInterestIds.filter(function (id) { return newSelection.indexOf(id) === -1; });

        if (toAdd.length > 0) {
          await supabaseClient.from("profile_interests").insert(
            toAdd.map(function (interestId) {
              return { profile_id: currentUser.id, interest_id: interestId };
            })
          );
        }
        if (toRemove.length > 0) {
          await supabaseClient
            .from("profile_interests")
            .delete()
            .eq("profile_id", currentUser.id)
            .in("interest_id", toRemove);
        }
        savedInterestIds = newSelection;
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Save";

      if (updateError) {
        nameError.textContent = "Something went wrong saving. Try again.";
        return;
      }

      currentProfile = { full_name: newName, school_name: schoolEl.textContent, avatar_url: newAvatarUrl };
      nameEl.textContent = newName;
      paintAvatar(newAvatarUrl, newName);

      editForm.hidden = true;
      displayCard.hidden = false;
      showToast("Profile updated");
    });

    // ---------- My groups ----------

    const profileMain = wrap.querySelector("#profile-main");
    const groupsView = wrap.querySelector("#groups-view");

    wrap.querySelector("#my-groups-link").addEventListener("click", function (e) {
      e.preventDefault();
      openSubView("#groups", profileMain, groupsView, function () {
        renderGroupsList(groupsView);
      });
    });

    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str || "";
      return div.innerHTML;
    }

    async function renderGroupsList(container) {
      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="groups-back">\u2190 Back to profile</a>' +
          '<button type="button" class="subview-close" id="groups-close" aria-label="Close">\u2715</button>' +
        '</div>' +
        '<div class="view-heading"><h2>My groups</h2><p>Auto-joined based on your interests.</p></div>' +
        '<div id="groups-list">' + skeletonHTML(3) + '</div>';

      container.querySelector("#groups-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#groups-close").addEventListener("click", function () {
        history.back();
      });

      const listEl = container.querySelector("#groups-list");
      const { data: userRes } = await supabaseClient.auth.getUser();
      const user = userRes.user;

      const { data, error } = await supabaseClient
        .from("group_members")
        .select("group_id, groups(id, name, description)")
        .eq("profile_id", user.id);

      if (error) {
        listEl.innerHTML = '<p class="empty-state">Couldn\u2019t load your groups right now.</p>';
        return;
      }

      const groups = (data || []).map(function (row) { return row.groups; }).filter(Boolean);

      if (groups.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No groups yet — pick some interests in Edit profile and you\u2019ll be added automatically.</p>';
        return;
      }

      listEl.innerHTML = "";
      groups.forEach(function (group) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "group-card";
        card.innerHTML =
          '<p class="group-name">' + escapeHtml(group.name) + '</p>' +
          '<p class="group-description">' + escapeHtml(group.description || "") + '</p>';
        card.addEventListener("click", function () {
          history.pushState({ universeSubview: "#group-detail" }, "", "#group-detail");
          renderGroupDetail(groupsView, group);
        });
        listEl.appendChild(card);
      });
    }

    async function renderGroupDetail(container, group) {
      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="group-detail-back">\u2190 Back to my groups</a>' +
          '<button type="button" class="subview-close" id="group-detail-close" aria-label="Close">\u2715</button>' +
        '</div>' +
        '<div class="view-heading"><h2>' + escapeHtml(group.name) + '</h2><p>' + escapeHtml(group.description || "") + '</p></div>' +
        '<form class="group-post-form" id="group-post-form">' +
          '<textarea id="group-post-text" placeholder="Post something to this group..." required></textarea>' +
          '<button type="submit" class="btn btn-primary btn-sm">Post</button>' +
        '</form>' +
        '<div id="group-posts-list">' + skeletonHTML(2) + '</div>';

      container.querySelector("#group-detail-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#group-detail-close").addEventListener("click", function () {
        history.back();
      });

      const postsList = container.querySelector("#group-posts-list");

      async function loadGroupPosts() {
        const { data, error } = await supabaseClient
          .from("posts")
          .select("id, content, created_at, updated_at, author_id, profiles(full_name)")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false });

        if (error) {
          postsList.innerHTML = '<p class="empty-state">Couldn\u2019t load posts right now.</p>';
          return;
        }

        if (!data || data.length === 0) {
          postsList.innerHTML = '<p class="empty-state">No posts yet — be the first to post here.</p>';
          return;
        }

        postsList.innerHTML = "";
        data.forEach(function (post) {
          const card = document.createElement("div");
          card.className = "feed-card";
          const authorName = post.profiles ? post.profiles.full_name : "Member";
          const isMine = post.author_id === currentUser.id;
          const editedTag = post.updated_at ? ' <span class="edited-tag">(edited)</span>' : '';

          card.innerHTML =
            '<p class="feed-author">' + escapeHtml(authorName) + editedTag + '</p>' +
            '<p class="feed-text" id="gpost-text-' + post.id + '">' + escapeHtml(post.content) + '</p>' +
            (isMine
              ? '<div class="feed-actions"><button type="button" class="post-edit-btn">Edit</button><button type="button" class="post-delete-btn">Delete</button></div>'
              : '<div class="feed-actions"><button type="button" class="post-report-btn">Report</button></div>');

          if (isMine) {
            card.querySelector(".post-edit-btn").addEventListener("click", function () {
              startEditGroupPost(post, card);
            });
            card.querySelector(".post-delete-btn").addEventListener("click", function () {
              deleteGroupPost(post, card);
            });
          } else {
            card.querySelector(".post-report-btn").addEventListener("click", function (e) {
              openReportPopover(e.target, "post", post.id);
            });
          }

          postsList.appendChild(card);
        });
      }

      function startEditGroupPost(post, card) {
        const textEl = card.querySelector("#gpost-text-" + post.id);
        const original = post.content;
        const actionsRow = card.querySelector(".feed-actions");
        if (actionsRow) actionsRow.hidden = true;

        textEl.outerHTML =
          '<div class="post-edit-form" id="gpost-edit-' + post.id + '">' +
            '<textarea class="post-edit-textarea">' + escapeHtml(original) + '</textarea>' +
            '<div class="upload-actions">' +
              '<button type="button" class="btn btn-ghost btn-sm gpost-edit-cancel">Cancel</button>' +
              '<button type="button" class="btn btn-primary btn-sm gpost-edit-save">Save</button>' +
            '</div>' +
          '</div>';

        const formEl = card.querySelector("#gpost-edit-" + post.id);
        formEl.querySelector(".gpost-edit-cancel").addEventListener("click", function () {
          loadGroupPosts();
        });

        formEl.querySelector(".gpost-edit-save").addEventListener("click", async function () {
          const textarea = formEl.querySelector(".post-edit-textarea");
          const newContent = textarea.value.trim();
          if (!newContent) return;

          const saveBtn = formEl.querySelector(".gpost-edit-save");
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";

          const { error } = await supabaseClient
            .from("posts")
            .update({ content: newContent })
            .eq("id", post.id);

          if (!error) {
            showToast("Post updated");
            loadGroupPosts();
          } else {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
          }
        });
      }

      async function deleteGroupPost(post, card) {
        if (!window.confirm("Delete this post? This can't be undone.")) return;

        const { error } = await supabaseClient
          .from("posts")
          .delete()
          .eq("id", post.id);

        if (!error) {
          card.remove();
          showToast("Post deleted");
        }
      }

      loadGroupPosts();

      container.querySelector("#group-post-form").addEventListener("submit", async function (e) {
        e.preventDefault();

        const textarea = container.querySelector("#group-post-text");
        const content = textarea.value.trim();
        if (!content) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Posting...";

        const { data: userRes } = await supabaseClient.auth.getUser();

        const { error } = await supabaseClient.from("posts").insert({
          author_id: userRes.user.id,
          content: content,
          group_id: group.id,
          category: "general",
        });

        submitBtn.disabled = false;
        submitBtn.textContent = "Post";

        if (!error) {
          textarea.value = "";
          loadGroupPosts();
          showToast("Posted to " + group.name);
        }
      });
    }

    // ---------- Settings ----------

    const settingsView = wrap.querySelector("#settings-view");

    wrap.querySelector("#settings-link").addEventListener("click", function (e) {
      e.preventDefault();
      openSubView("#settings", profileMain, settingsView, function () {
        renderSettings(settingsView);
      });
    });

    async function renderSettings(container) {
      const { data: userRes } = await supabaseClient.auth.getUser();
      const user = userRes.user;

      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="settings-back">\u2190 Back to profile</a>' +
          '<button type="button" class="subview-close" id="settings-close" aria-label="Close">\u2715</button>' +
        '</div>' +
        '<div class="view-heading"><h2>Settings</h2></div>' +

        '<h3 class="connect-subheading">Email</h3>' +
        '<form class="upload-form" id="email-form">' +
          '<label class="field">' +
            '<span class="field-label">Current email</span>' +
            '<input type="text" value="' + escapeHtml(user.email) + '" disabled>' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">New email</span>' +
            '<input type="email" id="new-email" placeholder="new@example.com" required>' +
            '<span class="field-error" id="new-email-error"></span>' +
          '</label>' +
          '<p class="field-hint">You\u2019ll get a confirmation link at the new address \u2014 the change only takes effect once you click it.</p>' +
          '<div class="upload-actions">' +
            '<button type="submit" class="btn btn-primary btn-sm">Update email</button>' +
          '</div>' +
        '</form>' +

        '<h3 class="connect-subheading">Password</h3>' +
        '<form class="upload-form" id="password-form">' +
          '<label class="field">' +
            '<span class="field-label">New password</span>' +
            '<input type="password" id="new-password" placeholder="At least 8 characters" required minlength="8">' +
            '<span class="field-error" id="new-password-error"></span>' +
          '</label>' +
          '<label class="field">' +
            '<span class="field-label">Confirm new password</span>' +
            '<input type="password" id="confirm-new-password" placeholder="Re-enter new password" required minlength="8">' +
            '<span class="field-hint" id="confirm-new-password-hint"></span>' +
          '</label>' +
          '<div class="upload-actions">' +
            '<button type="submit" class="btn btn-primary btn-sm">Update password</button>' +
          '</div>' +
        '</form>' +

        '<h3 class="connect-subheading">Sessions</h3>' +
        '<p class="field-hint" style="margin-bottom: 10px;">If you think someone else might have access to your account, sign out everywhere at once.</p>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="signout-everywhere-btn">Log out of all devices</button>' +
        '<p class="field-hint" id="signout-everywhere-msg"></p>' +

        '<h3 class="connect-subheading">Blocked users</h3>' +
        '<div id="blocked-list">' + skeletonHTML(1) + '</div>';

      container.querySelector("#settings-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#settings-close").addEventListener("click", function () {
        history.back();
      });

      // Change email
      container.querySelector("#email-form").addEventListener("submit", async function (e) {
        e.preventDefault();

        const newEmailInput = container.querySelector("#new-email");
        const errorEl = container.querySelector("#new-email-error");
        errorEl.textContent = "";

        const newEmail = newEmailInput.value.trim();
        if (!newEmail) {
          errorEl.textContent = "Enter a new email";
          return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Updating...";

        const { error } = await supabaseClient.auth.updateUser({ email: newEmail });

        submitBtn.disabled = false;
        submitBtn.textContent = "Update email";

        if (error) {
          errorEl.textContent = "Something went wrong: " + error.message;
          return;
        }

        newEmailInput.value = "";
        errorEl.textContent = "";
        errorEl.classList.remove("field-error");
        errorEl.classList.add("field-hint", "is-match");
        errorEl.textContent = "Check your new email for a confirmation link.";
        showToast("Confirmation link sent");
      });

      // Change password
      const newPasswordInput = container.querySelector("#new-password");
      const confirmPasswordInput = container.querySelector("#confirm-new-password");
      const confirmHint = container.querySelector("#confirm-new-password-hint");

      confirmPasswordInput.addEventListener("input", function () {
        if (!confirmPasswordInput.value) {
          confirmHint.textContent = "";
          return;
        }
        const matches = confirmPasswordInput.value === newPasswordInput.value;
        confirmHint.textContent = matches ? "Passwords match" : "Passwords don't match yet";
        confirmHint.classList.toggle("is-match", matches);
      });

      container.querySelector("#password-form").addEventListener("submit", async function (e) {
        e.preventDefault();

        const errorEl = container.querySelector("#new-password-error");
        errorEl.textContent = "";

        if (newPasswordInput.value.length < 8) {
          errorEl.textContent = "Use at least 8 characters";
          return;
        }
        if (newPasswordInput.value !== confirmPasswordInput.value) {
          errorEl.textContent = "Passwords don't match";
          return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "Updating...";

        const { error } = await supabaseClient.auth.updateUser({ password: newPasswordInput.value });

        submitBtn.disabled = false;
        submitBtn.textContent = "Update password";

        if (error) {
          errorEl.textContent = "Something went wrong: " + error.message;
          return;
        }

        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        confirmHint.textContent = "";
        errorEl.classList.remove("field-error");
        errorEl.classList.add("field-hint", "is-match");
        errorEl.textContent = "Password updated.";
        showToast("Password updated");
      });

      // Sign out everywhere
      container.querySelector("#signout-everywhere-btn").addEventListener("click", async function () {
        const btn = container.querySelector("#signout-everywhere-btn");
        const msgEl = container.querySelector("#signout-everywhere-msg");
        btn.disabled = true;
        btn.textContent = "Signing out everywhere...";

        await supabaseClient.auth.signOut({ scope: "global" });

        msgEl.textContent = "Signed out everywhere. Redirecting to log in...";
        setTimeout(function () { window.location.href = "login.html"; }, 1200);
      });

      // Blocked users
      const blockedListEl = container.querySelector("#blocked-list");

      const { data: blockedRows } = await supabaseClient
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      const blockedIds = (blockedRows || []).map(function (r) { return r.blocked_id; });

      if (blockedIds.length === 0) {
        blockedListEl.innerHTML = '<p class="empty-state">You haven\u2019t blocked anyone.</p>';
      } else {
        const { data: blockedProfiles } = await supabaseClient
          .from("profiles")
          .select("id, full_name")
          .in("id", blockedIds);

        blockedListEl.innerHTML = "";
        (blockedProfiles || []).forEach(function (p) {
          const row = document.createElement("div");
          row.className = "connect-card";
          row.innerHTML =
            '<div class="connect-avatar">' + (p.full_name || "?").charAt(0).toUpperCase() + '</div>' +
            '<div class="connect-info"><p class="connect-name">' + escapeHtml(p.full_name) + '</p></div>' +
            '<button type="button" class="btn btn-ghost btn-sm unblock-btn">Unblock</button>';
          row.querySelector(".unblock-btn").addEventListener("click", async function () {
            await supabaseClient
              .from("blocked_users")
              .delete()
              .eq("blocker_id", user.id)
              .eq("blocked_id", p.id);
            showToast(p.full_name + " unblocked");
            row.remove();
            if (blockedListEl.children.length === 0) {
              blockedListEl.innerHTML = '<p class="empty-state">You haven\u2019t blocked anyone.</p>';
            }
          });
          blockedListEl.appendChild(row);
        });
      }
    }

    // ---------- Downloaded ----------

    const downloadsView = wrap.querySelector("#downloads-view");

    wrap.querySelector("#downloads-link").addEventListener("click", function (e) {
      e.preventDefault();
      openSubView("#downloads", profileMain, downloadsView, function () {
        renderDownloads(downloadsView);
      });
    });

    async function renderDownloads(container) {
      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="downloads-back">\u2190 Back to profile</a>' +
          '<button type="button" class="subview-close" id="downloads-close" aria-label="Close">\u2715</button>' +
        '</div>' +
        '<div class="view-heading"><h2>Downloaded</h2><p>Materials you\u2019ve downloaded, most recent first.</p></div>' +
        '<div id="downloads-list">' + skeletonHTML(3) + '</div>';

      container.querySelector("#downloads-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#downloads-close").addEventListener("click", function () {
        history.back();
      });

      const listEl = container.querySelector("#downloads-list");
      const { data: userRes } = await supabaseClient.auth.getUser();
      const user = userRes.user;

      const { data, error } = await supabaseClient
        .from("material_downloads")
        .select("downloaded_at, materials(id, title, course_code, school_name, file_path)")
        .eq("profile_id", user.id)
        .order("downloaded_at", { ascending: false });

      if (error) {
        listEl.innerHTML = '<p class="empty-state">Couldn\u2019t load your downloads right now.</p>';
        return;
      }

      // Same material downloaded more than once should only show once,
      // keeping the most recent download time (the list is already
      // sorted newest-first, so the first occurrence wins).
      const seen = new Set();
      const items = [];
      (data || []).forEach(function (row) {
        if (!row.materials || seen.has(row.materials.id)) return;
        seen.add(row.materials.id);
        items.push({ material: row.materials, downloaded_at: row.downloaded_at });
      });

      if (items.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Nothing downloaded yet \u2014 materials you download will show up here.</p>';
        return;
      }

      listEl.innerHTML = "";
      items.forEach(function (item) {
        const m = item.material;
        const card = document.createElement("div");
        card.className = "material-card";
        card.innerHTML =
          '<div>' +
            '<p class="material-title">' + escapeHtml(m.title) + '</p>' +
            '<p class="material-meta">' + escapeHtml(m.course_code || "General") + ' \u00B7 ' + escapeHtml(m.school_name || "") + '</p>' +
          '</div>' +
          '<span class="material-downloads">Open</span>';
        card.addEventListener("click", async function () {
          const { data: signed } = await supabaseClient
            .storage
            .from("materials")
            .createSignedUrl(m.file_path, 60);
          if (signed) window.open(signed.signedUrl, "_blank");
        });
        listEl.appendChild(card);
      });
    }

    // ---------- My connections ----------

    const connectionsView = wrap.querySelector("#connections-view");

    wrap.querySelector("#connections-link").addEventListener("click", function (e) {
      e.preventDefault();
      openSubView("#connections", profileMain, connectionsView, function () {
        renderMyConnections(connectionsView);
      });
    });

    async function renderMyConnections(container) {
      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="connections-back">\u2190 Back to profile</a>' +
          '<button type="button" class="subview-close" id="connections-close" aria-label="Close">\u2715</button>' +
        '</div>' +
        '<div class="view-heading"><h2>My connections</h2><p>Everyone you\u2019re connected with.</p></div>' +
        '<div id="connections-list">' + skeletonHTML(3) + '</div>';

      container.querySelector("#connections-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#connections-close").addEventListener("click", function () {
        history.back();
      });

      const listEl = container.querySelector("#connections-list");
      const { data: userRes } = await supabaseClient.auth.getUser();
      const user = userRes.user;

      const { data: rows, error } = await supabaseClient
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or("requester_id.eq." + user.id + ",receiver_id.eq." + user.id);

      if (error) {
        listEl.innerHTML = '<p class="empty-state">Couldn\u2019t load your connections right now.</p>';
        return;
      }

      const otherIds = (rows || []).map(function (r) {
        return r.requester_id === user.id ? r.receiver_id : r.requester_id;
      });

      const { data: blockedRows } = await supabaseClient
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      const blockedIds = new Set((blockedRows || []).map(function (r) { return r.blocked_id; }));
      const visibleIds = otherIds.filter(function (id) { return !blockedIds.has(id); });

      if (visibleIds.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No connections yet \u2014 accepted requests will show up here.</p>';
        return;
      }

      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, full_name, school_name, level, avatar_url")
        .in("id", visibleIds);

      // Batch-fetch interests for everyone shown, one query instead of
      // one per person.
      const { data: interestRows } = await supabaseClient
        .from("profile_interests")
        .select("profile_id, interests(name)")
        .in("profile_id", visibleIds);

      const interestsByProfile = {};
      (interestRows || []).forEach(function (row) {
        if (!row.interests) return;
        if (!interestsByProfile[row.profile_id]) interestsByProfile[row.profile_id] = [];
        interestsByProfile[row.profile_id].push(row.interests.name);
      });

      listEl.innerHTML = "";
      (profiles || []).forEach(function (p) {
        const card = document.createElement("div");
        card.className = "connect-card";

        const avatarHtml = p.avatar_url
          ? '<img src="' + p.avatar_url + '" alt="" class="connect-avatar-img">'
          : (p.full_name || "?").charAt(0).toUpperCase();

        const interests = interestsByProfile[p.id] || [];
        const interestsText = interests.length > 0
          ? interests.slice(0, 3).join(", ")
          : "";

        card.innerHTML =
          '<div class="connect-avatar">' + avatarHtml + '</div>' +
          '<div class="connect-info">' +
            '<p class="connect-name">' + escapeHtml(p.full_name) + '</p>' +
            '<p class="connect-school">' + escapeHtml(p.school_name || "") + (p.level ? ' \u00B7 ' + escapeHtml(p.level) : '') + '</p>' +
            (interestsText ? '<p class="connect-shared">' + escapeHtml(interestsText) + '</p>' : '') +
          '</div>' +
          '<div class="connect-actions">' +
            '<span class="connected-badge">Connected</span>' +
            '<button type="button" class="btn btn-ghost btn-sm message-btn">Message</button>' +
            '<button type="button" class="card-more-btn" aria-label="More options">\u22ee</button>' +
          '</div>';

        card.querySelector(".message-btn").addEventListener("click", function () {
          history.pushState({ universeSubview: "#message-thread" }, "", "#message-thread");
          profileMain.hidden = true;
          messagesView.hidden = false;
          renderMessageThread(messagesView, p);
        });
        card.querySelector(".card-more-btn").addEventListener("click", function (e) {
          openPersonMenu(e.target, p, function () { renderMyConnections(container); });
        });

        listEl.appendChild(card);
      });
    }

    // ---------- Messages ----------

    const messagesView = wrap.querySelector("#messages-view");

    wrap.querySelector("#messages-link").addEventListener("click", function (e) {
      e.preventDefault();
      openSubView("#messages", profileMain, messagesView, function () {
        renderMessagesInbox(messagesView);
      });
    });

    async function renderMessagesInbox(container) {
      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="messages-back">\u2190 Back to profile</a>' +
          '<button type="button" class="subview-close" id="messages-close" aria-label="Close">\u2715</button>' +
        '</div>' +
        '<div class="view-heading"><h2>Messages</h2><p>Conversations with your connections.</p></div>' +
        '<div id="conversations-list">' + skeletonHTML(3) + '</div>';

      container.querySelector("#messages-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#messages-close").addEventListener("click", function () {
        history.back();
      });

      const listEl = container.querySelector("#conversations-list");
      const { data: userRes } = await supabaseClient.auth.getUser();
      const me = userRes.user;

      const { data: rows, error } = await supabaseClient
        .from("messages")
        .select("id, sender_id, receiver_id, content, created_at, read_at")
        .or("sender_id.eq." + me.id + ",receiver_id.eq." + me.id)
        .order("created_at", { ascending: false });

      if (error) {
        listEl.innerHTML = '<p class="empty-state">Couldn\u2019t load messages right now.</p>';
        return;
      }

      // Collapse to one entry per other-person, keeping their most
      // recent message (the query is already newest-first, so the
      // first time we see a given person is their latest message).
      const byPerson = {};
      const order = [];
      (rows || []).forEach(function (m) {
        const otherId = m.sender_id === me.id ? m.receiver_id : m.sender_id;
        if (!byPerson[otherId]) {
          byPerson[otherId] = m;
          order.push(otherId);
        }
      });

      const { data: blockedRows } = await supabaseClient
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", me.id);
      const blockedIds = new Set((blockedRows || []).map(function (r) { return r.blocked_id; }));
      const visibleOrder = order.filter(function (id) { return !blockedIds.has(id); });

      if (visibleOrder.length === 0) {
        listEl.innerHTML = '<p class="empty-state">No conversations yet \u2014 message someone from My connections.</p>';
        return;
      }

      const { data: profiles } = await supabaseClient
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", visibleOrder);

      const profileById = {};
      (profiles || []).forEach(function (p) { profileById[p.id] = p; });

      listEl.innerHTML = "";
      visibleOrder.forEach(function (otherId) {
        const p = profileById[otherId];
        if (!p) return;
        const lastMsg = byPerson[otherId];
        const isUnread = lastMsg.receiver_id === me.id && !lastMsg.read_at;

        const avatarHtml = p.avatar_url
          ? '<img src="' + p.avatar_url + '" alt="" class="connect-avatar-img">'
          : (p.full_name || "?").charAt(0).toUpperCase();

        const card = document.createElement("div");
        card.className = "connect-card";
        card.style.cursor = "pointer";
        card.innerHTML =
          '<div class="connect-avatar">' + avatarHtml + '</div>' +
          '<div class="connect-info">' +
            '<p class="connect-name">' + escapeHtml(p.full_name) + (isUnread ? ' <span class="unread-dot"></span>' : '') + '</p>' +
            '<p class="connect-shared">' + escapeHtml(lastMsg.content.slice(0, 40)) + (lastMsg.content.length > 40 ? '\u2026' : '') + '</p>' +
          '</div>';
        card.addEventListener("click", function () {
          history.pushState({ universeSubview: "#message-thread" }, "", "#message-thread");
          renderMessageThread(messagesView, p);
        });
        listEl.appendChild(card);
      });
    }

    async function renderMessageThread(container, otherProfile) {
      container.innerHTML =
        '<div class="subview-header">' +
          '<a href="#" class="back-link" id="thread-back">\u2190 Back to messages</a>' +
          '<div style="display:flex; gap:8px; align-items:center;">' +
            '<button type="button" class="card-more-btn" id="thread-more-btn" aria-label="More options">\u22ee</button>' +
            '<button type="button" class="subview-close" id="thread-close" aria-label="Close">\u2715</button>' +
          '</div>' +
        '</div>' +
        '<div class="view-heading"><h2>' + escapeHtml(otherProfile.full_name) + '</h2></div>' +
        '<div id="thread-messages" class="thread-messages">' + skeletonHTML(2) + '</div>' +
        '<form class="thread-form" id="thread-form">' +
          '<input type="text" id="thread-input" placeholder="Message ' + escapeHtml(otherProfile.full_name.split(" ")[0]) + '..." required autocomplete="off">' +
          '<button type="submit" class="btn btn-primary btn-sm">Send</button>' +
        '</form>';

      container.querySelector("#thread-back").addEventListener("click", function (e) {
        e.preventDefault();
        history.back();
      });
      container.querySelector("#thread-close").addEventListener("click", function () {
        history.back();
      });
      container.querySelector("#thread-more-btn").addEventListener("click", function (e) {
        openPersonMenu(e.target, otherProfile, function () { history.back(); });
      });

      const messagesEl = container.querySelector("#thread-messages");
      const { data: userRes } = await supabaseClient.auth.getUser();
      const me = userRes.user;

      async function loadThread() {
        const { data, error } = await supabaseClient
          .from("messages")
          .select("id, sender_id, receiver_id, content, created_at, read_at")
          .or(
            "and(sender_id.eq." + me.id + ",receiver_id.eq." + otherProfile.id + ")," +
            "and(sender_id.eq." + otherProfile.id + ",receiver_id.eq." + me.id + ")"
          )
          .order("created_at", { ascending: true });

        if (error) {
          messagesEl.innerHTML = '<p class="empty-state">Couldn\u2019t load this conversation.</p>';
          return;
        }

        if (!data || data.length === 0) {
          messagesEl.innerHTML = '<p class="empty-state">Say hello \u2014 no messages yet.</p>';
        } else {
          messagesEl.innerHTML = "";
          data.forEach(function (m) {
            const bubble = document.createElement("div");
            bubble.className = "thread-bubble " + (m.sender_id === me.id ? "is-mine" : "is-theirs");
            bubble.textContent = m.content;
            messagesEl.appendChild(bubble);
          });
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        // Mark any messages they sent me as read, now that I've opened the thread.
        const unreadIds = (data || [])
          .filter(function (m) { return m.receiver_id === me.id && !m.read_at; })
          .map(function (m) { return m.id; });

        if (unreadIds.length > 0) {
          supabaseClient
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadIds)
            .then(function () { refreshNotifBadge(); });
        }
      }

      await loadThread();

      container.querySelector("#thread-form").addEventListener("submit", async function (e) {
        e.preventDefault();

        const input = container.querySelector("#thread-input");
        const content = input.value.trim();
        if (!content) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const { error } = await supabaseClient.from("messages").insert({
          sender_id: me.id,
          receiver_id: otherProfile.id,
          content: content,
        });

        submitBtn.disabled = false;

        if (!error) {
          input.value = "";
          loadThread();
        }
      });
    }

    // If Profile is opened while a sub-view hash is already in the URL
    // (e.g. reloaded mid-navigation), clear it so Profile starts clean.
    // This must run BEFORE the pending-message-target check below, or
    // it would immediately wipe out the hash that check pushes.
    if (SUBVIEW_HASHES.indexOf(window.location.hash) !== -1 && !pendingMessageTarget) {
      history.replaceState(null, "", window.location.pathname);
    }

    // If a "Message" button elsewhere (Connect tab, My Connections) set
    // a pending target, jump straight into that thread instead of the
    // inbox list — this is how Profile hands off across tabs.
    if (pendingMessageTarget) {
      const target = pendingMessageTarget;
      pendingMessageTarget = null;
      openSubView("#message-thread", profileMain, messagesView, function () {
        renderMessageThread(messagesView, target);
      });
    }

    // One popstate handler covers every sub-view above — registered
    // fresh each time Profile is opened (and the previous one removed),
    // so back/forward/Escape all resolve correctly no matter which
    // sub-view is currently showing.
    registerSubviewNav(profileMain, {
      groups: { el: groupsView, onShow: function () { renderGroupsList(groupsView); } },
      settings: { el: settingsView },
      downloads: { el: downloadsView },
      connections: { el: connectionsView },
      messages: { el: messagesView },
    });

    return wrap;
  }

  // Wire logout after render, since the link is created dynamically above.
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "logout-link") {
      e.preventDefault();
      supabaseClient.auth.signOut().finally(function () {
        window.location.href = "login.html";
      });
    }
  });

  // ---------- Notifications (header bell) ----------

  const notifBtn = document.getElementById("notif-btn");
  const notifBadge = document.getElementById("notif-badge");
  const notifPanel = document.getElementById("notif-panel");

  function notifTimeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return Math.floor(hrs / 24) + "d ago";
  }

  async function refreshNotifBadge() {
    const { data: userRes } = await supabaseClient.auth.getUser();
    const user = userRes.user;
    if (!user) return;

    const { count } = await supabaseClient
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);

    if (count && count > 0) {
      notifBadge.textContent = count > 9 ? "9+" : String(count);
      notifBadge.hidden = false;
    } else {
      notifBadge.hidden = true;
    }
  }

  async function loadNotifPanel() {
    notifPanel.innerHTML =
      '<div class="notif-panel-header">' +
        '<h4>Notifications</h4>' +
        '<button type="button" class="notif-mark-all" id="notif-mark-all">Mark all read</button>' +
      '</div>' +
      '<div id="notif-items">' + skeletonHTML(3) + '</div>';

    const { data: userRes } = await supabaseClient.auth.getUser();
    const user = userRes.user;
    const itemsEl = notifPanel.querySelector("#notif-items");

    const { data, error } = await supabaseClient
      .from("notifications")
      .select("id, type, content, is_read, created_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      itemsEl.innerHTML = '<p class="empty-state">Couldn\u2019t load notifications.</p>';
      return;
    }

    if (!data || data.length === 0) {
      itemsEl.innerHTML = '<p class="empty-state">No notifications yet.</p>';
      return;
    }

    itemsEl.innerHTML = "";
    data.forEach(function (n) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "notif-item" + (n.is_read ? "" : " is-unread");
      item.innerHTML =
        '<p class="notif-item-text">' + n.content + '</p>' +
        '<p class="notif-item-time">' + notifTimeAgo(n.created_at) + '</p>';

      item.addEventListener("click", async function () {
        if (!n.is_read) {
          await supabaseClient.from("notifications").update({ is_read: true }).eq("id", n.id);
          item.classList.remove("is-unread");
          n.is_read = true;
          refreshNotifBadge();
        }
      });

      itemsEl.appendChild(item);
    });

    notifPanel.querySelector("#notif-mark-all").addEventListener("click", async function () {
      await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      notifPanel.querySelectorAll(".notif-item.is-unread").forEach(function (el) {
        el.classList.remove("is-unread");
      });
      refreshNotifBadge();
    });
  }

  notifBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    const isHidden = notifPanel.hidden;
    notifPanel.hidden = !isHidden;
    if (isHidden) loadNotifPanel();
  });

  document.addEventListener("click", function (e) {
    if (!notifPanel.hidden && !e.target.closest(".notif-wrap")) {
      notifPanel.hidden = true;
    }
  });

  refreshNotifBadge();

  // Initial view
  showView("feed");
})();
