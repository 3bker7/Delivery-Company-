import {
  GameState,
  GuideTaskStatus,
  InlineBubbleNotification,
  ManagerGuideTask,
} from '../types/game';
import { formatClockTime, formatEGP } from './financeEngine';
import { calculateEgyptRouteDistance } from './geographyEngine';
import { evaluateCompanyLevelProgress } from './levelAndTimeEngine';
import {
  DEFAULT_QUOTED_CLIENT_SLA_HOURS,
  MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS,
} from './pricingAndMarketEngine';
import { getWarehouseUtilizationMetrics } from './shipmentEngine';
import { resolveCourierEffectiveVehicle } from './businessDeveloperEngine';

export interface SecretaryDecisionInspectionInput {
  decisionType:
    | 'ACCEPT_SHIPMENT'
    | 'NEGOTIATE_SHIPMENT'
    | 'DISPATCH_WAKKELNY_ORDER'
    | 'LAUNCH_MARKETING_CAMPAIGN'
    | 'SIGN_PLATFORM_CONTRACT'
    | 'HANDLE_RETURN_SHIPMENT'
    | 'CUSTOM_UNCOVERED_DECISION';
  trackingNumber?: string;
  platformOrderId?: string;
  courierId?: string;
  proposedPricePiastres?: number;
  proposedSlaHours?: number;
  marketingBudgetPiastres?: number;
  expectedExtraOrders?: number;
  customDecisionDescriptionAr?: string;
  customParametersProvided?: boolean;
}

export interface SecretaryInspectionReport {
  decisionType: SecretaryDecisionInspectionInput['decisionType'];
  canExecuteTechnically: boolean; // لا يمنع قراراً ممكناً لمجرد أنه محفوف بالمخاطر
  technicalBlockReasonAr?: string;
  riskLevel: 'SAFE' | 'MODERATE_RISK' | 'HIGH_RISK' | 'NEEDS_MORE_INFO';
  headlineAr: string;
  factsAr: string[]; // حقائق مؤكدة بالأرقام من بيانات الشركة الفعلية
  projectionsAr: string[]; // توقعات مبنية على المحاكاة
  alternativesAr: string[]; // بدائل قابلة للتنفيذ
  requiresMoreInfoPromptAr?: string; // عند التعامل مع قرار غير مغطى بقواعد صريحة
  inspectedAtTotalMinutes: number;
  signatureKey: string; // يتغير إذا تغيرت الموارد أو السعر أو الموعد لإعادة الفحص
}

export function createInitialManagerGuideTasks(): ManagerGuideTask[] {
  return [
    {
      id: 'GUIDE-L1-ACCEPT-PROFITABLE',
      levelRequired: 1,
      titleAr: '1. فحص وقبول أول شحنة رابحة',
      whatToDoAr:
        'افتح قسم «الشحنات»، راجع تكلفة التشغيل مقارنة بسعر الشحن، أو تفاوض مع العميل، ثم اقبل شحنة ذات ربح موجب.',
      whyImportantAr:
        'قبول الشحنات الرابحة قبل انتهاء عداد المهلة يحمي حصتك السوقية من شركات الشحن المنافسة ويبني السيولة الأولية.',
      practicalGuidanceAr:
        'تأكد أن سعر الشحن أعلى من التكلفة التقديرية للمحاسب الإداري، وأن المهلة المتفق عليها لا تقل عن 10 ساعات.',
      targetSection: 'SHIPMENTS',
      targetButtonLabelAr: 'انتقال إلى الشحنات',
      status: 'NOT_STARTED',
      progressCurrent: 0,
      progressTarget: 1,
      progressLabelAr: '0 / 1 شحنة مقبولة',
      linkedToLevelUpgrade: true,
    },
    {
      id: 'GUIDE-L1-WAREHOUSE-DISPATCH',
      levelRequired: 1,
      titleAr: '2. متابعة الفرز والتغليف وتسليم أولى الشحنات',
      whatToDoAr:
        'تابع مرور الشحنة عبر المستودع (استلام، فرز، تغليف) ثم إسنادها لمندوب متاح حتى إتمام التسليم الفعلي للعميل.',
      whyImportantAr:
        'إتمام تسليم الشحنات بنجاح هو الشرط الأساسي لتحصيل الإيرادات النقدية ورفع سمعة الشركة للترقية للمستوى الثاني.',
      practicalGuidanceAr:
        'راقب نسبة الوقود وصحة ماكينات الفرز في المستودع؛ أي توقف في الماكينات أو نفاد للوقود يؤخر خروج الطرود.',
      targetSection: 'WAREHOUSE',
      targetButtonLabelAr: 'انتقال إلى المستودع',
      status: 'NOT_STARTED',
      progressCurrent: 0,
      progressTarget: 2,
      progressLabelAr: '0 / 2 شحنة مسلمة',
      linkedToLevelUpgrade: true,
    },
    {
      id: 'GUIDE-L1-PHONE-PRICING-AND-EMPLOYEES',
      levelRequired: 1,
      titleAr: '3. ضبط نظام التسعير ومتابعة برنامج «موظفيني» بالهاتف',
      whatToDoAr:
        'افتح الهاتف الذكي للشركة، راجع «التسعير والمسافات» أو افتح تطبيق «موظفيني» لفحص حالة فريق العمل وملاحظاتهم.',
      whyImportantAr:
        'ضبط التسعير يحميك من الخسارة في الخطوط البعيدة، ومتابعة «موظفيني» تمنع الغياب والتسرب الوظيفي المبكر.',
      practicalGuidanceAr:
        'افحص أي شكوى موظف بالأدلة أولاً قبل اتخاذ قرار إداري أو صرف حافز.',
      targetSection: 'PHONE_MY_EMPLOYEES',
      targetButtonLabelAr: 'فتح تطبيق موظفيني بالهاتف',
      status: 'NOT_STARTED',
      progressCurrent: 0,
      progressTarget: 1,
      progressLabelAr: 'بانتظار مراجعة التسعير أو معالجة ملاحظة موظف',
      linkedToLevelUpgrade: false,
    },
    {
      id: 'GUIDE-L2-HR-AND-MARKETING',
      levelRequired: 2,
      titleAr: '4. توسيع الفريق وإطلاق حملة تسويقية متوازنة',
      whatToDoAr:
        'وظّف مندوباً أو موظفاً إضافياً من قسم «الموارد البشرية HR»، ثم أطلق حملة تسويقية تتناسب مع طاقة فريقك الاستيعابية.',
      whyImportantAr:
        'الترقية للمستوى 3 تتطلب فريقاً أكبر (4 موظفين نشطين على الأقل) وتدفق طلبات مستقر دون تكدس بالمستودع.',
      practicalGuidanceAr:
        'استشر السكرتير الديناميكي قبل إطلاق الحملة للتأكد من أن عدد المندوبين يكفي لاستيعاب الطلبات الجديدة.',
      lockReasonAr:
        'مقفلة حتى ترقية الشركة إلى المستوى 2 (تسليم شحنتين، سيولة 2,200 ج.م، سمعة 55).',
      targetSection: 'EMPLOYEES',
      targetButtonLabelAr: 'انتقال إلى الموارد البشرية',
      status: 'LOCKED',
      progressCurrent: 0,
      progressTarget: 4,
      progressLabelAr: '3 / 4 موظفين نشطين',
      linkedToLevelUpgrade: true,
    },
    {
      id: 'GUIDE-L3-WAKKELNY-ZONES',
      levelRequired: 3,
      titleAr: '5. تفعيل عقد «وكلني» وتوزيع المندوبين على مناطق الخدمة',
      whatToDoAr:
        'انتقل إلى «تطوير الأعمال (وكلني & زورو)»، وقّع عقد «وكلني»، اختر مقر الانطلاق ومناطق الخدمة، وخصص مندوبين لكل منطقة.',
      whyImportantAr:
        'طلبات «وكلني» تخرج من المطعم للعميل مباشرة بزمن دقائق (وليس 10 ساعات كالمستودع) وتمنح عوائد سريعة ومكافآت سرعة.',
      practicalGuidanceAr:
        'وزّع المندوبين على المناطق عالية الطلب، ولا تسند طلب منطقة لمندوب بعيد إلا بتغطية استثنائية محسوبة التكلفة.',
      lockReasonAr:
        'مقفلة حتى الوصول إلى المستوى 3 أو اليوم الثالث لفتح عقود المنصات.',
      targetSection: 'BUSINESS_DEVELOPER',
      targetButtonLabelAr: 'انتقال إلى إدارة تطوير الأعمال والعقود',
      status: 'LOCKED',
      progressCurrent: 0,
      progressTarget: 1,
      progressLabelAr: 'بانتظار توقيع عقد وكلني وتخصيص المناطق',
      linkedToLevelUpgrade: true,
    },
    {
      id: 'GUIDE-L4-RETURNS-AND-CONTRACTS',
      levelRequired: 4,
      titleAr: '6. إدارة المرتجعات الموثقة وحسم النزاعات مع الشركات العميلة',
      whatToDoAr:
        'تابع أي شحنة مرفوضة أو متعذرة التسليم، وأكمل دورة المرتجع حتى الحصول على تأكيد استلام موثق من الشركة العميلة وتسوية رسوم المرتجع.',
      whyImportantAr:
        'إغلاق المرتجع دون تأكيد استلام موثق يعرض الشركة لخسارة البضاعة أو ضياع رسوم الشحن والمرتجع المستحقة.',
      practicalGuidanceAr:
        'راجع ملف الشركة العميلة لمعرفة سجلها في تأخير تأكيد المرتجعات قبل قبول شحنات دفع عند الاستلام عالية القيمة.',
      lockReasonAr:
        'مقفلة حتى الوصول إلى المستوى 4 (تسليم 10 طلبات وتوقيع عقد شراكة).',
      targetSection: 'SHIPMENTS',
      targetButtonLabelAr: 'إدارة المرتجعات والشحنات',
      status: 'LOCKED',
      progressCurrent: 0,
      progressTarget: 1,
      progressLabelAr: '0 / 1 مرتجع مؤكد ومغلق أو 10 شحنات مسلمة',
      linkedToLevelUpgrade: true,
    },
    {
      id: 'GUIDE-L5-REGIONAL-BRANCH',
      levelRequired: 5,
      titleAr: '7. التوسع الجغرافي وافتتاح أول فرع إقليمي بالمحافظات',
      whatToDoAr:
        'افتح الهاتف الذكي (قسم المستويات والفروع) وافتح فرعاً إقليمياً جديداً في الإسكندرية أو الدلتا أو الصعيد.',
      whyImportantAr:
        'الفروع الإقليمية ترفع سعة التخزين وتقلل تكلفة وزمن شحنات المحافظات البعيدة.',
      practicalGuidanceAr:
        'تأكد من توفر سيولة التأسيس (2,800 ج.م) وفائض تشغيلي يغطي المصروف اليومي للفرع.',
      lockReasonAr:
        'مقفلة حتى الوصول إلى المستوى الخامس (المستوى 5 — الفروع والتوسع الجغرافي).',
      targetSection: 'PHONE_PRICING',
      targetButtonLabelAr: 'فتح إدارة الفروع بالهاتف',
      status: 'LOCKED',
      progressCurrent: 0,
      progressTarget: 1,
      progressLabelAr: '0 / 1 فرع إقليمي نشط',
      linkedToLevelUpgrade: true,
    },
  ];
}

export function createInitialBubbleMessages(
  currentDay = 1
): InlineBubbleNotification[] {
  return [
    {
      id: 'BUBBLE-INIT-GUIDE-1',
      dedupeKey: 'BUBBLE-INIT-GUIDE-1',
      sender: 'MANAGER_GUIDE',
      category: 'GUIDE_HINT',
      titleAr: 'دليل المدير: خطوتك الأولى في المستوى 1',
      shortPreviewAr:
        'لديك 3 مهام أساسية في المستوى الأول؛ ابدأ بفحص وقبول شحنة رابحة قبل انتهاء عداد المهلة.',
      factsAr: [
        'تبدأ الشركة في المستوى 1 برصيد نقدي 13,000.00 ج.م والتزامات مستحقة بقيمة 5,000.00 ج.م (موزعة على 4 بنود في صفحة الديون).',
        'يجب سداد أهم 3 التزامات أولاً، ثم إطلاق الحملة التسويقية التدريبية بقيمة 6,000.00 ج.م، ومراجعة وقبول الطلبات الرابحة.',
      ],
      projectionsAr: [
        'إتمام التدريب العملي على >= 70% من الأنظمة الأساسية ينقلك بسلاسة إلى الإدارة الحرة الكاملة ومهام ترقية المستويات.',
      ],
      alternativesAr: [
        'افتح صفحة «الديون» لسداد أول 3 التزامات، أو اضغط على فقاعة «دليل المدير» للمتابعة خطوة بخطوة.',
      ],
      severity: 'INFO',
      createdAtDay: currentDay,
      createdAtTimeLabel: '09:00 AM',
      createdAtTotalMinutes: 540,
      read: false,
      dismissed: false,
      relatedTargetSection: 'DEBTS',
    },
    {
      id: 'BUBBLE-INIT-SEC-1',
      dedupeKey: 'BUBBLE-INIT-SEC-1',
      sender: 'SECRETARY',
      category: 'DECISION_INSPECTION',
      titleAr: 'السكرتير الذكي: مرافقتك في المرحلة التعليمية والتشغيل',
      shortPreviewAr:
        'أهلاً بك يا سيادة المدير! سأشرح لك كل صفحة عند زيارتها لأول مرة، وأفحص كل أوردر وقرار بالأرقام الحقيقية قبل أن تقبله.',
      factsAr: [
        'السيولة الافتتاحية: 13,000.00 ج.م • إجمالي الديون والالتزامات: 5,000.00 ج.م (كهرباء 1,500، ضرائب 1,400، إيجار 1,300، رواتب 800 ج.م).',
        'المندوبون النشطون في اليوم الأول: عم صابر وحسن الشبراوي، والشحنة TRK-1001 جاهزة بالمستودع للتسليم.',
        'الشحنة TRK-1002 (الحاج سعيد) مسعّرة بـ 150 ج.م وتكلفتها التشغيلية 55 ج.م (صافي ربح متوقع +95 ج.م).',
        'الشحنة TRK-1003 (م. كريم — آجل) مسعّرة بـ 210 ج.م وتكلفتها 80 ج.م (صافي ربح متوقع +130 ج.م).',
      ],
      projectionsAr: [
        'سداد أول 3 ديون (4,200 ج.م) ثم إطلاق حملة التسويق التدريبية (6,000 ج.م) يترك لك 2,800 ج.م احتياطي تشغيل فوري بالإضافة لإيرادات الشحنات.',
      ],
      alternativesAr: [
        'انتقل إلى قسم «الديون» لسداد أهم 3 التزامات، أو راجع تحليل الربحية على بطاقات الطلبات في قسم «الشحنات».',
      ],
      severity: 'INFO',
      createdAtDay: currentDay,
      createdAtTimeLabel: '09:00 AM',
      createdAtTotalMinutes: 540,
      read: false,
      dismissed: false,
      relatedTargetSection: 'DEBTS',
    },
  ];
}

/**
 * Pushes a new inline bubble message for either the Dynamic Secretary or Manager Guide.
 * Keeps messages concise, non-modal, and persistent until dismissed by the player via ✓.
 */
export function pushInlineBubbleNotification(
  state: GameState,
  notification: Omit<
    InlineBubbleNotification,
    'id' | 'createdAtDay' | 'createdAtTimeLabel' | 'createdAtTotalMinutes' | 'read' | 'dismissed'
  >
): GameState {
  const existing = state.guideAndSecretary || {
    guideTasks: createInitialManagerGuideTasks(),
    bubbleMessages: createInitialBubbleMessages(state.company.currentDay),
  };

  // Avoid duplicate active notifications with the same dedupeKey
  const alreadyExists = existing.bubbleMessages.some(
    (m) => m.dedupeKey === notification.dedupeKey && !m.dismissed
  );
  if (alreadyExists) {
    return state;
  }

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const newMsg: InlineBubbleNotification = {
    ...notification,
    id: `BUB-${notification.sender}-${state.company.currentDay}-${Date.now()}-${existing.bubbleMessages.length + 1}`,
    createdAtDay: state.company.currentDay,
    createdAtTimeLabel: timeLabel,
    createdAtTotalMinutes: state.clock.totalElapsedMinutes,
    read: false,
    dismissed: false,
  };

  return {
    ...state,
    guideAndSecretary: {
      ...existing,
      bubbleMessages: [newMsg, ...existing.bubbleMessages].slice(0, 30),
    },
  };
}

/**
 * Marks a bubble message as read when the player clicks it in-place to expand/read its text.
 * Returns the exact same state reference if the message is already read.
 */
export function markBubbleNotificationRead(
  state: GameState,
  bubbleId: string
): GameState {
  if (!state.guideAndSecretary) return state;
  const target = state.guideAndSecretary.bubbleMessages.find(
    (m) => m.id === bubbleId
  );
  if (!target || target.read) return state;

  return {
    ...state,
    guideAndSecretary: {
      ...state.guideAndSecretary,
      bubbleMessages: state.guideAndSecretary.bubbleMessages.map((m) =>
        m.id === bubbleId ? { ...m, read: true } : m
      ),
    },
  };
}

/**
 * Dismisses a bubble message when the player clicks the ✓ checkmark button.
 * Returns the exact same state reference if the message is already dismissed.
 */
export function dismissBubbleNotification(
  state: GameState,
  bubbleId: string
): GameState {
  if (!state.guideAndSecretary) return state;
  const target = state.guideAndSecretary.bubbleMessages.find(
    (m) => m.id === bubbleId
  );
  if (!target || (target.read && target.dismissed)) return state;

  return {
    ...state,
    guideAndSecretary: {
      ...state.guideAndSecretary,
      bubbleMessages: state.guideAndSecretary.bubbleMessages.map((m) =>
        m.id === bubbleId ? { ...m, read: true, dismissed: true } : m
      ),
    },
  };
}

/**
 * Evaluates and updates Manager Guide tasks strictly from REAL game state data
 * (never from merely clicking a button). Emits a guide notification when a task completes.
 * Preserves reference identity (`return state;`) when no task fields changed.
 */
export function syncManagerGuideTasksWithRealState(
  state: GameState
): GameState {
  const gs = state.guideAndSecretary || {
    guideTasks: createInitialManagerGuideTasks(),
    bubbleMessages: createInitialBubbleMessages(state.company.currentDay),
  };

  const companyLevel = state.company.level || 1;
  const acceptedProfitableShipments = state.shipments.filter(
    (s) =>
      s.status !== 'NEW_REQUEST' &&
      s.status !== 'REJECTED' &&
      s.status !== 'CANCELLED_EXPIRED' &&
      s.serviceFeePiastres > s.estimatedOperatingCostPiastres
  ).length;

  const deliveredWarehouseCount = state.shipments.filter(
    (s) => s.status === 'DELIVERED'
  ).length;
  const deliveredPlatformCount =
    state.businessDeveloper?.platformOrders.filter(
      (o) => o.status === 'DELIVERED' || o.status === 'DELAYED_DELIVERED'
    ).length ?? 0;
  const totalDeliveredCount = deliveredWarehouseCount + deliveredPlatformCount;

  const pricingCustomized =
    state.pricingEngine &&
    (state.pricingEngine.mode !== 'AUTO' ||
      state.pricingEngine.offers.some((o) => o.active));
  const resolvedEmployeeVoiceCount =
    state.myEmployeesApp?.voiceRecords.filter((v) => v.status === 'RESOLVED')
      .length ?? 0;

  const activeEmployeesCount = state.employees.filter(
    (e) => e.status !== 'TERMINATED' && !e.terminated
  ).length;
  const campaignsCount = state.marketing?.campaigns.length ?? 0;

  const wakkelnySigned = Boolean(
    state.businessDeveloper?.contracts.WAKKELNY.signed
  );
  const wakkelnyAllocatedCouriersCount = (
    state.businessDeveloper?.wakkelnyZones || []
  ).reduce((sum, z) => sum + z.allocatedCourierIds.length, 0);

  const confirmedReturnsCount = state.shipments.filter(
    (s) => s.returnRecord?.returnStatus === 'CONFIRMED_CLOSED'
  ).length;

  const branchesCount = (state.branches || []).length;
  const levelEval = evaluateCompanyLevelProgress(state);

  const newlyCompletedTasks: ManagerGuideTask[] = [];
  let anyTaskFieldChanged = !state.guideAndSecretary;

  const updatedTasks = gs.guideTasks.map((task): ManagerGuideTask => {
    let status: GuideTaskStatus = task.status;
    let progressCurrent = task.progressCurrent;
    let progressTarget = task.progressTarget;
    let progressLabelAr = task.progressLabelAr;
    let lockReasonAr = task.lockReasonAr;

    if (task.id === 'GUIDE-L1-ACCEPT-PROFITABLE') {
      progressCurrent = Math.min(1, acceptedProfitableShipments);
      progressTarget = 1;
      progressLabelAr = `${progressCurrent} / 1 شحنة رابحة مقبولة`;
      status = progressCurrent >= 1 ? 'COMPLETED' : 'IN_PROGRESS';
    } else if (task.id === 'GUIDE-L1-WAREHOUSE-DISPATCH') {
      progressCurrent = Math.min(2, totalDeliveredCount);
      progressTarget = 2;
      progressLabelAr = `${progressCurrent} / 2 شحنة مسلمة بنجاح`;
      const anyInWarehouseOrTransit = state.shipments.some(
        (s) => s.status !== 'NEW_REQUEST' && s.status !== 'REJECTED'
      );
      status =
        progressCurrent >= 2
          ? 'COMPLETED'
          : anyInWarehouseOrTransit
            ? 'IN_PROGRESS'
            : 'NOT_STARTED';
    } else if (task.id === 'GUIDE-L1-PHONE-PRICING-AND-EMPLOYEES') {
      const done = Boolean(pricingCustomized || resolvedEmployeeVoiceCount > 0);
      progressCurrent = done ? 1 : 0;
      progressTarget = 1;
      progressLabelAr = done
        ? 'تم ضبط التسعير أو معالجة ملاحظات الموظفين ✓'
        : 'افتح تطبيق موظفيني أو التسعير بالهاتف';
      status = done ? 'COMPLETED' : 'IN_PROGRESS';
    } else if (task.id === 'GUIDE-L2-HR-AND-MARKETING') {
      if (companyLevel < 2) {
        const unmet = levelEval.requirements
          .filter((r) => !r.met)
          .map((r) => r.labelAr)
          .join('، ');
        status = 'LOCKED';
        lockReasonAr = `مقفلة حتى الترقية للمستوى 2 (الشروط المتبقية: ${unmet || 'اضغط ترقية المستوى'}).`;
      } else {
        lockReasonAr = undefined;
        const done = activeEmployeesCount >= 4 && campaignsCount >= 1;
        progressCurrent =
          (activeEmployeesCount >= 4 ? 2 : 1) + (campaignsCount >= 1 ? 2 : 0);
        progressTarget = 4;
        progressLabelAr = `الموظفون: ${activeEmployeesCount}/4 • الحملات: ${campaignsCount}/1`;
        status = done ? 'COMPLETED' : 'IN_PROGRESS';
      }
    } else if (task.id === 'GUIDE-L3-WAKKELNY-ZONES') {
      const isDayOrLevelReady =
        companyLevel >= 3 || state.company.currentDay >= 3;
      if (!isDayOrLevelReady) {
        status = 'LOCKED';
        lockReasonAr = `مقفلة حتى الوصول إلى المستوى 3 أو اليوم الثالث (أنت الآن في المستوى ${companyLevel}، اليوم ${state.company.currentDay}).`;
      } else {
        lockReasonAr = undefined;
        const done = wakkelnySigned && wakkelnyAllocatedCouriersCount >= 1;
        progressCurrent =
          (wakkelnySigned ? 1 : 0) +
          (wakkelnyAllocatedCouriersCount >= 1 ? 1 : 0);
        progressTarget = 2;
        progressLabelAr = wakkelnySigned
          ? `عقد وكلني مفعّل • مناديب المناطق: ${wakkelnyAllocatedCouriersCount}`
          : 'وقّع عقد وكلني وخصص مناديب المناطق';
        status = done ? 'COMPLETED' : 'IN_PROGRESS';
      }
    } else if (task.id === 'GUIDE-L4-RETURNS-AND-CONTRACTS') {
      if (companyLevel < 3 && confirmedReturnsCount === 0) {
        status = 'LOCKED';
        lockReasonAr =
          'مقفلة حتى الوصول للمستوى 3+ أو ظهور أول حالة مرتجع تحتاج توثيق استلام.';
      } else {
        lockReasonAr = undefined;
        const done = confirmedReturnsCount >= 1 || totalDeliveredCount >= 10;
        progressCurrent = done ? 1 : 0;
        progressTarget = 1;
        progressLabelAr =
          confirmedReturnsCount >= 1
            ? `تم توثيق وإغلاق ${confirmedReturnsCount} مرتجع رسمياً`
            : `الطلبات المسلمة: ${totalDeliveredCount}/10 • المرتجعات المؤكدة: ${confirmedReturnsCount}`;
        status = done ? 'COMPLETED' : 'IN_PROGRESS';
      }
    } else if (task.id === 'GUIDE-L5-REGIONAL-BRANCH') {
      if (companyLevel < 5) {
        status = 'LOCKED';
        lockReasonAr = `مقفلة حتى الوصول إلى المستوى 5 (مستوى الشركة الحالي: ${companyLevel}/5).`;
      } else {
        lockReasonAr = undefined;
        progressCurrent = Math.min(1, branchesCount);
        progressTarget = 1;
        progressLabelAr = `${branchesCount} / 1 فرع إقليمي بالمحافظات`;
        status = branchesCount >= 1 ? 'COMPLETED' : 'IN_PROGRESS';
      }
    }

    if (
      task.status !== status ||
      task.progressCurrent !== progressCurrent ||
      task.progressTarget !== progressTarget ||
      task.progressLabelAr !== progressLabelAr ||
      task.lockReasonAr !== lockReasonAr
    ) {
      anyTaskFieldChanged = true;
    }

    if (task.status !== 'COMPLETED' && status === 'COMPLETED') {
      newlyCompletedTasks.push({
        ...task,
        status,
        progressCurrent,
        progressTarget,
        progressLabelAr,
      });
    }

    if (
      task.status === status &&
      task.progressCurrent === progressCurrent &&
      task.progressTarget === progressTarget &&
      task.progressLabelAr === progressLabelAr &&
      task.lockReasonAr === lockReasonAr
    ) {
      return task;
    }

    return {
      ...task,
      status,
      progressCurrent,
      progressTarget,
      progressLabelAr,
      lockReasonAr,
    };
  });

  if (!anyTaskFieldChanged && newlyCompletedTasks.length === 0) {
    return state;
  }

  let nextState: GameState = {
    ...state,
    guideAndSecretary: {
      ...gs,
      guideTasks: updatedTasks,
    },
  };

  for (const completed of newlyCompletedTasks) {
    nextState = pushInlineBubbleNotification(nextState, {
      dedupeKey: `GUIDE-DONE-${completed.id}`,
      sender: 'MANAGER_GUIDE',
      category: 'TASK_COMPLETED',
      titleAr: `إنجاز مهمة في دليل المدير: ${completed.titleAr}`,
      shortPreviewAr: `أحسنت! اكتملت شروط المهمة (${completed.progressLabelAr}) من واقع بيانات التشغيل الفعلية.`,
      factsAr: [
        `المهمة المكتملة: ${completed.titleAr}`,
        `الحالة المحققة: ${completed.progressLabelAr}`,
      ],
      projectionsAr: [
        'يقربك هذا الإنجاز مباشرة من استيفاء شروط الترقية للمستوى التالي للشركة.',
      ],
      alternativesAr: [
        'افتح فقاعة «دليل المدير» لاستعراض المهمة التالية والانتقال المباشر إليها.',
      ],
      severity: 'SUCCESS',
      relatedTargetSection: completed.targetSection,
    });
  }

  return nextState;
}

/**
 * Deterministic Dynamic Secretary Advisor (`السكرتير الديناميكي`):
 * Inspects a proposed decision BEFORE or WHEN it is executed, using real company numbers:
 * - Liquidity, operational cost, expected profit margin, obligations.
 * - Courier, staff, warehouse, and vehicle availability.
 * - Covered zones, distances, and execution times.
 * - Contract terms, SLA deadlines, prices, and returns policy.
 * - Client company reputation and documented history of delaying return confirmations.
 * - Marketing budget vs. operational capacity to fulfill expected orders.
 *
 * Rules enforced:
 * - Advises and never takes the decision instead of the player.
 * - Does NOT block a possible decision merely because it is risky (`canExecuteTechnically: true`).
 * - Distinguishes Facts (`factsAr`) from Projections (`projectionsAr`) and offers Alternatives (`alternativesAr`).
 * - Re-evaluates dynamically when resources, price, or SLA hours change (`signatureKey`).
 * - Requests additional info (`requiresMoreInfoPromptAr`) when a custom decision is not covered by explicit rules.
 */
export function inspectDecisionWithDynamicSecretary(
  state: GameState,
  input: SecretaryDecisionInspectionInput
): SecretaryInspectionReport {
  const nowMinutes = state.clock.totalElapsedMinutes;
  const availableCouriers = state.couriers.filter(
    (c) =>
      c.status === 'AVAILABLE' &&
      !c.needsCompanyVehicle &&
      resolveCourierEffectiveVehicle(state, c) !== null
  );
  const allActiveCouriers = state.couriers.filter(
    (c) =>
      c.status !== 'UNAVAILABLE' &&
      !c.needsCompanyVehicle &&
      resolveCourierEffectiveVehicle(state, c) !== null
  );
  const whMetrics = getWarehouseUtilizationMetrics(state);

  const signatureKey = JSON.stringify({
    type: input.decisionType,
    trk: input.trackingNumber,
    ord: input.platformOrderId,
    cour: input.courierId,
    price: input.proposedPricePiastres,
    sla: input.proposedSlaHours,
    mkt: input.marketingBudgetPiastres,
    cash: state.company.cashPiastres,
    availCouriers: availableCouriers.length,
    whInside: whMetrics.insideShipmentsCount,
  });

  // 1. Uncovered / Custom Decision handling
  if (input.decisionType === 'CUSTOM_UNCOVERED_DECISION') {
    if (!input.customParametersProvided) {
      return {
        decisionType: 'CUSTOM_UNCOVERED_DECISION',
        canExecuteTechnically: true,
        riskLevel: 'NEEDS_MORE_INFO',
        headlineAr:
          'السكرتير التنفيذي: هذا القرار غير مغطى بقاعدة صريحة ويحتاج معلومات إضافية',
        factsAr: [
          `السيولة النقدية الحالية بالخزينة: ${formatEGP(state.company.cashPiastres)}.`,
          `المندوبون المتاحون فوراً: ${availableCouriers.length} من أصل ${allActiveCouriers.length} مندوب مفعل.`,
        ],
        projectionsAr: [
          'لا يمكن للسكرتير ادعاء اليقين أو تخمين تكلفة هذا القرار المخصص دون تحديد التكلفة المتوقعة والمنطقة والجدول الزمني.',
        ],
        alternativesAr: [
          'حدد الميزانية المخصصة والمنطقة الجغرافية وعدد الساعات المتوقعة ليتمكن السكرتير من إعادة فحص الأثر المالي والتشغيلي بدقة.',
        ],
        requiresMoreInfoPromptAr: `لتقييم القرار (${input.customDecisionDescriptionAr || 'قرار إداري مخصص'}) بدقة دون تخمين: يرجى تحديد التكلفة النقدية المتوقعة، المنطقة الجغرافية المستهدفة، والمهلة الزمنية المطلوبة.`,
        inspectedAtTotalMinutes: nowMinutes,
        signatureKey,
      };
    }
  }

  // 2. Inspecting Shipment Acceptance or Price/SLA Negotiation
  if (
    input.decisionType === 'ACCEPT_SHIPMENT' ||
    input.decisionType === 'NEGOTIATE_SHIPMENT'
  ) {
    const sh = state.shipments.find(
      (s) => s.trackingNumber === input.trackingNumber
    );
    if (!sh) {
      return {
        decisionType: input.decisionType,
        canExecuteTechnically: false,
        technicalBlockReasonAr: 'الشحنة المطلوبة غير موجودة في السجلات.',
        riskLevel: 'HIGH_RISK',
        headlineAr: 'تعذر العثور على بيانات الشحنة',
        factsAr: ['لم يتم العثور على رقم التتبع المطلوب.'],
        projectionsAr: [],
        alternativesAr: ['تحقق من رقم التتبع في جدول الشحنات.'],
        inspectedAtTotalMinutes: nowMinutes,
        signatureKey,
      };
    }

    const effectivePricePiastres =
      input.proposedPricePiastres ?? sh.serviceFeePiastres;
    const effectiveSlaHours =
      input.proposedSlaHours ??
      sh.quotedClientSlaHours ??
      DEFAULT_QUOTED_CLIENT_SLA_HOURS;
    const costPiastres = sh.estimatedOperatingCostPiastres;
    const netMarginPiastres = effectivePricePiastres - costPiastres;
    const minOpHours =
      sh.minOperationalHours ?? MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS;

    const clientObj = state.clients.find((c) => c.id === sh.clientId);
    const clientProfile = clientObj?.contractProfile;
    const route = calculateEgyptRouteDistance(sh.pickupZone, sh.deliveryZone);

    const facts: string[] = [
      `سعر الشحن المعروض: ${formatEGP(effectivePricePiastres)} مقابل تكلفة تشغيلية فعلية: ${formatEGP(costPiastres)} (صافي الهامش: ${formatEGP(netMarginPiastres)}).`,
      `المسافة المحسوبة (${sh.pickupZone} ← ${sh.deliveryZone}): ${route.distanceKm} كم (${route.accuracyLabelAr}).`,
      `المندوبون المتاحون حالياً: ${availableCouriers.length} متاح فوراً (من إجمالي ${allActiveCouriers.length} مندوب يمتلك مركبة صالحة).`,
      `إشغال المستودع الحالي: ${whMetrics.insideShipmentsCount} / ${whMetrics.maxCapacity} طرود (${whMetrics.utilizationPercent}%).`,
    ];

    if (clientProfile && clientProfile.returnConfirmationDelayCount > 0) {
      facts.push(
        `سجل العميل (${sh.clientName}): موثق لديه ${clientProfile.returnConfirmationDelayCount} واقعة تأخير في تأكيد استلام المرتجعات و${clientProfile.recipientRefusalCount} حالة رفض استلام.`
      );
    }

    const projections: string[] = [];
    const alternatives: string[] = [];
    let riskLevel: SecretaryInspectionReport['riskLevel'] = 'SAFE';
    const warnings: string[] = [];

    // Check 1: Price below operational cost
    if (netMarginPiastres < 0) {
      riskLevel = 'HIGH_RISK';
      warnings.push(
        `تحذير مالي: السعر (${formatEGP(effectivePricePiastres)}) أقل من التكلفة التشغيلية (${formatEGP(costPiastres)}) بخسارة قدرها ${formatEGP(Math.abs(netMarginPiastres))}!`
      );
      projections.push(
        `تنفيذ الطلب بهذا السعر سيؤدي إلى خسارة تشغيلية صافية قدرها ${formatEGP(Math.abs(netMarginPiastres))} تُخصم من سيولة الشركة.`
      );
      alternatives.push(
        `تفاوض مع العميل لرفع سعر الشحن إلى ${formatEGP(costPiastres + 2500)} على الأقل لتحقيق هامش ربح آمن (+25 ج.م).`
      );
    } else {
      projections.push(
        `من المتوقع تحقيق صافي ربح تشغيلي قدره ${formatEGP(netMarginPiastres)} عند إتمام التسليم.`
      );
    }

    // Check 2: No available courier or vehicle right now
    if (availableCouriers.length === 0) {
      riskLevel = 'HIGH_RISK';
      warnings.push(
        'تحذير موارد: لا يوجد أي مندوب متاح حالياً لاستلام وتوزيع الطلب بعد تجهيزه!'
      );
      projections.push(
        allActiveCouriers.length === 0
          ? 'لا يوجد في الشركة أي مندوب مفعل بمركبة صالحة؛ ستتوقف الشحنة داخل المستودع بعد التغليف وتتعرض لغرامة تأخير.'
          : 'جميع المندوبين في مهام خارجية حالياً؛ قد تنتظر الشحنة في منطقة الإرسال حتى عودة أقرب مندوب.'
      );
      alternatives.push(
        'خصّص مركبة لمندوب ينتظر مركبة، أو انتظر عودة مندوب من خط السير، أو تفاوض مع العميل على مهلة 15 ساعة لإعطاء هامش أمان.'
      );
    }

    // Check 3: Promised SLA hours vs minimum operational hours / resources
    if (effectiveSlaHours < minOpHours) {
      riskLevel = 'HIGH_RISK';
      warnings.push(
        `المهلة المقترحة (${effectiveSlaHours} ساعة) أقل من الحد الأدنى التشغيلي للمستودع (${minOpHours} ساعات).`
      );
      projections.push(
        `يرفض النظام الوعد بأقل من ${minOpHours} ساعات لأن الفرز والتغليف والنقل يتطلبون هذا الحد الأدنى.`
      );
      alternatives.push(
        `اضبط مهلة التفاوض على ${minOpHours} إلى 15 ساعة.`
      );
    } else if (effectiveSlaHours <= 11 && availableCouriers.length <= 1) {
      if (riskLevel === 'SAFE') riskLevel = 'MODERATE_RISK';
      warnings.push(
        `الوعد بمهلة ضيقة (${effectiveSlaHours} ساعة) مع توفر ${availableCouriers.length} مندوب فقط يرفع خطر التأخير.`
      );
      alternatives.push(
        'اطلب مهلة 15 ساعة من العميل لتأمين هامش 5 ساعات للطوارئ.'
      );
    }

    // Check 4: Client history of delaying return confirmation
    if (clientProfile && clientProfile.returnConfirmationDelayCount > 0) {
      if (riskLevel === 'SAFE') riskLevel = 'MODERATE_RISK';
      warnings.push(
        `تنبيه تعاقدي: العميل (${sh.clientName}) لديه سجل موثق بتأخير تأكيد استلام المرتجعات (${clientProfile.returnConfirmationDelayCount} مرات).`
      );
      projections.push(
        'في حال رفض المستلم النهائي للطرد، قد يماطل هذا التاجر في تأكيد استلام المرتجع مما يعلق تسوية رسوم المرتجع.'
      );
      alternatives.push(
        'اشترط توثيق كود تأكيد الاستلام عند إرجاع أي طرد لهذا العميل، أو أعطِ الأولوية لعملاء ذوي سجل التزام أعلى.'
      );
    }

    if (alternatives.length === 0) {
      alternatives.push(
        'المعطيات المالية والتشغيلية متوازنة؛ يمكنك اعتماد القرار أو التفاوض لزيادة هامش الربح.'
      );
    }

    const headlineAr =
      warnings.length > 0
        ? warnings[0]
        : `فحص السكرتير للشحنة ${sh.trackingNumber}: صفقة رابحة (+${formatEGP(netMarginPiastres)}) وموارد كافية`;

    return {
      decisionType: input.decisionType,
      canExecuteTechnically: effectiveSlaHours >= minOpHours,
      technicalBlockReasonAr:
        effectiveSlaHours < minOpHours
          ? `لا يمكن الوعد بمهلة أقل من الحد الأدنى التشغيلي (${minOpHours} ساعات).`
          : undefined,
      riskLevel,
      headlineAr,
      factsAr: facts,
      projectionsAr: projections,
      alternativesAr: alternatives,
      inspectedAtTotalMinutes: nowMinutes,
      signatureKey,
    };
  }

  // 3. Inspecting Wakkelny Order Dispatch (Zone coverage, courier distance, capacity)
  if (input.decisionType === 'DISPATCH_WAKKELNY_ORDER') {
    const bd = state.businessDeveloper;
    const order = bd?.platformOrders.find((o) => o.id === input.platformOrderId);
    const courier = state.couriers.find((c) => c.id === input.courierId);
    const zones = bd?.wakkelnyZones || [];
    const targetZone = zones.find(
      (z) =>
        z.zoneNameAr === order?.pickupZone ||
        z.zoneNameAr === order?.deliveryZone ||
        z.sector === order?.directionSector
    );

    const isCourierAllocatedToZone = targetZone
      ? targetZone.allocatedCourierIds.includes(courier?.id || '')
      : false;
    const isZoneCovered = targetZone
      ? targetZone.allocatedCourierIds.length > 0
      : false;

    const routeDist = order
      ? calculateEgyptRouteDistance(
          courier?.zoneAr || 'العباسية',
          order.pickupZone
        )
      : null;

    const activeOrdersOnCourier =
      (courier?.activePlatformOrderIds?.length || 0) +
      (courier?.assignedTrackingNumbers.length || 0);

    const facts: string[] = [
      `الطلب: ${order?.trackingNumber || ''} من (${order?.pickupPartnerAr || ''}) في ${order?.pickupZone || ''} إلى ${order?.deliveryZone || ''}.`,
      `المندوب المرشح: ${courier?.name || 'غير محدد'} — نطاق تمركزه: ${courier?.zoneAr || 'المركز'} — المهام الحالية عليه: ${activeOrdersOnCourier}.`,
      `المسافة من تمركز المندوب إلى المطعم: ${routeDist ? `${routeDist.distanceKm} كم` : 'غير محددة'} • زمن تحضير المطعم: ${order?.prepTimeMinutes || 15} د.`,
    ];

    const projections: string[] = [];
    const alternatives: string[] = [];
    let riskLevel: SecretaryInspectionReport['riskLevel'] = 'SAFE';
    let headlineAr = `فحص توجيه طلب وكلني (${order?.trackingNumber || ''}): تغطية منطقية`;

    if (!isZoneCovered || (!isCourierAllocatedToZone && (routeDist?.distanceKm || 0) > 12)) {
      riskLevel = 'HIGH_RISK';
      headlineAr = `تحذير تغطية وكلني: الطلب في (${order?.pickupZone}) بعيد عن مناطق التغطية المخصصة للمندوب (${routeDist?.distanceKm || 15} كم)!`;
      projections.push(
        `إسناد الطلب لمندوب خارج المنطقة يتطلب تغطية استثنائية بمسافة إضافية (${routeDist?.distanceKm || 15} كم) ويزيد تكلفة الوقود وزمن الوصول بحوالي ${Math.round((routeDist?.estimatedTransitMinutes || 20) * 0.8)} دقيقة.`
      );
      alternatives.push(
        'خصص مندوباً لمنطقة الخدمة أولاً من لوحة مناطق وكلني، أو استخدم التغطية الاستثنائية مع تحمل التكلفة الإضافية المحسوبة.'
      );
    }

    if (activeOrdersOnCourier >= 2) {
      riskLevel = 'HIGH_RISK';
      headlineAr = `تحذير ضغط المندوبين: المندوب (${courier?.name}) يحمل ${activeOrdersOnCourier} طلبات نشطة بالفعل!`;
      projections.push(
        'تحميل المندوب فوق طاقته سيؤدي إلى تأخر استلام الوجبة الساخنة وضياع مكافأة السرعة واحتمال خصم غرامة تأخير.'
      );
      alternatives.push(
        'أسند الطلب لمندوب متفرغ، أو وظف مندوباً إضافياً لتغطية وقت الذروة.'
      );
    }

    if (alternatives.length === 0) {
      projections.push(
        'المندوب متمركز ضمن نطاق الخدمة ومن المتوقع الوصول للمطعم في الوقت المناسب وكسب مكافأة السرعة إذا التزم المطعم بزمن التحضير.'
      );
      alternatives.push('يمكنك تنفيذ التوجيه الفوري بأمان.');
    }

    return {
      decisionType: 'DISPATCH_WAKKELNY_ORDER',
      canExecuteTechnically: Boolean(order && courier),
      riskLevel,
      headlineAr,
      factsAr: facts,
      projectionsAr: projections,
      alternativesAr: alternatives,
      inspectedAtTotalMinutes: nowMinutes,
      signatureKey,
    };
  }

  // 4. Inspecting Marketing Campaign vs Operational Capacity
  const mktCost = input.marketingBudgetPiastres ?? 100000;
  const expectedNewOrders = input.expectedExtraOrders ?? 4;
  const remainingWhSlots = Math.max(
    0,
    whMetrics.maxCapacity - whMetrics.insideShipmentsCount
  );
  const overCapacity =
    expectedNewOrders > remainingWhSlots || allActiveCouriers.length < 2;

  return {
    decisionType: input.decisionType,
    canExecuteTechnically: state.company.cashPiastres >= mktCost,
    technicalBlockReasonAr:
      state.company.cashPiastres < mktCost
        ? 'السيولة النقدية لا تكفي لتغطية تكلفة هذا القرار.'
        : undefined,
    riskLevel: overCapacity ? 'MODERATE_RISK' : 'SAFE',
    headlineAr: overCapacity
      ? `تنبيه السكرتير: الحملة ستجلب ~${expectedNewOrders} طلبات بينما المتبقي بالمستودع ${remainingWhSlots} خانات فقط!`
      : 'فحص السكرتير: الميزانية والطاقة التشغيلية متوازنة لتنفيذ القرار',
    factsAr: [
      `السيولة المتاحة: ${formatEGP(state.company.cashPiastres)} • التكلفة المطلوبة: ${formatEGP(mktCost)}.`,
      `السعة المتبقية بالمستودع: ${remainingWhSlots} طرود • المناديب الفعالون: ${allActiveCouriers.length}.`,
    ],
    projectionsAr: [
      overCapacity
        ? 'جذب طلبات تفوق سعة المستودع والمناديب قد يؤدي لانتهاء مهلة قبول الطلبات وسحبها للمنافسين.'
        : 'القدرة التشغيلية الحالية تسمح باستيعاب الطلبات الجديدة وتحويلها إلى أرباح صافية.',
    ],
    alternativesAr: [
      overCapacity
        ? 'وسّع سعة المستودع أو وظف مندوباً إضافياً أولاً، أو اختر شريحة تسويقية أصغر.'
        : 'يمكنك المضي قدماً في تنفيذ القرار.',
    ],
    inspectedAtTotalMinutes: nowMinutes,
    signatureKey,
  };
}

/**
 * Inspects a decision and immediately pushes an inline Secretary bubble notification
 * so the player sees the advice in-place on the screen (with ✓ to dismiss).
 */
export function inspectAndNotifySecretary(
  state: GameState,
  input: SecretaryDecisionInspectionInput,
  customDedupeSuffix?: string
): {
  nextState: GameState;
  report: SecretaryInspectionReport;
} {
  const report = inspectDecisionWithDynamicSecretary(state, input);
  const severity: InlineBubbleNotification['severity'] =
    report.riskLevel === 'HIGH_RISK'
      ? 'CRITICAL'
      : report.riskLevel === 'MODERATE_RISK' ||
          report.riskLevel === 'NEEDS_MORE_INFO'
        ? 'WARNING'
        : 'INFO';

  const nextState = pushInlineBubbleNotification(state, {
    dedupeKey: `SEC-INSP-${report.signatureKey}-${customDedupeSuffix || ''}`,
    sender: 'SECRETARY',
    category:
      report.riskLevel === 'HIGH_RISK' || report.riskLevel === 'MODERATE_RISK'
        ? 'RISK_WARNING'
        : 'DECISION_INSPECTION',
    titleAr: report.headlineAr,
    shortPreviewAr:
      report.requiresMoreInfoPromptAr ||
      report.projectionsAr[0] ||
      report.factsAr[0] ||
      report.headlineAr,
    factsAr: report.factsAr,
    projectionsAr: report.projectionsAr,
    alternativesAr: report.alternativesAr,
    requiresMoreInfoPromptAr: report.requiresMoreInfoPromptAr,
    severity,
  });

  return {
    nextState: {
      ...nextState,
      guideAndSecretary: {
        ...nextState.guideAndSecretary!,
        lastInspectedDecisionKey: report.signatureKey,
      },
    },
    report,
  };
}

export interface OrderPreDecisionVerdict {
  verdictBadgeAr:
    | 'العرض مربح'
    | 'الهامش ضعيف'
    | 'التكلفة المتوقعة أعلى من الإيراد'
    | 'الطلب يحتاج مندوبًا غير متاح حاليًا';
  verdictTone: 'EMERALD' | 'AMBER' | 'ROSE' | 'INDIGO';
  secretaryAdviceAr: string;
  expectedNetProfitPiastres: number;
  finalProfitAfterCompletionPiastres: number;
  estimatedFuelPiastres: number;
  estimatedCourierPiastres: number;
  estimatedWarehouseAndPackagingPiastres: number;
  estimatedOverheadPiastres: number;
  totalEstimatedCostPiastres: number;
  clientSeriousnessScore: number; // 0 to 100
  clientSeriousnessLabelAr: string;
  availableCouriersCount: number;
  freeWarehouseSlots: number;
  routeDistanceKm: number;
}

/**
 * Evaluates a shipment card before acceptance/rejection/negotiation so the player
 * sees a complete financial & operational breakdown and a clear Smart Secretary verdict.
 */
export function evaluateOrderPreDecisionVerdict(
  state: GameState,
  shipment: GameState['shipments'][number]
): OrderPreDecisionVerdict {
  const est = shipment.accountantEstimate;
  const routeInfo = calculateEgyptRouteDistance(
    shipment.pickupZone,
    shipment.deliveryZone
  );
  const routeDistanceKm = shipment.distanceKm ?? routeInfo.distanceKm;

  const estimatedFuelPiastres =
    est?.estimatedFuelCostPiastres ??
    Math.round(shipment.estimatedOperatingCostPiastres * 0.35);
  const estimatedCourierPiastres =
    est?.estimatedCourierCostPiastres ??
    Math.round(shipment.estimatedOperatingCostPiastres * 0.35);
  const estimatedWarehouseAndPackagingPiastres =
    est?.packagingAndWarehouseCostPiastres ??
    est?.estimatedPackagingCostPiastres ??
    Math.round(shipment.estimatedOperatingCostPiastres * 0.18);
  const estimatedOverheadPiastres =
    est?.allocatedOverheadPiastres ??
    Math.round(shipment.estimatedOperatingCostPiastres * 0.12);

  const totalEstimatedCostPiastres =
    est?.totalEstimatedCostPiastres ??
    shipment.estimatedOperatingCostPiastres;

  const expectedNetProfitPiastres =
    est?.expectedNetProfitPiastres ??
    shipment.serviceFeePiastres - totalEstimatedCostPiastres;

  const finalProfitAfterCompletionPiastres =
    shipment.status === 'DELIVERED'
      ? shipment.revenueEarnedPiastres -
        (shipment.actualOperatingCostPiastres || totalEstimatedCostPiastres)
      : expectedNetProfitPiastres;

  const clientObj = state.clients.find((c) => c.id === shipment.clientId);
  const clientTrust = clientObj?.trustLevel ?? 70;
  const delayPenaltyRate = Math.min(
    35,
    (clientObj?.contractProfile?.returnConfirmationDelayCount ?? 1) * 10
  );
  const clientSeriousnessScore = Math.max(
    30,
    Math.min(99, Math.round(clientTrust * 0.85 + (100 - delayPenaltyRate) * 0.15))
  );
  const clientSeriousnessLabelAr =
    clientSeriousnessScore >= 78
      ? 'عميل جاد وموثوق جداً'
      : clientSeriousnessScore >= 60
        ? 'عميل موثوق نسبياً'
        : 'عميل متقلب (حذر في التفاوض والمرتجعات)';

  const availableCouriersCount = state.couriers.filter(
    (c) =>
      c.status !== 'UNAVAILABLE' &&
      c.currentLoad < c.maxLoad &&
      (c.ownsPersonalMotorcycle || Boolean(c.vehicleId))
  ).length;

  const whMetrics = getWarehouseUtilizationMetrics(state);
  const freeWarehouseSlots = Math.max(
    0,
    whMetrics.maxCapacity - whMetrics.insideShipmentsCount
  );

  const requestedSla = shipment.clientRequestedSlaHours ?? shipment.quotedClientSlaHours ?? 15;
  const minSla = shipment.minOperationalHours ?? MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS;

  let verdictBadgeAr: OrderPreDecisionVerdict['verdictBadgeAr'] = 'العرض مربح';
  let verdictTone: OrderPreDecisionVerdict['verdictTone'] = 'EMERALD';
  let secretaryAdviceAr =
    'العرض مربح ومتوازن مع سعة المستودع والمناديب المتاحين حالياً.';

  if (expectedNetProfitPiastres < 0) {
    verdictBadgeAr = 'التكلفة المتوقعة أعلى من الإيراد';
    verdictTone = 'ROSE';
    secretaryAdviceAr =
      'تحذير السكرتير: التكلفة المتوقعة أعلى من الإيراد بعد حساب الوقود والمندوب والمستودع؛ تفاوض لرفع السعر أو ارفض الطلب لحماية الخزينة.';
  } else if (availableCouriersCount === 0) {
    verdictBadgeAr = 'الطلب يحتاج مندوبًا غير متاح حاليًا';
    verdictTone = 'INDIGO';
    secretaryAdviceAr =
      'لا يوجد عدد كافٍ من المندوبين الجاهزين بمركبة حالياً لتغطية منطقة الطلب؛ خصص مركبة لمندوب أو وظف مندوباً قبل التوسع.';
  } else if (expectedNetProfitPiastres < 3500) {
    verdictBadgeAr = 'الهامش ضعيف';
    verdictTone = 'AMBER';
    secretaryAdviceAr =
      'العرض مغرٍ ظاهرياً، لكن صافي الربح منخفض بعد الوقود والأجور؛ يُفضل التفاوض لرفع السعر قليلاً.';
  } else if (requestedSla < minSla) {
    verdictBadgeAr = 'الهامش ضعيف';
    verdictTone = 'AMBER';
    secretaryAdviceAr =
      'العميل موثوق نسبياً، لكن الموعد المطلوب غير مناسب لقدرتك الحالية؛ تفاوض لتثبيت مهلة لا تقل عن 12 إلى 15 ساعة.';
  }

  return {
    verdictBadgeAr,
    verdictTone,
    secretaryAdviceAr,
    expectedNetProfitPiastres,
    finalProfitAfterCompletionPiastres,
    estimatedFuelPiastres,
    estimatedCourierPiastres,
    estimatedWarehouseAndPackagingPiastres,
    estimatedOverheadPiastres,
    totalEstimatedCostPiastres,
    clientSeriousnessScore,
    clientSeriousnessLabelAr,
    availableCouriersCount,
    freeWarehouseSlots,
    routeDistanceKm,
  };
}

export const PAGE_SECRETARY_EXPLANATIONS: Record<
  string,
  { titleAr: string; bodyAr: string; actionHintAr: string }
> = {
  DASHBOARD: {
    titleAr: 'شرح السكرتير: غرفة العمليات ولوحة القيادة',
    bodyAr:
      'هنا تراقب نبض الشركة: السيولة النقدية (13,000 ج.م في البداية)، المواقف الإدارية العاجلة، وحالة الأسطول والماكينات. راجع المواقف وتأكد دائماً من توازن النقدية قبل اتخاذ القرارات.',
    actionHintAr: 'افحص المواقف الإدارية أو انتقل إلى صفحة الديون لسداد أهم 3 التزامات.',
  },
  DEBTS: {
    titleAr: 'شرح السكرتير: إدارة الديون والالتزامات المستحقة (5,000 ج.م)',
    bodyAr:
      'تبدأ الشركة وعليها 4 التزامات بإجمالي 5,000 جنيه (كهرباء 1,500، ضرائب 1,400، إيجار 1,300، رواتب مستحقة 800 ج.م). في المرحلة التعليمية، قم بسداد أهم 3 التزامات أولاً لحماية الشركة من غرامات التأخير وانقطاع الخدمات.',
    actionHintAr: 'اضغط «سداد الالتزام» أمام أول 3 ديون (الكهرباء، الضرائب، الإيجار).',
  },
  MAINTENANCE: {
    titleAr: 'شرح السكرتير: الصيانة الشاملة للأصول والأسطول والمستودع',
    bodyAr:
      'تجمع هذه الصفحة كل أصول الشركة القابلة للصيانة: المركبات، المستودعات، ماكينات الفرز والتغليف، والأنظمة الإدارية. إهمال الصيانة يرفع استهلاك الوقود ويسبب أعطالاً مفاجئة تؤخر الشحنات وتخفض السمعة.',
    actionHintAr: 'افحص حالة الموتوسيكلات وماكينة الفرز ونفذ صيانة وقائية أو تزود بالوقود.',
  },
  COMPANY_PROFILE: {
    titleAr: 'شرح السكرتير: الملف الشخصي للشركة والثقة التجارية',
    bodyAr:
      'ملف شركتك هو واجهتك أمام التجار وأصحاب العقود! اختر شعار الشركة، واكتب وصفاً احترافياً لخدماتك ومناطق تغطيتك لكسب نقاط ثقة إضافية ترفع فرصك في العقود والمزادات.',
    actionHintAr: 'حدّث الوصف التجاري والتخصصات واحفظ ملف الشركة.',
  },
  SHIPMENTS: {
    titleAr: 'شرح السكرتير: دورة الطلبات وتحليل الربحية قبل القرار',
    bodyAr:
      'كل بطاقة طلب جديد تعرض لك صافي الربح المتوقع، تفصيل التكاليف (وقود، مندوب، مستودع)، درجة جدية العميل، وحكم السكرتير الذكي. اقبل الطلب المربح، أو تفاوض على السعر والمهلة (الحد الأدنى للمستودع 10 ساعات و15 ساعة للعميل)، ثم انقله للمستودع فالمندوب حتى التسليم.',
    actionHintAr: 'اقبل طلباً مربحاً (مثل TRK-1002 أو TRK-1003) وتابع نقله للمستودع ثم للمندوب.',
  },
  WAREHOUSE: {
    titleAr: 'شرح السكرتير: المستودع والفرز والتغليف والأسطول',
    bodyAr:
      'هنا تمر الشحنات بمراحل الفرز والتغليف قبل إسنادها للمندوبين. راقب السعة الاستيعابية للمستودع وتأكد أن كل مندوب لديه مركبة صالحة للعمل قبل إرسال الطرود.',
    actionHintAr: 'انقل الشحنات الجاهزة بالمستودع إلى المندوب المتاح لبدء التوصيل.',
  },
  HR: {
    titleAr: 'شرح السكرتير: الموارد البشرية (HR) وتوظيف الفريق المناسب',
    bodyAr:
      'عند نشر إعلان توظيف، تختلف المواصفات حسب الوظيفة: موظف المستودع يُقيّم بمهارات الفرز والتغليف، بينما المندوب يُوضح ما إذا كان يمتلك مركبة شخصية أم يحتاج مركبة من أسطول الشركة. الرواتب تُسدد كل 8 أيام عمل.',
    actionHintAr: 'انشر إعلان توظيف أو راجع كفاءة الموظفين وتوزيع المهام.',
  },
  MARKETING: {
    titleAr: 'شرح السكرتير: التسويق الذكي والحملة التدريبية (6,000 ج.م)',
    bodyAr:
      'نتائج الحملات تتناسب واقعياً مع الميزانية والمنافسة وحجم الطلب. في المرحلة التعليمية، أطلق «حملة الانطلاق والتوسع الإقليمي» بقيمة 6,000 جنيه لجذب عملاء جادين وطلبات مربحة، ويمكنك تفعيل أو إيقاف «التكرار اليومي التلقائي» في أي وقت.',
    actionHintAr: 'أطلق حملة الـ 6,000 جنيه التدريبية وتابع وصول الطلبات الجديدة.',
  },
  BUSINESS_DEVELOPER: {
    titleAr: 'شرح السكرتير: إدارة تطوير الأعمال والعقود (Business Developer)',
    bodyAr:
      'هذا القسم مسؤول عن جميع عقود الشراكات وتطوير الأعمال (مثل عقد «وكلني» لتوصيل الطلبات الفورية من المطاعم، وعقد «زورو» للتجارة الإلكترونية، وعقود التجار). انتبه: تكرار الشكاوى أو كسر المهلة يسبب إنذاراً ثم إلغاء العقد مع عدم استرداد رسوم جدية التعاقد!',
    actionHintAr: 'راجع شروط العقود ومناطق تغطية «وكلني» وتوزيع المندوبين.',
  },
  PRICING_MARKET: {
    titleAr: 'شرح السكرتير: التسعير والمزادات التنافسية والفروع',
    bodyAr:
      'الفوز بالمزادات لا يعتمد على حرق السعر فقط! التقييم يشمل السعر، القدرة التشغيلية، السمعة، تغطية المنطقة، والالتزام بالمهلة. اضبط تسعير الكيلومتر وقدم عروضاً واقعية تحميك من الخسارة.',
    actionHintAr: 'جرّب تقديم عرض متوازن في المزاد أو ضبط معادلة التسعير.',
  },
  PHONE: {
    titleAr: 'شرح السكرتير: الهاتف الذكي المبسط ومنصات السوق',
    bodyAr:
      'يجمع الهاتف الذكي تطبيقات واضحة ومبسطة: «موظفيني» (لمتابعة شكاوى وأدلة الموظفين)، «هيرفوك» (نبض الشارع التجاري الساخر كل 5 ساعات)، «تقييم إنجوبيا» (التقييم الرسمي كل 24 ساعة)، وإدارة التسعير والفروع.',
    actionHintAr: 'تصفح تطبيقات الهاتف وتعرف على وظيفة كل منصة.',
  },
};

/**
 * Records a page visit and returns a Secretary explanation bubble on the 1st visit,
 * repeats once on the 2nd visit if needed, and always triggers when `forceRecall === true`.
 */
export function recordPageVisitAndGetSecretaryExplanation(
  state: GameState,
  sectionId: string,
  forceRecall: boolean = false
): GameState {
  const info = PAGE_SECRETARY_EXPLANATIONS[sectionId];
  if (!info) return state;

  const currentMastery = state.onboardingMastery || {
    pageVisits: {},
    appliedSystems: {
      inspectedDashboardAndFinances: true,
      paidTopThreeDebts: false,
      performedMaintenanceAction: false,
      postedOrHiredHR: false,
      launchedTrainingCampaign6000: false,
      reviewedAndDecidedOrder: false,
      movedAndDeliveredOrder: false,
      inspectedContractsOrZones: false,
      testedAuctionOrPricing: false,
      updatedCompanyProfile: false,
    },
    masteryPercentage: 10,
    mandatoryPhaseCompleted: false,
  };

  const prevRecord = currentMastery.pageVisits[sectionId];
  const nextVisitCount = (prevRecord?.visitCount ?? 0) + (forceRecall ? 0 : 1);

  const updatedPageVisits = {
    ...currentMastery.pageVisits,
    [sectionId]: {
      sectionId,
      visitCount: Math.max(1, nextVisitCount),
      lastVisitedTotalMinutes: state.clock.totalElapsedMinutes,
      explanationTitleAr: info.titleAr,
      explanationBodyAr: info.bodyAr,
    },
  };

  const updatedApplied = {
    ...currentMastery.appliedSystems,
    inspectedDashboardAndFinances:
      currentMastery.appliedSystems.inspectedDashboardAndFinances ||
      sectionId === 'DASHBOARD' ||
      sectionId === 'DEBTS',
    inspectedContractsOrZones:
      currentMastery.appliedSystems.inspectedContractsOrZones ||
      sectionId === 'BUSINESS_DEVELOPER',
  };

  let nextState: GameState = {
    ...state,
    onboardingMastery: {
      ...currentMastery,
      pageVisits: updatedPageVisits,
      appliedSystems: updatedApplied,
    },
  };

  nextState = evaluateOnboardingMasteryProgress(nextState);

  // Trigger Secretary explanation on 1st visit, 2nd visit (if not yet graduated), or on-demand recall
  const shouldShowExplanation =
    forceRecall ||
    nextVisitCount === 1 ||
    (nextVisitCount === 2 && !nextState.onboardingMastery?.mandatoryPhaseCompleted);

  if (shouldShowExplanation) {
    const visitBadge = forceRecall
      ? 'استدعاء الشرح بطلب المدير'
      : nextVisitCount === 1
        ? 'الشرح التأسيسي — الزيارة الأولى'
        : 'تذكير تأكيدي — الزيارة الثانية';

    nextState = pushInlineBubbleNotification(nextState, {
      dedupeKey: forceRecall
        ? `SEC-PAGE-RECALL-${sectionId}-${Date.now()}`
        : `SEC-PAGE-VISIT-${sectionId}-V${nextVisitCount}`,
      sender: 'SECRETARY',
      category: 'GUIDE_HINT',
      titleAr: `${info.titleAr} (${visitBadge})`,
      shortPreviewAr: info.bodyAr,
      factsAr: [info.bodyAr],
      projectionsAr: [`الخطوة العملية المقترحة: ${info.actionHintAr}`],
      alternativesAr: [
        'يمكنك استدعاء هذا الشرح في أي وقت لاحقاً بالضغط على زر «شرح الصفحة (السكرتير)» أعلى الشاشة.',
      ],
      severity: 'INFO',
      relatedTargetSection: sectionId,
    });
  }

  return nextState;
}

/**
 * Computes real applied mastery across the 10 core operational systems.
 * Once >= 70% (7 of 10 systems) are practically learned & applied, graduates the player
 * from the mandatory onboarding phase into full free management.
 */
export function evaluateOnboardingMasteryProgress(state: GameState): GameState {
  const currentMastery = state.onboardingMastery;
  if (!currentMastery) return state;

  const paidDebtsCount = (state.debts || []).filter(
    (d) => d.status === 'PAID'
  ).length;
  const hasLaunched6000 = (state.marketing?.campaigns || []).some(
    (c) => c.costPiastres >= 600000
  );
  const hasDecidedOrder = state.shipments.some(
    (s) => s.status !== 'NEW_REQUEST' || Boolean(s.Negotiated)
  );
  const hasDeliveredOrDispatched = state.shipments.some(
    (s) => s.status === 'OUT_FOR_DELIVERY' || s.status === 'DELIVERED'
  );
  const hasPostedOrHiredHR =
    (state.hrJobAds || []).length > 0 || state.employees.length > 4;

  const applied = {
    inspectedDashboardAndFinances:
      currentMastery.appliedSystems.inspectedDashboardAndFinances,
    paidTopThreeDebts:
      currentMastery.appliedSystems.paidTopThreeDebts || paidDebtsCount >= 3,
    performedMaintenanceAction:
      currentMastery.appliedSystems.performedMaintenanceAction,
    postedOrHiredHR:
      currentMastery.appliedSystems.postedOrHiredHR || hasPostedOrHiredHR,
    launchedTrainingCampaign6000:
      currentMastery.appliedSystems.launchedTrainingCampaign6000 ||
      hasLaunched6000,
    reviewedAndDecidedOrder:
      currentMastery.appliedSystems.reviewedAndDecidedOrder || hasDecidedOrder,
    movedAndDeliveredOrder:
      currentMastery.appliedSystems.movedAndDeliveredOrder ||
      hasDeliveredOrDispatched,
    inspectedContractsOrZones:
      currentMastery.appliedSystems.inspectedContractsOrZones ||
      Boolean(state.businessDeveloper?.wakkelnyLaunchHubAr),
    testedAuctionOrPricing:
      currentMastery.appliedSystems.testedAuctionOrPricing ||
      (state.marketAuctions || []).some((a) => a.status !== 'OPEN'),
    updatedCompanyProfile:
      currentMastery.appliedSystems.updatedCompanyProfile ||
      (state.companyProfile?.trustBonusEarned ?? 0) > 0,
  };

  const values = Object.values(applied);
  const completedCount = values.filter(Boolean).length;
  const masteryPercentage = Math.round((completedCount / values.length) * 100);
  const nowGraduated =
    currentMastery.mandatoryPhaseCompleted || masteryPercentage >= 70;

  if (
    masteryPercentage === currentMastery.masteryPercentage &&
    nowGraduated === currentMastery.mandatoryPhaseCompleted
  ) {
    return state;
  }

  let nextState: GameState = {
    ...state,
    onboardingMastery: {
      ...currentMastery,
      appliedSystems: applied,
      masteryPercentage,
      mandatoryPhaseCompleted: nowGraduated,
      graduatedAtDay:
        nowGraduated && !currentMastery.mandatoryPhaseCompleted
          ? state.company.currentDay
          : currentMastery.graduatedAtDay,
    },
  };

  if (nowGraduated && !currentMastery.mandatoryPhaseCompleted) {
    nextState = pushInlineBubbleNotification(nextState, {
      dedupeKey: `ONBOARDING-GRADUATED-D${state.company.currentDay}`,
      sender: 'MANAGER_GUIDE',
      category: 'TASK_COMPLETED',
      titleAr: `اجتزت المرحلة التعليمية الإجبارية بنجاح (${masteryPercentage}%)!`,
      shortPreviewAr:
        'أحسنت يا سيادة المدير! أتقنت أكثر من 70% من الأنظمة الأساسية عملياً. انتقلت الآن إلى الإدارة الحرة الكاملة ومهام ترقية المستويات.',
      factsAr: [
        `نسبة الإتقان التطبيقي للأنظمة الأساسية: ${masteryPercentage}% (${completedCount} من ${values.length} أنظمة).`,
        'تم تفعيل الحرية الكاملة لإدارة العقود والمزادات والفروع وترقية المستويات.',
      ],
      projectionsAr: [
        'سيستمر السكرتير الذكي في تنبيهك كل 8 ساعات بالالتزامات والمواعيد الحرجة وعند استدعائه.',
      ],
      alternativesAr: [
        'تابع مهام «دليل المدير» لترقية الشركة للمستويات الأعلى.',
      ],
      severity: 'SUCCESS',
    });
  }

  return nextState;
}

/**
 * Central 8-Hour Obligation Reminder (runs every 480 game minutes).
 * Alerts the player via the Smart Secretary about unpaid debts, approaching order deadlines,
 * or urgent maintenance without duplicate spam.
 */
export function runEightHourObligationReminderIfDue(
  state: GameState
): GameState {
  const nowTotal = state.clock.totalElapsedMinutes;
  const bucket8h = Math.floor(nowTotal / 480); // Every 8 game hours (480 minutes)
  if (bucket8h <= 1 || (state.lastObligationReminderBucket ?? 0) >= bucket8h) {
    return state;
  }

  const unpaidDebts = (state.debts || []).filter((d) => d.status !== 'PAID');
  const totalUnpaidPiastres = unpaidDebts.reduce(
    (s, d) => s + d.remainingAmountPiastres,
    0
  );
  const pendingOrders = state.shipments.filter(
    (s) => s.status === 'NEW_REQUEST'
  );
  const lowHealthVehicles = state.vehicles.filter((v) => v.maintenanceHealth < 65);
  const sortingHealth = state.fleetAndEquipment?.sortingMachineHealth ?? 100;

  let nextState: GameState = {
    ...state,
    lastObligationReminderBucket: bucket8h,
  };

  if (
    unpaidDebts.length === 0 &&
    pendingOrders.length === 0 &&
    lowHealthVehicles.length === 0 &&
    sortingHealth >= 70
  ) {
    return nextState;
  }

  const facts: string[] = [];
  if (unpaidDebts.length > 0) {
    facts.push(
      `الالتزامات والديون المتبقية: ${unpaidDebts.length} بنود بإجمالي ${formatEGP(totalUnpaidPiastres)} (أقربها: ${unpaidDebts[0].titleAr}).`
    );
  }
  if (pendingOrders.length > 0) {
    facts.push(
      `طلبات شحن بانتظار قرارك قبل انتهاء المهلة: ${pendingOrders.length} طلبات (${pendingOrders.map((o) => o.trackingNumber).join('، ')}).`
    );
  }
  if (lowHealthVehicles.length > 0 || sortingHealth < 70) {
    facts.push(
      `تنبيه صيانة: ${lowHealthVehicles.length} مركبات تحتاج فحصاً، وكفاءة ماكينة الفرز ${sortingHealth}%.`
    );
  }

  nextState = pushInlineBubbleNotification(nextState, {
    dedupeKey: `SEC-8H-REMINDER-B${bucket8h}`,
    sender: 'SECRETARY',
    category: 'RISK_WARNING',
    titleAr: `تذكير السكرتير الدوري (كل 8 ساعات): متابعة الالتزامات والمواعيد`,
    shortPreviewAr:
      facts[0] ||
      'لديك التزامات ومواعيد تشغيلية تقترب من وقت الاستحقاق؛ راجعها الآن لتجنب الغرامات.',
    factsAr: facts,
    projectionsAr: [
      'سداد الالتزامات في موعدها وحسم الطلبات المعلقة يحمي سمعة الشركة ويمنع غرامات التأخير.',
    ],
    alternativesAr: [
      unpaidDebts.length > 0
        ? 'افتح صفحة «الديون» لسداد البنود المستحقة.'
        : 'افتح صفحة «الشحنات» أو «الصيانة» لمعالجة البنود المعلقة.',
    ],
    severity: unpaidDebts.length >= 2 ? 'WARNING' : 'INFO',
    relatedTargetSection: unpaidDebts.length > 0 ? 'DEBTS' : 'SHIPMENTS',
  });

  return nextState;
}

