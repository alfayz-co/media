/* مكتبة مشتركة بين الموقع ولوحة الإدارة: دمج الإعدادات المحفوظة مع الافتراضية */
(function () {
  "use strict";
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function merge(b, o) {
    var r = {}, k;
    for (k in b) r[k] = b[k];
    for (k in (o || {})) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      var v = o[k];
      if (isObj(v) && isObj(b[k])) r[k] = merge(b[k], v);
      else if (Array.isArray(v)) { if (v.length || k === "social") r[k] = v; }
      else if (typeof v === "string") { if (v !== "") r[k] = v; }
      else if (typeof v === "number" || typeof v === "boolean") r[k] = v;
    }
    return r;
  }
  function getPath(o, p) { return String(p).split(".").reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function setPath(o, p, v) { var ks = String(p).split("."), t = o; ks.slice(0, -1).forEach(function (k) { if (!isObj(t[k])) t[k] = {}; t = t[k]; }); t[ks[ks.length - 1]] = v; }
  function delPath(o, p) { var ks = String(p).split("."), t = o; for (var i = 0; i < ks.length - 1; i++) { t = t[ks[i]]; if (!isObj(t)) return; } delete t[ks[ks.length - 1]]; }
  function ytId(u) { var m = String(u || "").match(/^[\w-]{11}$/) || String(u).match(/(?:youtu\.be\/|v=|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? (m[1] || m[0]) : null; }
  // رابط واحد لأي منصة: يكتشف النوع تلقائياً. يرجع {type, src} أو يرمي خطأ بالعربية.
  function detect(u) {
    u = String(u || "").trim();
    if (!u) throw new Error("الصق الرابط أولاً.");
    if (/^[\w-]{11}$/.test(u)) return { type: "youtube", src: u };
    if (u.length > 500 || !/^https:\/\//i.test(u)) throw new Error("الرابط يجب أن يبدأ بـ https:// وألا يتجاوز 500 حرف.");
    var host; try { host = new URL(u).hostname.toLowerCase(); } catch (e) { throw new Error("الرابط غير صحيح."); }
    function h(re) { return re.test(host); }
    if (h(/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/)) { var id = ytId(u); if (!id) throw new Error("هذا رابط قناة أو قائمة وليس فيديو يوتيوب."); return { type: "youtube", src: id }; }
    if (h(/(^|\.)tiktok\.com$/)) return { type: "tiktok", src: u };
    if (h(/(^|\.)instagram\.com$/)) return { type: "instagram", src: u };
    if (h(/(^|\.)vimeo\.com$/)) return { type: "vimeo", src: u };
    if (h(/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/)) return { type: "facebook", src: u };
    return { type: "link", src: u };
  }
  // الإعدادات المحفوظة من لوحة الإدارة (قراءة عامة). تنتظر 2.5 ثانية كحد أقصى ثم تكمل بالافتراضي.
  function loadSettings(C) {
    var u = (C.supabaseUrl || "").replace(/\/+$/, ""), k = C.supabaseKey || "";
    if (!u || !k) return Promise.resolve({});
    var timeout = new Promise(function (res) { setTimeout(function () { res({}); }, 2500); });
    var f = fetch(u + "/rest/v1/site_settings?select=data&id=eq.main", { headers: { apikey: k, Authorization: "Bearer " + k } })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { return (rows[0] && rows[0].data) || {}; })
      .catch(function () { return {}; });
    return Promise.race([f, timeout]);
  }
  window.ALF = { merge: merge, getPath: getPath, setPath: setPath, delPath: delPath, loadSettings: loadSettings, isObj: isObj, detect: detect, ytId: ytId };
})();
