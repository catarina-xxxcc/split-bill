export function formatMoney(cents: number, currency: string): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${currency} ${(abs / 100).toFixed(2)}`;
}
