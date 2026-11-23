import React, { useState } from 'react';
import { egpToPiastres, formatEGP } from '../engine/financeEngine';
import {
  EGYPT_LOCATIONS_DB,
  calculateEgyptRouteDistance,
} from '../engine/geographyEngine';
import { runDailyIngobiaEvaluationIfDue } from '../engine/herfokAndEvaluationEngine';
import {
  checkAndApplyCompanyLevelUpgrade,
  evaluateCompanyLevelProgress,
  openNewCompanyBranch,
  previewTimeSkipImpact,
  recordSyncMilestone,
} from '../engine/levelAndTimeEngine';
import {
  MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS,
  calculateShipmentPricingQuote,
  launchGeographicPromoOffer,
  submitMarketAuctionBid,
  updatePricingEngineConfig,
} from '../engine/pricingAndMarketEngine';
import { SHIPMENT_STATUS_LABELS_AR } from '../engine/shipmentEngine';
import {
  evaluateAndGenerateEmployeeVoiceByConditions,
  PERSONALITY_LABELS_AR,
  resolveEmployeeVoiceWithSolution,
  verifyEmployeeVoiceRecord,
} from '../engine/myEmployeesAppEngine';
import {
  GameState,
  HerfokCommentTone,
  SocialComplaintActionType,
  SocialMediaPost,
} from '../types/game';

export type PhoneAppId =
  | 'HOME'
  | 'MY_EMPLOYEES'
  | 'HERFOK'
  | 'INGOBIA_EVAL'
  | 'PRICING_GEO'
  | 'AUCTIONS_RIVALS'
  | 'LEVELS_TIME_SYNC'
  | 'MERCHANT_COMPLAINTS';

interface SocialMediaPhoneModalProps {
  state: GameState;
  initialAppId?: PhoneAppId;
  onClose: () => void;
  onResolveComplaint: (
    postId: string,
    actionType: SocialComplaintActionType
  ) => void;
  onInspectShipment: (trackingNumber: string) => void;
  onUpdateState?: (nextState: GameState, bannerMessage?: string) => void;
  onAdvanceTimeMinutes?: (minutes: number, summaryMessage?: string) => void;
  onOpenSection?: (
    tab:
      | 'SHIPMENTS'
      | 'WAREHOUSE'
      | 'COURIERS'
      | 'BUSINESS_DEV'
      | 'MARKETING'
      | 'HR'
      | 'ACCOUNTING'
  ) => void;
}

const TONE_BADGE_MAP: Record<
  HerfokCommentTone,
  { label: string; className: string }
> = {
  SUPPORTER: {
    label: 'مؤيد 👍',
    className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  CRITIC: {
    label: 'ناقد ⚠️',
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  SARCASTIC: {
    label: 'ساخر 😂',
    className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  ANALYTICAL: {
    label: 'تحليلي 📊',
    className: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
  NEUTRAL: {
    label: 'محايد 💬',
    className: 'bg-slate-700/60 text-slate-300 border-slate-600',
  },
};

export const SocialMediaPhoneModal: React.FC<SocialMediaPhoneModalProps> = ({
  state,
  initialAppId = 'HOME',
  onClose,
  onResolveComplaint,
  onInspectShipment,
  onUpdateState,
  onAdvanceTimeMinutes,
  onOpenSection,
}) => {
  const [activeApp, setActiveApp] = useState<PhoneAppId>(initialAppId);
  const [phoneFeedback, setPhoneFeedback] = useState<string | null>(null);

  // Geography & Pricing Simulator states
  const [fromLocQuery, setFromLocQuery] = useState<string>('العباسية');
  const [toLocQuery, setToLocQuery] = useState<string>('الدقي');
  const [calcWeightKg, setCalcWeightKg] = useState<number>(6);
  const [calcSlaHours, setCalcSlaHours] = useState<number>(15);
  const [offerTitle, setOfferTitle] = useState<string>('عرض شحن الجيزة والدلتا');
  const [offerZone, setOfferZone] = useState<string>('الجيزة');
  const [offerDiscount, setOfferDiscount] = useState<number>(12);

  // Auction bid states
  const [bidPricesEgp, setBidPricesEgp] = useState<Record<string, number>>({});
  const [bidSlaHours, setBidSlaHours] = useState<Record<string, number>>({});

  // Time Skip & Branch states
  const [skipHoursInput, setSkipHoursInput] = useState<number>(5);
  const [branchGov, setBranchGov] = useState<string>('الإسكندرية');
  const [branchCity, setBranchCity] = useState<string>('سموحة');

  const posts = state.socialPosts || [];
  const herfokPosts = state.herfokPosts || [];
  const evaluations = state.ingobiaEvaluations || [];
  const competitors = state.competitors || [];
  const auctions = state.marketAuctions || [];
  const pricing = state.pricingEngine;
  const levelProgress = evaluateCompanyLevelProgress(state);

  const unresolvedComplaintsCount = posts.filter(
    (p) => p.sentiment === 'COMPLAINT' && !p.complaintResolved
  ).length;
  const openAuctionsCount = auctions.filter((a) => a.status === 'OPEN').length;
  const openEmployeeVoiceCount = (
    state.myEmployeesApp?.voiceRecords || []
  ).filter((r) => r.status !== 'RESOLVED').length;

  const routeCalc = calculateEgyptRouteDistance(fromLocQuery, toLocQuery);
  const priceQuote = calculateShipmentPricingQuote(state, {
    pickupZoneAr: fromLocQuery,
    deliveryZoneAr: toLocQuery,
    weightKg: calcWeightKg,
    quotedSlaHours: calcSlaHours,
  });

  const skipPreview = previewTimeSkipImpact(state, skipHoursInput);

  const showTempBanner = (msg: string) => {
    setPhoneFeedback(msg);
    setTimeout(() => setPhoneFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Wide Landscape-Friendly Smartphone Hub Frame */}
      <div className="relative w-full max-w-[780px] h-[92dvh] max-h-[680px] bg-slate-900 border-[5px] border-slate-700 rounded-[32px] shadow-2xl flex flex-col overflow-hidden">
        {/* Smartphone Status Bar */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono-num font-bold text-amber-400">
              5G · Ingobia OS
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-num">
              كود الشركة: {state.company.companyCode || 'ING-2026'}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-bold">
              مستوى الشركة {state.company.level} / 5
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeApp !== 'HOME' && (
              <button
                type="button"
                onClick={() => setActiveApp('HOME')}
                className="px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] cursor-pointer"
              >
                ⌂ الشاشة الرئيسية للهاتف
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-0.5 rounded-full bg-rose-600/25 hover:bg-rose-600/40 text-rose-300 font-bold text-[11px] cursor-pointer"
            >
              إغلاق الهاتف ✕
            </button>
          </div>
        </div>

        {phoneFeedback && (
          <div className="px-4 py-1.5 bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between shrink-0">
            <span>{phoneFeedback}</span>
            <button
              type="button"
              onClick={() => setPhoneFeedback(null)}
              className="text-emerald-400 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Quick Top Navigation Bar Inside Phone */}
        <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1 overflow-x-auto shrink-0 text-[11px]">
          {(
            [
              ['HOME', '⌂ مركز الهاتف'],
              ['MY_EMPLOYEES', `👥 موظفيني (${openEmployeeVoiceCount})`],
              ['HERFOK', `هيرفوك (${herfokPosts.length})`],
              ['INGOBIA_EVAL', `تقييم إنجوبيا (${evaluations.length})`],
              ['PRICING_GEO', 'التسعير والمسافات'],
              ['AUCTIONS_RIVALS', `المزادات والمنافسون (${openAuctionsCount})`],
              ['LEVELS_TIME_SYNC', `المستويات والوقت والفروع`],
              ['MERCHANT_COMPLAINTS', `شكاوى التجار (${unresolvedComplaintsCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveApp(id)}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeApp === id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main Scrollable App Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* 1. HOME SCREEN: Categorized into التشغيل، الإدارة والمال، السوق والعلاقات */}
          {activeApp === 'HOME' && (
            <div className="space-y-4">
              {/* Simplified First-Use Guide Banner */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-slate-200 leading-relaxed">
                <strong className="text-amber-300 block mb-0.5">
                  📱 دليل الهاتف الذكي المبسط (اضغط على أي تطبيق لفتحه):
                </strong>
                <span>
                  • <strong>موظفيني:</strong> متابعة شكاوى واقتراحات فريقك وحلها لرفع كفاءتهم ·{' '}
                  <strong>هيرفوك:</strong> نبض الشارع المصري الساخر وأخبار المنافسين كل 5 ساعات ·{' '}
                  <strong>تقييم إنجوبيا:</strong> التقييم الرسمي لعملائك كل 24 ساعة ·{' '}
                  <strong>المزادات والتسعير:</strong> اقتناص مناقصات الشحن وضبط أسعار الكيلومتر والمناطق.
                </span>
              </div>

              {/* Company Identity & Separated Reputation vs Marketing Power Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    السمعة التشغيلية (الأداء الفعلي)
                  </span>
                  <strong className="text-sm font-mono-num text-amber-400">
                    ⭐ {state.company.reputation} / 100
                  </strong>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    تتأثر بالتسليم وتقييم إنجوبيا فقط
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    القوة التسويقية (الظهور والجذب)
                  </span>
                  <strong className="text-sm font-mono-num text-purple-400">
                    📢 {state.company.marketingPower ?? 58} / 100
                  </strong>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    ترتفع بالحملات والعروض الجغرافية
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    مستوى الشركة (منفصل عن الأيام)
                  </span>
                  <strong className="text-sm font-mono-num text-emerald-400">
                    المستوى {state.company.level} من 5
                  </strong>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    تقدم الترقية: {levelProgress.progressPercent}%
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">
                    قاعدة مهلة الأوردر القياسي
                  </span>
                  <strong className="text-sm font-mono-num text-sky-300">
                    حد أدنى 10س · للعميل 15س
                  </strong>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    هامش 5 ساعات أمان للحالات الحرجة
                  </span>
                </div>
              </div>

              {/* Category 1: السوق والعلاقات (Market & Relations) */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                  ١. تطبيقات السوق والعلاقات والتنافس
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveApp('HERFOK')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-amber-500/40 text-right space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        🔥 منصة «هيرفوك»
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        كل 5 ساعات
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      المنصة الساخرة لسوق الشحن: أخبار شركتك والمنافسين مع 2 إلى 7 تعليقات متنوعة.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveApp('INGOBIA_EVAL')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-emerald-500/40 text-right space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        ⭐ «تقييم إنجوبيا»
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        كل 24 ساعة (عينة 30%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      تقييم رسمي لعينة 30% من العملاء الذين تعاملوا فعلياً مع الشركة.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveApp('AUCTIONS_RIVALS')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-purple-500/40 text-right space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        🔨 المزادات والمنافسون
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        {openAuctionsCount} مزاد مفتوح
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      نافس «براق إكسبريس» و«سهم الدلتا» في مزادات التسعير وراقب الأوردرات المسحوبة.
                    </p>
                  </button>
                </div>
              </div>

              {/* Category 2: الإدارة والمال والتسعير (Management, Finance & Pricing) */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-sky-400 uppercase tracking-wider">
                  ٢. تطبيقات الإدارة والمال والتسعير الجغرافي
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveApp('PRICING_GEO')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-sky-500/40 text-right space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        🗺️ نظام التسعير والمسافات
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                        {pricing?.mode || 'AUTO'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      تسعير تلقائي ويدوي وشرائح ومناطق وعروض جغرافية + مسافات قرى ومدن مصر.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveApp('LEVELS_TIME_SYNC')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-indigo-500/40 text-right space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        🚀 المستويات والوقت والفروع
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                        المستوى {state.company.level}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      شروط المستويات 1..5، نظام الساعة (1س=4س واقع)، تجاوز الوقت، وفروع المحافظات.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveApp('MERCHANT_COMPLAINTS')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-rose-500/40 text-right space-y-1 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        🛠️ متابعة شكاوى التجار
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                        {unresolvedComplaintsCount} شكوى
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      معالجة شكاوى العملاء المنطقية واتخاذ قرارات التعويض أو تسريع الشحن.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveApp('MY_EMPLOYEES')}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-teal-500/50 text-right space-y-1 cursor-pointer transition-colors sm:col-span-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        👥 برنامج «موظفيني» (الشكاوى، الاقتراحات، والرضا الوظيفي)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold">
                        {openEmployeeVoiceCount} ملاحظة مفتوحة
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      استقبل ملاحظات الموظفين والمندوبين المبنية على شخصياتهم وظروف العمل الفعلية (قلة الطلبات، عدالة التوزيع، ضغط المستودع، المركبات)، تحقق من صحتها بالأدلة، ونفّذ الحلول المناسبة لحماية الفريق من الغياب والتسرب.
                    </p>
                  </button>
                </div>
              </div>

              {/* Category 3: التشغيل السريع (Quick Operations Launchers) */}
              {onOpenSection && (
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                    ٣. الوصول السريع لأقسام التشغيل بالمكتب
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        ['SHIPMENTS', '📦 الطلبات والتفاوض'],
                        ['WAREHOUSE', '🏭 المستودع والفرز'],
                        ['COURIERS', '🛵 المناديب والمركبات'],
                        ['BUSINESS_DEV', '⚡ عقود وّكلني وزورو'],
                        ['MARKETING', '📢 التسويق والحملات'],
                        ['HR', '👥 التوظيف والموارد'],
                        ['ACCOUNTING', '💰 المحاسبة والخزينة'],
                      ] as const
                    ).map(([sec, label]) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenSection(sec);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs text-right cursor-pointer"
                      >
                        {label} ↗
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. HERFOK APP: Satirical Shipping Community Platform (Every 5h, 2-7 Comments) */}
          {activeApp === 'HERFOK' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-amber-300">
                    🔥 منصة «هيرفوك» — مجتمع الشحن واللوجستيات الساخر
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    تتحدث تلقائياً كل 5 ساعات داخل اللعبة، ويظهر على كل منشور من 2 إلى 7 تعليقات متنوعة (مؤيد، ناقد، ساخر، تحليلي، محايد).
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono-num text-amber-300 font-bold">
                  إجمالي المنشورات: {herfokPosts.length}
                </span>
              </div>

              {herfokPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm">
                        {post.authorNameAr}{' '}
                        <span className="text-[11px] text-slate-500 font-mono-num">
                          {post.authorHandle}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {post.authorRoleAr} · اليوم {post.day} ({post.timeLabel})
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">
                      {post.comments.length} تعليقات مجتمعية
                    </span>
                  </div>

                  <p className="text-slate-100 leading-relaxed text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                    {post.contentAr}
                  </p>

                  {/* 2 to 7 Diverse Comments */}
                  <div className="space-y-1.5 pl-2 border-r-2 border-slate-800 pr-3">
                    <div className="text-[11px] font-bold text-slate-400">
                      التعليقات التفاعلية ({post.comments.length}):
                    </div>
                    {post.comments.map((c) => {
                      const badge = TONE_BADGE_MAP[c.tone];
                      return (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-200 text-[11px]">
                              {c.authorNameAr}{' '}
                              <span className="text-slate-500 font-normal">
                                ({c.authorRoleAr})
                              </span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {c.contentAr}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. INGOBIA EVALUATION APP: Every 24h on 30% Sample of Transacted Clients */}
          {activeApp === 'INGOBIA_EVAL' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-300">
                    ⭐ «تقييم إنجوبيا» الرسمي — يصدر كل 24 ساعة لعينة 30%
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    يُحتسب حصرياً من عينة 30% من العملاء الذين تعاملوا فعلياً مع الشركة، ويؤثر على السمعة التشغيلية منفصلاً عن القوة التسويقية.
                  </p>
                </div>
                {onUpdateState && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = runDailyIngobiaEvaluationIfDue(state, true);
                      onUpdateState(
                        next,
                        'تم إصدار أحدث تقرير «تقييم إنجوبيا» لعينة 30% من العملاء المتعاملين فعلياً.'
                      );
                      showTempBanner('تم تحديث تقرير تقييم إنجوبيا بنجاح.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    إصدار فحص تقييم الآن ↻
                  </button>
                )}
              </div>

              {evaluations.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-bold text-white text-sm">
                        تقرير اليوم {ev.day} ({ev.timeLabel})
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        حجم العينة: {ev.sampledClientsCount} عميل (30% من أصل{' '}
                        {ev.eligibleTransactedClientsCount} معاملة فعلية)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono-num font-bold text-amber-300">
                        الدرجة: {ev.overallScoreOutOf100} / 100
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg font-mono-num font-bold ${
                          ev.reputationDelta >= 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        السمعة: {ev.reputationDelta >= 0 ? `+${ev.reputationDelta}` : ev.reputationDelta}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-300 text-xs">{ev.summaryAr}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ev.samples.map((smp) => (
                      <div
                        key={`${ev.id}-${smp.trackingNumber}`}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-white">{smp.clientNameAr}</strong>
                          <span className="font-mono-num text-amber-400 font-bold">
                            {'★'.repeat(smp.stars)} ({smp.scoreOutOf100}%)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{smp.verdictAr}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. PRICING ENGINE & EGYPT GEOGRAPHY CALCULATOR */}
          {activeApp === 'PRICING_GEO' && pricing && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      🗺️ نظام التسعير الجغرافي وحاسبة المسافات المصرية
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      افصل بوضوح بين السعر المقدم للعميل وتكلفة التشغيل الفعلية للشركة وهامش الربح المتوقع.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {(
                      [
                        ['AUTO', 'تلقائي بالكيلومتر'],
                        ['BRACKET', 'تسعير الشرائح'],
                        ['REGIONAL', 'تسعير المناطق'],
                        ['MANUAL', 'تسعير يدوي موحد'],
                      ] as const
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          if (!onUpdateState) return;
                          const next = updatePricingEngineConfig(state, {
                            mode: m,
                          });
                          onUpdateState(
                            next,
                            `تم تغيير وضع نظام التسعير إلى: ${label}`
                          );
                          showTempBanner(`وضع التسعير الحالي: ${label}`);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer ${
                          pricing.mode === m
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Sliders / Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      رسوم فتح الشحنة الأساسية
                    </span>
                    <div className="flex items-center justify-between">
                      <strong className="font-mono-num text-white text-sm">
                        {formatEGP(pricing.baseFeePiastres)}
                      </strong>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState?.(
                              updatePricingEngineConfig(state, {
                                baseFeePiastres: Math.max(
                                  egpToPiastres(25),
                                  pricing.baseFeePiastres - egpToPiastres(5)
                                ),
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 text-white cursor-pointer"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState?.(
                              updatePricingEngineConfig(state, {
                                baseFeePiastres:
                                  pricing.baseFeePiastres + egpToPiastres(5),
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 text-white cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      تعريفة الكيلومتر (وضع تلقائي)
                    </span>
                    <div className="flex items-center justify-between">
                      <strong className="font-mono-num text-white text-sm">
                        {formatEGP(pricing.perKmRatePiastres)} / كم
                      </strong>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState?.(
                              updatePricingEngineConfig(state, {
                                perKmRatePiastres: Math.max(
                                  egpToPiastres(1.5),
                                  pricing.perKmRatePiastres - egpToPiastres(0.5)
                                ),
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 text-white cursor-pointer"
                        >
                          -0.5
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState?.(
                              updatePricingEngineConfig(state, {
                                perKmRatePiastres:
                                  pricing.perKmRatePiastres + egpToPiastres(0.5),
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 text-white cursor-pointer"
                        >
                          +0.5
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 block">
                      السعر اليدوي الموحد (وضع يدوي)
                    </span>
                    <div className="flex items-center justify-between">
                      <strong className="font-mono-num text-white text-sm">
                        {formatEGP(pricing.manualFixedFeePiastres)}
                      </strong>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState?.(
                              updatePricingEngineConfig(state, {
                                manualFixedFeePiastres: Math.max(
                                  egpToPiastres(60),
                                  pricing.manualFixedFeePiastres -
                                    egpToPiastres(10)
                                ),
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 text-white cursor-pointer"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateState?.(
                              updatePricingEngineConfig(state, {
                                manualFixedFeePiastres:
                                  pricing.manualFixedFeePiastres +
                                  egpToPiastres(10),
                              })
                            )
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 text-white cursor-pointer"
                        >
                          +10
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Egyptian Route & Distance Calculator (Villages, Markaz, Cities, Governorates) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-sky-500/40 space-y-3">
                <h4 className="font-bold text-sky-300 text-xs">
                  📏 حاسبة المسافات والتكلفة (القرى والمدن والمراكز والمحافظات المصرية)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      نقطة الاستلام (قرية/مدينة/حي):
                    </label>
                    <select
                      value={fromLocQuery}
                      onChange={(e) => setFromLocQuery(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      {EGYPT_LOCATIONS_DB.map((loc) => (
                        <option key={`from-${loc.id}`} value={loc.nameAr}>
                          {loc.nameAr} ({loc.governorateAr})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      نقطة التسليم (قرية/مدينة/حي):
                    </label>
                    <select
                      value={toLocQuery}
                      onChange={(e) => setToLocQuery(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    >
                      {EGYPT_LOCATIONS_DB.map((loc) => (
                        <option key={`to-${loc.id}`} value={loc.nameAr}>
                          {loc.nameAr} ({loc.governorateAr})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      الوزن (كجم):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={calcWeightKg}
                      onChange={(e) =>
                        setCalcWeightKg(Math.max(1, Number(e.target.value) || 1))
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      مهلة العميل (الحد الأدنى 10س):
                    </label>
                    <input
                      type="number"
                      min={MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS}
                      max={24}
                      value={calcSlaHours}
                      onChange={(e) =>
                        setCalcSlaHours(
                          Math.max(
                            MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS,
                            Number(e.target.value) || 15
                          )
                        )
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800">
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">
                      المسافة المحسوبة
                    </span>
                    <strong className="font-mono-num text-amber-300 text-sm">
                      {routeCalc.distanceKm} كم ({routeCalc.distanceMeters.toLocaleString('en-US')} م)
                    </strong>
                    <span className="block text-[10px] text-slate-500">
                      {routeCalc.accuracyLabelAr}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">
                      سعر الشحن للعميل
                    </span>
                    <strong className="font-mono-num text-white text-sm">
                      {formatEGP(priceQuote.customerPricePiastres)}
                    </strong>
                    <span className="block text-[10px] text-slate-500">
                      {priceQuote.pricingExplanationAr}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">
                      تكلفة الشركة الفعلية
                    </span>
                    <strong className="font-mono-num text-rose-300 text-sm">
                      {formatEGP(priceQuote.companyActualCostPiastres)}
                    </strong>
                    <span className="block text-[10px] text-slate-500">
                      وقود + مندوب + فرز وتغليف
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900">
                    <span className="text-[10px] text-slate-400 block">
                      هامش الربح الصافي المتوقع
                    </span>
                    <strong
                      className={`font-mono-num text-sm ${
                        priceQuote.expectedProfitMarginPiastres >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {priceQuote.expectedProfitMarginPiastres >= 0 ? '+' : ''}
                      {formatEGP(priceQuote.expectedProfitMarginPiastres)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Geographic Promotional Offers */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-white text-xs">
                  🎁 إطلاق عرض جغرافي مؤقت (يجذب طلبات ويرفع القوة التسويقية)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="عنوان العرض..."
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                  <input
                    type="text"
                    value={offerZone}
                    onChange={(e) => setOfferZone(e.target.value)}
                    placeholder="المنطقة/المحافظة (مثال: الجيزة)"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                  <input
                    type="number"
                    min={5}
                    max={30}
                    value={offerDiscount}
                    onChange={(e) =>
                      setOfferDiscount(Number(e.target.value) || 10)
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!onUpdateState) return;
                      const next = launchGeographicPromoOffer(
                        state,
                        offerTitle,
                        offerZone,
                        offerDiscount
                      );
                      onUpdateState(
                        next,
                        `تم تفعيل العرض الجغرافي (${offerTitle}) بخصم ${offerDiscount}%!`
                      );
                      showTempBanner('تم تفعيل العرض الجغرافي ورفع القوة التسويقية!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    إطلاق العرض الجغرافي
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. AUCTIONS & RIVAL SHIPPING COMPANIES */}
          {activeApp === 'AUCTIONS_RIVALS' && (
            <div className="space-y-4">
              {/* Active B2B Pricing Auctions */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-3">
                <h3 className="text-sm font-bold text-purple-300">
                  🔨 مزادات الشحن التنافسية (قدّم سعرك ومهلة التوصيل &ge; 10 ساعات)
                </h3>
                {auctions.map((auc) => {
                  const defaultBidEgp = Math.round(
                    (auc.competitorLeadingBidPiastres - 500) / 100
                  );
                  const currentBidEgp =
                    bidPricesEgp[auc.id] ?? defaultBidEgp;
                  const currentSla =
                    bidSlaHours[auc.id] ?? auc.competitorLeadingSlaHours;

                  return (
                    <div
                      key={auc.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <strong className="text-white text-xs">
                            {auc.clientNameAr} ({auc.clientTypeAr})
                          </strong>
                          <span className="block text-[11px] text-slate-400">
                            خط السير: {auc.pickupZoneAr} ← {auc.deliveryZoneAr} ({auc.distanceKm} كم) · {auc.dailyShipmentsCount} طرود
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            auc.status === 'OPEN'
                              ? 'bg-amber-500/20 text-amber-300'
                              : auc.status === 'WON_BY_PLAYER'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {auc.status === 'OPEN'
                            ? `مفتوح حتى ${auc.expiresTimeLabel}`
                            : auc.status === 'WON_BY_PLAYER'
                              ? 'فزت بالمزاد ✓'
                              : 'حسمه منافس'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        أفضل عرض منافس حالياً:{' '}
                        <strong className="text-amber-300">
                          {auc.competitorLeadingNameAr}
                        </strong>{' '}
                        بسعر{' '}
                        <strong className="font-mono-num text-white">
                          {formatEGP(auc.competitorLeadingBidPiastres)}
                        </strong>{' '}
                        ومهلة{' '}
                        <strong className="font-mono-num text-sky-300">
                          {auc.competitorLeadingSlaHours} ساعة
                        </strong>
                      </div>

                      {auc.status === 'OPEN' && onUpdateState && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className="text-[11px] text-slate-400">
                            عرضك للطلب (ج.م):
                          </label>
                          <input
                            type="number"
                            min={50}
                            max={400}
                            value={currentBidEgp}
                            onChange={(e) =>
                              setBidPricesEgp({
                                ...bidPricesEgp,
                                [auc.id]: Number(e.target.value) || 100,
                              })
                            }
                            className="w-24 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono-num text-xs"
                          />
                          <label className="text-[11px] text-slate-400">
                            المهلة الملتزم بها (&ge; 10س):
                          </label>
                          <input
                            type="number"
                            min={10}
                            max={20}
                            value={currentSla}
                            onChange={(e) =>
                              setBidSlaHours({
                                ...bidSlaHours,
                                [auc.id]: Math.max(
                                  10,
                                  Number(e.target.value) || 12
                                ),
                              })
                            }
                            className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white font-mono-num text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const next = submitMarketAuctionBid(
                                  state,
                                  auc.id,
                                  egpToPiastres(currentBidEgp),
                                  currentSla
                                );
                                onUpdateState(
                                  next,
                                  'تم تقديم عرضك في المزاد وحسم النتيجة!'
                                );
                                showTempBanner('تم حسم المزاد التنافسي!');
                              } catch (err) {
                                showTempBanner(
                                  err instanceof Error
                                    ? err.message
                                    : 'تعذر تقديم العرض'
                                );
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs cursor-pointer"
                          >
                            تقديم العرض والمنافسة
                          </button>
                        </div>
                      )}

                      {auc.outcomeSummaryAr && (
                        <p className="text-[11px] text-emerald-300">
                          {auc.outcomeSummaryAr}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Competitor Companies Radar */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-white text-xs">
                  🏢 رادار شركات الشحن المنافسة في السوق المصري
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {competitors.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-amber-300 text-xs">
                          {comp.nameAr}
                        </strong>
                        <span className="font-mono-num text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          حصة {comp.marketSharePercent}%
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        «{comp.sloganAr}»
                      </p>
                      <div className="text-[11px] text-slate-200 font-mono-num">
                        متوسط السعر: {formatEGP(comp.avgPricePerOrderPiastres)} · المهلة: {comp.quotedSlaHours}س
                      </div>
                      <div className="text-[10px] text-rose-300">
                        أوردرات خطفها من الاستقبال: {comp.poachedOrdersCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. COMPANY LEVELS (1..5), REAL-TIME 1h=4h, TIME SKIP & BRANCHES */}
          {activeApp === 'LEVELS_TIME_SYNC' && (
            <div className="space-y-4">
              {/* Company Level Progression */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      🚀 {levelProgress.currentDefinition.titleAr}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {levelProgress.currentDefinition.subtitleAr}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono-num font-bold text-xs">
                    المستوى الإداري للمطور: {levelProgress.adminLevel}
                  </span>
                </div>

                {levelProgress.nextDefinition ? (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300">
                        شروط الترقية إلى {levelProgress.nextDefinition.titleAr}:
                      </span>
                      <span className="font-mono-num text-emerald-400 font-bold">
                        {levelProgress.progressPercent}% مكتمل
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {levelProgress.requirements.map((req) => (
                        <div
                          key={req.id}
                          className={`p-2 rounded-xl border flex items-center justify-between ${
                            req.met
                              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{req.labelAr}</span>
                          <strong className="font-mono-num">
                            {req.currentValueLabel} / {req.targetValueLabel}{' '}
                            {req.met ? '✓' : ''}
                          </strong>
                        </div>
                      ))}
                    </div>
                    {levelProgress.canUpgradeNow && onUpdateState && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = checkAndApplyCompanyLevelUpgrade(state);
                          onUpdateState(
                            next,
                            `تمت ترقية الشركة إلى ${levelProgress.nextDefinition?.titleAr}!`
                          );
                          showTempBanner('مبارك ترقية مستوى الشركة!');
                        }}
                        className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
                      >
                        اعتماد الترقية إلى المستوى التالي الآن ▲
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 font-bold">
                    وصلت الشركة إلى قمة المستويات التشغيلية (المستوى 5 — الفروع الإقليمية)!
                  </div>
                )}
              </div>

              {/* Real-Time Clock Mode (1 game hour = 4 real hours) vs Time Skip Simulator */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-300 text-xs">
                  ⏱️ نظام التوقيت الواقعي (1 ساعة لعبة = 4 ساعات واقع) ووضع تجاوز الوقت
                </h4>
                <p className="text-[11px] text-slate-300">
                  في الوضع الواقعي تتقدم الساعة تلقائياً حتى أثناء غيابك (بمعادلة 1 ساعة داخل اللعبة لكل 4 ساعات حقيقية). ويمكنك أيضاً استخدام محاكي تجاوز الوقت لاختبار الساعات القادمة بنفس القواعد التشغيلية:
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-slate-400">
                    عدد الساعات المراد تجاوزها ومحاكاتها:
                  </label>
                  <select
                    value={skipHoursInput}
                    onChange={(e) => setSkipHoursInput(Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono-num text-xs"
                  >
                    <option value={2}>+2 ساعة لعبة</option>
                    <option value={5}>+5 ساعات (تحديث هيرفوك)</option>
                    <option value={10}>+10 ساعات (دورة شحنة كاملة)</option>
                    <option value={24}>+24 ساعة (يوم كامل + تقييم إنجوبيا)</option>
                  </select>

                  {onAdvanceTimeMinutes && (
                    <button
                      type="button"
                      onClick={() => {
                        onAdvanceTimeMinutes(
                          skipPreview.minutesToAdvance,
                          `تمت محاكاة وتجاوز ${skipHoursInput} ساعة داخل عالم اللعبة.`
                        );
                        showTempBanner(
                          `تم تجاوز ومحاكاة ${skipHoursInput} ساعة بنجاح.`
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      تنفيذ تجاوز الوقت ({skipHoursInput} ساعة) ⏩
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  معاينة قبل التنفيذ: {skipPreview.warningSummaryAr}
                </div>
              </div>

              {/* Level 5 Regional Branches Expansion */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-emerald-300 text-xs">
                  🏢 التوسع الجغرافي وافتتاح فروع المحافظات (المستوى 5 أو صلاحية المطور 3)
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={branchGov}
                    onChange={(e) => setBranchGov(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  >
                    <option value="الإسكندرية">محافظة الإسكندرية</option>
                    <option value="الغربية">محافظة الغربية (طنطا)</option>
                    <option value="الدقهلية">محافظة الدقهلية (المنصورة)</option>
                    <option value="الشرقية">محافظة الشرقية (الزقازيق)</option>
                    <option value="الجيزة">محافظة الجيزة (6 أكتوبر)</option>
                    <option value="المنيا">محافظة المنيا</option>
                  </select>
                  <input
                    type="text"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    placeholder="المدينة أو المركز..."
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                  {onUpdateState && (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const next = openNewCompanyBranch(
                            state,
                            branchGov,
                            branchCity
                          );
                          onUpdateState(
                            next,
                            `تم افتتاح فرع إقليمي جديد في ${branchGov} (${branchCity})!`
                          );
                          showTempBanner(
                            `تم افتتاح فرع ${branchGov} بنجاح!`
                          );
                        } catch (err) {
                          showTempBanner(
                            err instanceof Error
                              ? err.message
                              : 'تعذر افتتاح الفرع'
                          );
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      افتتاح فرع بالمحافظة (2,800 ج.م)
                    </button>
                  )}
                </div>

                {(state.branches || []).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {(state.branches || []).map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-white block">{b.nameAr}</strong>
                          <span className="text-[10px] text-slate-400">
                            سعة +{b.warehouseCapacitySlots} طرود · أُنشئ في اليوم {b.openedAtDay}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          نشط ✓
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hybrid Offline/Online Save & Sync Queue Status */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-white text-xs">
                    ☁️ نظام الحفظ المرن (أوفلاين محلي + مزامنة أونلاين عند المستويات والأيام والخروج)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    آخر حفظ محلي:{' '}
                    <span className="font-mono-num text-slate-200">
                      {state.offlineSync?.lastLocalSaveIso
                        ? new Date(
                            state.offlineSync.lastLocalSaveIso
                          ).toLocaleTimeString('en-US')
                        : 'الآن'}
                    </span>{' '}
                    · نقاط المسار المسجلة للمزامنة:{' '}
                    <strong className="font-mono-num text-amber-300">
                      {state.offlineSync?.pendingMilestones.length ?? 0}
                    </strong>
                  </p>
                </div>
                {onUpdateState && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = recordSyncMilestone(
                        state,
                        'PRE_EXIT_SAVE',
                        'حفظ يدوي آمن قبل الخروج واستكمال المسار'
                      );
                      onUpdateState(
                        next,
                        'تم حفظ آخر نقطة محلياً ومزامنة مسار الشركة بأمان!'
                      );
                      showTempBanner('تم حفظ المسار محلياً وسحابياً بنجاح ✓');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    💾 حفظ المسار قبل الخروج
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 7. MERCHANT COMPLAINTS & SOCIAL FEED */}
          {activeApp === 'MERCHANT_COMPLAINTS' && (
            <div className="space-y-3">
              {posts.map((post: SocialMediaPost) => (
                <div
                  key={post.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    post.sentiment === 'COMPLAINT' && !post.complaintResolved
                      ? 'bg-rose-950/25 border-rose-500/50'
                      : post.sentiment === 'PRAISE'
                        ? 'bg-emerald-950/20 border-emerald-500/40'
                        : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-white">
                        {post.authorName}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        {post.authorRoleAr} · اليوم {post.day} ({post.timeLabel})
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                      {post.sentiment === 'COMPLAINT'
                        ? post.complaintResolved
                          ? 'شكوى تمت معالجتها ✓'
                          : 'شكوى عميل ⚠️'
                        : 'منشور تاجر'}
                    </span>
                  </div>

                  <p className="text-slate-100 leading-relaxed">{post.contentAr}</p>

                  {post.relatedTrackingNumber && (
                    <div className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px]">
                      <span className="text-slate-400">
                        رقم الشحنة:{' '}
                        <strong className="font-mono-num text-amber-300">
                          {post.relatedTrackingNumber}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onInspectShipment(post.relatedTrackingNumber!);
                        }}
                        className="text-sky-400 hover:underline font-semibold cursor-pointer"
                      >
                        تتبع الشحنة
                      </button>
                    </div>
                  )}

                  {post.sentiment === 'COMPLAINT' && !post.complaintResolved && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-rose-500/30">
                      <button
                        type="button"
                        onClick={() =>
                          onResolveComplaint(post.id, 'FOLLOW_UP_SHIPMENT')
                        }
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-right font-semibold text-[11px] cursor-pointer"
                      >
                        1. متابعة الشحنة بالمستودع (+2 سمعة)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onResolveComplaint(post.id, 'CONTACT_CLIENT_APOLOGIZE')
                        }
                        className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-right font-semibold text-[11px] cursor-pointer"
                      >
                        2. الاعتذار للعميل وتحديث الموعد (+3 سمعة)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 8. MY EMPLOYEES APP («موظفيني» — الشكاوى، الاقتراحات، الإشادات، والرضا الوظيفي) */}
          {activeApp === 'MY_EMPLOYEES' && (
            <div className="space-y-4">
              {/* Header & Condition Check Triggers */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-teal-300">
                      👥 تطبيق «موظفيني» — صوت الفريق والرضا والاستقرار الوظيفي
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      تظهر الملاحظات بناءً على شخصية كل موظف والأحداث الفعلية في الشركة (قلة الطلبات، عدالة التوزيع، ضغط العمل، والمركبات).
                    </p>
                  </div>
                  {onUpdateState && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = evaluateAndGenerateEmployeeVoiceByConditions(
                            state,
                            'LOW_ORDERS_CHECK'
                          );
                          onUpdateState(
                            next,
                            'تم فحص أثر حجم الطلبات وتوزيع المهام على المندوبين.'
                          );
                          showTempBanner(
                            'تم تحديث سجل ملاحظات الموظفين وفق الحالة التشغيلية الحالية.'
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-teal-600/25 hover:bg-teal-600/40 border border-teal-500/40 text-teal-200 font-bold text-[10px] cursor-pointer"
                      >
                        فحص أثر قلة الطلبات
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = evaluateAndGenerateEmployeeVoiceByConditions(
                            state,
                            'OVERLOAD_CHECK'
                          );
                          onUpdateState(
                            next,
                            'تم فحص ضغط العمل بالمستودع والمناديب.'
                          );
                          showTempBanner(
                            'تم فحص ضغط الطوابير وتحديث ملاحظات الفريق.'
                          );
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-600/25 hover:bg-amber-600/40 border border-amber-500/40 text-amber-200 font-bold text-[10px] cursor-pointer"
                      >
                        فحص ضغط العمل
                      </button>
                    </div>
                  )}
                </div>

                {/* Employee Wellbeing & Risk Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  {state.employees
                    .filter((emp) => emp.status !== 'TERMINATED')
                    .map((emp) => {
                      const wb =
                        state.myEmployeesApp?.wellbeingByEmployeeId[emp.id];
                      const satisfaction = wb?.satisfactionScore ?? 75;
                      const absenceRisk = wb?.absenceRiskPercent ?? 10;
                      const turnoverRisk = wb?.turnoverRiskPercent ?? 12;
                      const personalityLabel = wb?.personality
                        ? PERSONALITY_LABELS_AR[wb.personality]
                        : 'متوازن تشغيلياً';

                      return (
                        <div
                          key={emp.id}
                          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <strong className="text-white text-xs block">
                                {emp.name}
                              </strong>
                              <span className="text-[10px] text-slate-400">
                                {emp.roleTitleAr} • كفاءة {emp.efficiency}%
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-num ${
                                satisfaction >= 75
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : satisfaction >= 55
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              الرضا: {satisfaction}%
                            </span>
                          </div>

                          <div className="text-[10px] text-teal-300 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                            الشخصية: {personalityLabel}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-300 pt-0.5">
                            <span>
                              خطر الغياب:{' '}
                              <strong
                                className={
                                  absenceRisk > 20
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {absenceRisk}%
                              </strong>
                            </span>
                            <span>
                              خطر التسرب الوظيفي:{' '}
                              <strong
                                className={
                                  turnoverRisk > 20
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {turnoverRisk}%
                              </strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Employee Complaints, Suggestions & Praises List */}
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs">
                  📋 سجل الشكاوى والاقتراحات والإشادات ({(state.myEmployeesApp?.voiceRecords || []).length}):
                </h4>

                {(state.myEmployeesApp?.voiceRecords || []).map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${
                      rec.status === 'RESOLVED'
                        ? 'bg-emerald-950/15 border-emerald-500/35'
                        : rec.type === 'COMPLAINT'
                          ? 'bg-slate-950 border-amber-500/50'
                          : 'bg-slate-950 border-sky-500/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-white text-xs block">
                          {rec.titleAr}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {rec.employeeName} ({rec.employeeRoleAr}) • اليوم{' '}
                          {rec.day} ({rec.timeLabel})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.type === 'COMPLAINT'
                              ? 'bg-rose-500/20 text-rose-300'
                              : rec.type === 'SUGGESTION'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {rec.type === 'COMPLAINT'
                            ? 'شكوى موظف'
                            : rec.type === 'SUGGESTION'
                              ? 'اقتراح تطوير'
                              : 'إشادة'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.status === 'RESOLVED'
                              ? 'bg-emerald-500/25 text-emerald-300'
                              : rec.status === 'VERIFIED'
                                ? 'bg-sky-500/25 text-sky-300'
                                : 'bg-amber-500/25 text-amber-300'
                          }`}
                        >
                          {rec.status === 'RESOLVED'
                            ? 'تم الحل ✓'
                            : rec.status === 'VERIFIED'
                              ? 'تم التحقق بالأدلة'
                              : 'جديدة — بانتظار المراجعة'}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-200 leading-relaxed text-[11px]">
                      «{rec.messageAr}»
                    </p>

                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-[10px]">
                      <div className="text-amber-300">
                        <span className="font-bold">الحدث الفعلي المولد للملاحظة: </span>
                        {rec.triggerEvidenceAr}
                      </div>
                      {(rec.status === 'VERIFIED' || rec.status === 'RESOLVED') && (
                        <div className="text-sky-300 pt-1 border-t border-slate-800">
                          <span className="font-bold">نتيجة التحقق الإداري: </span>
                          {rec.verificationDetailsAr}
                        </div>
                      )}
                    </div>

                    {rec.status === 'OPEN' && onUpdateState && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next = verifyEmployeeVoiceRecord(
                              state,
                              rec.id
                            );
                            onUpdateState(
                              next,
                              `تم التحقق من ملاحظة (${rec.employeeName}) من واقع سجلات التشغيل.`
                            );
                            showTempBanner(
                              `تم التحقق من صحة ملاحظة (${rec.employeeName}) بالأرقام!`
                            );
                          }}
                          className="px-3 py-1 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 border border-sky-500/40 text-sky-200 font-bold text-[11px] cursor-pointer"
                        >
                          🔍 التحقق من صحة الملاحظة بالأرقام أولاً
                        </button>
                      </div>
                    )}

                    {rec.status !== 'RESOLVED' && onUpdateState && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-800">
                        <div className="text-[10px] font-bold text-emerald-400">
                          الحلول العملية المتاحة (تؤثر مباشرة على رضا وكفاءة الموظف):
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {rec.suggestedSolutions.map((sol) => (
                            <button
                              key={sol.id}
                              type="button"
                              onClick={() => {
                                try {
                                  const next = resolveEmployeeVoiceWithSolution(
                                    state,
                                    rec.id,
                                    sol.id
                                  );
                                  onUpdateState(
                                    next,
                                    `تم تنفيذ الحل الإداري لـ (${rec.employeeName}): ${sol.labelAr}`
                                  );
                                  showTempBanner(
                                    `تمت معالجة ملاحظة (${rec.employeeName}) ورفع الرضا الوظيفي!`
                                  );
                                } catch (err) {
                                  showTempBanner(
                                    err instanceof Error
                                      ? err.message
                                      : 'تعذر تنفيذ الحل'
                                  );
                                }
                              }}
                              className="p-2 rounded-xl bg-slate-900 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 text-right flex flex-wrap items-center justify-between gap-2 cursor-pointer transition-colors"
                            >
                              <div>
                                <div className="font-bold text-white text-[11px]">
                                  {sol.labelAr}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {sol.effectSummaryAr}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-num font-bold text-[10px]">
                                {sol.costPiastres > 0
                                  ? formatEGP(sol.costPiastres)
                                  : 'مجاني (تنظيمي)'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.status === 'RESOLVED' && rec.resolutionSummaryAr && (
                      <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[10px] font-bold">
                        ✓ {rec.resolutionSummaryAr}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Smartphone Home Indicator Bar */}
        <div className="bg-slate-950 py-1.5 flex justify-center border-t border-slate-800 shrink-0">
          <div className="w-28 h-1 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>
  );
};
