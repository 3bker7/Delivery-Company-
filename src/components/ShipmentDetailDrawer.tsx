import React, { useState } from 'react';
import { formatEGP } from '../engine/financeEngine';
import {
  buildShipmentDelayInquiryReport,
  DEPARTMENT_LABELS_AR,
  investigateShipmentCustodyAndDamage,
  OPERATIONAL_LOCATION_LABELS_AR,
  SHIPMENT_STATUS_LABELS_AR,
} from '../engine/shipmentEngine';
import { AdminDelayActionType, GameState, Shipment } from '../types/game';

interface ShipmentDetailDrawerProps {
  shipment: Shipment;
  state: GameState;
  onClose: () => void;
  onExecuteAdminAction: (
    trackingNumber: string,
    actionType: AdminDelayActionType
  ) => void;
  onReturnFailedShipment: (trackingNumber: string) => void;
  onAcceptShipment?: (trackingNumber: string) => void;
  onRejectShipment?: (trackingNumber: string) => void;
}

const PAYMENT_TERMS_LABELS_AR: Record<Shipment['paymentTerms'], string> = {
  PREPAID_CASH: 'نقدي عند التسليم (إيراد فوري)',
  POSTPAID_RECEIVABLE: 'آجل على حساب العميل (مستحقات)',
  COD_MERCHANT: 'تحصيل بضاعة COD لصالح التاجر + شحن',
};

export const ShipmentDetailDrawer: React.FC<ShipmentDetailDrawerProps> = ({
  shipment,
  state,
  onClose,
  onExecuteAdminAction,
  onReturnFailedShipment,
  onAcceptShipment,
  onRejectShipment,
}) => {
  const [showInquiryReport, setShowInquiryReport] = useState(
    shipment.isDelayed || shipment.requiresManagerIntervention
  );

  const inquiry = buildShipmentDelayInquiryReport(state, shipment.trackingNumber);
  const custodyInvestigation = investigateShipmentCustodyAndDamage(
    state,
    shipment.trackingNumber
  );
  const courier = state.couriers.find((c) => c.id === shipment.assignedCourierId);
  const warehouseStaff = state.employees.find(
    (e) => e.id === shipment.assignedWarehouseStaffId
  );
  const est = shipment.accountantEstimate;
  const custodyChain = shipment.custodyChain || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>ملف تتبع الشحنة والعهدة</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-amber-400 font-bold">
                {shipment.trackingNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>{shipment.clientName}</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              {SHIPMENT_STATUS_LABELS_AR[shipment.status]}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInquiryReport((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
            >
              الاستفسار عن التأخير
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Direct Accept / Reject Action Box for NEW_REQUEST */}
          {shipment.status === 'NEW_REQUEST' && (onAcceptShipment || onRejectShipment) && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-amber-300">
                  طلب شحن جديد بانتظار قرار المدير
                </div>
                <p className="text-slate-300 mt-0.5">
                  الوزن: {shipment.weightKg ?? 4} كجم · الحجم: {shipment.volumeM3 ?? 0.15} م³ · مهلة القبول:{' '}
                  <strong className="font-mono-num text-white">
                    {shipment.acceptanceDeadlineTimeLabel || '13:00'}
                  </strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {onAcceptShipment && (
                  <button
                    type="button"
                    onClick={() => onAcceptShipment(shipment.trackingNumber)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    قبول وإحالة للمستودع
                  </button>
                )}
                {onRejectShipment && (
                  <button
                    type="button"
                    onClick={() => onRejectShipment(shipment.trackingNumber)}
                    className="px-3.5 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-bold text-xs cursor-pointer"
                  >
                    رفض الطلب
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Core Operational Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block">الموقع التشغيلي الحالي</span>
              <strong className="text-white mt-0.5 block">
                {OPERATIONAL_LOCATION_LABELS_AR[shipment.operationalLocation]}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">القسم المسؤول</span>
              <strong className="text-amber-400 mt-0.5 block">
                {DEPARTMENT_LABELS_AR[shipment.responsibleDepartment]}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">الموظف / المندوب المسند</span>
              <strong className="text-slate-200 mt-0.5 block">
                {courier
                  ? `المندوب: ${courier.name}`
                  : warehouseStaff
                    ? `أمين المستودع: ${warehouseStaff.name}`
                    : 'قيد التوزيع الآلي'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">خط السير والوزن/الحجم</span>
              <strong className="text-slate-200 mt-0.5 block">
                {shipment.pickupZone} ← {shipment.deliveryZone} ({shipment.weightKg ?? 4} كجم / {shipment.volumeM3 ?? 0.15} م³)
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">وقت آخر تحديث</span>
              <strong className="font-mono-num text-slate-200 mt-0.5 block">
                {shipment.lastUpdatedTimeLabel} (منذ {inquiry.minutesSinceLastChange} د)
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block">الموعد المتوقع للتسليم</span>
              <strong className="font-mono-num text-emerald-400 mt-0.5 block">
                {shipment.expectedDeliveryTimeLabel}
              </strong>
            </div>
          </div>

          {/* Section 5: Administrative Accountant Financial Estimate Card */}
          {est && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                est.isExpectedLoss
                  ? 'bg-rose-950/25 border-rose-500/50'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-white">
                    التقدير المالي للمحاسب الإداري ({est.reviewedByEmployeeName})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تمت المراجعة الساعة {est.reviewedAtTimeLabel} · معادلة الربحية تفصل أمانة COD عن إيراد الشحن
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded font-mono-num font-bold ${
                    est.isExpectedLoss
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {est.isExpectedLoss
                    ? `خسارة متوقعة: ${formatEGP(est.expectedNetProfitPiastres)}`
                    : `صافي ربح متوقع: +${formatEGP(est.expectedNetProfitPiastres)}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">رسوم الخدمة (الإيراد)</span>
                  <strong className="font-mono-num text-emerald-400">
                    {formatEGP(est.serviceFeePiastres)}
                  </strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">وقود وخروج المندوب</span>
                  <strong className="font-mono-num text-rose-300">
                    -{formatEGP(est.fuelAndCourierCostPiastres)}
                  </strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">تغليف ومصروفات إدارية</span>
                  <strong className="font-mono-num text-rose-300">
                    -{formatEGP(est.packagingAndWarehouseCostPiastres + est.adminOverheadPiastres)}
                  </strong>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block">أمانة التاجر (COD)</span>
                  <strong className="font-mono-num text-sky-400">
                    {formatEGP(est.merchantCodTrustPiastres)} (ليست إيراداً)
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Section 7: 7-Point Delay Inquiry Report */}
          {showInquiryReport && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs sm:text-sm font-bold text-amber-400">
                  تقرير الاستفسار التشغيلي والبحث عن التأخير ({shipment.trackingNumber})
                </h3>
                <span className="text-[11px] text-slate-400">
                  فحص مركزي مباشر
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 block">1. أين توجد الشحنة حالياً؟</span>
                  <strong className="text-white">
                    {inquiry.currentLocationLabel}
                    {shipment.shelfLocation ? ` (${shipment.shelfLocation})` : ''}
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 block">2. منذ متى لم تتغير حالتها؟</span>
                  <strong className="font-mono-num text-white">
                    {inquiry.minutesSinceLastChange} دقيقة داخل اللعبة
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 block">3. من المسؤول عنها حالياً؟</span>
                  <strong className="text-white">{inquiry.responsiblePartyLabel}</strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 block">4. ما السبب المسجل للتأخير؟</span>
                  <strong
                    className={
                      shipment.isDelayed ? 'text-rose-400' : 'text-emerald-400'
                    }
                  >
                    {inquiry.recordedDelayReason}
                  </strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 block">5. ما الإجراء الجاري حالياً؟</span>
                  <strong className="text-slate-200">{inquiry.ongoingActionLabel}</strong>
                </div>
                <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-400 block">6. الموعد المتوقع الجديد</span>
                  <strong className="font-mono-num text-amber-400">
                    {inquiry.updatedExpectedDeliveryLabel}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs flex items-center justify-between">
                <span className="text-slate-400">
                  7. هل يحتاج الأمر إلى قرار من المدير؟
                </span>
                <strong
                  className={
                    inquiry.needsManagerDecision
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {inquiry.needsManagerDecision
                    ? 'نعم — يوصى باتخاذ إجراء إداري من الخيارات أدناه'
                    : 'لا — الشحنة تتحرك تلقائياً ضمن مسارها الطبيعي'}
                </strong>
              </div>
            </div>
          )}

          {/* Section 8: Manager Administrative Intervention Options */}
          {inquiry.availableManagerActions.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-300">
                القرارات والإجراءات الإدارية المتاحة للمدير (تؤثر في الخطوات القادمة):
              </h3>
              <div className="space-y-2">
                {inquiry.availableManagerActions.map((act) => (
                  <div
                    key={act.actionType}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold text-white">{act.label}</div>
                      <p className="text-slate-400 text-[11px]">{act.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onExecuteAdminAction(shipment.trackingNumber, act.actionType)
                      }
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {act.costPiastres > 0
                        ? `تنفيذ (${formatEGP(act.costPiastres)})`
                        : 'تنفيذ الإجراء'}
                    </button>
                  </div>
                ))}

                {shipment.status === 'DELIVERY_FAILED' && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-rose-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 flex-1">
                      <div className="font-bold text-rose-300">
                        اعتماد إرجاع الطرد للتاجر وإغلاق البوليصة (مرتجع)
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        يغلق الشحنة كمرتجع دون احتساب إيراد خدمة الشحن.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onReturnFailedShipment(shipment.trackingNumber)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      إغلاق كمرتجع
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 7: Chain of Custody & Operational Responsibility Log */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-slate-200">
                سلسلة العهدة والمسؤولية التشغيلية ({custodyChain.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                {custodyInvestigation.confirmedEvidence
                  ? `مسؤولية مثبتة: ${custodyInvestigation.responsibleEmployeeName}`
                  : 'فحص التلف/الفقدان: لا توجد مخالفة مثبتة (أو سبب غير محسوم)'}
              </span>
            </div>

            {custodyChain.length === 0 ? (
              <p className="text-slate-400 text-[11px]">
                لم تدخل الشحنة في عهدة المستودع أو المناديب بعد.
              </p>
            ) : (
              <div className="space-y-1.5">
                {custodyChain.map((cEvt) => (
                  <div
                    key={cEvt.id}
                    className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div>
                      <strong className="text-amber-300">{cEvt.actorName || cEvt.employeeName}</strong>{' '}
                      <span className="text-slate-400">
                        ({DEPARTMENT_LABELS_AR[cEvt.department || 'WAREHOUSE']})
                      </span>
                      <div className="text-slate-200 mt-0.5">{cEvt.conditionNote || cEvt.note}</div>
                    </div>
                    <span className="font-mono-num text-slate-400 whitespace-nowrap">
                      اليوم {cEvt.day} · {cEvt.timeLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Financial Summary of Shipment */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
            <h3 className="font-bold text-slate-300">البيانات المالية الفعلية للبوليصة</h3>
            <div className="text-slate-400">
              شروط الدفع: <strong className="text-slate-200">{PAYMENT_TERMS_LABELS_AR[shipment.paymentTerms]}</strong>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-400 block">رسوم الشحن</span>
                <strong className="font-mono-num text-emerald-400">
                  {formatEGP(
                    shipment.serviceFeePiastres -
                      (shipment.discountAppliedPiastres || 0)
                  )}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">تكلفة التشغيل المنصرفة</span>
                <strong className="font-mono-num text-rose-400">
                  {formatEGP(shipment.actualOperatingCostPiastres)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">أمانة تحصيل COD</span>
                <strong className="font-mono-num text-sky-400">
                  {formatEGP(shipment.codAmountPiastres)}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">الإيراد المكتسب</span>
                <strong className="font-mono-num text-white">
                  {formatEGP(shipment.revenueEarnedPiastres)}
                </strong>
              </div>
            </div>
          </div>

          {/* Complete Chronological Event Log */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2">
              السجل الزمني الكامل لأحداث الشحنة ({shipment.timeline.length})
            </h3>
            <div className="space-y-2">
              {[...shipment.timeline].reverse().map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 mb-1">
                    <span className="font-semibold text-amber-400">
                      {evt.timestampLabel}
                    </span>
                    <span>
                      {OPERATIONAL_LOCATION_LABELS_AR[evt.location]} ·{' '}
                      {DEPARTMENT_LABELS_AR[evt.department]}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{evt.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
