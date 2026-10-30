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
      if (inp.multiple && n > 5) out.textContent = n + " photos choisies (les 5 premières seront envoyées)";
      else out.textContent = n === 0 ? (inp.multiple ? "Aucune photo choisie" : "Aucun fichier choisi") : n === 1 ? inp.files[0].name : n + " photos choisies";
      inp.closest(".drop").classList.toggle("has-file", n > 0);
    });
  });

  /* Avertissement : moins de 5 ans */
  var exp = form.elements.annees_experience, warn = $("[data-exp-warn]");
  if (exp && warn) exp.addEventListener("change", function () { warn.hidden = exp.value !== "Moins de 5 ans"; });

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

    var req = [["prenom", "Indiquez votre prénom."], ["nom", "Indiquez votre nom."], ["telephone", "Indiquez votre numéro de téléphone."],
      ["quartier", "Choisissez votre quartier."], ["annees_experience", "Indiquez vos années d'expérience."], ["situation", "Indiquez votre situation actuelle."]];
    for (var i = 0; i < req.length; i++) if (!val(req[i][0])) return fail(req[i][1], form.elements[req[i][0]]);
    if (digits(val("telephone")).length < 8) return fail("Le numéro de téléphone doit contenir au moins 8 chiffres.", form.elements.telephone);
    if (val("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email"))) return fail("L'adresse e-mail n'est pas valide.", form.elements.email);
    if (!checks("specialites").length) return fail("Cochez au moins une spécialité.", form.querySelector('input[name="specialites"]'));
    if (val("motivation").length < 20) return fail("Présentez-vous en quelques lignes (20 caractères minimum).", form.elements.motivation);
    var cv = form.elements.cv.files[0] || null;
    var photos = Array.prototype.slice.call(form.elements.photos.files, 0, 5);
    if (cv && cv.size > MAX) return fail("Le CV dépasse 5 Mo. Choisissez un fichier plus léger.", form.elements.cv);
    if (!form.elements.certifie.checked) return fail("Cochez la case pour certifier l'exactitude des informations.", form.elements.certifie);
    if (!form.elements.consentement.checked) return fail("Cochez la case d'accord pour que nous puissions étudier votre candidature.", form.elements.consentement);
    if (!API || !KEY || !window.fetch) return fail("L'envoi en ligne est momentanément indisponible. Écrivez-nous à depano.dj@gmail.com.");

    var ref = reference();
    btn.disabled = true;
    prog.hidden = false;
    prog.textContent = "Envoi en cours… merci de ne pas fermer la page.";

    var tasks = Promise.resolve(null);
    var cvPath = null, photoPaths = [];
    if (cv) tasks = shrink(cv).then(function (f) { prog.textContent = "Envoi du CV…"; return upload(ref + "/cv." + ext(f), f); }).then(function (p) { cvPath = p; });
    photos.forEach(function (ph, k) {
      tasks = tasks.then(function () { return shrink(ph); }).then(function (f) {
        if (f.size > MAX) return null;
        prog.textContent = "Envoi des photos (" + (k + 1) + "/" + photos.length + ")…";
        return upload(ref + "/photo-" + (k + 1) + "." + ext(f), f).then(function (p) { photoPaths.push(p); });
      });
    });

    tasks.then(function () {
      prog.textContent = "Enregistrement de votre candidature…";
      var row = {
        reference: ref, poste: form.getAttribute("data-poste"),
        prenom: val("prenom"), nom: val("nom"), telephone: val("telephone"), email: val("email") || null,
        quartier: val("quartier"), annees_experience: val("annees_experience"), situation: val("situation"),
        dernier_employeur: val("dernier_employeur") || null, specialites: checks("specialites"),
        formation: val("formation") || null, habilitation: val("habilitation") || null,
        disponibilite: radio("disponibilite") || null, outillage: radio("outillage") || null, transport: radio("transport") || null,
        langues: checks("langues"), motivation: val("motivation"), cv_path: cvPath, photos_paths: photoPaths, consentement: true
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
    }).catch(function () {
      btn.disabled = false;
      prog.hidden = true;
      fail("L'envoi n'a pas abouti (connexion interrompue ?). Vérifiez votre connexion et réessayez. Si le problème continue, écrivez-nous à depano.dj@gmail.com.");
    });
  });
})();
