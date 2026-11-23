import React, { useState } from 'react';
import { DEPARTMENT_LABELS_AR } from '../engine/shipmentEngine';
import { AppNotification } from '../types/game';

interface NotificationsPanelProps {
  notifications: AppNotification[];
  onOpenShipment: (trackingNumber: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  onOpenShipment,
  onMarkAllRead,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'URGENT'>('ALL');

  const filtered = notifications.filter((n) => {
    if (filterType === 'URGENT') {
      return n.severity === 'URGENT' || n.severity === 'WARNING';
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white">
            مركز الإشعارات وسجل التنبيهات التشغيلية
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تُسجل الإشعارات آلياً عند حدوث انتقالات فعلية في المستودع أو التوزيع أو عند تأخر الشحنات. اضغط على أي إشعار مرتبط بشحنة لفتح تفاصيلها فوراً.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'ALL'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              كل الإشعارات ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('URGENT')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors cursor-pointer whitespace-nowrap ${
                filterType === 'URGENT'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              تنبيهات التأخير والمشكلات فقط
            </button>
          </div>

          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer whitespace-nowrap"
          >
            تحديد الكل كمقروء
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400">
          لا توجد إشعارات مطابقة حالياً.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                if (notif.trackingNumber) {
                  onOpenShipment(notif.trackingNumber);
                }
              }}
              className={`p-3.5 rounded-xl border transition-colors text-xs ${
                notif.trackingNumber ? 'cursor-pointer' : ''
              } ${
                notif.severity === 'URGENT'
                  ? 'bg-rose-950/30 border-rose-800/70 hover:border-rose-600'
                  : notif.severity === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-800/60 hover:border-amber-500'
                    : notif.severity === 'SUCCESS'
                      ? 'bg-slate-950/80 border-slate-800 hover:border-emerald-700/60'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono-num font-bold text-amber-400">
                    اليوم {notif.day} · {notif.timeLabel}
                  </span>
                  {notif.trackingNumber && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="font-mono-num font-bold text-white">
                        {notif.trackingNumber}
                      </span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400">
                    القسم: {DEPARTMENT_LABELS_AR[notif.department]}
                  </span>
                </div>

                <span
                  className={`font-bold ${
                    notif.severity === 'URGENT'
                      ? 'text-rose-400'
                      : notif.severity === 'WARNING'
                        ? 'text-amber-400'
                        : notif.severity === 'SUCCESS'
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                  }`}
                >
                  النتيجة: {notif.outcomeLabel}
                </span>
              </div>

              <p className="text-slate-200 leading-relaxed">{notif.message}</p>

              {(notif.actionRequiredLabel || notif.trackingNumber) && (
                <div className="mt-2 pt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="text-amber-300">
                    {notif.actionRequiredLabel
                      ? `الإجراء المطلوب: ${notif.actionRequiredLabel}`
                      : 'اضغط لفتح ملف تتبع الشحنة'}
                  </span>
                  {notif.trackingNumber && (
                    <span className="font-semibold text-white underline">
                      فتح تفاصيل الشحنة {notif.trackingNumber}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
