(function () {
  "use strict";

  const STORAGE_KEY = "bookmarks";

  // --- DOM Elements ---
  const form = document.getElementById("bookmark-form");
  const inputTitle = document.getElementById("input-title");
  const inputUrl = document.getElementById("input-url");
  const inputTags = document.getElementById("input-tags");
  const btnAdd = document.getElementById("btn-add");
  const searchInput = document.getElementById("search-input");
  const bookmarkList = document.getElementById("bookmark-list");
  const emptyMessage = document.getElementById("empty-message");

  // --- State ---
  let bookmarks = loadBookmarks();
  let editingId = null;

  // --- Storage ---
  function loadBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveBookmarks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }

  // --- Rendering ---
  function render(filter) {
    const query = (filter ?? searchInput.value).toLowerCase().trim();
    const filtered = bookmarks.filter(function (b) {
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

  // --- CRUD ---
  function addBookmark(title, url, tags) {
    var bookmark = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: title,
      url: url,
      tags: tags,
      createdAt: new Date().toISOString(),
    };
    bookmarks.unshift(bookmark);
    saveBookmarks();
    render();
  }

  function updateBookmark(id, title, url, tags) {
    var idx = bookmarks.findIndex(function (b) { return b.id === id; });
    if (idx === -1) return;
    bookmarks[idx].title = title;
    bookmarks[idx].url = url;
    bookmarks[idx].tags = tags;
    saveBookmarks();
    render();
  }

  function deleteBookmark(id) {
    bookmarks = bookmarks.filter(function (b) { return b.id !== id; });
    saveBookmarks();
    render();
  }

  // --- Event Handlers ---
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = inputTitle.value.trim();
    var url = inputUrl.value.trim();
    var tags = parseTags(inputTags.value);

    if (!title || !url) return;

    if (editingId) {
      updateBookmark(editingId, title, url, tags);
      editingId = null;
      btnAdd.textContent = "追加";
    } else {
      addBookmark(title, url, tags);
    }

    form.reset();
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
  render();
})();
