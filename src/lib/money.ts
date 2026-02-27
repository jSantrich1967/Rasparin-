import Decimal from "decimal.js";

// Keep rounding rules explicit and centralized.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type D = Decimal;

export function d(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function round2(value: Decimal.Value): Decimal {
  return d(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function round6(value: Decimal.Value): Decimal {
  return d(value).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
}

export function clamp(value: Decimal.Value, min: Decimal.Value, max: Decimal.Value): Decimal {
  const v = d(value);
  if (v.lt(min)) return d(min);
  if (v.gt(max)) return d(max);
  return v;
}

export function formatUSD(value: Decimal.Value): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(d(value).toFixed(2))
  );
}

export function formatVES(value: Decimal.Value): string {
  // VES formatting: just number with 2 decimals (currency formatting varies by locale)
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(round2(value).toFixed(2))
  );
}
