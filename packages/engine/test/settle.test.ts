import { describe, expect, it } from 'vitest';
import { simplifyDebts } from '../src/settle';

describe('simplifyDebts', () => {
  it('单边债务', () => {
    const t = simplifyDebts(new Map([['a', 10], ['b', -10]]));
    expect(t).toEqual([{ from: 'b', to: 'a', amountCents: 10 }]);
  });

  it('多边债务，转账笔数 ≤ n-1', () => {
    const net = new Map([['a', 30], ['b', 10], ['c', -25], ['d', -15]]);
    const t = simplifyDebts(net);
    expect(t.length).toBeLessThanOrEqual(3);
  });

  it('守恒：每人的净额经转账后归零', () => {
    const net = new Map([['a', 45], ['b', -20], ['c', -15], ['d', -10]]);
    const t = simplifyDebts(net);
    const delta = new Map<string, number>();
    for (const tr of t) {
      delta.set(tr.from, (delta.get(tr.from) ?? 0) - tr.amountCents);
      delta.set(tr.to, (delta.get(tr.to) ?? 0) + tr.amountCents);
    }
    for (const [id, v] of net) {
      expect(delta.get(id) ?? 0).toBe(v);
    }
  });

  it('无债务返回空', () => {
    expect(simplifyDebts(new Map())).toEqual([]);
  });
});
