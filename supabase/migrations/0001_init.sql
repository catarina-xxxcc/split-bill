-- 多币种旅行分账 —— 云端 schema（Supabase PostgreSQL）
-- 直连 Supabase：客户端用 supabase-js 读写，RLS 按 user_id 隔离。
-- 时间戳统一用 bigint 毫秒，与本地 sqlite 一致。

-- 群组
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  base_currency text not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

-- 成员
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

-- 支出
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payer_id uuid not null references public.members(id),
  amount_cents bigint not null,
  currency text not null,
  rate numeric not null,
  base_amount_cents bigint not null,
  split_type text not null,
  category text,
  note text,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

-- 分摊明细
create table if not exists public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  member_id uuid not null references public.members(id),
  item_name text,
  share_cents bigint not null,
  base_share_cents bigint not null,
  updated_at bigint not null default 0
);

-- 还款
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  from_member_id uuid not null references public.members(id),
  to_member_id uuid not null references public.members(id),
  amount_cents bigint not null,
  status text not null default 'pending',
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);

-- RLS：仅拥有者可读写
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;

do $$
declare t text;
begin
  foreach t in array array['groups','members','expenses','expense_shares','settlements']
  loop
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id)', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
