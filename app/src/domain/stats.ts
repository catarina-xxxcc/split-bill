import { getGroup, listExpenses, listMembers, listSharesForGroup } from '../db/repo';

export interface MemberSpend {
  memberId: string;
  name: string;
  cents: number;
}

export interface CategorySpend {
  category: string;
  cents: number;
  ratio: number;
}

export interface GroupStats {
  baseCurrency: string;
  totalCents: number;
  members: MemberSpend[];
  categories: CategorySpend[];
}

export function computeStats(groupId: string): GroupStats {
  const group = getGroup(groupId);
  const members = listMembers(groupId);
  const expenses = listExpenses(groupId);
  const shares = listSharesForGroup(groupId);

  const memberMap = new Map<string, number>();
  for (const s of shares) {
    memberMap.set(s.memberId, (memberMap.get(s.memberId) ?? 0) + s.baseShareCents);
  }

  const categoryMap = new Map<string, number>();
  let totalCents = 0;
  for (const e of expenses) {
    const cat = e.category ?? '其他';
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + e.baseAmountCents);
    totalCents += e.baseAmountCents;
  }

  const memberSpend = members
    .map((m) => ({ memberId: m.id, name: m.name, cents: memberMap.get(m.id) ?? 0 }))
    .sort((a, b) => b.cents - a.cents);

  const categorySpend = [...categoryMap.entries()]
    .map(([category, cents]) => ({
      category,
      cents,
      ratio: totalCents > 0 ? cents / totalCents : 0,
    }))
    .sort((a, b) => b.cents - a.cents);

  return {
    baseCurrency: group?.baseCurrency ?? 'USD',
    totalCents,
    members: memberSpend,
    categories: categorySpend,
  };
}
