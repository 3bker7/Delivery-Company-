import React, { useState } from 'react';
import {
  Check,
  Compass,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  ArrowUpLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldAlert,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import {
  GameState,
  GuideTaskStatus,
  InlineBubbleNotification,
  ManagerGuideTask,
} from '../types/game';
import {
  dismissBubbleNotification,
  inspectAndNotifySecretary,
  markBubbleNotificationRead,
  syncManagerGuideTasksWithRealState,
} from '../engine/guideAndSecretaryEngine';

interface ManagerAndSecretaryBubblesProps {
  state: GameState;
  onUpdateState: (updater: (prev: GameState) => GameState) => void;
  onNavigateToSection: (
    target: ManagerGuideTask['targetSection']
  ) => void;
}

const TASK_STATUS_META: Record<
  GuideTaskStatus,
  { labelAr: string; badgeClass: string; icon: React.ReactNode }
> = {
  NOT_STARTED: {
    labelAr: 'لم تبدأ',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-600/60',
    icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
  },
  IN_PROGRESS: {
    labelAr: 'قيد التنفيذ',
    badgeClass: 'bg-amber-950/90 text-amber-300 border-amber-500/40',
    icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
  },
  COMPLETED: {
    labelAr: 'مكتملة',
    badgeClass: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  LOCKED: {
    labelAr: 'مقفلة',
    badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    icon: <Lock className="w-3.5 h-3.5 text-rose-400" />,
  },
};

export const ManagerAndSecretaryBubbles: React.FC<
  ManagerAndSecretaryBubblesProps
> = ({ state, onUpdateState, onNavigateToSection }) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [secretaryLogOpen, setSecretaryLogOpen] = useState(false);
  const [expandedMessageIds, setExpandedMessageIds] = useState<
    Record<string, boolean>
  >({});
  const [customQueryText, setCustomQueryText] = useState('');

  const gs = state.guideAndSecretary;
  const tasks = gs?.guideTasks || [];
  const allMessages = gs?.bubbleMessages || [];

  const activeSecretaryMessages = allMessages.filter(
    (m) => m.sender === 'SECRETARY' && !m.dismissed
  );
  const activeGuideMessages = allMessages.filter(
    (m) => m.sender === 'MANAGER_GUIDE' && !m.dismissed
  );

  const unreadSecretaryCount = activeSecretaryMessages.filter(
    (m) => !m.read
  ).length;
  const incompleteGuideTasksCount = tasks.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED'
  ).length;
  const unreadGuideBadgeCount =
    activeGuideMessages.filter((m) => !m.read).length +
    incompleteGuideTasksCount;

  // Keep any currently expanded message pinned in place until dismissed or collapsed so reading never swaps messages
  const latestSecretaryInline =
    activeSecretaryMessages.find((m) => expandedMessageIds[m.id]) ||
    activeSecretaryMessages.find((m) => !m.read) ||
    activeSecretaryMessages[0];

  const latestGuideInline =
    activeGuideMessages.find((m) => expandedMessageIds[m.id]) ||
    activeGuideMessages.find((m) => !m.read) ||
    activeGuideMessages[0];

  const handleToggleInlineExpand = (msg: InlineBubbleNotification) => {
    const nextExpanded = !expandedMessageIds[msg.id];
    setExpandedMessageIds((prev) => ({
      ...prev,
      [msg.id]: nextExpanded,
    }));
    if (!msg.read) {
      onUpdateState((prev) => markBubbleNotificationRead(prev, msg.id));
    }
  };

  const handleDismissMessage = (
    e: React.MouseEvent,
    msgId: string
  ) => {
    e.stopPropagation();
    setExpandedMessageIds((prev) => {
      if (!prev[msgId]) return prev;
      const copy = { ...prev };
      delete copy[msgId];
      return copy;
    });
    onUpdateState((prev) => dismissBubbleNotification(prev, msgId));
  };

  const handleInspectPendingShipment = (trackingNumber: string) => {
    onUpdateState((prev) => {
      const { nextState } = inspectAndNotifySecretary(
        prev,
        {
          decisionType: 'ACCEPT_SHIPMENT',
          trackingNumber,
        },
        `MANUAL-${Date.now()}`
      );
      return nextState;
    });
  };

  const handleAskUncoveredDecision = () => {
    if (!customQueryText.trim()) return;
    const text = customQueryText.trim();
    setCustomQueryText('');
    onUpdateState((prev) => {
      const { nextState } = inspectAndNotifySecretary(
        prev,
        {
          decisionType: 'CUSTOM_UNCOVERED_DECISION',
          customDecisionDescriptionAr: text,
          customParametersProvided: false,
        },
        `CUSTOM-${Date.now()}`
      );
      return nextState;
    });
  };

  const renderInlineMessageBanner = (
    msg: InlineBubbleNotification,
    alignSide: 'right' | 'left'
  ) => {
    const isExpanded = Boolean(expandedMessageIds[msg.id]);
    const borderClass =
      msg.severity === 'CRITICAL'
        ? 'border-rose-500/70 bg-slate-950/95'
        : msg.severity === 'WARNING'
          ? 'border-amber-500/70 bg-slate-950/95'
          : msg.severity === 'SUCCESS'
            ? 'border-emerald-500/70 bg-slate-950/95'
            : 'border-sky-500/60 bg-slate-950/95';

    return (
      <div
        key={msg.id}
        onClick={() => handleToggleInlineExpand(msg)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleToggleInlineExpand(msg);
          }
        }}
        className={`pointer-events-auto cursor-pointer transition-all duration-200 rounded-xl border ${borderClass} shadow-xl backdrop-blur-md px-3 py-2 text-right max-w-[270px] sm:max-w-[330px] select-none`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {msg.severity === 'CRITICAL' ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            ) : msg.severity === 'WARNING' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : msg.severity === 'SUCCESS' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span className="text-[11px] font-bold text-white truncate">
              {msg.titleAr}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-slate-400">
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
            <button
              type="button"
              onClick={(e) => handleDismissMessage(e, msg.id)}
              title="تمت القراءة — إخفاء الرسالة (✓)"
              className="w-5 h-5 rounded-md bg-emerald-600/25 hover:bg-emerald-500/40 border border-emerald-400/50 flex items-center justify-center text-emerald-300 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Short preview when collapsed */}
        {!isExpanded && (
          <p className="mt-1 text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {msg.shortPreviewAr}
            <span className="text-sky-400 font-semibold mr-1">
              (اضغط للتفاصيل)
            </span>
          </p>
        )}

        {/* Full in-place expanded content without opening a new modal */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-slate-800 space-y-2 text-[11px] leading-relaxed">
            <p className="text-slate-200 font-medium">{msg.shortPreviewAr}</p>

            {msg.requiresMoreInfoPromptAr && (
              <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200">
                <div className="font-bold mb-0.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  معلومات إضافية مطلوبة لتقييم القرار:
                </div>
                {msg.requiresMoreInfoPromptAr}
              </div>
            )}

            {msg.factsAr.length > 0 && (
              <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                <div className="text-[10px] font-bold text-sky-400 mb-1">
                  حقائق مؤكدة من بيانات الشركة:
                </div>
                <ul className="space-y-0.5 text-slate-300 list-disc list-inside">
                  {msg.factsAr.map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              </div>
            )}

            {msg.projectionsAr.length > 0 && (
              <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                <div className="text-[10px] font-bold text-amber-400 mb-1">
                  التوقعات التشغيلية والمالية:
                </div>
                <ul className="space-y-0.5 text-slate-300 list-disc list-inside">
                  {msg.projectionsAr.map((proj, idx) => (
                    <li key={idx}>{proj}</li>
                  ))}
                </ul>
              </div>
            )}

            {msg.alternativesAr.length > 0 && (
              <div className="bg-emerald-950/30 rounded-lg p-2 border border-emerald-500/30">
                <div className="text-[10px] font-bold text-emerald-400 mb-1">
                  بدائل عملية مقترحة (القرار لك):
                </div>
                <ul className="space-y-0.5 text-emerald-200 list-disc list-inside">
                  {msg.alternativesAr.map((alt, idx) => (
                    <li key={idx}>{alt}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>
                اليوم {msg.createdAtDay} • {msg.createdAtTimeLabel}
              </span>
              <button
                type="button"
                onClick={(e) => handleDismissMessage(e, msg.id)}
                className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-bold flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                إخفاء بعد القراءة
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 1. RIGHT SIDE FIXED BUBBLE: دليل المدير (Manager Guide) */}
      <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-2 pointer-events-none max-w-[92vw]">
        {latestGuideInline &&
          renderInlineMessageBanner(latestGuideInline, 'right')}

        <button
          type="button"
          onClick={() => {
            onUpdateState((prev) => syncManagerGuideTasksWithRealState(prev));
            setGuideOpen((prev) => !prev);
            setSecretaryLogOpen(false);
          }}
          className="pointer-events-auto relative group flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 hover:from-indigo-900 hover:to-indigo-800 border-2 border-indigo-400/60 shadow-lg shadow-indigo-950/60 px-3 py-1.5 transition-all"
          title="دليل المدير — المهمات الأساسية والتقدم في المستويات"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/60 flex items-center justify-center text-indigo-300 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-right pr-0.5">
            <div className="text-[11px] font-extrabold text-white leading-tight">
              دليل المدير
            </div>
            <div className="text-[9px] text-indigo-300 leading-tight">
              مهام المستوى {state.company.level || 1}
            </div>
          </div>

          {unreadGuideBadgeCount > 0 && (
            <span className=" -top-1.5 -left-1.5 absolute min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center border-2 border-slate-950 shadow">
              {unreadGuideBadgeCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. LEFT SIDE FIXED BUBBLE: السكرتير الديناميكي (Dynamic Secretary) */}
      <div className="fixed bottom-3 left-3 z-40 flex flex-col items-start gap-2 pointer-events-none max-w-[92vw]">
        {latestSecretaryInline &&
          renderInlineMessageBanner(latestSecretaryInline, 'left')}

        <button
          type="button"
          onClick={() => {
            setSecretaryLogOpen((prev) => !prev);
            setGuideOpen(false);
          }}
          className="pointer-events-auto relative group flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border-2 border-emerald-400/60 shadow-lg shadow-emerald-950/60 px-3 py-1.5 transition-all"
          title="السكرتير الديناميكي — فحص القرارات والتفاوض والمخاطر"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-400/60 flex items-center justify-center text-emerald-300 shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="text-right pr-0.5">
            <div className="text-[11px] font-extrabold text-white leading-tight">
              السكرتير التنفيذي
            </div>
            <div className="text-[9px] text-emerald-300 leading-tight">
              مستشار القرارات الفوري
            </div>
          </div>

          { (unreadSecretaryCount > 0 || activeSecretaryMessages.length > 0) && (
            <span
              className={`-top-1.5 -right-1.5 absolute min-w-[20px] h-5 px-1 rounded-full font-black text-[10px] flex items-center justify-center border-2 border-slate-950 shadow ${
                unreadSecretaryCount > 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {unreadSecretaryCount > 0
                ? unreadSecretaryCount
                : activeSecretaryMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. MANAGER GUIDE PANEL (دليل المدير — المهمات الأساسية والتوجيه العملي) */}
      {guideOpen && (
        <div className="fixed bottom-16 right-3 z-50 w-[94vw] max-w-[430px] max-h-[76vh] flex flex-col rounded-2xl bg-slate-950/98 border border-indigo-500/50 shadow-2xl overflow-hidden text-right">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-indigo-950/90 to-slate-900 border-b border-indigo-500/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">
                  دليل المدير التنفيذي — مهام التقدم والمستويات
                </h3>
                <p className="text-[10px] text-indigo-300">
                  يتحقق من الإنجاز تلقائياً من بيانات اللعبة الفعلية دون اتخاذ القرار بدلاً منك
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto space-y-2.5">
            {tasks.map((task) => {
              const meta = TASK_STATUS_META[task.status];
              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    task.status === 'COMPLETED'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : task.status === 'LOCKED'
                        ? 'bg-slate-900/60 border-slate-800 opacity-85'
                        : 'bg-slate-900/95 border-indigo-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-xs text-white">
                      {task.titleAr}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${meta.badgeClass}`}
                    >
                      {meta.icon}
                      {meta.labelAr}
                    </span>
                  </div>

                  <div className="mt-1.5 text-[11px] text-slate-300 space-y-1">
                    <div>
                      <span className="text-indigo-300 font-bold">
                        ماذا تفعل:{' '}
                      </span>
                      {task.whatToDoAr}
                    </div>
                    <div>
                      <span className="text-amber-300 font-bold">
                        لماذا هذه المهمة:{' '}
                      </span>
                      {task.whyImportantAr}
                    </div>
                    <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 text-[10px] text-slate-300">
                      <span className="text-emerald-400 font-bold">
                        إرشاد عملي:{' '}
                      </span>
                      {task.practicalGuidanceAr}
                    </div>
                  </div>

                  {task.status === 'LOCKED' && task.lockReasonAr && (
                    <div className="mt-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-[10px] text-rose-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{task.lockReasonAr}</span>
                    </div>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-sky-300">
                      التقدم الفعلي: {task.progressLabelAr}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setGuideOpen(false);
                        onNavigateToSection(task.targetSection);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 transition-colors"
                    >
                      <span>{task.targetButtonLabelAr}</span>
                      <ArrowUpLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SECRETARY ADVISOR PANEL (السكرتير الديناميكي — فحص القرارات وسجل النصائح) */}
      {secretaryLogOpen && (
        <div className="fixed bottom-16 left-3 z-50 w-[94vw] max-w-[430px] max-h-[76vh] flex flex-col rounded-2xl bg-slate-950/98 border border-emerald-500/50 shadow-2xl overflow-hidden text-right">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-emerald-950/90 to-slate-900 border-b border-emerald-500/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">
                  السكرتير التنفيذي الديناميكي — فحص القرارات
                </h3>
                <p className="text-[10px] text-emerald-300">
                  يفحص السيولة والمندوبين والعقود والمرتجعات ويميز بين الحقيقة والتوقع
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSecretaryLogOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto space-y-3">
            {/* Quick Pre-Decision Inspection Buttons */}
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 space-y-2">
              <div className="text-[11px] font-bold text-emerald-300">
                فحص فوري لطلبات الشحن الحالية قبل القرار:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {state.shipments
                  .filter((s) => s.status === 'NEW_REQUEST')
                  .map((sh) => (
                    <button
                      key={sh.trackingNumber}
                      type="button"
                      onClick={() =>
                        handleInspectPendingShipment(sh.trackingNumber)
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold transition-colors"
                    >
                      فحص {sh.trackingNumber} ({sh.deliveryZone})
                    </button>
                  ))}
                {state.shipments.filter((s) => s.status === 'NEW_REQUEST')
                  .length === 0 && (
                  <span className="text-[10px] text-slate-400">
                    لا توجد طلبات شحن جديدة بانتظار القبول حالياً.
                  </span>
                )}
              </div>

              {/* Uncovered / Custom Decision consultation */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                <input
                  type="text"
                  value={customQueryText}
                  onChange={(e) => setCustomQueryText(e.target.value)}
                  placeholder="اسأل السكرتير عن قرار خاص غير معتاد..."
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAskUncoveredDecision}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[10px] shrink-0"
                >
                  استشارة
                </button>
              </div>
            </div>

            {/* Active Secretary Messages List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-300">
                الرسائل والتقارير النشطة ({activeSecretaryMessages.length}):
              </div>
              {activeSecretaryMessages.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                  تم إخفاء جميع الرسائل المقروءة. افحص أي شحنة أو قرار ليظهر تقرير السكرتير هنا.
                </div>
              ) : (
                activeSecretaryMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-xl bg-slate-900 border border-slate-800 p-2.5 space-y-1.5 text-[11px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white">
                        {msg.titleAr}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDismissMessage(e, msg.id)}
                        title="إخفاء الرسالة (✓)"
                        className="px-1.5 py-0.5 rounded bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0"
                      >
                        <Check className="w-3 h-3" />
                        تم
                      </button>
                    </div>
                    <p className="text-slate-300">{msg.shortPreviewAr}</p>
                    {msg.factsAr.length > 0 && (
                      <div className="text-[10px] text-sky-300">
                        <span className="font-bold">حقائق: </span>
                        {msg.factsAr.join(' • ')}
                      </div>
                    )}
                    {msg.projectionsAr.length > 0 && (
                      <div className="text-[10px] text-amber-300">
                        <span className="font-bold">توقعات: </span>
                        {msg.projectionsAr.join(' • ')}
                      </div>
                    )}
                    {msg.alternativesAr.length > 0 && (
                      <div className="text-[10px] text-emerald-300">
                        <span className="font-bold">البدائل: </span>
                        {msg.alternativesAr.join(' • ')}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
