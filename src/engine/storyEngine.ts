import {
  CompanyDebtItem,
  DaySummaryReport,
  GameState,
  Shipment,
  StorySituation,
} from '../types/game';
import { computeShipmentEstimateBreakdown } from './accountingEngine';
import {
  createInitialBusinessDeveloperState,
  ensureBusinessDeveloperState,
  generateAllDailyPlatformOrders,
  processEightDayVehicleLeaseCycle,
} from './businessDeveloperEngine';
import {
  calculateFinancialMetrics,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import {
  buildRoleSkillsForLevel,
  processEightDayPayrollCycle,
} from './hrEngine';
import {
  createInitialHerfokPosts,
  createInitialIngobiaEvaluations,
} from './herfokAndEvaluationEngine';
import {
  createInitialOfflineSyncState,
  createInitialRealTimeBridge,
  generateUniqueCompanyCode,
} from './levelAndTimeEngine';
import {
  createInitialMarketingState,
  processDailyAutoRepeatCampaigns,
} from './marketingEngine';
import {
  createInitialCompetitors,
  createInitialMarketAuctions,
  createInitialPricingEngineState,
} from './pricingAndMarketEngine';
import { createInitialSocialPosts } from './socialMediaEngine';
import { createInitialTutorialState } from './tutorialEngine';
import {
  createInitialBubbleMessages,
  createInitialManagerGuideTasks,
  evaluateOnboardingMasteryProgress,
} from './guideAndSecretaryEngine';
import { pushNotification } from './notificationEngine';
import { ensureMyEmployeesAppInitialized } from './myEmployeesAppEngine';
import { ensureClientContractProfiles } from './returnsAndConflictEngine';
import {
  createInitialWakkelnyZones,
  DEFAULT_WAKKELNY_LAUNCH_HUB,
} from './wakkelnySimulationEngine';

export interface IntroSlide {
  step: number;
  title: string;
  speakerName: string;
  speakerRole: string;
  speakerAvatarId: 'mahmoud' | 'am_saber';
  dialogue: string;
  highlights: { label: string; value: string; tone?: 'neutral' | 'warn' | 'good' }[];
}

export const INTRO_SLIDES: IntroSlide[] = [
  {
    step: 0,
    title: 'استلام إدارة انجوبيا اكسبريس',
    speakerName: 'الأستاذ محمود',
    speakerRole: 'المحاسب الإداري ومسؤول التشغيل',
    speakerAvatarId: 'mahmoud',
    dialogue:
      'أهلاً بحضرتك يا فندم في مقر «انجوبيا اكسبريس — Ingobia Express» بالعباسية. فصلنا أمانات تحصيل التجار (COD) عن إيرادات الشحن، وجهزنا نظام التسويق والموارد البشرية والمستودع. دورك كمدير هو اتخاذ القرارات ومتابعة الأداء.',
    highlights: [
      { label: 'اسم الشركة', value: 'انجوبيا اكسبريس — Ingobia Express', tone: 'good' },
      { label: 'السيولة النقدية المتاحة', value: '13,000.00 ج.م (مقابل 5,000.00 ج.م التزامات مستحقة)', tone: 'neutral' },
      { label: 'الأولوية العاجلة اليوم', value: 'سداد أهم 3 ديون + حملة 6,000 ج.م + شحنة TRK-1001', tone: 'warn' },
    ],
  },
  {
    step: 1,
    title: 'الرصيد النقدي والديون (5,000 ج.م) والمرحلة التعليمية',
    speakerName: 'الأستاذ محمود',
    speakerRole: 'المحاسب الإداري ومسؤول التشغيل',
    speakerAvatarId: 'mahmoud',
    dialogue:
      'في الخزينة 13,000 جنيه سيولة نقدية، وعلينا 4 التزامات مستحقة بإجمالي 5,000 جنيه (كهرباء 1,500، ضرائب 1,400، إيجار 1,300، رواتب 800 ج.م). في المرحلة التعليمية، سنبدأ بسداد أهم 3 التزامات (4,200 ج.م)، ثم نطلق الحملة التسويقية التدريبية بقيمة 6,000 ج.م ونحتفظ بـ 2,800 ج.م احتياطي تشغيل!',
    highlights: [
      { label: 'النقدية والالتزامات', value: '13,000.00 ج.م نقدية | 5,000.00 ج.م ديون (4 بنود)', tone: 'good' },
      { label: 'الحملة التدريبية الإلزامية', value: '6,000.00 ج.م لجذب العملاء الجدد', tone: 'neutral' },
      { label: 'وقود الأسطول والماكينات', value: 'وقود 85% | ماكينات الفرز 88%', tone: 'neutral' },
    ],
  },
  {
    step: 2,
    title: 'أولويات اليوم الأول والانطلاق',
    speakerName: 'عم صابر',
    speakerRole: 'كبير مناديب التوصيل',
    speakerAvatarId: 'am_saber',
    dialogue:
      'صباح الفل يا ريس! طرد نورهان جاليري (TRK-1001) جاهز في المستودع للخروج للدقي، والحاج سعيد منتظر قرارك في شحنة المعادي. اضغط الانتقال إلى العمل عشان نبدأ يومنا!',
    highlights: [
      { label: 'شحنة جاهزة بالمستودع', value: 'TRK-1001 (مدينة نصر -> الدقي)', tone: 'warn' },
      { label: 'طلبات جديدة بالاستقبال', value: 'TRK-1002 (الحاج سعيد) + TRK-1003 (م. كريم)', tone: 'neutral' },
      { label: 'التوجيه التفاعلي', value: 'السكرتير الذكي يشرح كل صفحة ويتابع إتقان 70% من الأنظمة', tone: 'good' },
    ],
  },
];

export function createInitialCompanyDebts(): CompanyDebtItem[] {
  return [
    {
      id: 'DEBT-1-ELECTRICITY',
      category: 'ELECTRICITY' as const,
      creditorNameAr: 'شركة شمال القاهرة لتوزيع الكهرباء',
      titleAr: '1. فاتورة الكهرباء والإنارة الصناعية للمستودع والمكتب',
      originalAmountPiastres: egpToPiastres(1500),
      paidAmountPiastres: 0,
      remainingAmountPiastres: egpToPiastres(1500),
      dueDay: 2,
      dueTimeLabel: 'اليوم 2 — 16:00',
      status: 'UNPAID' as const,
      priorityOrder: 1,
      latePenaltyDescriptionAr: 'غرامة تأخير 150 ج.م وخطر فصل التيار عن سيور الفرز بالمستودع',
      impactIfUnpaidAr: 'توقف ماكينات الفرز والتغليف وتأخر تجهيز الشحنات بنسبة 50%',
    },
    {
      id: 'DEBT-2-TAXES',
      category: 'TAXES' as const,
      creditorNameAr: 'مصلحة الضرائب المصرية — مأمورية العباسية',
      titleAr: '2. مستحقات الضرائب والرسوم التجارية الدورية',
      originalAmountPiastres: egpToPiastres(1400),
      paidAmountPiastres: 0,
      remainingAmountPiastres: egpToPiastres(1400),
      dueDay: 3,
      dueTimeLabel: 'اليوم 3 — 15:00',
      status: 'UNPAID' as const,
      priorityOrder: 2,
      latePenaltyDescriptionAr: 'غرامة تأخير قانونية وتجميد التقديم في العقود الرسمية والمزادات',
      impactIfUnpaidAr: 'انخفاض ثقة الشركات الكبرى وحرمان مؤقت من ترسية المزادات',
    },
    {
      id: 'DEBT-3-RENT',
      category: 'RENT' as const,
      creditorNameAr: 'إدارة عقارات العباسية التجارية',
      titleAr: '3. إيجار مستودع الفرز والمقر الإداري الرئيسي',
      originalAmountPiastres: egpToPiastres(1300),
      paidAmountPiastres: 0,
      remainingAmountPiastres: egpToPiastres(1300),
      dueDay: 4,
      dueTimeLabel: 'اليوم 4 — 18:00',
      status: 'UNPAID' as const,
      priorityOrder: 3,
      latePenaltyDescriptionAr: 'إنذار إداري وتقليص مساحات التحميل أمام المستودع',
      impactIfUnpaidAr: 'تراجع السمعة التجارية وضغط على السعة التشغيلية للمستودع',
    },
    {
      id: 'DEBT-4-SALARIES',
      category: 'SALARIES' as const,
      creditorNameAr: 'صندوق التسويات العمالية ومكافآت التأسيس',
      titleAr: '4. متأخرات رواتب وبدلات تأسيسية لفريق التشغيل',
      originalAmountPiastres: egpToPiastres(800),
      paidAmountPiastres: 0,
      remainingAmountPiastres: egpToPiastres(800),
      dueDay: 6,
      dueTimeLabel: 'اليوم 6 — 17:00',
      status: 'UNPAID' as const,
      priorityOrder: 4,
      latePenaltyDescriptionAr: 'تراجع الروح المعنوية للموظفين وارتفاع احتمالية الغياب',
      impactIfUnpaidAr: 'انخفاض كفاءة الفرز والتوصيل وظهور شكاوى في برنامج «موظفيني»',
    },
  ];
}

/**
 * Creates a fresh, deterministic Day 1 game state for Ingobia Express.
 */
export function createInitialGameState(): GameState {
  const openingCash = egpToPiastres(13000); // 13,000.00 EGP
  const initialLiabilities = egpToPiastres(5000); // 5,000.00 EGP split across 4 obligations

  const trk1001Base = {
    trackingNumber: 'TRK-1001',
    clientId: 'CLI-NOURHAN',
    clientName: 'نورهان جاليري للإكسسوارات',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'الدقي',
    description: 'طرد إكسسوارات وهدايا مغلفة (متأخر من الأمس — أولوية قصوى)',
    priority: 'HIGH' as const,
    weightKg: 3.5,
    weightGrams: 3500,
    lengthCm: 30,
    widthCm: 25,
    heightCm: 16,
    volumeCm3: 12000,
    volumeM3: 0.12,
    packageSizeAr: 'طرد صغير مغلف',
    distanceKm: 14.2,
    distanceAccuracyType: 'VERIFIED_CORRIDOR' as const,
    minOperationalHours: 10,
    quotedClientSlaHours: 15,
    clientRequestedSlaHours: 12,
    serviceFeePiastres: egpToPiastres(120),
    estimatedOperatingCostPiastres: egpToPiastres(40),
    actualOperatingCostPiastres: 0,
    codAmountPiastres: egpToPiastres(600),
    paymentTerms: 'COD_MERCHANT' as const,
    accountantProcessed: true,
    acceptanceDeadlineTotalMinutes: 720,
    acceptanceDeadlineTimeLabel: '12:00',
  };

  const trk1002Base = {
    trackingNumber: 'TRK-1002',
    clientId: 'CLI-SAEED',
    clientName: 'الحاج سعيد للملابس الجاهزة',
    pickupZone: 'العتبة',
    deliveryZone: 'المعادي',
    description: 'كرتونة عينات ملابس شتوية لمحل تجزئة في المعادي',
    priority: 'NORMAL' as const,
    weightKg: 14,
    weightGrams: 14000,
    lengthCm: 50,
    widthCm: 35,
    heightCm: 26,
    volumeCm3: 45500,
    volumeM3: 0.45,
    packageSizeAr: 'كرتونة متوسطة',
    distanceKm: 13.8,
    distanceAccuracyType: 'VERIFIED_CORRIDOR' as const,
    minOperationalHours: 10,
    quotedClientSlaHours: 15,
    clientRequestedSlaHours: 12,
    serviceFeePiastres: egpToPiastres(150),
    estimatedOperatingCostPiastres: egpToPiastres(55),
    actualOperatingCostPiastres: 0,
    codAmountPiastres: 0,
    paymentTerms: 'PREPAID_CASH' as const,
    accountantProcessed: true,
    acceptanceDeadlineTotalMinutes: 780,
    acceptanceDeadlineTimeLabel: '13:00',
  };

  const trk1003Base = {
    trackingNumber: 'TRK-1003',
    clientId: 'CLI-KAREEM',
    clientName: 'المهندس كريم للإلكترونيات',
    pickupZone: 'وسط البلد (البستان)',
    deliveryZone: 'مصر الجديدة',
    description: 'قطع غيار لابتوب وشاشات لشركة صيانة (دفع آجل على الحساب)',
    priority: 'NORMAL' as const,
    weightKg: 8.5,
    weightGrams: 8500,
    lengthCm: 40,
    widthCm: 30,
    heightCm: 24,
    volumeCm3: 28800,
    volumeM3: 0.28,
    packageSizeAr: 'صندوق محمي',
    distanceKm: 12.6,
    distanceAccuracyType: 'VERIFIED_CORRIDOR' as const,
    minOperationalHours: 10,
    quotedClientSlaHours: 15,
    clientRequestedSlaHours: 13,
    serviceFeePiastres: egpToPiastres(220),
    estimatedOperatingCostPiastres: egpToPiastres(65),
    actualOperatingCostPiastres: 0,
    codAmountPiastres: 0,
    paymentTerms: 'POSTPAID_RECEIVABLE' as const,
    accountantProcessed: true,
    acceptanceDeadlineTotalMinutes: 810,
    acceptanceDeadlineTimeLabel: '13:30',
  };

  const day1Shipments: Shipment[] = [
    {
      ...trk1001Base,
      accountantEstimate: computeShipmentEstimateBreakdown(
        trk1001Base,
        'EMP-MAHMOUD',
        'محمود عبد العزيز',
        '08:50'
      ),
      status: 'READY_FOR_DISPATCH',
      operationalLocation: 'WAITING_FOR_COURIER',
      responsibleDepartment: 'WAREHOUSE',
      warehouseId: 'WH-CAIRO-MAIN',
      shelfLocation: 'رف A-01',
      assignedWarehouseStaffId: 'EMP-FARAG',
      assignedCourierId: 'COUR-SABER',
      assignedEmployeeId: 'EMP-SABER',
      assignedVehicleId: 'VEH-MOTO-1',
      revenueEarnedPiastres: 0,
      cashCollectedForFeePiastres: 0,
      receivableOutstandingPiastres: 0,
      codCollectedInCashPiastres: 0,
      codSettledToMerchantPiastres: 0,
      createdAtDay: 1,
      acceptedAtTotalMinutes: 540,
      lastStatusChangeTotalMinutes: 540,
      lastUpdatedTimeLabel: '09:00',
      nextStepDueTotalMinutes: 555,
      expectedDeliveryTotalMinutes: 660,
      expectedDeliveryTimeLabel: '11:00',
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      processedEventKeys: [],
      custodyChain: [
        {
          id: 'CUST-TRK-1001-1',
          stage: 'RECEIVED_AT_WAREHOUSE',
          actorEmployeeId: 'EMP-FARAG',
          actorName: 'أحمد فرج المنياوي',
          department: 'WAREHOUSE',
          day: 1,
          timeLabel: '08:30',
          totalMinutes: 510,
          conditionNote: 'استلام الطرد في المستودع بحالة سليمة (3.5 كجم / 0.12 م³)',
        },
        {
          id: 'CUST-TRK-1001-2',
          stage: 'PACKAGED',
          actorEmployeeId: 'EMP-FARAG',
          actorName: 'أحمد فرج المنياوي',
          department: 'WAREHOUSE',
          day: 1,
          timeLabel: '08:45',
          totalMinutes: 525,
          conditionNote: 'تم الفرز والتغليف في (رف A-01) وجاهز لتسليمه للمندوب عم صابر',
        },
      ],
      timeline: [
        {
          id: 'EVT-1-1',
          day: 1,
          timestampLabel: '09:00 — جاهزة للخروج بالمستودع',
          totalMinutes: 540,
          status: 'READY_FOR_DISPATCH',
          location: 'WAITING_FOR_COURIER',
          department: 'WAREHOUSE',
          actorName: 'أحمد فرج (أمين المستودع)',
          note: 'شحنة مقبولة ومفرزة في (رف A-01) وجاهزة للتسليم للمندوب عم صابر (تحصيل COD 600 ج.م + 120 ج.م شحن).',
        },
      ],
    },
    {
      ...trk1002Base,
      accountantEstimate: computeShipmentEstimateBreakdown(
        trk1002Base,
        'EMP-MAHMOUD',
        'محمود عبد العزيز',
        '09:00'
      ),
      status: 'NEW_REQUEST',
      operationalLocation: 'CLIENT_PREMISES',
      responsibleDepartment: 'MANAGEMENT',
      warehouseId: 'WH-CAIRO-MAIN',
      revenueEarnedPiastres: 0,
      cashCollectedForFeePiastres: 0,
      receivableOutstandingPiastres: 0,
      codCollectedInCashPiastres: 0,
      codSettledToMerchantPiastres: 0,
      createdAtDay: 1,
      lastStatusChangeTotalMinutes: 540,
      lastUpdatedTimeLabel: '09:00',
      expectedDeliveryTotalMinutes: 720,
      expectedDeliveryTimeLabel: '12:00',
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      processedEventKeys: [],
      custodyChain: [],
      timeline: [
        {
          id: 'EVT-1-1',
          day: 1,
          timestampLabel: '09:00 — طلب شحن جديد بالاستقبال',
          totalMinutes: 540,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MANAGEMENT',
          note: 'طلب شحن جديد مقدم من الحاج سعيد (نقدي عند إتمام التسليم) تمت مراجعته مالياً وبانتظار موافقة الإدارة.',
        },
      ],
    },
    {
      ...trk1003Base,
      accountantEstimate: computeShipmentEstimateBreakdown(
        trk1003Base,
        'EMP-MAHMOUD',
        'محمود عبد العزيز',
        '09:00'
      ),
      status: 'NEW_REQUEST',
      operationalLocation: 'CLIENT_PREMISES',
      responsibleDepartment: 'MANAGEMENT',
      warehouseId: 'WH-CAIRO-MAIN',
      revenueEarnedPiastres: 0,
      cashCollectedForFeePiastres: 0,
      receivableOutstandingPiastres: 0,
      codCollectedInCashPiastres: 0,
      codSettledToMerchantPiastres: 0,
      createdAtDay: 1,
      lastStatusChangeTotalMinutes: 540,
      lastUpdatedTimeLabel: '09:00',
      expectedDeliveryTotalMinutes: 750,
      expectedDeliveryTimeLabel: '12:30',
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      processedEventKeys: [],
      custodyChain: [],
      timeline: [
        {
          id: 'EVT-1-1',
          day: 1,
          timestampLabel: '09:00 — طلب شحن آجل عبر الهاتف',
          totalMinutes: 540,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MANAGEMENT',
          note: 'طلب شحن بنظام الحساب الآجل (يُسجل كمستحقات عند التسليم ولا يزيد النقدية فوراً).',
        },
      ],
    },
  ];

  const day1Situations: StorySituation[] = [
    {
      id: 'SIT-D1-1-FINANCE-REVIEW',
      day: 1,
      orderIndex: 1,
      title: 'مراجعة السيولة النقدية وجاهزية البنزين والأسطول',
      speakerName: 'الأستاذ محمود',
      speakerRole: 'المحاسب الإداري',
      speakerAvatarId: 'mahmoud',
      dialogueText:
        'يا فندم، قبل ما نبدأ استلام طلبات العملاء في انجوبيا اكسبريس، رصيدنا النقدي 2,500 جنيه صافي بدون أي ديون. تذكر أن نظامنا المالي يمنع الاستدانة أو الرصيد السالب، وعند نفاد السيولة يغادر الموظفون أو تتعطل المركبات وماكينات الفرز. تحب نتصرف إزاي في السيولة؟',
      documentBadge: 'تقرير الخزينة والوقود — اليوم 1',
      mandatory: true,
      resolved: false,
      options: [
        {
          id: 'OPT-D1-1-ACKNOWLEDGE-KEEP-CASH',
          label: 'اعتماد الميزانية والاحتفاظ بالسيولة للتشغيل والوقود الآن',
          subtitle: 'الحفاظ على النقدية البالغة 2,500 ج.م لتغطية مصاريف البنزين والتشغيل والرواتب',
          conditionsDescription: 'متاح دائماً — لا يصرف نقدية فورية',
          expectedFinancialImpactLabel: 'الرصيد النقدي يبقى 2,500.00 ج.م | الديون 0.00 ج.م',
          effectType: 'ACKNOWLEDGE_BRIEFING',
        },
        {
          id: 'OPT-D1-1-PAY-GARAGE-PARTIAL',
          label: 'إجراء فحص وقائي مبكر وتزويد زيوت للموتوسيكل الأول (200 ج.م)',
          subtitle: 'رفع كفاءة الموتوسيكل الأول إلى 95% لتفادي أي أعطال مفاجئة',
          conditionsDescription: 'يتطلب توفر سيولة فورية 200.00 ج.م',
          expectedFinancialImpactLabel: 'صرف نقدي -200.00 ج.م | رفع كفاءة المركبة إلى 95%',
          requiredCashPiastres: egpToPiastres(200),
          targetVehicleId: 'VEH-MOTO-1',
          effectType: 'VEHICLE_FULL_MAINTENANCE',
        },
        {
          id: 'OPT-D1-1-BUY-MOTO-UNAFFORDABLE',
          label: 'شراء موتوسيكل الشحن المعروض فوراً (3,200 ج.م كاش)',
          subtitle: 'محاولة شراء أصل نقدي يتجاوز السيولة المتاحة حالياً (يرفضه النظام لمنع السالب)',
          conditionsDescription: 'يتطلب سيولة نقدية فورية 3,200.00 ج.م',
          expectedFinancialImpactLabel: 'تكلفة فورية -3,200.00 ج.م',
          requiredCashPiastres: egpToPiastres(3200),
          effectType: 'BUY_NEW_MOTORCYCLE',
        },
      ],
    },
    {
      id: 'SIT-D1-2-CLIENT-SAEED',
      day: 1,
      orderIndex: 2,
      title: 'طلب شحن الحاج سعيد (العتبة إلى المعادي)',
      speakerName: 'الحاج سعيد',
      speakerRole: 'صاحب ورشة ملابس بالعتبة',
      speakerAvatarId: 'hag_saeed',
      dialogueText:
        'مبارك انطلاقة «انجوبيا اكسبريس» يا بني. عندي كرتونة عينات شتوية (14 كجم / 0.45 م³) لازم توصل المعادي النهاردة ضروري. تكلفة المشوار والبنزين عليكم حوالي 55 جنيه، وعارض عليكم 150 جنيه أجر شحن كاش عند التسليم. قولك إيه؟',
      documentBadge: 'بوليصة مقترحة: TRK-1002 | نقدي | ربح متوقع +95 ج.م',
      relatedShipmentTracking: 'TRK-1002',
      mandatory: true,
      resolved: false,
      options: [
        {
          id: 'OPT-D1-2-ACCEPT-SAEED-150',
          label: 'قبول الطلب بالسعر المعروض (150.00 ج.م)',
          subtitle: 'تدخل الشحنة تلقائياً للمستودع ثم للمندوب للتوصيل',
          conditionsDescription: 'يتطلب سعة بالمستودع (14 كجم / 0.45 م³) + سيولة 55.00 ج.م',
          expectedFinancialImpactLabel: 'سعر الخدمة: 150.00 ج.م | تكلفة التشغيل: 55.00 ج.م | صافي متوقع: +95.00 ج.م',
          requiresOperationalCapacity: true,
          targetShipmentId: 'TRK-1002',
          effectType: 'ACCEPT_SHIPMENT',
        },
        {
          id: 'OPT-D1-2-NEGOTIATE-SAEED-185',
          label: 'التفاوض لرفع السعر إلى 185.00 ج.م كخدمة سريعة',
          subtitle: 'استغلال استعجال العميل لزيادة العائد بـ 35.00 ج.م إضافية',
          conditionsDescription: 'يتطلب ثقة العميل 65% على الأقل + سعة بالمستودع',
          expectedFinancialImpactLabel: 'سعر الخدمة بعد التفاوض: 185.00 ج.م | تكلفة التشغيل: 55.00 ج.م | صافي: +130.00 ج.م',
          requiresOperationalCapacity: true,
          requiresMinTrust: { clientId: 'CLI-SAEED', minTrust: 65 },
          targetShipmentId: 'TRK-1002',
          customAmountPiastres: egpToPiastres(185),
          effectType: 'NEGOTIATE_SHIPMENT',
        },
        {
          id: 'OPT-D1-2-REJECT-SAEED',
          label: 'الاعتذار عن الطلب ورفض الشحنة',
          subtitle: 'توفير سعة المستودع والمناديب ولكن يخفض ثقة الحاج سعيد بالشركة',
          conditionsDescription: 'لا تترتب عليه أي إيرادات أو مصاريف تشغيل',
          expectedFinancialImpactLabel: 'إيراد: 0.00 ج.م | تكلفة: 0.00 ج.م | ثقة العميل -8',
          targetShipmentId: 'TRK-1002',
          effectType: 'REJECT_SHIPMENT',
        },
      ],
    },
    {
      id: 'SIT-D1-3-CLIENT-KAREEM',
      day: 1,
      orderIndex: 3,
      title: 'طلب شحن آجل من المهندس كريم (وسط البلد إلى مصر الجديدة)',
      speakerName: 'المهندس كريم',
      speakerRole: 'تاجر إلكترونيات بمول البستان',
      speakerAvatarId: 'kareem',
      dialogueText:
        'أهلاً بيكم في انجوبيا اكسبريس. عندي طرد قطع غيار شاشات (8.5 كجم / 0.28 م³) رايح مركز صيانة في مصر الجديدة. حساب الشحن 220 جنيه، بس الفاتورة بتقفل على الحساب الآجل وتتحصل في اليوم التاني، وتكلفة المشوار عليكم 65 جنيه. هتستلموا؟',
      documentBadge: 'بوليصة مقترحة: TRK-1003 | آجل (مستحقات) | ربح متوقع +155 ج.م',
      relatedShipmentTracking: 'TRK-1003',
      mandatory: true,
      resolved: false,
      options: [
        {
          id: 'OPT-D1-3-ACCEPT-KAREEM-POSTPAID',
          label: 'قبول الشحنة بنظام الدفع الآجل (220.00 ج.م مستحقات)',
          subtitle: 'تُحال للمستودع والتوزيع آلياً ويُسجل الإيراد في المستحقات عند التسليم',
          conditionsDescription: 'يتطلب سعة بالمستودع + سيولة 65.00 ج.م لمصروف التشغيل',
          expectedFinancialImpactLabel: 'إيراد آجل: 220.00 ج.م | مصروف نقدي عند الخروج: 65.00 ج.م',
          requiresOperationalCapacity: true,
          targetShipmentId: 'TRK-1003',
          effectType: 'ACCEPT_SHIPMENT',
        },
        {
          id: 'OPT-D1-3-REJECT-KAREEM',
          label: 'رفض الشحنة لعدم الرغبة في البيع الآجل',
          subtitle: 'الحفاظ على السيولة النقدية اليوم مقابل خسارة إيراد الشحنة وثقة العميل',
          conditionsDescription: 'لا يسجل إيراداً ولا تكلفة تنفيذ',
          expectedFinancialImpactLabel: 'إيراد: 0.00 ج.م | تكلفة: 0.00 ج.م | ثقة العميل -8',
          targetShipmentId: 'TRK-1003',
          effectType: 'REJECT_SHIPMENT',
        },
      ],
    },
  ];

  const initialState: GameState = {
    saveVersion: 2,
    phase: 'INTRO_STORY',
    introStep: 0,
    clock: {
      day: 1,
      minutesFromMidnight: 540, // 09:00 AM
      totalElapsedMinutes: 540,
      isPaused: false,
      speedMultiplier: 1,
    },
    company: {
      id: 'COMP-INGOBIA-EXPRESS',
      companyCode: generateUniqueCompanyCode('COMP-INGOBIA-EXPRESS'),
      name: 'انجوبيا اكسبريس — Ingobia Express',
      currentDay: 1,
      level: 1,
      adminLevel: 3,
      openingCashPiastres: openingCash,
      cashPiastres: openingCash,
      liabilitiesPiastres: initialLiabilities,
      reputation: 62,
      marketingPower: 58,
      customerSatisfaction: 60,
      levelSystemMigratedV3: true,
    },
    warehouses: [
      {
        id: 'WH-CAIRO-MAIN',
        name: 'مستودع انجوبيا المركزي للفرز (العباسية)',
        locationAr: 'العباسية — القاهرة',
        maxCapacity: 8,
        maxWeightKg: 180,
        maxVolumeM3: 6.5,
        rentedExtraWeightKg: 0,
        rentedExtraVolumeM3: 0,
        operatingCostPerDayPiastres: egpToPiastres(60),
        efficiencyLevel: 82,
        logs: [
          {
            id: 'WLOG-1-1',
            day: 1,
            timeLabel: '08:45',
            trackingNumber: 'TRK-1001',
            action: 'PREPARED',
            staffName: 'أحمد فرج',
            shelfLocation: 'رف A-01',
            note: 'تجهيز طرد نورهان جاليري المتأخر من الأمس للخروج مع أول مندوب.',
          },
        ],
      },
    ],
    employees: [
      {
        id: 'EMP-MAHMOUD',
        name: 'محمود عبد العزيز',
        role: 'ADMIN_ACCOUNTANT',
        roleTitleAr: 'المحاسب الإداري ومسؤول التشغيل',
        experienceLevel: 'EXPERT',
        skills: buildRoleSkillsForLevel('ADMIN_ACCOUNTANT', 'EXPERT'),
        baseMonthlySalaryPiastres: egpToPiastres(3600),
        salaryDueDay: 8,
        salaryCycleDays: 8,
        dailyWagePiastres: egpToPiastres(120),
        status: 'ACTIVE',
        efficiency: 88,
        performanceScore: 92,
        performancePositiveFactors: [
          'دقة عالية في حساب صافي ربح وتكلفة الشحنات',
          'إنجاز 4 مهام محاسبية وتشغيلية بدون أخطاء',
        ],
        performanceNegativeFactors: [],
        isLowPerformWarning: false,
        reviewCompleted: false,
        hiredAtDay: 1,
        completedTasksCount: 4,
        errorRatePercent: 2,
        attributedDelaysCount: 0,
        bonusesPiastres: 0,
        approvedPenaltiesPiastres: 0,
        accruedSalaryPiastres: 0,
        paidSalaryPiastres: 0,
        dailyCapacity: 8, // 8 shipment requests per day per accountant
        assignedShipmentsToday: 3, // Reviewed TRK-1001, TRK-1002, TRK-1003
        penaltyHistory: [],
      },
      {
        id: 'EMP-FARAG',
        name: 'أحمد فرج المنياوي',
        role: 'WAREHOUSE_CLERK',
        roleTitleAr: 'أمين المستودع ومسؤول الفرز',
        experienceLevel: 'INTERMEDIATE',
        skills: buildRoleSkillsForLevel('WAREHOUSE_CLERK', 'INTERMEDIATE'),
        baseMonthlySalaryPiastres: egpToPiastres(3000),
        salaryDueDay: 8,
        salaryCycleDays: 8,
        dailyWagePiastres: egpToPiastres(100),
        status: 'ACTIVE',
        efficiency: 82,
        performanceScore: 84,
        performancePositiveFactors: [
          'تنظيم جيد لأرفف المستودع وسرعة تجهيز الطرود',
        ],
        performanceNegativeFactors: [],
        isLowPerformWarning: false,
        reviewCompleted: false,
        hiredAtDay: 1,
        completedTasksCount: 3,
        errorRatePercent: 4,
        attributedDelaysCount: 0,
        bonusesPiastres: 0,
        approvedPenaltiesPiastres: 0,
        accruedSalaryPiastres: 0,
        paidSalaryPiastres: 0,
        dailyCapacity: 8,
        assignedShipmentsToday: 1,
        penaltyHistory: [],
      },
      {
        id: 'EMP-SABER',
        name: 'عم صابر المغربي',
        role: 'COURIER_MOTO',
        roleTitleAr: 'كبير مناديب التوصيل',
        experienceLevel: 'EXPERT',
        skills: buildRoleSkillsForLevel('COURIER_MOTO', 'EXPERT'),
        baseMonthlySalaryPiastres: egpToPiastres(3300),
        salaryDueDay: 8,
        salaryCycleDays: 8,
        dailyWagePiastres: egpToPiastres(110),
        status: 'ACTIVE',
        efficiency: 85,
        performanceScore: 81,
        performancePositiveFactors: [
          'خبرة واسعة بشوارع الجيزة ووسط البلد والمعادي',
          'إنجاز 5 مهام توصيل سابقة بنجاح',
        ],
        performanceNegativeFactors: [
          'تسجيل حالة تأخير واحدة من اليوم السابق',
        ],
        isLowPerformWarning: false,
        reviewCompleted: false,
        hiredAtDay: 1,
        completedTasksCount: 5,
        errorRatePercent: 3,
        attributedDelaysCount: 1,
        bonusesPiastres: 0,
        approvedPenaltiesPiastres: 0,
        accruedSalaryPiastres: 0,
        paidSalaryPiastres: 0,
        dailyCapacity: 3,
        assignedShipmentsToday: 1,
        penaltyHistory: [],
      },
      {
        id: 'EMP-HASSAN',
        name: 'حسن الشبراوي',
        role: 'COURIER_MOTO',
        roleTitleAr: 'مندوب توصيل دراجة نارية',
        experienceLevel: 'INTERMEDIATE',
        skills: buildRoleSkillsForLevel('COURIER_MOTO', 'INTERMEDIATE'),
        baseMonthlySalaryPiastres: egpToPiastres(3000),
        salaryDueDay: 8,
        salaryCycleDays: 8,
        dailyWagePiastres: egpToPiastres(100),
        status: 'ACTIVE',
        efficiency: 78,
        performanceScore: 80,
        performancePositiveFactors: [
          'التزام بخطوط سير شرق القاهرة ومدينة نصر وشبرا',
        ],
        performanceNegativeFactors: [],
        isLowPerformWarning: false,
        reviewCompleted: false,
        hiredAtDay: 1,
        completedTasksCount: 3,
        errorRatePercent: 5,
        attributedDelaysCount: 0,
        bonusesPiastres: 0,
        approvedPenaltiesPiastres: 0,
        accruedSalaryPiastres: 0,
        paidSalaryPiastres: 0,
        dailyCapacity: 3,
        assignedShipmentsToday: 0,
        penaltyHistory: [],
      },
    ],
    couriers: [
      {
        id: 'COUR-SABER',
        employeeId: 'EMP-SABER',
        name: 'عم صابر المغربي',
        vehicleId: 'VEH-MOTO-1',
        ownsPersonalMotorcycle: false,
        needsCompanyVehicle: false,
        status: 'AVAILABLE',
        zoneAr: 'الجيزة ووسط البلد والمعادي',
        coveredZones: ['الدقي', 'المعادي', 'المهندسين', 'الزمالك', 'وسط البلد'],
        maxLoad: 2,
        currentLoad: 0,
        maxWeightGrams: 10000,
        maxVolumeCm3: 72000,
        currentWeightGrams: 0,
        currentVolumeCm3: 0,
        assignedTrackingNumbers: [],
        activePlatformOrderIds: [],
        efficiency: 85,
        monthlySalaryPiastres: egpToPiastres(3300),
        tripOperatingCostPiastres: egpToPiastres(40),
        successfulDeliveriesCount: 5,
        failedOrDelayedCount: 1,
        deliveryHistory: [],
      },
      {
        id: 'COUR-HASSAN',
        employeeId: 'EMP-HASSAN',
        name: 'حسن الشبراوي',
        vehicleId: 'VEH-MOTO-2',
        ownsPersonalMotorcycle: false,
        needsCompanyVehicle: false,
        status: 'AVAILABLE',
        zoneAr: 'شرق القاهرة ومدينة نصر وشبرا',
        coveredZones: ['مصر الجديدة', 'مدينة نصر', 'شبرا مصر', 'العتبة', 'التجمع الخامس'],
        maxLoad: 2,
        currentLoad: 0,
        maxWeightGrams: 20000,
        maxVolumeCm3: 137500,
        currentWeightGrams: 0,
        currentVolumeCm3: 0,
        assignedTrackingNumbers: [],
        activePlatformOrderIds: [],
        efficiency: 78,
        monthlySalaryPiastres: egpToPiastres(3000),
        tripOperatingCostPiastres: egpToPiastres(45),
        successfulDeliveriesCount: 3,
        failedOrDelayedCount: 0,
        deliveryHistory: [],
      },
    ],
    vehicles: [
      {
        id: 'VEH-MOTO-1',
        name: 'موتوسيكل حلاوة أصلية 150 سي سي (أ ف ج 412)',
        type: 'MOTORCYCLE',
        typeAr: 'موتوسيكل اقتصادي (مملوك للشركة)',
        catalogId: 'MOTO_ECONOMY',
        vehicleClass: 'MOTORCYCLE',
        ownershipType: 'OWNED',
        buyPricePiastres: egpToPiastres(45000),
        leaseCostPerCyclePiastres: 0,
        purchasedAtDay: 1,
        assignedCourierId: 'COUR-SABER',
        status: 'AVAILABLE',
        capacity: 3,
        usedCapacityToday: 1,
        maxWeightGrams: 10000,
        maxWeightKg: 10,
        internalLengthCm: 45,
        internalWidthCm: 40,
        internalHeightCm: 40,
        maxVolumeCm3: 72000,
        usedWeightGrams: 0,
        usedVolumeCm3: 0,
        totalDistanceKm: 42,
        tripsCompletedCount: 5,
        operatingCostPerTripPiastres: egpToPiastres(40),
        maintenanceHealth: 82,
      },
      {
        id: 'VEH-MOTO-2',
        name: 'موتوسيكل دايون 40 شحن (ق ر س 819)',
        type: 'MOTORCYCLE',
        typeAr: 'موتوسيكل قوي (مملوك للشركة)',
        catalogId: 'MOTO_HEAVY',
        vehicleClass: 'MOTORCYCLE',
        ownershipType: 'OWNED',
        buyPricePiastres: egpToPiastres(75000),
        leaseCostPerCyclePiastres: 0,
        purchasedAtDay: 1,
        assignedCourierId: 'COUR-HASSAN',
        status: 'AVAILABLE',
        capacity: 3,
        usedCapacityToday: 0,
        maxWeightGrams: 20000,
        maxWeightKg: 20,
        internalLengthCm: 55,
        internalWidthCm: 50,
        internalHeightCm: 50,
        maxVolumeCm3: 137500,
        usedWeightGrams: 0,
        usedVolumeCm3: 0,
        totalDistanceKm: 28,
        tripsCompletedCount: 3,
        operatingCostPerTripPiastres: egpToPiastres(45),
        maintenanceHealth: 74,
      },
      {
        id: 'VEH-VAN-1',
        name: 'فان سوزوكي نقل خفيف (م ص ر 905)',
        type: 'CARGO_VAN',
        typeAr: 'سيارة توصيل صغيرة (مملوكة للشركة)',
        catalogId: 'SMALL_DELIVERY_CAR',
        vehicleClass: 'SMALL_CAR',
        ownershipType: 'OWNED',
        buyPricePiastres: egpToPiastres(350000),
        leaseCostPerCyclePiastres: 0,
        purchasedAtDay: 1,
        assignedCourierId: null,
        status: 'NEEDS_MAINTENANCE',
        capacity: 6,
        usedCapacityToday: 0,
        maxWeightGrams: 300000,
        maxWeightKg: 300,
        internalLengthCm: 160,
        internalWidthCm: 130,
        internalHeightCm: 120,
        maxVolumeCm3: 2496000,
        usedWeightGrams: 0,
        usedVolumeCm3: 0,
        totalDistanceKm: 115,
        tripsCompletedCount: 12,
        operatingCostPerTripPiastres: egpToPiastres(90),
        maintenanceHealth: 15,
      },
    ],
    clients: [
      {
        id: 'CLI-NOURHAN',
        name: 'نورهان جاليري للإكسسوارات',
        roleAr: 'تاجرة إكسسوارات وهدايا أونلاين',
        type: 'LOCAL_STORE',
        typeAr: 'متجر إكسسوارات وهدايا',
        receivableBalancePiastres: 0,
        merchantCodBalancePiastres: 0,
        trustLevel: 55,
        avatarId: 'nourhan',
        history: [
          {
            id: 'HIST-0-1',
            day: 0,
            summary: 'تأخر شحنة الدقي TRK-1001 من اليوم السابق بسبب ارتباك التوزيع',
            trustDelta: -10,
          },
        ],
      },
      {
        id: 'CLI-SAEED',
        name: 'الحاج سعيد للملابس الجاهزة',
        roleAr: 'صاحب ورشة ومصنع ملابس بالعتبة',
        type: 'CLOTHING_WORKSHOP',
        typeAr: 'ورشة وتجارة ملابس',
        receivableBalancePiastres: 0,
        merchantCodBalancePiastres: 0,
        trustLevel: 70,
        avatarId: 'hag_saeed',
        history: [
          {
            id: 'HIST-0-2',
            day: 0,
            summary: 'عميل منتظم منذ 3 أشهر ويبحث عن التزام بمواعيد التسليم',
            trustDelta: 0,
          },
        ],
      },
      {
        id: 'CLI-KAREEM',
        name: 'المهندس كريم للإلكترونيات',
        roleAr: 'مورد قطع غيار كمبيوتر بوسط البلد',
        type: 'ELECTRONICS_TRADER',
        typeAr: 'تجارة إلكترونيات وقطع غيار',
        receivableBalancePiastres: 0,
        merchantCodBalancePiastres: 0,
        trustLevel: 68,
        avatarId: 'kareem',
        history: [
          {
            id: 'HIST-0-3',
            day: 0,
            summary: 'يتعامل بنظام الفواتير الآجلة قصيرة الأجل ويلتزم بالسداد',
            trustDelta: 0,
          },
        ],
      },
    ],
    shipments: day1Shipments,
    notifications: [
      {
        id: 'NOTIF-1-1',
        dedupeKey: 'INIT-DAY1-START',
        day: 1,
        timeLabel: '09:00',
        totalMinutes: 540,
        trackingNumber: 'TRK-1001',
        title: 'الشحنة TRK-1001 جاهزة بالمستودع للخروج',
        message: '09:00 — الشحنة TRK-1001 (نورهان جاليري) مفرزة بالمستودع وستخرج مع المندوب عم صابر خلال دقائق.',
        department: 'WAREHOUSE',
        outcomeLabel: 'جاهزة للخروج',
        severity: 'INFO',
        read: false,
      },
    ],
    ledger: [
      {
        id: 'LED-1-001',
        day: 1,
        timeLabel: '09:00',
        sequenceNumber: 1,
        type: 'OPENING_BALANCE',
        amountPiastres: openingCash,
        debitAccount: 'CASH',
        creditAccount: 'OPENING_EQUITY',
        referenceId: 'INIT-OPENING',
        description: 'الرصيد النقدي الافتتاحي بالخزينة عند استلام إدارة انجوبيا اكسبريس',
        affectsCash: true,
        cashDeltaPiastres: openingCash,
      },
    ],
    situations: day1Situations,
    marketing: createInitialMarketingState(),
    hrJobAds: [],
    payrollCycle: {
      cycleLengthDays: 8,
      lastPayrollPaidDay: 0,
      nextPayrollDueDay: 8,
      processedCycleDays: [],
      unpaidSalariesPiastres: 0,
    },
    fleetAndEquipment: {
      fuelLevelPercent: 85,
      sortingMachineHealth: 88,
      adminSystemHealth: 94,
      lastRefueledDay: 1,
      lastMachineMaintainedDay: 1,
      activeBreakdowns: [],
    },
    insolvencyCrisis: undefined,
    dayCheckpoints: [],
    businessDeveloper: {
      ...createInitialBusinessDeveloperState(1),
      wakkelnyLaunchHubAr: DEFAULT_WAKKELNY_LAUNCH_HUB,
      wakkelnyZones: createInitialWakkelnyZones(['COUR-SABER', 'COUR-HASSAN']),
      orderTimingsById: {},
    },
    pricingEngine: createInitialPricingEngineState(),
    competitors: createInitialCompetitors(),
    marketAuctions: createInitialMarketAuctions(1, 540),
    herfokPosts: createInitialHerfokPosts(),
    ingobiaEvaluations: createInitialIngobiaEvaluations(),
    branches: [],
    realTimeBridge: createInitialRealTimeBridge(),
    offlineSync: createInitialOfflineSyncState(),
    guideAndSecretary: {
      guideTasks: createInitialManagerGuideTasks(),
      bubbleMessages: createInitialBubbleMessages(1),
    },
    debts: createInitialCompanyDebts(),
    companyProfile: {
      bioAr:
        'شركة شحن وخدمات لوجستية متخصصة في التوصيل السريع وإدارة تحصيل أمانات التجار (COD) والفرز الآمن داخل القاهرة الكبرى والمحافظات.',
      commercialSloganAr: 'أمانة طردك.. التزام في الميعاد وحساب بالمليم',
      avatarIconId: 'TRUCK_SHIELD',
      serviceSpecialtiesAr: [
        'توصيل التجارة الإلكترونية والبراندات',
        'تحصيل أمانات التجار (COD) بدقة',
        'تغليف مقوى للشحنات القابلة للكسر',
      ],
      coveredZonesAr: ['مدينة نصر', 'العتبة', 'وسط البلد', 'المعادي', 'الدقي', 'شبرا مصر'],
      lastUpdatedDay: 1,
      trustBonusEarned: 0,
    },
    onboardingMastery: {
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
    },
    timedShipmentToasts: [
      {
        id: 'TOAST-INIT-TRK-1002',
        dedupeKey: 'TOAST-INIT-TRK-1002',
        shipmentId: 'TRK-1002',
        trackingNumber: 'TRK-1002',
        clientName: 'الحاج سعيد للملابس الجاهزة',
        stage: 'NEW_ORDER',
        messageAr: 'أوردر جديد من الحاج سعيد للملابس الجاهزة (TRK-1002) — راجعه الآن',
        durationMs: 2000,
        createdAtMs: Date.now(),
        targetSection: 'SHIPMENTS',
      },
    ],
    lastObligationReminderBucket: 1,
    socialPosts: createInitialSocialPosts(),
    tutorial: createInitialTutorialState(),
    executedDecisionIds: [],
    processedSimulationEventIds: [],
    discoveredEvents: [],
    completedTaskIds: [],
    dayReports: [],
    soundEnabled: true,
    lastSavedTimestamp: new Date().toISOString(),
  };

  return ensureClientContractProfiles(
    ensureMyEmployeesAppInitialized(initialState)
  );
}

/**
 * Checks whether all mandatory tasks for the current day are completed so the player can end the day.
 */
export function canEndCurrentDay(state: GameState): {
  canEnd: boolean;
  blockingReasons: string[];
} {
  const reasons: string[] = [];
  const currentDay = state.company.currentDay;

  const unresolvedMandatory = state.situations.filter(
    (s) => s.day === currentDay && s.mandatory && !s.resolved
  );
  if (unresolvedMandatory.length > 0) {
    reasons.push(
      `يوجد ${unresolvedMandatory.length} موقف/قرار إداري إلزامي لم يُحسم بعد.`
    );
  }

  const activeUnfinishedShipments = state.shipments.filter(
    (s) =>
      s.status !== 'DELIVERED' &&
      s.status !== 'REJECTED' &&
      s.status !== 'RETURNED' &&
      s.status !== 'CANCELLED_EXPIRED'
  );

  if (activeUnfinishedShipments.length > 0) {
    reasons.push(
      `يوجد ${activeUnfinishedShipments.length} شحنة نشطة في دورة المستودع والتوزيع (${activeUnfinishedShipments.map((s) => s.trackingNumber).join('، ')}) — دع وقت اللعبة يتقدم أو تدخل إدارياً إذا كانت هناك مشكلة.`
    );
  }

  return {
    canEnd: reasons.length === 0,
    blockingReasons: reasons,
  };
}

/**
 * Ends the current day:
 * - Records warehouse daily operating expense in cash (60 EGP).
 * - Accrues daily salary entitlement into ACCRUED_SALARIES_PAYABLE.
 * - On every 8th game day (Day 8, 16, 24...), executes `processEightDayPayrollCycle` to pay salaries from cash.
 * - Generates the DaySummaryReport and transitions to DAY_END_REPORT.
 */
export function finishCurrentDay(state: GameState): GameState {
  const check = canEndCurrentDay(state);
  if (!check.canEnd) {
    throw new Error(check.blockingReasons.join(' '));
  }

  const day = state.company.currentDay;
  let nextState = {
    ...state,
    clock: {
      ...state.clock,
      isPaused: true,
    },
  };

  // 1. Warehouse daily operating cost paid in cash (60 EGP) — never negative, no debt!
  const warehouseCost =
    nextState.warehouses[0]?.operatingCostPerDayPiastres || egpToPiastres(60);
  if (nextState.company.cashPiastres >= warehouseCost) {
    nextState = recordLedgerTransaction(nextState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: warehouseCost,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: `WH-OPS-DAY-${day}`,
      description: `مصروفات تشغيل وإنارة مستودع الفرز عن اليوم ${day}`,
    });
  } else {
    const partialCash = nextState.company.cashPiastres;
    const shortfall = warehouseCost - partialCash;
    if (partialCash > 0) {
      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: partialCash,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: `WH-OPS-PARTIAL-DAY-${day}`,
        description: `سداد جزئي لمصروفات تشغيل المستودع واستنفاد كامل السيولة (اليوم ${day})`,
      });
    }
    nextState = {
      ...nextState,
      insolvencyCrisis: {
        active: true,
        day,
        triggeredOnDay: day,
        reasonType: 'FUEL_DEPLETED_NO_CASH',
        titleAr: 'توقف التشغيل لنفاد السيولة النقدية عن تغطية مصروفات التشغيل اليومية والوقود',
        detailsAr: `نفدت السيولة النقدية بالخزينة (0.00 ج.م) وعجزت الشركة عن تغطية مصروفات تشغيل المستودع والوقود (${formatEGP(shortfall)} عجز). نظراً لسياسة عدم السماح بالديون أو الرصيد السالب، توقفت المعدات والمركبات. يجب عليك العودة لآخر 10 أيام سابقة أو البدء من اليوم الأول.`,
        descriptionAr: `نفدت السيولة النقدية بالخزينة (0.00 ج.م) وعجزت الشركة عن تغطية مصروفات تشغيل المستودع والوقود (${formatEGP(shortfall)} عجز). نظراً لسياسة عدم السماح بالديون أو الرصيد السالب، توقفت المعدات والمركبات. يجب عليك العودة لآخر 10 أيام سابقة أو البدء من اليوم الأول.`,
        affectedEmployeesCount: 0,
        shortfallPiastres: shortfall,
        departedEmployeeNames: [],
        brokenEquipmentLabels: ['توقف ماكينات الفرز والإنارة بالمستودع', 'نفاد ميزانية وقود المركبات'],
      },
    };
  }

  // 2. Accrue daily portion of salaries for active staff
  const activeStaff = nextState.employees.filter((e) => e.status !== 'TERMINATED');
  const dailyAccruedSalaryTotal = activeStaff.reduce(
    (sum, emp) => sum + Math.round(emp.baseMonthlySalaryPiastres / 30),
    0
  );

  if (dailyAccruedSalaryTotal > 0) {
    nextState = recordLedgerTransaction(nextState, {
      type: 'SALARY_ACCRUED',
      amountPiastres: dailyAccruedSalaryTotal,
      debitAccount: 'SALARY_EXPENSE',
      creditAccount: 'ACCRUED_SALARIES_PAYABLE',
      referenceId: `SAL-ACCRUAL-DAY-${day}`,
      description: `قيد استحقاق الأجور اليومي (يُصرف في دورة الرواتب كل 8 أيام) — اليوم ${day}`,
    });

    nextState = {
      ...nextState,
      employees: nextState.employees.map((emp) =>
        emp.status === 'TERMINATED'
          ? emp
          : {
              ...emp,
              accruedSalaryPiastres:
                emp.accruedSalaryPiastres + Math.round(emp.baseMonthlySalaryPiastres / 30),
            }
      ),
    };
  }

  // 3. If today is an 8-day payroll & vehicle lease cycle due day (Day 8, 16, 24...), settle both cycles!
  if (day % 8 === 0) {
    nextState = processEightDayPayrollCycle(nextState, day);
    nextState = processEightDayVehicleLeaseCycle(nextState, day);
  }

  const metrics = calculateFinancialMetrics(nextState, day);
  const dayShipments = nextState.shipments.filter((s) => s.createdAtDay === day);

  const deliveredCount = dayShipments.filter((s) => s.status === 'DELIVERED').length;
  const failedCount = dayShipments.filter(
    (s) =>
      s.status === 'RETURNED' ||
      s.status === 'DELIVERY_FAILED' ||
      s.status === 'CANCELLED_EXPIRED'
  ).length;
  const rejectedCount = dayShipments.filter((s) => s.status === 'REJECTED').length;

  const notes: string[] = [];
  if (deliveredCount > 0) {
    notes.push(`تم إتمام تسليم ${deliveredCount} شحنة بنجاح عبر المستودع والمناديب خلال اليوم ${day}.`);
  }
  if (day % 8 === 0) {
    notes.push(`حلّ موعد دورة الرواتب المركزية (كل 8 أيام عمل) وتمت تسوية مستحقات الموظفين حسب السيولة المتاحة.`);
  } else {
    notes.push(
      `تم إثبات استحقاق رواتب اليوم (${formatEGP(dailyAccruedSalaryTotal)}) في حساب الرواتب المستحقة (تُصرف في اليوم ${nextState.payrollCycle?.nextPayrollDueDay || 8}).`
    );
  }
  if (metrics.earnedUncollectedRevenuePiastres > 0) {
    notes.push(
      `تم تسجيل ${formatEGP(metrics.earnedUncollectedRevenuePiastres)} كإيرادات آجلة مستحقة عند العملاء.`
    );
  }
  if (metrics.merchantCodLiabilityPiastres > 0) {
    notes.push(
      `يوجد بالخزينة ${formatEGP(metrics.merchantCodLiabilityPiastres)} أمانات تحصيل (COD) لصالح التجار واجبة التوريد.`
    );
  }

  const report: DaySummaryReport = {
    day,
    openingCashPiastres: metrics.openingCashPiastres,
    closingCashPiastres: metrics.displayedCashPiastres,
    earnedRevenuePiastres: metrics.earnedServiceRevenuePiastres,
    operatingExpensesPiastres: metrics.incurredOperatingExpensesPiastres,
    accruedSalariesPiastres: metrics.incurredSalaryExpensesPiastres,
    netOperatingProfitPiastres: metrics.netOperatingProfitPiastres,
    cashReceiptsPiastres: metrics.actualCashReceiptsPiastres,
    cashPaymentsPiastres: metrics.actualCashPaymentsPiastres,
    closingReceivablesPiastres: metrics.closingReceivablesPiastres,
    closingCodPayablesPiastres: metrics.merchantCodLiabilityPiastres,
    closingLiabilitiesPiastres: nextState.company.liabilitiesPiastres,
    shipmentsDelivered: deliveredCount,
    shipmentsFailedOrReturned: failedCount,
    shipmentsRejected: rejectedCount,
    reputationEnd: nextState.company.reputation,
    notes,
  };

  return {
    ...nextState,
    phase: 'DAY_END_REPORT',
    dayReports: [...nextState.dayReports.filter((r) => r.day !== day), report],
  };
}

/**
 * Transitions from DAY_END_REPORT to the next day (Day 2 or subsequent days),
 * applying any scheduled salary raises and resetting daily accountant/staff counters.
 */
export function advanceToNextDay(state: GameState): GameState {
  const nextDay = state.company.currentDay + 1;
  const morningClockMinutes = 540; // 09:00 AM
  const nextTotalElapsed = state.clock.totalElapsedMinutes + 60;

  const resetEmployees = state.employees.map((e) => {
    if (e.status === 'TERMINATED') return e;
    const newSalary =
      e.futureSalaryEffectiveDay &&
      e.futureSalaryEffectiveDay <= nextDay &&
      e.futureMonthlySalaryPiastres
        ? e.futureMonthlySalaryPiastres
        : e.baseMonthlySalaryPiastres;
    return {
      ...e,
      baseMonthlySalaryPiastres: newSalary,
      dailyWagePiastres: Math.round(newSalary / 30),
      futureSalaryEffectiveDay: undefined,
      futureMonthlySalaryPiastres: undefined,
      assignedShipmentsToday: 0,
      status: e.status === 'IN_TRAINING' ? ('ACTIVE' as const) : e.status,
    };
  });

  const resetCouriers = state.couriers.map((c) => {
    const emp = resetEmployees.find((e) => e.id === c.employeeId);
    if (emp?.status === 'TERMINATED') return c;
    return {
      ...c,
      status: 'AVAILABLE' as const,
      currentLoad: 0,
      assignedTrackingNumbers: [],
      monthlySalaryPiastres: emp ? emp.baseMonthlySalaryPiastres : c.monthlySalaryPiastres,
    };
  });

  const resetVehicles = state.vehicles.map((v) => ({
    ...v,
    usedCapacityToday: 0,
  }));

  const nourhan = state.clients.find((c) => c.id === 'CLI-NOURHAN')!;
  const kareem = state.clients.find((c) => c.id === 'CLI-KAREEM')!;

  const newShipments: Shipment[] = [];
  const newSituations: StorySituation[] = [];
  const timeLabel = formatClockTime(morningClockMinutes);

  if (nextDay === 2) {
    if (nourhan.merchantCodBalancePiastres > 0) {
      newSituations.push({
        id: 'SIT-D2-1-SETTLE-NOURHAN-COD',
        day: 2,
        orderIndex: 1,
        title: 'توريد أمانة تحصيل شحنة الأستاذة نورهان (COD)',
        speakerName: 'الأستاذة نورهان',
        speakerRole: 'صاحبة براند إكسسوارات بمدينة نصر',
        speakerAvatarId: 'nourhan',
        dialogueText: `صباح الخير! شكراً إنكم وصلتوا طرد الدقي امبارح. المندوب بتاعكم حصّل ${formatEGP(nourhan.merchantCodBalancePiastres)} ثمن البضاعة من العميلة. ياريت نورد المبلغ النهاردة عشان أقدر أجهز لكم شحنات الأسبوع الجديد.`,
        documentBadge: `توريد أمانات تجار: ${formatEGP(nourhan.merchantCodBalancePiastres)}`,
        mandatory: true,
        resolved: false,
        options: [
          {
            id: 'OPT-D2-1-SETTLE-COD-NOW',
            label: `توريد كامل أمانة التحصيل (${formatEGP(nourhan.merchantCodBalancePiastres)}) فوراً`,
            subtitle: 'سداد أمانة التاجر من الخزينة ورفع ثقة نورهان بـ +8 نقاط',
            conditionsDescription: `يتطلب توفر سيولة ${formatEGP(nourhan.merchantCodBalancePiastres)} بالخزينة`,
            expectedFinancialImpactLabel: `خروج نقدي -${formatEGP(nourhan.merchantCodBalancePiastres)} | إقفال التزام أمانات التجار`,
            requiredCashPiastres: nourhan.merchantCodBalancePiastres,
            targetClientId: 'CLI-NOURHAN',
            effectType: 'SETTLE_MERCHANT_COD',
          },
        ],
      });
    } else {
      newSituations.push({
        id: 'SIT-D2-1-MORNING-FOLLOWUP',
        day: 2,
        orderIndex: 1,
        title: 'متابعة نتائج تشغيل اليوم الأول',
        speakerName: 'الأستاذ محمود',
        speakerRole: 'المحاسب الإداري ومسؤول التشغيل',
        speakerAvatarId: 'mahmoud',
        dialogueText:
          'صباح الخير يا فندم في اليوم التاني. راجعت دفاتر امبارح والرصيد مطابق تماماً. النهاردة عندنا متابعة لصيانة الموتوسيكلات وعرض تعاقد جديد من عملائنا حسب نتيجة شغل امبارح.',
        documentBadge: 'متابعة اليوم الثاني',
        mandatory: true,
        resolved: false,
        options: [
          {
            id: 'OPT-D2-1-ACK-MORNING',
            label: 'اعتماد خطة عمل اليوم الثاني والبدء بالتشغيل',
            subtitle: 'فتح ملفات اليوم الثاني ومراجعة حالة الأسطول',
            conditionsDescription: 'متاح فوراً',
            expectedFinancialImpactLabel: 'لا يوجد أثر مالي فوري',
            effectType: 'ACKNOWLEDGE_BRIEFING',
          },
        ],
      });
    }

    if (kareem.receivableBalancePiastres > 0) {
      newSituations.push({
        id: 'SIT-D2-2-COLLECT-KAREEM-REC',
        day: 2,
        orderIndex: 2,
        title: 'تحصيل فاتورة الشحن الآجل من المهندس كريم',
        speakerName: 'المهندس كريم',
        speakerRole: 'تاجر إلكترونيات بوسط البلد',
        speakerAvatarId: 'kareem',
        dialogueText: `صباح النور يا باشا. الشحنة وصلت مصر الجديدة في ميعادها امبارح، وزي ما وعدتك، اتفضل شيك نقدي بـ ${formatEGP(kareem.receivableBalancePiastres)} قيمة فاتورة الشحن الآجلة عشان نقفل الحساب.`,
        documentBadge: `سداد مستحقات عملاء: ${formatEGP(kareem.receivableBalancePiastres)}`,
        mandatory: true,
        resolved: false,
        options: [
          {
            id: 'OPT-D2-2-COLLECT-REC',
            label: `استلام النقدية (${formatEGP(kareem.receivableBalancePiastres)}) وإقفال حساب المستحقات`,
            subtitle: 'تحويل المستحقات الآجلة إلى سيولة نقدية فعلية بالخزينة',
            conditionsDescription: 'متاح — تحصيل مستحقات مكتسبة مسبقاً',
            expectedFinancialImpactLabel: `مقبوضات نقدية +${formatEGP(kareem.receivableBalancePiastres)} | المستحقات -${formatEGP(kareem.receivableBalancePiastres)}`,
            targetClientId: 'CLI-KAREEM',
            customAmountPiastres: kareem.receivableBalancePiastres,
            effectType: 'COLLECT_CLIENT_RECEIVABLE',
          },
        ],
      });
    }

    newSituations.push({
      id: 'SIT-D2-3-MOTO-MAINTENANCE',
      day: 2,
      orderIndex: 3,
      title: 'مشكلة تشغيلية: صوت في دبرياج الموتوسيكل الأول',
      speakerName: 'عم صابر',
      speakerRole: 'كبير مناديب التوصيل',
      speakerAvatarId: 'am_saber',
      dialogueText:
        'يا ريس، الموتوسيكل الأول (أ ف ج 412) سحبه تقيل الصبح في مطلع كوبري أكتوبر. الميكانيكي قال محتاج طقم ورق دبرياج وتغيير زيت بـ 160 جنيه عشان يشتغل بكفاءة 95%، أو نعمله شد سلك سريع بـ 50 جنيه ويمشي الحال النهاردة بس مخاطرة.',
      documentBadge: 'تقرير فني: VEH-MOTO-1',
      mandatory: true,
      resolved: false,
      options: [
        {
          id: 'OPT-D2-3-FULL-MAINT',
          label: 'إجراء صيانة كاملة وتغيير طقم الدبرياج (160.00 ج.م)',
          subtitle: 'يرفع كفاءة المركبة إلى 95% ويضمن سلامة توصيل شحنات اليوم من أول محاولة',
          conditionsDescription: 'يتطلب سيولة نقدية 160.00 ج.م',
          expectedFinancialImpactLabel: 'مصروف صيانة نقدي -160.00 ج.م | كفاءة المركبة 95%',
          requiredCashPiastres: egpToPiastres(160),
          targetVehicleId: 'VEH-MOTO-1',
          effectType: 'VEHICLE_FULL_MAINTENANCE',
        },
        {
          id: 'OPT-D2-3-QUICK-FIX',
          label: 'إصلاح مؤقت سريع وشد السلك فقط (50.00 ج.م)',
          subtitle: 'يوفر 110.00 ج.م من السيولة لكن يعرض شحنات الموتوسيكل الأول لخطر التأخير',
          conditionsDescription: 'يتطلب سيولة نقدية 50.00 ج.م',
          expectedFinancialImpactLabel: 'مصروف صيانة نقدي -50.00 ج.م | انخفاض كفاءة المركبة',
          requiredCashPiastres: egpToPiastres(50),
          targetVehicleId: 'VEH-MOTO-1',
          effectType: 'VEHICLE_QUICK_FIX',
        },
      ],
    });

    const saeedAcceptedYesterday = state.shipments.some(
      (s) => s.trackingNumber === 'TRK-1002' && s.status === 'DELIVERED'
    );

    const trk2001Fee = saeedAcceptedYesterday
      ? egpToPiastres(260)
      : egpToPiastres(170);
    const trk2001Cost = egpToPiastres(70);

    const trk2001Base = {
      trackingNumber: 'TRK-2001',
      clientId: 'CLI-SAEED',
      clientName: 'الحاج سعيد للملابس الجاهزة',
      pickupZone: 'العتبة',
      deliveryZone: 'المهندسين',
      description: saeedAcceptedYesterday
        ? 'دفعة طلبيات ممتازة (3 طرود ملابس) لمحلات المهندسين بفضل التزامكم أمس'
        : 'طرد ملابس تجريبي صغير للمهندسين (العميل متحفظ بسبب رفض طلبه السابق)',
      priority: 'NORMAL' as const,
      weightKg: 16,
      volumeM3: 0.55,
      packageSizeAr: '3 طرود ملابس',
      serviceFeePiastres: trk2001Fee,
      estimatedOperatingCostPiastres: trk2001Cost,
      actualOperatingCostPiastres: 0,
      codAmountPiastres: egpToPiastres(450),
      paymentTerms: 'COD_MERCHANT' as const,
      accountantProcessed: true,
      acceptanceDeadlineTotalMinutes: nextTotalElapsed + 210,
      acceptanceDeadlineTimeLabel: '12:30',
    };

    newShipments.push({
      ...trk2001Base,
      accountantEstimate: computeShipmentEstimateBreakdown(
        trk2001Base,
        'EMP-MAHMOUD',
        'محمود عبد العزيز',
        timeLabel
      ),
      status: 'NEW_REQUEST',
      operationalLocation: 'CLIENT_PREMISES',
      responsibleDepartment: 'MANAGEMENT',
      warehouseId: 'WH-CAIRO-MAIN',
      revenueEarnedPiastres: 0,
      cashCollectedForFeePiastres: 0,
      receivableOutstandingPiastres: 0,
      codCollectedInCashPiastres: 0,
      codSettledToMerchantPiastres: 0,
      createdAtDay: 2,
      lastStatusChangeTotalMinutes: nextTotalElapsed,
      lastUpdatedTimeLabel: timeLabel,
      expectedDeliveryTotalMinutes: nextTotalElapsed + 180,
      expectedDeliveryTimeLabel: '12:00',
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      processedEventKeys: [],
      custodyChain: [],
      timeline: [
        {
          id: 'EVT-2-1',
          day: 2,
          timestampLabel: `${timeLabel} — طلب شحن جديد`,
          totalMinutes: nextTotalElapsed,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MANAGEMENT',
          note: 'طلب شحن جديد في اليوم الثاني مع تحصيل COD لصالح التاجر.',
        },
      ],
    });

    const trk2002Base = {
      trackingNumber: 'TRK-2002',
      clientId: 'CLI-NOURHAN',
      clientName: 'نورهان جاليري للإكسسوارات',
      pickupZone: 'مدينة نصر',
      deliveryZone: 'الزمالك',
      description: 'طلبية هدايا سريعة لعميلة في الزمالك (دفع نقدي مباشر للخدمة)',
      priority: 'NORMAL' as const,
      weightKg: 4.5,
      volumeM3: 0.16,
      packageSizeAr: 'طرد هدايا صغير',
      serviceFeePiastres: egpToPiastres(160),
      estimatedOperatingCostPiastres: egpToPiastres(50),
      actualOperatingCostPiastres: 0,
      codAmountPiastres: 0,
      paymentTerms: 'PREPAID_CASH' as const,
      accountantProcessed: true,
      acceptanceDeadlineTotalMinutes: nextTotalElapsed + 210,
      acceptanceDeadlineTimeLabel: '12:30',
    };

    newShipments.push({
      ...trk2002Base,
      accountantEstimate: computeShipmentEstimateBreakdown(
        trk2002Base,
        'EMP-MAHMOUD',
        'محمود عبد العزيز',
        timeLabel
      ),
      status: 'NEW_REQUEST',
      operationalLocation: 'CLIENT_PREMISES',
      responsibleDepartment: 'MANAGEMENT',
      warehouseId: 'WH-CAIRO-MAIN',
      revenueEarnedPiastres: 0,
      cashCollectedForFeePiastres: 0,
      receivableOutstandingPiastres: 0,
      codCollectedInCashPiastres: 0,
      codSettledToMerchantPiastres: 0,
      createdAtDay: 2,
      lastStatusChangeTotalMinutes: nextTotalElapsed,
      lastUpdatedTimeLabel: timeLabel,
      expectedDeliveryTotalMinutes: nextTotalElapsed + 180,
      expectedDeliveryTimeLabel: '12:00',
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      processedEventKeys: [],
      custodyChain: [],
      timeline: [
        {
          id: 'EVT-2-1',
          day: 2,
          timestampLabel: `${timeLabel} — طلب شحن جديد`,
          totalMinutes: nextTotalElapsed,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MANAGEMENT',
          note: 'طلب شحن جديد نقدي من نورهان جاليري.',
        },
      ],
    });

    newSituations.push({
      id: 'SIT-D2-4-SAEED-CONTRACT',
      day: 2,
      orderIndex: 4,
      title: saeedAcceptedYesterday
        ? 'فرصة تعاقد موسعة مع الحاج سعيد (نتيجة التزام اليوم الأول)'
        : 'محاولة استعادة ثقة الحاج سعيد بطلب صغير',
      speakerName: 'الحاج سعيد',
      speakerRole: 'صاحب ورشة ملابس بالعتبة',
      speakerAvatarId: 'hag_saeed',
      dialogueText: saeedAcceptedYesterday
        ? 'الله ينور عليكم يا رجالة! المحل في المعادي شكر في التزامكم بالميعاد امبارح. عشان كده جبتلكم النهاردة طلبية أكبر للمهندسين بأجر شحن 260 جنيه وتحصيل بضاعة 450 جنيه.'
        : 'أنتوا زعلتوني امبارح لما رفضتوا شحنة المعادي. هديكم فرصة تانية النهاردة في طرد صغير للمهندسين بأجر شحن 170 جنيه، وروني التزامكم.',
      documentBadge: 'بوليصة: TRK-2001 | تحصيل COD',
      relatedShipmentTracking: 'TRK-2001',
      mandatory: true,
      resolved: false,
      options: [
        {
          id: 'OPT-D2-4-ACCEPT-SAEED',
          label: `قبول شحنة المهندسين (${formatEGP(trk2001Fee)} رسوم شحن)`,
          subtitle: 'إحالة الشحنة للمستودع والتوزيع آلياً وتحصيل 450 ج.م أمانة للتاجر',
          conditionsDescription: `يتطلب سعة بالمستودع + سيولة ${formatEGP(trk2001Cost)} للتشغيل`,
          expectedFinancialImpactLabel: `إيراد الخدمة عند التسليم: ${formatEGP(trk2001Fee)} | التكلفة: ${formatEGP(trk2001Cost)}`,
          requiresOperationalCapacity: true,
          targetShipmentId: 'TRK-2001',
          effectType: 'ACCEPT_SHIPMENT',
        },
        {
          id: 'OPT-D2-4-REJECT-SAEED',
          label: 'الاعتذار عن شحنة المهندسين',
          subtitle: 'عدم تحمل تكلفة التشغيل مقابل تراجع ثقة الحاج سعيد',
          conditionsDescription: 'لا يسجل إيراداً أو مصروفات',
          expectedFinancialImpactLabel: 'إيراد: 0.00 ج.م | تكلفة: 0.00 ج.م',
          targetShipmentId: 'TRK-2001',
          effectType: 'REJECT_SHIPMENT',
        },
      ],
    });

    newSituations.push({
      id: 'SIT-D2-5-NOURHAN-ORDER',
      day: 2,
      orderIndex: 5,
      title: 'طلب شحن الزمالك من الأستاذة نورهان',
      speakerName: 'الأستاذة نورهان',
      speakerRole: 'صاحبة براند إكسسوارات بمدينة نصر',
      speakerAvatarId: 'nourhan',
      dialogueText:
        'عندي أوردر هدايا رايح الزمالك النهاردة، العميلة دافعة ثمن الأوردر أونلاين خلاص، فالمندوب هيحصل بس رسوم الشحن 160 جنيه كاش وتكلفة المشوار عليكم 50 جنيه.',
      documentBadge: 'بوليصة: TRK-2002 | نقدي',
      relatedShipmentTracking: 'TRK-2002',
      mandatory: true,
      resolved: false,
      options: [
        {
          id: 'OPT-D2-5-ACCEPT-NOURHAN',
          label: 'قبول شحنة الزمالك بالسعر المعروض (160.00 ج.م)',
          subtitle: 'إحالة الشحنة للمستودع والتوزيع آلياً',
          conditionsDescription: 'يتطلب سعة بالمستودع + سيولة 50.00 ج.م للتشغيل',
          expectedFinancialImpactLabel: 'إيراد الخدمة: 160.00 ج.م | تكلفة التشغيل: 50.00 ج.م',
          requiresOperationalCapacity: true,
          targetShipmentId: 'TRK-2002',
          effectType: 'ACCEPT_SHIPMENT',
        },
        {
          id: 'OPT-D2-5-REJECT-NOURHAN',
          label: 'رفض شحنة الزمالك',
          subtitle: 'الاعتذار عن الطلب وعدم تسجيل إيراد أو مصروف',
          conditionsDescription: 'متاح دائماً',
          expectedFinancialImpactLabel: 'إيراد: 0.00 ج.م | تكلفة: 0.00 ج.م',
          targetShipmentId: 'TRK-2002',
          effectType: 'REJECT_SHIPMENT',
        },
      ],
    });
  } else {
    const trkA = `TRK-${nextDay}01`;
    const trkB = `TRK-${nextDay}02`;
    const feeA = egpToPiastres(175 + (nextDay % 3) * 20);
    const costA = egpToPiastres(55);
    const feeB = egpToPiastres(210);
    const costB = egpToPiastres(65);

    const trkABase = {
      trackingNumber: trkA,
      clientId: 'CLI-SAEED',
      clientName: 'الحاج سعيد للملابس الجاهزة',
      pickupZone: 'العتبة',
      deliveryZone: 'شبرا مصر',
      description: `دفعة توزيع ملابس يومية رقم ${nextDay} لمحلات شبرا`,
      priority: 'NORMAL' as const,
      weightKg: 11,
      volumeM3: 0.35,
      packageSizeAr: 'كرتونة ملابس',
      serviceFeePiastres: feeA,
      estimatedOperatingCostPiastres: costA,
      actualOperatingCostPiastres: 0,
      codAmountPiastres: 0,
      paymentTerms: 'PREPAID_CASH' as const,
      accountantProcessed: true,
      acceptanceDeadlineTotalMinutes: nextTotalElapsed + 210,
      acceptanceDeadlineTimeLabel: '12:30',
    };

    const trkBBase = {
      trackingNumber: trkB,
      clientId: 'CLI-KAREEM',
      clientName: 'المهندس كريم للإلكترونيات',
      pickupZone: 'وسط البلد',
      deliveryZone: 'مدينة نصر',
      description: `شحنة أجهزة شبكات وراوترات — اليوم ${nextDay}`,
      priority: 'NORMAL' as const,
      weightKg: 7.5,
      volumeM3: 0.25,
      packageSizeAr: 'صندوق أجهزة محمي',
      serviceFeePiastres: feeB,
      estimatedOperatingCostPiastres: costB,
      actualOperatingCostPiastres: 0,
      codAmountPiastres: egpToPiastres(500),
      paymentTerms: 'COD_MERCHANT' as const,
      accountantProcessed: true,
      acceptanceDeadlineTotalMinutes: nextTotalElapsed + 210,
      acceptanceDeadlineTimeLabel: '12:30',
    };

    newShipments.push(
      {
        ...trkABase,
        accountantEstimate: computeShipmentEstimateBreakdown(
          trkABase,
          'EMP-MAHMOUD',
          'محمود عبد العزيز',
          timeLabel
        ),
        status: 'NEW_REQUEST',
        operationalLocation: 'CLIENT_PREMISES',
        responsibleDepartment: 'MANAGEMENT',
        warehouseId: 'WH-CAIRO-MAIN',
        revenueEarnedPiastres: 0,
        cashCollectedForFeePiastres: 0,
        receivableOutstandingPiastres: 0,
        codCollectedInCashPiastres: 0,
        codSettledToMerchantPiastres: 0,
        createdAtDay: nextDay,
        lastStatusChangeTotalMinutes: nextTotalElapsed,
        lastUpdatedTimeLabel: timeLabel,
        expectedDeliveryTotalMinutes: nextTotalElapsed + 180,
        expectedDeliveryTimeLabel: '12:00',
        isDelayed: false,
        requiresManagerIntervention: false,
        attemptCount: 0,
        processedEventKeys: [],
        custodyChain: [],
        timeline: [
          {
            id: `EVT-${nextDay}-1`,
            day: nextDay,
            timestampLabel: `${timeLabel} — طلب شحن جديد`,
            totalMinutes: nextTotalElapsed,
            status: 'NEW_REQUEST',
            location: 'CLIENT_PREMISES',
            department: 'MANAGEMENT',
            note: 'طلب شحن نقدي جديد.',
          },
        ],
      },
      {
        ...trkBBase,
        accountantEstimate: computeShipmentEstimateBreakdown(
          trkBBase,
          'EMP-MAHMOUD',
          'محمود عبد العزيز',
          timeLabel
        ),
        status: 'NEW_REQUEST',
        operationalLocation: 'CLIENT_PREMISES',
        responsibleDepartment: 'MANAGEMENT',
        warehouseId: 'WH-CAIRO-MAIN',
        revenueEarnedPiastres: 0,
        cashCollectedForFeePiastres: 0,
        receivableOutstandingPiastres: 0,
        codCollectedInCashPiastres: 0,
        codSettledToMerchantPiastres: 0,
        createdAtDay: nextDay,
        lastStatusChangeTotalMinutes: nextTotalElapsed,
        lastUpdatedTimeLabel: timeLabel,
        expectedDeliveryTotalMinutes: nextTotalElapsed + 180,
        expectedDeliveryTimeLabel: '12:00',
        isDelayed: false,
        requiresManagerIntervention: false,
        attemptCount: 0,
        processedEventKeys: [],
        custodyChain: [],
        timeline: [
          {
            id: `EVT-${nextDay}-1`,
            day: nextDay,
            timestampLabel: `${timeLabel} — طلب شحن جديد`,
            totalMinutes: nextTotalElapsed,
            status: 'NEW_REQUEST',
            location: 'CLIENT_PREMISES',
            department: 'MANAGEMENT',
            note: 'طلب شحن مع تحصيل COD لصالح التاجر.',
          },
        ],
      }
    );

    newSituations.push(
      {
        id: `SIT-D${nextDay}-1-ORDER-A`,
        day: nextDay,
        orderIndex: 1,
        title: `طلبية توزيع اليوم ${nextDay} — الحاج سعيد`,
        speakerName: 'الحاج سعيد',
        speakerRole: 'صاحب ورشة ملابس بالعتبة',
        speakerAvatarId: 'hag_saeed',
        dialogueText: `صباح الفل يا ريس. عندنا النهاردة شحنة لشبرا مصر بأجر شحن ${formatEGP(feeA)} نقدي وتكلفة المشوار ${formatEGP(costA)}. نعتمد البوليصة؟`,
        documentBadge: `بوليصة: ${trkA}`,
        relatedShipmentTracking: trkA,
        mandatory: true,
        resolved: false,
        options: [
          {
            id: `OPT-D${nextDay}-1-ACCEPT`,
            label: `قبول الشحنة (${formatEGP(feeA)})`,
            subtitle: 'إحالة الشحنة للمستودع والتوزيع آلياً',
            conditionsDescription: `يتطلب سعة بالمستودع + سيولة ${formatEGP(costA)}`,
            expectedFinancialImpactLabel: `إيراد: ${formatEGP(feeA)} | تكلفة: ${formatEGP(costA)}`,
            requiresOperationalCapacity: true,
            targetShipmentId: trkA,
            effectType: 'ACCEPT_SHIPMENT',
          },
          {
            id: `OPT-D${nextDay}-1-REJECT`,
            label: 'الاعتذار عن الشحنة',
            subtitle: 'عدم قبول الشحنة اليوم',
            conditionsDescription: 'متاح دائماً',
            expectedFinancialImpactLabel: 'إيراد: 0.00 ج.م | تكلفة: 0.00 ج.م',
            targetShipmentId: trkA,
            effectType: 'REJECT_SHIPMENT',
          },
        ],
      },
      {
        id: `SIT-D${nextDay}-2-ORDER-B`,
        day: nextDay,
        orderIndex: 2,
        title: `شحنة إلكترونيات COD — اليوم ${nextDay}`,
        speakerName: 'المهندس كريم',
        speakerRole: 'تاجر إلكترونيات بوسط البلد',
        speakerAvatarId: 'kareem',
        dialogueText: `عندنا طرد راوترات لمدينة نصر، أجر الشحن ${formatEGP(feeB)} وتحصيل بضاعة COD بـ 500 جنيه.`,
        documentBadge: `بوليصة: ${trkB}`,
        relatedShipmentTracking: trkB,
        mandatory: true,
        resolved: false,
        options: [
          {
            id: `OPT-D${nextDay}-2-ACCEPT`,
            label: `قبول الشحنة (${formatEGP(feeB)} + تحصيل 500 ج.م للتاجر)`,
            subtitle: 'إحالة للمستودع والتوزيع آلياً وتحصيل أمانة التاجر',
            conditionsDescription: `يتطلب سعة بالمستودع + سيولة ${formatEGP(costB)}`,
            expectedFinancialImpactLabel: `إيراد: ${formatEGP(feeB)} | تكلفة: ${formatEGP(costB)}`,
            requiresOperationalCapacity: true,
            targetShipmentId: trkB,
            effectType: 'ACCEPT_SHIPMENT',
          },
          {
            id: `OPT-D${nextDay}-2-REJECT`,
            label: 'الاعتذار عن الشحنة',
            subtitle: 'رفض الطلب',
            conditionsDescription: 'متاح دائماً',
            expectedFinancialImpactLabel: 'إيراد: 0.00 ج.م | تكلفة: 0.00 ج.م',
            targetShipmentId: trkB,
            effectType: 'REJECT_SHIPMENT',
          },
        ],
      }
    );
  }

  // Save a checkpoint of the completed day before advancing (keep up to 15 days, without nested checkpoints)
  const snapshotCopy: GameState = JSON.parse(
    JSON.stringify({
      ...state,
      phase: 'OFFICE_PLAY',
      insolvencyCrisis: undefined,
      dayCheckpoints: [],
    })
  );
  const existingCheckpoints = (state.dayCheckpoints || []).filter(
    (cp) => cp.day !== state.company.currentDay
  );
  const nextCheckpoints = [
    ...existingCheckpoints,
    {
      day: state.company.currentDay,
      savedAtIso: new Date().toISOString(),
      cashPiastres: state.company.cashPiastres,
      reputation: state.company.reputation,
      serializedState: JSON.stringify(snapshotCopy),
      stateSnapshot: snapshotCopy,
    },
  ].slice(-15);

  const prevFleet = state.fleetAndEquipment || {
    fuelLevelPercent: 85,
    sortingMachineHealth: 88,
    adminSystemHealth: 94,
    lastRefueledDay: 1,
    lastMachineMaintainedDay: 1,
    activeBreakdowns: [],
  };
  const nextSortingHealth = Math.max(10, prevFleet.sortingMachineHealth - 4);
  const nextAdminHealth = Math.max(20, prevFleet.adminSystemHealth - 2);

  let transitionedState: GameState = {
    ...state,
    phase: 'OFFICE_PLAY',
    clock: {
      day: nextDay,
      minutesFromMidnight: morningClockMinutes,
      totalElapsedMinutes: nextTotalElapsed,
      isPaused: false,
      speedMultiplier: state.clock.speedMultiplier,
    },
    company: {
      ...state.company,
      currentDay: nextDay,
    },
    fleetAndEquipment: {
      ...prevFleet,
      sortingMachineHealth: nextSortingHealth,
      adminSystemHealth: nextAdminHealth,
    },
    dayCheckpoints: nextCheckpoints,
    employees: resetEmployees,
    couriers: resetCouriers,
    vehicles: resetVehicles,
    shipments: [...state.shipments, ...newShipments],
    situations: [...state.situations, ...newSituations],
  };

  transitionedState = ensureBusinessDeveloperState(transitionedState);
  transitionedState = processDailyAutoRepeatCampaigns(transitionedState, nextDay);
  if (nextDay >= 3) {
    transitionedState = generateAllDailyPlatformOrders(transitionedState, nextDay);
  }

  return transitionedState;
}

/**
 * Rolls back the player's company state to up to 10 days earlier (or the earliest saved checkpoint
 * if fewer than 10 days have elapsed, or Day 1 if no prior checkpoint exists) to recover from
 * an operational / cash insolvency crisis without creating negative balances or debt.
 */
export function rollbackToPreviousDaysCheckpoint(
  state: GameState,
  daysBack = 10
): GameState {
  const currentDay = state.company.currentDay;
  const targetDay = Math.max(1, currentDay - daysBack);
  const checkpoints = [...(state.dayCheckpoints || [])].sort(
    (a, b) => a.day - b.day
  );

  const matchingCheckpoint =
    checkpoints.find((cp) => cp.day === targetDay) ||
    checkpoints.filter((cp) => cp.day <= targetDay).pop() ||
    checkpoints[0];

  if (!matchingCheckpoint || currentDay <= 1) {
    return resetToDayOneKeepCompany(state);
  }

  const restored: GameState = matchingCheckpoint.stateSnapshot
    ? JSON.parse(JSON.stringify(matchingCheckpoint.stateSnapshot))
    : matchingCheckpoint.serializedState
      ? JSON.parse(matchingCheckpoint.serializedState)
      : resetToDayOneKeepCompany(state);
  const remainingCheckpoints = checkpoints.filter(
    (cp) => cp.day < restored.company.currentDay
  );

  let nextRestored: GameState = {
    ...restored,
    phase: 'OFFICE_PLAY',
    clock: {
      ...restored.clock,
      minutesFromMidnight: 540,
      isPaused: false,
    },
    company: {
      ...restored.company,
      name: state.company.name,
      liabilitiesPiastres: 0,
    },
    fleetAndEquipment: {
      fuelLevelPercent: Math.max(
        65,
        restored.fleetAndEquipment?.fuelLevelPercent ?? 80
      ),
      sortingMachineHealth: Math.max(
        70,
        restored.fleetAndEquipment?.sortingMachineHealth ?? 85
      ),
      adminSystemHealth: Math.max(
        80,
        restored.fleetAndEquipment?.adminSystemHealth ?? 90
      ),
      lastRefueledDay: restored.company.currentDay,
      lastMachineMaintainedDay: restored.company.currentDay,
      activeBreakdowns: [],
    },
    insolvencyCrisis: undefined,
    dayCheckpoints: remainingCheckpoints,
    lastSavedTimestamp: new Date().toISOString(),
  };

  if (nextRestored.company.cashPiastres < egpToPiastres(500)) {
    const topUp = egpToPiastres(500) - nextRestored.company.cashPiastres;
    nextRestored = recordLedgerTransaction(nextRestored, {
      type: 'CASH_COLLECTION',
      amountPiastres: topUp,
      debitAccount: 'CASH',
      creditAccount: 'OPENING_EQUITY',
      referenceId: `ROLLBACK-RECOVERY-D${nextRestored.company.currentDay}`,
      description: `دعم سيولة استعادة التشغيل بعد العودة بالزمن لليوم ${nextRestored.company.currentDay}`,
    });
  }

  return nextRestored;
}

/**
 * Resets the game back to Day 1 while preserving the player's registered company name.
 */
export function resetToDayOneKeepCompany(state: GameState): GameState {
  const fresh = createInitialGameState();
  return {
    ...fresh,
    phase: 'OFFICE_PLAY',
    company: {
      ...fresh.company,
      name: state.company.name || fresh.company.name,
      liabilitiesPiastres: egpToPiastres(5000),
    },
    insolvencyCrisis: undefined,
    dayCheckpoints: [],
  };
}

/**
 * Pays a company debt obligation (full or partial) from available cash,
 * recording a double-entry LIABILITY_PAYMENT transaction in the general ledger.
 */
export function payCompanyDebtObligation(
  state: GameState,
  debtId: string,
  customAmountPiastres?: number
): GameState {
  const debts = state.debts || createInitialCompanyDebts();
  const target = debts.find((d) => d.id === debtId);
  if (!target) {
    throw new Error('بند الالتزام المطلوب غير موجود.');
  }
  if (target.status === 'PAID' || target.remainingAmountPiastres <= 0) {
    throw new Error('تم سداد هذا الالتزام بالكامل بالفعل.');
  }

  const amountToPay =
    customAmountPiastres !== undefined
      ? Math.max(
          egpToPiastres(100),
          Math.min(target.remainingAmountPiastres, Math.round(customAmountPiastres))
        )
      : target.remainingAmountPiastres;

  if (state.company.cashPiastres < amountToPay) {
    throw new Error(
      `السيولة النقدية المتاحة (${formatEGP(state.company.cashPiastres)}) غير كافية لسداد ${formatEGP(amountToPay)} من (${target.titleAr}).`
    );
  }

  const txRef = `DEBT-PAY-${debtId}-D${state.company.currentDay}-${state.ledger.length + 1}`;
  let nextState = recordLedgerTransaction(state, {
    type: 'LIABILITY_PAYMENT',
    amountPiastres: amountToPay,
    debitAccount: 'LIABILITIES_PAYABLE',
    creditAccount: 'CASH',
    referenceId: txRef,
    description: `سداد التزام مستحق: ${target.titleAr} — لصالح (${target.creditorNameAr})`,
  });

  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const newPaid = target.paidAmountPiastres + amountToPay;
  const newRemaining = Math.max(0, target.remainingAmountPiastres - amountToPay);
  const newStatus = newRemaining === 0 ? ('PAID' as const) : ('PARTIAL' as const);

  const updatedDebts = debts.map((d) =>
    d.id === debtId
      ? {
          ...d,
          paidAmountPiastres: newPaid,
          remainingAmountPiastres: newRemaining,
          status: newStatus,
          paidAtDay: newRemaining === 0 ? nextState.company.currentDay : d.paidAtDay,
          paidAtTimeLabel: newRemaining === 0 ? timeLabel : d.paidAtTimeLabel,
        }
      : d
  );

  const paidCount = updatedDebts.filter((d) => d.status === 'PAID').length;
  const currentMastery = nextState.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          paidTopThreeDebts:
            currentMastery.appliedSystems.paidTopThreeDebts || paidCount >= 3,
        },
      }
    : undefined;

  nextState = {
    ...nextState,
    debts: updatedDebts,
    onboardingMastery: updatedMastery,
    company: {
      ...nextState.company,
      reputation:
        newRemaining === 0
          ? Math.min(100, nextState.company.reputation + 1)
          : nextState.company.reputation,
    },
    executedDecisionIds: [...nextState.executedDecisionIds, txRef],
  };

  nextState = evaluateOnboardingMasteryProgress(nextState);

  nextState = pushNotification(nextState, {
    dedupeKey: txRef,
    title:
      newRemaining === 0
        ? `تم سداد الالتزام بالكامل: ${target.titleAr}`
        : `سداد جزئي للالتزام: ${target.titleAr}`,
    message:
      newRemaining === 0
        ? `تم سداد ${formatEGP(amountToPay)} لصالح (${target.creditorNameAr}). المتبقي من إجمالي الديون: ${formatEGP(nextState.company.liabilitiesPiastres)}.`
        : `تم سداد ${formatEGP(amountToPay)} وتبقى ${formatEGP(newRemaining)} على هذا البند.`,
    department: 'ACCOUNTING',
    outcomeLabel:
      paidCount >= 3
        ? `سددت ${paidCount}/4 ديون — جاهز للحملة التدريبية!`
        : `متبقي ${formatEGP(nextState.company.liabilitiesPiastres)} ديون`,
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Updates the Company Profile (name, slogan, bio, avatar, specialties, covered zones)
 * and awards a commercial trust bonus on the first meaningful profile update.
 */
export function updateCompanyProfileState(
  state: GameState,
  patch: {
    companyName?: string;
    commercialSloganAr?: string;
    bioAr?: string;
    avatarIconId?: NonNullable<GameState['companyProfile']>['avatarIconId'];
    customAvatarDataUrl?: string;
    serviceSpecialtiesAr?: string[];
    coveredZonesAr?: string[];
  }
): GameState {
  const prevProfile = state.companyProfile || {
    bioAr:
      'شركة شحن وخدمات لوجستية متخصصة في التوصيل السريع وإدارة تحصيل أمانات التجار (COD).',
    commercialSloganAr: 'أمانة طردك.. التزام في الميعاد وحساب بالمليم',
    avatarIconId: 'TRUCK_SHIELD' as const,
    serviceSpecialtiesAr: ['توصيل التجارة الإلكترونية', 'تحصيل أمانات التجار COD'],
    coveredZonesAr: ['مدينة نصر', 'العتبة', 'المعادي', 'الدقي'],
    lastUpdatedDay: 1,
    trustBonusEarned: 0,
  };

  const isFirstBonus = prevProfile.trustBonusEarned === 0;
  const nextTrustBonus = isFirstBonus ? 5 : prevProfile.trustBonusEarned;

  const updatedClients = isFirstBonus
    ? state.clients.map((c) => ({
        ...c,
        trustLevel: Math.min(100, c.trustLevel + 3),
      }))
    : state.clients;

  const currentMastery = state.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          updatedCompanyProfile: true,
        },
      }
    : undefined;

  let nextState: GameState = {
    ...state,
    company: {
      ...state.company,
      name: patch.companyName?.trim() || state.company.name,
      reputation: isFirstBonus
        ? Math.min(100, state.company.reputation + 2)
        : state.company.reputation,
    },
    clients: updatedClients,
    companyProfile: {
      ...prevProfile,
      commercialSloganAr:
        patch.commercialSloganAr !== undefined
          ? patch.commercialSloganAr
          : prevProfile.commercialSloganAr,
      bioAr: patch.bioAr !== undefined ? patch.bioAr : prevProfile.bioAr,
      avatarIconId: patch.avatarIconId ?? prevProfile.avatarIconId,
      customAvatarDataUrl:
        patch.customAvatarDataUrl !== undefined
          ? patch.customAvatarDataUrl
          : prevProfile.customAvatarDataUrl,
      serviceSpecialtiesAr:
        patch.serviceSpecialtiesAr ?? prevProfile.serviceSpecialtiesAr,
      coveredZonesAr: patch.coveredZonesAr ?? prevProfile.coveredZonesAr,
      lastUpdatedDay: state.company.currentDay,
      trustBonusEarned: nextTrustBonus,
    },
    onboardingMastery: updatedMastery,
  };

  nextState = evaluateOnboardingMasteryProgress(nextState);

  nextState = pushNotification(nextState, {
    dedupeKey: `PROFILE-UPDATE-D${state.company.currentDay}-${Date.now()}`,
    title: 'تم تحديث الملف التجاري للشركة بنجاح',
    message: isFirstBonus
      ? 'تم توثيق بيانات الشركة ووصفها التجاري! ارتفعت ثقة العملاء (+3 نقاط) والسمعة التجارية (+2).'
      : 'تم حفظ التعديلات الجديدة على الملف التجاري وهوية الشركة.',
    department: 'MANAGEMENT',
    outcomeLabel: 'هوية تجارية موثقة',
    severity: 'SUCCESS',
  });

  return nextState;
}


