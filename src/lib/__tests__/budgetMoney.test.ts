import { describe, it, expect } from 'vitest';
import {
  toMinor,
  toMajor,
  formatMinor,
  formatMajor,
  sumMinor,
  sumMinorValues,
  pctMinor,
  currencySymbol,
  currencyLocale,
} from '@/lib/budgetMoney';
import type { CurrencyCode } from '@/lib/budgetMoney';

// ── Unit tests for the Vowora money model ──

describe('toMinor / toMajor conversion', () => {
  it('converts major to minor (GBP)', () => {
    expect(toMinor(25.50)).toBe(2550);
  });

  it('converts major to minor (USD)', () => {
    expect(toMinor(10.99)).toBe(1099);
  });

  it('handles zero', () => {
    expect(toMinor(0)).toBe(0);
  });

  it('handles negative amounts', () => {
    expect(toMinor(-5.00)).toBe(-500);
  });

  it('rounds safely for numbers with more than 2 decimals', () => {
    expect(toMinor(25.555)).toBe(2556); // Math.round
    expect(toMinor(25.554)).toBe(2555);
  });

  it('converts minor back to major', () => {
    expect(toMajor(2550)).toBe(25.50);
    expect(toMajor(0)).toBe(0);
    expect(toMajor(-500)).toBe(-5.00);
  });

  it('round-trips correctly for common amounts', () => {
    const amounts = [0, 0.01, 1.00, 25.50, 99.99, 1000.00, 9999.99];
    for (const a of amounts) {
      expect(toMajor(toMinor(a))).toBe(a);
    }
  });
});

describe('formatMinor / formatMajor', () => {
  it('formats GBP without decimals by default', () => {
    const result = formatMinor(2550, 'GBP');
    expect(result).toBe('£25.50');
  });

  it('formats GBP with decimals', () => {
    const result = formatMinor(2550, 'GBP', true);
    expect(result).toBe('£25.50');
  });

  it('formats USD', () => {
    const result = formatMinor(1099, 'USD');
    expect(result).toBe('$10.99');
  });

  it('formats EUR', () => {
    const result = formatMinor(5000, 'EUR');
    expect(result).toBe('€50');
  });

  it('falls back to GBP for unknown currency', () => {
    const result = formatMinor(1000, 'XYZ' as CurrencyCode);
    expect(result).toBe('£10');
  });

  it('formatMajor is a convenience wrapper', () => {
    const result = formatMajor(25.50, 'GBP');
    expect(result).toBe('£25.50');
  });

  it('formats zero correctly', () => {
    expect(formatMinor(0, 'GBP')).toBe('£0');
    expect(formatMinor(0, 'USD', true)).toBe('$0.00');
  });

  it('handles large amounts', () => {
    const result = formatMinor(10000000, 'GBP');
    expect(result).toBe('£100,000');
  });
});

describe('sumMinor / sumMinorValues', () => {
  it('sums major-unit amounts safely as minor units', () => {
    const result = sumMinor([25.50, 10.25, 5.00]);
    expect(result).toBe(4075); // (2550 + 1025 + 500)
  });

  it('handles empty array', () => {
    expect(sumMinor([])).toBe(0);
  });

  it('handles single amount', () => {
    expect(sumMinor([42.00])).toBe(4200);
  });

  it('sums minor-unit values directly', () => {
    const result = sumMinorValues([2550, 1025, 500]);
    expect(result).toBe(4075);
  });

  it('handles negative values in sum', () => {
    const result = sumMinor([100.00, -25.00]);
    expect(result).toBe(7500);
  });
});

describe('pctMinor', () => {
  it('calculates percentage from minor units', () => {
    expect(pctMinor(5000, 10000)).toBe(50);
  });

  it('returns 0 when total is 0', () => {
    expect(pctMinor(5000, 0)).toBe(0);
  });

  it('returns 0 when total is negative', () => {
    expect(pctMinor(5000, -1)).toBe(0);
  });

  it('handles 100% exactly', () => {
    expect(pctMinor(10000, 10000)).toBe(100);
  });

  it('rounds to nearest integer', () => {
    expect(pctMinor(3333, 10000)).toBe(33);
    expect(pctMinor(6666, 10000)).toBe(67);
  });
});

describe('currencySymbol / currencyLocale', () => {
  it('returns correct symbols', () => {
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('AUD')).toBe('A$');
    expect(currencySymbol('CAD')).toBe('C$');
  });

  it('returns correct locales', () => {
    expect(currencyLocale('GBP')).toBe('en-GB');
    expect(currencyLocale('USD')).toBe('en-US');
    expect(currencyLocale('EUR')).toBe('de-DE');
  });

  it('falls back to GBP for unknown currency', () => {
    expect(currencySymbol('XYZ' as CurrencyCode)).toBe('£');
    expect(currencyLocale('XYZ' as CurrencyCode)).toBe('en-GB');
  });
});