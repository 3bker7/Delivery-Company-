import React from 'react';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Cpu,
  Fuel,
  Gauge,
  PackageCheck,
  ShieldAlert,
  Settings,
  Truck,
  Wrench,
} from 'lucide-react';
import { egpToPiastres, formatEGP } from '../engine/financeEngine';
import { getWarehouseUtilizationMetrics } from '../engine/shipmentEngine';
import { GameState } from '../types/game';

interface MaintenancePanelProps {
  state: GameState;
  onRefuelFleet: () => void;
  onMaintainSortingMachines: () => void;
  onMaintainAdminSystems: () => void;
  onMaintainVehicle: (vehicleId: string, mode: 'FULL' | 'QUICK') => void;
  onExpandWarehouse: (option: 'RENT_EXTERNAL_SPACE' | 'UPGRADE_SHELVES') => void;
}

export const MaintenancePanel: React.FC<MaintenancePanelProps> = ({
  state,
  onRefuelFleet,
  onMaintainSortingMachines,
  onMaintainAdminSystems,
  onMaintainVehicle,
  onExpandWarehouse,
}) => {
  const fleet = state.fleetAndEquipment || {
    fuelLevelPercent: 85,
    sortingMachineHealth: 88,
    adminSystemHealth: 94,
    lastRefueledDay: 1,
    lastMachineMaintainedDay: 1,
    activeBreakdowns: [],
  };
  const whMetrics = getWarehouseUtilizationMetrics(state);

  const refuelCost = egpToPiastres(120);
  const sortingMaintCost = egpToPiastres(180);
  const adminMaintCost = egpToPiastres(95);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">
                مركز الصيانة الشاملة للأصول والأسطول والمستودعات
              </h2>
              <p className="text-[11px] text-slate-400">
                تابع حالة المركبات، رصيد الوقود، ماكينات الفرز والتغليف، والأنظمة الإدارية. الصيانة الوقائية تمنع تعطل الشحنات وتوفر الوقود.
              </p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300">
            السيولة المتاحة للصيانة:{' '}
            <span className="text-emerald-400 font-black">
              {formatEGP(state.company.cashPiastres)}
            </span>
          </div>
        </div>
      </div>

      {/* Core Operational Infrastructure Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Fleet Fuel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black text-white">رصيد وقود وبنزين الأسطول</h3>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  fleet.fuelLevelPercent >= 70
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : fleet.fuelLevelPercent >= 35
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {fleet.fuelLevelPercent}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden mb-2.5 border border-slate-800">
              <div
                className={`h-full transition-all ${
                  fleet.fuelLevelPercent >= 70
                    ? 'bg-emerald-500'
                    : fleet.fuelLevelPercent >= 35
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${fleet.fuelLevelPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              <strong className="text-rose-300">أثر الإهمال:</strong> نفاد الوقود يوقف خروج المناديب تماماً ويعرض الطلبات للخطف من المنافسين.
            </p>
          </div>
          <button
            onClick={onRefuelFleet}
            disabled={
              fleet.fuelLevelPercent >= 100 ||
              state.company.cashPiastres < refuelCost
            }
            className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black transition cursor-pointer"
          >
            {fleet.fuelLevelPercent >= 100
              ? 'خزان الوقود ممتلئ (100%)'
              : `تزويد وقود الأسطول لـ 100% (${formatEGP(refuelCost)})`}
          </button>
        </div>

        {/* 2. Warehouse Sorting & Packaging Machines */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black text-white">ماكينات الفرز والتغليف بالمستودع</h3>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded ${
                  fleet.sortingMachineHealth >= 75
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : fleet.sortingMachineHealth >= 45
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {fleet.sortingMachineHealth}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden mb-2.5 border border-slate-800">
              <div
                className={`h-full transition-all ${
                  fleet.sortingMachineHealth >= 75
                    ? 'bg-sky-500'
                    : fleet.sortingMachineHealth >= 45
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
                style={{ width: `${fleet.sortingMachineHealth}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              <strong className="text-rose-300">أثر الإهمال:</strong> تراجع كفاءة السيور يضاعف وقت تجهيز الشحنات بالمستودع ويرفع نسبة تلف الطرود القابلة للكسر.
            </p>
          </div>
          <button
            onClick={onMaintainSortingMachines}
            disabled={
              fleet.sortingMachineHealth >= 100 ||
              state.company.cashPiastres < sortingMaintCost
            }
            className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black transition cursor-pointer"
          >
            {fleet.sortingMachineHealth >= 100
              ? 'ماكينات الفرز بأعلى كفاءة (100%)'
              : `صيانة شاملة لماكينات الفرز (${formatEGP(sortingMaintCost)})`}
          </button>
        </div>

        {/* 3. Admin & Accounting Systems */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-black text-white">الأنظمة الإدارية والمحاسبية</h3>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                {fleet.adminSystemHealth}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden mb-2.5 border border-slate-800">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${fleet.adminSystemHealth}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              <strong className="text-rose-300">أثر الإهمال:</strong> بطء النظام الإداري يؤخر مراجعة المحاسب لطلبات الشحن الجديدة وتحديث البوالص.
            </p>
          </div>
          <button
            onClick={onMaintainAdminSystems}
            disabled={
              fleet.adminSystemHealth >= 100 ||
              state.company.cashPiastres < adminMaintCost
            }
            className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black transition cursor-pointer"
          >
            {fleet.adminSystemHealth >= 100
              ? 'النظام الإداري يعمل بكفاءة 100%'
              : `تحديث وصيانة الأنظمة الإدارية (${formatEGP(adminMaintCost)})`}
          </button>
        </div>
      </div>

      {/* Fleet Vehicles Maintenance Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <h3 className="text-xs font-black text-white mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-400" />
          صيانة مركبات الأسطول (موتوسيكلات وسيارات التوصيل)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {state.vehicles.map((veh) => {
            const health = veh.maintenanceHealth ?? 80;
            const needsMaint =
              veh.status === 'NEEDS_MAINTENANCE' || health < 65;
            const fullCost =
              veh.type === 'CARGO_VAN' ? egpToPiastres(450) : egpToPiastres(250);
            const quickCost =
              veh.type === 'CARGO_VAN' ? egpToPiastres(180) : egpToPiastres(90);

            return (
              <div
                key={veh.id}
                className={`rounded-xl border p-3 ${
                  needsMaint
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {veh.type === 'MOTORCYCLE' ? (
                      <Bike className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Truck className="w-4 h-4 text-sky-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-black text-white">{veh.name}</div>
                      <div className="text-[10px] text-slate-400">{veh.typeAr}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      health >= 75
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : health >= 45
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    كفاءة {health}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 mb-3">
                  <div>
                    الأولوية:{' '}
                    <strong className={needsMaint ? 'text-rose-400' : 'text-emerald-400'}>
                      {health < 35
                        ? 'حرجة جداً (متوقفة عن العمل)'
                        : needsMaint
                          ? 'متوسطة (تحتاج صيانة وقائية)'
                          : 'سليمة وجاهزة للرحلات'}
                    </strong>
                  </div>
                  <div>
                    أثر الإهمال: ارتفاع تكلفة الرحلة ({formatEGP(veh.operatingCostPerTripPiastres || 4500)}) واحتمال تعطل الشحنة بالطريق.
                  </div>
                </div>

                {health >= 98 && veh.status !== 'NEEDS_MAINTENANCE' ? (
                  <div className="py-1.5 px-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>المركبة بحالة فنية ممتازة</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => onMaintainVehicle(veh.id, 'FULL')}
                      disabled={state.company.cashPiastres < fullCost}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[11px] font-black transition cursor-pointer"
                    >
                      صيانة شاملة بالضمان لـ 100% ({formatEGP(fullCost)})
                    </button>
                    <button
                      onClick={() => onMaintainVehicle(veh.id, 'QUICK')}
                      disabled={state.company.cashPiastres < quickCost}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition cursor-pointer"
                    >
                      إصلاح سريع مؤقت ({formatEGP(quickCost)})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Warehouse Infrastructure & Shelving */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="text-xs font-black text-white flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-sky-400" />
              صيانة وتوسعة البنية التحتية للمستودع ({whMetrics.warehouseName})
            </h3>
            <p className="text-[11px] text-slate-400">
              الإشغال الحالي: {whMetrics.insideShipmentsCount} / {whMetrics.maxCapacity} طرود • الوزن المتاح: {whMetrics.remainingWeightKg} كجم • الحجم المتاح: {whMetrics.remainingVolumeM3} م³
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExpandWarehouse('RENT_EXTERNAL_SPACE')}
              disabled={state.company.cashPiastres < egpToPiastres(250)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer disabled:opacity-40"
            >
              استئجار ساحة مساندة (+4 طرود — 250 ج.م)
            </button>
            <button
              onClick={() => onExpandWarehouse('UPGRADE_SHELVES')}
              disabled={state.company.cashPiastres < egpToPiastres(450)}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black transition cursor-pointer disabled:opacity-40"
            >
              ترقية أرفف الفرز المعدنية (+6 طرود — 450 ج.م)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
