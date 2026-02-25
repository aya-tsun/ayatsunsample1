(function () {
  "use strict";

  var API = "/api/bookmarks";
  var TOKEN_KEY = "auth_token";

  // --- DOM Elements ---
  var authSection = document.getElementById("auth-section");
  var appSection = document.getElementById("app-section");
  var authForm = document.getElementById("auth-form");
  var authTitle = document.getElementById("auth-title");
  var authEmail = document.getElementById("auth-email");
  var authPassword = document.getElementById("auth-password");
  var btnAuth = document.getElementById("btn-auth");
  var authError = document.getElementById("auth-error");
  var btnSwitchAuth = document.getElementById("btn-switch-auth");
  var authSwitchText = document.getElementById("auth-switch-text");
  var userInfo = document.getElementById("user-info");
  var userEmailSpan = document.getElementById("user-email");
  var btnLogout = document.getElementById("btn-logout");

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
  var isLoginMode = true;

  // --- Auth helpers ---
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: "Bearer " + getToken() };
  }

  function parseJWT(token) {
    try {
      var parts = token.split(".");
      var payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4) payload += "=";
      return JSON.parse(atob(payload));
    } catch (e) {
      return null;
    }
  }

  function showApp(email) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userInfo.classList.remove("hidden");
    userEmailSpan.textContent = email;
    fetchBookmarks();
  }

  function showAuth() {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userInfo.classList.add("hidden");
    bookmarks = [];
  }

  // --- Auth Events ---
  btnSwitchAuth.addEventListener("click", function () {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
      authTitle.textContent = "ログイン";
      btnAuth.textContent = "ログイン";
      authSwitchText.textContent = "アカウントがない方は";
      btnSwitchAuth.textContent = "新規登録";
    } else {
      authTitle.textContent = "新規登録";
      btnAuth.textContent = "登録";
      authSwitchText.textContent = "既にアカウントがある方は";
      btnSwitchAuth.textContent = "ログイン";
    }
    authError.classList.add("hidden");
  });

  authForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = authEmail.value.trim();
    var password = authPassword.value;

    if (!email || !password) return;

    btnAuth.disabled = true;
    authError.classList.add("hidden");

    var url = isLoginMode ? "/api/auth/login" : "/api/auth/register";

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password }),
    })
      .then(function (res) {
        var contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("サーバーからの応答が不正です（ステータス: " + res.status + "）。Cloudflareの設定（D1バインディング、環境変数）を確認してください");
        }
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) {
          authError.textContent = result.data.error || "エラーが発生しました";
          authError.classList.remove("hidden");
          return;
        }
        setToken(result.data.token);
        authForm.reset();
        showApp(result.data.email);
      })
      .catch(function (err) {
        authError.textContent = err.message || "通信エラーが発生しました";
        authError.classList.remove("hidden");
      })
      .finally(function () {
        btnAuth.disabled = false;
      });
  });

  btnLogout.addEventListener("click", function () {
    removeToken();
    showAuth();
  });

  // --- API calls ---
  function fetchBookmarks() {
    return fetch(API, { headers: authHeaders() })
      .then(function (res) {
        if (res.status === 401) { removeToken(); showAuth(); return []; }
        return res.json();
      })
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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

  // --- Bookmark Event Handlers ---
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
  var token = getToken();
  if (token) {
    var payload = parseJWT(token);
    if (payload && payload.exp && payload.exp > Date.now() / 1000) {
      showApp(payload.email);
    } else {
      removeToken();
      showAuth();
    }
  } else {
    showAuth();
  }
})();
