import React, { useState } from 'react';
import { validateCompanyNameInput } from '../services/firebaseService';

interface CompanyNameModalProps {
  currentCompanyName: string;
  companyNameChangeUsed: boolean;
  onClose: () => void;
  onConfirmRenameOnce: (newName: string) => Promise<void>;
}

export const CompanyNameModal: React.FC<CompanyNameModalProps> = ({
  currentCompanyName,
  companyNameChangeUsed,
  onClose,
  onConfirmRenameOnce,
}) => {
  const [draftName, setDraftName] = useState(currentCompanyName);
  const [step, setStep] = useState<'INPUT' | 'CONFIRM'>('INPUT');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyNameChangeUsed) return;

    const check = validateCompanyNameInput(draftName);
    if (!check.valid) {
      setValidationError(check.error || 'اسم الشركة غير صالح.');
      return;
    }
    if (check.sanitized === currentCompanyName) {
      setValidationError('الاسم المدخل مطابق للاسم الحالي للشركة.');
      return;
    }
    setValidationError(null);
    setDraftName(check.sanitized);
    setStep('CONFIRM');
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setValidationError(null);
    try {
      await onConfirmRenameOnce(draftName);
      onClose();
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'تعذر حفظ اسم الشركة الجديد.'
      );
      setStep('INPUT');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 safe-game-shell">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">
              إعدادات السجل التجاري واسم الشركة
            </h3>
            <p className="text-xs text-slate-400">
              يُسمح بتعديل الاسم الرسمي للشركة مرة واحدة فقط لكل حساب لاعب.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        {companyNameChangeUsed ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-xs text-slate-400">الاسم الرسمي المعتمد نهائياً:</div>
              <div className="text-base font-bold text-amber-400">
                {currentCompanyName}
              </div>
              <p className="text-xs text-emerald-400 pt-1">
                ✓ تم استهلاك فرصة التعديل الوحيدة المسموحة لهذا الحساب. الاسم مثبت في السجل التجاري السحابي ولا يمكن تغييره مجدداً.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
              >
                حسناً
              </button>
            </div>
          </div>
        ) : step === 'INPUT' ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="company-name-input"
                className="block text-xs font-semibold text-slate-300"
              >
                الاسم الجديد للشركة (من 3 إلى 60 حرفاً):
              </label>
              <input
                id="company-name-input"
                type="text"
                value={draftName}
                onChange={(e) => {
                  setDraftName(e.target.value);
                  setValidationError(null);
                }}
                maxLength={60}
                placeholder="مثال: شركة المحروسة للشحن السريع"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
              تنبيه هام: يمكنك تغيير اسم الشركة <strong>مرة واحدة فقط</strong> طوال عمر الحساب. بعد التأكيد سيتم قفل التعديل نهائياً في قاعدة البيانات.
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                {validationError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                مراجعة وتأكيد الاسم
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/50 space-y-2">
              <div className="text-xs text-slate-400">
                هل أنت متأكد من اعتماد الاسم التالي نهائياً لشركتك؟
              </div>
              <div className="text-lg font-bold text-amber-400">{draftName}</div>
              <div className="text-[11px] text-rose-300 pt-1">
                لا يمكن التراجع عن هذا القرار أو تغيير الاسم مرة أخرى بعد الضغط على «تأكيد نهائي».
              </div>
            </div>

            {validationError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200">
                {validationError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('INPUT')}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                تعديل النص
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                {isSubmitting ? 'جاري التوثيق السحابي...' : 'تأكيد نهائي وتثبيت الاسم'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
