import React, { useEffect, useState } from 'react';
import { formatEGP } from '../engine/financeEngine';
import { SponsoredAdGateConfig } from '../services/firebaseService';
import { DaySummaryReport } from '../types/game';

interface DayEndReportModalProps {
  report: DaySummaryReport;
  isOnline?: boolean;
  sponsoredAdConfig?: SponsoredAdGateConfig;
  onStartNextDay: () => void;
}

export const DayEndReportModal: React.FC<DayEndReportModalProps> = ({
  report,
  isOnline = true,
  sponsoredAdConfig,
  onStartNextDay,
}) => {
  const [adStage, setAdStage] = useState<'IDLE' | 'WATCHING' | 'COMPLETED'>(
    'IDLE'
  );
  const totalAdSeconds = Math.max(
    3,
    Math.min(15, sponsoredAdConfig?.countdownSeconds ?? 5)
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(totalAdSeconds);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  useEffect(() => {
    if (adStage !== 'WATCHING') return;
    if (secondsLeft <= 0) {
      setAdStage('COMPLETED');
      return;
    }
    const timer = window.setTimeout(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [adStage, secondsLeft]);

  const handleRequestNextDay = () => {
    const currentlyOnline =
      isOnline && (typeof navigator === 'undefined' || navigator.onLine !== false);
    if (!currentlyOnline) {
      setOfflineError(
        'تنبيه: لا يوجد اتصال بالإنترنت حالياً! يمكنك اللعب أوفلاين على جهازك طوال اليوم، ولكن يشترط الاتصال بالإنترنت للانتقال إلى اليوم الجديد وحفظ التقدم على حسابك.'
      );
      return;
    }
    setOfflineError(null);

    if (sponsoredAdConfig?.enabled === false) {
      onStartNextDay();
      return;
    }

    setSecondsLeft(totalAdSeconds);
    setAdStage('WATCHING');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              التقرير المالي والتشغيلي لنهاية اليوم {report.day}
            </h2>
            <p className="text-xs text-slate-400">
              إغلاق الخزينة ومطابقة الإيرادات المكتسبة والمصروفات وحركة الشحنات (بدون ديون أو أرقام سالبة)
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span
              className={`px-2.5 py-1 rounded font-semibold ${
                isOnline
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800'
              }`}
            >
              {isOnline
                ? '● متصل بالإنترنت (جاهز لحفظ اليوم الجديد)'
                : '○ وضع أوفلاين (يلزم إنترنت لليوم الجديد)'}
            </span>
            <span className="font-semibold text-amber-400">
              سمعة الشركة: {report.reputationEnd} / 100
            </span>
          </div>
        </div>

        {adStage !== 'IDLE' ? (
          <div className="p-6 space-y-5 text-center">
            <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-4">
              <div className="flex items-center justify-between text-xs text-amber-400 border-b border-slate-800 pb-2.5">
                <span className="font-bold">
                  🎬 إعلان ممول للانتقال إلى اليوم {report.day + 1}
                </span>
                <span className="font-mono-num">
                  {adStage === 'WATCHING'
                    ? `متبقي ${secondsLeft} ثوانٍ...`
                    : '✓ اكتملت المشاهدة'}
                </span>
              </div>

              {/* Simulated Sponsored Video Canvas */}
              <div className="relative h-44 rounded-xl bg-gradient-to-br from-slate-900 via-slate-950 to-amber-950/40 border border-slate-800 flex flex-col items-center justify-center p-4 overflow-hidden">
                <div className="text-xs font-bold text-amber-400 mb-1">
                  {sponsoredAdConfig?.sponsorTitleAr ||
                    'رعاية شركاء اللوجستيات والوقود — انجوبيا اكسبريس'}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 max-w-md leading-relaxed">
                  {sponsoredAdConfig?.adMessageAr ||
                    'وقود نظيف وصيانة دورية لأسطولك يضمنان توصيل شحناتك في موعدها ومضاعفة أرباح شركتك كل يوم!'}
                </p>
                <div className="mt-4 w-full max-w-xs h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-700"
                    style={{
                      width: `${Math.round(
                        ((totalAdSeconds - secondsLeft) / totalAdSeconds) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-2">
                  جاري مزامنة وحفظ تقدم اليوم {report.day} على حسابك السحابي...
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                {adStage === 'COMPLETED' ? (
                  <button
                    type="button"
                    onClick={onStartNextDay}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                  >
                    ✓ تم الحفظ — بدء العمل في اليوم {report.day + 1} الآن
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs sm:text-sm cursor-not-allowed"
                  >
                    يرجى الانتظار ({secondsLeft} ث)...
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Financial Breakdown (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h3 className="font-bold text-amber-400 mb-1">
                  أولاً: قائمة الدخل التشغيلي (اليوم {report.day})
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">إيرادات خدمات الشحن المكتسبة:</span>
                  <span className="font-mono-num font-bold text-white">
                    {formatEGP(Math.max(0, report.earnedRevenuePiastres))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    (-) مصروفات التشغيل والوقود والصيانة والبدلات اليومية:
                  </span>
                  <span className="font-mono-num font-bold text-amber-300">
                    {formatEGP(Math.max(0, report.operatingExpensesPiastres))}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-slate-200">(=) صافي الفائض التشغيلي لليوم:</span>
                  <span className="font-mono-num text-emerald-400">
                    {formatEGP(Math.max(0, report.netOperatingProfitPiastres))}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <h3 className="font-bold text-amber-400 mb-1">
                  ثانياً: حركة السيولة النقدية بالخزينة
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">الرصيد النقدي الافتتاحي لليوم:</span>
                  <span className="font-mono-num text-white">
                    {formatEGP(Math.max(0, report.openingCashPiastres))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    (+) إجمالي المقبوضات النقدية الفعلية (شامل أمانات COD المحصلة):
                  </span>
                  <span className="font-mono-num text-emerald-400">
                    {formatEGP(Math.max(0, report.cashReceiptsPiastres))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">(-) إجمالي المدفوعات النقدية الفعلية:</span>
                  <span className="font-mono-num text-amber-300">
                    {formatEGP(Math.max(0, report.cashPaymentsPiastres))}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-slate-200">(=) الرصيد النقدي الختامي بالخزينة:</span>
                  <span className="font-mono-num text-emerald-400">
                    {formatEGP(Math.max(0, report.closingCashPiastres))}
                  </span>
                </div>
              </div>
            </div>

            {/* Operational & Balances Summary (5 cols) */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
                <h3 className="font-bold text-amber-400">
                  ثالثاً: الأرصدة الختامية وحركة الشحنات
                </h3>
                <div className="flex justify-between">
                  <span className="text-slate-400">شحنات تم تسليمها بنجاح:</span>
                  <strong className="font-mono-num text-emerald-400">
                    {report.shipmentsDelivered}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">شحنات متعذرة / مرتجعة:</span>
                  <strong className="font-mono-num text-rose-400">
                    {report.shipmentsFailedOrReturned}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">طلبات تم الاعتذار عنها:</span>
                  <strong className="font-mono-num text-slate-300">
                    {report.shipmentsRejected}
                  </strong>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between">
                  <span className="text-slate-400">مستحقات آجلة لدى العملاء:</span>
                  <strong className="font-mono-num text-amber-400">
                    {formatEGP(Math.max(0, report.closingReceivablesPiastres))}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">أمانات تحصيل التجار بالخزينة:</span>
                  <strong className="font-mono-num text-sky-400">
                    {formatEGP(Math.max(0, report.closingCodPayablesPiastres))}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">الديون البنكية / القروض:</span>
                  <strong className="font-mono-num text-emerald-400">
                    0.00 ج.م (ممنوع الاستدانة)
                  </strong>
                </div>
              </div>

              {report.notes.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                  <span className="font-bold text-slate-300 block">ملاحظات المحاسب:</span>
                  {report.notes.map((n, i) => (
                    <p key={i} className="text-slate-400 leading-relaxed">
                      • {n}
                    </p>
                  ))}
                </div>
              )}

              {offlineError && (
                <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-700 text-rose-200 text-xs leading-relaxed">
                  {offlineError}
                </div>
              )}

              <button
                type="button"
                onClick={handleRequestNextDay}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                {sponsoredAdConfig?.enabled !== false
                  ? `مشاهدة إعلان اليوم الجديد وحفظ التقدم لليوم ${report.day + 1}`
                  : `حفظ التقدم والانتقال إلى اليوم ${report.day + 1}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

