موقع الفايز: دليل سريع

الملفات:
  index.html     الصفحة الرئيسية
  admin.html     لوحة الإدارة (إضافة صور وفيديو وعروض)
  supabase-setup.sql   ملف إعداد قاعدة البيانات (خطوة 2)
  config.js      الاسم، الرقم، الخدمات، أسئلة المساعد
  data/          الأعمال والعروض (تتعدل من لوحة الإدارة تلقائياً)
  assets/        الشعار والصور

1) الرفع على GitHub Pages
   - أنشئ حساباً على github.com ثم New repository (اسمه مثلاً alfayz-site) واجعله Public.
   - اضغط Add file ثم Upload files، واسحب كل محتويات هذا المجلد (وليس المجلد نفسه)، ثم Commit.
   - من Settings ثم Pages: Source = Deploy from a branch، Branch = main، المجلد / (root)، ثم Save.
   - بعد دقيقة يظهر الرابط: https://USERNAME.github.io/alfayez-site/
   - فعّل التحقق بخطوتين على حساب GitHub (Settings ثم Password and authentication).

2) تفعيل لوحة الإدارة (دخول باسم مستخدم وكلمة مرور)، مجاني بالكامل عبر Supabase
   أ) سجّل على supabase.com (مجاني) ثم New project: اختر اسماً وكلمة مرور قوية لقاعدة البيانات والمنطقة الأقرب.
   ب) من القائمة: SQL Editor ثم New query. افتح ملف supabase-setup.sql هنا، واستبدل OWNER_EMAIL ببريدك
      (Find and Replace)، والصقه كاملاً واضغط Run. هذا ينشئ الجداول ومخزن الصور ويحصر التعديل على بريدك فقط.
   ج) من Authentication ثم Users ثم Add user ثم Create new user: اكتب بريدك وكلمة مرور قوية (هذا اسم المستخدم وكلمة المرور).
      فعّل Auto Confirm User.
   د) من Authentication ثم Sign In / Providers: أوقف Allow new users to sign up (حتى لا يسجّل غيرك).
   هـ) من Project Settings ثم API: انسخ Project URL و anon public key (أو Publishable key).
      الصقهما في config.js داخل supabaseUrl و supabaseKey. لا تستخدم service_role أبداً.
   و) ارفع config.js المعدّل إلى GitHub (Add file ثم Upload files يستبدل القديم).
   ز) افتح  رابط-الموقع/admin.html  وادخل بالبريد وكلمة المرور.
   - من اللوحة: أضف صوراً وفيديوهات للأعمال، وأضف عروضاً (اليوم الوطني وغيره) بتواريخ بداية ونهاية.
   - التعديل يظهر في الموقع فوراً، ولا تحتاج لمس GitHub بعد ذلك.
   - الأعمال التجريبية الموجودة في data/ تظهر فقط قبل ربط Supabase.
   - ملاحظة: مشاريع Supabase المجانية تتوقف بعد أسبوع بدون أي زيارة، فادخل الموقع أو اللوحة مرة أسبوعياً، وإن توقف اضغط Restore من لوحة Supabase.

3) نموذج التواصل
   - سجّل على web3forms.com ببريدك (مجاني) وضع المفتاح في config.js داخل web3formsKey.
   - بدون مفتاح: الطلب يتحول إلى رسالة واتساب جاهزة.

4) الدومين (.com)
   - اشتر دومين (حوالي 40 إلى 60 ريال سنوياً) من Namecheap أو Cloudflare Registrar.
   - في GitHub: Settings ثم Pages ثم Custom domain، واكتب الدومين، وفعّل Enforce HTTPS.
   - عند مزود الدومين أضف أربعة سجلات A على: 185.199.108.153 و 185.199.109.153 و 185.199.110.153 و 185.199.111.153

أمان:
   - استخدم كلمة مرور قوية وطويلة للوحة الإدارة ولا تشاركها.
   - الفيديوهات الأكبر من 50 ميجا ارفعها على يوتيوب (غير مدرج) والصق الرابط في اللوحة.
