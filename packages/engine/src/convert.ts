import { Currency, Money } from './types';

/** 按汇率把金额折算到目标币种（四舍五入到整数分）。 */
export function convert(money: Money, rate: number, target: Currency): Money {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`invalid rate: ${rate}`);
  }
  return {
    amountCents: Math.round(money.amountCents * rate),
    currency: target,
  };
}
