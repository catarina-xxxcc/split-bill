import { describe, expect, it } from 'vitest';
import { convert } from '../src/convert';

describe('convert', () => {
  it('基本折算', () => {
    const m = convert({ amountCents: 100, currency: 'USD' }, 1.08, 'EUR');
    expect(m).toEqual({ amountCents: 108, currency: 'EUR' });
  });

  it('四舍五入到整数分', () => {
    const m = convert({ amountCents: 101, currency: 'USD' }, 1.005, 'EUR');
    expect(m.amountCents).toBe(102);
  });

  it('非法汇率抛错', () => {
    expect(() => convert({ amountCents: 100, currency: 'USD' }, 0, 'EUR')).toThrow();
    expect(() => convert({ amountCents: 100, currency: 'USD' }, -1, 'EUR')).toThrow();
    expect(() => convert({ amountCents: 100, currency: 'USD' }, NaN, 'EUR')).toThrow();
  });
});
