import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Truck,
  Warehouse,
  X,
} from 'lucide-react';
import { TimedShipmentToast } from '../types/game';

interface TimedShipmentToastsProps {
  toasts: TimedShipmentToast[];
  onSelectToast: (toast: TimedShipmentToast) => void;
  onDismissToast: (toastId: string) => void;
}

export const TimedShipmentToasts: React.FC<TimedShipmentToastsProps> = ({
  toasts,
  onSelectToast,
  onDismissToast,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!toasts || toasts.length === 0) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, [toasts]);

  // Auto-dismiss expired toasts cleanly
  useEffect(() => {
    if (!toasts || toasts.length === 0) return;
    for (const t of toasts) {
      if (!t.dismissed && nowMs - t.createdAtMs >= t.durationMs) {
        onDismissToast(t.id);
      }
    }
  }, [nowMs, toasts, onDismissToast]);

  const activeToasts = (toasts || []).filter(
    (t) => !t.dismissed && nowMs - t.createdAtMs < t.durationMs
  );

  if (activeToasts.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="fixed bottom-14 left-3 z-50 flex flex-col gap-1.5 max-w-xs sm:max-w-sm pointer-events-none"
    >
      {activeToasts.slice(0, 3).map((t) => {
        const elapsed = Math.max(0, nowMs - t.createdAtMs);
        const progressPercent = Math.max(
          0,
          Math.min(100, 100 - (elapsed / t.durationMs) * 100)
        );

        const toneClasses =
          t.stage === 'NEW_ORDER'
            ? 'bg-amber-950/95 border-amber-500/60 text-amber-100'
            : t.stage === 'AT_WAREHOUSE'
              ? 'bg-sky-950/95 border-sky-500/60 text-sky-100'
              : t.stage === 'WITH_COURIER'
                ? 'bg-indigo-950/95 border-indigo-500/60 text-indigo-100'
                : t.stage === 'DELIVERED'
                  ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100'
                  : 'bg-rose-950/95 border-rose-500/60 text-rose-100';

        const StageIcon =
          t.stage === 'NEW_ORDER'
            ? Package
            : t.stage === 'AT_WAREHOUSE'
              ? Warehouse
              : t.stage === 'WITH_COURIER'
                ? Truck
                : t.stage === 'DELIVERED'
                  ? CheckCircle2
                  : AlertCircle;

        return (
          <div
            key={t.id}
            onClick={() => onSelectToast(t)}
            className={`pointer-events-auto cursor-pointer rounded-xl border px-3 py-2 shadow-xl backdrop-blur-md transition transform hover:scale-[1.01] ${toneClasses}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <StageIcon className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-black leading-snug truncate">
                    {t.messageAr}
                  </div>
                  <div className="text-[9px] opacity-80 font-bold">
                    اضغط لفتح تفاصيل الشحنة ({t.trackingNumber}) • مدة الإشعار {t.durationMs / 1000} ثوانٍ
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissToast(t.id);
                }}
                className="p-0.5 rounded hover:bg-black/25 text-white/70 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-white/70 transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
