export type Currency = string;
export type UserId = string | number;

export interface Money {
  amountCents: number;
  currency: Currency;
}

export type SplitType = 'equal' | 'by_member' | 'by_ratio' | 'by_share';

export interface ShareFraction {
  num: number;
  den: number;
}

export interface SplitSpec {
  type: SplitType;
  members?: UserId[];
  memberAmounts?: Record<UserId, number>;
  ratios?: Record<UserId, number>;
  shares?: Record<UserId, ShareFraction>;
}

export interface ExpenseItem {
  name: string;
  amountCents: number;
  participants: UserId[];
}

export interface Transfer {
  from: UserId;
  to: UserId;
  amountCents: number;
}
