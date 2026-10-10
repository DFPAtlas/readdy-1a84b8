// ── Wedding budget money model ──
// All internal calculations use integer minor units (e.g. pence for GBP, cents for USD/EUR).
// Display values use major units. This prevents floating-point drift on repeated totals.
//
// DB amounts are stored as NUMERIC(12,2) — always precise at the source.
// When reading from DB, convert to minor units immediately.
// When writing to DB, convert back to major units.

export type CurrencyCode = 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD';

const CURRENCY_CONFIG: Record<CurrencyCode, { symbol: string; locale: string; minorName: string }> = {
  GBP: { symbol: '£', locale: 'en-GB', minorName: 'pence' },
  USD: { symbol: '$', locale: 'en-US', minorName: 'cents' },
  EUR: { symbol: '€', locale: 'de-DE', minorName: 'cents' },
  AUD: { symbol: 'A$', locale: 'en-AU', minorName: 'cents' },
  CAD: { symbol: 'C$', locale: 'en-CA', minorName: 'cents' },
};

/**
 * Convert a major-unit amount (e.g. 25.50) to minor units (2550).
 * Rounds to nearest integer — NUMERIC(12,2) guarantees at most 2 decimal places.
 */
export function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert minor units (e.g. 2550) back to major units (25.50).
 */
export function toMajor(cents: number): number {
  return cents / 100;
}

/**
 * Format a minor-unit amount for display.
 * e.g. formatMinor(2550, 'GBP') → "£25.50"
 *      formatMinor(2550, 'GBP', true) → "£25.50"
 */
export function formatMinor(cents: number, currency: CurrencyCode = 'GBP', showDecimals = false): string {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.GBP;
  const major = toMajor(cents);
  return major.toLocaleString(currency === 'EUR' ? 'en-IE' : cfg.locale, {
    style: 'currency',
    currency: currency in CURRENCY_CONFIG ? currency : 'GBP',
    minimumFractionDigits: showDecimals || major % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: showDecimals || major % 1 !== 0 ? 2 : 0,
  });
}

/**
 * Format a major-unit number for display.
 * Convenience wrapper — use toMinor + formatMinor for precision-sensitive values.
 */
export function formatMajor(amount: number, currency: CurrencyCode = 'GBP', showDecimals = false): string {
  return formatMinor(toMinor(amount), currency, showDecimals);
}

/**
 * Safely sum an array of major-unit numbers, avoiding floating-point accumulation.
 * Returns minor units.
 */
export function sumMinor(amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + toMinor(a), 0);
}

/**
 * Safely sum an array of minor-unit values.
 */
export function sumMinorValues(values: number[]): number {
  return values.reduce((sum, v) => sum + Math.round(v), 0);
}

/**
 * Calculate what percentage `part` is of `total`, both in minor units.
 * Returns integer percentage 0-100+.
 */
export function pctMinor(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Get the currency symbol for a code.
 */
export function currencySymbol(code: CurrencyCode): string {
  return (CURRENCY_CONFIG[code] || CURRENCY_CONFIG.GBP).symbol;
}

/**
 * Get the locale for formatting.
 */
export function currencyLocale(code: CurrencyCode): string {
  return (CURRENCY_CONFIG[code] || CURRENCY_CONFIG.GBP).locale;
}