import { supabase } from '../lib/supabase';

const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  CNY: 0.14,
  JPY: 0.0067,
  GBP: 1.27,
  HKD: 0.128,
  KRW: 0.00074,
  AUD: 0.66,
  CAD: 0.73,
  SGD: 0.74,
  THB: 0.028,
  TWD: 0.031,
  MYR: 0.21,
  NZD: 0.6,
  CHF: 1.13,
};

export const CURRENCIES = Object.keys(USD_RATES);

/** 返回 1 单位 from = rate 单位 to；查不到返回 null（需手动输入）。 */
export function getRate(from: string, to: string): number | null {
  const a = USD_RATES[from];
  const b = USD_RATES[to];
  if (a == null || b == null) return null;
  return a / b;
}

/** 从 Edge Function（Frankfurter）拉实时汇率；失败返回 null（兜底静态表）。 */
export async function fetchLiveRate(from: string, to: string): Promise<number | null> {
  if (from === to) return 1;
  try {
    const { data, error } = await supabase.functions.invoke('get-rates', {
      body: { base: from },
    });
    if (error || !data?.rates?.[to]) return null;
    return Number(data.rates[to]);
  } catch {
    return null;
  }
}
