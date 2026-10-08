import { describe, expect, it } from 'vitest';
import { splitExpense, splitWithItems, SplitError } from '../src/split';

describe('splitExpense - equal', () => {
  it('均分整除', () => {
    const s = splitExpense(100, { type: 'equal', members: ['a', 'b'] });
    expect(s.get('a')).toBe(50);
    expect(s.get('b')).toBe(50);
  });

  it('均分有余数，优先分给首个成员', () => {
    const s = splitExpense(100, { type: 'equal', members: ['a', 'b', 'c'] });
    expect(s.get('a')).toBe(34);
    expect(s.get('b')).toBe(33);
    expect(s.get('c')).toBe(33);
  });

  it('无成员时抛错', () => {
    expect(() => splitExpense(100, { type: 'equal', members: [] })).toThrow(SplitError);
  });
});

describe('splitExpense - by_member', () => {
  it('按指定金额', () => {
    const s = splitExpense(100, {
      type: 'by_member',
      memberAmounts: { a: 40, b: 60 },
    });
    expect(s.get('a')).toBe(40);
    expect(s.get('b')).toBe(60);
  });

  it('总额不符时抛错', () => {
    expect(() =>
      splitExpense(100, { type: 'by_member', memberAmounts: { a: 40, b: 50 } }),
    ).toThrow(SplitError);
  });
});

describe('splitExpense - by_ratio', () => {
  it('按比例', () => {
    const s = splitExpense(100, { type: 'by_ratio', ratios: { a: 2, b: 1, c: 1 } });
    expect(s.get('a')).toBe(50);
    expect(s.get('b')).toBe(25);
    expect(s.get('c')).toBe(25);
  });
});

describe('splitExpense - by_share', () => {
  it('按份额 num/den', () => {
    const s = splitExpense(100, {
      type: 'by_share',
      shares: { a: { num: 1, den: 2 }, b: { num: 1, den: 4 }, c: { num: 1, den: 4 } },
    });
    expect(s.get('a')).toBe(50);
    expect(s.get('b')).toBe(25);
    expect(s.get('c')).toBe(25);
  });

  it('分母为 0 抛错', () => {
    expect(() =>
      splitExpense(100, { type: 'by_share', shares: { a: { num: 1, den: 0 } } }),
    ).toThrow(SplitError);
  });
});

describe('splitExpense - 守恒性', () => {
  it('任何方式下分摊总和等于总额', () => {
    const cases = [
      splitExpense(999, { type: 'equal', members: ['a', 'b', 'c', 'd', 'e'] }),
      splitExpense(999, { type: 'by_ratio', ratios: { a: 3, b: 7, c: 2 } }),
    ];
    for (const s of cases) {
      expect([...s.values()].reduce((x, y) => x + y, 0)).toBe(999);
    }
  });
});

describe('splitWithItems - itemization', () => {
  it('明细 + 剩余均分', () => {
    const s = splitWithItems(
      100,
      [{ name: '牛排', amountCents: 40, participants: ['a'] }],
      ['a', 'b', 'c'],
    );
    expect(s.get('a')).toBe(60);
    expect(s.get('b')).toBe(20);
    expect(s.get('c')).toBe(20);
  });

  it('明细超过总额抛错', () => {
    expect(() =>
      splitWithItems(100, [{ name: 'x', amountCents: 120, participants: ['a'] }], ['a']),
    ).toThrow(SplitError);
  });

  it('有余数但无 restMembers 抛错', () => {
    expect(() =>
      splitWithItems(100, [{ name: 'x', amountCents: 50, participants: ['a'] }], []),
    ).toThrow(SplitError);
  });
});
