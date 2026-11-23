import React from 'react';
import { formatEGP } from '../engine/financeEngine';
import {
  getWarehouseUtilizationMetrics,
  SHIPMENT_STATUS_LABELS_AR,
} from '../engine/shipmentEngine';
import { GameState } from '../types/game';

interface WarehousePanelProps {
  state: GameState;
  onSelectShipment: (trackingNumber: string) => void;
  onExpandWarehouse?: (option: 'RENT_EXTERNAL_SPACE' | 'UPGRADE_SHELVES') => void;
  onMaintainSortingMachines?: () => void;
}

export const WarehousePanel: React.FC<WarehousePanelProps> = ({
  state,
  onSelectShipment,
  onExpandWarehouse,
  onMaintainSortingMachines,
}) => {
  const warehouse = state.warehouses[0];
  if (!warehouse) return null;

  const sortingHealth = state.fleetAndEquipment?.sortingMachineHealth ?? 88;
  const whMetrics = getWarehouseUtilizationMetrics(state);
  const warehouseStaff = state.employees.filter(
    (e) =>
      e.status !== 'TERMINATED' &&
      (e.role === 'WAREHOUSE_CLERK' || e.role === 'OPERATIONS_SUPERVISOR')
  );

  const allInsideShipments = [
    ...whMetrics.queues.arrived,
    ...whMetrics.queues.waitingSorting,
    ...whMetrics.queues.sorting,
    ...whMetrics.queues.waitingPackaging,
    ...whMetrics.queues.preparing,
    ...whMetrics.queues.readyForDispatch,
    ...whMetrics.queues.delayedOrUnlocated,
  ];

  return (
    <div className="space-y-4">
      {/* Top Warehouse Overview & Physical Capacity Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">{warehouse.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              الموقع: {warehouse.locationAr} · تُدار السعة بعدد الطرود والوزن الفعلي (كجم) والحجم (م³) وحالة ماكينات الفرز
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>
              حالة ماكينات الفرز:{' '}
              <strong
                className={`font-mono-num ${
                  sortingHealth <= 25
                    ? 'text-rose-400'
                    : sortingHealth <= 55
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {sortingHealth}%
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              كفاءة الفرز:{' '}
              <strong className="font-mono-num text-emerald-400">
                {warehouse.efficiencyLevel}%
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              التشغيل اليومي:{' '}
              <strong className="font-mono-num text-amber-300">
                {formatEGP(warehouse.operatingCostPerDayPiastres)}
              </strong>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {onMaintainSortingMachines && (
                <button
                  type="button"
                  onClick={onMaintainSortingMachines}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  صيانة ماكينات الفرز (150 ج.م)
                </button>
              )}
              {onExpandWarehouse && (
                <>
                  <button
                    type="button"
                    onClick={() => onExpandWarehouse('RENT_EXTERNAL_SPACE')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    استئجار مساحة خارجية (250 ج.م)
                  </button>
                  <button
                    type="button"
                    onClick={() => onExpandWarehouse('UPGRADE_SHELVES')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
                  >
                    توسيع أرفف المستودع (450 ج.م)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Physical Weight (kg), Volume (m³) & Count Capacity Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Shipment Count Bar */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">إشغال عدد الشحنات</span>
              <strong className="font-mono-num text-white">
                {whMetrics.insideShipmentsCount} / {whMetrics.maxCapacity} شحنات
              </strong>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  whMetrics.insideShipmentsCount >= whMetrics.maxCapacity
                    ? 'bg-rose-500'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (whMetrics.insideShipmentsCount / Math.max(1, whMetrics.maxCapacity)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Physical Weight (kg) Bar */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الوزن المشغول / المتبقي (كجم)</span>
              <strong className="font-mono-num text-amber-300">
                {whMetrics.usedWeightKg} / {whMetrics.maxWeightKg} كجم (متاح {whMetrics.remainingWeightKg} كجم)
              </strong>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  whMetrics.weightPercent >= 90
                    ? 'bg-rose-500'
                    : whMetrics.weightPercent >= 70
                      ? 'bg-amber-500'
                      : 'bg-sky-500'
                }`}
                style={{ width: `${whMetrics.weightPercent}%` }}
              />
            </div>
          </div>

          {/* Physical Volume (m³) Bar */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الحجم المشغول / المتبقي (م³)</span>
              <strong className="font-mono-num text-emerald-300">
                {whMetrics.usedVolumeM3} / {whMetrics.maxVolumeM3} م³ (متاح {whMetrics.remainingVolumeM3} م³)
              </strong>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  whMetrics.volumePercent >= 90
                    ? 'bg-rose-500'
                    : whMetrics.volumePercent >= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${whMetrics.volumePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 6 Granular Queue Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">وصلت / تنتظر الفرز</span>
            <strong className="text-sm font-mono-num text-amber-400 mt-1 block">
              {whMetrics.queues.arrived.length + whMetrics.queues.waitingSorting.length}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">قيد الفرز والتغليف</span>
            <strong className="text-sm font-mono-num text-sky-400 mt-1 block">
              {whMetrics.queues.sorting.length +
                whMetrics.queues.waitingPackaging.length +
                whMetrics.queues.preparing.length}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">جاهزة لاستلام المندوب</span>
            <strong className="text-sm font-mono-num text-emerald-400 mt-1 block">
              {whMetrics.queues.readyForDispatch.length}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">متأخرة أو قيد البحث</span>
            <strong className="text-sm font-mono-num text-rose-400 mt-1 block">
              {whMetrics.queues.delayedOrUnlocated.length}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">حالة سعة المستودع</span>
            <strong
              className={`text-sm mt-1 block ${
                whMetrics.statusTone === 'OVERLOADED'
                  ? 'text-rose-400'
                  : whMetrics.statusTone === 'NEARING_LIMIT'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
              }`}
            >
              {whMetrics.statusTone === 'OVERLOADED'
                ? 'ممتلئ / مزدحم'
                : whMetrics.statusTone === 'NEARING_LIMIT'
                  ? 'يقترب من الحد'
                  : 'ضمن السعة الآمنة'}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block">طاقم المستودع النشط</span>
            <strong className="text-sm font-mono-num text-white mt-1 block">
              {warehouseStaff.length} موظفين
            </strong>
          </div>
        </div>
      </div>

      {/* Bottom 2-Column Split: Active Shipments Inside Warehouse + Warehouse Staff & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Shipments Currently in Warehouse (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white pb-3 mb-3 border-b border-slate-800">
            طابور الشحنات داخل المستودع حالياً ({allInsideShipments.length})
          </h3>

          {allInsideShipments.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              لا توجد شحنات متبقية داخل المستودع حالياً — تم تسليم جميع الشحنات الجاهزة للمناديب.
            </div>
          ) : (
            <div className="space-y-2.5">
              {allInsideShipments.map((sh) => (
                <div
                  key={sh.trackingNumber}
                  onClick={() => onSelectShipment(sh.trackingNumber)}
                  className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/60 transition-colors cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-num font-bold text-amber-400">
                        {sh.trackingNumber}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-semibold text-white">
                        {sh.clientName}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-num text-[11px]">
                        {sh.weightKg ?? 4} كجم · {sh.volumeM3 ?? 0.15} م³
                      </span>
                      <span className="text-slate-400">
                        ({sh.shelfLocation || 'منطقة الاستلام'})
                      </span>
                    </div>
                    <div className="text-slate-400">
                      الحالة:{' '}
                      <strong className="text-slate-200">
                        {SHIPMENT_STATUS_LABELS_AR[sh.status]}
                      </strong>{' '}
                      · الوجهة: {sh.deliveryZone}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShipment(sh.trackingNumber);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    فحص الشحنة والعهدة
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Warehouse Staff & Audit Log (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-300 pb-2 mb-2.5 border-b border-slate-800">
              مسؤولو الاستلام والفرز بالمستودع
            </h3>
            <div className="space-y-2">
              {warehouseStaff.map((emp) => (
                <div
                  key={emp.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{emp.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {emp.roleTitleAr}
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-emerald-400 font-mono-num font-bold">
                      الأداء: {emp.performanceScore ?? emp.efficiency}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-300 pb-2 mb-2.5 border-b border-slate-800">
              سجل الاستلام والتجهيز والتسليم للمندوبين ({warehouse.logs.length})
            </h3>
            <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
              {warehouse.logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                    <span className="font-mono-num text-amber-400 font-semibold">
                      {log.timeLabel} — {log.trackingNumber}
                    </span>
                    <span>
                      {log.staffName} · {log.shelfLocation}
                    </span>
                  </div>
                  <p className="text-slate-200">{log.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
