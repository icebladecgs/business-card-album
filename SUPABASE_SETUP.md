# Supabase Setup (Google Login + Sync)

## 1) Environment Variables
Create `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 2) Google OAuth in Supabase
1. Supabase Dashboard -> Authentication -> Providers -> Google -> Enable
2. Set Google Client ID / Secret
3. Add redirect URL:

- Local: `http://localhost:3000/`
- Prod: `https://business-card-album.vercel.app/`

## 3) SQL (run once in Supabase SQL Editor)
```sql
create table if not exists public.business_cards (
  id text primary key,
  user_id uuid not null,
  name text not null default '',
  company text not null default '',
  title text not null default '',
  phone text not null default '',
  email text not null default '',
  memo text not null default '',
  image_front text,
  raw_ocr_text text,
  favorite boolean not null default false,
  categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_cards_user_id on public.business_cards(user_id);

alter table public.business_cards enable row level security;

create policy "Users can read own cards"
on public.business_cards
for select
using (auth.uid() = user_id);

create policy "Users can insert own cards"
on public.business_cards
for insert
with check (auth.uid() = user_id);

create policy "Users can update own cards"
on public.business_cards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own cards"
on public.business_cards
for delete
using (auth.uid() = user_id);
```

## 4) How It Works
- Logged in: cloud sync (Supabase) is used.
- Logged out: local IndexedDB mode is used.
- Existing import/export and Remember import flows still work.
