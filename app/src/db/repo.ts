import * as Crypto from 'expo-crypto';
import { db } from './database';
import { pushExpense, pushGroup, pushMember, pushSettlement } from '../sync/sync';
import type { SharePayload } from '../sync/sync';
import type {
  Expense,
  ExpenseShare,
  Group,
  Member,
  NewExpense,
  Settlement,
} from './types';

export function uuid(): string {
  return Crypto.randomUUID();
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function listGroups(): Group[] {
  return db.getAllSync<Group>(
    `SELECT id, name, base_currency AS baseCurrency, invite_code AS inviteCode
     FROM groups ORDER BY created_at DESC`,
  );
}

export function getGroup(id: string): Group | null {
  return db.getFirstSync<Group>(
    `SELECT id, name, base_currency AS baseCurrency, invite_code AS inviteCode
     FROM groups WHERE id = ?`,
    [id],
  );
}

export function createGroup(name: string, baseCurrency: string): string {
  const id = uuid();
  const now = Date.now();
  const inviteCode = generateInviteCode();
  db.runSync(
    `INSERT INTO groups (id, name, base_currency, invite_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, baseCurrency, inviteCode, now, now],
  );
  void pushGroup({ id, name, baseCurrency, inviteCode, createdAt: now, updatedAt: now });
  return id;
}

export function listMembers(groupId: string): Member[] {
  return db.getAllSync<Member>(
    `SELECT id, group_id AS groupId, name, user_id AS userId
     FROM members WHERE group_id = ? ORDER BY created_at`,
    [groupId],
  );
}

export function addMember(groupId: string, name: string, userId: string | null = null): string {
  const id = uuid();
  const now = Date.now();
  db.runSync(
    `INSERT INTO members (id, group_id, name, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, groupId, name, userId, now, now],
  );
  void pushMember({ id, groupId, name, userId, createdAt: now, updatedAt: now });
  return id;
}

export function addExpense(input: NewExpense): string {
  const expenseId = uuid();
  const now = Date.now();
  const sharePayloads: SharePayload[] = [];
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO expenses
        (id, group_id, payer_id, amount_cents, currency, rate, base_amount_cents, split_type, category, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId,
        input.groupId,
        input.payerId,
        input.amountCents,
        input.currency,
        input.rate,
        input.baseAmountCents,
        input.splitType,
        input.category ?? null,
        input.note ?? null,
        now,
        now,
      ],
    );
    for (const s of input.shares) {
      const shareId = uuid();
      sharePayloads.push({
        id: shareId,
        expenseId,
        memberId: s.memberId,
        itemName: s.itemName,
        shareCents: s.shareCents,
        baseShareCents: s.baseShareCents,
      });
      db.runSync(
        `INSERT INTO expense_shares
          (id, expense_id, member_id, item_name, share_cents, base_share_cents)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [shareId, expenseId, s.memberId, s.itemName, s.shareCents, s.baseShareCents],
      );
    }
  });
  void pushExpense(
    {
      id: expenseId,
      groupId: input.groupId,
      payerId: input.payerId,
      amountCents: input.amountCents,
      currency: input.currency,
      rate: input.rate,
      baseAmountCents: input.baseAmountCents,
      splitType: input.splitType,
      category: input.category ?? null,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    },
    sharePayloads,
  );
  return expenseId;
}

export function listExpenses(groupId: string): Expense[] {
  return db.getAllSync<Expense>(
    `SELECT id, group_id AS groupId, payer_id AS payerId,
            amount_cents AS amountCents, currency, rate,
            base_amount_cents AS baseAmountCents, split_type AS splitType,
            category, note, created_at AS createdAt
     FROM expenses WHERE group_id = ? ORDER BY created_at DESC`,
    [groupId],
  );
}

export function listSharesForGroup(groupId: string): ExpenseShare[] {
  return db.getAllSync<ExpenseShare>(
    `SELECT s.id, s.expense_id AS expenseId, s.member_id AS memberId,
            s.item_name AS itemName, s.share_cents AS shareCents,
            s.base_share_cents AS baseShareCents
     FROM expense_shares s
     JOIN expenses e ON e.id = s.expense_id
     WHERE e.group_id = ?`,
    [groupId],
  );
}

export function addSettlement(
  groupId: string,
  fromMemberId: string,
  toMemberId: string,
  amountCents: number,
): string {
  const id = uuid();
  const now = Date.now();
  db.runSync(
    `INSERT INTO settlements
      (id, group_id, from_member_id, to_member_id, amount_cents, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'paid', ?, ?)`,
    [id, groupId, fromMemberId, toMemberId, amountCents, now, now],
  );
  void pushSettlement({
    id,
    groupId,
    fromMemberId,
    toMemberId,
    amountCents,
    status: 'paid',
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export function listSettlements(groupId: string): Settlement[] {
  return db.getAllSync<Settlement>(
    `SELECT id, group_id AS groupId, from_member_id AS fromMemberId,
            to_member_id AS toMemberId, amount_cents AS amountCents,
            status, created_at AS createdAt
     FROM settlements WHERE group_id = ? ORDER BY created_at DESC`,
    [groupId],
  );
}
