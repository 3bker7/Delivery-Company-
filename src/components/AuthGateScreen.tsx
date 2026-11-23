import React from 'react';

interface AuthGateScreenProps {
  status: 'CHECKING_AUTH' | 'LOADING_PROFILE' | 'UNAUTHENTICATED' | 'ERROR';
  errorMessage?: string | null;
  onGoogleSignIn: () => void;
  onDirectLocalSignIn?: () => void;
  onRetryConnection: () => void;
  onRequestFullscreenLandscape: () => void;
  isInstallable?: boolean;
  onInstallPWA?: () => void;
  isSigningIn: boolean;
  publicVersionLabel: string;
}

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  status,
  errorMessage,
  onGoogleSignIn,
  onDirectLocalSignIn,
  onRetryConnection,
  onRequestFullscreenLandscape,
  isInstallable,
  onInstallPWA,
  isSigningIn,
  publicVersionLabel,
}) => {
  return (
    <div
      dir="rtl"
      className="h-dvh w-screen overflow-y-auto bg-slate-950 text-slate-100 safe-game-shell flex items-center justify-center p-4 select-none"
    >
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Right Column in RTL: Game Identity & Operational Overview */}
        <div className="md:col-span-6 p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-b md:border-b-0 md:border-l border-slate-800 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono-num text-amber-400">
              <span>محاكي إدارة اللوجستيات المصري</span>
              <span>·</span>
              <span>{publicVersionLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              انجوبيا اكسبريس — Ingobia Express
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تولَّ إدارة غرفة العمليات اللوجستية في القاهرة، وتابع دورة الشحنات الحية بين المستودع والمناديب، واضبط السيولة النقدية ودفتر الأستاذ العام لحظة بلحظة.
            </p>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">حفظ سحابي مستقل:</span>
              <span className="font-semibold text-emerald-400">
                مرتبط بحسابك في Google
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">تخصيص اسم الشركة:</span>
              <span className="font-semibold text-amber-300">
                متاح مرة واحدة لكل حساب
              </span>
            </div>
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={onRequestFullscreenLandscape}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-400 font-bold text-xs cursor-pointer transition-colors"
              >
                إخفاء شريط البحث والتبويبات (ملء الشاشة الكامل)
              </button>
              {isInstallable && onInstallPWA && (
                <button
                  type="button"
                  onClick={onInstallPWA}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  تثبيت اللعبة كتطبيق مستقل بدون متصفح (PWA)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Left Column in RTL: Auth / Loading / Error State */}
        <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-center bg-slate-950/50">
          {(status === 'CHECKING_AUTH' || status === 'LOADING_PROFILE') && (
            <div className="text-center space-y-4 py-6">
              <div className="w-10 h-10 rounded-full border-3 border-amber-400 border-t-transparent animate-spin mx-auto" />
              <div className="space-y-1.5">
                <h2 className="text-base font-bold text-white">
                  {status === 'CHECKING_AUTH'
                    ? 'جاري التحقق من جلسة الدخول...'
                    : 'جاري تحميل بيانات شركتك ودفتر الحسابات السحابي...'}
                </h2>
                <p className="text-xs text-slate-400">
                  يتم مزامنة حالة المستودع، الشحنات، والرصيد النقدي مع خادم قاعدة البيانات.
                </p>
              </div>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 space-y-2">
                <div className="text-sm font-bold text-rose-300">
                  تعذر الاتصال بخادم اللعبة أو استرجاع بيانات الحساب
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {errorMessage ||
                    'حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية. حفاظاً على سلامة تقدمك المحاسبي، لن يتم عرض بيانات وهمية.'}
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onRetryConnection}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  إعادة المحاولة الآن
                </button>
                {onDirectLocalSignIn && (
                  <button
                    type="button"
                    onClick={onDirectLocalSignIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    المتابعة بحفظ الجهاز المحلي مباشرة
                  </button>
                )}
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  تبديل الحساب أو إعادة تسجيل الدخول عبر Google
                </button>
              </div>
            </div>
          )}

          {status === 'UNAUTHENTICATED' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  تسجيل الدخول إلى غرفة العمليات
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  سجّل دخولك باستخدام حساب Google الخاص بك لحفظ تقدم شركتك وأرصدتك المالية سحابياً، أو ابدأ اللعب المباشر مع الحفظ التلقائي على جهازك.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-200 leading-relaxed">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isSigningIn}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer ${
                    isSigningIn
                      ? 'bg-slate-800 text-slate-400 cursor-wait'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                  }`}
                >
                  <svg
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.81-1.5 3.34-3.2 4.37v3.62h5.18c3.03-2.79 4.78-6.9 4.78-11.82 0-.81-.08-1.6-.22-2.36l.12.46z" />
                    <path d="M12.18 22c4.32 0 7.95-1.43 10.6-3.88l-5.18-3.62c-1.43.96-3.26 1.53-5.42 1.53-4.17 0-7.7-2.81-8.96-6.6H-2.1v3.73C.54 18.41 5.94 22 12.18 22z" />
                  </svg>
                  <span>
                    {isSigningIn
                      ? 'جاري فتح نافذة مصادقة Google...'
                      : 'الدخول بحساب Google وبدء اللعب'}
                  </span>
                </button>

                {onDirectLocalSignIn && (
                  <button
                    type="button"
                    onClick={onDirectLocalSignIn}
                    disabled={isSigningIn}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                  >
                    الدخول المباشر للعب (حفظ تلقائي كامل على هذا الجهاز)
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                تتم مزامنة جميع القرارات، الرواتب، الشحنات، ودفتر الأستاذ تلقائياً دون فقدان أي بيانات.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
