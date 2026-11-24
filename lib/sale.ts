export type PriceLine = { price: number; qty: number };

export function computeTotals(lines: PriceLine[], discount: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  return { subtotal, total: subtotal - discount, change: 0 };
}

export function totalsAreValid(total: number, paid: number): boolean {
  return total >= 0 && paid >= total;
}
