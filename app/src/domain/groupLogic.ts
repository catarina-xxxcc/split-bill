import { computeNetBalances, simplifyDebts } from '@split/engine';
import { listExpenses, listSettlements, listSharesForGroup } from '../db/repo';

export interface PlanTransfer {
  from: string;
  to: string;
  amountCents: number;
}

/** 当前净额：支出净额 − 已还金额。正=应收，负=应付。 */
export function computeCurrentNet(groupId: string): Map<string, number> {
  const expenses = listExpenses(groupId);
  const shares = listSharesForGroup(groupId);

  const records = expenses.map((e) => ({
    payer: e.payerId,
    baseAmountCents: e.baseAmountCents,
    shares: new Map(
      shares.filter((s) => s.expenseId === e.id).map((s) => [s.memberId, s.baseShareCents]),
    ),
  }));

  const net = computeNetBalances(records) as Map<string, number>;

  for (const s of listSettlements(groupId)) {
    net.set(s.fromMemberId, (net.get(s.fromMemberId) ?? 0) + s.amountCents);
    net.set(s.toMemberId, (net.get(s.toMemberId) ?? 0) - s.amountCents);
  }

  for (const [id, v] of [...net]) {
    if (v === 0) net.delete(id);
  }
  return net;
}

export function computeSettlementPlan(groupId: string): PlanTransfer[] {
  return simplifyDebts(computeCurrentNet(groupId)).map((t) => ({
    from: String(t.from),
    to: String(t.to),
    amountCents: t.amountCents,
  }));
}
