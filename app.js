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
  var PAGE = document.body.dataset.page || "home";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  var wa = "https://wa.me/" + digits;

  // ---------- النصوص من الإعدادات ----------
  document.querySelectorAll("[data-cfg]").forEach(function (n) { n.textContent = C[n.dataset.cfg] || ""; });
  $("#yr").textContent = new Date().getFullYear();
  $("#waFloat").href = wa;
  if ($("#waLink")) { $("#waLink").href = wa; $("#telLink").href = "tel:+" + digits; }
  if ($("#mailLink") && C.email) { $("#mailLink").hidden = false; $("#mailLink").href = "mailto:" + C.email; }
  if ($(".info") && C.social.length) {
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

  // ---------- اختصار لوحة التحكم: Ctrl + Shift + Z ----------
  function goAdmin() { location.href = "admin.html"; }
  document.addEventListener("keydown", function (e) {
    var isZ = e.code === "KeyZ" || String(e.key).toLowerCase() === "z";
    if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || !isZ) return;
    var t = e.target, tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    e.preventDefault(); goAdmin();
  });
  // بديل للجوال: اضغط على علامة © في أسفل الصفحة 5 مرات بسرعة
  (function () {
    var n = 0, timer = null;
    $("#secret").addEventListener("click", function () {
      n++; clearTimeout(timer); timer = setTimeout(function () { n = 0; }, 2500);
      if (n >= 5) goAdmin();
    });
  })();

  // ---------- عرض عنصر وسائط (صورة / فيديو / يوتيوب) ----------
  function media(w, i, eager) {
    var d = el("div", "ph");
    var id = w.type === "youtube" ? ytId(w.src) : null;
    if (w.type === "youtube" && id) {
      var im = new Image(); im.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; im.alt = w.title; im.draggable = false; if (!eager) im.loading = "lazy"; d.appendChild(im); d.appendChild(el("span", "play", "▶"));
    } else if (w.type === "video" && safePath(w.src)) {
      var v = document.createElement("video"); v.src = w.src + "#t=0.5"; v.muted = true; v.preload = "metadata"; v.playsInline = true; d.appendChild(v); d.appendChild(el("span", "play", "▶"));
    } else if (w.type === "image" && safePath(w.src)) {
      var im2 = new Image(); im2.src = w.src; im2.alt = w.title; im2.draggable = false; if (!eager) im2.loading = "lazy"; d.appendChild(im2);
    } else {
      d.style.setProperty("--h", (i * 37 + 20) % 22 + 14); d.appendChild(el("span", "ghost", "▶"));
    }
    return d;
  }
  function card(w, idx, opt) {
    opt = opt || {};
    var b = el("button", "item"); b.type = "button";
    if (opt.clone) { b.tabIndex = -1; b.setAttribute("aria-hidden", "true"); }
    b.appendChild(media(w, idx, opt.eager));
    var cap = el("div", "cap"); cap.appendChild(el("b", "", w.title)); cap.appendChild(el("small", "", w.cat)); b.appendChild(cap);
    b.addEventListener("click", function () { openLightbox(w, idx); });
    return b;
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

  // ---------- العروض والإعلانات ----------
  function todayStr() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function activeAds(list) {
    var t = todayStr();
    return (list || []).filter(function (a) { return (!a.start || a.start <= t) && (!a.end || a.end >= t); });
  }
  function adLink(a, btn) {
    var u = String(a.btnUrl || "");
    if (u.charAt(0) === "#") { var h = /^#[\w-]+$/.test(u) ? u : "#contact"; btn.href = (PAGE === "home" ? "" : "index.html") + h; }
    else if (/^https:\/\//i.test(u)) { btn.href = u; btn.target = "_blank"; btn.rel = "noopener noreferrer"; }
    else { btn.href = wa + "?text=" + encodeURIComponent(a.title); btn.target = "_blank"; btn.rel = "noopener noreferrer"; }
  }
  function adCard(a) {
    var c = el("article", "ad");
    if (safePath(a.image)) { var im = new Image(); im.src = a.image; im.alt = ""; im.loading = "lazy"; c.appendChild(im); }
    c.appendChild(el("span", "tag", "عرض")); c.appendChild(el("h3", "", a.title)); c.appendChild(el("p", "", a.text));
    if (a.btnText) { var b = el("a", "btn small", a.btnText); adLink(a, b); c.appendChild(b); }
    return c;
  }
  function closePopup() { $("#popup").hidden = true; }
  function showPopup(a) {
    if (!a) return;
    try { if (sessionStorage.getItem("pop_" + a.id)) return; sessionStorage.setItem("pop_" + a.id, "1"); } catch (e) {}
    $("#popTitle").textContent = a.title; $("#popText").textContent = a.text;
    var pi = $("#popImg"); pi.textContent = "";
    if (safePath(a.image)) { var im = new Image(); im.src = a.image; im.alt = ""; pi.appendChild(im); }
    var b = $("#popBtn"); b.textContent = a.btnText || "تواصل معنا"; adLink(a, b);
    b.onclick = closePopup; $("#popup").hidden = false;
  }
  $("#popClose").addEventListener("click", closePopup);
  $("#popup").addEventListener("click", function (e) { if (e.target.id === "popup") closePopup(); });

  // ---------- جلب البيانات (Supabase ثم ملفات data/ كاحتياطي) ----------
  function sbGet(table, order) {
    return fetch(SB + "/rest/v1/" + table + "?select=*&order=" + order, { headers: { apikey: SBK, Authorization: "Bearer " + SBK } })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); });
  }
  function loadWorks() {
    var p = SB && SBK ? sbGet("works", "created_at.desc").then(function (rows) { return { works: rows }; }).catch(function () { return getJson("data/works.json"); }) : getJson("data/works.json");
    return p.then(function (j) { return (j.works || []).filter(function (w) { return w && w.title && w.cat; }); });
  }
  function loadAds() {
    var p = SB && SBK ? sbGet("ads", "created_at.desc").then(function (rows) {
      return { ads: rows.map(function (r) { return { id: r.id, title: r.title, text: r.text, image: r.image, btnText: r.btn_text, btnUrl: r.btn_url, start: r.start_date || "", end: r.end_date || "", popup: r.popup }; }) };
    }).catch(function () { return getJson("data/ads.json"); }) : getJson("data/ads.json");
    return p.then(function (j) { return activeAds(j.ads); });
  }

  // ======================= الصفحة الرئيسية =======================
  function initHome() {
    // بطاقات الخدمات (كل بطاقة تفتح صفحة الأعمال على هذه الخدمة)
    var sel = $("#svcSelect");
    C.services.forEach(function (s) {
      var o = el("option", "", s.title); o.value = s.title; sel.appendChild(o);
      var a = el("a", "svc"); a.href = "works.html?cat=" + encodeURIComponent(s.title);
      a.appendChild(el("div", "ic", s.icon)); a.appendChild(el("h3", "", s.title)); a.appendChild(el("p", "", s.text)); a.appendChild(el("span", "more", "شاهد الأعمال ←"));
      $("#svcGrid").appendChild(a);
    });
    var oo = el("option", "", "أخرى"); oo.value = "أخرى"; sel.appendChild(oo);

    // الأرقام: من config.js إن وُجدت، وتعدّ من 0
    var stats = $("#stats");
    if (C.stats && C.stats.length) {
      stats.textContent = "";
      C.stats.forEach(function (s) {
        var d = el("div"), n = el("strong", "", "0"); n.dataset.count = String(+s.n || 0);
        d.appendChild(n); d.appendChild(el("span", "", s.label)); stats.appendChild(d);
      });
    }
    var nums = stats.querySelectorAll("[data-count]");
    function countUp(n) {
      var t = +n.dataset.count, s = null, dur = 1800;
      if (reduced) { n.textContent = t + "+"; return; }
      requestAnimationFrame(function step(ts) {
        s = s || ts; var p = Math.min((ts - s) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        n.textContent = Math.round(t * e) + (p === 1 ? "+" : "");
        if (p < 1) requestAnimationFrame(step);
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); countUp(e.target); } });
      }, { threshold: 0.4 });
      nums.forEach(function (n) { io.observe(n); });
    } else nums.forEach(function (n) { n.textContent = n.dataset.count + "+"; });

    // العروض (3 كحد أقصى) + النافذة المنبثقة
    loadAds().then(function (ads) {
      if (ads.length) {
        $("#offers").hidden = false;
        ads.slice(0, 3).forEach(function (a) { $("#adsGrid").appendChild(adCard(a)); });
        setTimeout(function () { showPopup(ads.filter(function (a) { return a.popup; })[0]); }, 1800);
      }
    });

    loadWorks().then(initStrip);
    initForm();
  }

  // ---------- الشريط المتحرك (إيقاف / تشغيل / سابق / تالي) ----------
  function initStrip(list) {
    var box = $("#strip"), vp = $("#stVp"), track = $("#stTrack");
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    var SPEED = 36; // بكسل في الثانية: بطيء
    var ST = { pos: 0, last: 0, lt: 0, userPaused: reduced, hold: 0, drag: false, hover: false, smoothUntil: 0, setW: 0, step: 280 };
    var pauseBtn = $("#stPause");
    function label() { pauseBtn.textContent = ST.userPaused ? "تشغيل" : "إيقاف"; pauseBtn.setAttribute("aria-pressed", String(ST.userPaused)); }
    label();

    function fill(reps, copies) {
      track.textContent = "";
      for (var c = 0; c < copies; c++) {
        for (var r = 0; r < reps; r++) list.forEach(function (w, i) { track.appendChild(card(w, i, { clone: c > 0 || r > 0, eager: true })); });
      }
    }
    function build() {
      fill(1, 1);
      var one = track.scrollWidth || 1;
      var reps = Math.max(1, Math.ceil(vp.clientWidth * 1.6 / one));
      fill(reps, 3);
      ST.setW = track.scrollWidth / 3;
      var k = track.children;
      ST.step = k.length > 1 ? Math.abs(k[1].offsetLeft - k[0].offsetLeft) || 280 : 280;
      ST.pos = ST.setW; vp.scrollLeft = ST.pos; ST.last = vp.scrollLeft;
    }
    build();

    function frame(t) {
      var dt = ST.lt ? Math.min(64, t - ST.lt) : 16; ST.lt = t;
      var sl = vp.scrollLeft, smoothing = t < ST.smoothUntil;
      if (!smoothing && Math.abs(sl - ST.last) > 2) ST.hold = t + 2500; // المستخدم حرّك الشريط بنفسه
      var auto = !ST.userPaused && !ST.drag && !ST.hover && !smoothing && t >= ST.hold;
      var wrote = false;
      if (auto) ST.pos += SPEED * dt / 1000; else ST.pos = sl;
      if (!smoothing && !ST.drag && (auto || t >= ST.hold)) {
        if (ST.pos >= 2 * ST.setW) { ST.pos -= ST.setW; wrote = true; }
        else if (ST.pos < 0.5 * ST.setW) { ST.pos += ST.setW; wrote = true; }
      }
      if (auto || wrote) vp.scrollLeft = ST.pos;
      ST.last = vp.scrollLeft;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    function nudge(dir) {
      var now = performance.now();
      ST.smoothUntil = now + 600; ST.hold = now + 3500;
      // إعادة التموضع بدون أن يلاحظها أحد (النسخ متطابقة) حتى لا نصل لحافة الشريط
      var cur = vp.scrollLeft;
      if (cur < 0.9 * ST.setW) vp.scrollLeft = cur + ST.setW;
      else if (cur > 1.9 * ST.setW) vp.scrollLeft = cur - ST.setW;
      vp.scrollTo({ left: vp.scrollLeft + dir * ST.step, behavior: "smooth" });
    }
    $("#stPrev").addEventListener("click", function () { nudge(-1); });
    $("#stNext").addEventListener("click", function () { nudge(1); });
    pauseBtn.addEventListener("click", function () { ST.userPaused = !ST.userPaused; label(); });
    vp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nudge(1); }
      else if (e.key === " " && e.target === vp) { e.preventDefault(); ST.userPaused = !ST.userPaused; label(); }
    });
    // توقف مؤقت عند مرور الماوس
    vp.addEventListener("mouseenter", function () { ST.hover = true; });
    vp.addEventListener("mouseleave", function () { ST.hover = false; });
    // سحب بالماوس (اللمس يتحرك بالسحب الطبيعي)
    var dx0 = 0, sl0 = 0, moved = false;
    vp.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      ST.drag = true; moved = false; dx0 = e.clientX; sl0 = vp.scrollLeft; vp.classList.add("grab"); e.preventDefault();
    });
    window.addEventListener("pointermove", function (e) {
      if (!ST.drag) return;
      var d = e.clientX - dx0; if (Math.abs(d) > 6) moved = true;
      vp.scrollLeft = sl0 - d;
    });
    window.addEventListener("pointerup", function () {
      if (!ST.drag) return;
      ST.drag = false; vp.classList.remove("grab"); ST.hold = performance.now() + 2500;
    });
    vp.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    var rt = null;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 250); });
  }

  // ======================= صفحة الأعمال =======================
  function initWorks() {
    var all = [], cur = "الكل";
    var q = new URLSearchParams(location.search).get("cat");
    if (q && C.services.some(function (s) { return s.title === q; })) cur = q;
    var tabs = $("#svcTabs");
    function drawTabs() {
      tabs.textContent = "";
      [{ title: "الكل", icon: "✨" }].concat(C.services).forEach(function (s) {
        var n = all.filter(function (w) { return s.title === "الكل" || w.cat === s.title; }).length;
        var b = el("button", "tab" + (cur === s.title ? " on" : "")); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", cur === s.title);
        b.appendChild(el("span", "ic", s.icon)); b.appendChild(el("span", "", s.title)); b.appendChild(el("small", "", String(n)));
        b.addEventListener("click", function () {
          cur = s.title; drawTabs(); drawGrid();
          try { history.replaceState(null, "", cur === "الكل" ? "works.html" : "works.html?cat=" + encodeURIComponent(cur)); } catch (e) {}
        });
        tabs.appendChild(b);
      });
      var s = C.services.filter(function (x) { return x.title === cur; })[0];
      $("#svcDesc").textContent = s ? s.text : "كل ما تحتاجه من التصوير حتى التسويق، في مكان واحد.";
      var on = $(".tab.on", tabs);
      if (on && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft += on.getBoundingClientRect().left + on.offsetWidth / 2 - (tabs.getBoundingClientRect().left + tabs.clientWidth / 2);
    }
    function drawGrid() {
      var list = all.filter(function (w) { return cur === "الكل" || w.cat === cur; });
      var g = $("#wGrid"); g.textContent = "";
      $("#empty").hidden = list.length > 0;
      list.forEach(function (w, i) { g.appendChild(card(w, i)); });
    }
    drawTabs();
    loadWorks().then(function (rows) { all = rows; drawTabs(); drawGrid(); });
  }

  // ======================= صفحة العروض =======================
  function initOffers() {
    loadAds().then(function (ads) {
      var g = $("#adsGrid"); g.textContent = "";
      $("#adsEmpty").hidden = ads.length > 0;
      ads.forEach(function (a) { g.appendChild(adCard(a)); });
    });
  }

  // ---------- نموذج التواصل ----------
  function initForm() {
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
  }

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

  // ---------- تشغيل الصفحة ----------
  if (PAGE === "home") initHome();
  else if (PAGE === "works") initWorks();
  else if (PAGE === "offers") initOffers();
})();
