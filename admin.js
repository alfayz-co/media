(function () {
  "use strict";
  var C = window.CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  document.querySelectorAll("[data-cfg]").forEach(function (n) { n.textContent = C[n.dataset.cfg] || ""; });

  var URL_ = (C.supabaseUrl || "").replace(/\/+$/, ""), KEY = C.supabaseKey || "";
  var PUB = URL_ + "/storage/v1/object/public/media/";
  var MAX_VIDEO = 50 * 1024 * 1024;
  var sess = null; // {access, refresh}
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
      if (!r.ok) throw new Error("حدث خطأ (" + r.status + "). حاول مرة أخرى.");
      return r.status === 204 ? [] : r.text().then(function (t) { try { return JSON.parse(t); } catch (e) { return t; } });
    });
  }
  function readRows(t) { return fetch(URL_ + "/rest/v1/" + t + "?select=*&order=created_at.desc", { headers: { apikey: KEY, Authorization: "Bearer " + sess.access } }).then(function (r) { if (!r.ok) throw new Error("تعذر قراءة البيانات. تأكد من تشغيل ملف SQL."); return r.json(); }); }

  // ---------- ملفات ----------
  function safeName(name, ext) { return Date.now() + "-" + String(name || "file").replace(/\.[^.]+$/, "").replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) + "." + ext; }
  function shrinkImage(file) {
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      var c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res, rej) { c.toBlob(function (b) { b ? res(b) : rej(new Error("تعذر قراءة الصورة.")); }, "image/jpeg", 0.82); });
    });
  }
  function upload(path, blob, type) { return api("/storage/v1/object/media/" + path, { method: "POST", body: blob, type: type }).then(function () { return PUB + path; }); }
  function removeObj(url) {
    if (!url || url.indexOf(PUB) !== 0) return Promise.resolve();
    return api("/storage/v1/object/media/" + url.slice(PUB.length), { method: "DELETE" }).catch(function () {});
  }
  function ytId(u) { var m = String(u || "").match(/^[\w-]{11}$/) || String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? (m[1] || m[0]) : null; }

  // ---------- واجهة ----------
  var busy = false;
  function msg(t, err) { var m = $("#msg"); m.textContent = t; m.className = "msg" + (err ? " err" : ""); }
  function lock(btn, on) { busy = on; btn.disabled = on; }
  function confirmBtn(btn, fn) {
    btn.addEventListener("click", function () {
      if (busy) return;
      if (btn.dataset.sure !== "1") { btn.dataset.sure = "1"; btn.textContent = "تأكيد الحذف؟"; setTimeout(function () { btn.dataset.sure = ""; btn.textContent = "حذف"; }, 4000); return; }
      fn(btn);
    });
  }
  function drawWorks(list) {
    var box = $("#wList"); box.textContent = "";
    if (!list.length) { box.appendChild(el("p", "hint", "لا توجد أعمال بعد.")); return; }
    list.forEach(function (w) {
      var r = el("div", "row"), d = el("div");
      d.appendChild(el("b", "", w.title)); d.appendChild(el("small", "", w.cat + " · " + (w.type === "image" ? "صورة" : w.type === "video" ? "فيديو" : "يوتيوب")));
      var b = el("button", "del", "حذف"); b.type = "button"; confirmBtn(b, function () { removeWork(w, b); });
      r.appendChild(d); r.appendChild(b); box.appendChild(r);
    });
  }
  function drawAds(list) {
    var box = $("#aList"); box.textContent = "";
    if (!list.length) { box.appendChild(el("p", "hint", "لا توجد عروض بعد.")); return; }
    list.forEach(function (a) {
      var r = el("div", "row"), d = el("div");
      d.appendChild(el("b", "", a.title)); d.appendChild(el("small", "", (a.start_date || "من الآن") + " ← " + (a.end_date || "بدون نهاية")));
      var b = el("button", "del", "حذف"); b.type = "button"; confirmBtn(b, function () { removeAd(a, b); });
      r.appendChild(d); r.appendChild(b); box.appendChild(r);
    });
  }
  function refresh() { return Promise.all([readRows("works"), readRows("ads")]).then(function (r) { drawWorks(r[0]); drawAds(r[1]); }); }

  function addWork() {
    if (busy) return;
    var title = $("#wTitle").value.trim(), cat = $("#wCat").value, type = $("#wType").value, file = $("#wFile").files[0], yt = $("#wYt").value.trim();
    if (title.length < 2) return msg("اكتب عنوان العمل.", true);
    if (type === "youtube" && !ytId(yt)) return msg("رابط يوتيوب غير صحيح.", true);
    if (type !== "youtube" && !file) return msg("اختر الملف أولاً.", true);
    if (type === "video" && file.size > MAX_VIDEO) return msg("حجم الفيديو أكبر من 50 ميجا. ارفعه على يوتيوب والصق الرابط.", true);
    var btn = $("#wAdd"); lock(btn, true); msg("جارٍ الرفع، انتظر...");
    var prep;
    if (type === "youtube") prep = Promise.resolve(ytId(yt));
    else if (type === "image") prep = shrinkImage(file).then(function (b) { return upload("works/" + safeName(file.name, "jpg"), b, "image/jpeg"); });
    else { var ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "mp4"; prep = upload("works/" + safeName(file.name, ext), file, file.type || "video/mp4"); }
    prep.then(function (src) { return api("/rest/v1/works", { method: "POST", json: { title: title, cat: cat, type: type, src: src } }); })
      .then(function () { return readRows("works"); })
      .then(function (rows) { drawWorks(rows); $("#wTitle").value = ""; $("#wFile").value = ""; $("#wYt").value = ""; msg("تمت الإضافة وتظهر في الموقع فوراً."); })
      .catch(function (e) { msg(e.message || "فشل الرفع.", true); }).then(function () { lock(btn, false); });
  }
  function removeWork(w, btn) {
    lock(btn, true); msg("جارٍ الحذف...");
    api("/rest/v1/works?id=eq." + encodeURIComponent(w.id), { method: "DELETE" })
      .then(function () { return w.type === "youtube" ? null : removeObj(w.src); })
      .then(function () { return readRows("works"); })
      .then(function (rows) { drawWorks(rows); msg("تم الحذف."); })
      .catch(function (e) { msg(e.message || "فشل الحذف.", true); }).then(function () { busy = false; });
  }

  function addAd() {
    if (busy) return;
    var title = $("#aTitle").value.trim(), text = $("#aText").value.trim(), start = $("#aStart").value, end = $("#aEnd").value, img = $("#aImg").files[0];
    if (title.length < 2 || text.length < 2) return msg("اكتب العنوان والنص.", true);
    if (start && end && end < start) return msg("تاريخ الانتهاء قبل تاريخ البداية.", true);
    var btn = $("#aAdd"); lock(btn, true); msg("جارٍ النشر...");
    var prep = img ? shrinkImage(img).then(function (b) { return upload("ads/" + safeName(img.name, "jpg"), b, "image/jpeg"); }) : Promise.resolve("");
    prep.then(function (p) {
      return api("/rest/v1/ads", { method: "POST", json: { title: title, text: text, image: p, btn_text: $("#aBtn").value.trim() || "تواصل معنا", btn_url: $("#aUrl").value, start_date: start || null, end_date: end || null, popup: $("#aPop").checked } });
    }).then(function () { return readRows("ads"); })
      .then(function (rows) { drawAds(rows); ["#aTitle", "#aText", "#aStart", "#aEnd", "#aImg"].forEach(function (s) { $(s).value = ""; }); msg("تم نشر العرض وهو يظهر في الموقع فوراً."); })
      .catch(function (e) { msg(e.message || "فشل النشر.", true); }).then(function () { lock(btn, false); });
  }
  function removeAd(a, btn) {
    lock(btn, true); msg("جارٍ الحذف...");
    api("/rest/v1/ads?id=eq." + encodeURIComponent(a.id), { method: "DELETE" })
      .then(function () { return removeObj(a.image); })
      .then(function () { return readRows("ads"); })
      .then(function (rows) { drawAds(rows); msg("تم الحذف."); })
      .catch(function (e) { msg(e.message || "فشل الحذف.", true); }).then(function () { busy = false; });
  }

  // ---------- أحداث ----------
  C.services.forEach(function (s) { var o = el("option", "", s.title); o.value = s.title; $("#wCat").appendChild(o); });
  $("#wType").addEventListener("change", function () {
    var t = this.value; $("#wFileBox").hidden = t === "youtube"; $("#wYtBox").hidden = t !== "youtube";
    $("#wFile").accept = t === "video" ? "video/mp4,video/webm" : "image/*";
  });
  document.querySelectorAll(".t").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".t").forEach(function (x) { x.classList.toggle("on", x === b); });
      $("#tab-works").hidden = b.dataset.tab !== "works"; $("#tab-ads").hidden = b.dataset.tab !== "ads"; msg("");
    });
  });
  $("#wAdd").addEventListener("click", addWork);
  $("#aAdd").addEventListener("click", addAd);
  function enter() { $("#loginBox").hidden = true; $("#app").hidden = false; }
  $("#logout").addEventListener("click", function () { clearSess(); $("#pass").value = ""; $("#app").hidden = true; $("#loginBox").hidden = false; });
  function login() {
    var lm = $("#loginMsg"), em = $("#email").value.trim(), pw = $("#pass").value;
    if (!URL_ || !KEY) { lm.textContent = "أكمل إعداد Supabase في config.js أولاً."; lm.className = "msg err"; return; }
    if (!/.+@.+\..+/.test(em) || !pw) { lm.textContent = "اكتب البريد وكلمة المرور."; lm.className = "msg err"; return; }
    lm.className = "msg"; lm.textContent = "جارٍ التحقق...";
    $("#loginBtn").disabled = true;
    auth("password", { email: em, password: pw })
      .then(function (j) { sess = { access: j.access_token, refresh: j.refresh_token }; return refresh(); })
      .then(function () { saveSess($("#remember").checked); $("#pass").value = ""; lm.textContent = ""; enter(); })
      .catch(function (e) { sess = null; lm.textContent = e.message || "تعذر الدخول."; lm.className = "msg err"; })
      .then(function () { $("#loginBtn").disabled = false; });
  }
  $("#loginBtn").addEventListener("click", login);
  $("#pass").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
  // استعادة جلسة محفوظة
  var old = URL_ && KEY ? loadSess() : null;
  if (old) { sess = old; refresh().then(enter).catch(function () { return auth("refresh_token", { refresh_token: old.refresh }).then(function (j) { sess = { access: j.access_token, refresh: j.refresh_token }; saveSess(!!localStorage.getItem("alf_s")); return refresh(); }).then(enter); }).catch(function () { clearSess(); }); }
})();
