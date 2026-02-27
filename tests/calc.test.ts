import { describe, expect, test } from "vitest";
import { calcDebtVES, calcFees, calcROI, calcUsdEquivalentPaid } from "@/lib/calc";
import { d } from "@/lib/money";

describe("calc", () => {
  test("fees separated", () => {
    const fees = calcFees({ usdCharged: 100, bankFeePercent: 0.015, merchantFeePercent: 0.01 });
    expect(fees.bankFeeUSD.toFixed(2)).toBe("1.50");
    expect(fees.merchantFeeUSD.toFixed(2)).toBe("1.00");
    expect(fees.totalFeeUSD.toFixed(2)).toBe("2.50");
    expect(fees.usdCashReceived.toFixed(2)).toBe("97.50");
  });

  test("debt VES rounded to 2 decimals", () => {
    const debt = calcDebtVES({ usdCharged: 10, bcvRateOnCharge: 36.123456 });
    expect(debt.toFixed(2)).toBe("361.23");
  });

  test("usd equivalent paid", () => {
    const usdEq = calcUsdEquivalentPaid({ amountVES: 361.23, bcvRateOnPayment: 36.123456 });
    // approx 10 USD
    expect(d(usdEq).toNumber()).toBeCloseTo(10, 3);
  });

  test("ROI", () => {
    const roi = calcROI({ profitUSD: 5, usdCashReceived: 100 });
    expect(roi.toFixed(4)).toBe("0.0500");
  });
});
