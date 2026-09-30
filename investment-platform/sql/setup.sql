-- InvestTracker Supabase Setup
-- Run this in the Supabase SQL Editor (supabase.com > SQL Editor)

-- 1. Tables
create table if not exists transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  operacao text not null,
  ticker text not null,
  classe text not null,
  setor text default 'outros',
  qtd numeric not null,
  preco numeric not null,
  taxas numeric default 0,
  preco_atual numeric default 0,
  created_at timestamptz default now()
);

create table if not exists proventos (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  ativo text not null,
  tipo text not null,
  valor_cota numeric not null,
  qtd numeric not null,
  total numeric not null,
  created_at timestamptz default now()
);

create table if not exists watchlist (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  classe text not null,
  preco numeric default 0,
  alvo numeric,
  notas text default '',
  created_at timestamptz default now()
);

create table if not exists prices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  price numeric not null,
  updated_at timestamptz default now(),
  unique(user_id, ticker)
);

create table if not exists snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  value numeric not null,
  invested numeric not null,
  unique(user_id, date)
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cdi_rate numeric default 13.15,
  theme text default 'dark'
);

-- 2. Row Level Security
alter table transactions enable row level security;
alter table proventos enable row level security;
alter table watchlist enable row level security;
alter table prices enable row level security;
alter table snapshots enable row level security;
alter table user_settings enable row level security;

create policy "Users manage own transactions" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own proventos" on proventos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own watchlist" on watchlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own prices" on prices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own snapshots" on snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Indexes
create index if not exists idx_transactions_user on transactions(user_id, date desc);
create index if not exists idx_proventos_user on proventos(user_id, date desc);
create index if not exists idx_watchlist_user on watchlist(user_id);
create index if not exists idx_prices_user on prices(user_id, ticker);
create index if not exists idx_snapshots_user on snapshots(user_id, date);
