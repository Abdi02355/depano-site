/* =====================================================================
   DÉPANO — comportements communs à toutes les pages
   (coordonnées, menu, recherche, formulaires, photos, filtres)
   ===================================================================== */
(function () {
  "use strict";

  var C = window.DEPANO_CONFIG || {};
  var CAT = window.DEPANO_CATALOG || { categories: [] };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function waUrl(text) {
    return "https://wa.me/" + digits(C.whatsapp) + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  /* Enregistrement facultatif dans Supabase (voir LISEZMOI.md) */
  function save(type, data) {
    var s = C.supabase || {};
    if (!s.url || !s.cle || !window.fetch) return Promise.resolve(false);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    return fetch(String(s.url).replace(/\/$/, "") + "/rest/v1/" + (s.table || "demandes"), {
      method: "POST",
      headers: { "apikey": s.cle, "Authorization": "Bearer " + s.cle, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ type: type, reference: data.reference || null, donnees: data, page: location.pathname }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { clearTimeout(timer); return r.ok; })
      .catch(function () { clearTimeout(timer); return false; });
  }

  function copyText(text, okEl, srcEl) {
    function fallback() {
      if (srcEl) {
        var range = document.createRange();
        range.selectNodeContents(srcEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      if (okEl) { okEl.textContent = "Texte sélectionné : copiez-le avec votre téléphone."; okEl.hidden = false; }
    }
    try {
      navigator.clipboard.writeText(text).then(function () {
        if (okEl) { okEl.textContent = "Message copié."; okEl.hidden = false; }
      }, fallback);
    } catch (e) { fallback(); }
  }

  window.DEPANO = { waUrl: waUrl, digits: digits, norm: norm, esc: esc, save: save, copyText: copyText };

  /* ---------- Coordonnées, prix, réseaux ---------- */
  $$("[data-wa]").forEach(function (a) {
    var msg = a.getAttribute("data-wa") || ("Bonjour " + (C.marque || "Dépano") + ", j'ai besoin d'un artisan.");
    a.href = waUrl(msg);
    a.target = "_blank";
    a.rel = "noopener";
  });
  $$("[data-wa-text]").forEach(function (el) { el.textContent = C.whatsappAffiche || ""; });
  $$("[data-tel]").forEach(function (a) { a.href = "tel:+" + digits(C.telephone); });
  $$("[data-tel-text]").forEach(function (el) { el.textContent = C.telephone || ""; });
  $$("[data-email]").forEach(function (a) { a.href = "mailto:" + (C.email || ""); });
  $$("[data-email-text]").forEach(function (el) { el.textContent = C.email || ""; });
  $$("[data-horaires]").forEach(function (el) { el.textContent = C.horaires || ""; });
  $$("[data-adresse]").forEach(function (el) { el.textContent = C.adresse || ""; });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var prix = C.prix || {};
  $$("[data-price]").forEach(function (el) {
    var v = prix[el.getAttribute("data-price")];
    if (v) el.textContent = v;
  });

  var reseauxLabels = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", tiktok: "TikTok", youtube: "YouTube" };
  $$("[data-socials]").forEach(function (box) {
    var r = C.reseaux || {};
    var n = 0;
    Object.keys(reseauxLabels).forEach(function (k) {
      if (!r[k]) return;
      var a = document.createElement("a");
      a.href = r[k];
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = reseauxLabels[k];
      box.appendChild(a);
      n++;
    });
    if (!n) box.hidden = true;
  });

  /* Avis clients (uniquement ceux saisis dans config.js) */
  var avis = C.avis || [];
  $$("[data-reviews]").forEach(function (sec) {
    if (!avis.length) return;
    var list = $("[data-reviews-list]", sec);
    avis.slice(0, 6).forEach(function (a) {
      var note = Math.max(1, Math.min(5, Math.round(Number(a.note) || 5)));
      var art = document.createElement("article");
      art.className = "review";
      var stars = document.createElement("div");
      stars.className = "stars";
      stars.setAttribute("aria-label", note + " sur 5");
      stars.textContent = new Array(note + 1).join("★");
      var p = document.createElement("p");
      p.textContent = a.texte || "";
      var f = document.createElement("footer");
      var b = document.createElement("b");
      b.textContent = a.nom || "";
      f.appendChild(b);
      f.appendChild(document.createTextNode([a.quartier, a.service].filter(Boolean).length ? " · " + [a.quartier, a.service].filter(Boolean).join(" · ") : ""));
      art.appendChild(stars); art.appendChild(p); art.appendChild(f);
      list.appendChild(art);
    });
    sec.hidden = false;
  });

  /* ---------- En-tête ---------- */
  var header = $(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Méga-menu Services */
  var megaBtn = $("[data-mega-btn]");
  var mega = $("#mega");
  function setMega(open) {
    if (!megaBtn || !mega) return;
    megaBtn.setAttribute("aria-expanded", String(open));
    mega.hidden = !open;
  }
  if (megaBtn && mega) {
    var megaItem = megaBtn.parentElement;
    var hoverOpenedAt = 0;
    megaBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      /* Ouvert par le survol juste avant : le clic le garde ouvert au lieu de le refermer */
      if (!mega.hidden && Date.now() - hoverOpenedAt < 800) return;
      setMega(mega.hidden);
    });
    document.addEventListener("click", function (e) {
      if (!mega.hidden && !mega.contains(e.target) && !megaBtn.contains(e.target)) setMega(false);
    });
    megaItem.addEventListener("focusout", function (e) {
      if (e.relatedTarget && !megaItem.contains(e.relatedTarget)) setMega(false);
    });
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      var t = null;
      megaItem.addEventListener("mouseenter", function () {
        clearTimeout(t);
        if (mega.hidden) { hoverOpenedAt = Date.now(); setMega(true); }
      });
      megaItem.addEventListener("mouseleave", function () { t = setTimeout(function () { setMega(false); }, 200); });
    }
  }

  /* Menu mobile */
  var menuBtn = $(".menu-btn");
  var drawer = $("#drawer");
  function setDrawer(open) {
    if (!menuBtn || !drawer) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    drawer.hidden = !open;
    document.body.classList.toggle("no-scroll", open);
  }
  if (menuBtn && drawer) {
    menuBtn.addEventListener("click", function () { setDrawer(drawer.hidden); });
    $$("#drawer a").forEach(function (a) { a.addEventListener("click", function () { setDrawer(false); }); });
  }

  /* ---------- Recherche de services ---------- */
  var ARROW = '<svg class="i" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var INDEX = [];
  (CAT.categories || []).forEach(function (c) {
    INDEX.push({ type: "cat", name: c.name, sub: c.subs.length + " prestations", url: c.url, nameN: norm(c.name), hay: norm(c.name + " " + c.keywords), cat: c });
    c.subs.forEach(function (s) {
      INDEX.push({ type: "sub", name: s.name, sub: c.name, url: s.url, nameN: norm(s.name), hay: norm(s.name + " " + s.menu + " " + c.name + " " + s.keywords), cat: c });
    });
  });
  function search(q) {
    var qn = norm(q).trim();
    if (!qn) return [];
    var words = qn.split(/\s+/);
    var res = INDEX.filter(function (it) {
      return words.every(function (w) { return it.hay.indexOf(w) !== -1; });
    });
    res.forEach(function (it) {
      it.score = (it.nameN.indexOf(qn) === 0 ? 4 : 0) + (it.nameN.indexOf(qn) !== -1 ? 2 : 0) + (it.type === "cat" ? 1 : 0);
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res.slice(0, 8);
  }
  var srCount = 0;
  function attachSearch(input, box, opts) {
    opts = opts || {};
    var uid = "sr" + (++srCount);
    var items = [];
    var active = -1;
    function render() {
      var q = input.value;
      items = search(q);
      active = -1;
      input.removeAttribute("aria-activedescendant");
      if (!q.trim()) {
        box.innerHTML = "";
        if (opts.floating) box.hidden = true;
        if (opts.onEmpty) opts.onEmpty(true);
        input.setAttribute("aria-expanded", "false");
        return;
      }
      if (opts.onEmpty) opts.onEmpty(false);
      if (!items.length) {
        box.innerHTML = '<p class="sr-empty">Aucun service ne correspond. <a href="reserver.html">Décrivez votre besoin</a> : nous trouverons le bon artisan.</p>';
      } else {
        box.innerHTML = '<p class="sr-head">Résultats</p>' + items.map(function (it, i) {
          return '<a class="sr-item" role="option" id="' + uid + "-" + i + '" href="' + esc(it.url) + '">' +
            '<span class="sr-ico" style="--tint:' + it.cat.tint + ';--tone:' + it.cat.tone + '">' + it.cat.icon + '</span>' +
            '<span class="sr-txt"><b>' + esc(it.name) + '</b><small>' + esc(it.sub) + '</small></span>' +
            '<span class="sr-go">' + ARROW + '</span></a>';
        }).join("");
      }
      box.hidden = false;
      input.setAttribute("aria-expanded", "true");
    }
    function setActive(i) {
      var links = $$(".sr-item", box);
      if (!links.length) return;
      active = (i + links.length) % links.length;
      links.forEach(function (l, k) { l.classList.toggle("is-active", k === active); });
      input.setAttribute("aria-activedescendant", links[active].id);
      links[active].scrollIntoView({ block: "nearest" });
    }
    input.addEventListener("input", render);
    input.addEventListener("focus", function () { if (input.value.trim()) render(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Escape" && opts.floating) { box.hidden = true; input.setAttribute("aria-expanded", "false"); }
    });
    var form = input.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var links = $$(".sr-item", box);
        var target = links[active >= 0 ? active : 0];
        if (!input.value.trim()) { input.focus(); return; }
        window.location.href = target ? target.getAttribute("href") : "reserver.html";
      });
    }
    if (opts.floating) {
      document.addEventListener("click", function (e) {
        if (!box.contains(e.target) && e.target !== input) { box.hidden = true; input.setAttribute("aria-expanded", "false"); }
      });
    }
  }
  $$("[data-search]").forEach(function (wrap) {
    var input = $("input", wrap);
    var box = $(".sr-pop", wrap);
    if (input && box) attachSearch(input, box, { floating: true });
  });

  /* Fenêtre de recherche */
  var dialog = $("#search-dialog");
  var lastFocus = null;
  function setSearch(open) {
    if (!dialog) return;
    if (open) { setDrawer(false); setMega(false); lastFocus = document.activeElement; }
    dialog.hidden = !open;
    document.body.classList.toggle("no-scroll", open);
    if (open) { var i = $("input", dialog); i.value = ""; i.dispatchEvent(new Event("input")); setTimeout(function () { i.focus(); }, 30); }
    else if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  if (dialog) {
    var dInput = $("input", dialog);
    var dResults = $("[data-results]", dialog);
    var dDefault = $("[data-search-default]", dialog);
    attachSearch(dInput, dResults, { onEmpty: function (empty) { dDefault.hidden = !empty; dResults.hidden = empty; } });
    $$("[data-open-search]").forEach(function (b) { b.addEventListener("click", function () { setSearch(true); }); });
    $$("[data-close-search]", dialog).forEach(function (b) { b.addEventListener("click", function () { setSearch(false); }); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) setSearch(false); });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (dialog && !dialog.hidden) setSearch(false);
    setMega(false);
    if (drawer && !drawer.hidden) setDrawer(false);
  });

  /* ---------- Photos : remplacent l'illustration si le fichier existe ---------- */
  $$("img.photo").forEach(function (img) {
    function ok() { img.classList.add("is-loaded"); }
    function ko() { if (img.parentNode) img.parentNode.removeChild(img); }
    if (img.complete) { if (img.naturalWidth) ok(); else ko(); }
    else { img.addEventListener("load", ok); img.addEventListener("error", ko); }
  });

  /* ---------- Barre d'action mobile ---------- */
  if ($(".mobile-cta")) document.body.classList.add("has-mobile-cta");

  /* ---------- Formulaires simples → message WhatsApp ---------- */
  $$("form[data-wa-form]").forEach(function (form) {
    var intro = form.getAttribute("data-wa-form");
    var type = form.getAttribute("data-type") || "contact";
    var err = $(".form-error", form);
    var result = $(".result", form);
    var msgEl = $(".result-msg", form);
    var link = $(".result-wa", form);
    var copyBtn = $(".result-copy", form);
    var ok = $(".result-ok", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var lines = [];
      var data = {};
      var missing = null;
      $$("[data-label]", form).forEach(function (el) {
        var v;
        if (el.tagName === "FIELDSET") {
          v = $$("input:checked", el).map(function (c) { return c.value; }).join(", ");
        } else {
          v = (el.value || "").trim();
        }
        if (!missing && el.hasAttribute("data-required") && !v) missing = el;
        if (!missing && el.type === "tel" && v && digits(v).length < 8) missing = el;
        if (v) { lines.push(el.getAttribute("data-label") + " : " + v); data[el.getAttribute("data-label")] = v; }
      });
      var consent = $("[data-consent]", form);
      if (!missing && consent && !consent.checked) missing = consent;
      if (missing) {
        err.textContent = missing.getAttribute("data-error") || (missing.hasAttribute("data-consent") ? "Merci de cocher la case d'accord pour envoyer votre candidature." : "Merci de compléter ce champ.");
        err.hidden = false;
        if (missing.focus) missing.focus();
        return;
      }
      err.hidden = true;
      var text = intro + "\n\n" + lines.join("\n");
      msgEl.textContent = text;
      link.href = waUrl(text);
      ok.hidden = true;
      result.hidden = false;
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
      save(type, data);
    });
    if (copyBtn) copyBtn.addEventListener("click", function () { copyText(msgEl.textContent, ok, msgEl); });
  });

  /* ---------- Filtre du catalogue ---------- */
  var hubInput = $("[data-hub-search]");
  if (hubInput) {
    hubInput.addEventListener("input", function () {
      var q = norm(hubInput.value).trim();
      var words = q ? q.split(/\s+/) : [];
      var any = false;
      $$(".hub-cat").forEach(function (sec) {
        var vis = 0;
        $$(".hub-item", sec).forEach(function (it) {
          var hay = it.getAttribute("data-hay") || "";
          var m = words.every(function (w) { return hay.indexOf(w) !== -1; });
          it.hidden = !m;
          if (m) vis++;
        });
        sec.hidden = !vis;
        if (vis) any = true;
      });
      var empty = $("[data-hub-empty]");
      if (empty) empty.hidden = any;
    });
  }

  /* ---------- Filtre du centre d'aide ---------- */
  var helpInput = $("[data-help-search]");
  if (helpInput) {
    helpInput.addEventListener("input", function () {
      var q = norm(helpInput.value).trim();
      var any = false;
      $$(".help-section").forEach(function (sec) {
        var vis = 0;
        $$("details", sec).forEach(function (d) {
          var m = !q || norm(d.textContent).indexOf(q) !== -1;
          d.hidden = !m;
          if (q && m) d.open = true;
          if (m) vis++;
        });
        sec.hidden = !vis;
        if (vis) any = true;
      });
      var empty = $("[data-help-empty]");
      if (empty) empty.hidden = any;
    });
  }

  /* ---------- Filtre des conseils ---------- */
  var filterBtns = $$("[data-filter]");
  filterBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var f = b.getAttribute("data-filter");
      filterBtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $$("[data-guide]").forEach(function (card) {
        card.hidden = !(f === "tous" || card.getAttribute("data-guide") === f);
      });
    });
  });
})();

/* =====================================================================
   DÉPANO — animations (version 2)
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var R = window.DEPANO || {};

  /* Barre de progression de lecture sous l'en-tête */
  var header = document.querySelector(".site-header");
  if (header) {
    var bar = document.createElement("span");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    header.appendChild(bar);
    var tick = false;
    window.addEventListener("scroll", function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ")";
        tick = false;
      });
    }, { passive: true });
  }

  /* Bouton WhatsApp flottant */
  if (R.waUrl) {
    var fab = document.createElement("a");
    fab.className = "fab-wa";
    fab.href = R.waUrl("Bonjour Dépano, j'ai besoin d'un artisan.");
    fab.target = "_blank";
    fab.rel = "noopener";
    fab.innerHTML = '<svg class="i" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.2A8 8 0 1 1 20 11.5z"/></svg><span>Une question ?</span>';
    fab.setAttribute("aria-label", "Écrire à Dépano sur WhatsApp");
    document.body.appendChild(fab);
  }

  /* Compteurs */
  function countUp(el) {
    var end = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduce || end === 0) { el.textContent = String(end); return; }
    var t0 = null, dur = 1300;
    el.textContent = "0";
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* Apparition au défilement */
  var sel = ".section-head, .cat-tile, .svc-card, .step, .std, .guide-card, .zone, .faq details, .b2b-copy, .b2b-panel, .heat > div, .engage-card, .job, .stats, .review-invite, .review, .hub-item, .help-section, .incl > *, .tips > *, .cards-3 > *, .compare > *, .cta-inner";
  var els = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(function (el) {
    return !el.closest(".hero, .page-hero, .mega, .drawer, .search-dialog");
  });
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  if (reduce || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("js-reveal");
  els.forEach(function (el) {
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.matches(sel); });
    var i = sibs.indexOf(el);
    el.style.setProperty("--d", Math.min(i, 6) * 0.07 + "s");
    el.classList.add("rv");
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach(function (el) { io.observe(el); });

  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      countUp(e.target);
      cio.unobserve(e.target);
    });
  }, { threshold: 0.6 });
  counters.forEach(function (c) { cio.observe(c); });
})();

/* Recrutement : « Postuler à ce poste » remplit le métier dans le formulaire */
(function () {
  var sel = document.getElementById("a-metier");
  if (!sel) return;
  function pick(job) {
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text === job) { sel.selectedIndex = i; break; }
    }
    sel.classList.remove("flash"); void sel.offsetWidth; sel.classList.add("flash");
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-job]"), function (a) {
    a.addEventListener("click", function () { pick(a.getAttribute("data-job")); });
  });
})();

/* =====================================================================
   DÉPANO — accueil : mot qui change et conversation animée
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  /* Mot qui change dans le titre */
  var rot = document.querySelector("[data-rot]");
  if (rot) {
    var words = [];
    try { words = JSON.parse(rot.getAttribute("data-rot")); } catch (e) {}
    var w = rot.querySelector(".rot-word"), k = 0;
    if (w && words.length > 1) {
      setInterval(function () {
        w.classList.remove("in"); w.classList.add("out");
        setTimeout(function () {
          k = (k + 1) % words.length;
          w.textContent = words[k];
          w.classList.remove("out"); void w.offsetWidth; w.classList.add("in");
        }, 330);
      }, 2400);
    }
  }

  /* Conversation qui s'écrit toute seule, en boucle */
  var chat = document.querySelector("[data-chat]");
  if (!chat) return;
  var msgs = Array.prototype.slice.call(chat.querySelectorAll(".msg"));
  var typing = chat.querySelector(".typing");
  chat.classList.add("chat-js");
  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function play() {
    timers.forEach(clearTimeout); timers = [];
    msgs.forEach(function (m) { m.classList.remove("show"); });
    var t = 600;
    msgs.forEach(function (m) {
      if (m.classList.contains("in")) {
        later(function () { chat.appendChild(typing); typing.classList.add("show"); }, t);
        t += 1300;
        later(function () { typing.classList.remove("show"); m.classList.add("show"); }, t);
      } else {
        later(function () { m.classList.add("show"); }, t);
      }
      t += 1100;
    });
    later(play, t + 4500);
  }
  var started = false;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es, o) {
      if (es[0].isIntersecting && !started) { started = true; play(); o.disconnect(); }
    }).observe(chat);
  } else { play(); }
})();

/* Vidéo d'accueil : pause/lecture, mouvement réduit */
(function () {
  var v = document.querySelector(".hv-video");
  var b = document.querySelector("[data-video-toggle]");
  if (!v || !b) return;
  var PAUSE = '<svg class="i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>';
  var PLAY = '<svg class="i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
  function sync() {
    var paused = v.paused;
    b.innerHTML = paused ? PLAY : PAUSE;
    b.setAttribute("aria-label", paused ? "Lire la vidéo" : "Mettre la vidéo en pause");
  }
  b.addEventListener("click", function () { if (v.paused) { v.play(); } else { v.pause(); } });
  v.addEventListener("play", sync); v.addEventListener("pause", sync);
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { v.removeAttribute("autoplay"); v.pause(); }
  var p = v.play && v.play(); if (p && p.catch) p.catch(function () { sync(); });
  sync();
})();


/* =====================================================================
   v5 — barre d'action mobile qui ne cache plus le contenu,
   durée de garantie lue dans la configuration
   ===================================================================== */
(function () {
  "use strict";
  var C = window.DEPANO_CONFIG || {};
  if (C.garantieJours) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-garantie]"), function (el) {
      el.textContent = String(C.garantieJours);
    });
  }

  var bar = document.querySelector(".mobile-cta");
  var fab = document.querySelector(".fab-wa");
  var floating = [bar, fab].filter(Boolean);
  if (!floating.length) return;

  /* On masque les boutons flottants quand des boutons d'action sont déjà à l'écran
     (héros, bandeau final, pied de page) et pendant la saisie au clavier. */
  var zones = document.querySelectorAll("[data-cta-zone], .site-footer");
  var visible = 0;
  function apply() {
    floating.forEach(function (el) { el.classList.toggle("is-away", visible > 0); });
  }
  if ("IntersectionObserver" in window && zones.length) {
    var seen = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
      visible = 0;
      seen.forEach(function (v) { if (v) visible++; });
      apply();
    });
    Array.prototype.forEach.call(zones, function (z) { io.observe(z); });
  }
  document.addEventListener("focusin", function (e) {
    if (e.target.matches && e.target.matches("input, textarea, select")) floating.forEach(function (el) { el.classList.add("is-typing"); });
  });
  document.addEventListener("focusout", function () {
    floating.forEach(function (el) { el.classList.remove("is-typing"); });
  });
})();


/* =====================================================================
   v6 — statut « ouvert / fermé » à l'heure de Djibouti, prix par métier
   ===================================================================== */
(function () {
  "use strict";
  var C = window.DEPANO_CONFIG || {};
  var box = document.querySelector("[data-open-status]");
  if (box) {
    var now = new Date(Date.now() + 3 * 3600 * 1000); // Djibouti = UTC+3, sans heure d'été
    var day = now.getUTCDay(), h = now.getUTCHours();
    var txt = box.querySelector("[data-open-text]");
    var open = day !== 5 && h >= 8 && h < 20;
    box.classList.add(open ? "is-open" : "is-closed");
    if (txt) {
      if (open) txt.textContent = "Ouvert maintenant · jusqu'à 20 h";
      else if (day === 5 || (day === 4 && h >= 20)) txt.textContent = "Fermé le vendredi · réponse samedi dès 8 h";
      else txt.textContent = "Fermé · réservez en ligne, réponse dès 8 h";
    }
  }
  var prix = C.prix || {};
  Array.prototype.forEach.call(document.querySelectorAll("[data-price-cat]"), function (el) {
    var v = prix[el.getAttribute("data-price-cat")];
    if (v) { el.textContent = v; el.hidden = false; }
  });
})();

/* v7 — formulaires de réservation : ouvrent WhatsApp avec un message prêt */
(function () {
  "use strict";
  var H = window.DEPANO;
  var forms = document.querySelectorAll("form[data-wa-book]");
  if (!H || !forms.length) return;
  Array.prototype.forEach.call(forms, function (form) {
    Array.prototype.forEach.call(form.querySelectorAll('input[name="service"]'), function (r) {
      r.addEventListener("change", function () {
        var l = r.closest("label"); if (!l) return;
        l.classList.remove("is-pick"); void l.offsetWidth; l.classList.add("is-pick");
      });
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var r = form.querySelector('input[name="service"]:checked');
      var svc = r ? (r.closest("label").querySelector(".hx-svc-name") || {}).textContent : "";
      var presta = form.getAttribute("data-prestation") || "";
      var sel = form.querySelector('select[name="quartier"]');
      var quartier = sel && sel.value ? sel.value : "";
      var lines = ["Bonjour Dépano,"];
      if (svc) lines.push("J'ai besoin d'un service : " + svc + (presta ? " (" + presta + ")" : "") + ".");
      else lines.push("J'ai besoin d'un dépannage à domicile.");
      if (quartier) lines.push("Quartier : " + quartier + ".");
      if (Date.now() < Date.parse("2026-11-20T23:59:59+03:00")) lines.push("(Offre de lancement : −50 % sur ma première intervention)");
      lines.push("Voici mon problème : ");
      var url = H.waUrl(lines.join("\n"));
      try { if (window.gtag) window.gtag("event", "reservation_whatsapp", { service: svc || "non précisé" }); } catch (e) {}
      window.location.href = url;
    });
  });
})();

/* v8 — artisans.html?poste=Électricité#candidature : préremplit le poste et l'expérience */
(function () {
  var sel = document.getElementById("a-metier");
  var poste = new URLSearchParams(location.search).get("poste");
  if (!sel || !poste) return;
  for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === poste) sel.selectedIndex = i;
  var exp = document.getElementById("a-exp");
  if (exp) for (var k = 0; k < exp.options.length; k++) if (exp.options[k].text === "5 à 10 ans") exp.selectedIndex = k;
})();

/* v12 — l'offre de lancement disparaît d'elle-même après sa date de fin */
(function () {
  var now = Date.now();
  Array.prototype.forEach.call(document.querySelectorAll("[data-promo-end]"), function (el) {
    var end = Date.parse(el.getAttribute("data-promo-end"));
    if (end && now > end && el.parentNode) el.parentNode.removeChild(el);
  });
})();
