import React from 'react';
import { formatEGP } from '../engine/financeEngine';
import { Client, Employee, Vehicle } from '../types/game';
import { CharacterPortrait } from './OfficeVisualScene';

interface FleetStaffClientsPanelProps {
  employees: Employee[];
  vehicles: Vehicle[];
  clients: Client[];
}

export const FleetStaffClientsPanel: React.FC<FleetStaffClientsPanelProps> = ({
  employees,
  vehicles,
  clients,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Employees & Vehicles Column (6 cols) */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 pb-2 border-b border-slate-800">
            فريق العمل والمناديب ({employees.length})
          </h3>
          <div className="space-y-2.5">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{emp.name}</div>
                  <div className="text-slate-400 mt-0.5">
                    {emp.roleTitleAr} · الراتب اليومي:{' '}
                    <span className="font-mono-num text-slate-200">
                      {formatEGP(emp.dailyWagePiastres)}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  {emp.dailyCapacity > 0 ? (
                    <span className="font-mono-num font-semibold text-amber-400">
                      الطلبيات اليوم: {emp.assignedShipmentsToday} / {emp.dailyCapacity}
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">إشراف مكتبي</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 pb-2 border-b border-slate-800">
            أسطول المركبات وحالة الصيانة ({vehicles.length})
          </h3>
          <div className="space-y-2.5">
            {vehicles.map((veh) => (
              <div
                key={veh.id}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{veh.name}</span>
                  <span
                    className={`font-semibold ${
                      veh.status === 'NEEDS_MAINTENANCE'
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {veh.status === 'NEEDS_MAINTENANCE'
                      ? 'متوقفة للصيانة'
                      : 'جاهزة للتشغيل'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between text-slate-400">
                  <span>
                    السعة المشغلة اليوم:{' '}
                    <strong className="font-mono-num text-slate-200">
                      {veh.usedCapacityToday} / {veh.capacity}
                    </strong>
                  </span>
                  <span>
                    الحالة الفنية:{' '}
                    <strong
                      className={`font-mono-num ${
                        veh.maintenanceHealth >= 70
                          ? 'text-emerald-400'
                          : veh.maintenanceHealth >= 35
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }`}
                    >
                      {veh.maintenanceHealth}%
                    </strong>
                  </span>
                  <span>
                    تكلفة المشوار:{' '}
                    <strong className="font-mono-num text-slate-200">
                      {formatEGP(veh.operatingCostPerTripPiastres)}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clients & Trust & Balances Column (6 cols) */}
      <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-3 pb-2 border-b border-slate-800">
          سجل التجار والعملاء ومستوى الثقة ({clients.length})
        </h3>
        <div className="space-y-3">
          {clients.map((cli) => (
            <div
              key={cli.id}
              className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CharacterPortrait avatarId={cli.avatarId} size="sm" />
                  <div>
                    <div className="font-bold text-white text-sm">{cli.name}</div>
                    <div className="text-slate-400">{cli.roleAr}</div>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-slate-400 block">مستوى الثقة:</span>
                  <span
                    className={`font-mono-num font-bold text-sm ${
                      cli.trustLevel >= 65
                        ? 'text-emerald-400'
                        : cli.trustLevel >= 45
                          ? 'text-amber-400'
                          : 'text-rose-400'
                    }`}
                  >
                    {cli.trustLevel} / 100
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-slate-400 block">
                    مستحقات آجلة لنا عند العميل:
                  </span>
                  <strong className="font-mono-num text-amber-400">
                    {formatEGP(cli.receivableBalancePiastres)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">
                    أمانات تحصيل (COD) مستحقة للتاجر:
                  </span>
                  <strong className="font-mono-num text-sky-400">
                    {formatEGP(cli.merchantCodBalancePiastres)}
                  </strong>
                </div>
              </div>

              {cli.history.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                  آخر تعامل: {cli.history[cli.history.length - 1].summary}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
