import React, { useState } from 'react';
import { getAccountantCapacityStatus } from '../engine/accountingEngine';
import { egpToPiastres, formatEGP } from '../engine/financeEngine';
import { MARKETING_PACKAGE_TIERS } from '../engine/marketingEngine';
import { getWarehouseUtilizationMetrics } from '../engine/shipmentEngine';
import { GameState } from '../types/game';

interface MarketingPanelProps {
  state: GameState;
  onLaunchCampaign: (
    tierId: string,
    customBudgetEgp: number,
    enableDailyAutoRepeat?: boolean
  ) => void;
  onToggleDailyRepeat?: (campaignId: string) => void;
  onSelectShipment: (trackingNumber: string) => void;
}

export const MarketingPanel: React.FC<MarketingPanelProps> = ({
  state,
  onLaunchCampaign,
  onToggleDailyRepeat,
  onSelectShipment,
}) => {
  const marketing = state.marketing || {
    marketingLevel: 1,
    totalCampaignSpendPiastres: 0,
    campaigns: [],
    deadlineTasks: [],
  };

  const [selectedBudgets, setSelectedBudgets] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const tier of MARKETING_PACKAGE_TIERS) {
      map[tier.id] = tier.defaultBudgetEgp;
    }
    return map;
  });

  const [autoRepeatByTier, setAutoRepeatByTier] = useState<Record<string, boolean>>({});

  const whMetrics = getWarehouseUtilizationMetrics(state);
  const accCap = getAccountantCapacityStatus(state);
  const activeAutoRepeatCount = marketing.campaigns.filter((c) => c.dailyAutoRepeat).length;

  return (
    <div className="space-y-4">
      {/* Training Banner for 6,000 EGP Campaign */}
      {!state.onboardingMastery?.appliedSystems?.launchedTrainingCampaign6000 && (
        <div className="bg-amber-950/35 border border-amber-500/45 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black text-amber-300">
              🎯 توجيه المرحلة التعليمية: إطلاق الحملة الإعلانية التدريبية (6,000 ج.م)
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              بعد سداد أهم 3 التزامات وتعيين الموظفين، أطلق باقة <strong>«حملة إعلانية تدريبية / إقليمية مكثفة (6,000 ج.م)»</strong> لجلب تدفق طلبات قوي ومتوازن يغطي مصاريف التشغيل ويحقق ربحاً سريعاً.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedBudgets((prev) => ({ ...prev, 'MKT-TIER-4': 6000 }));
              onLaunchCampaign('MKT-TIER-4', 6000, false);
            }}
            disabled={state.company.cashPiastres < egpToPiastres(6000)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs cursor-pointer shrink-0"
          >
            إطلاق حملة 6,000 ج.م التدريبية الآن
          </button>
        </div>
      )}

      {/* Top Marketing Header & Conversion Factors */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              قسم التسويق واستقطاب التجار والطلبيات — انجوبيا اكسبريس
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              اختر الباقة التسويقية المناسبة للسيولة وسعة المستودع والمحاسبين. تتناسب النتائج طردياً مع حجم الميزانية، ثقة ملف الشركة، ومستوى المنافسة، مع إمكانية تفعيل التكرار اليومي التلقائي.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 block">مستوى التسويق</span>
              <strong className="font-mono-num text-amber-400 text-sm">
                المستوى {marketing.marketingLevel} / 5
              </strong>
            </div>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block">إجمالي الإنفاق التسويقي</span>
              <strong className="font-mono-num text-white text-sm">
                {formatEGP(marketing.totalCampaignSpendPiastres)}
              </strong>
            </div>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block">التكرار اليومي النشط</span>
              <strong className="font-mono-num text-indigo-400 text-sm">
                {activeAutoRepeatCount} حملة
              </strong>
            </div>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block">طاقة المحاسب اليومية</span>
              <strong
                className={`font-mono-num text-sm ${
                  accCap.remainingCapacityToday > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {accCap.remainingCapacityToday} / {accCap.totalDailyCapacity} متاح
              </strong>
            </div>
          </div>
        </div>

        {/* Live Conversion Modifiers Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">السمعة وتأثيرها في التحويل</span>
            <strong className="text-white font-mono-num mt-0.5 block">
              {state.company.reputation}/100 ({state.company.reputation >= 70 ? '+عائد مرتفع' : 'قياسي'})
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">رضا العملاء الحالي</span>
            <strong className="text-emerald-400 font-mono-num mt-0.5 block">
              {state.company.customerSatisfaction}%
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">إشغال المستودع (حجم / وزن)</span>
            <strong
              className={`font-mono-num mt-0.5 block ${
                whMetrics.statusTone === 'OVERLOADED'
                  ? 'text-rose-400'
                  : whMetrics.statusTone === 'NEARING_LIMIT'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {whMetrics.insideShipmentsCount}/{whMetrics.maxCapacity} طرود ({whMetrics.utilizationPercent}%)
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">السيولة النقدية المتاحة</span>
            <strong className="text-amber-400 font-mono-num mt-0.5 block">
              {formatEGP(state.company.cashPiastres)}
            </strong>
          </div>
        </div>
      </div>

      {/* 5 Marketing Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {MARKETING_PACKAGE_TIERS.map((tier) => {
          const budgetEgp = selectedBudgets[tier.id] ?? tier.defaultBudgetEgp;
          const costPiastres = egpToPiastres(budgetEgp);
          const canAfford = state.company.cashPiastres >= costPiastres;
          const isTrainingTier = tier.id === 'MKT-TIER-4';
          const autoRepeatEnabled = Boolean(autoRepeatByTier[tier.id]);

          return (
            <div
              key={tier.id}
              className={`p-4 rounded-xl bg-slate-900 border flex flex-col justify-between gap-3 text-xs ${
                isTrainingTier
                  ? 'border-amber-500/60 shadow-lg shadow-amber-500/5'
                  : 'border-slate-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold text-[11px]">
                    {isTrainingTier ? '⭐ موصى بها (6,000 ج.م)' : `باقة مستوى ${tier.levelRequired}`}
                  </span>
                  <span className="font-mono-num text-slate-400 text-[11px]">
                    {tier.minBudgetEgp.toLocaleString('en-US')} –{' '}
                    {tier.id === 'MKT-TIER-5'
                      ? '10,000+'
                      : tier.maxBudgetEgp.toLocaleString('en-US')}{' '}
                    ج.م
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{tier.titleAr}</h3>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {tier.descriptionAr}
                </p>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">عملاء جدد متوقعون:</span>
                    <strong className="font-mono-num text-emerald-400">
                      +{tier.expectedNewClientsMin} إلى +{tier.expectedNewClientsMax} عميل
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">طلبات شحن فورية:</span>
                    <strong className="font-mono-num text-amber-300">
                      +{tier.expectedNewShipmentsMin} إلى +{tier.expectedNewShipmentsMax} شحنات
                    </strong>
                  </div>
                </div>

                {/* Budget Slider within Tier Range */}
                <div className="pt-1 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">ميزانية الحملة المختارة:</span>
                    <strong className="font-mono-num text-white">
                      {budgetEgp.toLocaleString('en-US')}.00 ج.م
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={tier.minBudgetEgp}
                    max={tier.maxBudgetEgp}
                    step={100}
                    value={budgetEgp}
                    onChange={(e) =>
                      setSelectedBudgets((prev) => ({
                        ...prev,
                        [tier.id]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Optional Daily Auto-Repeat Checkbox */}
                <label className="flex items-center gap-2 pt-1 text-[11px] text-indigo-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRepeatEnabled}
                    onChange={(e) =>
                      setAutoRepeatByTier((prev) => ({
                        ...prev,
                        [tier.id]: e.target.checked,
                      }))
                    }
                    className="accent-indigo-500 rounded cursor-pointer"
                  />
                  <span>تكرار الحملة يومياً تلقائياً</span>
                </label>
              </div>

              <button
                type="button"
                disabled={!canAfford}
                onClick={() => onLaunchCampaign(tier.id, budgetEgp, autoRepeatEnabled)}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                {canAfford
                  ? `إطلاق الحملة (${budgetEgp.toLocaleString('en-US')} ج.م)`
                  : 'السيولة النقدية غير كافية'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Split: Marketing Deadline Tasks + Campaign History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daily & Weekly Marketing Deadline Tasks (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-800">
            المهام والأهداف التسويقية المرتبطة بمهلة زمنية ({marketing.deadlineTasks.length})
          </h3>

          {marketing.deadlineTasks.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              لم يتم إطلاق حملات تسويقية بعد. عند إطلاق أي حملة ستظهر مهام التسليم اليومية والأسبوعية هنا.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {marketing.deadlineTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.scope === 'DAILY'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-purple-500/20 text-purple-300'
                        }`}
                      >
                        {task.scope === 'DAILY' ? 'هدف يومي' : 'هدف أسبوعي'}
                      </span>
                      <strong className="text-white">{task.titleAr}</strong>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      الموعد النهائي: <span className="text-amber-300">{task.deadlineLabelAr}</span> · الإنجاز:{' '}
                      <strong className="font-mono-num text-white">
                        {task.completedShipmentsCount} / {task.targetShipmentsCount}
                      </strong>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded font-bold text-[11px] whitespace-nowrap ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : task.status === 'EXPIRED'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {task.status === 'COMPLETED'
                      ? `مكتمل (+${task.rewardReputationDelta} سمعة)`
                      : task.status === 'EXPIRED'
                        ? 'انتهت المهلة'
                        : 'قيد التنفيذ'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign History & Generated Shipments (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-800">
            سجل الحملات التسويقية وإدارة التكرار اليومي ({marketing.campaigns.length})
          </h3>

          {marketing.campaigns.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              لا توجد حملات سابقة في السجل.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {marketing.campaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <strong className="text-amber-400">
                        {camp.tierTitleAr} — اليوم {camp.launchedAtDay} ({camp.launchedAtTimeLabel})
                      </strong>
                      {camp.dailyAutoRepeat && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold">
                          تكرار يومي نشط ({camp.autoRepeatRunsCount || 1} يوم)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {onToggleDailyRepeat && (
                        <button
                          type="button"
                          onClick={() => onToggleDailyRepeat(camp.id)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                            camp.dailyAutoRepeat
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                              : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/25'
                          }`}
                        >
                          {camp.dailyAutoRepeat ? 'إيقاف التكرار اليومي' : 'تفعيل التكرار اليومي'}
                        </button>
                      )}
                      <span className="font-mono-num font-bold text-rose-300">
                        -{formatEGP(camp.budgetSpentPiastres)}/يوم
                      </span>
                    </div>
                  </div>
                  <div className="text-slate-300 text-[11px] flex flex-wrap items-center justify-between gap-2">
                    <span>
                      النتيجة: استقطاب <strong>{camp.generatedClientsCount}</strong> عملاء جدد و{' '}
                      <strong>{camp.generatedShipmentsCount}</strong> طلبات شحن جديدة.
                    </span>
                    <span className="text-slate-400">
                      إجمالي الإنفاق التراكمي:{' '}
                      <strong className="text-amber-300 font-mono-num">
                        {formatEGP(camp.cumulativeAutoSpendPiastres || camp.budgetSpentPiastres)}
                      </strong>
                    </span>
                  </div>
                  {camp.generatedTrackingNumbers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {camp.generatedTrackingNumbers.map((trk) => (
                        <button
                          key={trk}
                          type="button"
                          onClick={() => onSelectShipment(trk)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono-num text-[11px] cursor-pointer"
                        >
                          {trk}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

