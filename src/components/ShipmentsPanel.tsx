import React, { useState } from 'react';
import { getAccountantCapacityStatus } from '../engine/accountingEngine';
import { egpToPiastres, formatEGP } from '../engine/financeEngine';
import {
  DEFAULT_QUOTED_CLIENT_SLA_HOURS,
  MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS,
  negotiateShipmentWithClient,
} from '../engine/pricingAndMarketEngine';
import {
  DEPARTMENT_LABELS_AR,
  OPERATIONAL_LOCATION_LABELS_AR,
  SHIPMENT_STATUS_LABELS_AR,
} from '../engine/shipmentEngine';
import {
  evaluateOrderPreDecisionVerdict,
  inspectAndNotifySecretary,
} from '../engine/guideAndSecretaryEngine';
import {
  dispatchReturnToMerchantClient,
  initiateShipmentReturnWorkflow,
  recordMerchantReturnConfirmationOrDispute,
} from '../engine/returnsAndConflictEngine';
import { GameState, Shipment } from '../types/game';

interface ShipmentsPanelProps {
  state: GameState;
  onSelectShipment: (trackingNumber: string) => void;
  onAcceptShipment?: (trackingNumber: string) => void;
  onRejectShipment?: (trackingNumber: string) => void;
  onUpdateState?: (nextState: GameState, bannerMessage?: string) => void;
}

export const ShipmentsPanel: React.FC<ShipmentsPanelProps> = ({
  state,
  onSelectShipment,
  onAcceptShipment,
  onRejectShipment,
  onUpdateState,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    | 'ALL'
    | 'NEW_REQUEST'
    | 'IN_WAREHOUSE'
    | 'WITH_COURIER'
    | 'DELAYED'
    | 'DELIVERED'
  >('ALL');

  // Negotiation Modal State
  const [negotiatingTracking, setNegotiatingTracking] = useState<string | null>(
    null
  );
  const [negPriceEgp, setNegPriceEgp] = useState<number>(160);
  const [negSlaHours, setNegSlaHours] = useState<number>(
    DEFAULT_QUOTED_CLIENT_SLA_HOURS
  );
  const [negClientReply, setNegClientReply] = useState<string | null>(null);
  const [negAccepted, setNegAccepted] = useState<boolean | null>(null);
  const [showClientProfiles, setShowClientProfiles] = useState<boolean>(false);
  const [returnsFeedback, setReturnsFeedback] = useState<string | null>(null);

  const accStatus = getAccountantCapacityStatus(state);
  const returnCandidates = state.shipments.filter(
    (s) => s.status === 'DELIVERY_FAILED' || Boolean(s.returnRecord)
  );

  const negotiatingShipment = negotiatingTracking
    ? state.shipments.find((s) => s.trackingNumber === negotiatingTracking)
    : null;

  const openNegotiationFor = (sh: Shipment) => {
    setNegotiatingTracking(sh.trackingNumber);
    setNegPriceEgp(Math.round(sh.serviceFeePiastres / 100) + 20);
    setNegSlaHours(
      sh.quotedClientSlaHours ?? DEFAULT_QUOTED_CLIENT_SLA_HOURS
    );
    setNegClientReply(null);
    setNegAccepted(null);
  };

  const filteredShipments = state.shipments.filter((sh) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      sh.trackingNumber.toLowerCase().includes(q) ||
      sh.clientName.toLowerCase().includes(q) ||
      sh.deliveryZone.toLowerCase().includes(q) ||
      SHIPMENT_STATUS_LABELS_AR[sh.status].toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'NEW_REQUEST') {
      return sh.status === 'NEW_REQUEST';
    }
    if (statusFilter === 'IN_WAREHOUSE') {
      return sh.responsibleDepartment === 'WAREHOUSE';
    }
    if (statusFilter === 'WITH_COURIER') {
      return sh.responsibleDepartment === 'DISPATCH_COURIERS';
    }
    if (statusFilter === 'DELAYED') {
      return (
        sh.isDelayed ||
        sh.requiresManagerIntervention ||
        sh.status === 'CANCELLED_EXPIRED'
      );
    }
    if (statusFilter === 'DELIVERED') {
      return sh.status === 'DELIVERED';
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header & Accountant Capacity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">
            العمليات وتتبع الشحنات والتفاوض (حد أدنى 10س · مهلة العميل 15س)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            انتبه لعداد مهلة القبول لكل طلب جديد؛ نسيان القرار يؤدي لسحب الأوردر لشركة منافسة وتراجع السمعة.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center gap-2">
            <span className="text-slate-400">طاقة المحاسب الإداري اليوم:</span>
            <strong
              className={`font-mono-num ${
                accStatus.remainingCapacityToday > 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {accStatus.processedToday} / {accStatus.totalDailyCapacity} طلبات
            </strong>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم التتبع أو العميل أو المنطقة..."
            className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-60"
          />
        </div>
      </div>

      {/* Interactive Client Negotiation Box */}
      {negotiatingShipment && (
        <div className="p-4 rounded-2xl bg-slate-950 border-2 border-amber-500/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-amber-300">
                🤝 جلسة تفاوض مباشر مع ({negotiatingShipment.clientName}) — الشحنة{' '}
                <span className="font-mono-num">
                  {negotiatingShipment.trackingNumber}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                الحد الأدنى التشغيلي للأوردر بالمستودع والفرز والتوزيع هو{' '}
                <strong className="text-amber-300">
                  {negotiatingShipment.minOperationalHours ??
                    MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS}{' '}
                  ساعات
                </strong>
                ، والمهلة القياسية المبلغة للعميل هي{' '}
                <strong className="text-sky-300">15 ساعة</strong> لإعطاء وقت للشركة في الحالات الحرجة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNegotiatingTracking(null)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
            >
              إغلاق التفاوض ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">
                السعر الحالي / تكلفة الشركة
              </span>
              <strong className="font-mono-num text-white">
                {formatEGP(negotiatingShipment.serviceFeePiastres)} / تكلفة{' '}
                {formatEGP(negotiatingShipment.estimatedOperatingCostPiastres)}
              </strong>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                السعر المقترح على العميل (ج.م):
              </label>
              <input
                type="number"
                min={50}
                max={600}
                value={negPriceEgp}
                onChange={(e) => setNegPriceEgp(Number(e.target.value) || 100)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                مهلة التوصيل المبلغة للعميل (&ge; 10س):
              </label>
              <input
                type="number"
                min={MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS}
                max={24}
                value={negSlaHours}
                onChange={(e) =>
                  setNegSlaHours(Number(e.target.value) || 10)
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-xs"
              />
            </div>

            <div className="flex items-end gap-1.5">
              {onUpdateState && (
                <button
                  type="button"
                  onClick={() => {
                    const { nextState, report } = inspectAndNotifySecretary(
                      state,
                      {
                        decisionType: 'NEGOTIATE_SHIPMENT',
                        trackingNumber: negotiatingShipment.trackingNumber,
                        proposedPricePiastres: egpToPiastres(negPriceEgp),
                        proposedSlaHours: negSlaHours,
                      },
                      `NEG-${Date.now()}`
                    );
                    onUpdateState(nextState, report.headlineAr);
                  }}
                  className="py-2 px-2.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs cursor-pointer shrink-0"
                  title="إعادة فحص الصفقة مع السكرتير وفق السعر والمهلة المقترحة"
                >
                  فحص السكرتير 🔍
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  try {
                    const res = negotiateShipmentWithClient(
                      state,
                      negotiatingShipment.trackingNumber,
                      egpToPiastres(negPriceEgp),
                      negSlaHours
                    );
                    setNegClientReply(res.clientReplyAr);
                    setNegAccepted(res.accepted);
                    onUpdateState?.(res.nextState, res.clientReplyAr);
                  } catch (err) {
                    setNegAccepted(false);
                    setNegClientReply(
                      err instanceof Error ? err.message : 'تعذر إتمام التفاوض'
                    );
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                إرسال عرض التفاوض للعميل 💬
              </button>
            </div>
          </div>

          {negClientReply && (
            <div
              className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                negAccepted
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              }`}
            >
              <span>🗣️ رد العميل: {negClientReply}</span>
              {onAcceptShipment && (
                <button
                  type="button"
                  onClick={() => {
                    onAcceptShipment(negotiatingShipment.trackingNumber);
                    setNegotiatingTracking(null);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  اعتماد وقبول الأوردر الآن ✓
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            الكل ({state.shipments.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('NEW_REQUEST')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'NEW_REQUEST'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            طلبات جديدة ({state.shipments.filter((s) => s.status === 'NEW_REQUEST').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_WAREHOUSE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'IN_WAREHOUSE'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            داخل المستودع
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('WITH_COURIER')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'WITH_COURIER'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            مع المناديب
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DELAYED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'DELAYED'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            متأخرة / مسحوبة لمنافس
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DELIVERED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'DELIVERED'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تم التسليم
          </button>
        </div>

        <span className="text-xs text-slate-400">
          عدد النتائج المعروضة: {filteredShipments.length}
        </span>
      </div>

      {/* Pre-Decision Order Analysis Cards for NEW_REQUEST Shipments */}
      {state.shipments.some((s) => s.status === 'NEW_REQUEST') && (
        <div className="space-y-2.5 bg-slate-950/70 border border-amber-500/30 rounded-xl p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-black text-amber-300">
                📋 تقييم الأوردرات الجديدة قبل القرار (تحليل المحاسب والسكرتير الذكي)
              </h3>
              <p className="text-[11px] text-slate-400">
                راجع تفصيل التكاليف (الوقود، المندوب، المستودع)، صافي الربح المتوقع، درجة جدية العميل، وحكم السكرتير قبل القبول أو التفاوض أو الرفض.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {state.shipments.filter((s) => s.status === 'NEW_REQUEST').length} طلبات بانتظار قرارك
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {state.shipments
              .filter((s) => s.status === 'NEW_REQUEST')
              .map((sh) => {
                const verdict = evaluateOrderPreDecisionVerdict(state, sh);
                const remainingAcceptMins =
                  sh.acceptanceDeadlineTotalMinutes !== undefined
                    ? Math.max(
                        0,
                        sh.acceptanceDeadlineTotalMinutes -
                          state.clock.totalElapsedMinutes
                      )
                    : null;

                const badgeToneClass =
                  verdict.verdictTone === 'EMERALD'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : verdict.verdictTone === 'AMBER'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : verdict.verdictTone === 'INDIGO'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40';

                return (
                  <div
                    key={`PREDEC-${sh.trackingNumber}`}
                    className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num text-xs font-black text-amber-400">
                            {sh.trackingNumber}
                          </span>
                          <span className="text-xs font-black text-white">
                            {sh.clientName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          المسار: <strong className="text-slate-200">{sh.pickupZone} ← {sh.deliveryZone}</strong> ({verdict.routeDistanceKm} كم) • الوزن: {(sh.weightKg ?? 4).toFixed(1)} كجم • الحجم: {sh.volumeM3 ?? 0.15} م³ • مهلة العميل: {sh.quotedClientSlaHours ?? 15}س
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded border ${badgeToneClass}`}
                      >
                        حكم السكرتير: {verdict.verdictBadgeAr}
                      </span>
                    </div>

                    {/* Financial & Cost Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">إيراد الشحن المعروض</span>
                        <span className="font-black text-white">
                          {formatEGP(sh.serviceFeePiastres)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">إجمالي التكلفة المقدرة</span>
                        <span className="font-bold text-amber-300">
                          {formatEGP(verdict.totalEstimatedCostPiastres)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">صافي الربح المتوقع</span>
                        <span
                          className={`font-black ${
                            verdict.expectedNetProfitPiastres >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {verdict.expectedNetProfitPiastres >= 0 ? '+' : ''}
                          {formatEGP(verdict.expectedNetProfitPiastres)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">جدية وثقة العميل</span>
                        <span className="font-bold text-sky-300">
                          {verdict.clientSeriousnessScore}% ({verdict.clientSeriousnessLabelAr})
                        </span>
                      </div>
                    </div>

                    {/* Itemized Cost & Capacity Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-300 bg-slate-950/50 rounded-lg px-2.5 py-1.5 border border-slate-800/60">
                      <span>
                        تفصيل التكلفة: وقود {formatEGP(verdict.estimatedFuelPiastres)} • مندوب {formatEGP(verdict.estimatedCourierPiastres)} • مستودع وتغليف {formatEGP(verdict.estimatedWarehouseAndPackagingPiastres)} • إداري {formatEGP(verdict.estimatedOverheadPiastres)}
                      </span>
                      <span className="text-sky-300 font-bold">
                        مواردك: {verdict.availableCouriersCount} مندوب جاهز • {verdict.freeWarehouseSlots} خانات متاحة بالمستودع
                      </span>
                    </div>

                    <div className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                      💡 <strong>نصيحة السكرتير الذكي:</strong> {verdict.secretaryAdviceAr}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[10px] text-rose-300 font-bold">
                        {remainingAcceptMins !== null
                          ? `مهلة القبول قبل انتقال الطلب لمنافس: متبقي ${remainingAcceptMins} دقيقة`
                          : 'جاهز للقرار الفوري'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {onAcceptShipment && (
                          <button
                            type="button"
                            onClick={() => onAcceptShipment(sh.trackingNumber)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                          >
                            قبول وإحالة للمستودع ✓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openNegotiationFor(sh)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer"
                        >
                          تفاوض على السعر/المهلة 💬
                        </button>
                        {onRejectShipment && (
                          <button
                            type="button"
                            onClick={() => onRejectShipment(sh.trackingNumber)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs cursor-pointer"
                          >
                            رفض
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Shipments Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
              <th className="py-3 px-3">رقم التتبع</th>
              <th className="py-3 px-3">العميل والمسافة</th>
              <th className="py-3 px-3">الوزن والحجم</th>
              <th className="py-3 px-3">الحالة الحالية</th>
              <th className="py-3 px-3">القسم / المسؤول</th>
              <th className="py-3 px-3">مهلة القرار / التسليم</th>
              <th className="py-3 px-3">التقدير المالي للمحاسب</th>
              <th className="py-3 px-3">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filteredShipments.map((sh: Shipment) => {
              const courier = state.couriers.find(
                (c) => c.id === sh.assignedCourierId
              );
              const whStaff = state.employees.find(
                (e) => e.id === sh.assignedWarehouseStaffId
              );
              const est = sh.accountantEstimate;
              const remainingAcceptMins =
                sh.status === 'NEW_REQUEST' &&
                sh.acceptanceDeadlineTotalMinutes !== undefined
                  ? Math.max(
                      0,
                      sh.acceptanceDeadlineTotalMinutes -
                        state.clock.totalElapsedMinutes
                    )
                  : null;

              return (
                <tr
                  key={sh.trackingNumber}
                  onClick={() => onSelectShipment(sh.trackingNumber)}
                  className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-3 font-mono-num font-bold text-amber-400 whitespace-nowrap">
                    <div>{sh.trackingNumber}</div>
                    {sh.sourceCampaignId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        حملة تسويق
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-white">{sh.clientName}</div>
                    <div className="text-[11px] text-slate-400">
                      {sh.pickupZone} ← {sh.deliveryZone}{' '}
                      {sh.distanceKm ? (
                        <span className="font-mono-num text-sky-300">
                          ({sh.distanceKm} كم)
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono-num text-slate-300 whitespace-nowrap">
                    <div>
                      {(
                        sh.weightGrams ?? Math.round((sh.weightKg ?? 4) * 1000)
                      ).toLocaleString('en-US')}{' '}
                      جم ({(sh.weightKg ?? 4).toFixed(1)} كجم)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {sh.volumeCm3
                        ? `${sh.volumeCm3.toLocaleString('en-US')} سم³`
                        : `${sh.volumeM3 ?? 0.15} م³`}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`font-bold ${
                        sh.status === 'DELIVERED'
                          ? 'text-emerald-400'
                          : sh.isDelayed ||
                              sh.status === 'DELIVERY_FAILED' ||
                              sh.status === 'UNLOCATED_IN_WAREHOUSE' ||
                              sh.status === 'CANCELLED_EXPIRED'
                            ? 'text-rose-400'
                            : sh.status === 'REJECTED' || sh.status === 'RETURNED'
                              ? 'text-slate-400'
                              : 'text-amber-300'
                      }`}
                    >
                      {SHIPMENT_STATUS_LABELS_AR[sh.status]}
                    </span>
                    {sh.returnRecord && (
                      <div className="text-[10px] text-amber-300 font-bold">
                        مرتجع:{' '}
                        {sh.returnRecord.returnStatus === 'CONFIRMED_CLOSED'
                          ? 'مؤكد ومغلق ✓'
                          : sh.returnRecord.returnStatus ===
                              'DELIVERED_TO_MERCHANT_UNCONFIRMED'
                            ? 'بانتظار تأكيد العميل ⚠️'
                            : sh.returnRecord.returnStatus ===
                                'DISPUTED_BY_MERCHANT'
                              ? 'متنازع عليه ❗'
                              : 'بالمستودع للإرجاع'}
                      </div>
                    )}
                    {sh.poachedByCompetitorName ? (
                      <div className="text-[10px] text-rose-300 font-bold">
                        خطفها: {sh.poachedByCompetitorName}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400">
                        {OPERATIONAL_LOCATION_LABELS_AR[sh.operationalLocation]}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                    <div>{DEPARTMENT_LABELS_AR[sh.responsibleDepartment]}</div>
                    <div className="text-[11px] text-slate-400">
                      {courier && sh.responsibleDepartment === 'DISPATCH_COURIERS'
                        ? courier.name
                        : whStaff && sh.responsibleDepartment === 'WAREHOUSE'
                          ? whStaff.name
                          : '—'}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono-num text-slate-200 whitespace-nowrap">
                    <div>
                      تسليم: {sh.expectedDeliveryTimeLabel} (
                      {sh.quotedClientSlaHours ?? 15}س للعميل)
                    </div>
                    {sh.status === 'NEW_REQUEST' &&
                      sh.acceptanceDeadlineTimeLabel && (
                        <div
                          className={`text-[11px] font-bold ${
                            remainingAcceptMins !== null &&
                            remainingAcceptMins <= 45
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          مهلة قرار: {sh.acceptanceDeadlineTimeLabel} (متبقي{' '}
                          {remainingAcceptMins ?? 0} د)
                        </div>
                      )}
                  </td>
                  <td className="py-3 px-3 font-mono-num whitespace-nowrap">
                    <div className="font-bold text-white">
                      الرسوم:{' '}
                      {formatEGP(
                        sh.serviceFeePiastres - (sh.discountAppliedPiastres || 0)
                      )}
                    </div>
                    {est && (
                      <div
                        className={`text-[11px] font-bold ${
                          est.isExpectedLoss ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {est.isExpectedLoss
                          ? `تحذير خسارة: ${formatEGP(est.expectedNetProfitPiastres)}`
                          : `صافي متوقع: +${formatEGP(est.expectedNetProfitPiastres)}`}
                      </div>
                    )}
                    {sh.status === 'DELIVERED' && (
                      <div className="text-[10px] text-sky-300 font-bold">
                        ربح نهائي محقق: +
                        {formatEGP(
                          sh.revenueEarnedPiastres -
                            (sh.actualOperatingCostPiastres ||
                              sh.estimatedOperatingCostPiastres)
                        )}
                      </div>
                    )}
                  </td>
                  <td
                    className="py-3 px-3 whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      {sh.status === 'NEW_REQUEST' && onAcceptShipment && (
                        <button
                          type="button"
                          onClick={() => onAcceptShipment(sh.trackingNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          قبول
                        </button>
                      )}
                      {sh.status === 'NEW_REQUEST' && (
                        <button
                          type="button"
                          onClick={() => openNegotiationFor(sh)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs cursor-pointer"
                        >
                          تفاوض 💬
                        </button>
                      )}
                      {sh.status === 'NEW_REQUEST' && onRejectShipment && (
                        <button
                          type="button"
                          onClick={() => onRejectShipment(sh.trackingNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-semibold text-xs cursor-pointer"
                        >
                          رفض
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectShipment(sh.trackingNumber)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        التفاصيل
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Documented Returns Lifecycle & Client Contract Evidence Profiles Section */}
      <div className="pt-4 border-t border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-amber-300">
              🔄 دورة المرتجعات الموثقة وتأكيد الاستلام وملفات الشركات العميلة
            </h3>
            <p className="text-[11px] text-slate-400">
              قاعدة صارمة: لا يُعتبر أي مرتجع مستلماً نهائياً أو مغلقاً دون تأكيد استلام موثق من الشركة العميلة، وتُقيد رسوم الشحن ورسوم المرتجع بشكل مستقل دون تكرار.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowClientProfiles((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 font-bold text-xs cursor-pointer"
          >
            {showClientProfiles
              ? 'إخفاء ملفات الشركات العميلة ▲'
              : `عرض ملفات الشركات العميلة والأدلة (${state.clients.length}) ▼`}
          </button>
        </div>

        {returnsFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between">
            <span>{returnsFeedback}</span>
            <button
              type="button"
              onClick={() => setReturnsFeedback(null)}
              className="text-emerald-400"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active / Closed Returns List */}
        {returnCandidates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {returnCandidates.map((sh) => {
              const ret = sh.returnRecord;
              return (
                <div
                  key={`ret-card-${sh.trackingNumber}`}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono-num font-bold text-amber-400">
                        {sh.trackingNumber}
                      </span>{' '}
                      — <strong className="text-white">{sh.clientName}</strong>
                      <div className="text-[11px] text-slate-400">
                        السبب:{' '}
                        {ret?.reasonDetailAr ||
                          sh.failureReason ||
                          'رفض/تعذر تسليم للمستلم النهائي'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        ret?.returnStatus === 'CONFIRMED_CLOSED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : ret?.returnStatus === 'DISPUTED_BY_MERCHANT'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {ret?.returnStatus === 'CONFIRMED_CLOSED'
                        ? 'مؤكد الاستلام ومغلق ✓'
                        : ret?.returnStatus ===
                            'DELIVERED_TO_MERCHANT_UNCONFIRMED'
                          ? 'وصل للعميل — بانتظار تأكيد الاستلام الموثق'
                          : ret?.returnStatus === 'DISPUTED_BY_MERCHANT'
                            ? 'متنازع عليه / مماطلة في التوثيق'
                            : 'بالمستودع بانتظار الإرجاع'}
                    </span>
                  </div>

                  {ret && (
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1 text-slate-300">
                      <div>
                        الموقع الفعلي: <strong>{ret.currentPhysicalLocationAr}</strong>
                      </div>
                      <div>
                        رسوم الشحن المحتفظ بها:{' '}
                        <strong className="text-emerald-400 font-mono-num">
                          {formatEGP(ret.originalShippingFeeRetainedPiastres)}
                        </strong>{' '}
                        • رسوم المرتجع التعاقدية:{' '}
                        <strong className="text-sky-300 font-mono-num">
                          {formatEGP(ret.contractualReturnFeePiastres)}
                        </strong>{' '}
                        • تكلفة نقل المرتجع:{' '}
                        <strong className="text-rose-300 font-mono-num">
                          {formatEGP(ret.returnTransportCostPiastres)}
                        </strong>
                      </div>
                    </div>
                  )}

                  {onUpdateState && ret?.returnStatus !== 'CONFIRMED_CLOSED' && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {!ret && (
                        <button
                          type="button"
                          onClick={() => {
                            const res = initiateShipmentReturnWorkflow(
                              state,
                              sh.trackingNumber
                            );
                            onUpdateState(res.state, res.messageAr);
                            setReturnsFeedback(res.messageAr);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                        >
                          1. فتح ملف مرتجع موثق بالمستودع
                        </button>
                      )}

                      {ret &&
                        ret.returnStatus === 'AT_WAREHOUSE_PENDING_RETURN' && (
                          <button
                            type="button"
                            onClick={() => {
                              const res = dispatchReturnToMerchantClient(
                                state,
                                sh.trackingNumber
                              );
                              onUpdateState(res.state, res.messageAr);
                              setReturnsFeedback(res.messageAr);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                          >
                            2. إرسال المرتجع لمقر الشركة العميلة ({ret.distanceToMerchantKm} كم)
                          </button>
                        )}

                      {ret &&
                        (ret.returnStatus ===
                          'DELIVERED_TO_MERCHANT_UNCONFIRMED' ||
                          ret.returnStatus === 'DISPUTED_BY_MERCHANT') && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const res =
                                  recordMerchantReturnConfirmationOrDispute(
                                    state,
                                    sh.trackingNumber,
                                    'CONFIRM_RECEIPT'
                                  );
                                onUpdateState(res.state, res.messageAr);
                                setReturnsFeedback(res.messageAr);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                            >
                              3. توثيق كود استلام العميل وإغلاق المرتجع ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const res =
                                  recordMerchantReturnConfirmationOrDispute(
                                    state,
                                    sh.trackingNumber,
                                    'MERCHANT_DELAY_CONFIRMATION'
                                  );
                                onUpdateState(res.state, res.messageAr);
                                setReturnsFeedback(res.messageAr);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold text-[11px] cursor-pointer"
                            >
                              توثيق مماطلة العميل بالأدلة ⚠️
                            </button>
                          </>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Client Contract & Evidence Profiles */}
        {showClientProfiles && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {state.clients.map((cl) => {
              const prof = cl.contractProfile;
              return (
                <div
                  key={cl.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs">{cl.name}</strong>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono-num text-[10px]">
                      ثقة: {cl.trustLevel}/100
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{cl.roleAr}</div>
                  {prof && (
                    <>
                      <div className="text-[10px] text-sky-300">
                        المناطق المغطاة: {prof.coveredZonesAr.join(' ، ')}
                      </div>
                      <div className="text-[10px] text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800">
                        {prof.returnFeePolicyAr}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
                        <span>
                          رفض مستلم:{' '}
                          <strong className="text-amber-300">
                            {prof.recipientRefusalCount}
                          </strong>
                        </span>
                        <span>
                          تأخير توثيق مرتجعات:{' '}
                          <strong
                            className={
                              prof.returnConfirmationDelayCount > 0
                                ? 'text-rose-400'
                                : 'text-emerald-400'
                            }
                          >
                            {prof.returnConfirmationDelayCount}
                          </strong>
                        </span>
                      </div>
                      {prof.documentedEvidenceNotesAr.length > 0 && (
                        <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                          آخر دليل مسجل: {prof.documentedEvidenceNotesAr[0]}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
