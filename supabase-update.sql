-- تحديث قاعدة البيانات للوحة التحكم الكاملة
-- الصق الملف كاملاً في Supabase: SQL Editor ثم New query ثم Run (يمكن تشغيله أكثر من مرة)

-- 1) أنواع جديدة من الأعمال: تيك توك، إنستجرام، فيمو، فيسبوك، رابط عام + صورة غلاف اختيارية
alter table public.works drop constraint if exists works_type_check;
alter table public.works add constraint works_type_check
  check (type in ('image','video','youtube','tiktok','instagram','vimeo','facebook','link'));
alter table public.works add column if not exists thumb text not null default '';

-- 2) إعدادات الموقع (النصوص والشعار والألوان والخدمات وبيانات التواصل)
create table if not exists public.site_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;

drop policy if exists "settings read" on public.site_settings;
create policy "settings read" on public.site_settings for select using (true);

drop policy if exists "settings write" on public.site_settings;
create policy "settings write" on public.site_settings for all to authenticated
  using ((auth.jwt() ->> 'email') = 'kemo.alfayz@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'kemo.alfayz@gmail.com');

-- 3) الصلاحيات
grant usage on schema public to anon, authenticated;
grant select on public.works, public.ads, public.site_settings to anon, authenticated;
grant insert, update, delete on public.works, public.ads, public.site_settings to authenticated;

insert into public.site_settings (id) values ('main') on conflict (id) do nothing;
