/* Money for MCP consumers — i.e. for language models.

   Deal values are stored as integer minor units (`value_pence`). That is right for
   storage and arithmetic, and wrong to hand a model on its own: on 2026-07-27 a model
   was given 113,000,000 pence, read it as pounds, and told a user their Q3 pipeline was
   "£113m" when it was £1.13m. It said it with complete confidence. A different model on
   the same data got it right, which is worse — the error is intermittent and invisible.

   So every read tool returns money TWICE: `value` as a formatted string a model can
   only quote, and `valuePence` as the integer for anything that needs to compute. The
   formatted string is the one that reaches a human.

   Currency comes from the record, not a constant. Zarco's own CRM is GBP today, but a
   customer on Salesforce or HubSpot can hold per-record `CurrencyIsoCode`, and summing
   mixed-currency records is the same class of silent error one layer up. Minor-unit
   depth is read from the currency too, so JPY (no minor unit) is not divided by 100. */

const LOCALE = "en-GB";

/** Minor units per major unit for a currency: 2 for GBP/USD/EUR, 0 for JPY. */
function minorDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat(LOCALE, { style: "currency", currency })
        .resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Format integer minor units as a human-readable amount: 1500000 → "£15,000".
 * Returns null for null/undefined so "no value recorded" never becomes "£0".
 * An unrecognised currency code degrades to a labelled number rather than
 * guessing a symbol, so a wrong currency is visible instead of silent.
 */
export function formatMoney(
  minor: number | null | undefined,
  currency: string | null | undefined = "GBP",
): string | null {
  if (minor === null || minor === undefined || Number.isNaN(Number(minor))) return null;
  const code = (currency || "GBP").toUpperCase();
  const major = Number(minor) / 10 ** minorDigits(code);
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${code} ${major.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`;
  }
}

/** Embed in a tool description so the units are stated where the model reads them,
    not just implied by a field name. The field name alone demonstrably wasn't enough. */
export const MONEY_UNITS_NOTE =
  "Money is returned twice per record: `value` is a formatted string for quoting to a " +
  "person (e.g. \"£15,000\"), and `valuePence` is the raw integer in minor units (pence) " +
  "for arithmetic only. Never present `valuePence` to a person as if it were pounds — " +
  "1500000 is £15,000, not £1.5m. Totals in this tool's own summary fields are already " +
  "computed; prefer them over summing rows yourself.";
