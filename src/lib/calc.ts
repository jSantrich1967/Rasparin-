import Decimal from "decimal.js";
import { d, round2 } from "@/lib/money";

export type Fees = {
  bankFeeUSD: Decimal;
  merchantFeeUSD: Decimal;
  totalFeeUSD: Decimal;
  usdCashReceived: Decimal;
  totalFeePercent: Decimal;
};

export function calcFees(params: {
  usdCharged: Decimal.Value;
  bankFeePercent: Decimal.Value; // ratio, e.g. 0.015
  merchantFeePercent: Decimal.Value; // ratio
}): Fees {
  const usdCharged = d(params.usdCharged);
  const bankFeePercent = d(params.bankFeePercent);
  const merchantFeePercent = d(params.merchantFeePercent);

  const bankFeeUSD = usdCharged.mul(bankFeePercent);
  const merchantFeeUSD = usdCharged.mul(merchantFeePercent);
  const totalFeeUSD = bankFeeUSD.add(merchantFeeUSD);
  const usdCashReceived = usdCharged.sub(totalFeeUSD);

  return {
    bankFeeUSD: bankFeeUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    merchantFeeUSD: merchantFeeUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalFeeUSD: totalFeeUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    usdCashReceived: usdCashReceived.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    totalFeePercent: bankFeePercent.add(merchantFeePercent),
  };
}

export function calcDebtVES(params: {
  usdCharged: Decimal.Value;
  bcvRateOnCharge: Decimal.Value; // VES per USD
}): Decimal {
  return round2(d(params.usdCharged).mul(d(params.bcvRateOnCharge)));
}

export function calcUsdEquivalentPaid(params: {
  amountVES: Decimal.Value;
  bcvRateOnPayment: Decimal.Value;
}): Decimal {
  const rate = d(params.bcvRateOnPayment);
  if (rate.lte(0)) throw new Error("bcvRateOnPayment must be > 0");
  // Keep more precision; UI can round to 2.
  return d(params.amountVES).div(rate);
}

export function calcProfitRealizedUSD(params: {
  usdCashReceived: Decimal.Value;
  usdRealPaid: Decimal.Value;
}): Decimal {
  return d(params.usdCashReceived).sub(d(params.usdRealPaid)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Ganancia realizada usando tasa de mercado para el "costo" del pago en VES.
 * profit = usdCashReceived - (amountVESApplied / marketRate)
 * Si marketRate no se provee, usa bcvRateOnPayment (comportamiento anterior).
 */
export function calcProfitRealizedUSDWithMarket(params: {
  usdCashReceived: Decimal.Value;
  amountVESApplied: Decimal.Value;
  marketOrBcvRate: Decimal.Value; // tasa de mercado o BCV para convertir VES pagados a USD
}): Decimal {
  const rate = d(params.marketOrBcvRate);
  if (rate.lte(0)) throw new Error("marketOrBcvRate must be > 0");
  const usdCostOfPayment = d(params.amountVESApplied).div(rate);
  return d(params.usdCashReceived).sub(usdCostOfPayment).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calcROI(params: {
  profitUSD: Decimal.Value;
  usdCashReceived: Decimal.Value;
}): Decimal {
  const base = d(params.usdCashReceived);
  if (base.eq(0)) return d(0);
  return d(params.profitUSD).div(base);
}

export function calcUsedAndAvailable(params: {
  creditLimitVES: Decimal.Value;
  openingBalanceVES: Decimal.Value;
  totalDebtVES: Decimal.Value; // ops no cancelled
  totalPaymentsVES: Decimal.Value;
}): { usedVES: Decimal; availableVES: Decimal } {
  const usedVES = round2(d(params.openingBalanceVES).add(d(params.totalDebtVES)).sub(d(params.totalPaymentsVES)));
  const availableVES = round2(d(params.creditLimitVES).sub(usedVES));
  return { usedVES, availableVES };
}
