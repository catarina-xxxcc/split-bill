import { supabase } from '../lib/supabase';
import { db } from '../db/database';

async function authed(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

interface GroupRow {
  id: string;
  name: string;
  base_currency: string;
  invite_code: string | null;
  created_at: number;
  updated_at: number;
}
interface MemberRow {
  id: string;
  group_id: string;
  name: string;
  user_id: string | null;
  created_at: number;
  updated_at: number;
}
interface ExpenseRow {
  id: string;
  group_id: string;
  payer_id: string;
  amount_cents: number;
  currency: string;
  rate: number | string;
  base_amount_cents: number;
  split_type: string;
  category: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
}
interface ShareRow {
  id: string;
  expense_id: string;
  member_id: string;
  item_name: string | null;
  share_cents: number;
  base_share_cents: number;
}
interface SettlementRow {
  id: string;
  group_id: string;
  from_member_id: string;
  to_member_id: string;
  amount_cents: number;
  status: string;
  created_at: number;
  updated_at: number;
}

/** 登录后：云端全量覆盖本地。 */
export async function pullAll(): Promise<void> {
  if (!(await authed())) return;

  const [g, m, e, s, st] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('members').select('*'),
    supabase.from('expenses').select('*'),
    supabase.from('expense_shares').select('*'),
    supabase.from('settlements').select('*'),
  ]);

  const groups = (g.data ?? []) as GroupRow[];
  const members = (m.data ?? []) as MemberRow[];
  const expenses = (e.data ?? []) as ExpenseRow[];
  const shares = (s.data ?? []) as ShareRow[];
  const settlements = (st.data ?? []) as SettlementRow[];

  db.withTransactionSync(() => {
    db.execSync(
      `DELETE FROM settlements;
       DELETE FROM expense_shares;
       DELETE FROM expenses;
       DELETE FROM members;
       DELETE FROM groups;`,
    );
    for (const r of groups) {
      db.runSync(
        `INSERT INTO groups (id, name, base_currency, invite_code, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
        [r.id, r.name, r.base_currency, r.invite_code, r.created_at, r.updated_at],
      );
    }
    for (const r of members) {
      db.runSync(
        `INSERT INTO members (id, group_id, name, user_id, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
        [r.id, r.group_id, r.name, r.user_id, r.created_at, r.updated_at],
      );
    }
    for (const r of expenses) {
      db.runSync(
        `INSERT INTO expenses
          (id, group_id, payer_id, amount_cents, currency, rate, base_amount_cents, split_type, category, note, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          r.id,
          r.group_id,
          r.payer_id,
          r.amount_cents,
          r.currency,
          Number(r.rate),
          r.base_amount_cents,
          r.split_type,
          r.category,
          r.note,
          r.created_at,
          r.updated_at,
        ],
      );
    }
    for (const r of shares) {
      db.runSync(
        `INSERT INTO expense_shares (id, expense_id, member_id, item_name, share_cents, base_share_cents) VALUES (?,?,?,?,?,?)`,
        [r.id, r.expense_id, r.member_id, r.item_name, r.share_cents, r.base_share_cents],
      );
    }
    for (const r of settlements) {
      db.runSync(
        `INSERT INTO settlements (id, group_id, from_member_id, to_member_id, amount_cents, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
        [r.id, r.group_id, r.from_member_id, r.to_member_id, r.amount_cents, r.status, r.created_at, r.updated_at],
      );
    }
  });
}

export interface GroupPayload {
  id: string;
  name: string;
  baseCurrency: string;
  inviteCode: string;
  createdAt: number;
  updatedAt: number;
}
export async function pushGroup(p: GroupPayload): Promise<void> {
  if (!(await authed())) return;
  await supabase.from('groups').upsert({
    id: p.id,
    name: p.name,
    base_currency: p.baseCurrency,
    invite_code: p.inviteCode,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  });
}

export interface MemberPayload {
  id: string;
  groupId: string;
  name: string;
  userId: string | null;
  createdAt: number;
  updatedAt: number;
}
export async function pushMember(p: MemberPayload): Promise<void> {
  if (!(await authed())) return;
  await supabase.from('members').upsert({
    id: p.id,
    group_id: p.groupId,
    name: p.name,
    user_id: p.userId,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  });
}

export interface ExpensePayload {
  id: string;
  groupId: string;
  payerId: string;
  amountCents: number;
  currency: string;
  rate: number;
  baseAmountCents: number;
  splitType: string;
  category: string | null;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface SharePayload {
  id: string;
  expenseId: string;
  memberId: string;
  itemName: string | null;
  shareCents: number;
  baseShareCents: number;
}
export async function pushExpense(e: ExpensePayload, shares: SharePayload[]): Promise<void> {
  if (!(await authed())) return;
  await supabase.from('expenses').upsert({
    id: e.id,
    group_id: e.groupId,
    payer_id: e.payerId,
    amount_cents: e.amountCents,
    currency: e.currency,
    rate: e.rate,
    base_amount_cents: e.baseAmountCents,
    split_type: e.splitType,
    category: e.category,
    note: e.note,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  });
  if (shares.length > 0) {
    await supabase.from('expense_shares').upsert(
      shares.map((s) => ({
        id: s.id,
        expense_id: s.expenseId,
        member_id: s.memberId,
        item_name: s.itemName,
        share_cents: s.shareCents,
        base_share_cents: s.baseShareCents,
      })),
    );
  }
}

export interface SettlementPayload {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  status: string;
  createdAt: number;
  updatedAt: number;
}
export async function pushSettlement(p: SettlementPayload): Promise<void> {
  if (!(await authed())) return;
  await supabase.from('settlements').upsert({
    id: p.id,
    group_id: p.groupId,
    from_member_id: p.fromMemberId,
    to_member_id: p.toMemberId,
    amount_cents: p.amountCents,
    status: p.status,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  });
}

/** 通过邀请码加入群组，返回 groupId；失败返回 null。 */
export async function joinGroupByCode(code: string, displayName: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    code,
    display_name: displayName,
  });
  if (error) return null;
  return (data as string) ?? null;
}
