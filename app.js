(function () {
  "use strict";

  var API = "/api/bookmarks";

  // --- DOM Elements ---
  var form = document.getElementById("bookmark-form");
  var inputTitle = document.getElementById("input-title");
  var inputUrl = document.getElementById("input-url");
  var inputTags = document.getElementById("input-tags");
  var btnAdd = document.getElementById("btn-add");
  var searchInput = document.getElementById("search-input");
  var bookmarkList = document.getElementById("bookmark-list");
  var emptyMessage = document.getElementById("empty-message");

  // --- State ---
  var bookmarks = [];
  var editingId = null;

  // --- API calls ---
  function fetchBookmarks() {
    return fetch(API)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        bookmarks = data;
        render();
      })
      .catch(function (err) {
        console.error("Failed to load bookmarks:", err);
      });
  }

  function createBookmark(title, url, tags) {
    return fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, url: url, tags: tags }),
    })
      .then(function (res) { return res.json(); })
      .then(function (bookmark) {
        bookmarks.unshift(bookmark);
        render();
      });
  }

  function updateBookmark(id, title, url, tags) {
    return fetch(API + "/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, url: url, tags: tags }),
    })
      .then(function (res) { return res.json(); })
      .then(function (updated) {
        var idx = bookmarks.findIndex(function (b) { return b.id === id; });
        if (idx !== -1) {
          bookmarks[idx].title = updated.title;
          bookmarks[idx].url = updated.url;
          bookmarks[idx].tags = updated.tags;
        }
        render();
      });
  }

  function deleteBookmark(id) {
    return fetch(API + "/" + id, {
      method: "DELETE",
    }).then(function () {
      bookmarks = bookmarks.filter(function (b) { return b.id !== id; });
      render();
    });
  }

  // --- Rendering ---
  function render() {
    var query = searchInput.value.toLowerCase().trim();
    var filtered = bookmarks.filter(function (b) {
      if (!query) return true;
      return (
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.tags.some(function (t) { return t.toLowerCase().includes(query); })
      );
    });

    bookmarkList.innerHTML = "";

    filtered.forEach(function (bookmark) {
      var li = document.createElement("li");
      li.className = "bookmark-item";
      li.dataset.id = bookmark.id;

      var tagsHtml = bookmark.tags
        .map(function (t) { return '<span class="tag">' + escapeHtml(t) + "</span>"; })
        .join("");

      li.innerHTML =
        '<div class="bookmark-info">' +
          '<div class="bookmark-title"><a href="' + escapeHtml(bookmark.url) + '" target="_blank" rel="noopener">' + escapeHtml(bookmark.title) + "</a></div>" +
          '<div class="bookmark-url">' + escapeHtml(bookmark.url) + "</div>" +
          (tagsHtml ? '<div class="bookmark-tags">' + tagsHtml + "</div>" : "") +
        "</div>" +
        '<div class="bookmark-actions">' +
          '<button class="btn-edit" title="編集">&#9998;</button>' +
          '<button class="btn-delete" title="削除">&#10005;</button>' +
        "</div>";

      bookmarkList.appendChild(li);
    });

    emptyMessage.classList.toggle("hidden", filtered.length > 0);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Event Handlers ---
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = inputTitle.value.trim();
    var url = inputUrl.value.trim();
    var tags = parseTags(inputTags.value);

    if (!title || !url) return;

    btnAdd.disabled = true;

    var promise;
    if (editingId) {
      promise = updateBookmark(editingId, title, url, tags);
    } else {
      promise = createBookmark(title, url, tags);
    }

    promise
      .then(function () {
        editingId = null;
        btnAdd.textContent = "追加";
        form.reset();
      })
      .catch(function (err) {
        console.error("Save failed:", err);
        alert("保存に失敗しました");
      })
      .finally(function () {
        btnAdd.disabled = false;
      });
  });

  bookmarkList.addEventListener("click", function (e) {
    var target = e.target;
    var li = target.closest(".bookmark-item");
    if (!li) return;
    var id = li.dataset.id;

    if (target.closest(".btn-delete")) {
      deleteBookmark(id);
      if (editingId === id) {
        editingId = null;
        btnAdd.textContent = "追加";
        form.reset();
      }
    }

    if (target.closest(".btn-edit")) {
      var bookmark = bookmarks.find(function (b) { return b.id === id; });
      if (!bookmark) return;
      inputTitle.value = bookmark.title;
      inputUrl.value = bookmark.url;
      inputTags.value = bookmark.tags.join(", ");
      editingId = id;
      btnAdd.textContent = "更新";
      inputTitle.focus();
    }
  });

  searchInput.addEventListener("input", function () {
    render();
  });

  function parseTags(str) {
    return str
      .split(",")
      .map(function (t) { return t.trim(); })
      .filter(Boolean);
  }

  // --- Init ---
  fetchBookmarks();
})();
