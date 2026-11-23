import React, { useState } from 'react';
import { formatClockTime, formatEGP } from '../engine/financeEngine';
import {
  runMandatoryVerificationTests,
  VerificationSuiteResult,
} from '../engine/verificationTests';
import {
  PERMANENT_DEV_URL,
  PERMANENT_PUBLIC_URL,
  ReleaseControlState,
  ReleaseHistoryItem,
} from '../services/firebaseService';
import { GameState } from '../types/game';

export type SandboxSimulationAction =
  | 'ADD_CASH_5K'
  | 'ADD_CASH_25K'
  | 'JUMP_TO_DAY_2'
  | 'JUMP_TO_DAY_3'
  | 'JUMP_TO_DAY_8'
  | 'ADVANCE_TIME_2H'
  | 'AUTO_COMPLETE_TODAY'
  | 'SPAWN_PLATFORM_ORDERS'
  | 'MAX_FLEET_AND_REPUTATION'
  | 'CLONE_LIVE_TO_SANDBOX'
  | 'RESET_SANDBOX_DAY_1';

interface DeveloperSettingsPanelProps {
  adminEmail: string;
  gameState: GameState;
  isStagingMode: boolean;
  onToggleStagingMode: (enableStaging: boolean) => void;
  onResetStagingSandbox: () => void;
  onRunSandboxAction: (action: SandboxSimulationAction) => void;
  onOpenSection: (
    section:
      | 'MAIN_CONTROL'
      | 'BUSINESS_DEVELOPER'
      | 'SHIPMENTS'
      | 'COURIERS'
      | 'EMPLOYEES'
      | 'LEDGER'
  ) => void;
  releaseControl: ReleaseControlState;
  onPublishRelease: (updated: ReleaseControlState) => Promise<void>;
}

export const DeveloperSettingsPanel: React.FC<DeveloperSettingsPanelProps> = ({
  adminEmail,
  gameState,
  isStagingMode,
  onToggleStagingMode,
  onResetStagingSandbox,
  onRunSandboxAction,
  onOpenSection,
  releaseControl,
  onPublishRelease,
}) => {
  const [candidateVersion, setCandidateVersion] = useState(
    releaseControl.candidateVersion
  );
  const [candidateSummary, setCandidateSummary] = useState(
    releaseControl.candidateSummary
  );
  const [adGateEnabled, setAdGateEnabled] = useState<boolean>(
    releaseControl.sponsoredAdGate?.enabled ?? true
  );
  const [adCountdownSeconds, setAdCountdownSeconds] = useState<number>(
    releaseControl.sponsoredAdGate?.countdownSeconds ?? 5
  );
  const [copiedUrlType, setCopiedUrlType] = useState<'DEV' | 'PUBLIC' | null>(
    null
  );
  const [testResult, setTestResult] = useState<VerificationSuiteResult | null>(
    null
  );
  const [confirmPromoteOpen, setConfirmPromoteOpen] = useState(false);
  const [rollbackTarget, setRollbackTarget] =
    useState<ReleaseHistoryItem | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    text: string;
    tone: 'success' | 'error' | 'info';
  } | null>(null);

  const activeEmployeesCount = (gameState.employees || []).filter(
    (e) => e.status !== 'TERMINATED'
  ).length;
  const activeShipmentsCount = (gameState.shipments || []).filter(
    (s) =>
      s.status !== 'DELIVERED' &&
      s.status !== 'REJECTED' &&
      s.status !== 'RETURNED' &&
      s.status !== 'CANCELLED_EXPIRED'
  ).length;
  const waitingPlatformOrdersCount = (
    gameState.businessDeveloper?.platformOrders || []
  ).filter((o) => o.status === 'WAITING_DISPATCH').length;

  const handleCopyUrl = async (url: string, type: 'DEV' | 'PUBLIC') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrlType(type);
      window.setTimeout(() => setCopiedUrlType(null), 2500);
    } catch {
      // Fallback
    }
  };

  const handleRunVerificationSuite = () => {
    const res = runMandatoryVerificationTests();
    setTestResult(res);
    setStatusNotice({
      text: res.allPassed
        ? `اجتازت النسخة المرشحة جميع الاختبارات البرمجية والمحاسبية بنجاح (${res.results.length}/${res.results.length}). يمكنك الآن اعتماد النشر على الرابط العام.`
        : 'فشل أحد اختبارات التحقق! راجع التفاصيل أدناه قبل النشر.',
      tone: res.allPassed ? 'success' : 'error',
    });
  };

  const handleSaveCandidateDraft = async () => {
    setIsPublishing(true);
    setStatusNotice(null);
    try {
      const next: ReleaseControlState = {
        ...releaseControl,
        candidateVersion:
          candidateVersion.trim() || releaseControl.candidateVersion,
        candidateSummary:
          candidateSummary.trim() || releaseControl.candidateSummary,
        sponsoredAdGate: {
          enabled: adGateEnabled,
          countdownSeconds: Math.max(3, Math.min(15, adCountdownSeconds)),
          sponsorTitleAr:
            releaseControl.sponsoredAdGate?.sponsorTitleAr ||
            'رعاية شركاء اللوجستيات والطاقة — انجوبيا اكسبريس',
          adMessageAr:
            releaseControl.sponsoredAdGate?.adMessageAr ||
            'شاهد هذا العرض الترويجي القصير للانتقال إلى يوم العمل الجديد وحفظ تقدمك.',
        },
      };
      await onPublishRelease(next);
      setStatusNotice({
        text: 'تم تحديث بيانات نسخة الاختبار وإعدادات إعلان اليوم الجديد بنجاح.',
        tone: 'info',
      });
    } catch (err) {
      setStatusNotice({
        text: err instanceof Error ? err.message : 'تعذر حفظ نسخة الاختبار.',
        tone: 'error',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmPromoteToPublic = async () => {
    const verification = testResult || runMandatoryVerificationTests();
    setTestResult(verification);
    if (!verification.allPassed) {
      setConfirmPromoteOpen(false);
      setStatusNotice({
        text: 'تم إيقاف النشر تلقائياً لأن أحد اختبارات سلامة اللعبة لم ينجح.',
        tone: 'error',
      });
      return;
    }

    setIsPublishing(true);
    setStatusNotice(null);
    try {
      const cleanVersion = candidateVersion.trim() || '3.3.0-public';
      const cleanSummary =
        candidateSummary.trim() || 'تحديث معتمد من لوحة تحكم المطور.';

      const newHistoryEntry: ReleaseHistoryItem = {
        version: cleanVersion,
        summary: cleanSummary,
        approvedByEmail: adminEmail,
        publishedAtIso: new Date().toISOString(),
      };

      const nextHistory = [
        newHistoryEntry,
        ...releaseControl.history.filter((h) => h.version !== cleanVersion),
      ].slice(0, 20);

      const nextState: ReleaseControlState = {
        publicVersion: cleanVersion,
        publicSummary: cleanSummary,
        candidateVersion: cleanVersion,
        candidateSummary: cleanSummary,
        approvedByEmail: adminEmail,
        sponsoredAdGate: {
          enabled: adGateEnabled,
          countdownSeconds: Math.max(3, Math.min(15, adCountdownSeconds)),
          sponsorTitleAr:
            releaseControl.sponsoredAdGate?.sponsorTitleAr ||
            'رعاية شركاء اللوجستيات والطاقة — انجوبيا اكسبريس',
          adMessageAr:
            releaseControl.sponsoredAdGate?.adMessageAr ||
            'شاهد هذا العرض الترويجي القصير للانتقال إلى يوم العمل الجديد وحفظ تقدمك.',
        },
        history: nextHistory,
      };

      await onPublishRelease(nextState);
      setConfirmPromoteOpen(false);
      setStatusNotice({
        text: `تم اعتماد ونشر الإصدار ${cleanVersion} على الرابط العام الثابت لجميع اللاعبين بنجاح، مع الحفاظ الكامل على بيانات وتقدم جميع الحسابات.`,
        tone: 'success',
      });
    } catch (err) {
      setStatusNotice({
        text: err instanceof Error ? err.message : 'تعذر نشر الإصدار للعامة.',
        tone: 'error',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmRollback = async () => {
    if (!rollbackTarget) return;
    setIsPublishing(true);
    setStatusNotice(null);
    try {
      const rollbackEntry: ReleaseHistoryItem = {
        version: rollbackTarget.version,
        summary: `[استرجاع/Rollback] ${rollbackTarget.summary}`,
        approvedByEmail: adminEmail,
        publishedAtIso: new Date().toISOString(),
      };

      const nextState: ReleaseControlState = {
        ...releaseControl,
        publicVersion: rollbackTarget.version,
        publicSummary: rollbackTarget.summary,
        approvedByEmail: adminEmail,
        history: [rollbackEntry, ...releaseControl.history].slice(0, 20),
      };

      await onPublishRelease(nextState);
      setRollbackTarget(null);
      setStatusNotice({
        text: `تم التراجع بنجاح إلى الإصدار المستقر (${rollbackTarget.version}) دون المساس بتقدم اللاعبين.`,
        tone: 'info',
      });
    } catch (err) {
      setStatusNotice({
        text: err instanceof Error ? err.message : 'تعذر تنفيذ التراجع.',
        tone: 'error',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono-num text-amber-400">
            صلاحيات المسؤول الموثق حصرياً · {adminEmail}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
            لوحة المطور الشاملة، محاكي الساند بوكس، وإدارة النشر على الرابط العام
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            حاكي جميع مسؤوليات اللعبة ومراحلها داخل الساند بوكس المعزول قبل اعتماد ونشر التحديث على الرابط العام للجمهور.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onToggleStagingMode(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              !isStagingMode
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟢 النسخة العامة (Live)
          </button>
          <button
            type="button"
            onClick={() => onToggleStagingMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              isStagingMode
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🟠 نسخة الاختبار (Staging Sandbox)
          </button>
        </div>
      </div>

      {/* Clear Explanation of Live vs Staging Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div
          className={`p-3.5 rounded-xl border ${
            !isStagingMode
              ? 'bg-emerald-950/30 border-emerald-500/50'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="font-bold text-emerald-400 mb-1">
            🟢 النسخة العامة (Live — ملف شركتك الأساسي الرسمي):
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            هي شركتك الفعلية الأساسية التي تلعب بها بشكل دائم. أي أموال أو عقود أو أيام تنجزها هنا تُحفظ في ملفك الرسمي، وهي النسخة المعتمدة للجمهور على الرابط العام.
          </p>
        </div>

        <div
          className={`p-3.5 rounded-xl border ${
            isStagingMode
              ? 'bg-amber-950/30 border-amber-500/50'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="font-bold text-amber-400 mb-1">
            🟠 نسخة الاختبار (Staging Sandbox — معمل تجارب المطور المعزول):
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            بيئة محاكاة معزولة 100% عن ملفك الأساسي. أي أداة محاكاة تضغط عليها بالأسفل تفعّل الساند بوكس تلقائياً لتختبر كل مسؤوليات اللعبة (الأيام، السيولة، العقود، الرواتب، الأوردرات) بحرية تامة قبل النشر للعامة.
          </p>
        </div>
      </div>

      {statusNotice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            statusNotice.tone === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : statusNotice.tone === 'error'
                ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                : 'bg-slate-900 border-amber-500/40 text-amber-300'
          }`}
        >
          <span>{statusNotice.text}</span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="underline cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Interactive Sandbox Responsibilities Simulator */}
      <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-black text-amber-400">
              🛠️ محاكي مسؤوليات الساند بوكس الشامل (Sandbox Responsibilities Simulator)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              اضغط على أي أداة بالأسفل لمحاكاة المسؤوليات فوراً داخل بيئة الاختبار (Staging) دون المساس بملفك الأساسي:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>
              الوضع الحالي:{' '}
              <strong className={isStagingMode ? 'text-amber-400' : 'text-emerald-400'}>
                {isStagingMode ? 'ساند بوكس الاختبار (Staging)' : 'النسخة العامة (Live)'}
              </strong>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              اليوم: <strong className="font-mono-num text-white">{gameState.company.currentDay}</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span dir="ltr" className="font-mono-num text-amber-300 font-bold">
              {formatClockTime(gameState.clock.minutesFromMidnight)}
            </span>
            <span className="text-slate-700">|</span>
            <span>
              الميزانية:{' '}
              <strong className="font-mono-num text-emerald-400">
                {formatEGP(gameState.company.cashPiastres)}
              </strong>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              السمعة: <strong className="font-mono-num text-amber-300">{gameState.company.reputation}%</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              الموظفون: <strong className="font-mono-num text-sky-300">{activeEmployeesCount}</strong>
            </span>
          </div>
        </div>

        {/* 4 Categories of Sandbox Simulation Responsibilities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Category 1: Financial & Capital Responsibilities */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-emerald-400">
              1. محاكاة السيولة والمحاسبة
            </div>
            <p className="text-[11px] text-slate-400">
              ضخ سيولة تجريبية بقيد محاسبي متوازن لتجربة التعاقدات والتوسع.
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => onRunSandboxAction('ADD_CASH_5K')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-right cursor-pointer"
              >
                💰 ضخ +5,000 ج.م سيولة تجريبية
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('ADD_CASH_25K')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-right cursor-pointer"
              >
                🏦 ضخ +25,000 ج.م (لتجربة وكلني وزورو)
              </button>
            </div>
          </div>

          {/* Category 2: Day & Cycle Progression Responsibilities */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-amber-400">
              2. محاكاة الأيام ودورات التشغيل
            </div>
            <p className="text-[11px] text-slate-400">
              القفز المباشر بين الأيام لاختبار فتح الأنظمة ودورة الرواتب والإيجارات.
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => onRunSandboxAction('JUMP_TO_DAY_2')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-right cursor-pointer"
              >
                📅 القفز لليوم 2 (المحاسبة والتسويق وHR)
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('JUMP_TO_DAY_3')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-right cursor-pointer"
              >
                🚀 القفز لليوم 3 (فتح تطوير الأعمال)
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('JUMP_TO_DAY_8')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-right cursor-pointer"
              >
                🗓️ القفز لليوم 8 (دورة الرواتب والإيجار)
              </button>
            </div>
          </div>

          {/* Category 3: Operations, Time & Platform Orders */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-sky-400">
              3. محاكاة العمليات والوقت والمنصات
            </div>
            <p className="text-[11px] text-slate-400">
              اختبار سرعة الوقت، أوردرات وكلني وزورو، وإتمام مهام اليوم.
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => onRunSandboxAction('SPAWN_PLATFORM_ORDERS')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold text-right cursor-pointer"
              >
                🍔فعيل العقود وتوليد أوردرات ({waitingPlatformOrdersCount} حالي)
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('ADVANCE_TIME_2H')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-right cursor-pointer"
              >
                ⏩ تقديم الساعة +2 ساعة ({activeShipmentsCount} شحنة)
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('AUTO_COMPLETE_TODAY')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-right cursor-pointer"
              >
                ✓ إتمام جميع قرارات وشحنات اليوم فوراً
              </button>
            </div>
          </div>

          {/* Category 4: Fleet, Reputation & New Player Reset */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-bold text-rose-400">
              4. جاهزية الأسطول وتجربة اللاعب الجديد
            </div>
            <p className="text-[11px] text-slate-400">
              رفع جاهزية الشركة أو محاكاة دخول لاعب جديد من الصفر على الرابط العام.
            </p>
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => onRunSandboxAction('MAX_FLEET_AND_REPUTATION')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-right cursor-pointer"
              >
                ⭐ رفع السمعة والوقود والماكينات 100%
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('CLONE_LIVE_TO_SANDBOX')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-right cursor-pointer"
              >
                📋 نسخ تقدمي من النسخة العامة للساند بوكس
              </button>
              <button
                type="button"
                onClick={() => onRunSandboxAction('RESET_SANDBOX_DAY_1')}
                className="w-full py-1.5 px-2.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-right cursor-pointer"
              >
                🔄 تصفير الساند بوكس لليوم 1 (لاعب جديد)
              </button>
            </div>
          </div>
        </div>

        {/* Quick Jump Links to Test Sections in Sandbox */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400">
            انتقل مباشرة لمعاينة الأقسام بعد تفعيل المحاكاة:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenSection('MAIN_CONTROL')}
              className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold cursor-pointer"
            >
              🏢 غرفة العمليات
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('BUSINESS_DEVELOPER')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold cursor-pointer"
            >
              🤝 تطوير الأعمال (وكلني & زورو)
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('COURIERS')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
            >
              🛵 المناديب والمركبات
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('EMPLOYEES')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
            >
              👥 الموارد البشرية
            </button>
            <button
              type="button"
              onClick={() => onOpenSection('LEDGER')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
            >
              💰 الحسابات
            </button>
          </div>
        </div>
      </div>

      {/* Permanent Developer & Public URLs + Solution for ais-pre HTTP 404 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-white">
            روابط تشغيل ومشاركة اللعبة (الرابط الفوري النشط + تفعيل رابط المشاركة الخارجي)
          </h3>
          <span className="text-[11px] text-emerald-400 font-semibold">
            يدعمان الوضع الأفقي التلقائي والتثبيت المحلي (PWA)
          </span>
        </div>

        {/* Important Notice explaining why ais-pre gives 404 before clicking AI Studio's outer Share button */}
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-2">
          <div className="font-black text-amber-300 text-xs sm:text-sm">
            ⚠️ لماذا يظهر خطأ «لا يمكن العثور على صفحة ais-pre (HTTP 404)» وكيف تشغل الرابط العام فوراً؟
          </div>
          <p className="text-slate-200 leading-relaxed text-[11px]">
            زر <strong>«اعتماد ونشر التحديث»</strong> داخل اللعبة يحفظ النسخة المعتمدة في قاعدة البيانات، لكن رابط <code>ais-pre-...</code> يظل مغلقاً من جوجل (يعطي 404) حتى تضغط على زر المشاركة من <strong>أعلى نافذة منصة Google AI Studio الخارجية (خارج إطار اللعبة)</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-500/40">
              <div className="font-bold text-emerald-400 mb-1">
                ✅ الحل الفوري الأول (يعمل الآن 100% بدون 404):
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                انسخ <strong>«الرابط العام الفوري النشط»</strong> بالأسفل (ينتهي بـ <code>?mode=public</code>). هذا الرابط يعمل على الخادم النشط حالياً بدون أي خطأ 404 ويفتح اللعبة بوضع الجمهور العام مباشرة.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/40">
              <div className="font-bold text-amber-300 mb-1">
                🔓 الحل الثاني (لتشغيل رابط <code>ais-pre</code> نفسه):
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                انظر إلى <strong>الشريط العلوي لمنصة AI Studio (فوق شاشة اللعبة في المتصفح)</strong> واضغط على أيقونة <strong>Share (مشاركة)</strong> ثم فعّل مشاركة التطبيق، وسيتم فتح خادم <code>ais-pre</code> فوراً.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Instant Working Public URL (?mode=public) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border-2 border-emerald-500/70 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-black text-emerald-400">
                1. الرابط العام الفوري النشط (يعمل الآن بدون 404):
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopyUrl(`${PERMANENT_DEV_URL}/?mode=public`, 'PUBLIC')
                }
                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] cursor-pointer shrink-0"
              >
                {copiedUrlType === 'PUBLIC'
                  ? '✓ تم نسخ الرابط الفوري'
                  : 'نسخ الرابط العام الفوري'}
              </button>
            </div>
            <div
              dir="ltr"
              className="font-mono-num text-[11px] text-emerald-300 break-all select-all bg-slate-900 p-2 rounded border border-slate-800"
            >
              {`${PERMANENT_DEV_URL}/?mode=public`}
            </div>
            <p className="text-[10px] text-slate-400">
              يفتح النسخة العامة المعتمدة ({releaseControl.publicVersion}) مباشرة على الخادم النشط دون الحاجة لانتظار تفعيل <code>ais-pre</code>.
            </p>
          </div>

          {/* 2. Developer Direct URL */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sky-400">
                2. رابط المطور الكامل (مع لوحة المطور):
              </span>
              <button
                type="button"
                onClick={() => handleCopyUrl(PERMANENT_DEV_URL, 'DEV')}
                className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 font-bold text-[11px] cursor-pointer shrink-0"
              >
                {copiedUrlType === 'DEV' ? '✓ تم نسخ الرابط' : 'نسخ رابط المطور'}
              </button>
            </div>
            <div
              dir="ltr"
              className="font-mono-num text-[11px] text-slate-200 break-all select-all bg-slate-900 p-2 rounded border border-slate-800"
            >
              {PERMANENT_DEV_URL}
            </div>
            <p className="text-[10px] text-slate-400">
              الرابط الخاص بك كمطور للوصول إلى الساند بوكس وإعدادات النشر.
            </p>
          </div>

          {/* 3. AI Studio Shared Snapshot URL (ais-pre) */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-400">
                3. رابط AI Studio الخارجي (يتطلب زر Share العلوي):
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    void navigator.clipboard.writeText(PERMANENT_PUBLIC_URL);
                    setStatusNotice({
                      text: 'تم نسخ رابط ais-pre. تذكر تفعيله أولاً من زر Share في الشريط العلوي لمنصة AI Studio خارج اللعبة.',
                      tone: 'info',
                    });
                  } catch {
                    // Ignore
                  }
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] cursor-pointer shrink-0"
              >
                نسخ رابط ais-pre
              </button>
            </div>
            <div
              dir="ltr"
              className="font-mono-num text-[11px] text-slate-300 break-all select-all bg-slate-900 p-2 rounded border border-slate-800"
            >
              {PERMANENT_PUBLIC_URL}
            </div>
            <p className="text-[10px] text-amber-200/80">
              يعمل فقط بعد الضغط على زر <strong>Share</strong> من شريط Google AI Studio العلوي خارج اللعبة.
            </p>
          </div>
        </div>

        {/* Sponsored Video Ad Gate Settings for New Day */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-bold text-sky-400">
              بوابة الإعلان الممول عند الانتقال لليوم الجديد (New Day Video Ad Gate)
            </div>
            <p className="text-[11px] text-slate-400">
              عند التفعيل، يشاهد اللاعب إعلان فيديو ممول قصير فقط عند الانتقال إلى اليوم الجديد وحفظ التقدم عبر الإنترنت.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-slate-300">
              <span>مدة الفيديو (ثوانٍ):</span>
              <input
                type="number"
                min={3}
                max={15}
                value={adCountdownSeconds}
                onChange={(e) =>
                  setAdCountdownSeconds(Number(e.target.value) || 5)
                }
                className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-amber-300 font-mono-num text-center"
              />
            </label>
            <button
              type="button"
              onClick={() => setAdGateEnabled((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                adGateEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {adGateEnabled ? '✓ الإعلان الممول مفعّل' : 'الإعلان الممول متوقف'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Public vs Candidate + Verification Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Right Col: Release Management & Candidate Promotion */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2.5">
            اعتماد ونشر التحديث على الرابط العام (Promote to Public)
          </h3>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">الإصدار العام الحالي للجمهور:</span>
              <span className="font-mono-num font-bold text-emerald-400">
                {releaseControl.publicVersion}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              {releaseControl.publicSummary}
            </p>
            <div className="text-[11px] text-slate-500 pt-1">
              معتمد بواسطة: {releaseControl.approvedByEmail}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                رقم الإصدار المرشح للنشر (Candidate Version):
              </label>
              <input
                type="text"
                value={candidateVersion}
                onChange={(e) => setCandidateVersion(e.target.value)}
                maxLength={32}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono-num text-amber-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ملخص التغييرات في هذا التحديث (Changelog):
              </label>
              <textarea
                rows={3}
                value={candidateSummary}
                onChange={(e) => setCandidateSummary(e.target.value)}
                maxLength={600}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleSaveCandidateDraft}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                حفظ مسودة الاختبار
              </button>

              <button
                type="button"
                disabled={isPublishing}
                onClick={() => {
                  const res = runMandatoryVerificationTests();
                  setTestResult(res);
                  setConfirmPromoteOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                اعتماد ونشر التحديث على الرابط العام
              </button>

              <button
                type="button"
                onClick={onResetStagingSandbox}
                className="px-3 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-semibold cursor-pointer"
              >
                تصفير الساند بوكس
              </button>
            </div>
          </div>
        </div>

        {/* Left Col: Automated Pre-Publish Verification & Rollback History */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-white">
                  فحص سلامة الأنظمة قبل النشر (36 اختباراً إلزامياً)
                </h3>
                <p className="text-[11px] text-slate-400">
                  يتحقق من المحرك المالي، المستودع، المناديب، وكلني & زورو، والحفظ.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunVerificationSuite}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer shrink-0"
              >
                تشغيل الـ 36 اختباراً الآن
              </button>
            </div>

            {!testResult ? (
              <div className="py-4 text-center text-xs text-slate-400">
                اضغط على «تشغيل الـ 36 اختباراً الآن» للتحقق من سلامة جميع الأنظمة قبل النشر للجمهور.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 text-xs">
                {testResult.results.map((item) => (
                  <div
                    key={item.testNumber}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div>
                      <span
                        className={`font-bold ml-1.5 ${
                          item.passed ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.passed ? '✓' : '✗'} [{item.testNumber}]
                      </span>
                      <span className="font-semibold text-white">
                        {item.name}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version History & Rollback */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
              سجل الإصدارات المعتمدة والتراجع الآمن (Rollback)
            </h3>
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 text-xs">
              {releaseControl.history.map((h, idx) => (
                <div
                  key={`${h.version}-${idx}`}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-bold text-amber-400">
                        {h.version}
                      </span>
                      {h.version === releaseControl.publicVersion && (
                        <span className="text-[10px] text-emerald-400 font-bold">
                          (الإصدار العام النشط)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {h.summary}
                    </p>
                  </div>
                  {h.version !== releaseControl.publicVersion && (
                    <button
                      type="button"
                      onClick={() => setRollbackTarget(h)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      استرجاع هذا الإصدار
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Promoting Candidate to Public */}
      {confirmPromoteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              تأكيد اعتماد ونشر التحديث للجمهور العام
            </h3>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div>
                <span className="text-slate-400">الإصدار الجديد: </span>
                <strong className="font-mono-num text-emerald-400">
                  {candidateVersion}
                </strong>
              </div>
              <div>
                <span className="text-slate-400">حالة الفحص البرمجي: </span>
                <strong
                  className={
                    testResult?.allPassed ? 'text-emerald-400' : 'text-rose-400'
                  }
                >
                  {testResult?.allPassed
                    ? `ناجح بالكامل (${testResult.results.length} اختبار)`
                    : 'غير مكتمل'}
                </strong>
              </div>
              <p className="text-slate-300 pt-1">{candidateSummary}</p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              لن يؤدي نشر هذا التحديث إلى مسح أو تصفير أي تقدم محفوظ للاعبين الحاليين.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPromoteOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isPublishing || !testResult?.allPassed}
                onClick={handleConfirmPromoteToPublic}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                {isPublishing ? 'جاري النشر...' : 'تأكيد النشر للعامة الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Rollback */}
      {rollbackTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              تأكيد التراجع إلى الإصدار {rollbackTarget.version}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              سيتم إعادة الإصدار العام النشط إلى ({rollbackTarget.version}) لجميع اللاعبين مع الاحتفاظ الكامل بملفات شركاتهم وأرصدتهم.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRollbackTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleConfirmRollback}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                تأكيد استرجاع الإصدار
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
