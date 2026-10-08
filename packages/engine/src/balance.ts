import { UserId } from './types';

export interface ExpenseRecord {
  payer: UserId;
  baseAmountCents: number;
  shares: ReadonlyMap<UserId, number>;
}

/** 计算群组内各成员净额：正=应收，负=应付。所有金额已折算到主币种。 */
export function computeNetBalances(expenses: ExpenseRecord[]): Map<UserId, number> {
  const net = new Map<UserId, number>();
  for (const e of expenses) {
    net.set(e.payer, (net.get(e.payer) ?? 0) + e.baseAmountCents);
    for (const [id, cents] of e.shares) {
      net.set(id, (net.get(id) ?? 0) - cents);
    }
  }
  for (const [id, v] of [...net]) {
    if (v === 0) net.delete(id);
  }
  return net;
}
