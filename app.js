(function () {
  "use strict";
  var C = window.CONFIG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text; // textContent فقط: لا HTML من أي مصدر
    return n;
  }
  function safeUrl(u) { return /^https:\/\//i.test(u) ? u : "#"; }
  var SB = (C.supabaseUrl || "").replace(/\/+$/, ""), SBK = C.supabaseKey || "";
  var SB_PUB = SB ? SB + "/storage/v1/object/public/media/" : "";
  function safePath(p) {
    p = String(p || "");
    if (SB_PUB && p.indexOf(SB_PUB) === 0 && /^[\w\-./%:]+$/.test(p)) return true;
    return /^assets\/[\w\-./]+$/.test(p) && p.indexOf("..") < 0;
  }
  function ytId(u) { var m = String(u || "").match(/^[\w-]{11}$/) || String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? (m[1] || m[0]) : null; }
  function getJson(p) { return fetch(p, { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }); }
  var digits = C.whatsapp.replace(/\D/g, "");

  // ---------- النصوص من الإعدادات ----------
  document.querySelectorAll("[data-cfg]").forEach(function (n) { n.textContent = C[n.dataset.cfg] || ""; });
  document.title = C.name + " | تصوير وإنتاج إعلامي";
  $("#yr").textContent = new Date().getFullYear();
  var wa = "https://wa.me/" + digits;
  $("#waLink").href = wa; $("#waFloat").href = wa;
  $("#telLink").href = "tel:+" + digits;
  if (C.email) { $("#mailLink").hidden = false; $("#mailLink").href = "mailto:" + C.email; }
  if (C.social.length) {
    var sc = el("div", "card"); sc.appendChild(el("b", "", "تابعنا")); var sl = el("span", "sl");
    C.social.forEach(function (s) { var x = el("a", "", s.name); x.href = safeUrl(s.url); x.target = "_blank"; x.rel = "noopener noreferrer"; sl.appendChild(x); });
    sc.appendChild(sl); $(".info").appendChild(sc);
  }
  C.social.forEach(function (s) {
    var a = el("a", "", s.name); a.href = safeUrl(s.url); a.target = "_blank"; a.rel = "noopener noreferrer"; $("#soc").appendChild(a);
  });

  // ---------- القائمة ----------
  var burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", function () { var o = nav.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") { nav.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });

  // ---------- عرض عنصر وسائط (صورة / فيديو / يوتيوب) ----------
  function media(w, i, big) {
    var d = el("div", "ph" + (big ? " big" : ""));
    var id = w.type === "youtube" ? ytId(w.src) : null;
    if (w.type === "youtube" && id) {
      var im = new Image(); im.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; im.alt = w.title; im.loading = "lazy"; d.appendChild(im); d.appendChild(el("span", "play", "▶"));
    } else if (w.type === "video" && safePath(w.src)) {
      var v = document.createElement("video"); v.src = w.src + "#t=0.5"; v.muted = true; v.preload = "metadata"; v.playsInline = true; d.appendChild(v); d.appendChild(el("span", "play", "▶"));
    } else if (w.type === "image" && safePath(w.src)) {
      var im2 = new Image(); im2.src = w.src; im2.alt = w.title; im2.loading = "lazy"; d.appendChild(im2);
    } else {
      d.style.setProperty("--h", (i * 37 + 20) % 22 + 14); d.appendChild(el("span", "ghost", "▶"));
    }
    return d;
  }
  function openLightbox(w, i) {
    var lb = $("#lbBody"); lb.textContent = "";
    var id = w.type === "youtube" ? ytId(w.src) : null;
    if (id) {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0"; f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; f.title = w.title; f.className = "lb-media";
      lb.appendChild(f);
    } else if (w.type === "video" && safePath(w.src)) {
      var v = document.createElement("video"); v.src = w.src; v.controls = true; v.autoplay = true; v.playsInline = true; v.className = "lb-media"; lb.appendChild(v);
    } else if (w.type === "image" && safePath(w.src)) {
      var im = new Image(); im.src = w.src; im.alt = w.title; im.className = "lb-media img"; lb.appendChild(im);
    } else lb.appendChild(media(w, i, true));
    lb.appendChild(el("p", "", w.title + " · " + w.cat));
    $("#lb").hidden = false;
  }
  function closeLightbox() { $("#lb").hidden = true; $("#lbBody").textContent = ""; }
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lb").addEventListener("click", function (e) { if (e.target.id === "lb") closeLightbox(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeLightbox(); $("#chat").hidden = true; $("#chatFab").hidden = false; closePopup(); } });

  // ---------- الخدمات + الشريط المتحرك ----------
  var works = [], cur = "الكل";
  var tabs = $("#svcTabs"), sel = $("#svcSelect");
  C.services.forEach(function (s) { var o = el("option", "", s.title); o.value = s.title; sel.appendChild(o); });
  var oo = el("option", "", "أخرى"); oo.value = "أخرى"; sel.appendChild(oo);

  function drawTabs() {
    tabs.textContent = "";
    [{ title: "الكل", icon: "✨" }].concat(C.services).forEach(function (s) {
      var n = works.filter(function (w) { return s.title === "الكل" || w.cat === s.title; }).length;
      var b = el("button", "tab" + (cur === s.title ? " on" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", cur === s.title);
      b.appendChild(el("span", "ic", s.icon)); b.appendChild(el("span", "", s.title)); b.appendChild(el("small", "", String(n)));
      b.addEventListener("click", function () { cur = s.title; drawTabs(); drawTrack(); });
      tabs.appendChild(b);
    });
    var s = C.services.filter(function (x) { return x.title === cur; })[0];
    $("#svcDesc").textContent = s ? s.text : "كل ما تحتاجه من التصوير حتى التسويق، في مكان واحد.";
  }
  function drawTrack() {
    var list = works.filter(function (w) { return cur === "الكل" || w.cat === cur; });
    var track = $("#track"); track.textContent = ""; track.style.animation = "none";
    $("#empty").hidden = list.length > 0; $("#marquee").hidden = list.length === 0;
    if (!list.length) return;
    var reps = Math.max(1, Math.ceil(8 / list.length)), half = [];
    for (var r = 0; r < reps; r++) list.forEach(function (w) { half.push(w); });
    function card(w, idx, clone) {
      var b = el("button", "item"); b.type = "button"; if (clone) { b.tabIndex = -1; b.setAttribute("aria-hidden", "true"); }
      b.appendChild(media(w, idx)); var cap = el("div", "cap"); cap.appendChild(el("b", "", w.title)); cap.appendChild(el("small", "", w.cat)); b.appendChild(cap);
      b.addEventListener("click", function () { openLightbox(w, idx); });
      return b;
    }
    half.forEach(function (w, i) { track.appendChild(card(w, i, false)); });
    half.forEach(function (w, i) { track.appendChild(card(w, i, true)); });
    void track.offsetWidth; // إعادة تشغيل الحركة من البداية
    track.style.animation = "";
    track.style.setProperty("--dur", Math.max(30, half.length * 7) + "s"); // بطيء: 7 ثوانٍ لكل عمل
  }

  // ---------- العروض والإعلانات ----------
  function todayStr() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function activeAds(list) {
    var t = todayStr();
    return (list || []).filter(function (a) { return (!a.start || a.start <= t) && (!a.end || a.end >= t); });
  }
  function adLink(a, btn) {
    var u = String(a.btnUrl || "");
    if (u.charAt(0) === "#") btn.href = /^#[\w-]+$/.test(u) ? u : "#contact";
    else if (/^https:\/\//i.test(u)) { btn.href = u; btn.target = "_blank"; btn.rel = "noopener noreferrer"; }
    else { btn.href = wa + "?text=" + encodeURIComponent(a.title); btn.target = "_blank"; btn.rel = "noopener noreferrer"; }
  }
  var popAds = [];
  function drawAds(ads) {
    var g = $("#adsGrid"); g.textContent = "";
    if (!ads.length) return;
    $("#offers").hidden = false; $("#navOffers").hidden = false;
    ads.forEach(function (a) {
      var c = el("article", "ad");
      if (safePath(a.image)) { var im = new Image(); im.src = a.image; im.alt = ""; im.loading = "lazy"; c.appendChild(im); }
      c.appendChild(el("span", "tag", "عرض")); c.appendChild(el("h3", "", a.title)); c.appendChild(el("p", "", a.text));
      if (a.btnText) { var b = el("a", "btn small", a.btnText); adLink(a, b); c.appendChild(b); }
      g.appendChild(c);
    });
    popAds = ads.filter(function (a) { return a.popup; });
  }
  function closePopup() { $("#popup").hidden = true; }
  function showPopup() {
    var a = popAds[0]; if (!a) return;
    try { if (sessionStorage.getItem("pop_" + a.id)) return; sessionStorage.setItem("pop_" + a.id, "1"); } catch (e) {}
    $("#popTitle").textContent = a.title; $("#popText").textContent = a.text;
    var pi = $("#popImg"); pi.textContent = "";
    if (safePath(a.image)) { var im = new Image(); im.src = a.image; im.alt = ""; pi.appendChild(im); }
    var b = $("#popBtn"); b.textContent = a.btnText || "تواصل معنا"; adLink(a, b);
    b.onclick = closePopup; $("#popup").hidden = false;
  }
  $("#popClose").addEventListener("click", closePopup);
  $("#popup").addEventListener("click", function (e) { if (e.target.id === "popup") closePopup(); });

  drawTabs();
  function sbGet(table, order) {
    return fetch(SB + "/rest/v1/" + table + "?select=*&order=" + order, { headers: { apikey: SBK, Authorization: "Bearer " + SBK } })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }
  var worksP = SB && SBK ? sbGet("works", "created_at.desc").then(function (rows) { return { works: rows }; }).catch(function () { return getJson("data/works.json"); }) : getJson("data/works.json");
  var adsP = SB && SBK ? sbGet("ads", "created_at.desc").then(function (rows) {
    return { ads: rows.map(function (r) { return { id: r.id, title: r.title, text: r.text, image: r.image, btnText: r.btn_text, btnUrl: r.btn_url, start: r.start_date || "", end: r.end_date || "", popup: r.popup }; }) };
  }).catch(function () { return getJson("data/ads.json"); }) : getJson("data/ads.json");
  worksP.then(function (j) { works = (j.works || []).filter(function (w) { return w && w.title && w.cat; }); drawTabs(); drawTrack(); });
  adsP.then(function (j) { drawAds(activeAds(j.ads)); setTimeout(showPopup, 1800); });

  // ---------- عدّاد الأرقام ----------
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      var n = e.target, t = +n.dataset.count, s = null;
      (function step(ts) { s = s || ts; var p = Math.min((ts - s) / 1200, 1); n.textContent = Math.round(t * p) + (p === 1 ? "+" : ""); if (p < 1) requestAnimationFrame(step); })(performance.now());
    });
  }, { threshold: .4 });
  document.querySelectorAll("[data-count]").forEach(function (n) { io.observe(n); });

  // ---------- نموذج التواصل ----------
  var form = $("#form"), note = $("#formNote"), lastSend = 0;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var d = new FormData(form);
    if (d.get("botcheck")) return;
    var name = String(d.get("name") || "").trim(), phone = String(d.get("phone") || "").trim();
    if (name.length < 2 || !/^[\d+\s-]{8,20}$/.test(phone)) { note.textContent = "تأكد من الاسم ورقم الجوال."; note.className = "note err"; return; }
    if (Date.now() - lastSend < 15000) { note.textContent = "انتظر قليلاً قبل إرسال طلب آخر."; note.className = "note err"; return; }
    var msg = "الاسم: " + name + "\nالجوال: " + phone + "\nالخدمة: " + d.get("service") + "\nالتفاصيل: " + (d.get("message") || "-");
    if (!C.web3formsKey) { window.open(wa + "?text=" + encodeURIComponent(msg), "_blank", "noopener"); return; }
    lastSend = Date.now(); note.className = "note"; note.textContent = "جارٍ الإرسال...";
    fetch("https://api.web3forms.com/submit", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: C.web3formsKey, subject: "طلب جديد من الموقع", from_name: name, name: name, phone: phone, service: d.get("service"), message: d.get("message") })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.success) { note.textContent = "تم الإرسال. سنتواصل معك قريباً."; form.reset(); } else throw 0;
    }).catch(function () { note.className = "note err"; note.textContent = "تعذر الإرسال. تواصل معنا عبر واتساب."; });
  });

  // ---------- المساعد الآلي ----------
  function norm(s) { return String(s).toLowerCase().replace(/[ً-ٟـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^؀-ۿa-z0-9\s]/g, " "); }
  function answer(q) {
    var t = " " + norm(q) + " ", best = null, score = 0;
    C.bot.faq.forEach(function (f) { var s = 0; f.k.forEach(function (k) { if (t.indexOf(norm(k)) >= 0) s += norm(k).length; }); if (s > score) { score = s; best = f; } });
    if (!best) return C.bot.fallback;
    if (best.dyn === "hours") return "أوقات العمل: " + C.hours;
    if (best.dyn === "address") return "عنواننا: " + C.address;
    if (best.dyn === "contact") return "واتساب واتصال: " + C.phoneShow + (C.email ? " – البريد: " + C.email : "");
    return best.a;
  }
  var msgs = $("#msgs");
  function say(text, me) { msgs.appendChild(el("div", "m " + (me ? "me" : "bot"), text)); msgs.scrollTop = msgs.scrollHeight; }
  function ask(q) { say(q, true); setTimeout(function () { say(answer(q)); }, 350); }
  $("#chatFab").addEventListener("click", function () { $("#chat").hidden = false; $("#chatFab").hidden = true; if (!msgs.children.length) say(C.bot.greeting); $("#chatIn").focus(); });
  $("#chatClose").addEventListener("click", function () { $("#chat").hidden = true; $("#chatFab").hidden = false; });
  C.bot.quick.forEach(function (q) { var b = el("button", "", q); b.type = "button"; b.addEventListener("click", function () { ask(q); }); $("#quick").appendChild(b); });
  $("#chatForm").addEventListener("submit", function (e) { e.preventDefault(); var v = $("#chatIn").value.trim(); if (!v) return; $("#chatIn").value = ""; ask(v); });
})();
