/* =====================================================================
   DÉPANO — candidature en ligne (pages emploi-*.html)
   Les fichiers vont dans le dossier « candidatures » de Supabase,
   la fiche dans la table « candidatures ». Le public peut seulement envoyer.
   ===================================================================== */
(function () {
  "use strict";
  var form = document.getElementById("candidature-form");
  if (!form) return;
  var C = (window.DEPANO_CONFIG || {}).recrutement || {};
  var API = String(C.url || "").replace(/\/$/, "");
  var KEY = C.cle || "";
  var done = document.getElementById("candidature-ok");
  var err = form.querySelector(".form-error");
  var prog = form.querySelector("[data-progress]");
  var btn = form.querySelector(".apply-submit");
  var started = Date.now();
  var MAX = 5 * 1024 * 1024;

  function $(s) { return form.querySelector(s); }
  function val(n) { var el = form.elements[n]; return el ? String(el.value || "").trim() : ""; }
  function radio(n) { var el = form.querySelector('input[name="' + n + '"]:checked'); return el ? el.value : ""; }
  function checks(n) { return Array.prototype.map.call(form.querySelectorAll('input[name="' + n + '"]:checked'), function (c) { return c.value; }); }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }

  /* Noms de fichiers choisis */
  Array.prototype.forEach.call(form.querySelectorAll('input[type="file"]'), function (inp) {
    inp.addEventListener("change", function () {
      var out = inp.closest(".drop").querySelector("[data-file-name]");
      var n = inp.files.length;
      if (false) out.textContent = n + " photos choisies (les 5 premières seront envoyées)";
      else out.textContent = n === 0 ? (inp.multiple ? "Aucune photo choisie" : "Aucun fichier choisi") : n === 1 ? inp.files[0].name : n + " photos choisies";
      inp.closest(".drop").classList.toggle("has-file", n > 0);
    });
  });

  function fail(msg, el) {
    err.innerHTML = "";
    err.textContent = msg;
    err.hidden = false;
    if (el && el.focus) { el.focus(); if (el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" }); }
    return false;
  }

  function reference() {
    var d = new Date(), p = function (x) { return String(x).padStart(2, "0"); };
    var abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = "";
    var rnd = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(5)) : [1, 2, 3, 4, 5].map(function () { return Math.random() * 255; });
    for (var i = 0; i < 5; i++) r += abc[rnd[i] % abc.length];
    return "DEP-" + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + "-" + r;
  }

  /* Réduit les grandes photos (connexion mobile) */
  function shrink(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 900 * 1024) return resolve(file);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1800 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { resolve(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function ext(f) {
    var m = /\.([a-z0-9]{2,5})$/i.exec(f.name || "");
    return m ? m[1].toLowerCase() : (f.type.split("/")[1] || "bin");
  }

  function upload(path, file) {
    return fetch(API + "/storage/v1/object/candidatures/" + path, {
      method: "POST",
      headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false", "cache-control": "3600" },
      body: file
    }).then(function (r) { if (!r.ok) throw new Error("upload " + r.status); return path; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.hidden = true;
    if (val("site_web")) return;                       /* robot */
    if (Date.now() - started < 4000) return fail("Merci de vérifier vos informations avant d'envoyer.");

    var req = [["prenom", "Indiquez votre prénom."], ["nom", "Indiquez votre nom."], ["telephone", "Indiquez votre numéro de téléphone."]];
    for (var i = 0; i < req.length; i++) if (!val(req[i][0])) return fail(req[i][1], form.elements[req[i][0]]);
    if (digits(val("telephone")).length < 8) return fail("Le numéro de téléphone doit contenir au moins 8 chiffres.", form.elements.telephone);
    if (val("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email"))) return fail("L'adresse e-mail n'est pas valide.", form.elements.email);
    var cv = form.elements.cv.files[0] || null;
    var lettre = form.elements.lettre.files[0] || null;
    if (!cv) return fail("Ajoutez votre CV.", form.elements.cv);
    if (!lettre) return fail("Ajoutez votre lettre de motivation.", form.elements.lettre);
    if (!form.elements.consentement.checked) return fail("Cochez la case d'accord pour que nous puissions étudier votre candidature.", form.elements.consentement);
    if (!API || !KEY || !window.fetch) return fail("L'envoi en ligne est momentanément indisponible. Écrivez-nous à depano.dj@gmail.com.");

    var ref = reference();
    btn.disabled = true;
    prog.hidden = false;
    prog.textContent = "Envoi en cours… merci de ne pas fermer la page.";

    var cvPath = null, lettrePath = null;
    var tasks = shrink(cv).then(function (f) {
      if (f.size > MAX) throw new Error("big");
      prog.textContent = "Envoi du CV…";
      return upload(ref + "/cv." + ext(f), f);
    }).then(function (p) { cvPath = p; return shrink(lettre); }).then(function (f) {
      if (f.size > MAX) throw new Error("big");
      prog.textContent = "Envoi de la lettre de motivation…";
      return upload(ref + "/lettre." + ext(f), f);
    }).then(function (p) { lettrePath = p; });

    tasks.then(function () {
      prog.textContent = "Enregistrement de votre candidature…";
      var row = {
        reference: ref, poste: form.getAttribute("data-poste"),
        prenom: val("prenom"), nom: val("nom"), telephone: val("telephone"), email: val("email") || null,
        cv_path: cvPath, lettre_path: lettrePath, consentement: true
      };
      return fetch(API + "/rest/v1/candidatures", {
        method: "POST",
        headers: { "apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify(row)
      }).then(function (r) { if (!r.ok) throw new Error("insert " + r.status); });
    }).then(function () {
      try { if (window.gtag) gtag("event", "candidature_envoyee", { poste: form.getAttribute("data-poste") }); } catch (x) {}
      form.hidden = true;
      done.querySelector("[data-ref]").textContent = ref;
      done.hidden = false;
      done.focus();
      done.scrollIntoView({ block: "start", behavior: "smooth" });
    }).catch(function (x) {
      btn.disabled = false;
      prog.hidden = true;
      if (x && x.message === "big") return fail("Un fichier dépasse 5 Mo. Choisissez un fichier plus léger (ou une photo).");
      fail("L'envoi n'a pas abouti (connexion interrompue ?). Vérifiez votre connexion et réessayez. Si le problème continue, écrivez-nous à depano.dj@gmail.com.");
    });
  });
})();
