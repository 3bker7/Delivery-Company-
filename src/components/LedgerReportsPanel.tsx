import React, { useState } from 'react';
import {
  calculateFinancialMetrics,
  formatEGP,
} from '../engine/financeEngine';
import {
  runMandatoryVerificationTests,
  VerificationSuiteResult,
} from '../engine/verificationTests';
import { AccountCode, GameState, LedgerEntry } from '../types/game';

interface LedgerReportsModalProps {
  state: GameState;
}

type IndicatorKey =
  | 'CASH'
  | 'REVENUE'
  | 'EXPENSES'
  | 'PROFIT'
  | 'RECEIVABLES'
  | 'LIABILITIES'
  | 'SALARIES'
  | 'SHIPPING_OPS';

const ACCOUNT_LABELS_AR: Record<AccountCode, string> = {
  CASH: 'النقدية بالخزينة',
  ACCOUNTS_RECEIVABLE: 'مستحقات لدى العملاء (ذمم مدينة)',
  SERVICE_REVENUE: 'إيرادات خدمات الشحن المكتسبة',
  OPERATING_EXPENSE: 'تكاليف الشحن والتشغيل والمستودع',
  HR_RECRUITMENT_EXPENSE: 'مصروفات إعلانات التوظيف (HR)',
  MARKETING_EXPENSE: 'مصروفات الحملات التسويقية',
  SALARY_EXPENSE: 'تكلفة الرواتب والمكافآت',
  ACCRUED_SALARIES_PAYABLE: 'رواتب مستحقة الدفع (التزام دورة 8 أيام)',
  MERCHANT_COD_PAYABLE: 'أمانات تحصيل التجار (COD دائن)',
  LIABILITIES_PAYABLE: 'التزامات وديون مستحقة',
  OPENING_EQUITY: 'رأس المال الافتتاحي',
};

export const LedgerReportsPanel: React.FC<LedgerReportsModalProps> = ({
  state,
}) => {
  const [subTab, setSubTab] = useState<
    'MAIN_INDICATORS' | 'DAILY_REPORT' | 'FULL_LEDGER' | 'AUDIT_TESTS'
  >('MAIN_INDICATORS');
  const [selectedIndicator, setSelectedIndicator] =
    useState<IndicatorKey>('CASH');
  const [testSuiteResult, setTestSuiteResult] =
    useState<VerificationSuiteResult | null>(null);

  const metricsAll = calculateFinancialMetrics(state);
  const metricsToday = calculateFinancialMetrics(state, state.company.currentDay);

  const handleRunTests = () => {
    const res = runMandatoryVerificationTests();
    setTestSuiteResult(res);
  };

  // Filter ledger entries matching the clicked indicator
  const filterEntriesForIndicator = (key: IndicatorKey): LedgerEntry[] => {
    return state.ledger.filter((e) => {
      switch (key) {
        case 'CASH':
          return e.affectsCash;
        case 'REVENUE':
          return (
            e.creditAccount === 'SERVICE_REVENUE' ||
            e.debitAccount === 'SERVICE_REVENUE'
          );
        case 'EXPENSES':
          return (
            e.debitAccount === 'OPERATING_EXPENSE' ||
            e.debitAccount === 'SALARY_EXPENSE'
          );
        case 'PROFIT':
          return (
            e.creditAccount === 'SERVICE_REVENUE' ||
            e.debitAccount === 'OPERATING_EXPENSE' ||
            e.debitAccount === 'SALARY_EXPENSE'
          );
        case 'RECEIVABLES':
          return (
            e.debitAccount === 'ACCOUNTS_RECEIVABLE' ||
            e.creditAccount === 'ACCOUNTS_RECEIVABLE'
          );
        case 'LIABILITIES':
          return (
            e.creditAccount === 'LIABILITIES_PAYABLE' ||
            e.debitAccount === 'LIABILITIES_PAYABLE' ||
            e.creditAccount === 'MERCHANT_COD_PAYABLE' ||
            e.debitAccount === 'MERCHANT_COD_PAYABLE' ||
            e.creditAccount === 'ACCRUED_SALARIES_PAYABLE' ||
            e.debitAccount === 'ACCRUED_SALARIES_PAYABLE'
          );
        case 'SALARIES':
          return (
            e.debitAccount === 'SALARY_EXPENSE' ||
            e.creditAccount === 'SALARY_EXPENSE' ||
            e.creditAccount === 'ACCRUED_SALARIES_PAYABLE'
          );
        case 'SHIPPING_OPS':
          return e.debitAccount === 'OPERATING_EXPENSE';
      }
    });
  };

  const indicatorCards: {
    key: IndicatorKey;
    title: string;
    valuePiastres: number;
    subtitle: string;
    colorClass: string;
  }[] = [
    {
      key: 'CASH',
      title: '1. الرصيد النقدي المتاح',
      valuePiastres: metricsAll.displayedCashPiastres,
      subtitle: 'السيولة النقدية الفعلية بالخزينة',
      colorClass: 'text-emerald-400',
    },
    {
      key: 'REVENUE',
      title: '2. إيرادات الفترة',
      valuePiastres: metricsAll.earnedServiceRevenuePiastres,
      subtitle: 'إيرادات خدمات الشحن المكتسبة (بدون أمانات COD)',
      colorClass: 'text-white',
    },
    {
      key: 'EXPENSES',
      title: '3. مصروفات الفترة',
      valuePiastres: metricsAll.totalPeriodExpensesPiastres,
      subtitle: 'إجمالي مصروفات التشغيل والرواتب المستحقة',
      colorClass: 'text-rose-400',
    },
    {
      key: 'PROFIT',
      title: '4. الربح التشغيلي',
      valuePiastres: metricsAll.netOperatingProfitPiastres,
      subtitle: 'إيرادات الفترة ناقص مصروفات الفترة المستحقة',
      colorClass:
        metricsAll.netOperatingProfitPiastres >= 0
          ? 'text-emerald-400'
          : 'text-rose-400',
    },
    {
      key: 'RECEIVABLES',
      title: '5. المستحقات لدى العملاء',
      valuePiastres: metricsAll.closingReceivablesPiastres,
      subtitle: 'إيرادات آجلة مكتسبة لم تُحصل نقداً بعد',
      colorClass: 'text-amber-400',
    },
    {
      key: 'LIABILITIES',
      title: '6. الأمانات والرواتب المستحقة',
      valuePiastres: metricsAll.totalLiabilitiesAndPayablesPiastres,
      subtitle: 'أمانات التجار + الرواتب المستحقة (الديون: 0.00 ج.م)',
      colorClass: 'text-sky-400',
    },
    {
      key: 'SALARIES',
      title: '7. تكلفة الرواتب',
      valuePiastres: metricsAll.incurredSalaryExpensesPiastres,
      subtitle: 'الأجور المستحقة والمكافآت المصروفة صافية من الجزاءات',
      colorClass: 'text-amber-300',
    },
    {
      key: 'SHIPPING_OPS',
      title: '8. تكاليف الشحن والتشغيل',
      valuePiastres: metricsAll.incurredOperatingExpensesPiastres,
      subtitle: 'مصروفات مشاوير المناديب والصيانة والمستودع',
      colorClass: 'text-rose-300',
    },
  ];

  const matchingEntries = filterEntriesForIndicator(selectedIndicator);
  const selectedCard = indicatorCards.find((c) => c.key === selectedIndicator)!;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">
            المركز المالي والحسابات والتقارير اليومية
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            اضغط على أي مؤشر من المؤشرات الثمانية لعرض تفاصيله وسجل القيود المحاسبية المرتبطة به
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('MAIN_INDICATORS')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'MAIN_INDICATORS'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المؤشرات المالية (8)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('DAILY_REPORT')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'DAILY_REPORT'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            التقرير المالي اليومي
          </button>
          <button
            type="button"
            onClick={() => setSubTab('FULL_LEDGER')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'FULL_LEDGER'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            دفتر القيود الكامل ({state.ledger.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('AUDIT_TESTS');
              if (!testSuiteResult) handleRunTests();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === 'AUDIT_TESTS'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            اختبارات القبول (12)
          </button>
        </div>
      </div>

      {/* SubTab 1: The 8 Core Indicators + Click-to-Inspect Drilldown */}
      {subTab === 'MAIN_INDICATORS' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {indicatorCards.map((card) => {
              const isSelected = card.key === selectedIndicator;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setSelectedIndicator(card.key)}
                  className={`p-3.5 rounded-xl border text-right transition-colors cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      {card.title}
                    </span>
                    <span
                      className={`text-base font-bold font-mono-num mt-1.5 block ${card.colorClass}`}
                    >
                      {formatEGP(card.valuePiastres)}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 block">
                    {card.subtitle}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Drilldown Details for Selected Indicator */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-amber-400">
                  تفاصيل المؤشر وسجل العمليات المرتبطة: {selectedCard.title}
                </h3>
                <p className="text-xs text-slate-400">{selectedCard.subtitle}</p>
              </div>
              <span className="text-xs font-mono-num font-bold text-white">
                الرصيد الإجمالي: {formatEGP(selectedCard.valuePiastres)}
              </span>
            </div>

            {selectedIndicator === 'LIABILITIES' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pb-2">
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">الديون والقروض (سياسة عدم الاستدانة):</span>
                  <strong className="font-mono-num text-emerald-400">
                    0.00 ج.م
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">أمانات تحصيل التجار (COD):</span>
                  <strong className="font-mono-num text-sky-400">
                    {formatEGP(metricsAll.merchantCodLiabilityPiastres)}
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">رواتب الموظفين المستحقة:</span>
                  <strong className="font-mono-num text-amber-300">
                    {formatEGP(metricsAll.accruedSalariesPayablePiastres)}
                  </strong>
                </div>
              </div>
            )}

            {matchingEntries.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                لا توجد قيود مسجلة في هذا الحساب حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[220px]">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2 px-2.5">رقم القيد</th>
                      <th className="py-2 px-2.5">اليوم والوقت</th>
                      <th className="py-2 px-2.5">المدين</th>
                      <th className="py-2 px-2.5">الدائن</th>
                      <th className="py-2 px-2.5">المبلغ</th>
                      <th className="py-2 px-2.5">البيان والمرجع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {matchingEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-2 px-2.5 font-mono-num text-amber-400">
                          {entry.id}
                        </td>
                        <td className="py-2 px-2.5 font-mono-num text-slate-300">
                          ي{entry.day} · {entry.timeLabel || '09:00'}
                        </td>
                        <td className="py-2 px-2.5 text-slate-200">
                          {ACCOUNT_LABELS_AR[entry.debitAccount]}
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">
                          {ACCOUNT_LABELS_AR[entry.creditAccount]}
                        </td>
                        <td className="py-2 px-2.5 font-mono-num font-bold text-white">
                          {formatEGP(entry.amountPiastres)}
                        </td>
                        <td className="py-2 px-2.5 text-slate-300">
                          [{entry.referenceId}] {entry.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SubTab 2: Section 10 Daily Financial Report */}
      {subTab === 'DAILY_REPORT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <h3 className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800">
              تقرير السيولة والتدفق النقدي (اليوم {state.company.currentDay})
            </h3>
            <div className="flex justify-between">
              <span className="text-slate-400">1. الرصيد النقدي الافتتاحي:</span>
              <strong className="font-mono-num text-white">
                {formatEGP(metricsToday.openingCashPiastres)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">2. (+) المقبوضات النقدية الفعلية:</span>
              <strong className="font-mono-num text-emerald-400">
                {formatEGP(metricsToday.actualCashReceiptsPiastres)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">3. (-) المدفوعات النقدية الفعلية:</span>
              <strong className="font-mono-num text-rose-400">
                {formatEGP(metricsToday.actualCashPaymentsPiastres)}
              </strong>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
              <span className="text-slate-200">(=) الرصيد النقدي الختامي:</span>
              <span className="font-mono-num text-emerald-400">
                {formatEGP(metricsToday.computedClosingCashPiastres)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <h3 className="text-sm font-bold text-amber-400 pb-2 border-b border-slate-800">
              تقرير الأرباح والمستحقات والالتزامات (اليوم {state.company.currentDay})
            </h3>
            <div className="flex justify-between">
              <span className="text-slate-400">4. الإيرادات المكتسبة (خدمات الشحن):</span>
              <strong className="font-mono-num text-white">
                {formatEGP(metricsToday.earnedServiceRevenuePiastres)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">5. (-) المصروفات المستحقة (تشغيل + رواتب):</span>
              <strong className="font-mono-num text-rose-400">
                {formatEGP(metricsToday.totalPeriodExpensesPiastres)}
              </strong>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-200">6. (=) الربح أو الخسارة التشغيلية:</span>
              <strong
                className={`font-mono-num ${
                  metricsToday.netOperatingProfitPiastres >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {formatEGP(metricsToday.netOperatingProfitPiastres)}
              </strong>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between">
              <span className="text-slate-400">7. المستحقات غير المحصلة لدى العملاء:</span>
              <strong className="font-mono-num text-amber-400">
                {formatEGP(metricsToday.closingReceivablesPiastres)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">8. الالتزامات القادمة (ديون + أمانات + رواتب):</span>
              <strong className="font-mono-num text-sky-400">
                {formatEGP(metricsAll.totalLiabilitiesAndPayablesPiastres)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Full General Ledger */}
      {subTab === 'FULL_LEDGER' && (
        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                <th className="py-2.5 px-3">رقم القيد</th>
                <th className="py-2.5 px-3">اليوم والوقت</th>
                <th className="py-2.5 px-3">الحساب المدين</th>
                <th className="py-2.5 px-3">الحساب الدائن</th>
                <th className="py-2.5 px-3">المبلغ</th>
                <th className="py-2.5 px-3">الأثر على النقد</th>
                <th className="py-2.5 px-3">المرجع والبيان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {state.ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-mono-num text-amber-400">
                    {entry.id}
                  </td>
                  <td className="py-2 px-3 font-mono-num">
                    ي{entry.day} · {entry.timeLabel || '09:00'}
                  </td>
                  <td className="py-2 px-3 text-slate-200">
                    {ACCOUNT_LABELS_AR[entry.debitAccount]}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {ACCOUNT_LABELS_AR[entry.creditAccount]}
                  </td>
                  <td className="py-2 px-3 font-mono-num font-bold text-white">
                    {formatEGP(entry.amountPiastres)}
                  </td>
                  <td
                    className={`py-2 px-3 font-mono-num font-semibold ${
                      entry.cashDeltaPiastres > 0
                        ? 'text-emerald-400'
                        : entry.cashDeltaPiastres < 0
                          ? 'text-rose-400'
                          : 'text-slate-500'
                    }`}
                  >
                    {entry.cashDeltaPiastres > 0
                      ? `تحصيل +${formatEGP(entry.cashDeltaPiastres)}`
                      : entry.cashDeltaPiastres < 0
                        ? `صرف ${formatEGP(Math.abs(entry.cashDeltaPiastres))}`
                        : '0.00 ج.م (قيد استحقاق)'}
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    [{entry.referenceId}] {entry.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SubTab 4: Automated Acceptance Tests */}
      {subTab === 'AUDIT_TESTS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <span>
              اختبارات القبول والتكامل اللوجستي والمالي (تعمل في بيئة معزولة دون تغيير تقدمك):
            </span>
            <button
              type="button"
              onClick={handleRunTests}
              className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer whitespace-nowrap"
            >
              إعادة تشغيل الاختبارات
            </button>
          </div>

          {testSuiteResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1">
              {testSuiteResult.results.map((r) => (
                <div
                  key={r.testNumber}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {r.testNumber}. {r.name}
                    </span>
                    <span
                      className={`font-bold ${
                        r.passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {r.passed ? 'ناجح' : 'فشل'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{r.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
