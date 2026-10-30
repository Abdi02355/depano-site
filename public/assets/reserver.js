/* =====================================================================
   DÉPANO — réservation directe par WhatsApp
   Le client choisit un service (et son quartier s'il veut),
   WhatsApp s'ouvre avec un message prêt. Les détails se règlent là-bas.
   ===================================================================== */
(function () {
  "use strict";
  var CAT = window.DEPANO_CATALOG || { categories: [] };
  var form = document.querySelector("form.rv-book");
  if (!form) return;

  var cats = {}, subs = {};
  CAT.categories.forEach(function (c) {
    cats[c.slug] = c;
    (c.subs || []).forEach(function (s) { subs[s.slug] = { sub: s, cat: c }; });
  });

  function pick(slug) {
    var r = form.querySelector('input[name="service"][value="' + slug + '"]');
    if (r) r.checked = true;
  }
  var params = new URLSearchParams(location.search);
  var key = decodeURIComponent((location.hash || "").slice(1)) || params.get("prestation") || params.get("categorie") || params.get("service") || "";
  if (cats[key]) pick(key);
  else if (subs[key]) {
    pick(subs[key].cat.slug);
    var box = form.querySelector("[data-presta]");
    var name = subs[key].sub.name || subs[key].sub.nom || "";
    if (box && name) {
      box.innerHTML = "Prestation : <b></b>";
      box.querySelector("b").textContent = name;
      box.hidden = false;
      form.setAttribute("data-prestation", name);
    }
  }
  var q = params.get("quartier");
  if (q) {
    var sel = form.querySelector('select[name="quartier"]');
    if (sel) {
      var ok = Array.prototype.some.call(sel.options, function (o) { return o.value === q || o.text === q; });
      if (ok) sel.value = q;
    }
  }
})();
