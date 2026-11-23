import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileWarning,
  Landmark,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { formatEGP } from '../engine/financeEngine';
import { createInitialCompanyDebts } from '../engine/storyEngine';
import { CompanyDebtItem, GameState } from '../types/game';

interface DebtsPanelProps {
  state: GameState;
  onPayDebt: (debtId: string, customAmountPiastres?: number) => void;
  onNavigateToSection?: (section: string) => void;
}

export const DebtsPanel: React.FC<DebtsPanelProps> = ({
  state,
  onPayDebt,
  onNavigateToSection,
}) => {
  const debts: CompanyDebtItem[] = state.debts || createInitialCompanyDebts();
  const [partialInputsEgp, setPartialInputsEgp] = useState<Record<string, number>>({});

  const totalOriginalPiastres = debts.reduce(
    (s, d) => s + d.originalAmountPiastres,
    0
  );
  const totalPaidPiastres = debts.reduce((s, d) => s + d.paidAmountPiastres, 0);
  const totalRemainingPiastres = debts.reduce(
    (s, d) => s + d.remainingAmountPiastres,
    0
  );
  const paidCount = debts.filter((d) => d.status === 'PAID').length;
  const topThreePaid = paidCount >= 3;

  const getCategoryIcon = (cat: CompanyDebtItem['category']) => {
    switch (cat) {
      case 'ELECTRICITY':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'TAXES':
        return <Landmark className="w-4 h-4 text-sky-400" />;
      case 'RENT':
        return <Building2 className="w-4 h-4 text-indigo-400" />;
      default:
        return <Wallet className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Financial Summary */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                إدارة الديون والالتزامات المالية المستحقة
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  تذكير السكرتير كل 8 ساعات
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                تبدأ الشركة برأسمال نقدي 13,000.00 ج.م وعليها التزامات تأسيسية بقيمة 5,000.00 ج.م موزعة على 4 جهات دائنة.
              </p>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-black flex items-center gap-1.5 ${
              topThreePaid
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}
          >
            {topThreePaid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>تم سداد أهم {paidCount} التزامات بنجاح — جاهز للحملة التدريبية (6,000 ج.م)!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>المرحلة التعليمية: سدد أهم 3 التزامات ({paidCount} / 3 مسدد)</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">السيولة النقدية المتاحة</div>
            <div className="text-sm font-black text-emerald-400 mt-0.5">
              {formatEGP(state.company.cashPiastres)}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">إجمالي الديون الأصلية</div>
            <div className="text-sm font-black text-slate-200 mt-0.5">
              {formatEGP(totalOriginalPiastres)}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">المسدد حتى الآن</div>
            <div className="text-sm font-black text-sky-400 mt-0.5">
              {formatEGP(totalPaidPiastres)}
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">الرصيد المتبقي للديون</div>
            <div
              className={`text-sm font-black mt-0.5 ${
                totalRemainingPiastres > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatEGP(totalRemainingPiastres)}
            </div>
          </div>
        </div>

        {topThreePaid && onNavigateToSection && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-emerald-300 font-bold">
              أحسنت! بعد سداد أهم 3 التزامات، الخطوة التالية هي إطلاق الحملة التسويقية التدريبية بقيمة 6,000 جنيه.
            </span>
            <button
              onClick={() => onNavigateToSection('MARKETING')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer"
            >
              انتقل إلى التسويق لإطلاق حملة الـ 6,000 ج.م ←
            </button>
          </div>
        )}
      </div>

      {/* Debt Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {debts.map((debt) => {
          const isPaid = debt.status === 'PAID' || debt.remainingAmountPiastres <= 0;
          const isTopThree = debt.priorityOrder <= 3;
          const canAffordFull =
            state.company.cashPiastres >= debt.remainingAmountPiastres;
          const defaultPartialEgp = Math.max(
            100,
            Math.round(debt.remainingAmountPiastres / 200)
          );
          const partialEgp =
            partialInputsEgp[debt.id] !== undefined
              ? partialInputsEgp[debt.id]
              : defaultPartialEgp;

          return (
            <div
              key={debt.id}
              className={`rounded-xl border p-3.5 transition ${
                isPaid
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : isTopThree
                    ? 'bg-slate-900/95 border-amber-500/40'
                    : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                    {getCategoryIcon(debt.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-black text-white">{debt.titleAr}</h3>
                      {isTopThree && !isPaid && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          أولوية تعليمية #{debt.priorityOrder}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      الجهة الدائنة: <span className="text-slate-200 font-bold">{debt.creditorNameAr}</span>
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded border shrink-0 ${
                    isPaid
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : debt.status === 'PARTIAL'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isPaid
                    ? 'مسدد بالكامل ✓'
                    : debt.status === 'PARTIAL'
                      ? 'سداد جزئي'
                      : 'غير مسدد'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 mb-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">المبلغ الأصلي</span>
                  <span className="font-bold text-slate-200">
                    {formatEGP(debt.originalAmountPiastres)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">المسدد</span>
                  <span className="font-bold text-emerald-400">
                    {formatEGP(debt.paidAmountPiastres)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">المتبقي</span>
                  <span
                    className={`font-black ${
                      isPaid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatEGP(debt.remainingAmountPiastres)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] mb-3">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    موعد الاستحقاق: <strong className="text-white">{debt.dueTimeLabel}</strong>
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-rose-300/90">
                  <FileWarning className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>غرامة التأخير: {debt.latePenaltyDescriptionAr}</span>
                </div>
                <div className="flex items-start gap-1.5 text-amber-300/90">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>الأثر التشغيلي لعدم السداد: {debt.impactIfUnpaidAr}</span>
                </div>
              </div>

              {isPaid ? (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    تم إقفال هذا الالتزام في اليوم {debt.paidAtDay || state.company.currentDay}{' '}
                    ({debt.paidAtTimeLabel || '09:00'}).
                  </span>
                </div>
              ) : (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onPayDebt(debt.id)}
                    disabled={!canAffordFull}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      canAffordFull
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      سداد الالتزام بالكامل ({formatEGP(debt.remainingAmountPiastres)})
                    </span>
                  </button>

                  {debt.remainingAmountPiastres >= 20000 && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={100}
                        max={Math.floor(debt.remainingAmountPiastres / 100)}
                        step={100}
                        value={partialEgp}
                        onChange={(e) =>
                          setPartialInputsEgp((prev) => ({
                            ...prev,
                            [debt.id]: Number(e.target.value) || 100,
                          }))
                        }
                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold"
                      />
                      <button
                        onClick={() => onPayDebt(debt.id, partialEgp * 100)}
                        disabled={state.company.cashPiastres < partialEgp * 100}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition cursor-pointer disabled:opacity-40"
                      >
                        سداد دفعة جزئية ({partialEgp} ج.م)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
