export type SplitType = 'equal' | 'by_member' | 'by_ratio' | 'by_share' | 'by_items';

export interface Group {
  id: string;
  name: string;
  baseCurrency: string;
  inviteCode: string | null;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  userId: string | null;
}

export interface Expense {
  id: string;
  groupId: string;
  payerId: string;
  amountCents: number;
  currency: string;
  rate: number;
  baseAmountCents: number;
  splitType: SplitType;
  category: string | null;
  note: string | null;
  createdAt: number;
}

export interface ExpenseShare {
  id: string;
  expenseId: string;
  memberId: string;
  itemName: string | null;
  shareCents: number;
  baseShareCents: number;
}

export type SettlementStatus = 'pending' | 'paid';

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amountCents: number;
  status: SettlementStatus;
  createdAt: number;
}

export interface NewExpense {
  groupId: string;
  payerId: string;
  amountCents: number;
  currency: string;
  rate: number;
  baseAmountCents: number;
  splitType: SplitType;
  shares: NewShare[];
  category?: string | null;
  note?: string | null;
}

export interface NewShare {
  memberId: string;
  itemName: string | null;
  shareCents: number;
  baseShareCents: number;
}
