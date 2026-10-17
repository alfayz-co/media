(function () {
  "use strict";
  var C0 = window.CONFIG, A = window.ALF;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(text, cls, fn) { var b = el("button", cls, text); b.type = "button"; if (fn) b.addEventListener("click", fn); return b; }
  document.querySelectorAll("[data-cfg]").forEach(function (n) { n.textContent = C0[n.dataset.cfg] || ""; });

  var URL_ = (C0.supabaseUrl || "").replace(/\/+$/, ""), KEY = C0.supabaseKey || "";
  var PUB = URL_ + "/storage/v1/object/public/media/";
  var MAX_VIDEO = 50 * 1024 * 1024;
  var sess = null; // {access, refresh}
  var RAW = {};    // الإعدادات المحفوظة فقط
  var M = C0;      // الإعدادات الفعلية = الافتراضية + المحفوظة
  if (!URL_ || !KEY) $("#cfgWarn").hidden = false;

  // ---------- الجلسة ----------
  function saveSess(remember) { try { var v = JSON.stringify(sess); sessionStorage.setItem("alf_s", v); if (remember) localStorage.setItem("alf_s", v); else localStorage.removeItem("alf_s"); } catch (e) {} }
  function loadSess() { try { var v = localStorage.getItem("alf_s") || sessionStorage.getItem("alf_s"); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function clearSess() { sess = null; try { sessionStorage.removeItem("alf_s"); localStorage.removeItem("alf_s"); } catch (e) {} }

  function auth(grant, body) {
    return fetch(URL_ + "/auth/v1/token?grant_type=" + grant, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.access_token) throw new Error(r.status === 400 ? "اسم المستخدم أو كلمة المرور غير صحيحة." : "تعذر تسجيل الدخول."); return j; }); });
  }
  // طلب موثّق مع تجديد تلقائي للجلسة عند انتهائها
  function api(path, opt, retry) {
    opt = opt || {};
    var h = { apikey: KEY, Authorization: "Bearer " + sess.access };
    if (opt.json) { h["Content-Type"] = "application/json"; h.Prefer = "return=representation"; }
    if (opt.type) h["Content-Type"] = opt.type;
    return fetch(URL_ + path, { method: opt.method || "GET", headers: h, body: opt.json ? JSON.stringify(opt.json) : opt.body }).then(function (r) {
      if ((r.status === 401 || (r.status === 400 && path.indexOf("/storage/") === 0)) && !retry && sess.refresh) {
        return auth("refresh_token", { refresh_token: sess.refresh }).then(function (j) { sess = { access: j.access_token, refresh: j.refresh_token }; saveSess(!!localStorage.getItem("alf_s")); return api(path, opt, true); });
      }
      if (r.status === 401 || r.status === 403) throw new Error("لا تملك صلاحية التعديل. سجّل الدخول من جديد.");
      if (r.status === 404 && path.indexOf("site_settings") >= 0) throw new Error("شغّل ملف supabase-update.sql في Supabase أولاً.");
      if (!r.ok) throw new Error(path.indexOf("/rest/v1/works") === 0 && r.status === 400 ? "تعذر الحفظ. شغّل ملف supabase-update.sql أولاً." : "حدث خطأ (" + r.status + "). حاول مرة أخرى.");
      return r.status === 204 ? [] : r.text().then(function (t) { try { return JSON.parse(t); } catch (e) { return t; } });
    });
  }
  function readRows(t) { return fetch(URL_ + "/rest/v1/" + t + "?select=*&order=created_at.desc", { headers: { apikey: KEY, Authorization: "Bearer " + sess.access } }).then(function (r) { if (!r.ok) throw new Error("تعذر قراءة البيانات. تأكد من تشغيل ملف SQL."); return r.json(); }); }

  // ---------- ملفات ----------
  function safeName(name, ext) { return Date.now() + "-" + String(name || "file").replace(/\.[^.]+$/, "").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) + "." + ext; }
  // الصور العادية JPEG، والشعارات PNG للحفاظ على الشفافية
  function shrinkImage(file, max, mime) {
    max = max || 1600; mime = mime || "image/jpeg";
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      var c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error("تعذر قراءة الصورة.")); }, mime, 0.82); });
    });
  }
  function upload(path, blob, type) { return api("/storage/v1/object/media/" + path, { method: "POST", body: blob, type: type }).then(function () { return PUB + path; }); }
  function uploadImage(file, folder, max, mime) {
    var png = mime === "image/png";
    return shrinkImage(file, max, mime).then(function (b) { return upload(folder + "/" + safeName(file.name, png ? "png" : "jpg"), b, png ? "image/png" : "image/jpeg"); });
  }
  function removeObj(url) {
    if (!url || String(url).indexOf(PUB) !== 0) return Promise.resolve();
    return api("/storage/v1/object/media/" + url.slice(PUB.length), { method: "DELETE" }).catch(function () {});
  }
  function ytId(u) { var m = String(u || "").match(/^[\w-]{11}$/) || String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? (m[1] || m[0]) : null; }
  var LINK_RE = {
    tiktok: /^https:\/\/((www|vm|vt|m)\.)?tiktok\.com\//i,
    instagram: /^https:\/\/(www\.)?instagram\.com\//i,
    vimeo: /^https:\/\/((www|player)\.)?vimeo\.com\//i,
    facebook: /^https:\/\/((www|m|web)\.facebook\.com|fb\.watch)\//i,
    link: /^https:\/\//i
  };
  var LINK_NAME = { youtube: "يوتيوب", tiktok: "تيك توك", instagram: "إنستجرام", vimeo: "فيمو", facebook: "فيسبوك", link: "رابط" };
  // يرجع القيمة التي تُحفظ في العمود src أو يرمي خطأ
  function parseLink(type, url) {
    url = String(url || "").trim();
    if (type === "youtube") { var id = ytId(url); if (!id) throw new Error("رابط يوتيوب غير صحيح."); return id; }
    if (!LINK_RE[type] || !LINK_RE[type].test(url) || url.length > 500) throw new Error("الرابط غير صحيح لهذه المنصة. يجب أن يبدأ بـ https:// ويكون من " + LINK_NAME[type] + ".");
    return url;
  }
  function typeName(t) { return t === "image" ? "صورة" : t === "video" ? "فيديو" : (LINK_NAME[t] || t); }

  // ---------- واجهة ----------
  var busy = false;
  function msg(t, err) { var m = $("#msg"); m.textContent = t; m.className = "msg" + (err ? " err" : ""); if (t) m.scrollIntoView({ block: "nearest" }); }
  function lock(b, on) { busy = on; if (b) b.disabled = on; }
  function confirmBtn(b, fn) {
    b.addEventListener("click", function () {
      if (busy) return;
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "تأكيد الحذف؟"; setTimeout(function () { b.dataset.sure = ""; b.textContent = "حذف"; }, 4000); return; }
      fn(b);
    });
  }
  function catSelect(sel, cur) {
    sel.textContent = "";
    var seen = false;
    M.services.forEach(function (s) { var o = el("option", "", s.title); o.value = s.title; if (s.title === cur) { o.selected = true; seen = true; } sel.appendChild(o); });
    if (cur && !seen) { var o2 = el("option", "", cur); o2.value = cur; o2.selected = true; sel.appendChild(o2); }
  }
  function field(label, input) { var l = el("label", "", label); l.appendChild(input); return l; }

  // ----- الأعمال -----
  var WORKS = [], ADS = [];
  function drawWorks(list) {
    WORKS = list;
    var box = $("#wList"); box.textContent = "";
    if (!list.length) { box.appendChild(el("p", "hint", "لا توجد أعمال بعد.")); return; }
    list.forEach(function (w) {
      var r = el("div", "row"), d = el("div");
      d.appendChild(el("b", "", w.title)); d.appendChild(el("small", "", w.cat + " · " + typeName(w.type)));
      var acts = el("div", "acts");
      acts.appendChild(btn("تعديل", "edit", function () { if (!busy) editWork(w, r); }));
      var b = el("button", "del", "حذف"); b.type = "button"; confirmBtn(b, function () { removeWork(w, b); }); acts.appendChild(b);
      r.appendChild(d); r.appendChild(acts); box.appendChild(r);
    });
  }
  function editWork(w, row) {
    row.textContent = ""; row.className = "row editing";
    var ef = el("div", "ef");
    var t = el("input"); t.maxLength = 80; t.value = w.title;
    var c = el("select"); catSelect(c, w.cat);
    ef.appendChild(field("العنوان", t)); ef.appendChild(field("الخدمة", c));
    var u = null, th = null, isLink = !(w.type === "image" || w.type === "video");
    if (isLink) { u = el("input"); u.dir = "ltr"; u.maxLength = 500; u.value = w.type === "youtube" ? "https://youtu.be/" + w.src : w.src; ef.appendChild(field("الرابط", u)); }
    if (isLink && w.type !== "youtube") { th = el("input"); th.type = "file"; th.accept = "image/*"; ef.appendChild(field("تغيير صورة الغلاف (اختياري)", th)); }
    var acts = el("div", "acts");
    var save = btn("حفظ", "btn small", function () {
      if (busy) return;
      var title = t.value.trim(); if (title.length < 2) return msg("العنوان قصير.", true);
      var patch = { title: title, cat: c.value }, oldThumb = null;
      try { if (u) patch.src = parseLink(w.type, u.value); } catch (e) { return msg(e.message, true); }
      lock(save, true); msg("جارٍ الحفظ...");
      var prep = th && th.files[0] ? uploadImage(th.files[0], "works", 1200).then(function (p) { patch.thumb = p; oldThumb = w.thumb; }) : Promise.resolve();
      prep.then(function () { return api("/rest/v1/works?id=eq." + encodeURIComponent(w.id), { method: "PATCH", json: patch }); })
        .then(function () { return oldThumb ? removeObj(oldThumb) : null; })
        .then(function () { return readRows("works"); })
        .then(function (rows) { drawWorks(rows); msg("تم حفظ التعديل."); })
        .catch(function (e) { msg(e.message || "فشل الحفظ.", true); }).then(function () { lock(save, false); });
    });
    acts.appendChild(save); acts.appendChild(btn("إلغاء", "edit", function () { drawWorks(WORKS); }));
    ef.appendChild(acts); row.appendChild(ef);
  }
  function addWork() {
    if (busy) return;
    var title = $("#wTitle").value.trim(), cat = $("#wCat").value, type = $("#wType").value, file = $("#wFile").files[0], link = $("#wYt").value.trim(), thumb = $("#wThumb").files[0];
    var isFile = type === "image" || type === "video", src = "";
    if (title.length < 2) return msg("اكتب عنوان العمل.", true);
    if (isFile && !file) return msg("اختر الملف أولاً.", true);
    if (!isFile) { try { src = parseLink(type, link); } catch (e) { return msg(e.message, true); } }
    if (type === "video" && file.size > MAX_VIDEO) return msg("حجم الفيديو أكبر من 50 ميجا. ارفعه على يوتيوب والصق الرابط.", true);
    var b = $("#wAdd"); lock(b, true); msg("جارٍ الرفع، انتظر...");
    var row = { title: title, cat: cat, type: type, src: src, thumb: "" };
    var prep;
    if (type === "image") prep = uploadImage(file, "works", 1600).then(function (p) { row.src = p; });
    else if (type === "video") { var ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "mp4"; prep = upload("works/" + safeName(file.name, ext), file, file.type || "video/mp4").then(function (p) { row.src = p; }); }
    else prep = thumb ? uploadImage(thumb, "works", 1200).then(function (p) { row.thumb = p; }) : Promise.resolve();
    prep.then(function () { return api("/rest/v1/works", { method: "POST", json: row }); })
      .then(function () { return readRows("works"); })
      .then(function (rows) { drawWorks(rows); ["#wTitle", "#wFile", "#wYt", "#wThumb"].forEach(function (s) { $(s).value = ""; }); msg("تمت الإضافة وتظهر في الموقع فوراً."); })
      .catch(function (e) { msg(e.message || "فشل الرفع.", true); }).then(function () { lock(b, false); });
  }
  function removeWork(w, b) {
    lock(b, true); msg("جارٍ الحذف...");
    api("/rest/v1/works?id=eq." + encodeURIComponent(w.id), { method: "DELETE" })
      .then(function () { return w.type === "image" || w.type === "video" ? removeObj(w.src) : null; })
      .then(function () { return removeObj(w.thumb); })
      .then(function () { return readRows("works"); })
      .then(function (rows) { drawWorks(rows); msg("تم الحذف."); })
      .catch(function (e) { msg(e.message || "فشل الحذف.", true); }).then(function () { busy = false; });
  }

  // ----- العروض -----
  function drawAds(list) {
    ADS = list;
    var box = $("#aList"); box.textContent = "";
    if (!list.length) { box.appendChild(el("p", "hint", "لا توجد عروض بعد.")); return; }
    list.forEach(function (a) {
      var r = el("div", "row"), d = el("div");
      d.appendChild(el("b", "", a.title)); d.appendChild(el("small", "", (a.start_date || "من الآن") + " ← " + (a.end_date || "بدون نهاية")));
      var acts = el("div", "acts");
      acts.appendChild(btn("تعديل", "edit", function () { if (!busy) editAd(a, r); }));
      var b = el("button", "del", "حذف"); b.type = "button"; confirmBtn(b, function () { removeAd(a, b); }); acts.appendChild(b);
      r.appendChild(d); r.appendChild(acts); box.appendChild(r);
    });
  }
  function editAd(a, row) {
    row.textContent = ""; row.className = "row editing";
    var ef = el("div", "ef");
    var t = el("input"); t.maxLength = 80; t.value = a.title;
    var x = el("textarea"); x.rows = 3; x.maxLength = 240; x.value = a.text;
    var s = el("input"); s.type = "date"; s.value = a.start_date || "";
    var e = el("input"); e.type = "date"; e.value = a.end_date || "";
    var bt = el("input"); bt.maxLength = 30; bt.value = a.btn_text || "";
    var im = el("input"); im.type = "file"; im.accept = "image/*";
    var pop = el("input"); pop.type = "checkbox"; pop.checked = !!a.popup;
    var pl = el("label", "chk"); pl.appendChild(pop); pl.appendChild(document.createTextNode(" يظهر كنافذة منبثقة"));
    ef.appendChild(field("العنوان", t)); ef.appendChild(field("النص", x)); ef.appendChild(field("يبدأ في", s)); ef.appendChild(field("ينتهي في", e));
    ef.appendChild(field("نص الزر", bt)); ef.appendChild(field("تغيير الصورة (اختياري)", im)); ef.appendChild(pl);
    var acts = el("div", "acts");
    var save = btn("حفظ", "btn small", function () {
      if (busy) return;
      if (t.value.trim().length < 2 || x.value.trim().length < 2) return msg("اكتب العنوان والنص.", true);
      if (s.value && e.value && e.value < s.value) return msg("تاريخ الانتهاء قبل تاريخ البداية.", true);
      var patch = { title: t.value.trim(), text: x.value.trim(), start_date: s.value || null, end_date: e.value || null, btn_text: bt.value.trim() || "تواصل معنا", popup: pop.checked }, old = null;
      lock(save, true); msg("جارٍ الحفظ...");
      var prep = im.files[0] ? uploadImage(im.files[0], "ads", 1600).then(function (p) { patch.image = p; old = a.image; }) : Promise.resolve();
      prep.then(function () { return api("/rest/v1/ads?id=eq." + encodeURIComponent(a.id), { method: "PATCH", json: patch }); })
        .then(function () { return old ? removeObj(old) : null; })
        .then(function () { return readRows("ads"); })
        .then(function (rows) { drawAds(rows); msg("تم حفظ التعديل."); })
        .catch(function (er) { msg(er.message || "فشل الحفظ.", true); }).then(function () { lock(save, false); });
    });
    acts.appendChild(save); acts.appendChild(btn("إلغاء", "edit", function () { drawAds(ADS); }));
    ef.appendChild(acts); row.appendChild(ef);
  }
  function refresh() { return Promise.all([readRows("works"), readRows("ads")]).then(function (r) { drawWorks(r[0]); drawAds(r[1]); }); }
  function addAd() {
    if (busy) return;
    var title = $("#aTitle").value.trim(), text = $("#aText").value.trim(), start = $("#aStart").value, end = $("#aEnd").value, img = $("#aImg").files[0];
    if (title.length < 2 || text.length < 2) return msg("اكتب العنوان والنص.", true);
    if (start && end && end < start) return msg("تاريخ الانتهاء قبل تاريخ البداية.", true);
    var b = $("#aAdd"); lock(b, true); msg("جارٍ النشر...");
    var prep = img ? uploadImage(img, "ads", 1600) : Promise.resolve("");
    prep.then(function (p) {
      return api("/rest/v1/ads", { method: "POST", json: { title: title, text: text, image: p, btn_text: $("#aBtn").value.trim() || "تواصل معنا", btn_url: $("#aUrl").value, start_date: start || null, end_date: end || null, popup: $("#aPop").checked } });
    }).then(function () { return readRows("ads"); })
      .then(function (rows) { drawAds(rows); ["#aTitle", "#aText", "#aStart", "#aEnd", "#aImg"].forEach(function (s) { $(s).value = ""; }); msg("تم نشر العرض وهو يظهر في الموقع فوراً."); })
      .catch(function (e) { msg(e.message || "فشل النشر.", true); }).then(function () { lock(b, false); });
  }
  function removeAd(a, b) {
    lock(b, true); msg("جارٍ الحذف...");
    api("/rest/v1/ads?id=eq." + encodeURIComponent(a.id), { method: "DELETE" })
      .then(function () { return removeObj(a.image); })
      .then(function () { return readRows("ads"); })
      .then(function (rows) { drawAds(rows); msg("تم الحذف."); })
      .catch(function (e) { msg(e.message || "فشل الحذف.", true); }).then(function () { busy = false; });
  }

  // ======================= نماذج الإعدادات (مبنية من وصف) =======================
  var FORMS = {
    home: [
      { h: "الواجهة" },
      { k: "hero.title1", l: "العنوان: السطر الأول", m: 60 }, { k: "hero.title2", l: "العنوان: السطر الثاني (ملوّن)", m: 60 },
      { k: "hero.lead", l: "النص تحت العنوان", area: 1, m: 300 },
      { k: "hero.btn1", l: "نص الزر الأول", m: 30 }, { k: "hero.btn2", l: "نص الزر الثاني", m: 30 },
      { k: "hero.stripTitle", l: "عنوان الشريط المتحرك", m: 40 },
      { k: "hero.bg", l: "صورة خلفية الواجهة (اختياري)", img: 1, max: 1920 },
      { h: "الأرقام" },
      { k: "stats", l: "الأرقام التي تعدّ من 0", list: 1, cols: [{ k: "n", l: "الرقم", num: 1 }, { k: "label", l: "الوصف" }], max: 6 },
      { h: "من نحن" },
      { k: "about.title", l: "العنوان", m: 40 }, { k: "about.p1", l: "الفقرة الأولى", area: 1, m: 600 }, { k: "about.p2", l: "الفقرة الثانية", area: 1, m: 600 },
      { k: "about.ticks", l: "النقاط", list: 1, scalar: 1, max: 8 },
      { h: "عناوين الأقسام" },
      { k: "texts.servicesTitle", l: "عنوان الخدمات", m: 40 }, { k: "texts.servicesSub", l: "نص تحت عنوان الخدمات", m: 120 },
      { k: "texts.offersHomeTitle", l: "عنوان قسم العروض", m: 40 }, { k: "texts.offersHomeSub", l: "نص تحت عنوان العروض", m: 120 },
      { k: "texts.contactTitle", l: "عنوان التواصل", m: 40 }, { k: "texts.contactSub", l: "نص تحت عنوان التواصل", m: 160 }
    ],
    pages: [
      { h: "صفحة الأعمال" },
      { k: "texts.worksEyebrow", l: "العنوان الصغير", m: 40 }, { k: "texts.worksTitle", l: "العنوان", m: 40 }, { k: "texts.worksLead", l: "النص", area: 1, m: 300 },
      { h: "صفحة العروض" },
      { k: "texts.offersEyebrow", l: "العنوان الصغير", m: 40 }, { k: "texts.offersTitle", l: "العنوان", m: 40 }, { k: "texts.offersLead", l: "النص", area: 1, m: 300 },
      { k: "texts.offersEmpty", l: "نص عند عدم وجود عروض", area: 1, m: 300 }
    ],
    services: [
      { k: "services", l: "الخدمات", list: 1, track: "title", min: 1, max: 20, cols: [{ k: "icon", l: "أيقونة", m: 4 }, { k: "title", l: "اسم الخدمة", m: 40 }, { k: "text", l: "الوصف", m: 200 }] }
    ],
    brand: [
      { k: "name", l: "اسم الشركة", m: 40 }, { k: "tagline", l: "الشعار النصي (يظهر فوق العنوان)", m: 80 },
      { k: "logoMark", l: "شعار الهيدر والواجهة (يفضّل PNG شفاف)", img: 1, max: 800, png: 1 },
      { k: "logo", l: "شعار صفحة من نحن", img: 1, max: 800, png: 1 },
      { k: "accent", l: "اللون الرئيسي للموقع", color: 1 }
    ],
    contact: [
      { k: "whatsapp", l: "رقم الواتساب بصيغة دولية بدون + (مثل 966507588176)", dir: 1, m: 20, v: function (x) { return /^\d{9,15}$/.test(x) ? "" : "رقم الواتساب أرقام فقط (9 إلى 15 رقماً)."; } },
      { k: "phoneShow", l: "الرقم الظاهر للزوار", dir: 1, m: 20 },
      { k: "email", l: "البريد (اتركه فارغاً لإخفائه)", dir: 1, m: 80, v: function (x) { return !x || /.+@.+\..+/.test(x) ? "" : "البريد غير صحيح."; } },
      { k: "address", l: "العنوان", m: 120 }, { k: "hours", l: "أوقات العمل", m: 120 },
      { k: "web3formsKey", l: "مفتاح نموذج التواصل web3forms (اختياري)", dir: 1, m: 60 },
      { k: "social", l: "حسابات السوشيال", list: 1, cols: [{ k: "name", l: "الاسم", m: 30 }, { k: "url", l: "الرابط (https://)", m: 300, dir: 1, https: 1 }], max: 10 },
      { k: "bot.greeting", l: "رسالة ترحيب المساعد الآلي", area: 1, m: 200 },
      { k: "bot.fallback", l: "ردّ المساعد عند عدم الفهم", area: 1, m: 200 }
    ]
  };
  var FIELDS = {}; // tab -> [{spec, collect}]

  function mkList(spec, items) {
    var wrap = el("div", "lst"), rows = el("div", "lst"); wrap.appendChild(rows);
    function addRow(it) {
      var r = el("div", "lrow"), cells = el("div", "cells" + (spec.scalar ? "" : spec.cols.length === 3 ? " c3" : spec.cols.length === 2 ? " c2" : ""));
      var inputs = [];
      if (spec.scalar) { var i0 = el("input"); i0.maxLength = 120; i0.value = it || ""; cells.appendChild(i0); inputs.push({ c: null, i: i0 }); }
      else spec.cols.forEach(function (c) {
        var i = el("input"); i.maxLength = c.m || 100; i.placeholder = c.l; if (c.num) { i.type = "number"; i.min = "0"; i.max = "99999999"; i.inputMode = "numeric"; } if (c.dir) i.dir = "ltr";
        i.value = it && it[c.k] != null ? it[c.k] : ""; i.title = c.l; cells.appendChild(i); inputs.push({ c: c, i: i });
      });
      if (spec.track && it) r.dataset.orig = it[spec.track] || "";
      var ctl = el("div", "ctl");
      ctl.appendChild(btn("↑", "mini", function () { if (r.previousSibling) rows.insertBefore(r, r.previousSibling); }));
      ctl.appendChild(btn("↓", "mini", function () { if (r.nextSibling) rows.insertBefore(r.nextSibling, r); }));
      ctl.appendChild(btn("✕", "mini", function () { r.remove(); }));
      r.appendChild(cells); r.appendChild(ctl); r._in = inputs; rows.appendChild(r);
    }
    (items || []).forEach(addRow);
    wrap.appendChild(btn("+ إضافة", "mini", function () { if (!spec.max || rows.children.length < spec.max) addRow(spec.scalar ? "" : {}); }));
    wrap._get = function () {
      var out = [];
      Array.prototype.forEach.call(rows.children, function (r) {
        if (spec.scalar) { var v = r._in[0].i.value.trim(); if (v) out.push(v); return; }
        var o = {}, any = false;
        r._in.forEach(function (x) { var v = x.i.value.trim(); if (v) any = true; o[x.c.k] = x.c.num ? (v === "" ? "" : Math.max(0, Math.round(+v))) : v; });
        if (any) { if (spec.track) o._o = r.dataset.orig || ""; out.push(o); }
      });
      return out;
    };
    return wrap;
  }

  function buildForm(tab) {
    var box = $("#f-" + tab); box.textContent = ""; FIELDS[tab] = [];
    FORMS[tab].forEach(function (spec) {
      if (spec.h) { box.appendChild(el("h3", "", spec.h)); return; }
      var cur = A.getPath(M, spec.k), f = { spec: spec }, node;
      if (spec.list) {
        var lw = mkList(spec, Array.isArray(cur) ? cur : []); node = el("div"); node.appendChild(el("b", "", spec.l)); node.appendChild(lw);
        f.collect = function (next, ctx) {
          var arr = lw._get();
          if (spec.min && arr.length < spec.min) throw new Error("أضف عنصراً واحداً على الأقل في: " + spec.l);
          if (spec.k === "services") {
            var seen = {};
            arr.forEach(function (s) {
              if (s.title.length < 2) throw new Error("اسم الخدمة قصير.");
              if (seen[s.title]) throw new Error("اسم الخدمة مكرر: " + s.title);
              seen[s.title] = 1; if (!s.icon) s.icon = "⭐";
              if (s._o && s._o !== s.title) ctx.renames.push([s._o, s.title]);
            });
          }
          if (spec.k === "stats") arr.forEach(function (s) { if (s.n === "" || !s.label) throw new Error("أكمل الرقم والوصف في كل سطر من الأرقام."); });
          if (spec.k === "social") arr.forEach(function (s) { if (!s.name || !/^https:\/\//i.test(s.url || "")) throw new Error("رابط السوشيال يجب أن يبدأ بـ https:// ومعه اسم."); });
          arr.forEach(function (s) { delete s._o; });
          if (arr.length || spec.k === "social") A.setPath(next, spec.k, arr); else A.delPath(next, spec.k);
        };
      } else if (spec.img) {
        var input = el("input"); input.type = "file"; input.accept = "image/*"; f.cur = cur || ""; f.removed = false;
        var prev = el("img"); prev.alt = ""; if (f.cur && f.cur.indexOf(PUB) === 0) prev.src = f.cur; else prev.hidden = true;
        var rm = btn("إزالة", "mini", function () { f.removed = true; input.value = ""; prev.hidden = true; });
        var iw = el("div", "imgf"); iw.appendChild(prev); iw.appendChild(input); iw.appendChild(rm);
        node = el("div"); node.appendChild(el("b", "", spec.l)); node.appendChild(iw);
        f.collect = function (next, ctx) {
          var file = input.files[0];
          if (file) return uploadImage(file, "site", spec.max || 1200, spec.png ? "image/png" : "image/jpeg").then(function (p) { if (f.cur) ctx.olds.push(f.cur); f.cur = p; A.setPath(next, spec.k, p); });
          if (f.removed) { if (f.cur) ctx.olds.push(f.cur); f.cur = ""; A.delPath(next, spec.k); }
        };
      } else if (spec.color) {
        var ci = el("input"); ci.type = "color"; ci.value = /^#[0-9a-f]{6}$/i.test(cur || "") ? cur : "#d98e45";
        var reset = btn("اللون الافتراضي", "mini", function () { ci.value = "#d98e45"; ci.dataset.reset = "1"; });
        ci.addEventListener("input", function () { ci.dataset.reset = ""; ci.dataset.set = "1"; });
        ci.dataset.set = /^#[0-9a-f]{6}$/i.test(cur || "") ? "1" : "";
        var cw = el("div", "imgf"); cw.appendChild(ci); cw.appendChild(reset);
        node = el("div"); node.appendChild(el("b", "", spec.l)); node.appendChild(cw);
        f.collect = function (next) { if (ci.dataset.reset === "1" || ci.dataset.set !== "1") A.delPath(next, spec.k); else A.setPath(next, spec.k, ci.value); };
      } else {
        var inp = spec.area ? el("textarea") : el("input"); if (spec.area) inp.rows = 3; inp.maxLength = spec.m || 200; if (spec.dir) inp.dir = "ltr";
        inp.value = typeof cur === "string" ? cur : "";
        node = field(spec.l, inp);
        f.collect = function (next) {
          var v = inp.value.trim();
          if (spec.v) { var er = spec.v(v); if (er) throw new Error(er); }
          if (v) A.setPath(next, spec.k, v); else A.delPath(next, spec.k);
        };
      }
      box.appendChild(node); FIELDS[tab].push(f);
    });
  }

  function persist(data) {
    return api("/rest/v1/site_settings?id=eq.main", { method: "PATCH", json: { data: data, updated_at: new Date().toISOString() } }).then(function (rows) {
      if (Array.isArray(rows) && rows.length) return;
      return api("/rest/v1/site_settings", { method: "POST", json: { id: "main", data: data } });
    });
  }
  function saveTab(tab, b) {
    if (busy) return;
    lock(b, true); msg("جارٍ الحفظ...");
    var next = JSON.parse(JSON.stringify(RAW)), ctx = { olds: [], renames: [] }, chain = Promise.resolve();
    FIELDS[tab].forEach(function (f) { chain = chain.then(function () { return f.collect(next, ctx); }); });
    chain.then(function () { return persist(next); })
      .then(function () {
        return ctx.renames.reduce(function (p, rn) { return p.then(function () { return api("/rest/v1/works?cat=eq." + encodeURIComponent(rn[0]), { method: "PATCH", json: { cat: rn[1] } }); }); }, Promise.resolve());
      })
      .then(function () {
        RAW = next; M = A.merge(C0, RAW);
        ctx.olds.forEach(removeObj);
        catSelect($("#wCat"), $("#wCat").value);
        return ctx.renames.length ? readRows("works").then(drawWorks) : null;
      })
      .then(function () { buildForm(tab); msg("تم الحفظ. حدّث صفحة الموقع لتشاهد التغيير."); })
      .catch(function (e) { msg(e.message || "فشل الحفظ.", true); }).then(function () { lock(b, false); });
  }

  // ---------- أحداث ----------
  $("#wType").addEventListener("change", function () {
    var t = this.value, isFile = t === "image" || t === "video";
    $("#wFileBox").hidden = !isFile; $("#wYtBox").hidden = isFile; $("#wThumbBox").hidden = isFile || t === "youtube";
    $("#wFile").accept = t === "video" ? "video/mp4,video/webm" : "image/*";
    $("#wYt").placeholder = t === "tiktok" ? "https://www.tiktok.com/@name/video/123..." : t === "instagram" ? "https://www.instagram.com/reel/..." : "https://...";
  });
  document.querySelectorAll(".t").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".t").forEach(function (x) { x.classList.toggle("on", x === b); });
      document.querySelectorAll('[id^="tab-"]').forEach(function (p) { p.hidden = p.id !== "tab-" + b.dataset.tab; });
      msg("");
    });
  });
  document.querySelectorAll("[data-save]").forEach(function (b) { b.addEventListener("click", function () { saveTab(b.dataset.save, b); }); });
  $("#wAdd").addEventListener("click", addWork);
  $("#aAdd").addEventListener("click", addAd);
  function enter() {
    $("#loginBox").hidden = true; $("#app").hidden = false;
    return A.loadSettings(C0).then(function (raw) { RAW = raw || {}; M = A.merge(C0, RAW); catSelect($("#wCat")); Object.keys(FORMS).forEach(buildForm); });
  }
  $("#logout").addEventListener("click", function () { clearSess(); $("#pass").value = ""; $("#app").hidden = true; $("#loginBox").hidden = false; });
  function login() {
    var lm = $("#loginMsg"), em = $("#email").value.trim(), pw = $("#pass").value;
    if (!URL_ || !KEY) { lm.textContent = "أكمل إعداد Supabase في config.js أولاً."; lm.className = "msg err"; return; }
    if (!/.+@.+\..+/.test(em) || !pw) { lm.textContent = "اكتب البريد وكلمة المرور."; lm.className = "msg err"; return; }
    lm.className = "msg"; lm.textContent = "جارٍ التحقق...";
    $("#loginBtn").disabled = true;
    auth("password", { email: em, password: pw })
      .then(function (j) { sess = { access: j.access_token, refresh: j.refresh_token }; return refresh(); })
      .then(function () { saveSess($("#remember").checked); $("#pass").value = ""; lm.textContent = ""; return enter(); })
      .catch(function (e) { sess = null; lm.textContent = e.message || "تعذر الدخول."; lm.className = "msg err"; })
      .then(function () { $("#loginBtn").disabled = false; });
  }
  $("#loginBtn").addEventListener("click", login);
  $("#pass").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  // استعادة جلسة محفوظة
  var old = URL_ && KEY ? loadSess() : null;
  if (old) { sess = old; refresh().then(enter).catch(function () { return auth("refresh_token", { refresh_token: old.refresh }).then(function (j) { sess = { access: j.access_token, refresh: j.refresh_token }; saveSess(!!localStorage.getItem("alf_s")); return refresh(); }).then(enter); }).catch(function () { clearSess(); }); }
})();
