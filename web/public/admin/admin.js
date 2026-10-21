// Wishpool admin page: banners, text overrides and stickers for the iOS app.
// Sign-in is the app's own e-mail code; the server only lets ADMIN_EMAILS /
// ADMIN_IDS through. Nothing here is secret: every change goes through the
// server's checks (server/app-config.js).
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var LANGS = ["uk", "ru", "en"];
  var LNAME = { uk: "UA", ru: "RU", en: "EN" };
  var token = localStorage.getItem("wp_admin_token") || "";
  var data = null;            // app-data.json: built-in texts and stickers
  var saved = null;           // config as on the server
  var draft = null;           // config being edited
  var tab = "banners";

  function toast(t) { var el = $("toast"); el.textContent = t; el.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(function () { el.style.display = "none"; }, 2200); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function api(method, path, body) {
    return fetch("/api" + path, { method: method, headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}), body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || "http_" + r.status); e.status = r.status; throw e; } return j; }); });
  }
  function show(id, on) { $(id).classList.toggle("hidden", !on); }

  // ---------- sign-in ----------
  var sent = false;
  $("loginBtn").onclick = function () {
    var email = $("email").value.trim().toLowerCase();
    $("loginErr").textContent = "";
    if (!sent) {
      api("POST", "/auth/email/start", { email: email, lang: "ru" }).then(function () {
        sent = true; show("codeBox", true); $("loginBtn").textContent = "Войти"; $("code").focus();
      }).catch(function (e) { $("loginErr").textContent = e.message === "too_soon" ? "Код уже отправлен, подожди полминуты" : "Не получилось отправить код (" + e.message + ")"; });
    } else {
      api("POST", "/auth/email/verify", { email: email, code: $("code").value.trim() }).then(function (r) {
        token = r.token; localStorage.setItem("wp_admin_token", token); start();
      }).catch(function () { $("loginErr").textContent = "Неверный или устаревший код"; });
    }
  };
  $("logout").onclick = function () { localStorage.removeItem("wp_admin_token"); token = ""; location.reload(); };

  function start() {
    show("login", false);
    if (!token) { show("login", true); return; }
    Promise.all([api("GET", "/admin/config"), fetch("/admin/app-data.json").then(function (r) { return r.json(); })]).then(function (res) {
      saved = { strings: res[0].strings || {}, banners: res[0].banners || [], stickers: res[0].stickers || { hidden: [], extra: [] } };
      draft = clone(saved);
      data = res[1];
      show("noStorage", !res[0].storage);
      show("app", true); show("logout", true);
      renderAll();
    }).catch(function (e) {
      if (e.status === 403) { show("denied", true); show("logout", true); return; }
      localStorage.removeItem("wp_admin_token"); token = ""; show("login", true);
    });
  }

  // ---------- tabs and the save bar ----------
  document.querySelectorAll(".tabs button").forEach(function (b) {
    b.onclick = function () {
      tab = b.dataset.tab;
      document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
      document.querySelectorAll("[data-pane]").forEach(function (p) { p.classList.toggle("hidden", p.dataset.pane !== tab); });
      updateBar();
    };
  });
  function dirty(key) { return JSON.stringify(saved[key]) !== JSON.stringify(draft[key]); }
  function updateBar() { $("bar").classList.toggle("show", ["banners", "strings", "stickers"].some(dirty)); }
  $("discard").onclick = function () { draft = clone(saved); renderAll(); };
  $("save").onclick = function () {
    var keys = ["banners", "strings", "stickers"].filter(dirty);
    Promise.all(keys.map(function (k) { return api("PUT", "/admin/config/" + k, { value: draft[k] }).then(function (r) { saved[k] = r.value; }); }))
      .then(function () { draft = clone(saved); renderAll(); toast("Сохранено"); })
      .catch(function (e) { toast("Ошибка: " + e.message); });
  };
  window.addEventListener("beforeunload", function (e) { if (draft && ["banners", "strings", "stickers"].some(dirty)) { e.preventDefault(); e.returnValue = ""; } });

  function renderAll() { renderBanners(); renderStrings(); renderStickers(); updateBar(); }

  // ---------- banners ----------
  function stickerUrl(name) { return "/stickers/" + name + ".webp"; }
  function allStickerNames() { return data.stickers.inPicker.concat(draft.stickers.extra.map(function (s) { return s.name; })); }
  function bannerHtml(b, i) {
    var stickers = allStickerNames().map(function (n) { return '<option value="stk:' + n + '"' + (b.sticker === "stk:" + n ? " selected" : "") + ">" + n + "</option>"; }).join("");
    var texts = LANGS.map(function (l) { return '<div><label class="f">Текст ' + LNAME[l] + '</label><textarea data-b="' + i + '" data-k="text.' + l + '" maxlength="200">' + esc(b.text[l]) + "</textarea></div>"; }).join("");
    return '<div class="item">' +
      '<div class="row"><label class="row" style="gap:6px;font-weight:700"><input type="checkbox" data-b="' + i + '" data-k="active"' + (b.active ? " checked" : "") + "> Включён</label>" +
      '<button class="btn2 danger sm" data-del="' + i + '" style="margin-left:auto">Удалить</button></div>' +
      '<label class="f">Кому показывать</label><select data-b="' + i + '" data-k="audience">' +
      [["signedIn", "Только вошедшим в аккаунт"], ["guest", "Только гостям (вместо плашки «Войти»)"], ["all", "Всем"]].map(function (o) { return '<option value="' + o[0] + '"' + (b.audience === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" +
      '<div class="grid3">' + texts + "</div>" +
      '<div class="row" style="margin-top:12px;gap:16px">' +
      '<label class="row hint" style="gap:6px"><input type="color" data-b="' + i + '" data-k="color1" value="' + b.color1 + '"> Цвет слева</label>' +
      '<label class="row hint" style="gap:6px"><input type="color" data-b="' + i + '" data-k="color2" value="' + b.color2 + '"> Цвет справа</label>' +
      '<label class="row hint" style="gap:6px"><input type="color" data-b="' + i + '" data-k="textColor" value="' + b.textColor + '"> Текст</label></div>' +
      '<label class="f">Стикер</label><select data-b="' + i + '" data-k="sticker"><option value="">без стикера</option>' + stickers + "</select>" +
      '<label class="f">По нажатию</label><select data-b="' + i + '" data-k="action">' +
      [["none", "Ничего"], ["signin", "Открыть вход в аккаунт"], ["link", "Открыть ссылку"]].map(function (o) { return '<option value="' + o[0] + '"' + (b.action === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" +
      (b.action === "link" ? '<label class="f">Ссылка (https://…)</label><input type="url" data-b="' + i + '" data-k="url" value="' + esc(b.url) + '" placeholder="https://">' : "") +
      '<label class="row hint" style="gap:6px;margin-top:12px"><input type="checkbox" data-b="' + i + '" data-k="dismissible"' + (b.dismissible ? " checked" : "") + "> Можно закрыть крестиком</label>" +
      '<label class="f">Как будет выглядеть (RU)</label>' +
      '<div class="preview" style="background:linear-gradient(90deg,' + b.color1 + "," + b.color2 + ");color:" + b.textColor + '">' +
      (b.sticker ? '<img src="' + stickerUrl(b.sticker.slice(4)) + '" alt="">' : "") +
      "<span>" + esc(b.text.ru || b.text.en || b.text.uk || "Текст баннера") + "</span>" +
      (b.dismissible || b.action !== "none" ? '<span class="b">' + (b.dismissible ? "✕" : "›") + "</span>" : "") +
      '</div><div class="previewunder"></div></div>';
  }
  function renderBanners() {
    $("bannerList").innerHTML = draft.banners.length ? draft.banners.map(bannerHtml).join("") : '<p class="hint" style="margin-top:12px">Баннеров пока нет.</p>';
  }
  $("addBanner").onclick = function () {
    draft.banners.push({ id: "b" + Date.now().toString(36), active: false, audience: "signedIn", text: { uk: "", ru: "", en: "" }, color1: "#047DFB", color2: "#2290F6", textColor: "#FFFFFF", sticker: "", action: "none", url: "", dismissible: true });
    renderBanners(); updateBar();
  };
  $("bannerList").addEventListener("input", onBannerEdit);
  $("bannerList").addEventListener("change", onBannerEdit);
  function onBannerEdit(e) {
    var el = e.target, i = el.dataset.b, k = el.dataset.k;
    if (i == null || !k) return;
    var b = draft.banners[+i];
    var v = el.type === "checkbox" ? el.checked : el.value;
    if (k.indexOf("text.") === 0) b.text[k.slice(5)] = v; else b[k] = v;
    // redraw the preview (and the link field) without losing the caret in a text field
    // only selects, checkboxes and colours redraw the card: a text field's "change"
    // fires when it loses focus, and a redraw then would swallow the next click
    if (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "color") { if (e.type === "change" || el.type === "color") renderBanners(); }
    else {
      var item = el.closest(".item"), pv = item.querySelector(".preview span");
      if (pv && k.indexOf("text.") === 0) pv.textContent = b.text.ru || b.text.en || b.text.uk || "Текст баннера";
    }
    updateBar();
  }
  $("bannerList").addEventListener("click", function (e) {
    var d = e.target.dataset && e.target.dataset.del;
    if (d == null) return;
    if (!confirm("Удалить этот баннер?")) return;
    draft.banners.splice(+d, 1); renderBanners(); updateBar();
  });

  // ---------- texts ----------
  function renderStrings() {
    var q = $("q").value.trim().toLowerCase(), only = $("onlyChanged").checked;
    var keys = Object.keys(data.strings).filter(function (k) {
      if (only && !draft.strings[k]) return false;
      if (!q) return true;
      var row = data.strings[k], own = draft.strings[k] || {};
      return k.toLowerCase().indexOf(q) >= 0 || LANGS.some(function (l) { return String(row[l] || "").toLowerCase().indexOf(q) >= 0 || String(own[l] || "").toLowerCase().indexOf(q) >= 0; });
    });
    var shown = keys.slice(0, 40);
    $("stringList").innerHTML = shown.map(function (k) {
      var row = data.strings[k], own = draft.strings[k] || {};
      return '<div class="item' + (draft.strings[k] ? " changed" : "") + '"><div class="row"><span class="key">' + esc(k) + "</span>" +
        (draft.strings[k] ? '<button class="btn2 ghost sm" data-reset="' + esc(k) + '" style="margin-left:auto">Вернуть стандартный</button>' : "") + "</div>" +
        '<div class="grid3" style="margin-top:8px">' + LANGS.map(function (l) {
          return '<div><label class="f" style="margin-top:0">' + LNAME[l] + '</label><textarea data-s="' + esc(k) + '" data-lang="' + l + '" placeholder="' + esc(row[l] || "") + '">' + esc(own[l] || "") + "</textarea>" +
            '<div class="def">' + esc(row[l] || "") + "</div></div>";
        }).join("") + "</div></div>";
    }).join("") + (keys.length > shown.length ? '<p class="hint" style="margin-top:12px">Показаны первые 40 из ' + keys.length + ", уточни поиск.</p>" : "") +
      (!keys.length ? '<p class="hint" style="margin-top:12px">Ничего не найдено.</p>' : "");
  }
  $("q").addEventListener("input", renderStrings);
  $("onlyChanged").addEventListener("change", renderStrings);
  $("stringList").addEventListener("input", function (e) {
    var el = e.target, k = el.dataset.s, l = el.dataset.lang;
    if (!k) return;
    var own = Object.assign({}, draft.strings[k] || {});
    if (el.value.trim()) own[l] = el.value; else delete own[l];
    if (Object.keys(own).length) draft.strings[k] = own; else delete draft.strings[k];
    el.closest(".item").classList.toggle("changed", !!draft.strings[k]);
    updateBar();
  });
  $("stringList").addEventListener("click", function (e) {
    var k = e.target.dataset && e.target.dataset.reset;
    if (!k) return;
    delete draft.strings[k]; renderStrings(); updateBar();
  });

  // ---------- stickers ----------
  function renderStickers() {
    var hidden = draft.stickers.hidden;
    var tiles = data.stickers.inPicker.map(function (n) { return { n: n, isNew: false }; })
      .concat(draft.stickers.extra.map(function (s) { return { n: s.name, isNew: true }; }));
    $("stickerGrid").innerHTML = tiles.map(function (t) {
      var off = hidden.indexOf(t.n) >= 0;
      return '<div class="s' + (off ? " off" : "") + (t.isNew ? " new" : "") + '" data-n="' + t.n + '"><img src="' + stickerUrl(t.n) + '" alt="">' + esc(t.n) +
        (off ? "<br>скрыт" : "") + (t.isNew ? '<br><button class="btn2 danger sm" data-rm="' + t.n + '" style="margin-top:6px">Удалить</button>' : "") + "</div>";
    }).join("");
  }
  $("stickerGrid").addEventListener("click", function (e) {
    var rm = e.target.dataset && e.target.dataset.rm;
    if (rm) {
      e.stopPropagation();
      if (!confirm("Удалить стикер «" + rm + "» из приложения? Желания, где он уже стоит, его не потеряют.")) return;
      draft.stickers.extra = draft.stickers.extra.filter(function (s) { return s.name !== rm; });
      draft.stickers.hidden = draft.stickers.hidden.filter(function (n) { return n !== rm; });
      renderStickers(); updateBar(); return;
    }
    var tile = e.target.closest(".s");
    if (!tile) return;
    var n = tile.dataset.n, h = draft.stickers.hidden;
    draft.stickers.hidden = h.indexOf(n) >= 0 ? h.filter(function (x) { return x !== n; }) : h.concat([n]);
    renderStickers(); updateBar();
  });
  // the file becomes a square WebP of at most 512px in the browser, then goes up
  $("stkUpload").onclick = function () {
    var name = $("stkName").value.trim().toLowerCase(), file = $("stkFile").files[0];
    if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(name)) return toast("Имя: латиница, цифры, - и _");
    if (data.stickers.bundled.indexOf(name) >= 0 || draft.stickers.extra.some(function (s) { return s.name === name; })) return toast("Такое имя уже есть");
    if (!file) return toast("Выбери файл");
    var img = new Image();
    img.onload = function () {
      var side = Math.min(512, Math.max(img.width, img.height));
      var c = document.createElement("canvas"); c.width = side; c.height = side;
      var s = side / Math.max(img.width, img.height), w = img.width * s, h = img.height * s;
      c.getContext("2d").drawImage(img, (side - w) / 2, (side - h) / 2, w, h);
      var url = c.toDataURL("image/webp", 0.9);
      if (url.indexOf("data:image/webp") !== 0) return toast("Этот браузер не умеет WebP, загрузи из Chrome");
      api("POST", "/admin/sticker", { name: name, image: url }).then(function (r) {
        saved.stickers = r.value; draft.stickers.extra = clone(r.value.extra);
        $("stkName").value = ""; $("stkFile").value = "";
        renderStickers(); updateBar(); renderBanners(); toast("Стикер добавлен");
      }).catch(function (e) { toast(e.message === "name_taken" ? "Такое имя уже есть" : e.message === "too_big" ? "Файл слишком большой" : "Ошибка: " + e.message); });
    };
    img.onerror = function () { toast("Не получилось открыть картинку"); };
    img.src = URL.createObjectURL(file);
  };

  start();
})();
