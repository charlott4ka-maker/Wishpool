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
  var tab = "stats";
  var focusBanner = null;     // the banner shown in the phone preview

  function toast(t) { var el = $("toast"); el.textContent = t; el.style.display = "block"; clearTimeout(toast.t); toast.t = setTimeout(function () { el.style.display = "none"; }, 2200); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function api(method, path, body) {
    return fetch("/api" + path, { method: method, headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}), body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || "http_" + r.status); e.status = r.status; throw e; } return j; }); });
  }
  function show(id, on) { $(id).classList.toggle("hidden", !on); }

  // ---------- sign-in: one login and password (server/admin-auth.js) ----------
  $("login").onsubmit = function (e) {
    e.preventDefault();
    $("loginErr").textContent = "";
    api("POST", "/admin-login", { login: $("lgn").value.trim(), password: $("pwd").value }).then(function (r) {
      token = r.token; localStorage.setItem("wp_admin_token", token); $("pwd").value = ""; start();
    }).catch(function (er) {
      $("loginErr").textContent = er.message === "too_soon" ? "Подожди пару секунд и попробуй ещё раз" : er.message === "not_configured" ? "Пароль админки не задан на сервере" : "Неверный логин или пароль";
    });
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
      renderAll(); loadStats(); startPreview();
    }).catch(function () {
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
      pv.clearMark(); pv.note("");
      if (tab === "reports") loadReports();
      if (tab === "stats") loadStats();
      if (tab === "banners") { pv.go("/"); pv.push(); }
      if (tab === "stickers") pv.go("/wish/new");
    };
  });
  function dirty(key) { return JSON.stringify(saved[key]) !== JSON.stringify(draft[key]); }
  function updateBar() { $("bar").classList.toggle("show", ["banners", "strings", "stickers"].some(dirty)); pv.push(); }
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
    return '<div class="item' + (b.id === focusBanner ? " focus" : "") + '" data-bid="' + esc(b.id) + '">' +
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
      "</div>";
  }
  function renderBanners() {
    $("bannerList").innerHTML = draft.banners.length ? draft.banners.map(bannerHtml).join("") : '<p class="hint" style="margin-top:12px">Баннеров пока нет.</p>';
  }
  $("addBanner").onclick = function () {
    var id = "b" + Date.now().toString(36);
    focusBanner = id;
    draft.banners.push({ id: id, active: false, audience: "signedIn", text: { uk: "", ru: "", en: "" }, color1: "#047DFB", color2: "#2290F6", textColor: "#FFFFFF", sticker: "", action: "none", url: "", dismissible: true });
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
    updateBar();
  }
  $("bannerList").addEventListener("click", function (e) {
    var item = e.target.closest(".item");
    if (item && item.dataset.bid !== focusBanner) {
      focusBanner = item.dataset.bid;
      document.querySelectorAll("#bannerList .item").forEach(function (x) { x.classList.toggle("focus", x === item); });
      pv.go("/"); pv.push();
    }
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
      var scr = data.screens && data.screens[k];
      return '<div class="item' + (draft.strings[k] ? " changed" : "") + (k === focusKey ? " focus" : "") + '" data-key="' + esc(k) + '"><div class="row"><span class="key">' + esc(k) + "</span>" +
        '<span class="where">' + (scr ? "Экран: " + esc(SCREEN_NAME[scr.split("?")[0]] || scr) : "Только в Telegram Mini App") + "</span>" +
        (draft.strings[k] ? '<button class="btn2 ghost sm" data-reset="' + esc(k) + '">Вернуть стандартный</button>' : "") + "</div>" +
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
    clearTimeout(focusString.t); focusString.t = setTimeout(function () { focusString(k, false); }, 350);
  });
  $("stringList").addEventListener("click", function (e) {
    var k = e.target.dataset && e.target.dataset.reset;
    if (k) { delete draft.strings[k]; renderStrings(); updateBar(); focusString(k, false); return; }
    var item = e.target.closest(".item");
    if (item && item.dataset.key) focusString(item.dataset.key, true);
  });
  $("stringList").addEventListener("focusin", function (e) {
    var item = e.target.closest(".item");
    if (item && item.dataset.key && item.dataset.key !== focusKey) focusString(item.dataset.key, true);
  });
  var focusKey = null;
  function pvPath() { return pv.path(); }
  // open the text's screen in the phone and light the text up
  function focusString(k, go) {
    focusKey = k;
    document.querySelectorAll("#stringList .item").forEach(function (x) { x.classList.toggle("focus", x.dataset.key === k); });
    var scr = data.screens && data.screens[k];
    if (!scr) { pv.note("Этого текста нет в iPhone-приложении: он только в Telegram Mini App."); pv.clearMark(); return; }
    if (go && scr !== pvPath()) pv.go(scr);
    var l = pv.lang(), own = draft.strings[k] || {}, def = data.strings[k] || {};
    pv.mark(own[l] || def[l] || def.en || "");
  }

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
  $("stkFile").addEventListener("change", function () {
    var f = $("stkFile").files[0];
    $("stkFileName").textContent = f ? f.name : "PNG или WebP";
    $("stkFileBox").classList.toggle("has", !!f);
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
        $("stkName").value = ""; $("stkFile").value = ""; $("stkFileName").textContent = "PNG или WebP"; $("stkFileBox").classList.remove("has");
        renderStickers(); updateBar(); renderBanners(); toast("Стикер добавлен");
      }).catch(function (e) { toast(e.message === "name_taken" ? "Такое имя уже есть" : e.message === "too_big" ? "Файл слишком большой" : "Ошибка: " + e.message); });
    };
    img.onerror = function () { toast("Не получилось открыть картинку"); };
    img.src = URL.createObjectURL(file);
  };

  // ---------- reports ----------
  var REASON = { spam: "Спам", offensive: "Оскорбления", inappropriate: "Недопустимый контент", other: "Другое" };
  function loadReports() {
    $("reportList").innerHTML = '<p class="hint">Загружаю…</p>';
    api("GET", "/admin/reports").then(function (r) {
      var list = r.reports || [];
      $("reportList").innerHTML = list.length ? list.map(function (x) {
        var w = x.wish;
        return '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(REASON[x.reason] || x.reason) + '</b><span class="key">' + new Date(x.createdAt).toLocaleString("ru") + "</span></div>" +
          '<p class="hint" style="margin-top:8px">На: <b>' + esc(x.user ? x.user.name : x.userId) + '</b> <span class="key">' + esc(x.userId) + "</span><br>От: " + esc(x.reporter ? x.reporter.name : x.reporterId) + "</p>" +
          (w ? '<div class="row" style="margin-top:8px">' + (w.image ? '<img src="' + esc(w.image) + '" style="width:56px;height:56px;border-radius:12px;object-fit:cover" />' : "") +
            "<div><b>" + esc(w.title) + "</b>" + (w.note ? '<div class="hint">' + esc(w.note) + "</div>" : "") + (w.link ? '<div class="hint">' + esc(w.link) + "</div>" : "") + "</div></div>" :
            (x.wishId ? '<p class="hint">Желание уже удалено</p>' : "")) +
          '<div class="row" style="margin-top:12px">' + (w ? '<button class="btn2 danger sm" data-delwish="' + esc(w.id) + '" data-rep="' + esc(x.id) + '">Удалить желание</button>' : "") +
          '<button class="btn2 ghost sm" data-close="' + esc(x.id) + '">Закрыть жалобу</button></div></div>';
      }).join("") : '<p class="hint" style="margin-top:12px">Жалоб нет.</p>';
    }).catch(function (e) { $("reportList").innerHTML = '<p class="hint">Ошибка: ' + esc(e.message) + "</p>"; });
  }
  $("reportList").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.delwish) {
      if (!confirm("Удалить это желание у пользователя навсегда?")) return;
      api("DELETE", "/admin/wishes/" + b.dataset.delwish).then(function () { return api("DELETE", "/admin/reports/" + b.dataset.rep); })
        .then(function () { toast("Желание удалено"); loadReports(); }).catch(function (er) { toast("Ошибка: " + er.message); });
    } else if (b.dataset.close) {
      api("DELETE", "/admin/reports/" + b.dataset.close).then(function () { toast("Жалоба закрыта"); loadReports(); }).catch(function (er) { toast("Ошибка: " + er.message); });
    }
  });

  // ---------- stats ----------
  function kpi(n, label, sub) { return '<div class="kpi"><div class="n">' + n + '</div><div class="l">' + label + "</div>" + (sub ? '<div class="s">' + sub + "</div>" : "") + "</div>"; }
  // event names as in the Mini App's own stats screen (web/src/App.jsx)
  var EVENT = { open: "Открыли приложение", tab_pool: "Вкладка «Желания»", tab_rooms: "Вкладка «Комнаты»", tab_profile: "Вкладка «Профиль»", ov_add: "Открыли «Новое желание»", ov_room: "Открыли комнату", ov_pool: "Добавить из моих желаний", ov_idea: "Идея подарка", ov_history: "История подарков", ov_invites: "Мои приглашения", ov_gate: "Экран приглашения", ov_analytics: "Аналитика", share_room: "Поделились комнатой", share_app: "Поделились приложением", onboard_done: "Прошли онбординг", s_wish: "Добавили желание", s_wish_link: "Добавили желание по ссылке", s_room_friends: "Создали комнату «Друзья»", s_room_couple: "Создали комнату «Пара»", s_room_birthday: "Создали комнату «День рождения»", s_join: "Вступили в комнату", s_take: "Взяли подарок", s_chip: "Скинулись", s_gifted: "Отметили «Мне подарили»" };
  function loadStats() {
    if (!$("stats").innerHTML) $("stats").innerHTML = '<p class="hint" style="margin-top:12px">Загружаю…</p>';
    api("GET", "/admin/stats").then(function (s) {
      var max = Math.max(1, Math.max.apply(null, s.days.map(function (d) { return Math.max(d.active, d.new); })));
      var bars = s.days.map(function (d) {
        var dt = new Date(d.day + "T00:00:00Z");
        return '<div class="c" title="' + d.day + ": активных " + d.active + ", новых " + d.new + '"><div class="bars">' +
          '<div class="b" style="height:' + (d.active / max * 100) + '%;background:var(--blue)"></div>' +
          '<div class="b" style="height:' + (d.new / max * 100) + '%;background:#34C759"></div></div>' +
          '<div class="d">' + dt.getUTCDate() + "</div></div>";
      }).join("");
      $("stats").innerHTML =
        '<div class="kpis">' +
        kpi(s.online, "Сейчас в приложении", "за последние 5 минут") +
        kpi(s.active1, "Активных сегодня") + kpi(s.active7, "За 7 дней") + kpi(s.active30, "За 30 дней") +
        kpi(s.total, "Всего пользователей", "из них iPhone: " + (s.ios || 0)) +
        kpi(s.new1, "Новых сегодня", "за 7 дней: " + s.new7) +
        kpi(s.wishes, "Желаний", "за 7 дней: +" + s.wishes7) + kpi(s.rooms, "Комнат", "за 7 дней: +" + s.rooms7) +
        kpi(s.reserved, "Подарков взяли", "вскладчину: " + s.chips) + kpi(s.gifted, "Подарено") +
        kpi(s.invites, "Пришли по приглашению") + kpi(s.reports || 0, "Открытых жалоб") +
        "</div>" +
        '<h3 style="margin:24px 0 0">Последние 14 дней</h3><div class="chart">' + bars + "</div>" +
        '<div class="legend"><span><i style="background:var(--blue)"></i>Активные</span><span><i style="background:#34C759"></i>Новые</span></div>' +
        (s.clicks && s.clicks.length ? '<h3 style="margin:24px 0 0">Что делают за 7 дней</h3><table class="ev">' + s.clicks.slice(0, 15).map(function (c) {
          return "<tr><td>" + esc(EVENT[c.name] || c.name) + ' <span class="key">' + esc(c.name) + '</span></td><td class="n">' + c.n + " раз · " + c.users + " чел.</td></tr>";
        }).join("") + "</table>" : "");
    }).catch(function (e) { $("stats").innerHTML = '<p class="hint" style="margin-top:12px">Ошибка: ' + esc(e.message) + "</p>"; });
  }
  $("statsReload").onclick = loadStats;

  // ---------- phone preview ----------
  // The iPhone app's web build in an iframe (same site), as a guest with the demo
  // content. It exposes window.__wpPreview (mobile/src/lib/adminPreview.ts).
  var SCREENS = [["/", "Желания"], ["/rooms", "Комнаты"], ["/room/r-friends", "Комната"], ["/wish/w1", "Желание"], ["/profile", "Профиль"],
    ["/settings", "Настройки"], ["/faq", "Вопросы и ответы"], ["/wish/new", "Новое желание"], ["/room/new", "Новая комната"], ["/room/pick", "Выбор желаний"],
    ["/birthday", "День рождения"], ["/profile-edit", "Редактирование профиля"], ["/sign-in-options", "Вход"], ["/onboarding", "Онбординг"]];
  var SCREEN_NAME = {}; SCREENS.forEach(function (x) { SCREEN_NAME[x[0]] = x[1]; });
  var pv = (function () {
    var frame = $("pv"), cur = "/", markText = "", pushT;
    function api() { try { return frame.contentWindow && frame.contentWindow.__wpPreview; } catch (e) { return null; } }
    function doc() { try { return frame.contentDocument; } catch (e) { return null; } }
    function lang() { return $("pvLang").value; }
    function load() { frame.src = "/admin/preview" + (cur === "/" ? "/" : cur) + (cur.indexOf("?") >= 0 ? "&" : "?") + "lang=" + lang(); }
    function cfg() {
      var banners = draft ? draft.banners : [];
      var forced = tab === "banners" ? (banners.some(function (b) { return b.id === focusBanner; }) ? focusBanner : banners[0] && banners[0].id) : null;
      return draft ? { strings: draft.strings, banners: banners, stickers: draft.stickers, previewBanner: forced || null } : null;
    }
    function push() { clearTimeout(pushT); pushT = setTimeout(function () { var a = api(), c = cfg(); if (a && c) a.setConfig(c); }, 120); }
    function go(path) {
      markText = ""; clearMark();
      cur = path; $("pvScreen").value = path.split("?")[0];
      var a = api();
      if (a && a.ready) a.go(path); else load();
    }
    function note(t) { $("pvNote").textContent = t || ""; }
    function clearMark() { var d = doc(), o = d && d.getElementById("wp-mark"); if (o) o.remove(); }
    // finds the text on the screen (waiting for the screen to open) and outlines it
    function mark(text) {
      markText = text; clearMark(); note("");
      var parts = String(text).split(/\{\w+\}/).map(function (x) { return x.trim(); }).sort(function (a, b) { return b.length - a.length; });
      var needle = (parts[0] || "").replace(/\s+/g, " ").slice(0, 60);
      if (!needle) return;
      var tries = 0;
      (function find() {
        if (markText !== text) return;
        var d = doc(), el = null;
        if (d && d.body) {
          var w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), n;
          while ((n = w.nextNode())) {
            if (n.nodeValue.replace(/\s+/g, " ").indexOf(needle) >= 0) {
              var p = n.parentElement, r = p && p.getBoundingClientRect();
              if (r && r.width > 0 && r.height > 0) { el = p; break; }
            }
          }
        }
        if (!el) {
          if (++tries < 25) return setTimeout(find, 200);
          return note("На этом экране текст не виден: он во всплывающем окне, уведомлении или в другом состоянии экрана.");
        }
        el.scrollIntoView({ block: "center" });
        setTimeout(function () {
          var r = el.getBoundingClientRect(), o = d.createElement("div");
          o.id = "wp-mark";
          o.style.cssText = "position:fixed;z-index:99999;pointer-events:none;border-radius:10px;border:2px solid #0A82F9;box-shadow:0 0 0 4px rgba(10,130,249,.25),0 0 24px rgba(10,130,249,.6);left:" + (r.left - 6) + "px;top:" + (r.top - 4) + "px;width:" + (r.width + 12) + "px;height:" + (r.height + 8) + "px";
          clearMark(); d.body.appendChild(o);
        }, 250);
      })();
    }
    frame.addEventListener("load", function () {
      var tries = 0;
      (function wait() { var a = api(); if (a) { push(); if (markText) mark(markText); } else if (++tries < 50) setTimeout(wait, 100); })();
    });
    return { path: function () { return cur; }, start: load, go: go, push: push, mark: mark, clearMark: clearMark, note: note, lang: lang };
  })();
  function startPreview() {
    $("pvScreen").innerHTML = SCREENS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + "</option>"; }).join("");
    pv.start(); fitPhone();
  }
  $("pvScreen").onchange = function () { pv.go(this.value === "/room/pick" ? "/room/pick?id=r-friends" : this.value); };
  $("pvLang").onchange = function () { pv.start(); };
  // the whole phone fits the window height
  function fitPhone() {
    var s = Math.min(1, Math.max(0.45, (window.innerHeight - 250) / 954)), ph = $("phone");
    ph.style.transform = "scale(" + s + ")";
    ph.style.marginBottom = (954 * s - 954) + "px";
    ph.style.marginLeft = ph.style.marginRight = (452 * s - 452) / 2 + "px";
  }
  window.addEventListener("resize", fitPhone);

  start();
})();
