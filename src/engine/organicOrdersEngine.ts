import {
  Client,
  GameState,
  OrganicAcquisitionSource,
  PaymentTerms,
  Shipment,
} from '../types/game';
import { computeShipmentEstimateBreakdown } from './accountingEngine';
import { egpToPiastres, formatClockTime, formatEGP } from './financeEngine';
import { calculateEgyptRouteDistance } from './geographyEngine';
import { pushInlineBubbleNotification } from './guideAndSecretaryEngine';
import { pushNotification } from './notificationEngine';

export interface OrganicMarketStandingReport {
  companyLevel: number;
  reputation: number;
  deliverySuccessRatePercent: number;
  coveredZonesAr: string[];
  pricingCompetitivenessScore: number; // 0 to 100
  operationalCapacityScore: number; // 0 to 100
  returningClientsPoolCount: number;
  expectedDailyOrganicOrders: number;
  organicOrdersTodayCount: number;
  canReceiveOrganicNow: boolean;
  statusSummaryAr: string;
}

interface OrganicClientCatalogEntry {
  id: string;
  name: string;
  roleAr: string;
  type: Client['type'];
  typeAr: string;
  avatarId: Client['avatarId'];
  pickupZone: string;
  deliveryZone: string;
  sampleDescriptionAr: string;
  packageSizeAr: string;
  weightKg: number;
  volumeM3: number;
  paymentTerms: PaymentTerms;
  codEgp: number;
  minLevel: number;
}

const ORGANIC_DISCOVERY_AND_REFERRAL_POOL: OrganicClientCatalogEntry[] = [
  {
    id: 'CLI-ORG-ABBASIYA-BOOKS',
    name: 'دار البيان للطباعة والكتب الجامعية',
    roleAr: 'مدير توزيع مطبوعات بالعباسية',
    type: 'LOCAL_STORE',
    typeAr: 'دار نشر ومكتبة توزيع',
    avatarId: 'kareem',
    pickupZone: 'العباسية',
    deliveryZone: 'الدقي',
    sampleDescriptionAr: 'طرود كتب وملازم دراسية مغلفة لمكتبة توزيع في الدقي',
    packageSizeAr: 'كرتونة كتب متوسطة',
    weightKg: 9.5,
    volumeM3: 0.24,
    paymentTerms: 'PREPAID_CASH',
    codEgp: 0,
    minLevel: 1,
  },
  {
    id: 'CLI-ORG-NASR-COSMETICS',
    name: 'بيوتي لاين لمستحضرات التجميل والعناية',
    roleAr: 'صاحبة متجر تجميل بمدينة نصر',
    type: 'LOCAL_STORE',
    typeAr: 'متجر مستحضرات تجميل',
    avatarId: 'nourhan',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'مصر الجديدة',
    sampleDescriptionAr: 'بوكسات عناية بالبشرة وعطور أصلية لعملاء في مصر الجديدة',
    packageSizeAr: 'طرد محمي صغير',
    weightKg: 3.2,
    volumeM3: 0.12,
    paymentTerms: 'COD_MERCHANT',
    codEgp: 480,
    minLevel: 1,
  },
  {
    id: 'CLI-ORG-ATABA-LEATHER',
    name: 'ورشة الشامي للمصنوعات الجلدية والشنط',
    roleAr: 'تاجر جملة بالعتبة',
    type: 'CLOTHING_WORKSHOP',
    typeAr: 'ورشة جلود وشنط',
    avatarId: 'hag_saeed',
    pickupZone: 'العتبة',
    deliveryZone: 'المهندسين',
    sampleDescriptionAr: 'دفعة شنط جلد طبيعي وأحزمة لمحل أحذية وشنط بالمهندسين',
    packageSizeAr: 'كرتونة شنط مزدوجة',
    weightKg: 11.0,
    volumeM3: 0.34,
    paymentTerms: 'PREPAID_CASH',
    codEgp: 0,
    minLevel: 1,
  },
  {
    id: 'CLI-ORG-MAADI-PHARMA',
    name: 'مؤسسة الشفاء للمستلزمات الطبية والأجهزة',
    roleAr: 'مسؤول إمداد طبي بالمعادي',
    type: 'PHARMACY_DISTRIBUTOR',
    typeAr: 'موزع مستلزمات طبية',
    avatarId: 'mahmoud',
    pickupZone: 'المعادي',
    deliveryZone: 'وسط البلد (البستان)',
    sampleDescriptionAr: 'أجهزة قياس ضغط وسكر ومستلزمات عيادات طبية عاجلة',
    packageSizeAr: 'صندوق طبي مؤمن',
    weightKg: 6.5,
    volumeM3: 0.2,
    paymentTerms: 'POSTPAID_RECEIVABLE',
    codEgp: 0,
    minLevel: 2,
  },
  {
    id: 'CLI-ORG-SHUBRA-HOME',
    name: 'معرض التوحيد للأدوات المنزلية الصغيرة',
    roleAr: 'تاجر أدوات منزلية بشبرا',
    type: 'LOCAL_STORE',
    typeAr: 'معرض أدوات منزلية',
    avatarId: 'hag_saeed',
    pickupZone: 'شبرا مصر',
    deliveryZone: 'الزمالك',
    sampleDescriptionAr: 'طقم ماكينات قهوة وخلاطات مطبخ مغلفة لعملاء بالزمالك',
    packageSizeAr: 'كرتونة أجهزة منزلية',
    weightKg: 12.5,
    volumeM3: 0.38,
    paymentTerms: 'COD_MERCHANT',
    codEgp: 750,
    minLevel: 2,
  },
  {
    id: 'CLI-ORG-HELIOPOLIS-TECH',
    name: 'سمارت زون لأنظمة المراقبة والشبكات',
    roleAr: 'مدير مبيعات بمصر الجديدة',
    type: 'ELECTRONICS_TRADER',
    typeAr: 'شركة أنظمة وشبكات',
    avatarId: 'kareem',
    pickupZone: 'مصر الجديدة',
    deliveryZone: 'مدينة نصر',
    sampleDescriptionAr: 'كاميرات مراقبة وأجهزة تسجيل DVR لمقر شركة بمدينة نصر',
    packageSizeAr: 'صندوق إلكترونيات مبطن',
    weightKg: 7.8,
    volumeM3: 0.22,
    paymentTerms: 'PREPAID_CASH',
    codEgp: 0,
    minLevel: 3,
  },
];

/**
 * Evaluates the company's current organic market attraction based on:
 * - Company Level (1..5)
 * - Reputation (starts at 49)
 * - Delivery Success & On-Time Record
 * - Geographic Coverage (profile zones + couriers + regional branches)
 * - Pricing Competitiveness vs. Market Competitors
 * - Operational Capacity (warehouse slots & active couriers)
 * - Returning Client Relationships
 */
export function evaluateOrganicMarketStanding(
  state: GameState
): OrganicMarketStandingReport {
  const companyLevel = Math.max(1, Math.min(5, state.company.level || 1));
  const reputation = state.company.reputation;

  const completedShipments = state.shipments.filter(
    (s) => s.status === 'DELIVERED'
  );
  const failedOrExpiredShipments = state.shipments.filter(
    (s) =>
      s.status === 'DELIVERY_FAILED' ||
      s.status === 'CANCELLED_EXPIRED' ||
      s.status === 'DAMAGED_OR_LOST'
  );
  const totalEvaluated =
    completedShipments.length + failedOrExpiredShipments.length;
  const deliverySuccessRatePercent =
    totalEvaluated > 0
      ? Math.round((completedShipments.length / totalEvaluated) * 100)
      : 82; // Fair baseline on Day 1 morning

  // Collect all covered geographic zones
  const profileZones = state.companyProfile?.coveredZonesAr || [
    'العباسية',
    'مدينة نصر',
    'العتبة',
    'المعادي',
    'الدقي',
  ];
  const courierZones = state.couriers.flatMap((c) => c.coveredZones || [c.zoneAr]);
  const branchZones = (state.branches || [])
    .filter((b) => b.active)
    .map((b) => b.cityAr || b.governorateAr);
  const coveredZonesAr = Array.from(
    new Set(['العباسية', ...profileZones, ...courierZones, ...branchZones].filter(Boolean))
  );

  // Compare player price per km against competitors
  const playerKmRate = state.pricingEngine?.perKmRatePiastres ?? 650;
  const competitors = state.competitors || [];
  const avgCompetitorKmRate =
    competitors.length > 0
      ? competitors.reduce((sum, c) => sum + Math.round(c.avgPricePerOrderPiastres / 14), 0) /
        competitors.length
      : 680;

  // Pricing competitiveness: 100 when significantly cheaper, ~75 when balanced, <35 when overpriced
  const priceRatio = playerKmRate / Math.max(300, avgCompetitorKmRate);
  const pricingCompetitivenessScore = Math.max(
    10,
    Math.min(100, Math.round(115 - priceRatio * 40))
  );

  // Operational capacity check
  const wh = state.warehouses[0];
  const insideWhCount = state.shipments.filter(
    (s) =>
      s.status !== 'NEW_REQUEST' &&
      s.status !== 'DELIVERED' &&
      s.status !== 'REJECTED' &&
      s.status !== 'RETURNED' &&
      s.status !== 'CANCELLED_EXPIRED' &&
      s.status !== 'OUT_FOR_DELIVERY'
  ).length;
  const freeWhSlots = Math.max(0, (wh?.maxCapacity ?? 8) - insideWhCount);
  const activeCouriersCount = state.couriers.filter(
    (c) =>
      c.status !== 'UNAVAILABLE' &&
      (c.ownsPersonalMotorcycle || Boolean(c.vehicleId))
  ).length;
  const pendingNewRequestsCount = state.shipments.filter(
    (s) => s.status === 'NEW_REQUEST'
  ).length;

  const operationalCapacityScore =
    freeWhSlots === 0 || activeCouriersCount === 0
      ? 15
      : Math.min(100, freeWhSlots * 15 + activeCouriersCount * 22);

  // Returning clients pool: non-churned clients with good trust
  const returningClientsPoolCount = state.clients.filter(
    (c) => !c.churnedToCompetitor && c.trustLevel >= 58
  ).length;

  // Calculate realistic daily organic order potential:
  // Level 1 (rep 49) starts around 1-2/day; higher level, reputation, delivery rate & branches scale up to 6-8/day
  let rawDailyPotential = 1;
  if (reputation >= 45) rawDailyPotential += 0.6;
  if (reputation >= 58) rawDailyPotential += 0.9;
  if (reputation >= 72) rawDailyPotential += 1.2;
  if (reputation >= 85) rawDailyPotential += 1.0;

  rawDailyPotential += (companyLevel - 1) * 0.85;
  rawDailyPotential += Math.max(0, (deliverySuccessRatePercent - 70) * 0.03);
  rawDailyPotential += Math.min(1.5, (coveredZonesAr.length - 4) * 0.25);

  if (pricingCompetitivenessScore < 45) {
    rawDailyPotential *= 0.45; // Overpricing drives organic clients to competitors
  } else if (pricingCompetitivenessScore >= 80) {
    rawDailyPotential *= 1.15;
  }

  if (reputation < 35) {
    rawDailyPotential = 0; // Severe reputation crisis halts organic discovery
  }

  const expectedDailyOrganicOrders = Math.max(
    0,
    Math.min(8, Math.round(rawDailyPotential))
  );

  const organicOrdersTodayCount = state.shipments.filter(
    (s) =>
      s.createdAtDay === state.company.currentDay &&
      Boolean(s.organicSourceType) &&
      s.organicSourceType !== 'PAID_MARKETING' &&
      s.organicSourceType !== 'STORY_OR_CONTRACT'
  ).length;

  const canReceiveOrganicNow =
    expectedDailyOrganicOrders > organicOrdersTodayCount &&
    freeWhSlots >= 1 &&
    activeCouriersCount >= 1 &&
    pendingNewRequestsCount < 5;

  let statusSummaryAr = `جذب عضوي مستقر (${expectedDailyOrganicOrders} طلبات متوقعة يومياً) بفضل السمعة (${reputation}%) والمستوى ${companyLevel}.`;
  if (reputation < 35) {
    statusSummaryAr =
      'توقف الطلبات العضوية مؤقتاً بسبب تراجع السمعة تحت 35%؛ التزم بتسليم الشحنات الحالية لاستعادة ثقة السوق.';
  } else if (pricingCompetitivenessScore < 45) {
    statusSummaryAr =
      'أسعار الشحن الحالية مرتفعة مقارنة بالمنافسين مما يقلل الطلبات العضوية؛ راجع تسعير الكيلومتر في الهاتف.';
  } else if (freeWhSlots === 0) {
    statusSummaryAr =
      'المستودع ممتلئ حالياً؛ صرّف الشحنات الجاهزة أو وسّع المستودع لاستقبال طلبات عضوية جديدة.';
  }

  return {
    companyLevel,
    reputation,
    deliverySuccessRatePercent,
    coveredZonesAr,
    pricingCompetitivenessScore,
    operationalCapacityScore,
    returningClientsPoolCount,
    expectedDailyOrganicOrders,
    organicOrdersTodayCount,
    canReceiveOrganicNow,
    statusSummaryAr,
  };
}

/**
 * Generates a single realistic organic order (either from a Returning Client,
 * a Commercial Referral, or New Regional Discovery) without requiring paid marketing.
 */
export function generateOrganicOrderOpportunity(
  state: GameState,
  options?: {
    preferredSource?:
      | 'ORGANIC_RETURNING_CLIENT'
      | 'ORGANIC_REFERRAL'
      | 'ORGANIC_NEW_DISCOVERY';
    forceIgnoreDailyCap?: boolean;
  }
): {
  nextState: GameState;
  generatedShipment?: Shipment;
  acquisitionSource?: OrganicAcquisitionSource;
  clientIsNew?: boolean;
} {
  const standing = evaluateOrganicMarketStanding(state);
  if (!options?.forceIgnoreDailyCap && !standing.canReceiveOrganicNow) {
    return { nextState: state };
  }

  const day = state.company.currentDay;
  const nowTotal = state.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  // Determine whether this organic order comes from a RETURNING client, a REFERRAL, or NEW DISCOVERY
  const deliveredClientIds = new Set(
    state.shipments
      .filter((s) => s.status === 'DELIVERED')
      .map((s) => s.clientId)
  );
  const eligibleReturningClients = state.clients.filter(
    (c) =>
      !c.churnedToCompetitor &&
      c.trustLevel >= 62 &&
      (deliveredClientIds.has(c.id) || (c.completedShipmentsWithCompanyCount ?? 0) > 0)
  );

  let chosenSource:
    | 'ORGANIC_RETURNING_CLIENT'
    | 'ORGANIC_REFERRAL'
    | 'ORGANIC_NEW_DISCOVERY' =
    options?.preferredSource ||
    (eligibleReturningClients.length > 0 &&
    (state.shipments.length + day) % 2 === 0
      ? 'ORGANIC_RETURNING_CLIENT'
      : state.company.reputation >= 52 && (state.shipments.length + day) % 3 === 1
        ? 'ORGANIC_REFERRAL'
        : 'ORGANIC_NEW_DISCOVERY');

  if (
    chosenSource === 'ORGANIC_RETURNING_CLIENT' &&
    eligibleReturningClients.length === 0
  ) {
    chosenSource =
      state.company.reputation >= 52
        ? 'ORGANIC_REFERRAL'
        : 'ORGANIC_NEW_DISCOVERY';
  }

  let nextClients = [...state.clients];
  let targetClient: Client;
  let pickupZone = 'العباسية';
  let deliveryZone = 'مدينة نصر';
  let description = '';
  let packageSizeAr = 'طرد تجاري متوسط';
  let weightKg = 6.0;
  let volumeM3 = 0.2;
  let paymentTerms: PaymentTerms = 'PREPAID_CASH';
  let codAmountPiastres = 0;
  let organicReasonAr = '';
  let clientIsNew = false;

  if (chosenSource === 'ORGANIC_RETURNING_CLIENT') {
    const idx =
      (state.shipments.length + day) % eligibleReturningClients.length;
    targetClient = eligibleReturningClients[idx];

    const pastSh = state.shipments.find(
      (s) => s.clientId === targetClient.id
    );
    pickupZone =
      pastSh?.pickupZone ||
      targetClient.contractProfile?.coveredZonesAr?.[0] ||
      'العتبة';
    const candidateDeliveryZones = [
      'الدقي',
      'المعادي',
      'مصر الجديدة',
      'المهندسين',
      'مدينة نصر',
      'الزمالك',
    ].filter((z) => z !== pickupZone);
    deliveryZone =
      candidateDeliveryZones[
        (state.shipments.length + day) % candidateDeliveryZones.length
      ];

    weightKg = Number((4.5 + ((state.shipments.length % 4) * 2.2)).toFixed(1));
    volumeM3 = Number((weightKg * 0.03).toFixed(2));
    packageSizeAr = weightKg > 9 ? 'كرتونة بضاعة متوسطة' : 'طرد مغلف';
    paymentTerms =
      state.shipments.length % 2 === 0 ? 'PREPAID_CASH' : 'COD_MERCHANT';
    codAmountPiastres =
      paymentTerms === 'COD_MERCHANT' ? egpToPiastres(450) : 0;
    organicReasonAr = `عميل عائد (${targetClient.name}) بعد تجربة تسليم سابقة ناجحة ومستوى ثقة ${targetClient.trustLevel}%`;
    description = `طلب شحن متكرر من عميل عائد (${targetClient.name}) — بفضل الالتزام في الطلبات السابقة`;
  } else {
    // Pick from organic discovery/referral pool matching company level
    const availablePool = ORGANIC_DISCOVERY_AND_REFERRAL_POOL.filter(
      (entry) => entry.minLevel <= standing.companyLevel
    );
    const poolEntry =
      availablePool[
        (state.shipments.length + day) % Math.max(1, availablePool.length)
      ] || ORGANIC_DISCOVERY_AND_REFERRAL_POOL[0];

    const existingClient = nextClients.find((c) => c.id === poolEntry.id);
    pickupZone = poolEntry.pickupZone;
    deliveryZone = poolEntry.deliveryZone;
    packageSizeAr = poolEntry.packageSizeAr;
    weightKg = poolEntry.weightKg;
    volumeM3 = poolEntry.volumeM3;
    paymentTerms = poolEntry.paymentTerms;
    codAmountPiastres =
      poolEntry.codEgp > 0 ? egpToPiastres(poolEntry.codEgp) : 0;

    if (chosenSource === 'ORGANIC_REFERRAL') {
      const referrerName =
        state.clients[0]?.name || 'تاجر متعامل مع الشركة';
      organicReasonAr = `عميل جديد عبر توصية مباشرة من (${referrerName}) بفضل سمعة الشركة (${state.company.reputation}%)`;
      description = `${poolEntry.sampleDescriptionAr} (ترشيح وتوصية تجارية)`;
    } else {
      organicReasonAr = `اكتشاف عضوي مباشر للشركة في نطاق (${pickupZone} ← ${deliveryZone}) دون حملة إعلانية`;
      description = `${poolEntry.sampleDescriptionAr} (اكتشاف عضوي بالمنطقة)`;
    }

    if (existingClient) {
      targetClient = existingClient;
    } else {
      clientIsNew = true;
      targetClient = {
        id: poolEntry.id,
        name: poolEntry.name,
        roleAr: poolEntry.roleAr,
        type: poolEntry.type,
        typeAr: poolEntry.typeAr,
        receivableBalancePiastres: 0,
        merchantCodBalancePiastres: 0,
        trustLevel: chosenSource === 'ORGANIC_REFERRAL' ? 72 : 66,
        avatarId: poolEntry.avatarId,
        acquisitionSource: chosenSource,
        organicReasonAr,
        completedShipmentsWithCompanyCount: 0,
        history: [
          {
            id: `HIST-ORG-${poolEntry.id}-D${day}`,
            day,
            summary: organicReasonAr,
            trustDelta: 0,
          },
        ],
      };
      nextClients = [...nextClients, targetClient];
    }
  }

  const route = calculateEgyptRouteDistance(pickupZone, deliveryZone);
  const distanceKm = route.distanceKm;

  // Balanced economy calculation: realistic operating cost + healthy margin scaled by level & reputation
  const baseOperatingCostEgp = Math.max(
    42,
    Math.min(85, Math.round(28 + distanceKm * 1.65 + weightKg * 1.2))
  );
  const reputationPremiumEgp = Math.max(
    0,
    Math.round((state.company.reputation - 45) * 0.85)
  );
  const levelBonusEgp = (standing.companyLevel - 1) * 14;
  const returningBonusEgp =
    chosenSource === 'ORGANIC_RETURNING_CLIENT' ? 18 : 0;

  const serviceFeeEgp = Math.max(
    baseOperatingCostEgp + 68,
    baseOperatingCostEgp + 75 + reputationPremiumEgp + levelBonusEgp + returningBonusEgp
  );

  const estimatedOperatingCostPiastres = egpToPiastres(baseOperatingCostEgp);
  const serviceFeePiastres = egpToPiastres(serviceFeeEgp);

  const organicSeq =
    state.shipments.filter((s) => s.trackingNumber.startsWith('TRK-ORG-'))
      .length + 1;
  const trackingNumber = `TRK-ORG-${day}0${organicSeq}`;
  const acceptanceDeadlineTotalMinutes = nowTotal + 240; // 4 hours to decide
  const deadlineMinutesFromMidnight =
    (state.clock.minutesFromMidnight + 240) % 1440;
  const acceptanceDeadlineTimeLabel = formatClockTime(
    deadlineMinutesFromMidnight
  );

  const baseShipmentForAccountant = {
    trackingNumber,
    clientId: targetClient.id,
    clientName: targetClient.name,
    pickupZone,
    deliveryZone,
    description,
    priority: 'NORMAL' as const,
    weightKg,
    weightGrams: Math.round(weightKg * 1000),
    lengthCm: 40,
    widthCm: 30,
    heightCm: 20,
    volumeCm3: Math.round(volumeM3 * 1_000_000),
    volumeM3,
    packageSizeAr,
    distanceKm,
    distanceAccuracyType: route.accuracyType,
    minOperationalHours: 10,
    quotedClientSlaHours: 15,
    clientRequestedSlaHours: 13,
    serviceFeePiastres,
    estimatedOperatingCostPiastres,
    actualOperatingCostPiastres: 0,
    codAmountPiastres,
    paymentTerms,
    accountantProcessed: true,
    organicSourceType: chosenSource,
    organicReasonAr,
    acceptanceDeadlineTotalMinutes,
    acceptanceDeadlineTimeLabel,
  };

  const newOrganicShipment: Shipment = {
    ...baseShipmentForAccountant,
    accountantEstimate: computeShipmentEstimateBreakdown(
      baseShipmentForAccountant,
      'EMP-MAHMOUD',
      'محمود عبد العزيز',
      timeLabel
    ),
    status: 'NEW_REQUEST',
    operationalLocation: 'CLIENT_PREMISES',
    responsibleDepartment: 'MANAGEMENT',
    warehouseId: state.warehouses[0]?.id || 'WH-CAIRO-MAIN',
    revenueEarnedPiastres: 0,
    cashCollectedForFeePiastres: 0,
    receivableOutstandingPiastres: 0,
    codCollectedInCashPiastres: 0,
    codSettledToMerchantPiastres: 0,
    createdAtDay: day,
    createdAtTotalMinutes: nowTotal,
    lastStatusChangeTotalMinutes: nowTotal,
    lastUpdatedTimeLabel: timeLabel,
    expectedDeliveryTotalMinutes: nowTotal + 900,
    expectedDeliveryTimeLabel: formatClockTime(
      (state.clock.minutesFromMidnight + 900) % 1440
    ),
    isDelayed: false,
    requiresManagerIntervention: false,
    attemptCount: 0,
    processedEventKeys: [],
    custodyChain: [],
    timeline: [
      {
        id: `EVT-ORG-${trackingNumber}-1`,
        day,
        timestampLabel: `${timeLabel} — طلب عضوي جديد (${
          chosenSource === 'ORGANIC_RETURNING_CLIENT'
            ? 'عميل عائد'
            : chosenSource === 'ORGANIC_REFERRAL'
              ? 'توصية تجارية'
              : 'اكتشاف مباشر'
        })`,
        totalMinutes: nowTotal,
        status: 'NEW_REQUEST',
        location: 'CLIENT_PREMISES',
        department: 'MANAGEMENT',
        note: `${organicReasonAr} — صافي ربح متوقع: ${formatEGP(serviceFeePiastres - estimatedOperatingCostPiastres)}.`,
      },
    ],
  };

  const sourceLabelShortAr =
    chosenSource === 'ORGANIC_RETURNING_CLIENT'
      ? 'عميل عائد'
      : chosenSource === 'ORGANIC_REFERRAL'
        ? 'توصية تجارية'
        : 'عميل عضوي جديد';

  const existingToasts = state.timedShipmentToasts || [];
  const toastDedupeKey = `TOAST-NEW-ORG-${trackingNumber}`;
  const nextToasts = existingToasts.some((t) => t.dedupeKey === toastDedupeKey)
    ? existingToasts
    : [
        {
          id: `TST-ORG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dedupeKey: toastDedupeKey,
          shipmentId: trackingNumber,
          trackingNumber,
          clientName: targetClient.name,
          stage: 'NEW_ORDER' as const,
          messageAr: `طلب عضوي (${sourceLabelShortAr}): ${trackingNumber} من ${targetClient.name}`,
          durationMs: 2000 as const,
          createdAtMs: Date.now(),
          targetSection: 'SHIPMENTS',
        },
        ...existingToasts,
      ].slice(0, 6);

  let nextState: GameState = {
    ...state,
    clients: nextClients,
    shipments: [...state.shipments, newOrganicShipment],
    timedShipmentToasts: nextToasts,
  };

  // Single-topic concise notification
  nextState = pushNotification(nextState, {
    dedupeKey: `NOTIF-ORG-ORDER-${trackingNumber}`,
    trackingNumber,
    title: `طلب شحن عضوي (${sourceLabelShortAr}): ${trackingNumber}`,
    message: `يا ريس، جالنا أوردر ${sourceLabelShortAr} من «${targetClient.name}» (${pickupZone} ← ${deliveryZone}) بأجر ${formatEGP(serviceFeePiastres)} وصافي ربح متوقع ${formatEGP(serviceFeePiastres - estimatedOperatingCostPiastres)}.`,
    causeReasonAr: organicReasonAr,
    department: 'MANAGEMENT',
    outcomeLabel: `${sourceLabelShortAr} (+${formatEGP(serviceFeePiastres - estimatedOperatingCostPiastres)})`,
    actionRequiredLabel: `مراجعة وقبول الطلب قبل ${acceptanceDeadlineTimeLabel}`,
    targetSection: 'SHIPMENTS',
    severity: 'INFO',
  });

  // Single-topic concise Egyptian Secretary bubble
  nextState = pushInlineBubbleNotification(nextState, {
    dedupeKey: `SEC-ORG-ORDER-${trackingNumber}`,
    sender: 'SECRETARY',
    category: 'DECISION_INSPECTION',
    titleAr: `يا ريس، أوردر ${sourceLabelShortAr} جديد (${trackingNumber})`,
    shortPreviewAr: `«${targetClient.name}» بعت أوردر من ${pickupZone} لـ ${deliveryZone} بدون إعلانات — مكسبه الصافي حوالي ${formatEGP(serviceFeePiastres - estimatedOperatingCostPiastres)}.`,
    factsAr: [
      `سبب الطلب: ${organicReasonAr}.`,
      `أجر الشحن: ${formatEGP(serviceFeePiastres)} • التكلفة المتوقعة: ${formatEGP(estimatedOperatingCostPiastres)} • الصافي: +${formatEGP(serviceFeePiastres - estimatedOperatingCostPiastres)}.`,
    ],
    projectionsAr: [
      `مهلة الرد لحد الساعة ${acceptanceDeadlineTimeLabel}؛ لو اتأخرنا عليه هيروح لشركة منافسة.`,
    ],
    alternativesAr: [
      'افتح قسم الشحنات واقبل الأوردر لو السعة جاهزة، أو فاوضه على السعر.',
    ],
    severity: 'INFO',
    relatedTargetSection: 'SHIPMENTS',
  });

  return {
    nextState,
    generatedShipment: newOrganicShipment,
    acquisitionSource: chosenSource,
    clientIsNew,
  };
}

/**
 * Periodic organic order check during the workday (runs every 180 game minutes / 3 hours).
 * Ensures the company naturally acquires organic clients and returning orders without relying solely on marketing.
 */
export function runOrganicOrdersTickIfDue(state: GameState): GameState {
  const nowTotal = state.clock.totalElapsedMinutes;
  // Check every 180 game minutes (3 hours)
  const bucket3h = Math.floor(nowTotal / 180);
  if (bucket3h <= 3 || (state.lastOrganicOrderTickBucket ?? 0) >= bucket3h) {
    return state;
  }

  let nextState: GameState = {
    ...state,
    lastOrganicOrderTickBucket: bucket3h,
  };

  const standing = evaluateOrganicMarketStanding(nextState);
  if (!standing.canReceiveOrganicNow) {
    return nextState;
  }

  const res = generateOrganicOrderOpportunity(nextState);
  return res.nextState;
}
