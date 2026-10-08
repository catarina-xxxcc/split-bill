import { getGroup, listExpenses, listMembers } from '../db/repo';
import { computeCurrentNet, computeSettlementPlan } from './groupLogic';
import { formatMoney } from '../utils/format';

export function buildShareText(groupId: string): string {
  const group = getGroup(groupId);
  if (!group) return '';
  const members = listMembers(groupId);
  const expenses = listExpenses(groupId);
  const net = computeCurrentNet(groupId);
  const plan = computeSettlementPlan(groupId);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? '?';

  const lines: string[] = [`【分账】${group.name}`, ''];
  lines.push(`成员：${members.map((m) => m.name).join('、')}`);
  lines.push('');

  if (expenses.length > 0) {
    lines.push('支出：');
    for (const e of expenses) {
      lines.push(`- ${name(e.payerId)} 垫付 ${formatMoney(e.amountCents, e.currency)}`);
    }
    lines.push('');
  }

  lines.push('余额：');
  for (const [id, v] of net) {
    const label = v > 0 ? '应收' : v < 0 ? '应付' : '平';
    lines.push(`- ${name(id)} ${label} ${formatMoney(Math.abs(v), group.baseCurrency)}`);
  }
  lines.push('');

  if (plan.length > 0) {
    lines.push('最少转账：');
    for (const t of plan) {
      lines.push(`- ${name(t.from)} → ${name(t.to)} ${formatMoney(t.amountCents, group.baseCurrency)}`);
    }
  } else {
    lines.push('已结清 🎉');
  }

  return lines.join('\n');
}
