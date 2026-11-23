import {
  CompanyBranch,
  GameState,
  OfflineSyncQueueState,
  PendingSyncMilestone,
  RealTimeClockBridgeState,
} from '../types/game';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushNotification } from './notificationEngine';

export interface CompanyLevelRequirementStatus {
  id: string;
  labelAr: string;
  currentValueLabel: string;
  targetValueLabel: string;
  met: boolean;
}

export interface CompanyLevelDefinition {
  level: 1 | 2 | 3 | 4 | 5;
  titleAr: string;
  subtitleAr: string;
  unlockedFeaturesAr: string[];
  minDeliveredOrders: number;
  minCashPiastres: number;
  minReputation: number;
  minActiveEmployees: number;
  requiresSignedContract: boolean;
}

export const COMPANY_LEVEL_DEFINITIONS: CompanyLevelDefinition[] = [
  {
    level: 1,
    titleAr: 'المستوى 1 — التأسيس المحلي',
    subtitleAr: 'إدارة الطلبات الأساسية، المستودع المركزي، تسعير الشحن، وهيرفوك وتقييم إنجوبيا',
    unlockedFeaturesAr: [
      'إدارة الطلبات الأساسية والتفاوض مع العملاء',
      'المستودع المركزي والفرز والتغليف',
      'نظام التسعير الجغرافي (تلقائي / يدوي / شرائح / مناطق)',
      'منصة هيرفوك وتقييم إنجوبيا الدوري',
    ],
    minDeliveredOrders: 0,
    minCashPiastres: 0,
    minReputation: 0,
    minActiveEmployees: 1,
    requiresSignedContract: false,
  },
  {
    level: 2,
    titleAr: 'المستوى 2 — التوسع التشغيلي الأول',
    subtitleAr: 'فتح التوظيف المتقدم، الحملات التسويقية الأساسية، والمزادات التنافسية',
    unlockedFeaturesAr: [
      'إعلانات التوظيف المتقدمة واستقطاب المناديب والمحاسبين',
      'إطلاق الحملات التسويقية لاكتساب تجار جدد',
      'دخول مزادات التسعير التنافسية ضد شركات الشحن المنافسة',
      'توسيع سعة المستودع والأسطول',
    ],
    minDeliveredOrders: 2,
    minCashPiastres: egpToPiastres(2200),
    minReputation: 55,
    minActiveEmployees: 3,
    requiresSignedContract: false,
  },
  {
    level: 3,
    titleAr: 'المستوى 3 — العقود والشراكات التجارية',
    subtitleAr: 'فتح عقود «وّكلني» و«زورو» للتوصيل الفوري وتطوير الأسطول الثقيل',
    unlockedFeaturesAr: [
      'توقيع عقود منصات «وّكلني» للمطاعم و«زورو» للتجارة الإلكترونية',
      'التوجيه الذكي والتجميع الاتجاهي للطلبات المباشرة',
      'شراء واستئجار السيارات الفان والشاحنات المتوسطة',
    ],
    minDeliveredOrders: 5,
    minCashPiastres: egpToPiastres(3000),
    minReputation: 60,
    minActiveEmployees: 4,
    requiresSignedContract: false,
  },
  {
    level: 4,
    titleAr: 'المستوى 4 — الإدارة المتقدمة والتوسع السوقي',
    subtitleAr: 'فتح الحملات التسويقية الكبرى والعروض الجغرافية الإقليمية',
    unlockedFeaturesAr: [
      'حملات الاستحواذ الإقليمية الكبرى ورفع القوة التسويقية',
      'العروض الجغرافية المؤقتة لجذب شحنات المحافظات',
      'ترقيات التشغيل الذكي وتقليل زمن المناولة بالمستودع',
    ],
    minDeliveredOrders: 10,
    minCashPiastres: egpToPiastres(4800),
    minReputation: 68,
    minActiveEmployees: 5,
    requiresSignedContract: true,
  },
  {
    level: 5,
    titleAr: 'المستوى 5 — الفروع والتوسع الجغرافي بالمحافظات',
    subtitleAr: 'افتتاح فروع ومستودعات إقليمية في المحافظات المصرية وتوزيع الأسطول',
    unlockedFeaturesAr: [
      'افتتاح فروع تشغيلية جديدة في المحافظات (الإسكندرية، الغربية، الدقهلية، الجيزة، الصعيد)',
      'توزيع الموظفين والمركبات بين المقر الرئيسي والفروع الإقليمية',
      'عقود التوريد اللوجستي الشامل بين المحافظات',
    ],
    minDeliveredOrders: 16,
    minCashPiastres: egpToPiastres(7500),
    minReputation: 75,
    minActiveEmployees: 6,
    requiresSignedContract: true,
  },
];

export function generateUniqueCompanyCode(seedStr = 'INGOBIA'): string {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) % 9000;
  }
  const num = 1000 + Math.abs(hash % 8999);
  return `ING-${num}`;
}

export function createInitialRealTimeBridge(): RealTimeClockBridgeState {
  return {
    mode: 'REALISTIC_1H_TO_4H',
    lastRealTimestampMs: Date.now(),
    totalOfflineGameMinutesApplied: 0,
  };
}

export function createInitialOfflineSyncState(): OfflineSyncQueueState {
  const isOnline =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  return {
    isOnline,
    requiresOnlineSyncPrompt: false,
    lastLocalSaveIso: new Date().toISOString(),
    lastCloudSyncIso: isOnline ? new Date().toISOString() : undefined,
    pendingMilestones: [],
  };
}

/**
 * Evaluates current progress toward the next Company Level (1..5).
 */
export function evaluateCompanyLevelProgress(state: GameState): {
  currentLevel: number;
  adminLevel: number;
  currentDefinition: CompanyLevelDefinition;
  nextDefinition?: CompanyLevelDefinition;
  requirements: CompanyLevelRequirementStatus[];
  canUpgradeNow: boolean;
  progressPercent: number;
} {
  const currentLevel = Math.max(1, Math.min(5, state.company.level || 1)) as
    | 1
    | 2
    | 3
    | 4
    | 5;
  const adminLevel = state.company.adminLevel ?? 3;
  const currentDefinition =
    COMPANY_LEVEL_DEFINITIONS.find((d) => d.level === currentLevel) ||
    COMPANY_LEVEL_DEFINITIONS[0];
  const nextDefinition = COMPANY_LEVEL_DEFINITIONS.find(
    (d) => d.level === currentLevel + 1
  );

  if (!nextDefinition) {
    return {
      currentLevel,
      adminLevel,
      currentDefinition,
      nextDefinition: undefined,
      requirements: [],
      canUpgradeNow: false,
      progressPercent: 100,
    };
  }

  const deliveredWarehouseOrders = state.shipments.filter(
    (s) => s.status === 'DELIVERED'
  ).length;
  const deliveredPlatformOrders =
    state.businessDeveloper?.platformOrders.filter(
      (o) => o.status === 'DELIVERED' || o.status === 'DELAYED_DELIVERED'
    ).length ?? 0;
  const totalDelivered = deliveredWarehouseOrders + deliveredPlatformOrders;

  const activeEmployeesCount = state.employees.filter(
    (e) => e.status !== 'TERMINATED' && !e.terminated
  ).length;

  const hasSignedContract = Boolean(
    state.businessDeveloper?.contracts.WAKKELNY.signed ||
      state.businessDeveloper?.contracts.ZORO.signed
  );

  const requirements: CompanyLevelRequirementStatus[] = [
    {
      id: 'REQ-DELIVERED',
      labelAr: 'إجمالي الطلبات المسلمة بنجاح',
      currentValueLabel: `${totalDelivered} طلب`,
      targetValueLabel: `${nextDefinition.minDeliveredOrders} طلبات`,
      met: totalDelivered >= nextDefinition.minDeliveredOrders,
    },
    {
      id: 'REQ-CASH',
      labelAr: 'السيولة النقدية المتاحة بالخزينة',
      currentValueLabel: formatEGP(state.company.cashPiastres),
      targetValueLabel: formatEGP(nextDefinition.minCashPiastres),
      met: state.company.cashPiastres >= nextDefinition.minCashPiastres,
    },
    {
      id: 'REQ-REP',
      labelAr: 'سمعة الشركة الفعلية بالسوق',
      currentValueLabel: `${state.company.reputation} / 100`,
      targetValueLabel: `${nextDefinition.minReputation} / 100`,
      met: state.company.reputation >= nextDefinition.minReputation,
    },
    {
      id: 'REQ-STAFF',
      labelAr: 'الفريق التشغيلي النشط',
      currentValueLabel: `${activeEmployeesCount} موظفين`,
      targetValueLabel: `${nextDefinition.minActiveEmployees} موظفين`,
      met: activeEmployeesCount >= nextDefinition.minActiveEmployees,
    },
  ];

  if (nextDefinition.requiresSignedContract) {
    requirements.push({
      id: 'REQ-CONTRACT',
      labelAr: 'عقد شراكة نشط (وّكلني أو زورو)',
      currentValueLabel: hasSignedContract ? 'موقّع ونشط' : 'غير موقّع بعد',
      targetValueLabel: 'توقيع عقد واحد على الأقل',
      met: hasSignedContract,
    });
  }

  const metCount = requirements.filter((r) => r.met).length;
  const progressPercent = Math.round((metCount / requirements.length) * 100);
  const canUpgradeNow = metCount === requirements.length;

  return {
    currentLevel,
    adminLevel,
    currentDefinition,
    nextDefinition,
    requirements,
    canUpgradeNow,
    progressPercent,
  };
}

/**
 * Queues a milestone in `offlineSync` whenever the player achieves a new level,
 * enters a new day, or saves before exit.
 */
export function recordSyncMilestone(
  state: GameState,
  type: PendingSyncMilestone['type'],
  reasonAr: string
): GameState {
  const syncState = state.offlineSync || createInitialOfflineSyncState();
  const isOnline =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : syncState.isOnline;

  const nowIso = new Date().toISOString();
  const milestone: PendingSyncMilestone = {
    id: `SYNC-${type}-D${state.company.currentDay}-L${state.company.level}-${Date.now()}`,
    type,
    day: state.company.currentDay,
    companyLevel: state.company.level,
    cashPiastres: state.company.cashPiastres,
    reputation: state.company.reputation,
    timestampIso: nowIso,
    syncedToCloud: isOnline,
  };

  return {
    ...state,
    offlineSync: {
      ...syncState,
      isOnline,
      requiresOnlineSyncPrompt: !isOnline,
      promptReasonAr: !isOnline
        ? `${reasonAr} — تم حفظ التقدم محلياً بالكامل وسيتم استكمال المزامنة السحابية فور عودة الاتصال بالإنترنت.`
        : undefined,
      lastLocalSaveIso: nowIso,
      lastCloudSyncIso: isOnline ? nowIso : syncState.lastCloudSyncIso,
      pendingMilestones: [milestone, ...syncState.pendingMilestones].slice(0, 25),
    },
  };
}

/**
 * Checks if the company qualifies for the next level and upgrades it automatically or manually.
 */
export function checkAndApplyCompanyLevelUpgrade(
  state: GameState,
  forceDeveloperOverrideLevel?: 1 | 2 | 3 | 4 | 5
): GameState {
  if (forceDeveloperOverrideLevel !== undefined) {
    const nextState: GameState = {
      ...state,
      company: {
        ...state.company,
        level: forceDeveloperOverrideLevel,
      },
      businessDeveloper: state.businessDeveloper
        ? {
            ...state.businessDeveloper,
            isUnlocked:
              forceDeveloperOverrideLevel >= 3 || state.businessDeveloper.isUnlocked,
          }
        : state.businessDeveloper,
    };
    return recordSyncMilestone(
      nextState,
      'LEVEL_UP',
      `تم تعديل مستوى الشركة إلى المستوى ${forceDeveloperOverrideLevel}`
    );
  }

  const evalStatus = evaluateCompanyLevelProgress(state);
  if (!evalStatus.canUpgradeNow || !evalStatus.nextDefinition) {
    return state;
  }

  const newLevel = evalStatus.nextDefinition.level;
  let nextState: GameState = {
    ...state,
    company: {
      ...state.company,
      level: newLevel,
      reputation: Math.min(100, state.company.reputation + 2),
    },
    businessDeveloper: state.businessDeveloper
      ? {
          ...state.businessDeveloper,
          isUnlocked: newLevel >= 3 || state.businessDeveloper.isUnlocked,
          contracts: {
            ...state.businessDeveloper.contracts,
            WAKKELNY: {
              ...state.businessDeveloper.contracts.WAKKELNY,
              unlocked:
                newLevel >= 3 ||
                state.businessDeveloper.contracts.WAKKELNY.unlocked,
              status:
                newLevel >= 3 &&
                state.businessDeveloper.contracts.WAKKELNY.status === 'LOCKED'
                  ? 'AVAILABLE'
                  : state.businessDeveloper.contracts.WAKKELNY.status,
            },
            ZORO: {
              ...state.businessDeveloper.contracts.ZORO,
              unlocked:
                newLevel >= 3 || state.businessDeveloper.contracts.ZORO.unlocked,
              status:
                newLevel >= 3 &&
                state.businessDeveloper.contracts.ZORO.status === 'LOCKED'
                  ? 'AVAILABLE'
                  : state.businessDeveloper.contracts.ZORO.status,
            },
          },
        }
      : state.businessDeveloper,
  };

  nextState = recordSyncMilestone(
    nextState,
    'LEVEL_UP',
    `ترقية الشركة إلى ${evalStatus.nextDefinition.titleAr}`
  );

  nextState = pushNotification(nextState, {
    dedupeKey: `COMPANY-LEVEL-UP-${newLevel}`,
    title: `ترقية الشركة إلى ${evalStatus.nextDefinition.titleAr}!`,
    message: `تهانينا! حققت الشركة شروط ${evalStatus.nextDefinition.titleAr}. المزايا المفتوحة الآن: ${evalStatus.nextDefinition.unlockedFeaturesAr.join(' — ')}.`,
    department: 'MANAGEMENT',
    outcomeLabel: `المستوى ${newLevel}`,
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Sections 5-6: Converts real-world elapsed milliseconds into in-game minutes
 * according to the rule: 1 in-game hour (60 game mins) = 4 real-world hours (240 real mins).
 * Ratio: 1 game minute per 4 real minutes (240,000 ms).
 * Bounded to a fair maximum catch-up window (12 game hours = 720 game mins) so
 * long offline absences never unfairly bankrupt the player.
 */
export function computeRealTimeOfflineCatchUpMinutes(
  lastRealTimestampMs: number,
  nowRealTimestampMs: number = Date.now()
): {
  gameMinutesToAdvance: number;
  realMinutesElapsed: number;
  cappedAtFairLimit: boolean;
} {
  if (!lastRealTimestampMs || nowRealTimestampMs <= lastRealTimestampMs) {
    return {
      gameMinutesToAdvance: 0,
      realMinutesElapsed: 0,
      cappedAtFairLimit: false,
    };
  }
  const realMinutesElapsed = Math.floor(
    (nowRealTimestampMs - lastRealTimestampMs) / 60000
  );
  // 1 game hour (60 mins) = 4 real hours (240 mins) => 1 game min = 4 real mins
  const rawGameMinutes = Math.floor(realMinutesElapsed / 4);
  const maxFairOfflineGameMinutes = 720; // Max 12 game hours per offline catch-up
  const capped = rawGameMinutes > maxFairOfflineGameMinutes;

  return {
    gameMinutesToAdvance: Math.min(maxFairOfflineGameMinutes, rawGameMinutes),
    realMinutesElapsed,
    cappedAtFairLimit: capped,
  };
}

/**
 * Section 6: Previews what will happen if the player skips `hoursToSkip` game hours
 * in Time Skip Mode (`وضع تجاوز الوقت`) before committing.
 */
export function previewTimeSkipImpact(
  state: GameState,
  hoursToSkip: number
): {
  minutesToAdvance: number;
  ordersAtRiskOfTimeoutCount: number;
  activeShipmentsInTransitCount: number;
  willCrossNewDay: boolean;
  willTriggerHerfokUpdate: boolean;
  willTriggerIngobiaEvaluation: boolean;
  warningSummaryAr: string;
} {
  const minutesToAdvance = Math.max(15, Math.round(hoursToSkip * 60));
  const targetTotalMinutes = state.clock.totalElapsedMinutes + minutesToAdvance;

  const ordersAtRiskOfTimeoutCount = state.shipments.filter(
    (s) =>
      s.status === 'NEW_REQUEST' &&
      s.acceptanceDeadlineTotalMinutes !== undefined &&
      targetTotalMinutes > s.acceptanceDeadlineTotalMinutes
  ).length;

  const activeShipmentsInTransitCount = state.shipments.filter(
    (s) =>
      s.status !== 'NEW_REQUEST' &&
      s.status !== 'DELIVERED' &&
      s.status !== 'REJECTED' &&
      s.status !== 'CANCELLED_EXPIRED' &&
      s.status !== 'RETURNED'
  ).length;

  const willCrossNewDay =
    state.clock.minutesFromMidnight + minutesToAdvance >= 1440;
  const willTriggerHerfokUpdate = minutesToAdvance >= 300;
  const willTriggerIngobiaEvaluation = minutesToAdvance >= 1440;

  const warnings: string[] = [];
  if (ordersAtRiskOfTimeoutCount > 0) {
    warnings.push(
      `يوجد ${ordersAtRiskOfTimeoutCount} طلب جديد في الاستقبال قد تنتهي مهلة قبوله وتخطفه شركة منافسة إذا لم تتخذ قراراً أولاً!`
    );
  }
  if (activeShipmentsInTransitCount > 0) {
    warnings.push(
      `سيتم استكمال مراحل التشغيل لعدد ${activeShipmentsInTransitCount} شحنة نشطة في المستودع والخطوط.`
    );
  }
  if (warnings.length === 0) {
    warnings.push('الأوضاع التشغيلية مستقرة وجاهزة لتجاوز الوقت بأمان.');
  }

  return {
    minutesToAdvance,
    ordersAtRiskOfTimeoutCount,
    activeShipmentsInTransitCount,
    willCrossNewDay,
    willTriggerHerfokUpdate,
    willTriggerIngobiaEvaluation,
    warningSummaryAr: warnings.join(' • '),
  };
}

/**
 * Level 5 Feature: Opens a new regional branch in another Egyptian Governorate.
 */
export function openNewCompanyBranch(
  state: GameState,
  governorateAr: string,
  cityAr: string
): GameState {
  if (state.company.level < 5 && (state.company.adminLevel ?? 0) < 3) {
    throw new Error(
      'افتتاح الفروع الإقليمية في المحافظات يتطلب وصول الشركة إلى المستوى الخامس (المستوى 5).'
    );
  }

  const setupCostPiastres = egpToPiastres(2800);
  const afford = canAffordImmediatePayment(state, setupCostPiastres);
  if (!afford.allowed) {
    throw new Error(
      afford.reason ||
        `السيولة النقدية لا تكفي لافتتاح فرع جديد في ${governorateAr} (${formatEGP(setupCostPiastres)}).`
    );
  }

  const existingBranches = state.branches || [];
  if (existingBranches.some((b) => b.governorateAr === governorateAr)) {
    throw new Error(`يوجد بالفعل فرع نشط للشركة في محافظة ${governorateAr}.`);
  }

  const branchId = `BR-${governorateAr}-${existingBranches.length + 1}`;
  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: setupCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: branchId,
    description: `تأسيس وافتتاح فرع إقليمي ومستودع فرز في محافظة ${governorateAr} (${cityAr})`,
  });

  const newBranch: CompanyBranch = {
    id: branchId,
    nameAr: `فرع انجوبيا إكسبريس — ${governorateAr} (${cityAr})`,
    governorateAr,
    cityAr,
    openedAtDay: state.company.currentDay,
    setupCostPiastres,
    dailyOperatingCostPiastres: egpToPiastres(120),
    warehouseCapacitySlots: 10,
    assignedEmployeesCount: 2,
    assignedVehiclesCount: 1,
    active: true,
  };

  nextState = {
    ...nextState,
    branches: [...existingBranches, newBranch],
    company: {
      ...nextState.company,
      reputation: Math.min(100, nextState.company.reputation + 4),
      marketingPower: Math.min(100, (nextState.company.marketingPower ?? 50) + 6),
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: branchId,
    title: `افتتاح فرع جديد في ${governorateAr}!`,
    message: `تم تأسيس وتشغيل (${newBranch.nameAr}) بسعة 10 طرود إضافية لتغطية خطوط ${governorateAr} والمراكز التابعة لها.`,
    department: 'MANAGEMENT',
    outcomeLabel: `فرع نشط — ${governorateAr}`,
    severity: 'SUCCESS',
  });

  return nextState;
}
