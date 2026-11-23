import { AccountCode, GameState, LedgerEntry, LedgerEntryType } from '../types/game';

/**
 * Converts Egyptian Pounds (EGP) to integer piastres (قروش) to prevent floating-point errors.
 */
export function egpToPiastres(egp: number): number {
  return Math.round(egp * 100);
}

/**
 * Converts integer piastres to EGP number.
 */
export function piastresToEgp(piastres: number): number {
  return piastres / 100;
}

/**
 * Formats piastres as an Egyptian Pound string with 2 decimal places.
 */
export function formatEGP(piastres: number, includeDecimals = false): string {
  const isNegative = piastres < 0;
  const absPiastres = Math.abs(Math.round(piastres));
  const egpWhole = Math.floor(absPiastres / 100);
  const remPiastres = absPiastres % 100;

  const formattedWhole = egpWhole.toLocaleString('en-US');
  const decimalPart =
    remPiastres > 0 || includeDecimals ? `.${remPiastres.toString().padStart(2, '0')}` : '.00';

  return `${isNegative ? '-' : ''}${formattedWhole}${decimalPart} ج.م`;
}

export function formatClockTime(minutesFromMidnight: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutesFromMidnight)));
  const hours24 = Math.floor(clamped / 60);
  const mins = clamped % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}

export interface FinancialMetrics {
  openingCashPiastres: number;
  actualCashReceiptsPiastres: number;
  actualCashPaymentsPiastres: number;
  computedClosingCashPiastres: number;
  displayedCashPiastres: number;
  isCashReconciled: boolean;
  earnedServiceRevenuePiastres: number;
  incurredOperatingExpensesPiastres: number; // Shipping, fuel, maintenance, warehouse ops
  incurredSalaryExpensesPiastres: number; // Accrued salaries + paid bonuses - penalties
  totalPeriodExpensesPiastres: number; // Operating + Salary expenses
  netOperatingProfitPiastres: number;
  openingReceivablesPiastres: number;
  earnedUncollectedRevenuePiastres: number;
  collectedReceivablesPiastres: number;
  closingReceivablesPiastres: number;
  merchantCodLiabilityPiastres: number;
  accruedSalariesPayablePiastres: number;
  companyDebtLiabilitiesPiastres: number;
  totalLiabilitiesAndPayablesPiastres: number;
}

/**
 * Pure verification and calculation of all 8 core financial indicators and accounting equations.
 * Strictly separates:
 * 1. Available Cash (الرصيد النقدي المتاح)
 * 2. Period Revenue (إيرادات الفترة المكتسبة)
 * 3. Period Expenses (مصروفات الفترة الإجمالية)
 * 4. Operating Profit (الربح التشغيلي = الإيرادات المكتسبة - مصروفات الفترة المستحقة)
 * 5. Client Receivables (المستحقات لدى العملاء)
 * 6. Due Liabilities (الالتزامات المستحقة: ديون + أمانات تجار + رواتب مستحقة)
 * 7. Payroll/Salary Cost (تكلفة الرواتب والمكافآت والجزاءات)
 * 8. Shipping & Operating Cost (تكاليف الشحن والتشغيل والمستودع)
 */
export function calculateFinancialMetrics(
  state: GameState,
  forDay?: number
): FinancialMetrics {
  const entries = forDay
    ? state.ledger.filter((e) => e.day === forDay)
    : state.ledger;

  let openingCashPiastres = state.company.openingCashPiastres;
  if (forDay && forDay > 1) {
    const priorEntries = state.ledger.filter((e) => e.day < forDay);
    openingCashPiastres = priorEntries.reduce((acc, item) => acc + item.cashDeltaPiastres, 0);
  }

  let actualCashReceiptsPiastres = 0;
  let actualCashPaymentsPiastres = 0;
  let earnedServiceRevenuePiastres = 0;
  let incurredOperatingExpensesPiastres = 0;
  let incurredSalaryExpensesPiastres = 0;

  for (const entry of entries) {
    if (entry.type === 'OPENING_BALANCE') {
      continue;
    }
    if (entry.affectsCash) {
      if (entry.cashDeltaPiastres > 0) {
        actualCashReceiptsPiastres += entry.cashDeltaPiastres;
      } else if (entry.cashDeltaPiastres < 0) {
        actualCashPaymentsPiastres += Math.abs(entry.cashDeltaPiastres);
      }
    }

    // Earned Service Revenue
    if (entry.creditAccount === 'SERVICE_REVENUE') {
      earnedServiceRevenuePiastres += entry.amountPiastres;
    }
    if (entry.debitAccount === 'SERVICE_REVENUE') {
      earnedServiceRevenuePiastres -= entry.amountPiastres;
    }

    // Shipping, Marketing, HR Recruitment & Operating Expenses
    if (
      entry.debitAccount === 'OPERATING_EXPENSE' ||
      entry.debitAccount === 'HR_RECRUITMENT_EXPENSE' ||
      entry.debitAccount === 'MARKETING_EXPENSE'
    ) {
      incurredOperatingExpensesPiastres += entry.amountPiastres;
    }
    if (
      entry.creditAccount === 'OPERATING_EXPENSE' ||
      entry.creditAccount === 'HR_RECRUITMENT_EXPENSE' ||
      entry.creditAccount === 'MARKETING_EXPENSE'
    ) {
      incurredOperatingExpensesPiastres -= entry.amountPiastres;
    }

    // Salary & Bonus Expenses (net of approved penalties reducing salary expense)
    if (entry.debitAccount === 'SALARY_EXPENSE') {
      incurredSalaryExpensesPiastres += entry.amountPiastres;
    }
    if (entry.creditAccount === 'SALARY_EXPENSE') {
      incurredSalaryExpensesPiastres = Math.max(
        0,
        incurredSalaryExpensesPiastres - entry.amountPiastres
      );
    }
  }

  const totalPeriodExpensesPiastres =
    incurredOperatingExpensesPiastres + incurredSalaryExpensesPiastres;

  // Equation 1: Net Operating Profit (strictly non-negative — zero negative numbers policy)
  const netOperatingProfitPiastres = Math.max(
    0,
    earnedServiceRevenuePiastres - totalPeriodExpensesPiastres
  );

  // Equation 2: Closing Cash = Opening Cash + Actual Cash Receipts - Actual Cash Payments
  const computedClosingCashPiastres = Math.max(
    0,
    openingCashPiastres + actualCashReceiptsPiastres - actualCashPaymentsPiastres
  );

  const allEntriesCashSum = state.ledger.reduce(
    (sum, e) => sum + e.cashDeltaPiastres,
    0
  );
  const isCashReconciled =
    allEntriesCashSum === state.company.cashPiastres &&
    state.company.cashPiastres >= 0;

  // Equation 3: Receivables = Opening Receivables + Earned Uncollected - Collected Receivables
  const relevantPreFilter = forDay
    ? state.ledger.filter((e) => e.day < forDay)
    : [];
  const openingReceivablesPiastres = Math.max(
    0,
    relevantPreFilter.reduce((sum, e) => {
      if (e.debitAccount === 'ACCOUNTS_RECEIVABLE') return sum + e.amountPiastres;
      if (e.creditAccount === 'ACCOUNTS_RECEIVABLE') return sum - e.amountPiastres;
      return sum;
    }, 0)
  );

  let earnedUncollectedRevenuePiastres = 0;
  let collectedReceivablesPiastres = 0;

  for (const entry of entries) {
    if (entry.debitAccount === 'ACCOUNTS_RECEIVABLE') {
      earnedUncollectedRevenuePiastres += entry.amountPiastres;
    }
    if (entry.creditAccount === 'ACCOUNTS_RECEIVABLE') {
      collectedReceivablesPiastres += entry.amountPiastres;
    }
  }

  const closingReceivablesPiastres = Math.max(
    0,
    openingReceivablesPiastres +
      earnedUncollectedRevenuePiastres -
      collectedReceivablesPiastres
  );

  // Merchant COD Liability (Custody funds held for merchants, never negative)
  const merchantCodLiabilityPiastres = Math.max(
    0,
    state.ledger.reduce((sum, e) => {
      if (forDay && e.day > forDay) return sum;
      if (e.creditAccount === 'MERCHANT_COD_PAYABLE') return sum + e.amountPiastres;
      if (e.debitAccount === 'MERCHANT_COD_PAYABLE') return sum - e.amountPiastres;
      return sum;
    }, 0)
  );

  // Accrued Salaries Payable (8-day cycle salaries accrued, settled from available cash without debt)
  const accruedSalariesPayablePiastres = Math.max(
    0,
    state.ledger.reduce((sum, e) => {
      if (forDay && e.day > forDay) return sum;
      if (e.creditAccount === 'ACCRUED_SALARIES_PAYABLE') return sum + e.amountPiastres;
      if (e.debitAccount === 'ACCRUED_SALARIES_PAYABLE') return sum - e.amountPiastres;
      return sum;
    }, 0)
  );

  const companyDebtLiabilitiesPiastres = Math.max(
    0,
    state.company.liabilitiesPiastres
  );

  const totalLiabilitiesAndPayablesPiastres =
    companyDebtLiabilitiesPiastres +
    merchantCodLiabilityPiastres +
    accruedSalariesPayablePiastres;

  return {
    openingCashPiastres: Math.max(0, openingCashPiastres),
    actualCashReceiptsPiastres: Math.max(0, actualCashReceiptsPiastres),
    actualCashPaymentsPiastres: Math.max(0, actualCashPaymentsPiastres),
    computedClosingCashPiastres,
    displayedCashPiastres: Math.max(0, state.company.cashPiastres),
    isCashReconciled,
    earnedServiceRevenuePiastres: Math.max(0, earnedServiceRevenuePiastres),
    incurredOperatingExpensesPiastres: Math.max(0, incurredOperatingExpensesPiastres),
    incurredSalaryExpensesPiastres: Math.max(0, incurredSalaryExpensesPiastres),
    totalPeriodExpensesPiastres: Math.max(0, totalPeriodExpensesPiastres),
    netOperatingProfitPiastres,
    openingReceivablesPiastres,
    earnedUncollectedRevenuePiastres: Math.max(0, earnedUncollectedRevenuePiastres),
    collectedReceivablesPiastres: Math.max(0, collectedReceivablesPiastres),
    closingReceivablesPiastres,
    merchantCodLiabilityPiastres,
    accruedSalariesPayablePiastres,
    companyDebtLiabilitiesPiastres,
    totalLiabilitiesAndPayablesPiastres: Math.max(0, totalLiabilitiesAndPayablesPiastres),
  };
}

/**
 * Checks whether the company has enough immediate liquidity (cash) to pay an immediate expense or purchase.
 */
export function canAffordImmediatePayment(
  state: GameState,
  requiredCashPiastres: number
): { allowed: boolean; reason?: string } {
  if (requiredCashPiastres <= 0) {
    return { allowed: true };
  }
  if (state.company.cashPiastres < requiredCashPiastres) {
    return {
      allowed: false,
      reason: `السيولة النقدية المتاحة (${formatEGP(state.company.cashPiastres)}) غير كافية لتغطية المبلغ المطلوب فوراً (${formatEGP(requiredCashPiastres)}).`,
    };
  }
  return { allowed: true };
}

/**
 * Appends a verified financial entry to the ledger and updates company cash/liabilities atomically.
 */
export function recordLedgerTransaction(
  state: GameState,
  params: {
    type: LedgerEntryType;
    amountPiastres: number;
    debitAccount: AccountCode;
    creditAccount: AccountCode;
    referenceId: string;
    description: string;
  }
): GameState {
  const { type, amountPiastres, debitAccount, creditAccount, referenceId, description } =
    params;

  if (amountPiastres <= 0) {
    throw new Error('مبلغ العملية المالية يجب أن يكون أكبر من الصفر.');
  }

  let affectsCash = false;
  let cashDeltaPiastres = 0;

  if (debitAccount === 'CASH') {
    affectsCash = true;
    cashDeltaPiastres = amountPiastres;
  } else if (creditAccount === 'CASH') {
    affectsCash = true;
    cashDeltaPiastres = -amountPiastres;
  }

  if (cashDeltaPiastres < 0) {
    const needed = Math.abs(cashDeltaPiastres);
    if (state.company.cashPiastres < needed) {
      throw new Error(
        `لا يمكن تنفيذ الدفع النقدي (${formatEGP(needed)}) لأن السيولة المتاحة (${formatEGP(state.company.cashPiastres)}) غير كافية.`
      );
    }
  }

  const nextSequence = state.ledger.length + 1;
  const timeLabel = state.clock
    ? formatClockTime(state.clock.minutesFromMidnight)
    : '09:00';

  const newEntry: LedgerEntry = {
    id: `LED-${state.company.currentDay}-${nextSequence.toString().padStart(3, '0')}`,
    day: state.company.currentDay,
    timeLabel,
    sequenceNumber: nextSequence,
    type,
    amountPiastres,
    debitAccount,
    creditAccount,
    referenceId,
    description,
    affectsCash,
    cashDeltaPiastres,
  };

  const newCash = state.company.cashPiastres + cashDeltaPiastres;
  if (newCash < 0) {
    throw new Error(
      'لا يسمح النظام المالي برصيد نقدي سالب أو الاستدانة تحت أي ظرف.'
    );
  }

  let newLiabilities = Math.max(0, state.company.liabilitiesPiastres);
  if (creditAccount === 'LIABILITIES_PAYABLE' && type !== 'OPENING_BALANCE') {
    throw new Error(
      'سياسة النظام المالي الحالية تمنع تسجيل أي ديون أو التزامات اقتراض جديدة.'
    );
  } else if (debitAccount === 'LIABILITIES_PAYABLE') {
    newLiabilities = Math.max(0, newLiabilities - amountPiastres);
  }

  const nextState: GameState = {
    ...state,
    company: {
      ...state.company,
      cashPiastres: newCash,
      liabilitiesPiastres: newLiabilities,
    },
    ledger: [...state.ledger, newEntry],
  };

  const sumCash = nextState.ledger.reduce((acc, e) => acc + e.cashDeltaPiastres, 0);
  if (sumCash !== nextState.company.cashPiastres || nextState.company.cashPiastres < 0) {
    throw new Error('خطأ في مطابقة الرصيد النقدي مع دفتر الأستاذ العام.');
  }

  return nextState;
}
