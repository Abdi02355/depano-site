/* =====================================================================
   DÉPANO — réservation en 4 étapes
   Service → Besoin et date → Adresse et coordonnées → Vérification
   ===================================================================== */
(function () {
  "use strict";

  var form = document.getElementById("wizard");
  if (!form) return;
  var H = window.DEPANO;
  var CATALOG = window.DEPANO_CATALOG || { categories: [] };
  var TOTAL = 4;
  /* chaque étape regroupe une ou deux anciennes étapes */
  var PARTS = { 1: [1], 2: [2, 3], 3: [4, 5], 4: [6] };
  var step = 1;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var cats = {};
  var subs = {};
  CATALOG.categories.forEach(function (c) {
    cats[c.slug] = c;
    c.subs.forEach(function (s) { subs[s.slug] = { sub: s, cat: c }; });
  });

  var prevBtn = $("[data-prev]", form);
  var nextBtn = $("[data-next]", form);
  var submitBtn = $("[data-submit]", form);
  var errBox = $(".wiz-error", form);
  var nav = $(".wiz-nav", form);
  var ARROW = '<svg class="i i-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function checked(name) { var el = $('input[name="' + name + '"]:checked', form); return el ? el.value : ""; }
  function field(id) { var el = document.getElementById(id); return el ? String(el.value || "").trim() : ""; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ---------- Jours proposés : aujourd'hui + 13 jours ---------- */
  var daysBox = $("[data-days]", form);
  if (daysBox) {
    var fLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    var fWd = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
    var fMo = new Intl.DateTimeFormat("fr-FR", { month: "short" });
    var base = new Date();
    base.setHours(12, 0, 0, 0);
    for (var i = 0; i < 14; i++) {
      var d = new Date(base);
      d.setDate(base.getDate() + i);
      var label = document.createElement("label");
      label.className = "day";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "jour";
      input.id = "jour-" + i;
      input.value = (i === 0 ? "Aujourd'hui, " : i === 1 ? "Demain, " : "") + fLong.format(d);
      var span = document.createElement("span");
      var top = document.createElement("small");
      top.textContent = i === 0 ? "Auj." : i === 1 ? "Demain" : cap(fWd.format(d).replace(".", ""));
      var num = document.createElement("b");
      num.textContent = d.getDate();
      var mo = document.createElement("small");
      mo.textContent = fMo.format(d).replace(".", "");
      span.appendChild(top); span.appendChild(num); span.appendChild(mo);
      label.appendChild(input); label.appendChild(span);
      daysBox.appendChild(label);
    }
  }

  /* ---------- Affichage selon le métier choisi ---------- */
  function showCat(slug) {
    $$(".sub-opts", form).forEach(function (g) { g.hidden = g.getAttribute("data-for") !== slug; });
    $$(".q-group", form).forEach(function (g) { g.hidden = g.getAttribute("data-for") !== slug; });
  }
  function syncChecked() {
    $$(".opt, .opt-row", form).forEach(function (l) {
      var inp = $("input", l);
      l.classList.toggle("is-checked", !!(inp && inp.checked));
    });
  }
  function toggleDate() {
    var pick = $("[data-date-pick]", form);
    if (pick) pick.hidden = checked("quand") !== "date";
  }

  /* ---------- Données saisies ---------- */
  function collect() {
    var cat = cats[checked("categorie")];
    var subInput = $('input[name="prestation"]:checked', form);
    var details = [];
    if (cat) {
      $$('.q-group[data-for="' + cat.slug + '"] fieldset', form).forEach(function (fs) {
        var c = $("input:checked", fs);
        if (c) details.push({ q: fs.getAttribute("data-q"), r: c.value });
      });
    }
    var quand = checked("quand") === "urgent" ? "Dès que possible (urgent)" :
      checked("quand") === "date" ? [checked("jour"), checked("creneau")].filter(Boolean).join(" · ") : "";
    var wa = document.getElementById("w-wa");
    return {
      categorie: cat ? cat.name : "",
      prestation: subInput ? subInput.getAttribute("data-name") : "",
      details: details,
      description: field("w-desc"),
      quand: quand,
      quartier: field("w-quartier"),
      repere: field("w-repere"),
      precisions: field("w-precisions"),
      nom: field("w-nom"),
      telephone: field("w-tel"),
      whatsapp: wa ? wa.checked : true,
      email: field("w-email"),
      source: field("w-source")
    };
  }

  function texts(d) {
    return {
      service: [d.categorie, d.prestation].filter(Boolean).join(" · "),
      details: d.details.map(function (x) { return x.q + " : " + x.r; }).concat(d.description ? ["« " + d.description + " »"] : []).join("\n"),
      quand: d.quand,
      adresse: [d.quartier, d.repere, d.precisions].filter(Boolean).join("\n"),
      contact: [d.nom, d.telephone + (d.telephone && d.whatsapp ? " (WhatsApp)" : ""), d.email].filter(Boolean).join("\n")
    };
  }

  function updateSummary() {
    var t = texts(collect());
    $$("[data-sum]").forEach(function (dd) {
      var v = t[dd.getAttribute("data-sum")];
      var key = dd.getAttribute("data-sum");
      dd.textContent = v ? v.replace(/\n/g, " · ") : (key === "details" ? "Facultatif" : "À compléter");
      dd.classList.toggle("is-empty", !v);
    });
  }

  function buildRecap() {
    var t = texts(collect());
    var rows = [
      ["Service", t.service, 1],
      ["Votre besoin", t.details || "Aucune précision", 2],
      ["Date", t.quand, 2],
      ["Adresse", t.adresse, 3],
      ["Coordonnées", t.contact, 3]
    ];
    var dl = $("[data-recap]", form);
    dl.innerHTML = "";
    rows.forEach(function (r) {
      var div = document.createElement("div");
      var dt = document.createElement("dt"); dt.textContent = r[0];
      var dd = document.createElement("dd"); dd.textContent = r[1];
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "Modifier";
      b.setAttribute("aria-label", "Modifier : " + r[0]);
      b.addEventListener("click", function () { go(r[2]); });
      div.appendChild(dt); div.appendChild(dd); div.appendChild(b);
      dl.appendChild(div);
    });
  }

  /* ---------- Navigation entre étapes ---------- */
  function clearError() { errBox.hidden = true; errBox.textContent = ""; }
  function fail(msg, focusId) {
    errBox.textContent = msg;
    errBox.hidden = false;
    if (focusId) { var el = document.getElementById(focusId); if (el && el.focus) el.focus(); }
    return false;
  }
  function validate(n) {
    var parts = PARTS[n] || [];
    for (var k = 0; k < parts.length; k++) { if (!check(parts[k])) return false; }
    return true;
  }
  function check(n) {
    if (n === 1) {
      if (!checked("categorie")) return fail("Choisissez un service.");
      if (!checked("prestation")) return fail("Choisissez la prestation qui correspond à votre besoin.");
    }
    if (n === 2) {
      if (checked("prestation").indexOf("autre-") === 0 && field("w-desc").length < 5) return fail("Décrivez votre besoin en quelques mots.", "w-desc");
    }
    if (n === 3) {
      if (!checked("quand")) return fail("Indiquez quand vous souhaitez l'intervention.");
      if (checked("quand") === "date") {
        if (!checked("jour")) return fail("Choisissez un jour.");
        if (!checked("creneau")) return fail("Choisissez un créneau.");
      }
    }
    if (n === 4) {
      if (!field("w-quartier")) return fail("Choisissez votre quartier.", "w-quartier");
      if (field("w-repere").length < 3) return fail("Indiquez un point de repère pour que l'artisan vous trouve facilement.", "w-repere");
    }
    if (n === 5) {
      if (field("w-nom").length < 2) return fail("Indiquez votre nom.", "w-nom");
      if (H.digits(field("w-tel")).length < 8) return fail("Indiquez un numéro de téléphone à 8 chiffres.", "w-tel");
    }
    if (n === 6) {
      var c = document.getElementById("w-consent");
      if (c && !c.checked) return fail("Merci d'accepter l'utilisation de vos informations pour traiter votre demande.", "w-consent");
    }
    return true;
  }

  function go(n, scroll) {
    step = n;
    $$(".wiz-panel", form).forEach(function (p) { p.hidden = Number(p.getAttribute("data-step")) !== n; });
    $$("[data-step-ind]").forEach(function (li) {
      var k = Number(li.getAttribute("data-step-ind"));
      li.classList.toggle("is-current", k === n);
      li.classList.toggle("is-done", k < n);
      if (k === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    var num = $("[data-step-num]");
    if (num) num.textContent = n;
    prevBtn.hidden = n === 1;
    nextBtn.hidden = n === TOTAL;
    submitBtn.hidden = n !== TOTAL;
    nextBtn.innerHTML = (n === TOTAL - 1 ? "Vérifier ma demande " : "Continuer ") + ARROW;
    if (n === TOTAL) buildRecap();
    clearError();
    if (scroll !== false) {
      var h = $('.wiz-panel[data-step="' + n + '"] h2', form);
      if (h) h.focus({ preventScroll: true });
      var top = form.getBoundingClientRect().top + window.pageYOffset - 96;
      if (window.pageYOffset > top) window.scrollTo({ top: top, behavior: "smooth" });
    }
  }
  function next() { if (validate(step)) go(Math.min(TOTAL, step + 1)); }

  prevBtn.addEventListener("click", function () { go(Math.max(1, step - 1)); });
  nextBtn.addEventListener("click", next);

  form.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "categorie") {
      $$('input[name="prestation"]', form).forEach(function (i) { i.checked = false; });
      showCat(t.value);
      var box = $('.sub-opts[data-for="' + t.value + '"]', form);
      if (box && box.scrollIntoView) box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (t.name === "quand") toggleDate();
    /* le service et la prestation choisis : on passe tout seul à la suite */
    if (t.name === "prestation" && step === 1 && t.value.indexOf("autre-") !== 0) {
      setTimeout(function () { if (step === 1) next(); }, 350);
    }
    syncChecked();
    updateSummary();
    clearError();
  });
  form.addEventListener("input", updateSummary);

  /* ---------- Envoi ---------- */
  function reference() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return "H" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }
  function message(d) {
    var L = [];
    L.push("Bonjour " + ((window.DEPANO_CONFIG || {}).marque || "Dépano") + ", je souhaite réserver une intervention.");
    L.push("Référence : " + d.reference);
    L.push("");
    L.push("Service : " + [d.categorie, d.prestation].filter(Boolean).join(" · "));
    d.details.forEach(function (x) { L.push(x.q + " : " + x.r); });
    if (d.description) L.push("Description : " + d.description);
    L.push("Quand : " + d.quand);
    L.push("Quartier : " + d.quartier);
    L.push("Repère : " + d.repere);
    if (d.precisions) L.push("Précisions : " + d.precisions);
    L.push("Nom : " + d.nom);
    L.push("Téléphone : " + d.telephone + (d.whatsapp ? " (WhatsApp)" : ""));
    if (d.email) L.push("E-mail : " + d.email);
    if (d.source) L.push("Nous a connus par : " + d.source);
    return L.join("\n");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (step !== TOTAL) { next(); return; }
    if (!validate(TOTAL)) return;
    var d = collect();
    d.reference = reference();
    var msg = message(d);
    submitBtn.disabled = true;
    H.save("reservation", d).then(function () {
      submitBtn.disabled = false;
      $$(".wiz-panel", form).forEach(function (p) { p.hidden = true; });
      nav.hidden = true;
      var prog = $(".wiz-progress", form);
      if (prog) prog.hidden = true;
      var count = $(".wiz-count", form);
      if (count) count.hidden = true;
      var done = $("[data-done]", form);
      $("[data-ref]", done).textContent = d.reference;
      $(".result-msg", done).textContent = msg;
      $(".result-wa", done).href = H.waUrl(msg);
      done.hidden = false;
      var h = $("h2", done);
      if (h) h.focus({ preventScroll: true });
      window.scrollTo({ top: form.getBoundingClientRect().top + window.pageYOffset - 96, behavior: "smooth" });
    });
  });
  var doneCopy = $("[data-done] .result-copy", form);
  if (doneCopy) {
    doneCopy.addEventListener("click", function () {
      var pre = $("[data-done] .result-msg", form);
      H.copyText(pre.textContent, $("[data-done] .result-ok", form), pre);
    });
  }

  /* ---------- Préremplissage depuis le lien (reserver.html#entretien-climatiseur) ---------- */
  function preselect(key) {
    if (!key) return;
    if (cats[key]) {
      var ci = $('input[name="categorie"][value="' + key + '"]', form);
      if (ci) { ci.checked = true; showCat(key); }
    } else if (subs[key]) {
      var c = subs[key].cat.slug;
      var ci2 = $('input[name="categorie"][value="' + c + '"]', form);
      var si = $('input[name="prestation"][value="' + key + '"]', form);
      if (ci2 && si) { ci2.checked = true; showCat(c); si.checked = true; syncChecked(); updateSummary(); go(2, false); return; }
    }
    syncChecked();
    updateSummary();
  }
  var params = new URLSearchParams(window.location.search);
  var qp = params.get("quartier");
  if (qp) {
    var qs = document.getElementById("w-quartier");
    if (qs) { Array.prototype.forEach.call(qs.options, function (o) { if (o.value === qp || o.text === qp) qs.value = o.value || o.text; }); }
  }
  preselect(params.get("service") || decodeURIComponent(window.location.hash.replace("#", "")));
  window.addEventListener("hashchange", function () {
    preselect(decodeURIComponent(window.location.hash.replace("#", "")));
  });

  toggleDate();
  updateSummary();
  if (step === 1) go(1, false);
})();
