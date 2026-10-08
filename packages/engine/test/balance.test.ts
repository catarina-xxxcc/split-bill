import { describe, expect, it } from 'vitest';
import { computeNetBalances } from '../src/balance';

describe('computeNetBalances', () => {
  it('单人垫付，多人均摊', () => {
    const net = computeNetBalances([
      { payer: 'a', baseAmountCents: 100, shares: new Map([['a', 50], ['b', 50]]) },
    ]);
    expect(net.get('a')).toBe(50);
    expect(net.get('b')).toBe(-50);
  });

  it('多笔相互抵消', () => {
    const net = computeNetBalances([
      { payer: 'a', baseAmountCents: 100, shares: new Map([['a', 50], ['b', 50]]) },
      { payer: 'b', baseAmountCents: 50, shares: new Map([['a', 25], ['b', 25]]) },
    ]);
    expect(net.get('a')).toBe(25);
    expect(net.get('b')).toBe(-25);
  });

  it('净额为零的成员被移除', () => {
    const net = computeNetBalances([
      { payer: 'a', baseAmountCents: 100, shares: new Map([['a', 50], ['b', 50]]) },
      { payer: 'c', baseAmountCents: 10, shares: new Map([['c', 10]]) },
    ]);
    expect(net.has('c')).toBe(false);
  });
});
