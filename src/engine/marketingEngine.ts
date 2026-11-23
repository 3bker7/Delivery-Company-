import {
  Client,
  GameState,
  MarketingCampaign,
  MarketingDeadlineTask,
  MarketingPackageTier,
  MarketingState,
  Shipment,
} from '../types/game';
import { processShipmentWithAccountant } from './accountingEngine';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushNotification } from './notificationEngine';
import { getWarehouseUtilizationMetrics } from './shipmentEngine';

/**
 * Section 2: Marketing Package Tiers (Configurable & Expandable)
 * Budget tiers match the exact specification:
 * 1,000–1,500 EGP | 1–4 clients
 * 2,000–3,000 EGP | 5–10 clients
 * 4,000–5,000 EGP | 10–18 clients
 * 6,000–8,000 EGP | 15–28 clients
 * 10,000+ EGP     | Advanced scalable campaigns
 */
export const MARKETING_PACKAGE_TIERS: MarketingPackageTier[] = [
  {
    id: 'MKT-TIER-1',
    nameAr: 'حملة الترويج المحلي للتجار',
    titleAr: 'حملة الترويج المحلي للتجار',
    budgetRangeLabelAr: '1,000 – 1,500 جنيه',
    minBudgetEgp: 1000,
    maxBudgetEgp: 1500,
    defaultBudgetEgp: 1000,
    costPiastres: egpToPiastres(1000),
    minTargetClients: 1,
    maxTargetClients: 4,
    expectedNewClientsMin: 1,
    expectedNewClientsMax: 4,
    expectedNewShipmentsMin: 2,
    expectedNewShipmentsMax: 4,
    requiredMarketingLevel: 1,
    levelRequired: 1,
    strictDeadlineRatio: 0.25,
    descriptionAr:
      'إعلانات موجهة لورش الملابس والمتاجر المحلية في القاهرة الكبرى لجذب 1 إلى 4 عملاء جدد.',
  },
  {
    id: 'MKT-TIER-2',
    nameAr: 'حملة المتاجر الإلكترونية الصاعدة',
    titleAr: 'حملة المتاجر الإلكترونية الصاعدة',
    budgetRangeLabelAr: '2,000 – 3,000 جنيه',
    minBudgetEgp: 2000,
    maxBudgetEgp: 3000,
    defaultBudgetEgp: 2500,
    costPiastres: egpToPiastres(2500),
    minTargetClients: 5,
    maxTargetClients: 10,
    expectedNewClientsMin: 5,
    expectedNewClientsMax: 10,
    expectedNewShipmentsMin: 3,
    expectedNewShipmentsMax: 6,
    requiredMarketingLevel: 1,
    levelRequired: 1,
    strictDeadlineRatio: 0.4,
    descriptionAr:
      'تعاقدات ترويجية مع صفحات البيع أونلاين وتجار الإكسسوارات (تستهدف 5 إلى 10 عملاء).',
  },
  {
    id: 'MKT-TIER-3',
    nameAr: 'حملة التوسع التجاري والموزعين',
    titleAr: 'حملة التوسع التجاري والموزعين',
    budgetRangeLabelAr: '4,000 – 5,000 جنيه',
    minBudgetEgp: 4000,
    maxBudgetEgp: 5000,
    defaultBudgetEgp: 4500,
    costPiastres: egpToPiastres(4500),
    minTargetClients: 10,
    maxTargetClients: 18,
    expectedNewClientsMin: 10,
    expectedNewClientsMax: 18,
    expectedNewShipmentsMin: 4,
    expectedNewShipmentsMax: 8,
    requiredMarketingLevel: 2,
    levelRequired: 2,
    strictDeadlineRatio: 0.55,
    descriptionAr:
      'حملة تسويق موسعة تستهدف موزعي الإلكترونيات ومخازن الجملة (تستهدف 10 إلى 18 عميلاً مع مواعيد تسليم أكثر صرامة).',
  },
  {
    id: 'MKT-TIER-4',
    nameAr: 'حملة الانطلاق والتوسع الإقليمي (الحملة التدريبية 6,000 ج.م)',
    titleAr: 'حملة الانطلاق والتوسع الإقليمي (6,000 – 8,000 ج.م)',
    budgetRangeLabelAr: '6,000 – 8,000 جنيه',
    minBudgetEgp: 6000,
    maxBudgetEgp: 8000,
    defaultBudgetEgp: 6000,
    costPiastres: egpToPiastres(6000),
    minTargetClients: 15,
    maxTargetClients: 28,
    expectedNewClientsMin: 15,
    expectedNewClientsMax: 28,
    expectedNewShipmentsMin: 4,
    expectedNewShipmentsMax: 8,
    requiredMarketingLevel: 1,
    levelRequired: 1,
    strictDeadlineRatio: 0.5,
    descriptionAr:
      'الحملة التأسيسية الموصى بها لبناء قاعدة عملاء قوية (6,000 ج.م)؛ تجلب تدفقاً متوازناً ومربحاً من طلبات التجار والشركات مع استهداف جغرافي دقيق.',
  },
  {
    id: 'MKT-TIER-5',
    nameAr: 'الحملة المؤسسية الكبرى (انجوبيا اكسبريس بلس)',
    titleAr: 'الحملة المؤسسية الكبرى (انجوبيا اكسبريس بلس)',
    budgetRangeLabelAr: '10,000 جنيه فأكثر',
    minBudgetEgp: 10000,
    maxBudgetEgp: 15000,
    defaultBudgetEgp: 10000,
    costPiastres: egpToPiastres(10000),
    minTargetClients: 22,
    maxTargetClients: 38,
    expectedNewClientsMin: 22,
    expectedNewClientsMax: 38,
    expectedNewShipmentsMin: 6,
    expectedNewShipmentsMax: 12,
    requiredMarketingLevel: 3,
    levelRequired: 3,
    strictDeadlineRatio: 0.85,
    descriptionAr:
      'حملة متقدمة لكبار الموردين والعلامات التجارية الكبرى؛ ترفع حجم الطلبات اليومية والضغط التشغيلي إلى أقصى مستوى.',
  },
];

export function createInitialMarketingState(): MarketingState {
  const initialTasks: MarketingDeadlineTask[] = [
    {
      id: 'MTASK-D1-1',
      titleAr: 'إتمام تسليم شحنة اليوم الأول في موعدها',
      descriptionAr:
        'حافظ على التزام المواعيد في اليوم الأول لرفع سمعة انجوبيا اكسبريس وجاهزية التسويق.',
      type: 'DAILY',
      scope: 'DAILY',
      createdAtDay: 1,
      deadlineTotalMinutes: 960, // 16:00
      deadlineLabelAr: 'اليوم 1 — الساعة 16:00',
      targetCount: 1,
      targetShipmentsCount: 1,
      currentProgress: 0,
      completedShipmentsCount: 0,
      status: 'ACTIVE',
      rewardReputationDelta: 3,
      reputationImpactOnExpire: -4,
    },
  ];

  return {
    availableBudgetPiastres: egpToPiastres(6000),
    totalSpentPiastres: 0,
    totalCampaignSpendPiastres: 0,
    acquiredClientsCount: 0,
    newShipmentRequestsCount: 0,
    conversionRatePercent: 0,
    marketingLevel: 1,
    churnedClientsCount: 0,
    campaigns: [],
    tasks: initialTasks,
    deadlineTasks: initialTasks,
  };
}

const EGYPTIAN_CLIENT_TEMPLATES: {
  name: string;
  roleAr: string;
  type: Client['type'];
  typeAr: string;
  avatarId: Client['avatarId'];
  pickupZone: string;
  deliveryZone: string;
  itemDesc: string;
  weightKg: number;
  volumeM3: number;
  feeEgp: number;
  costEgp: number;
  codEgp: number;
  terms: Shipment['paymentTerms'];
}[] = [
  {
    name: 'دارين للأزياء العصرية',
    roleAr: 'براند ملابس أونلاين بمدينة نصر',
    type: 'CLOTHING_WORKSHOP',
    typeAr: 'أزياء وملابس',
    avatarId: 'nourhan',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'المعادي',
    itemDesc: 'طلبيات ملابس شتوية مغلفة للعملاء',
    weightKg: 4.5,
    volumeM3: 0.35,
    feeEgp: 185,
    costEgp: 55,
    codEgp: 550,
    terms: 'COD_MERCHANT',
  },
  {
    name: 'شركة التوحيد لقطع الغيار',
    roleAr: 'تاجر جملة بالعتبة',
    type: 'ELECTRONICS_TRADER',
    typeAr: 'قطع غيار وإلكترونيات',
    avatarId: 'hag_saeed',
    pickupZone: 'العتبة',
    deliveryZone: 'الدقي',
    itemDesc: 'صندوق مستلزمات صيانة وأجهزة دقيقة',
    weightKg: 9.0,
    volumeM3: 0.55,
    feeEgp: 225,
    costEgp: 65,
    codEgp: 0,
    terms: 'PREPAID_CASH',
  },
  {
    name: 'مؤسسة الشفاء للمستلزمات الطبية',
    roleAr: 'موزع صيدليات بشبرا',
    type: 'PHARMACY_DISTRIBUTOR',
    typeAr: 'مستلزمات طبية وصيدليات',
    avatarId: 'kareem',
    pickupZone: 'شبرا مصر',
    deliveryZone: 'مصر الجديدة',
    itemDesc: 'كرتونة مستلزمات طبية حساسة (تغليف مقوى)',
    weightKg: 6.0,
    volumeM3: 0.45,
    feeEgp: 255,
    costEgp: 75,
    codEgp: 0,
    terms: 'POSTPAID_RECEIVABLE',
  },
  {
    name: 'بازار خان الخليلي للهدايا',
    roleAr: 'معرض تحف وهدايا بالحسين',
    type: 'LOCAL_STORE',
    typeAr: 'تحف وهدايا قابلة للكسر',
    avatarId: 'hag_saeed',
    pickupZone: 'العتبة',
    deliveryZone: 'الزمالك',
    itemDesc: 'طرد تحف زجاجية ونحاسية (قابل للكسر)',
    weightKg: 7.5,
    volumeM3: 0.6,
    feeEgp: 245,
    costEgp: 70,
    codEgp: 800,
    terms: 'COD_MERCHANT',
  },
];

/**
 * Launches a Marketing Campaign from the selected tier.
 * Results scale realistically with budget, targeting, market competition, and regional demand.
 */
export function launchMarketingCampaign(
  state: GameState,
  tierId: string,
  customBudgetEgp?: number,
  enableDailyAutoRepeat: boolean = false
): GameState {
  const tier = MARKETING_PACKAGE_TIERS.find((t) => t.id === tierId);
  if (!tier) {
    throw new Error('باقة التسويق المختارة غير موجودة.');
  }

  const mkt = state.marketing || createInitialMarketingState();

  const chosenBudgetEgp =
    customBudgetEgp !== undefined
      ? Math.max(
          tier.minBudgetEgp,
          Math.min(tier.maxBudgetEgp, Math.round(customBudgetEgp))
        )
      : tier.defaultBudgetEgp;
  const campaignCostPiastres = egpToPiastres(chosenBudgetEgp);

  const afford = canAffordImmediatePayment(state, campaignCostPiastres);
  if (!afford.allowed) {
    throw new Error(
      `السيولة النقدية المتاحة (${formatEGP(state.company.cashPiastres)}) غير كافية لتمويل «${tier.nameAr}» بتكلفة ${formatEGP(campaignCostPiastres)}.`
    );
  }

  const campaignSeq = mkt.campaigns.length + 1;
  const campaignId = `CMP-D${state.company.currentDay}-${campaignSeq}`;
  if (state.executedDecisionIds.includes(campaignId)) {
    throw new Error('تم إطلاق هذه الحملة بالفعل.');
  }

  // 1. Deduct campaign cost once in the general ledger
  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: campaignCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: campaignId,
    description: `تمويل حملة تسويقية: ${tier.nameAr} (${formatEGP(campaignCostPiastres)})`,
  });

  // 2. Realistic conversion calculation based on budget ratio, competition pressure, profile trust, reputation, and regional demand
  const whMetrics = getWarehouseUtilizationMetrics(nextState);
  const budgetScaleRatio = Math.max(
    0.45,
    Math.min(1.35, chosenBudgetEgp / Math.max(1000, tier.defaultBudgetEgp))
  );
  const profileTrustBonus = (nextState.companyProfile?.trustBonusEarned ?? 0) * 0.03;
  const reputationFactor = Math.max(
    0.4,
    Math.min(1.2, nextState.company.reputation / 72 + profileTrustBonus)
  );
  const satisfactionFactor = Math.max(
    0.45,
    Math.min(1.15, nextState.company.customerSatisfaction / 75)
  );
  const avgCompetitorRep =
    nextState.competitors && nextState.competitors.length > 0
      ? nextState.competitors.reduce((s, c) => s + c.reputation, 0) /
        nextState.competitors.length
      : 70;
  const competitionFactor = Math.max(
    0.72,
    Math.min(1.18, nextState.company.reputation / Math.max(50, avgCompetitorRep))
  );
  const congestionPenalty =
    whMetrics.volumePercent > 85 || whMetrics.weightPercent > 85
      ? 0.75
      : 1.0;

  const rawMidpoint = (tier.minTargetClients + tier.maxTargetClients) / 2;
  const leadsGenerated = Math.max(
    tier.minTargetClients,
    Math.round(rawMidpoint * 1.25 * budgetScaleRatio)
  );

  const effectiveMultiplier =
    reputationFactor *
    satisfactionFactor *
    competitionFactor *
    congestionPenalty *
    budgetScaleRatio;
  const convertedClientsCount = Math.max(
    tier.minTargetClients,
    Math.min(
      tier.maxTargetClients,
      Math.round(rawMidpoint * effectiveMultiplier)
    )
  );

  // Small budget tiers (1,000 EGP) yield 1-2 immediate shipments; 6,000 EGP training/regional campaign yields 3-5 quality shipments
  const minShipmentsForBudget = chosenBudgetEgp >= 6000 ? 3 : chosenBudgetEgp >= 2500 ? 2 : 1;
  const maxShipmentsForBudget = chosenBudgetEgp >= 6000 ? 5 : chosenBudgetEgp >= 2500 ? 4 : 2;
  const immediateRequestsToSpawn = Math.max(
    minShipmentsForBudget,
    Math.min(maxShipmentsForBudget, convertedClientsCount)
  );
  const conversionRatePercent = Math.min(
    100,
    Math.round((convertedClientsCount / Math.max(1, leadsGenerated)) * 100)
  );

  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);

  // 3. Create new Clients & Shipment Requests
  const existingClients = [...nextState.clients];
  const newTrackingNumbers: string[] = [];
  const nextToasts = [...(nextState.timedShipmentToasts || [])];

  for (let i = 0; i < immediateRequestsToSpawn; i++) {
    const tpl =
      EGYPTIAN_CLIENT_TEMPLATES[
        (mkt.acquiredClientsCount + i) % EGYPTIAN_CLIENT_TEMPLATES.length
      ];
    const clientSeq = existingClients.length + 1;
    const clientId = `CLI-MKT-${nextState.company.currentDay}-${clientSeq}`;
    const clientName =
      i === 0 ? tpl.name : `${tpl.name} — فرع ${clientSeq}`;

    // Higher budget campaigns attract higher-paying orders with better margins
    const feeBonusEgp = chosenBudgetEgp >= 6000 ? 35 : chosenBudgetEgp >= 2500 ? 15 : 0;

    const newClient: Client = {
      id: clientId,
      name: clientName,
      roleAr: tpl.roleAr,
      type: tpl.type,
      typeAr: tpl.typeAr,
      receivableBalancePiastres: 0,
      merchantCodBalancePiastres: 0,
      trustLevel: chosenBudgetEgp >= 6000 ? 74 : 68,
      avatarId: tpl.avatarId,
      acquiredViaMarketingCampaignId: campaignId,
      history: [
        {
          id: `HIST-${nextState.company.currentDay}-1`,
          day: nextState.company.currentDay,
          summary: `انضم كعميل جديد عبر ${tier.nameAr} (ميزانية ${chosenBudgetEgp} ج.م)`,
          trustDelta: 0,
        },
      ],
    };
    existingClients.push(newClient);

    const trkSeq = nextState.shipments.length + 1001 + i;
    const trackingNumber = `TRK-MKT-${trkSeq}`;
    newTrackingNumbers.push(trackingNumber);

    const isStrictDeadline =
      i < Math.ceil(immediateRequestsToSpawn * tier.strictDeadlineRatio);
    const acceptanceDeadlineMinutes = nowMinutes + (isStrictDeadline ? 110 : 165);
    const acceptanceDeadlineClockLabel = formatClockTime(
      acceptanceDeadlineMinutes % 1440
    );
    const expectedDeliveryMinutes = nowMinutes + (isStrictDeadline ? 180 : 240);
    const expectedClockLabel = formatClockTime(expectedDeliveryMinutes % 1440);

    const newShipment: Shipment = {
      trackingNumber,
      clientId,
      clientName,
      pickupZone: tpl.pickupZone,
      deliveryZone: tpl.deliveryZone,
      description: `${tpl.itemDesc}${isStrictDeadline ? ' (موعد تسليم صارم)' : ''}`,
      priority: isStrictDeadline ? 'HIGH' : 'NORMAL',
      weightKg: tpl.weightKg + i * 1.5,
      volumeM3: Number((tpl.volumeM3 + i * 0.1).toFixed(2)),
      packageSizeAr: 'كرتونة متوسطة (50×40×30 سم)',
      dimensionsLabel: '50×40×30 سم',
      packagingType:
        tpl.type === 'LOCAL_STORE' || tpl.type === 'PHARMACY_DISTRIBUTOR'
          ? 'REINFORCED_FRAGILE'
          : 'STANDARD',
      fragilityLevel: tpl.type === 'LOCAL_STORE' ? 'HIGH_FRAGILE' : 'MEDIUM',
      serviceFeePiastres: egpToPiastres(tpl.feeEgp + feeBonusEgp),
      estimatedOperatingCostPiastres: egpToPiastres(tpl.costEgp),
      actualOperatingCostPiastres: 0,
      codAmountPiastres: egpToPiastres(tpl.codEgp),
      paymentTerms: tpl.terms,
      sourceCampaignId: campaignId,
      status: 'NEW_REQUEST',
      operationalLocation: 'CLIENT_PREMISES',
      responsibleDepartment: 'MANAGEMENT',
      warehouseId: nextState.warehouses[0]?.id || 'WH-CAIRO-MAIN',
      revenueEarnedPiastres: 0,
      cashCollectedForFeePiastres: 0,
      receivableOutstandingPiastres: 0,
      codCollectedInCashPiastres: 0,
      codSettledToMerchantPiastres: 0,
      createdAtDay: nextState.company.currentDay,
      createdAtTotalMinutes: nowMinutes,
      acceptanceDeadlineTotalMinutes: acceptanceDeadlineMinutes,
      acceptanceDeadlineTimeLabel: acceptanceDeadlineClockLabel,
      minOperationalHours: 10,
      quotedClientSlaHours: 15,
      clientRequestedSlaHours: isStrictDeadline ? 12 : 15,
      lastStatusChangeTotalMinutes: nowMinutes,
      lastUpdatedTimeLabel: timeLabel,
      expectedDeliveryTotalMinutes: expectedDeliveryMinutes,
      expectedDeliveryTimeLabel: expectedClockLabel,
      originalExpectedDeliveryTimeLabel: expectedClockLabel,
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      processedEventKeys: [],
      timeline: [
        {
          id: `EVT-${nextState.company.currentDay}-1`,
          day: nextState.company.currentDay,
          timestampLabel: `${timeLabel} — طلب شحن جديد عبر التسويق`,
          totalMinutes: nowMinutes,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MARKETING',
          note: `طلب شحن وارد من الحملة التسويقية (${tier.nameAr}). مهلة قبول الطلب حتى ${acceptanceDeadlineClockLabel}.`,
        },
      ],
    };

    nextToasts.unshift({
      id: `TOAST-NEW-${trackingNumber}`,
      dedupeKey: `TOAST-NEW-${trackingNumber}`,
      shipmentId: trackingNumber,
      trackingNumber,
      clientName,
      stage: 'NEW_ORDER',
      messageAr: `أوردر جديد من شركة ${clientName} (${trackingNumber}) — راجعه الآن`,
      durationMs: 2000,
      createdAtMs: Date.now() + i * 250,
      targetSection: 'SHIPMENTS',
    });

    nextState = {
      ...nextState,
      clients: existingClients,
      shipments: [...nextState.shipments, newShipment],
      timedShipmentToasts: nextToasts.slice(0, 12),
    };

    // Route through Administrative Accountant (respecting 8 requests/day limit!)
    nextState = processShipmentWithAccountant(nextState, trackingNumber);
  }

  // 4. Create new Campaign Record & Deadline Task
  const newCampaign: MarketingCampaign = {
    id: campaignId,
    tierId: tier.id,
    tierNameAr: tier.nameAr,
    tierTitleAr: tier.titleAr,
    startedAtDay: nextState.company.currentDay,
    launchedAtDay: nextState.company.currentDay,
    startedAtTimeLabel: timeLabel,
    launchedAtTimeLabel: timeLabel,
    costPiastres: campaignCostPiastres,
    budgetSpentPiastres: campaignCostPiastres,
    leadsGenerated,
    convertedClientsCount,
    generatedClientsCount: convertedClientsCount,
    newShipmentsCount: immediateRequestsToSpawn,
    generatedShipmentsCount: immediateRequestsToSpawn,
    generatedTrackingNumbers: newTrackingNumbers,
    conversionRatePercent,
    status: 'ACTIVE',
    outcomeSummaryAr: `استقطبت الحملة (${formatEGP(campaignCostPiastres)}) ${leadsGenerated} عميل محتمل وفق حجم الطلب والمنافسة بالمنطقة، تحول منهم ${convertedClientsCount} عميل فعلي بمعدل تحويل ${conversionRatePercent}%، ووصلت ${immediateRequestsToSpawn} طلبات شحن فورية للمراجعة.`,
    dailyAutoRepeat: enableDailyAutoRepeat,
    dailyBudgetPiastres: campaignCostPiastres,
    cumulativeAutoSpendPiastres: campaignCostPiastres,
    lastAutoRepeatedDay: nextState.company.currentDay,
    autoRepeatRunsCount: 1,
  };

  const deadlineTask: MarketingDeadlineTask = {
    id: `MTASK-${campaignId}`,
    titleAr: `قبول وتجهيز طلبات ${tier.nameAr} قبل انتهاء المهلة`,
    descriptionAr: `راجع واقبل طلبات الشحن الجديدة (${newTrackingNumbers.join('، ')}) قبل انتهاء مهلة القبول حتى لا ينتقل العملاء لشركة منافسة.`,
    type: 'DAILY',
    scope: 'DAILY',
    createdAtDay: nextState.company.currentDay,
    deadlineTotalMinutes: nowMinutes + 120,
    deadlineLabelAr: `اليوم ${nextState.company.currentDay} — الساعة ${formatClockTime((nowMinutes + 120) % 1440)}`,
    relatedTrackingNumber: newTrackingNumbers[0],
    targetCount: immediateRequestsToSpawn,
    targetShipmentsCount: immediateRequestsToSpawn,
    currentProgress: 0,
    completedShipmentsCount: 0,
    status: 'ACTIVE',
    rewardReputationDelta: 4,
    reputationImpactOnExpire: -5,
  };

  const totalAcquired = mkt.acquiredClientsCount + convertedClientsCount;
  const totalRequests = mkt.newShipmentRequestsCount + immediateRequestsToSpawn;
  const totalSpent = mkt.totalSpentPiastres + campaignCostPiastres;
  const nextLevel = Math.min(5, mkt.marketingLevel + 1);
  const existingTasks = mkt.deadlineTasks || mkt.tasks || [];
  const nextTasks = [deadlineTask, ...existingTasks];

  const updatedMarketing: MarketingState = {
    ...mkt,
    availableBudgetPiastres: Math.max(
      0,
      mkt.availableBudgetPiastres - campaignCostPiastres
    ),
    totalSpentPiastres: totalSpent,
    totalCampaignSpendPiastres: totalSpent,
    acquiredClientsCount: totalAcquired,
    newShipmentRequestsCount: totalRequests,
    conversionRatePercent,
    marketingLevel: nextLevel,
    campaigns: [newCampaign, ...mkt.campaigns],
    tasks: nextTasks,
    deadlineTasks: nextTasks,
  };

  // Add Social Media buzz post
  const buzzPost = {
    id: `POST-${campaignId}`,
    dedupeKey: `BUZZ-${campaignId}`,
    day: nextState.company.currentDay,
    timeLabel,
    totalMinutes: nowMinutes,
    authorClientId: existingClients[existingClients.length - 1].id,
    authorName: existingClients[existingClients.length - 1].name,
    authorRoleAr: existingClients[existingClients.length - 1].roleAr,
    authorHandle: '@tajer_cairo',
    authorAvatarId: 'hag_saeed' as const,
    relatedTrackingNumber: newTrackingNumbers[0],
    sentiment: 'CAMPAIGN_BUZZ' as const,
    ratingStars: 4 as const,
    contentAr: `شفنا إعلان «انجوبيا اكسبريس» الجديد (${tier.nameAr}) وبعتنا أول طلبية شحن (${newTrackingNumbers[0]}). يارب الالتزام بالمواعيد يكون قد كلام الإعلان!`,
    likesCount: 14 + nextLevel * 5,
    commentsCount: 4,
    reputationDelta: 0, // التسويق يرفع القوة التسويقية ولا يرفع السمعة مباشرة
  };

  // Mark onboarding mastery if 6,000 EGP training campaign was launched
  const currentMastery = nextState.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          launchedTrainingCampaign6000:
            currentMastery.appliedSystems.launchedTrainingCampaign6000 ||
            chosenBudgetEgp >= 6000,
        },
      }
    : undefined;

  nextState = {
    ...nextState,
    company: {
      ...nextState.company,
      marketingPower: Math.min(
        100,
        (nextState.company.marketingPower ?? 58) + (chosenBudgetEgp >= 6000 ? 12 : 7)
      ),
    },
    marketing: updatedMarketing,
    onboardingMastery: updatedMastery,
    socialPosts: [buzzPost, ...(nextState.socialPosts || [])],
    executedDecisionIds: [...nextState.executedDecisionIds, campaignId],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `MKT-LAUNCH-${campaignId}`,
    title: `نتائج ${tier.nameAr}: وصول ${immediateRequestsToSpawn} طلبات شحن جديدة`,
    message: `تم اكتساب ${convertedClientsCount} عملاء جدد ووصلت الطلبات (${newTrackingNumbers.join('، ')}) إلى قسم العمليات والمحاسبة بمهلة قبول محددة.`,
    causeReasonAr: `إطلاق حملة تسويقية بميزانية ${formatEGP(campaignCostPiastres)}`,
    department: 'MARKETING',
    outcomeLabel: `مستوى التسويق الآن ${nextLevel}`,
    actionRequiredLabel:
      'افتح قسم العمليات والشحنات لمراجعة تقدير المحاسب وقبول الطلبات',
    targetSection: 'SHIPMENTS',
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Toggles the optional daily auto-repeat setting on an existing marketing campaign.
 */
export function toggleMarketingCampaignDailyRepeat(
  state: GameState,
  campaignId: string
): GameState {
  const mkt = state.marketing || createInitialMarketingState();
  const target = mkt.campaigns.find((c) => c.id === campaignId);
  if (!target) {
    throw new Error('الحملة التسويقية المطلوبة غير موجودة.');
  }

  const nextRepeatState = !target.dailyAutoRepeat;
  const updatedCampaigns = mkt.campaigns.map((c) =>
    c.id === campaignId
      ? {
          ...c,
          dailyAutoRepeat: nextRepeatState,
          dailyBudgetPiastres: c.dailyBudgetPiastres ?? c.costPiastres,
          cumulativeAutoSpendPiastres:
            c.cumulativeAutoSpendPiastres ?? c.costPiastres,
          lastAutoRepeatedDay:
            c.lastAutoRepeatedDay ?? state.company.currentDay,
        }
      : c
  );

  let nextState: GameState = {
    ...state,
    marketing: {
      ...mkt,
      campaigns: updatedCampaigns,
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `MKT-REPEAT-TOGGLE-${campaignId}-${state.clock.totalElapsedMinutes}`,
    title: nextRepeatState
      ? `تفعيل التكرار اليومي التلقائي: ${target.tierNameAr}`
      : `إيقاف التكرار اليومي التلقائي: ${target.tierNameAr}`,
    message: nextRepeatState
      ? `سيتم تجديد الحملة تلقائياً كل صباح بميزانية يومية ${formatEGP(target.dailyBudgetPiastres ?? target.costPiastres)} طالما توفرت السيولة النقدية.`
      : `تم إيقاف التجديد اليومي التلقائي للحملة (${target.id})؛ لن يتم خصم أي مبالغ إضافية عنها في الأيام القادمة.`,
    department: 'MARKETING',
    outcomeLabel: nextRepeatState ? 'تكرار يومي مفعل' : 'تكرار يومي متوقف',
    severity: 'INFO',
  });

  return nextState;
}

/**
 * Processes active daily auto-repeat campaigns once at the start of a new game day.
 */
export function processDailyAutoRepeatCampaigns(
  state: GameState,
  currentDay: number
): GameState {
  const mkt = state.marketing;
  if (!mkt || !mkt.campaigns || mkt.campaigns.length === 0) {
    return state;
  }

  let nextState = state;
  for (const camp of mkt.campaigns) {
    if (!camp.dailyAutoRepeat) continue;
    if ((camp.lastAutoRepeatedDay ?? camp.startedAtDay) >= currentDay) continue;

    const repeatDedupeKey = `MKT-AUTOREPEAT-${camp.id}-D${currentDay}`;
    if (nextState.executedDecisionIds.includes(repeatDedupeKey)) continue;

    const dailyCost = camp.dailyBudgetPiastres ?? camp.costPiastres;
    const afford = canAffordImmediatePayment(nextState, dailyCost);
    if (!afford.allowed) {
      // Auto-pause repeat if cash is insufficient so player never goes negative
      const latestMkt = nextState.marketing!;
      nextState = {
        ...nextState,
        marketing: {
          ...latestMkt,
          campaigns: latestMkt.campaigns.map((c) =>
            c.id === camp.id
              ? { ...c, dailyAutoRepeat: false, lastAutoRepeatedDay: currentDay }
              : c
          ),
        },
        executedDecisionIds: [...nextState.executedDecisionIds, repeatDedupeKey],
      };
      nextState = pushNotification(nextState, {
        dedupeKey: repeatDedupeKey,
        title: `توقف التكرار اليومي للحملة (${camp.tierNameAr}) لعدم كفاية السيولة`,
        message: `الميزانية اليومية المطلوبة (${formatEGP(dailyCost)}) أعلى من النقدية المتاحة (${formatEGP(nextState.company.cashPiastres)}). تم إيقاف التكرار التلقائي لحماية الخزينة.`,
        department: 'MARKETING',
        outcomeLabel: 'إيقاف تلقائي لحماية السيولة',
        severity: 'WARNING',
      });
      continue;
    }

    // Deduct daily repeat cost and spawn 2 new orders
    nextState = recordLedgerTransaction(nextState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: dailyCost,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: repeatDedupeKey,
      description: `تجديد يومي تلقائي لحملة: ${camp.tierNameAr} (اليوم ${currentDay})`,
    });

    const latestMkt = nextState.marketing!;
    const newCumSpend = (camp.cumulativeAutoSpendPiastres ?? camp.costPiastres) + dailyCost;
    const newRuns = (camp.autoRepeatRunsCount ?? 1) + 1;

    nextState = {
      ...nextState,
      marketing: {
        ...latestMkt,
        totalSpentPiastres: latestMkt.totalSpentPiastres + dailyCost,
        totalCampaignSpendPiastres: latestMkt.totalCampaignSpendPiastres + dailyCost,
        campaigns: latestMkt.campaigns.map((c) =>
          c.id === camp.id
            ? {
                ...c,
                budgetSpentPiastres: newCumSpend,
                cumulativeAutoSpendPiastres: newCumSpend,
                lastAutoRepeatedDay: currentDay,
                autoRepeatRunsCount: newRuns,
              }
            : c
        ),
      },
      executedDecisionIds: [...nextState.executedDecisionIds, repeatDedupeKey],
    };

    nextState = pushNotification(nextState, {
      dedupeKey: repeatDedupeKey,
      title: `تم تجديد الحملة اليومية تلقائياً: ${camp.tierNameAr}`,
      message: `تم خصم الميزانية اليومية (${formatEGP(dailyCost)}) لليوم ${currentDay}. إجمالي الإنفاق التراكمي على هذه الحملة الآن ${formatEGP(newCumSpend)}.`,
      department: 'MARKETING',
      outcomeLabel: `اليوم ${currentDay} — تكرار #${newRuns}`,
      severity: 'INFO',
    });
  }

  return nextState;
}

export function increaseMarketingBudgetAllocation(
  state: GameState,
  additionalBudgetPiastres: number
): GameState {
  const mkt = state.marketing || createInitialMarketingState();
  return {
    ...state,
    marketing: {
      ...mkt,
      availableBudgetPiastres:
        mkt.availableBudgetPiastres + additionalBudgetPiastres,
    },
  };
}

