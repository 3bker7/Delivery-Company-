import React from 'react';
import { INTRO_SLIDES } from '../engine/storyEngine';
import { CharacterPortrait } from './OfficeVisualScene';

interface IntroStoryOverlayProps {
  currentStep: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onStartDayOne: () => void;
}

export const IntroStoryOverlay: React.FC<IntroStoryOverlayProps> = ({
  currentStep,
  onNextStep,
  onPrevStep,
  onStartDayOne,
}) => {
  const slide = INTRO_SLIDES[currentStep] || INTRO_SLIDES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header Strip */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-amber-400">
              انجوبيا اكسبريس — Ingobia Express
            </span>
            <span aria-hidden="true">·</span>
            <span>بطاقة استلام الإدارة والعمليات — اليوم 1</span>
          </div>
          <button
            type="button"
            onClick={onStartDayOne}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer whitespace-nowrap"
          >
            الانتقال إلى العمل مباشرة ←
          </button>
        </div>

        {/* Main Concise Operational Briefing Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Left: Concise Operational Summary Cards (7 cols) */}
          <div className="md:col-span-7 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-400">اسم الشركة وحالتها</span>
              <strong className="text-sm text-white mt-1">
                انجوبيا اكسبريس (العباسية)
              </strong>
              <span className="text-[11px] text-amber-400 mt-0.5">
                السمعة: 62/100 · رضا العملاء: 60%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-400">السيولة المتاحة والالتزامات</span>
              <strong className="text-sm font-mono-num text-emerald-400 mt-1">
                2,500.00 ج.م بالخزينة
              </strong>
              <span className="text-[11px] font-mono-num text-rose-300 mt-0.5">
                التزامات مستحقة: 600.00 ج.م
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-slate-400">الطلبات الحالية والسعة</span>
              <strong className="text-sm text-white mt-1">
                3 شحنات (1 جاهزة + 2 جديدة)
              </strong>
              <span className="text-[11px] text-sky-300 mt-0.5">
                سعة المستودع: 8 طرود (180 كجم / 6.5 م³)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 flex flex-col justify-between">
              <span className="text-amber-300 font-semibold">أهم مهمة مطلوبة الآن</span>
              <strong className="text-xs text-white mt-1 leading-snug">
                حسم قرارات اليوم الأول وإخراج شحنة الدقي (TRK-1001)
              </strong>
              <span className="text-[11px] text-slate-400 mt-0.5">
                دورة الرواتب: كل 8 أيام عمل
              </span>
            </div>

            {/* Brief Speaker Note */}
            <div className="col-span-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
              <CharacterPortrait avatarId={slide.speakerAvatarId} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <strong className="text-amber-400 text-xs">
                    {slide.speakerName} ({slide.speakerRole})
                  </strong>
                  <div className="flex items-center gap-1">
                    {INTRO_SLIDES.map((s, idx) => (
                      <button
                        key={s.step}
                        type="button"
                        onClick={() => {
                          if (idx > currentStep) onNextStep();
                          if (idx < currentStep) onPrevStep();
                        }}
                        className={`w-2 h-2 rounded-full cursor-pointer ${
                          idx === currentStep ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                        aria-label={`شريحة ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  «{slide.dialogue}»
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Highlights & Primary CTA (5 cols) */}
          <div className="md:col-span-5 bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-300">
                ملخص جاهزية الأقسام الخمسة:
              </h3>
              {slide.highlights.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-0.5 text-xs"
                >
                  <span className="text-slate-400 text-[11px]">{item.label}</span>
                  <strong
                    className={
                      item.tone === 'warn'
                        ? 'text-amber-400'
                        : item.tone === 'good'
                          ? 'text-emerald-400'
                          : 'text-slate-100'
                    }
                  >
                    {item.value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={onStartDayOne}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg transition-colors cursor-pointer"
              >
                الانتقال إلى العمل وبدء التشغيل
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
