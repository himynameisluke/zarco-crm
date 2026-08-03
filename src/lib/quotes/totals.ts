/**
 * Pure quote-money math (integer pence). No server-only imports, no DB —
 * vitest imports this directly (pure-core/io-shell, same as src/lib/reports).
 *
 * Rounding contract: each line total rounds independently, the subtotal is
 * the sum of rounded line totals, and tax rounds once on the subtotal. This
 * matches what create_quote has always persisted per line item.
 */

export type PenceLineItem = { quantity: number; unitPricePence: number };

export function lineTotalPence(li: PenceLineItem): number {
  return Math.round(li.quantity * li.unitPricePence);
}

export function totalWithTaxPence(subtotalPence: number, taxRate: number): number {
  return Math.round(subtotalPence * (1 + taxRate));
}

export function computeTotalsPence(items: PenceLineItem[], taxRate: number) {
  const subtotalPence = items.reduce((sum, li) => sum + lineTotalPence(li), 0);
  return { subtotalPence, totalPence: totalWithTaxPence(subtotalPence, taxRate) };
}
