// Language for the static pages: ?lang=, else the browser's (uk / ru / en), with a switcher.
(function () {
  var q = new URLSearchParams(location.search).get("lang");
  var nav = (navigator.language || "en").toLowerCase();
  var lang = q || (nav.indexOf("uk") === 0 ? "uk" : nav.indexOf("ru") === 0 ? "ru" : "en");
  if (["uk", "ru", "en"].indexOf(lang) < 0) lang = "en";
  var set = function (l) {
    document.documentElement.lang = l;
    document.querySelectorAll(".langs button").forEach(function (b) { b.className = b.dataset.set === l ? "on" : ""; });
    var t = document.querySelector('[data-title="' + l + '"]');
    if (t) document.title = t.textContent;
  };
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".langs button"); if (b) set(b.dataset.set); });
  set(lang);
})();
