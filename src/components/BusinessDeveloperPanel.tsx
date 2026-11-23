import React, { useMemo, useState } from 'react';
import {
  BUSINESS_DEVELOPER_PLATFORMS,
  CAIRO_GIZA_ZONES,
  CONTRACT_MARKETING_CATALOG,
  OPERATIONS_UPGRADE_CATALOG,
  PlatformContractId,
  SmartDispatchPolicy,
  VEHICLE_STORE_CATALOG,
  VehicleCatalogId,
} from '../config/businessDeveloperConfig';
import {
  checkVehicleCapacityFit,
  evaluatePlatformContractReadiness,
  formatVolumeAndDimensions,
  formatWeightGramsAndKg,
  getVehicleCapacityLimits,
  resolveCourierEffectiveVehicle,
} from '../engine/businessDeveloperEngine';
import { formatEGP } from '../engine/financeEngine';
import { inspectAndNotifySecretary } from '../engine/guideAndSecretaryEngine';
import {
  calculateWakkelnyOrderTimingBreakdown,
  configureWakkelnyHubAndZoneCouriers,
  DEFAULT_WAKKELNY_LAUNCH_HUB,
  dispatchWakkelnyOrderWithZoneSimulation,
} from '../engine/wakkelnySimulationEngine';
import { GameState } from '../types/game';

interface BusinessDeveloperPanelProps {
  state: GameState;
  onUpdateState?: (
    updater: (prev: GameState) => GameState,
    bannerMsg?: string
  ) => void;
  onSignContract: (platformId: PlatformContractId) => void;
  onGeneratePlatformOrders: (platformId: PlatformContractId) => void;
  onDispatchIndependent: (orderId: string, courierId: string) => void;
  onDispatchBatch: (orderIds: string[], courierId: string) => void;
  onRunSmartAutoDispatch: (policy: SmartDispatchPolicy) => void;
  onBuyOrLeaseVehicle: (
    catalogId: VehicleCatalogId,
    mode: 'BUY' | 'LEASE'
  ) => void;
  onAssignVehicleToCourier: (vehicleId: string, courierId: string) => void;
  onUnassignVehicle: (vehicleId: string) => void;
  onSellOwnedVehicle: (vehicleId: string) => void;
  onTerminateLeaseVehicle: (vehicleId: string) => void;
  onRepairVehicle: (vehicleId: string, mode: 'FULL' | 'QUICK') => void;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onLaunchContractCampaign: (campaignCatalogId: string) => void;
  onInjectPartnerCapital: (amountEgp: number) => void;
}

type BDSubTab =
  | 'CONTRACTS'
  | 'DISPATCH_CENTER'
  | 'INTERACTIVE_MAP'
  | 'FLEET_STORE'
  | 'UPGRADES_AND_ANALYTICS';

const SECTOR_LABELS_AR: Record<string, string> = {
  EAST: 'شرق القاهرة (مدينة نصر / مصر الجديدة / التجمع)',
  WEST: 'غرب القاهرة والجيزة (الدقي / المهندسين)',
  CENTRAL: 'وسط القاهرة (وسط البلد / الزمالك)',
  NORTH: 'شمال القاهرة (شبرا مصر)',
  SOUTH: 'جنوب القاهرة (المعادي)',
};

const POLICY_LABELS_AR: Record<SmartDispatchPolicy, string> = {
  BALANCED: 'الوضع المتوازن (أفضل معادلة بين الربح والوقت)',
  FASTEST: 'الأسرع (أولوية قصوى لسرعة الوصول وتقييم SLA)',
  LOWEST_COST: 'الأقل تكلفة (تجميع المسارات لتقليل استهلاك الوقود)',
  URGENT_FIRST: 'الأولوية للطلبات العاجلة (تقديم الوجبات الساخنة والذروة)',
  MAX_WAIT_TIME: 'الحد الأقصى لوقت الانتظار (تجميع آمن ضمن نافذة العميل)',
};

export const BusinessDeveloperPanel: React.FC<BusinessDeveloperPanelProps> = ({
  state,
  onUpdateState,
  onSignContract,
  onGeneratePlatformOrders,
  onDispatchIndependent,
  onDispatchBatch,
  onRunSmartAutoDispatch,
  onBuyOrLeaseVehicle,
  onAssignVehicleToCourier,
  onUnassignVehicle,
  onSellOwnedVehicle,
  onTerminateLeaseVehicle,
  onRepairVehicle,
  onPurchaseUpgrade,
  onLaunchContractCampaign,
  onInjectPartnerCapital,
}) => {
  const [subTab, setSubTab] = useState<BDSubTab>('CONTRACTS');
  const [selectedCourierByOrder, setSelectedCourierByOrder] = useState<
    Record<string, string>
  >({});
  const [allowExceptionalByOrder, setAllowExceptionalByOrder] = useState<
    Record<string, boolean>
  >({});
  const [launchHubInput, setLaunchHubInput] = useState<string>(
    state.businessDeveloper?.wakkelnyLaunchHubAr || DEFAULT_WAKKELNY_LAUNCH_HUB
  );
  const [wakkelnyFeedback, setWakkelnyFeedback] = useState<string | null>(null);
  const [selectedBatchOrderIds, setSelectedBatchOrderIds] = useState<string[]>(
    []
  );
  const [selectedBatchCourierId, setSelectedBatchCourierId] =
    useState<string>('');
  const [selectedPolicy, setSelectedPolicy] = useState<SmartDispatchPolicy>(
    state.businessDeveloper?.smartDispatchPolicy || 'BALANCED'
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string>('ZONE-NASR');
  const [selectedCourierForVehicle, setSelectedCourierForVehicle] = useState<
    Record<string, string>
  >({});
  const [confirmingContractId, setConfirmingContractId] =
    useState<PlatformContractId | null>(null);
  const [claimedExpansionRoundUI, setClaimedExpansionRoundUI] = useState(false);

  const bd = state.businessDeveloper;
  const currentDay = state.company.currentDay;
  const isUnlocked = currentDay >= 3 && Boolean(bd?.isUnlocked);

  const hasClaimedPartnerRound =
    claimedExpansionRoundUI ||
    state.ledger.some((e) => e.id.startsWith('LED-PARTNER-CAP-'));

  const platformOrders = bd?.platformOrders || [];
  const waitingOrders = useMemo(
    () => platformOrders.filter((o) => o.status === 'WAITING_DISPATCH'),
    [platformOrders]
  );
  const inTransitOrders = useMemo(
    () =>
      platformOrders.filter(
        (o) =>
          o.status === 'PICKED_UP_IN_TRANSIT' ||
          o.status === 'PREPARING_AT_PARTNER'
      ),
    [platformOrders]
  );
  const completedOrders = useMemo(
    () =>
      platformOrders.filter(
        (o) =>
          o.status === 'DELIVERED' ||
          o.status === 'DELAYED_DELIVERED' ||
          o.status === 'FAILED_OR_CANCELLED'
      ),
    [platformOrders]
  );

  const selectedBatchOrders = useMemo(
    () => waitingOrders.filter((o) => selectedBatchOrderIds.includes(o.id)),
    [waitingOrders, selectedBatchOrderIds]
  );

  const batchTotalWeightGrams = useMemo(
    () => selectedBatchOrders.reduce((s, o) => s + o.weightGrams, 0),
    [selectedBatchOrders]
  );
  const batchTotalVolumeCm3 = useMemo(
    () => selectedBatchOrders.reduce((s, o) => s + o.volumeCm3, 0),
    [selectedBatchOrders]
  );

  const toggleBatchOrderSelection = (orderId: string) => {
    setSelectedBatchOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  };

  const activeCouriers = state.couriers.filter(
    (c) => c.status !== 'UNAVAILABLE'
  );

  return (
    <div className="space-y-4">
      {/* Top Executive Header */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                BUSINESS DEVELOPER — إدارة تطوير الأعمال والعقود المؤسسية (B2B)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                  isUnlocked
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {isUnlocked
                  ? 'مفتوح ونشط (اليوم 3+)'
                  : `يفتح تلقائياً في اليوم 3 (أنت الآن في اليوم ${currentDay})`}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1">
              إدارة العقود والشراكات («وكلني» و«زورو» والشركات) • متجر المركبات • التجميع الذكي بالجرام والـ سم³
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              المسؤول عن إبرام وإدارة جميع العقود التجارية للشركة. تنبيه تعاقدي: رسوم جدية التعاقد غير مستردة في حال فسخ العقد نتيجة تكرار الشكاوى أو كسر نسبة الالتزام بـ SLA بعد الإنذار.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">
                متابعو المنصة الرقمية
              </span>
              <span className="font-mono-num font-bold text-sky-400">
                {(bd?.followersCount || 420).toLocaleString('en-US')} متابع
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-slate-400 block text-[10px]">
                السيولة المتاحة بالخزينة
              </span>
              <span className="font-mono-num font-bold text-emerald-400">
                {formatEGP(state.company.cashPiastres)}
              </span>
            </div>
            {isUnlocked && !hasClaimedPartnerRound && (
              <button
                type="button"
                onClick={() => {
                  setClaimedExpansionRoundUI(true);
                  onInjectPartnerCapital(23000);
                }}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer transition"
                title="صرف دفعة تمويل التوسع الرأسمالي المعتمد لمرة واحدة في اليوم الثالث لتغطية عقود التوسع (بدون ديون)"
              >
                اعتماد تمويل توسع العقود لمرة واحدة (+23,000 ج.م)
              </button>
            )}
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-slate-800/80">
          {(
            [
              {
                id: 'CONTRACTS',
                label: '1. عقود المنصات (وكلني & زورو)',
                badge:
                  (bd?.contracts.WAKKELNY.signed ? 1 : 0) +
                  (bd?.contracts.ZORO.signed ? 1 : 0) +
                  '/2',
              },
              {
                id: 'DISPATCH_CENTER',
                label: '2. مركز التوزيع (مستقل / مجمع / ذكي)',
                badge: waitingOrders.length,
              },
              {
                id: 'INTERACTIVE_MAP',
                label: '3. خريطة التوصيل والمسارات',
                badge: inTransitOrders.length,
              },
              {
                id: 'FLEET_STORE',
                label: '4. متجر المركبات وإدارة الأسطول (5 فئات)',
                badge: state.vehicles.length,
              },
              {
                id: 'UPGRADES_AND_ANALYTICS',
                label: '5. تطوير المقر وتسويق العقود والتحليلات',
              },
            ] as { id: BDSubTab; label: string; badge?: string | number }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                subTab === t.id
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <span>{t.label}</span>
              {t.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono-num ${
                    subTab === t.id
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: CONTRACTS (WAKKELNY & ZORO ONLY) */}
      {subTab === 'CONTRACTS' && (
        <div className="space-y-4">
          {!isUnlocked && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-200 space-y-2">
              <div className="font-black text-sm text-amber-300">
                تمهيد استراتيجي: يفتح قسم العقود الكبرى (Business Developer) في بداية اليوم الثالث (Day 3)
              </div>
              <p className="leading-relaxed text-slate-200">
                أنت الآن في <strong>اليوم {currentDay}</strong>. خلال اليومين الأول والثاني، ركّز على تثبيت تشغيل المستودع، توظيف مناديب إضافيين (سواء بموتوسيكل شخصي أو بدون موتوسيكل)، وتجهيز السيولة النقدية لتوقيع عقدي:
                <strong> «وكلني» (8,000 ج.م)</strong> و<strong>«زورو» (15,000 ج.م)</strong> فور حلول اليوم الثالث.
              </p>
            </div>
          )}

          {/* Strictly ONLY 2 platforms: WAKKELNY and ZORO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(['WAKKELNY', 'ZORO'] as PlatformContractId[]).map((platformId) => {
              const cfg = BUSINESS_DEVELOPER_PLATFORMS[platformId];
              const runtime = bd?.contracts[platformId];
              const isSigned = Boolean(runtime?.signed);
              const readiness = evaluatePlatformContractReadiness(
                state,
                platformId
              );

              return (
                <div
                  key={platformId}
                  className={`rounded-2xl border p-4 space-y-3 transition ${
                    isSigned
                      ? 'bg-slate-900/95 border-emerald-500/50 shadow-lg'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          platformId === 'WAKKELNY'
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {cfg.badgeAr}
                      </span>
                      <h3 className="text-base font-black text-white mt-1">
                        {cfg.nameAr}
                      </h3>
                      <p className="text-xs text-slate-400">{cfg.categoryAr}</p>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">
                        رسوم التعاقد (تُدفع مرة واحدة فقط)
                      </span>
                      <span className="font-mono-num text-sm font-black text-amber-400">
                        {formatEGP(cfg.contractFeePiastres)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="text-slate-200 leading-relaxed">
                      <strong className="text-amber-300">آلية التشغيل: </strong>
                      {cfg.modelSummaryAr}
                    </div>
                    <div className="text-emerald-300/90">
                      <strong>قاعدة المستودع: </strong>
                      {cfg.warehouseRuleAr}
                    </div>
                    <div className="text-sky-300/90">
                      <strong>القاعدة المحاسبية: </strong>
                      {cfg.revenueRuleAr}
                    </div>
                  </div>

                  {/* Pre-contract Operational Readiness Verification Summary (Section 19) */}
                  {!isSigned && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px]">
                      <div className="font-bold text-slate-200">
                        فحص جاهزية التعاقد والمتطلبات التشغيلية:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div
                          className={
                            readiness.hasEnoughCash
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {readiness.hasEnoughCash ? '✓' : '✗'} السيولة:{' '}
                          <span className="font-mono-num">
                            {formatEGP(readiness.currentCashPiastres)} /{' '}
                            {formatEGP(readiness.contractFeePiastres)}
                          </span>
                        </div>
                        <div
                          className={
                            readiness.hasOperationalFleet
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {readiness.hasOperationalFleet ? '✓' : '✗'} الأسطول النشط:{' '}
                          <span className="font-mono-num">
                            {readiness.activeCouriersWithVehiclesCount} /{' '}
                            {readiness.requiredActiveCouriersCount} مندوب بمركبة
                          </span>
                        </div>
                        <div
                          className={
                            readiness.hasEnoughReputation
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }
                        >
                          {readiness.hasEnoughReputation ? '✓' : '✗'} السمعة:{' '}
                          <span className="font-mono-num">
                            {readiness.currentReputation}% (المطلوب{' '}
                            {readiness.requiredReputation}%+)
                          </span>
                        </div>
                        <div className="text-sky-300">
                          حجم الطلبات المتوقع:{' '}
                          <span className="font-mono-num font-bold">
                            {readiness.expectedDailyOrdersMin}–
                            {readiness.expectedDailyOrdersMax} طلب/يوم
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-400 pt-0.5">
                        {readiness.capacityStatusAr}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-emerald-950/25 border border-emerald-500/20 rounded-xl p-2.5 space-y-1">
                      <div className="font-bold text-emerald-300">
                        المميزات التشغيلية:
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                        {cfg.prosAr.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-rose-950/25 border border-rose-500/20 rounded-xl p-2.5 space-y-1">
                      <div className="font-bold text-rose-300">
                        المخاطر والتحديات:
                      </div>
                      <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                        {cfg.risksAr.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {isSigned && runtime ? (
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-emerald-400">
                          ✓ العقد مفعل ونشط (تم سداد الرسوم مرة واحدة في اليوم{' '}
                          {runtime.signedAtDay})
                        </span>
                        <span className="font-mono-num font-bold text-white">
                          مؤشر الالتزام SLA: {runtime.slaScore}% (المطلوب{' '}
                          {cfg.targetSlaPercent}%)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block">
                            طلبات مكتملة
                          </span>
                          <span className="font-mono-num font-bold text-emerald-400">
                            {runtime.completedOrdersCount}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block">
                            متأخرة / ملغاة
                          </span>
                          <span className="font-mono-num font-bold text-rose-400">
                            {runtime.delayedOrFailedOrdersCount}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block">
                            إيرادات الشحن المكتسبة
                          </span>
                          <span className="font-mono-num font-bold text-emerald-300">
                            {formatEGP(runtime.totalRevenueEarnedPiastres)}
                          </span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <span className="text-slate-400 block">
                            صافي ربح العقد
                          </span>
                          <span className="font-mono-num font-bold text-amber-300">
                            {formatEGP(
                              runtime.totalRevenueEarnedPiastres -
                                runtime.totalOperatingCostPiastres -
                                runtime.totalPenaltiesPiastres
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSubTab('DISPATCH_CENTER')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          الانتقال لمركز التوزيع ({waitingOrders.filter((o) => o.platformId === platformId).length} طلب بالانتظار)
                        </button>
                        <button
                          type="button"
                          onClick={() => onGeneratePlatformOrders(platformId)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                        >
                          تحديث دفعة طلبات اليوم
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
                      <span
                        className={`text-xs ${
                          readiness.allowed ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {readiness.allowed
                          ? 'جميع شروط السيولة والأسطول والسمعة مستوفاة للتوقيع'
                          : readiness.rejectionReasonAr}
                      </span>
                      <button
                        type="button"
                        disabled={!readiness.allowed}
                        onClick={() => setConfirmingContractId(platformId)}
                        className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
                          readiness.allowed
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-md'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        مراجعة وتوقيع عقد «{cfg.nameAr}» ({formatEGP(cfg.contractFeePiastres)})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pre-Confirmation Contract Signing Modal (Section 19) */}
          {confirmingContractId && (
            <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
              {(() => {
                const cfg = BUSINESS_DEVELOPER_PLATFORMS[confirmingContractId];
                const readiness = evaluatePlatformContractReadiness(
                  state,
                  confirmingContractId
                );
                return (
                  <div className="w-full max-w-lg bg-slate-900 border border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <h3 className="text-base font-black text-white">
                        تأكيد توقيع عقد شراكة «{cfg.nameAr}»
                      </h3>
                      <button
                        type="button"
                        onClick={() => setConfirmingContractId(null)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          رسوم التعاقد (تُدفع مرة واحدة فقط):
                        </span>
                        <span className="font-mono-num font-bold text-amber-400">
                          {formatEGP(cfg.contractFeePiastres)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          السيولة المتبقية بعد التوقيع:
                        </span>
                        <span className="font-mono-num font-bold text-emerald-400">
                          {formatEGP(
                            Math.max(
                              0,
                              readiness.currentCashPiastres -
                                cfg.contractFeePiastres
                            )
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          الحجم اليومي المتوقع للطلبات المباشرة:
                        </span>
                        <span className="font-mono-num font-bold text-sky-300">
                          {readiness.expectedDailyOrdersMin} إلى{' '}
                          {readiness.expectedDailyOrdersMax} طلبات/يوم
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">
                          نسبة الالتزام المطلوبة (SLA):
                        </span>
                        <span className="font-mono-num font-bold text-white">
                          {cfg.targetSlaPercent}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 space-y-1 text-rose-200">
                      <div className="font-bold text-rose-300">
                        المخاطر التشغيلية والالتزامات قبل التأكيد:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {cfg.risksAr.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setConfirmingContractId(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                      >
                        تراجع
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const idToSign = confirmingContractId;
                          setConfirmingContractId(null);
                          onSignContract(idToSign);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer shadow-md"
                      >
                        تأكيد التوقيع وسداد {formatEGP(cfg.contractFeePiastres)}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DISPATCH CENTER (INDEPENDENT / BATCH / SMART AUTO) */}
      {subTab === 'DISPATCH_CENTER' && (
        <div className="space-y-4">
          {wakkelnyFeedback && (
            <div className="bg-emerald-950/90 border border-emerald-500/50 rounded-xl px-4 py-2 text-xs text-emerald-200 font-bold flex items-center justify-between">
              <span>{wakkelnyFeedback}</span>
              <button
                type="button"
                onClick={() => setWakkelnyFeedback(null)}
                className="text-emerald-400"
              >
                ✕
              </button>
            </div>
          )}

          {/* Wakkelny Launch Hub & Service Zones Courier Allocation */}
          <div className="bg-slate-900/95 border border-orange-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-orange-300">
                  🍔 إدارة مقر الانطلاق ومناطق خدمة «وكلني» (تخصيص المندوبين والنطاق الجغرافي)
                </h3>
                <p className="text-xs text-slate-300">
                  طلبات «وكلني» للوجبات الساخنة تعمل بنظام الدقائق (وليس 10 ساعات كالمستودع). لا يُسند طلب منطقة لمندوب بعيد إلا بتفعيل «التغطية الاستثنائية» المحسوبة.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">مقر الانطلاق:</span>
                <select
                  value={launchHubInput}
                  onChange={(e) => setLaunchHubInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold text-xs"
                >
                  <option value="العباسية — المقر التشغيلي">
                    العباسية — المقر التشغيلي
                  </option>
                  <option value="مدينة نصر — نقطة تمركز شرق">
                    مدينة نصر — نقطة تمركز شرق
                  </option>
                  <option value="الدقي — نقطة تمركز الجيزة">
                    الدقي — نقطة تمركز الجيزة
                  </option>
                  <option value="وسط البلد — التحرير">
                    وسط البلد — التحرير
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(bd?.wakkelnyZones || []).map((zone) => (
                <div
                  key={zone.zoneId}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">
                        📍 {zone.zoneNameAr}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        النطاق: {zone.geographicScopeAr}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-bold shrink-0">
                      مكافأة سرعة +{formatEGP(zone.speedBonusAmountPiastres)} (&le;{' '}
                      {zone.speedBonusThresholdMinutes} د)
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-300 bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-0.5">
                    <div>
                      <strong className="text-amber-300">المطاعم الشريكة: </strong>
                      {zone.partnerRestaurantsAr.join(' ، ')}
                    </div>
                    <div className="flex flex-wrap gap-3 pt-0.5 text-slate-400">
                      <span>
                        عملاء محتملون:{' '}
                        <strong className="text-white font-mono-num">
                          {zone.potentialCustomersCount}
                        </strong>
                      </span>
                      <span>
                        الطلب المتوقع:{' '}
                        <strong className="text-sky-300 font-mono-num">
                          {zone.expectedHourlyDemand}/ساعة
                        </strong>
                      </span>
                      <span>
                        متوسط التعريفة:{' '}
                        <strong className="text-emerald-300 font-mono-num">
                          {formatEGP(zone.avgDeliveryTariffPiastres)}
                        </strong>
                      </span>
                    </div>
                    <div className="text-slate-400">
                      أوقات الذروة: <span className="text-orange-200">{zone.peakHoursLabelAr}</span>
                    </div>
                  </div>

                  {/* Courier Allocation Toggle Buttons for this Zone */}
                  <div className="pt-1 space-y-1">
                    <div className="text-[10px] font-bold text-slate-300">
                      المندوبون المخصصون لهذه المنطقة ({zone.allocatedCourierIds.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCouriers.map((c) => {
                        const isAllocated = zone.allocatedCourierIds.includes(
                          c.id
                        );
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (!onUpdateState) return;
                              const nextIds = isAllocated
                                ? zone.allocatedCourierIds.filter(
                                    (id) => id !== c.id
                                  )
                                : [...zone.allocatedCourierIds, c.id];
                              onUpdateState(
                                (prev) =>
                                  configureWakkelnyHubAndZoneCouriers(
                                    prev,
                                    launchHubInput,
                                    zone.zoneId,
                                    nextIds
                                  ),
                                `تم تحديث تخصيص المندوبين لمنطقة (${zone.zoneNameAr}).`
                              );
                              setWakkelnyFeedback(
                                `تم تحديث تغطية منطقة (${zone.zoneNameAr}) بنجاح.`
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              isAllocated
                                ? 'bg-orange-500 text-slate-950 border-orange-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-orange-400/50'
                            }`}
                          >
                            {isAllocated ? '✓ مخصص: ' : '+ تخصيص: '}
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mode 3: Smart Auto-Dispatch Bar */}
          <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-amber-300">
                  الوضع الثالث: التوزيع الذكي التلقائي (Smart Auto-Dispatch)
                </h3>
                <p className="text-xs text-slate-300">
                  يحلل النظام أوزان الطلبات بالجرام، وأحجامها بالـ سم³، واتجاهات المناطق، ومواعيد الذروة، ويختار تلقائياً بين التوصيل المستقل أو التجميع المتوافق.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedPolicy}
                  onChange={(e) =>
                    setSelectedPolicy(e.target.value as SmartDispatchPolicy)
                  }
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                >
                  {(
                    Object.keys(POLICY_LABELS_AR) as SmartDispatchPolicy[]
                  ).map((pol) => (
                    <option key={pol} value={pol}>
                      {POLICY_LABELS_AR[pol]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onRunSmartAutoDispatch(selectedPolicy)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow"
                >
                  تشغيل التوزيع الذكي الآن ({waitingOrders.length} طلب بالانتظار)
                </button>
              </div>
            </div>

            {bd?.smartDispatchLogs && bd.smartDispatchLogs.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400">
                  سجل تفسير قرارات التوزيع الذكي الأخيرة:
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[11px]">
                  {bd.smartDispatchLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80"
                    >
                      <span className="text-slate-200">{log.reasonAr}</span>
                      <span className="font-mono-num text-emerald-400 shrink-0">
                        إيراد {formatEGP(log.expectedRevenuePiastres)} | تكلفة{' '}
                        {formatEGP(log.expectedCostPiastres)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode 2: Directional Route Batching Builder */}
          <div className="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-sky-300">
                  الوضع الثاني: التوصيل المجمع حسب الاتجاه (Directional Batching)
                </h3>
                <p className="text-xs text-slate-300">
                  حدد طلبين (2) أو أكثر من نفس القطاع الاتجاهي في الجدول أدناه لدمجهما في خط سير واحد وتوفير نحو 28% من تكلفة الوقود بشرط عدم تجاوز سعة المركبة (وزناً وحجماً).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
                  الطلبات المحددة:{' '}
                  <strong className="font-mono-num text-sky-400">
                    {selectedBatchOrders.length}
                  </strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
                  إجمالي الوزن:{' '}
                  <strong className="font-mono-num text-amber-300">
                    {formatWeightGramsAndKg(batchTotalWeightGrams)}
                  </strong>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200">
                  إجمالي الحجم:{' '}
                  <strong className="font-mono-num text-emerald-300">
                    {batchTotalVolumeCm3.toLocaleString('en-US')} سم³
                  </strong>
                </span>
              </div>
            </div>

            {selectedBatchOrders.length >= 2 && (
              <div className="bg-slate-950 border border-sky-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-200 space-y-0.5">
                  <div>
                    الطلبات المختارة للتجميع:{' '}
                    <strong>
                      {selectedBatchOrders
                        .map((o) => `${o.trackingNumber} (${o.deliveryZone})`)
                        .join(' + ')}
                    </strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    تسلسل المحطات: استلام من الشركاء أولاً ثم التسليم للعملاء حسب أقرب موعد نهائي.
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedBatchCourierId}
                    onChange={(e) => setSelectedBatchCourierId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value="">اختر المندوب والمركبة للتجميع...</option>
                    {activeCouriers.map((c) => {
                      const veh = resolveCourierEffectiveVehicle(state, c);
                      const fit = veh
                        ? checkVehicleCapacityFit(
                            veh,
                            (c.currentWeightGrams || 0) + batchTotalWeightGrams,
                            (c.currentVolumeCm3 || 0) + batchTotalVolumeCm3
                          )
                        : { fits: false };
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} —{' '}
                          {veh
                            ? `${veh.name} (${fit.fits ? 'متوافق ✓' : 'تجاوز السعة ✗'})`
                            : 'بدون مركبة مخصصة ✗'}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    disabled={!selectedBatchCourierId}
                    onClick={() => {
                      if (!selectedBatchCourierId) return;
                      onDispatchBatch(
                        selectedBatchOrderIds,
                        selectedBatchCourierId
                      );
                      setSelectedBatchOrderIds([]);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    إطلاق خط التوصيل المجمع ({selectedBatchOrders.length} طلبات)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Waiting Orders Table (Mode 1 Independent + Checkbox for Mode 2 Batch) */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white">
                طلبات «وكلني» و«زورو» المباشرة الجاهزة للتوزيع ({waitingOrders.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                تذكير: لا تمر هذه الطلبات بمستودعاتك؛ المندوب يستلم من المطعم أو مخزن زورو ويتوجه للعميل مباشرة.
              </span>
            </div>

            {waitingOrders.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
                لا توجد طلبات منصات في قائمة الانتظار حالياً. تأكد من توقيع عقد «وكلني» أو «زورو» من تبويب العقود أو انتقل لليوم التالي.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {waitingOrders.map((ord) => {
                  const chosenCourierId =
                    selectedCourierByOrder[ord.id] || activeCouriers[0]?.id || '';
                  const chosenCourier = activeCouriers.find(
                    (c) => c.id === chosenCourierId
                  );
                  const chosenVehicle = chosenCourier
                    ? resolveCourierEffectiveVehicle(state, chosenCourier)
                    : null;
                  const fitCheck = chosenVehicle
                    ? checkVehicleCapacityFit(
                        chosenVehicle,
                        (chosenCourier?.currentWeightGrams || 0) +
                          ord.weightGrams,
                        (chosenCourier?.currentVolumeCm3 || 0) + ord.volumeCm3
                      )
                    : null;

                  return (
                    <div
                      key={ord.id}
                      className="bg-slate-950/95 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedBatchOrderIds.includes(ord.id)}
                            onChange={() => toggleBatchOrderSelection(ord.id)}
                            className="mt-1 accent-sky-500 cursor-pointer"
                            title="تحديد الطلب للتجميع الاتجاهي"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ord.platformId === 'WAKKELNY'
                                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                }`}
                              >
                                {ord.platformId === 'WAKKELNY'
                                  ? 'وكلني (مطاعم)'
                                  : 'زورو (مخزن زورو)'}
                              </span>
                              <span className="font-mono-num font-bold text-amber-400">
                                {ord.trackingNumber}
                              </span>
                              {ord.requiresCarOrTruck && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                                  يتطلب سيارة / شاحنة
                                </span>
                              )}
                              {!ord.batchable && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                  مستقل فقط (وجبة ساخنة عاجلة)
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-white mt-1">
                              {ord.titleAr}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {ord.descriptionAr}
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span className="text-[10px] text-slate-400 block">
                            تعريفة الشحن (إيراد شركتك)
                          </span>
                          <span className="font-mono-num font-black text-emerald-400 text-sm">
                            {formatEGP(ord.shippingTariffPiastres)}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            قيمة طلب التاجر: {formatEGP(ord.merchantOrderValuePiastres)} (ليست إيراداً لك)
                          </span>
                        </div>
                      </div>

                      {/* Route & Physical Weight/Volume Specs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">
                            نقطة الاستلام ← التسليم
                          </span>
                          <span className="font-bold text-white">
                            {ord.pickupZone} ← {ord.deliveryZone}
                          </span>
                          <span className="text-[10px] text-sky-400 block">
                            {SECTOR_LABELS_AR[ord.directionSector]}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">
                            الوزن (جرام / كجم)
                          </span>
                          <span className="font-mono-num font-bold text-amber-300">
                            {formatWeightGramsAndKg(ord.weightGrams)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">
                            الأبعاد والحجم (سم³)
                          </span>
                          <span className="font-mono-num font-bold text-emerald-300">
                            {formatVolumeAndDimensions(
                              ord.volumeCm3,
                              ord.lengthCm,
                              ord.widthCm,
                              ord.heightCm
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">
                            آخر موعد للتسليم
                          </span>
                          <span className="font-mono-num font-bold text-rose-300">
                            {ord.deadlineTimeLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            وقود مقدر: {formatEGP(ord.estimatedTripCostPiastres)}
                          </span>
                        </div>
                      </div>

                      {ord.specialRiskNoteAr && (
                        <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                          ⚠️ {ord.specialRiskNoteAr}
                        </div>
                      )}

                      {/* Granular Wakkelny Food Order Timing Breakdown (Minutes Model, NOT 10h Warehouse SLA) */}
                      {ord.platformId === 'WAKKELNY' && chosenCourierId && (() => {
                        const timing = calculateWakkelnyOrderTimingBreakdown(
                          state,
                          ord,
                          chosenCourierId
                        );
                        const allowExceptional = Boolean(
                          allowExceptionalByOrder[ord.id]
                        );
                        return (
                          <div className="bg-slate-900/95 border border-orange-500/30 rounded-xl p-2.5 space-y-1.5 text-[10px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-orange-300">
                                ⏱️ تفصيل زمن طلب «وكلني» (فصل زمن تحضير المطعم عن زمن الطريق):
                              </span>
                              <span className="font-mono-num font-bold text-emerald-300">
                                إجمالي متوقع: {timing.totalExpectedMinutes} دقيقة
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-slate-300">
                              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                تحضير المطعم:{' '}
                                <strong className="text-amber-300 font-mono-num">
                                  {timing.restaurantPrepMinutes} د
                                </strong>
                              </div>
                              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                انتظار المندوب بالمطعم:{' '}
                                <strong className="text-sky-300 font-mono-num">
                                  {timing.courierWaitAtRestaurantMinutes} د
                                </strong>
                              </div>
                              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                طريق للمطعم ({timing.distanceToRestaurantKm} كم):{' '}
                                <strong className="text-white font-mono-num">
                                  {timing.transitToRestaurantMinutes} د
                                </strong>
                              </div>
                              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                طريق للعميل ({timing.distanceRestaurantToClientKm} كم):{' '}
                                <strong className="text-white font-mono-num">
                                  {timing.transitToClientMinutes} د
                                </strong>
                              </div>
                              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                معامل الازدحام:{' '}
                                <strong className="text-amber-300 font-mono-num">
                                  ×{timing.virtualTrafficFactor}
                                </strong>
                              </div>
                              <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                                مكافأة السرعة:{' '}
                                <strong
                                  className={
                                    timing.speedBonusEligible
                                      ? 'text-emerald-400'
                                      : 'text-slate-400'
                                  }
                                >
                                  {timing.speedBonusEligible
                                    ? `مؤهل (+${formatEGP(timing.speedBonusEarnedPiastres)})`
                                    : 'غير مؤهل'}
                                </strong>
                              </div>
                            </div>

                            {timing.isExceptionalOutOfZoneCoverage && (
                              <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-500/40 flex flex-wrap items-center justify-between gap-2 text-rose-200">
                                <span>
                                  ⚠️ المندوب المختار خارج منطقة الخدمة ({timing.distanceToRestaurantKm} كم للمطعم). التكلفة الإضافية للتغطية الاستثنائية:{' '}
                                  <strong>
                                    +{formatEGP(timing.exceptionalExtraCostPiastres)}
                                  </strong>
                                </span>
                                <label className="inline-flex items-center gap-1.5 font-bold text-amber-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={allowExceptional}
                                    onChange={(e) =>
                                      setAllowExceptionalByOrder((prev) => ({
                                        ...prev,
                                        [ord.id]: e.target.checked,
                                      }))
                                    }
                                    className="accent-amber-500"
                                  />
                                  تفعيل التغطية الاستثنائية
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Mode 1: Independent Dispatch Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <select
                          value={chosenCourierId}
                          onChange={(e) =>
                            setSelectedCourierByOrder((prev) => ({
                              ...prev,
                              [ord.id]: e.target.value,
                            }))
                          }
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1 min-w-[190px]"
                        >
                          {activeCouriers.map((c) => {
                            const veh = resolveCourierEffectiveVehicle(state, c);
                            const fit = veh
                              ? checkVehicleCapacityFit(
                                  veh,
                                  (c.currentWeightGrams || 0) + ord.weightGrams,
                                  (c.currentVolumeCm3 || 0) + ord.volumeCm3
                                )
                              : { fits: false };
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name} —{' '}
                                {veh
                                  ? `${veh.name} (${fit.fits ? 'مناسب ✓' : 'أكبر من السعة ✗'})`
                                  : 'بدون مركبة (خصص مركبة أولاً)'}
                              </option>
                            );
                          })}
                        </select>

                        {onUpdateState && ord.platformId === 'WAKKELNY' && (
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateState((prev) => {
                                const { nextState } = inspectAndNotifySecretary(
                                  prev,
                                  {
                                    decisionType: 'DISPATCH_WAKKELNY_ORDER',
                                    platformOrderId: ord.id,
                                    courierId: chosenCourierId,
                                  },
                                  `WAK-${Date.now()}`
                                );
                                return nextState;
                              });
                              setWakkelnyFeedback(
                                `أرسل السكرتير التنفيذي تقرير فحص توجيه الطلب (${ord.trackingNumber}) في فقاعة السكرتير.`
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-xs cursor-pointer"
                          >
                            فحص السكرتير
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              onUpdateState &&
                              ord.platformId === 'WAKKELNY'
                            ) {
                              try {
                                onUpdateState((prev) => {
                                  const { nextState } =
                                    dispatchWakkelnyOrderWithZoneSimulation(
                                      prev,
                                      ord.id,
                                      chosenCourierId,
                                      {
                                        allowExceptionalCoverage: Boolean(
                                          allowExceptionalByOrder[ord.id]
                                        ),
                                      }
                                    );
                                  return nextState;
                                });
                                setWakkelnyFeedback(
                                  `تم توجيه طلب «وكلني» (${ord.trackingNumber}) بنجاح!`
                                );
                              } catch (err) {
                                setWakkelnyFeedback(
                                  err instanceof Error
                                    ? err.message
                                    : 'تعذر توجيه الطلب'
                                );
                              }
                              return;
                            }
                            onDispatchIndependent(ord.id, chosenCourierId);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                        >
                          توصيل مستقل فوري
                        </button>
                      </div>

                      {fitCheck && !fitCheck.fits && (
                        <div className="text-[11px] text-rose-400">
                          ✗ {fitCheck.reasonAr}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active & Completed Platform Orders */}
          {(inTransitOrders.length > 0 || completedOrders.length > 0) && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-black text-white">
                الرحلات الجارية والمكتملة لمنصتي «وكلني» و«زورو» (
                {inTransitOrders.length} بالطريق | {completedOrders.length} مكتملة)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto">
                {[...inTransitOrders, ...completedOrders.slice(0, 10)].map(
                  (ord) => (
                    <div
                      key={ord.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {ord.trackingNumber} — {ord.titleAr} (
                          {ord.pickupZone} ← {ord.deliveryZone})
                        </div>
                        <div className="text-[11px] text-slate-400">
                          المندوب: {ord.assignedCourierName || '—'} | المركبة:{' '}
                          {ord.assignedVehicleName || '—'} | الوضع:{' '}
                          {ord.dispatchMode || '—'}
                        </div>
                        {ord.outcomeNoteAr && (
                          <div className="text-[11px] text-emerald-300 mt-0.5">
                            {ord.outcomeNoteAr}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          ord.status === 'DELIVERED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : ord.status === 'PICKED_UP_IN_TRANSIT'
                              ? 'bg-sky-500/20 text-sky-300'
                              : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {ord.status === 'DELIVERED'
                          ? 'تم التسليم ✓'
                          : ord.status === 'PICKED_UP_IN_TRANSIT'
                            ? `في الطريق (يصل ${ord.expectedArrivalTimeLabel || ''})`
                            : ord.status === 'DELAYED_DELIVERED'
                              ? 'سُلّم بتأخير'
                              : 'ملغى / فشل'}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INTERACTIVE DELIVERY MAP & ROUTE PLANNING */}
      {subTab === 'INTERACTIVE_MAP' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Interactive SVG Map of Cairo & Giza Zones */}
          <div className="lg:col-span-2 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white">
                  خريطة التوصيل والمسارات الذكية (القاهرة الكبرى والجيزة)
                </h3>
                <p className="text-xs text-slate-400">
                  اضغط على أي منطقة لمعاينة كثافة الطلبات، مستوى الزحام، مسارات الاستلام والتسليم، وحركة المناديب.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-bold">
                مقر انجوبيا المركزي: العباسية (لا تمر به طلبات وكلني وزورو)
              </span>
            </div>

            <div className="relative w-full h-80 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                {/* Nile River Stylized Curve */}
                <path
                  d="M 46 0 Q 44 35, 47 55 T 50 100"
                  fill="none"
                  stroke="rgba(14, 165, 233, 0.22)"
                  strokeWidth="3.5"
                />

                {/* Active Route Vectors (Pickup -> Delivery) */}
                {[...waitingOrders, ...inTransitOrders].map((ord) => {
                  const pZone =
                    CAIRO_GIZA_ZONES.find(
                      (z) => z.nameAr === ord.pickupZone
                    ) || CAIRO_GIZA_ZONES[0];
                  const dZone =
                    CAIRO_GIZA_ZONES.find(
                      (z) => z.nameAr === ord.deliveryZone
                    ) || CAIRO_GIZA_ZONES[1];
                  const isMoving = ord.status === 'PICKED_UP_IN_TRANSIT';
                  return (
                    <line
                      key={ord.id}
                      x1={pZone.mapX}
                      y1={pZone.mapY}
                      x2={dZone.mapX}
                      y2={dZone.mapY}
                      stroke={
                        isMoving
                          ? '#10b981'
                          : ord.platformId === 'WAKKELNY'
                            ? '#f97316'
                            : '#6366f1'
                      }
                      strokeWidth={isMoving ? '1.2' : '0.7'}
                      strokeDasharray={isMoving ? undefined : '1.5,1.5'}
                    />
                  );
                })}
              </svg>

              {/* Zone Nodes */}
              {CAIRO_GIZA_ZONES.map((z) => {
                const zoneWaiting = waitingOrders.filter(
                  (o) =>
                    o.pickupZone === z.nameAr || o.deliveryZone === z.nameAr
                ).length;
                const zoneActive = inTransitOrders.filter(
                  (o) =>
                    o.pickupZone === z.nameAr || o.deliveryZone === z.nameAr
                ).length;
                const isSelected = selectedZoneId === z.id;

                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setSelectedZoneId(z.id)}
                    style={{ left: `${z.mapX}%`, top: `${z.mapY}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-xl border text-[10px] font-bold cursor-pointer transition shadow-md ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-white scale-110 z-20'
                        : 'bg-slate-900/95 text-white border-slate-700 hover:border-amber-400 z-10'
                    }`}
                  >
                    <div>{z.nameAr}</div>
                    <div className="flex items-center justify-center gap-1 text-[9px] font-mono-num">
                      <span className="text-amber-300">
                        انتظار:{zoneWaiting}
                      </span>
                      <span className="text-emerald-300">
                        نشط:{zoneActive}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Zone Inspector & Route Batches */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
            {(() => {
              const zone =
                CAIRO_GIZA_ZONES.find((z) => z.id === selectedZoneId) ||
                CAIRO_GIZA_ZONES[0];
              const zoneOrders = platformOrders.filter(
                (o) =>
                  o.pickupZone === zone.nameAr || o.deliveryZone === zone.nameAr
              );

              return (
                <>
                  <div className="border-b border-slate-800 pb-2">
                    <span className="text-[10px] text-amber-400 font-bold">
                      {zone.sectorLabelAr}
                    </span>
                    <h4 className="text-base font-black text-white">
                      منطقة {zone.nameAr}
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      {zone.orderDensityLabelAr}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">
                        متوسط المسافة والزمن
                      </span>
                      <span className="font-mono-num font-bold text-white">
                        {zone.avgDistanceKm} كم (~{zone.baseTripMinutes} د)
                      </span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">
                        حالة المرور والضغط
                      </span>
                      <span className="font-bold text-amber-300">
                        {zone.trafficLabelAr}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-300">
                      الطلبات المرتبطة بمنطقة {zone.nameAr} ({zoneOrders.length}):
                    </div>
                    {zoneOrders.length === 0 ? (
                      <div className="text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800">
                        لا توجد طلبات مسجلة في هذه المنطقة حالياً.
                      </div>
                    ) : (
                      <div className="max-h-44 overflow-y-auto space-y-1.5">
                        {zoneOrders.map((o) => (
                          <div
                            key={o.id}
                            className="bg-slate-950 p-2 rounded-lg border border-slate-800"
                          >
                            <div className="flex justify-between font-bold text-white">
                              <span>
                                {o.trackingNumber} ({o.pickupZone} ←{' '}
                                {o.deliveryZone})
                              </span>
                              <span className="font-mono-num text-emerald-400">
                                {formatEGP(o.shippingTariffPiastres)}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatWeightGramsAndKg(o.weightGrams)} |{' '}
                              {o.volumeCm3.toLocaleString('en-US')} سم³
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: VEHICLE STORE (5 CATEGORIES) & 1-TO-1 COURIER ASSIGNMENT */}
      {subTab === 'FLEET_STORE' && (
        <div className="space-y-4">
          {/* 5 Vehicle Store Categories */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-white">
                  متجر المركبات والأسطول (شراء تمليك أو إيجار دوري كل 8 أيام)
                </h3>
                <p className="text-xs text-slate-400">
                  المركبات المملوكة لا يُخصم عنها أي إيجار دوري ويمكن إعادة بيعها. المركبات المستأجرة يُخصم إيجارها في دورة الـ 8 أيام فقط.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {VEHICLE_STORE_CATALOG.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-3 text-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          {item.categoryAr}
                        </span>
                        <h4 className="font-black text-white text-sm mt-1">
                          {item.nameAr}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">سعر الشراء</span>
                        <span className="font-mono-num font-black text-emerald-400">
                          {formatEGP(item.buyPricePiastres)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          الإيجار (لكل 8 أيام)
                        </span>
                        <span className="font-mono-num font-black text-amber-400">
                          {formatEGP(item.leasePricePerCyclePiastres)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          أقصى حمولة وزن
                        </span>
                        <span className="font-mono-num font-bold text-white">
                          {formatWeightGramsAndKg(item.maxWeightGrams)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          السعة الحجمية (سم³)
                        </span>
                        <span className="font-mono-num font-bold text-sky-300">
                          {item.maxVolumeCm3.toLocaleString('en-US')} سم³
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          ({item.internalLengthCm}×{item.internalWidthCm}×
                          {item.internalHeightCm} سم)
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      <strong className="text-emerald-300">الأنسب لـ: </strong>
                      {item.bestForAr}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => onBuyOrLeaseVehicle(item.id, 'BUY')}
                      className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      شراء تمليك ({formatEGP(item.buyPricePiastres)})
                    </button>
                    <button
                      type="button"
                      onClick={() => onBuyOrLeaseVehicle(item.id, 'LEASE')}
                      className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
                    >
                      إيجار كل 8 أيام ({formatEGP(item.leasePricePerCyclePiastres)})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Fleet & 1-to-1 Courier Assignment */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-black text-white">
              إدارة المركبات الحالية وتخصيص المناديب (قاعدة: مركبة واحدة لمندوب واحد فقط)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {state.vehicles.map((veh) => {
                const limits = getVehicleCapacityLimits(veh);
                const assignedCourier = state.couriers.find(
                  (c) => c.id === veh.assignedCourierId || c.vehicleId === veh.id
                );
                const selectedCourierId =
                  selectedCourierForVehicle[veh.id] ||
                  state.couriers.find((c) => !c.vehicleId)?.id ||
                  state.couriers[0]?.id ||
                  '';

                return (
                  <div
                    key={veh.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            veh.ownershipType === 'LEASED'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {veh.ownershipType === 'LEASED'
                            ? `مستأجرة (${formatEGP(veh.leaseCostPerCyclePiastres || 0)} / 8 أيام)`
                            : 'مملوكة للشركة (0 ج.م إيجار دوري)'}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1">
                          {veh.name}
                        </h4>
                      </div>
                      <span className="font-mono-num font-bold text-emerald-400">
                        الحالة الفنية: {veh.maintenanceHealth}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">أقصى وزن</span>
                        <span className="font-mono-num font-bold text-white">
                          {formatWeightGramsAndKg(limits.maxWeightGrams)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">أقصى حجم</span>
                        <span className="font-mono-num font-bold text-sky-300">
                          {limits.maxVolumeCm3.toLocaleString('en-US')} سم³
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span>
                        المندوب المخصص حالياً:{' '}
                        <strong className="text-amber-300">
                          {assignedCourier
                            ? assignedCourier.name
                            : 'غير مخصصة (متاحة للتخصيص)'}
                        </strong>
                      </span>
                      {assignedCourier && (
                        <button
                          type="button"
                          onClick={() => onUnassignVehicle(veh.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                        >
                          فك الارتباط
                        </button>
                      )}
                    </div>

                    {!assignedCourier && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedCourierId}
                          onChange={(e) =>
                            setSelectedCourierForVehicle((prev) => ({
                              ...prev,
                              [veh.id]: e.target.value,
                            }))
                          }
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1"
                        >
                          {state.couriers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}{' '}
                              {c.needsCompanyVehicle
                                ? '(بدون مركبة — يحتاج تخصيص)'
                                : c.ownsPersonalMotorcycle
                                  ? '(يمتلك موتوسيكل شخصي)'
                                  : `(مرتبط بـ ${c.vehicleId})`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            onAssignVehicleToCourier(veh.id, selectedCourierId)
                          }
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          تخصيص للمندوب
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                      {veh.maintenanceHealth < 95 && (
                        <button
                          type="button"
                          onClick={() => onRepairVehicle(veh.id, 'FULL')}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold text-[11px] cursor-pointer"
                        >
                          صيانة كاملة (160 ج.م)
                        </button>
                      )}
                      {veh.ownershipType === 'OWNED' && (
                        <button
                          type="button"
                          onClick={() => onSellOwnedVehicle(veh.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] cursor-pointer"
                        >
                          بيع المركبة المملوكة
                        </button>
                      )}
                      {veh.ownershipType === 'LEASED' && (
                        <button
                          type="button"
                          onClick={() => onTerminateLeaseVehicle(veh.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] cursor-pointer"
                        >
                          إنهاء عقد الإيجار
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: UPGRADES, CONTRACT MARKETING & ANALYTICS */}
      {subTab === 'UPGRADES_AND_ANALYTICS' && (
        <div className="space-y-4">
          {/* Operations Center Upgrades */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-black text-white">
              تطوير المقر ومركز التشغيل (Operations Center Upgrades)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {OPERATIONS_UPGRADE_CATALOG.map((upg) => {
                const lvl = bd?.upgradeLevels[upg.id] || 0;
                const nextCost = upg.costPiastres * (lvl + 1);
                const isMax = lvl >= upg.maxLevel;

                return (
                  <div
                    key={upg.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-amber-400 font-bold">
                          {upg.categoryAr}
                        </span>
                        <span className="font-mono-num font-bold text-emerald-400">
                          المستوى {lvl} / {upg.maxLevel}
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-1">
                        {upg.nameAr}
                      </h4>
                      <p className="text-slate-400 text-[11px] mt-1">
                        {upg.descriptionAr}
                      </p>
                      <div className="text-emerald-300 text-[11px] mt-1.5 font-semibold">
                        الأثر: {upg.effectSummaryAr}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isMax}
                      onClick={() => onPurchaseUpgrade(upg.id)}
                      className={`w-full py-2 rounded-lg font-black text-xs ${
                        isMax
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      }`}
                    >
                      {isMax
                        ? 'مكتمل لأعلى مستوى ✓'
                        : `ترقية للمستوى ${lvl + 1} (${formatEGP(nextCost)})`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contract Marketing Campaigns */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-black text-white">
              حملات تسويق عقود «وكلني» و«زورو» وبناء المتابعين
            </h3>
            <p className="text-xs text-slate-400">
              انتبه: زيادة المتابعين والطلبات لا تؤدي إلى ربح مضمون إلا إذا كانت قدرة أسطولك والمناديب كافية لتنفيذ الطلبات في موعدها!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONTRACT_MARKETING_CATALOG.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {camp.nameAr}
                      </h4>
                      <p className="text-slate-400 text-[11px]">
                        {camp.descriptionAr}
                      </p>
                    </div>
                    <span className="font-mono-num font-black text-amber-400 shrink-0">
                      {formatEGP(camp.costPiastres)}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-300">
                    {camp.warningIfOvercapacityAr}
                  </div>
                  <button
                    type="button"
                    onClick={() => onLaunchContractCampaign(camp.id)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                  >
                    إطلاق الحملة ({formatEGP(camp.costPiastres)})
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
