import React from 'react';
import { formatEGP } from '../engine/financeEngine';
import { DELIVERY_RESULT_LABELS_AR } from '../engine/shipmentEngine';
import { CourierStatus, GameState } from '../types/game';

interface CouriersPanelProps {
  state: GameState;
  onSelectShipment: (trackingNumber: string) => void;
  onRefuelFleet?: () => void;
  onRepairVehicle?: (vehicleId: string) => void;
}

const COURIER_STATUS_LABELS_AR: Record<CourierStatus, string> = {
  AVAILABLE: 'متاح للاستلام',
  ON_MISSION: 'في مهمة توصيل',
  ON_BREAK: 'في استراحة',
  UNAVAILABLE: 'غير متاح',
};

export const CouriersPanel: React.FC<CouriersPanelProps> = ({
  state,
  onSelectShipment,
  onRefuelFleet,
  onRepairVehicle,
}) => {
  const fuelLevel = state.fleetAndEquipment?.fuelLevelPercent ?? 85;

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="pb-4 mb-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">
              أسطول المندوبين والوقود والتوصيل الميداني التلقائي
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              يستهلك كل مشوار توصيل وقوداً من خزان الأسطول ويؤثر على كفاءة المركبة. عند نفاد البنزين أو تعطل المركبات يتوقف خروج الشحنات.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>
              مستوى وقود الأسطول:{' '}
              <strong
                className={`font-mono-num ${
                  fuelLevel <= 20
                    ? 'text-rose-400'
                    : fuelLevel <= 50
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {fuelLevel}%
              </strong>
            </span>
            {onRefuelFleet && (
              <button
                type="button"
                onClick={onRefuelFleet}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                ⛽ تموين بنزين للأسطول (120 ج.م)
              </button>
            )}
            <span className="text-slate-400">
              المناديب: <strong className="text-white">{state.couriers.length}</strong> · المركبات: <strong className="text-white">{state.vehicles.length}</strong>
            </span>
          </div>
        </div>

        {/* Couriers Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {state.couriers.map((courier) => {
            const vehicle = state.vehicles.find(
              (v) => v.id === courier.vehicleId
            );

            return (
              <div
                key={courier.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {courier.name}
                    </h3>
                    <p className="text-slate-400 mt-0.5">
                      نطاق التوزيع: <strong className="text-slate-200">{courier.zoneAr}</strong>
                    </p>
                  </div>

                  <span
                    className={`font-bold ${
                      courier.status === 'AVAILABLE'
                        ? 'text-emerald-400'
                        : courier.status === 'ON_MISSION'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {COURIER_STATUS_LABELS_AR[courier.status]}
                  </span>
                </div>

                {/* Courier Operational Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block">الحمولة الحالية</span>
                    <strong className="font-mono-num text-white mt-0.5 block">
                      {courier.currentLoad} / {courier.maxLoad} شحنات
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">مستوى الكفاءة</span>
                    <strong className="font-mono-num text-emerald-400 mt-0.5 block">
                      {courier.efficiency}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">توصيلات ناجحة</span>
                    <strong className="font-mono-num text-emerald-400 mt-0.5 block">
                      {courier.successfulDeliveriesCount}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">تأخير / تعذر</span>
                    <strong className="font-mono-num text-rose-400 mt-0.5 block">
                      {courier.failedOrDelayedCount}
                    </strong>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                  <span>
                    المركبة: <strong className="text-slate-200">{vehicle?.name || '—'}</strong> (كفاءة{' '}
                    <strong
                      className={
                        (vehicle?.maintenanceHealth ?? 0) <= 30
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }
                    >
                      {vehicle?.maintenanceHealth ?? 0}%
                    </strong>
                    )
                  </span>
                  <div className="flex items-center gap-2">
                    <span>
                      تكلفة المشوار:{' '}
                      <strong className="font-mono-num text-amber-300">
                        {formatEGP(courier.tripOperatingCostPiastres)}
                      </strong>
                    </span>
                    {vehicle &&
                      onRepairVehicle &&
                      (vehicle.maintenanceHealth < 90 ||
                        vehicle.status === 'NEEDS_MAINTENANCE') && (
                        <button
                          type="button"
                          onClick={() => onRepairVehicle(vehicle.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                        >
                          صيانة المركبة (160 ج.م)
                        </button>
                      )}
                  </div>
                </div>

                {/* Currently Assigned Shipments */}
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 font-semibold block mb-1.5">
                    الشحنات المسندة حالياً ({courier.assignedTrackingNumbers.length}):
                  </span>
                  {courier.assignedTrackingNumbers.length === 0 ? (
                    <span className="text-slate-500">
                      لا توجد شحنات في عهدة المندوب حالياً.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {courier.assignedTrackingNumbers.map((trk) => (
                        <button
                          key={trk}
                          type="button"
                          onClick={() => onSelectShipment(trk)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono-num font-bold cursor-pointer"
                        >
                          {trk} (عرض التتبع)
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delivery History Log */}
                {courier.deliveryHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-1.5">
                      آخر محاولات التوصيل المسجلة:
                    </span>
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {courier.deliveryHistory.slice(0, 4).map((rec) => (
                        <div
                          key={rec.id}
                          className="p-2 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-2"
                        >
                          <span>
                            <strong className="font-mono-num text-amber-400">
                              {rec.trackingNumber}
                            </strong>{' '}
                            — {rec.note}
                          </span>
                          <span
                            className={`font-semibold whitespace-nowrap ${
                              rec.result === 'DELIVERED_SUCCESS'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {DELIVERY_RESULT_LABELS_AR[rec.result]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All Registered Company Vehicles Section (including Van needing repair) */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <h3 className="text-xs sm:text-sm font-bold text-white mb-3">
            حالة المركبات المسجلة وصيانة الأعطال الميكانيكية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {state.vehicles.map((veh) => (
              <div
                key={veh.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-white">{veh.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    النوع: {veh.typeAr} · السعة: {veh.capacity} طرود/مشوار
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span>
                    الحالة الفنية:{' '}
                    <strong
                      className={`font-mono-num ${
                        veh.status === 'NEEDS_MAINTENANCE' ||
                        veh.maintenanceHealth <= 25
                          ? 'text-rose-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {veh.maintenanceHealth}%
                    </strong>
                  </span>
                  {onRepairVehicle &&
                    (veh.maintenanceHealth < 95 ||
                      veh.status === 'NEEDS_MAINTENANCE') && (
                      <button
                        type="button"
                        onClick={() => onRepairVehicle(veh.id)}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        إصلاح ({veh.type === 'CARGO_VAN' ? '240 ج.م' : '160 ج.م'})
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

