import { Transfer, UserId } from './types';

/**
 * 债务简化：输入成员净额（正=应收，负=应付），输出最小化转账笔数的结算方案。
 * 贪心：每次取最大应收与最大应付相抵，转账笔数 ≤ n-1。
 */
export function simplifyDebts(net: ReadonlyMap<UserId, number>): Transfer[] {
  const creditors: { id: UserId; amount: number }[] = [];
  const debtors: { id: UserId; amount: number }[] = [];

  for (const [id, v] of net) {
    if (v > 0) creditors.push({ id, amount: v });
    else if (v < 0) debtors.push({ id, amount: -v });
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const t = Math.min(creditors[i]!.amount, debtors[j]!.amount);
    transfers.push({ from: debtors[j]!.id, to: creditors[i]!.id, amountCents: t });
    creditors[i]!.amount -= t;
    debtors[j]!.amount -= t;
    if (creditors[i]!.amount < 0.005) i++;
    if (debtors[j]!.amount < 0.005) j++;
  }

  return transfers;
}
