import { ExpenseItem, SplitSpec, UserId } from './types';

export type ShareMap = Map<UserId, number>;

export class SplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplitError';
  }
}

function assertIntegerCents(n: number, label: string): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new SplitError(`${label} must be a non-negative integer cents, got ${n}`);
  }
}

/**
 * 按权重比例分配 total（整数分），采用最大余数法保证 Σshare === total。
 * 权重为正数；余数优先分给小数部分最大的成员，tie 时按权重输入顺序。
 */
function allocateByWeight(total: number, weights: Map<UserId, number>): ShareMap {
  const entries = [...weights.entries()].filter(([, w]) => w > 0);
  if (entries.length === 0) {
    throw new SplitError('no positive weights to allocate');
  }
  const sumW = entries.reduce((s, [, w]) => s + w, 0);
  const result: ShareMap = new Map();
  const remainders: { id: UserId; frac: number }[] = [];
  let assigned = 0;

  for (const [id, w] of entries) {
    const exact = (total * w) / sumW;
    const floor = Math.floor(exact);
    result.set(id, floor);
    remainders.push({ id, frac: exact - floor });
    assigned += floor;
  }

  let remainder = total - assigned;
  remainders.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < remainder; i++) {
    const target = remainders[i % remainders.length]!;
    result.set(target.id, (result.get(target.id) ?? 0) + 1);
  }
  return result;
}

/** 单一分摊方式：均分 / 按人头 / 按比例 / 按份额。返回 Map<成员, 分（原始币种）>。 */
export function splitExpense(amountCents: number, spec: SplitSpec): ShareMap {
  assertIntegerCents(amountCents, 'amountCents');

  switch (spec.type) {
    case 'equal': {
      const members = spec.members ?? [];
      if (members.length === 0) {
        throw new SplitError('equal split requires members');
      }
      const weights = new Map(members.map((m) => [m, 1]));
      return allocateByWeight(amountCents, weights);
    }
    case 'by_member': {
      const map = spec.memberAmounts ?? {};
      const sum = Object.values(map).reduce((s, v) => s + v, 0);
      if (sum !== amountCents) {
        throw new SplitError(`by_member shares sum ${sum} != total ${amountCents}`);
      }
      return new Map(Object.entries(map));
    }
    case 'by_ratio': {
      const ratios = spec.ratios ?? {};
      return allocateByWeight(amountCents, new Map(Object.entries(ratios)));
    }
    case 'by_share': {
      const shares = spec.shares ?? {};
      const weights = new Map<UserId, number>();
      for (const [id, f] of Object.entries(shares)) {
        if (f.den === 0) {
          throw new SplitError(`share denominator for ${id} cannot be zero`);
        }
        weights.set(id, f.num / f.den);
      }
      return allocateByWeight(amountCents, weights);
    }
    default:
      throw new SplitError(`unknown split type`);
  }
}

/**
 * 菜品级 itemization：
 * - 每个明细项在 participants 中均分；
 * - 剩余（total - Σitems）在 restMembers 中均分；
 * - items 之和不得超过 total。
 */
export function splitWithItems(
  totalCents: number,
  items: ExpenseItem[],
  restMembers: UserId[],
): ShareMap {
  assertIntegerCents(totalCents, 'totalCents');
  const result: ShareMap = new Map();
  let itemsSum = 0;

  for (const item of items) {
    assertIntegerCents(item.amountCents, `item "${item.name}" amount`);
    itemsSum += item.amountCents;
    if (item.participants.length === 0) {
      throw new SplitError(`item "${item.name}" has no participants`);
    }
    const shares = splitExpense(item.amountCents, {
      type: 'equal',
      members: item.participants,
    });
    for (const [id, cents] of shares) {
      result.set(id, (result.get(id) ?? 0) + cents);
    }
  }

  if (itemsSum > totalCents) {
    throw new SplitError(`items sum ${itemsSum} exceeds total ${totalCents}`);
  }

  const rest = totalCents - itemsSum;
  if (rest > 0) {
    if (restMembers.length === 0) {
      throw new SplitError(`unallocated remainder ${rest} but no restMembers provided`);
    }
    const shares = splitExpense(rest, { type: 'equal', members: restMembers });
    for (const [id, cents] of shares) {
      result.set(id, (result.get(id) ?? 0) + cents);
    }
  }
  return result;
}
