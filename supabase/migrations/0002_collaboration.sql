-- 多人协作：成员制 RLS + 邀请码加入
-- 前置：已执行 0001_init.sql

-- 1. groups: user_id → owner_id，加 invite_code
alter table public.groups rename column user_id to owner_id;
alter table public.groups add column if not exists invite_code text;
update public.groups
set invite_code = upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6))
where invite_code is null;
create unique index if not exists groups_invite_code_idx on public.groups (invite_code);

-- 2. members.user_id 语义改为「成员账号」，先置空（现有成员均为匿名名字）
alter table public.members alter column user_id drop not null;
update public.members set user_id = null;

-- 3. 为每个群组 owner 建一条成员记录
insert into public.members (id, group_id, user_id, name, created_at, updated_at)
select gen_random_uuid(), g.id, g.owner_id, '我', g.created_at, g.updated_at
from public.groups g
where not exists (
  select 1 from public.members m where m.group_id = g.id and m.user_id = g.owner_id
);

-- 4. 删除 0001 的旧 RLS 策略
do $$
declare t text; pol text;
begin
  foreach t in array array['groups','members','expenses','expense_shares','settlements']
  loop
    foreach pol in array array['own_select','own_insert','own_update','own_delete']
    loop
      execute format('drop policy if exists %I on public.%I', pol, t);
    end loop;
  end loop;
end $$;

-- 5. 成员关系判断函数
create or replace function public.is_group_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

-- 6. 成员制 RLS
create policy "member_select" on public.groups for select using (public.is_group_member(id));
create policy "member_insert" on public.groups for insert with check (owner_id = auth.uid());
create policy "member_update" on public.groups for update using (public.is_group_member(id));
create policy "member_delete" on public.groups for delete using (owner_id = auth.uid());

create policy "member_select" on public.members for select using (public.is_group_member(group_id));
create policy "member_insert" on public.members for insert with check (
  public.is_group_member(group_id)
  or (select owner_id from public.groups where id = group_id) = auth.uid()
);
create policy "member_update" on public.members for update using (public.is_group_member(group_id));
create policy "member_delete" on public.members for delete using (public.is_group_member(group_id));

create policy "member_select" on public.expenses for select using (public.is_group_member(group_id));
create policy "member_insert" on public.expenses for insert with check (public.is_group_member(group_id));
create policy "member_update" on public.expenses for update using (public.is_group_member(group_id));
create policy "member_delete" on public.expenses for delete using (public.is_group_member(group_id));

create policy "member_select" on public.expense_shares for select using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))
);
create policy "member_insert" on public.expense_shares for insert with check (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))
);
create policy "member_update" on public.expense_shares for update using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))
);
create policy "member_delete" on public.expense_shares for delete using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))
);

create policy "member_select" on public.settlements for select using (public.is_group_member(group_id));
create policy "member_insert" on public.settlements for insert with check (public.is_group_member(group_id));
create policy "member_update" on public.settlements for update using (public.is_group_member(group_id));
create policy "member_delete" on public.settlements for delete using (public.is_group_member(group_id));

-- 7. 通过邀请码加入群组（security definer 绕过 RLS）
create or replace function public.join_group_by_code(code text, display_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid;
begin
  select id into gid from public.groups where invite_code = upper(trim(code));
  if gid is null then
    raise exception 'INVALID_CODE';
  end if;
  if exists (select 1 from public.members where group_id = gid and user_id = auth.uid()) then
    return gid;
  end if;
  insert into public.members (id, group_id, user_id, name, created_at, updated_at)
  values (
    gen_random_uuid(), gid, auth.uid(),
    coalesce(nullif(trim(display_name), ''), '成员'),
    floor(extract(epoch from now()) * 1000)::bigint,
    floor(extract(epoch from now()) * 1000)::bigint
  );
  return gid;
end $$;

-- 8. 启用 Realtime（加入 publication，成员制 RLS 会自动过滤事件）
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.expense_shares;
alter publication supabase_realtime add table public.settlements;
