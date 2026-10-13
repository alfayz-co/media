-- الصق هذا الملف كاملاً في Supabase: SQL Editor ثم New query ثم Run
-- استبدل كلمة OWNER_EMAIL ببريدك (نفس بريد حساب المدير الذي ستنشئه) في كل مكان: استخدم Find and Replace

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  cat text not null,
  type text not null check (type in ('image','video','youtube')),
  src text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 80),
  text text not null check (char_length(text) between 2 and 240),
  image text not null default '',
  btn_text text not null default 'تواصل معنا',
  btn_url text not null default '#contact',
  start_date date,
  end_date date,
  popup boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.works enable row level security;
alter table public.ads enable row level security;

-- القراءة للجميع (زوار الموقع)
create policy "works read" on public.works for select using (true);
create policy "ads read" on public.ads for select using (true);

-- الكتابة لحسابك أنت فقط (حتى لو أحد أنشأ حساباً آخر لن يستطيع التعديل)
create policy "works write" on public.works for all to authenticated
  using ((auth.jwt() ->> 'email') = 'OWNER_EMAIL') with check ((auth.jwt() ->> 'email') = 'OWNER_EMAIL');
create policy "ads write" on public.ads for all to authenticated
  using ((auth.jwt() ->> 'email') = 'OWNER_EMAIL') with check ((auth.jwt() ->> 'email') = 'OWNER_EMAIL');

-- مخزن الصور والفيديو (عام للقراءة، الرفع لحسابك فقط، أقصى حجم 50 ميجا)
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

create policy "media read" on storage.objects for select using (bucket_id = 'media');
create policy "media write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'OWNER_EMAIL');
create policy "media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'OWNER_EMAIL');
