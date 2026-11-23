import {
  CompetitorCompany,
  GameState,
  GeographicPromotionalOffer,
  MarketShippingAuction,
  PricingEngineState,
  Shipment,
} from '../types/game';
import { computeShipmentEstimateBreakdown } from './accountingEngine';
import { egpToPiastres, formatClockTime, formatEGP } from './financeEngine';
import {
  calculateEgyptRouteDistance,
  findEgyptLocationByNameOrId,
} from './geographyEngine';
import { pushNotification } from './notificationEngine';

export const MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS = 10; // الحد الأدنى التشغيلي لطلبات المستودع (9-10 ساعات)
export const DEFAULT_QUOTED_CLIENT_SLA_HOURS = 15; // المهلة الافتراضية المبلغة للعميل (15 ساعة لإعطاء هامش أمان 5 ساعات للشركة)

export function createInitialPricingEngineState(): PricingEngineState {
  return {
    mode: 'AUTO',
    baseFeePiastres: egpToPiastres(45), // 45 EGP base fee
    perKmRatePiastres: egpToPiastres(4.5), // 4.5 EGP per km
    perKgSurchargePiastres: egpToPiastres(6), // 6 EGP per extra kg over 5kg
    expressSlaSurchargePiastres: egpToPiastres(35), // +35 EGP when client demands 10h-12h fast SLA
    manualFixedFeePiastres: egpToPiastres(135),
    brackets: [
      {
        id: 'BRK-1',
        labelAr: 'شريحة المسافات القصيرة (0 إلى 10 كم)',
        minKm: 0,
        maxKm: 10,
        pricePiastres: egpToPiastres(95),
      },
      {
        id: 'BRK-2',
        labelAr: 'شريحة القاهرة الكبرى المتوسطة (10 إلى 25 كم)',
        minKm: 10,
        maxKm: 25,
        pricePiastres: egpToPiastres(145),
      },
      {
        id: 'BRK-3',
        labelAr: 'شريحة المدن الجديدة والأطراف (25 إلى 60 كم)',
        minKm: 25,
        maxKm: 60,
        pricePiastres: egpToPiastres(210),
      },
      {
        id: 'BRK-4',
        labelAr: 'شريحة خطوط المحافظات والأقاليم (+60 كم)',
        minKm: 60,
        maxKm: 999,
        pricePiastres: egpToPiastres(340),
      },
    ],
    regionalRules: [
      {
        id: 'REG-CAIRO',
        regionCategory: 'GREATER_CAIRO',
        labelAr: 'نطاق القاهرة الكبرى (القاهرة / الجيزة / القليوبية)',
        basePricePiastres: egpToPiastres(50),
        perKmPiastres: egpToPiastres(4),
      },
      {
        id: 'REG-DELTA',
        regionCategory: 'DELTA',
        labelAr: 'نطاق محافظات الدلتا (طنطا / المنصورة / الزقازيق)',
        basePricePiastres: egpToPiastres(85),
        perKmPiastres: egpToPiastres(2.5),
      },
      {
        id: 'REG-COAST',
        regionCategory: 'CANAL_COAST',
        labelAr: 'نطاق الإسكندرية ومدن القناة',
        basePricePiastres: egpToPiastres(110),
        perKmPiastres: egpToPiastres(2.2),
      },
      {
        id: 'REG-UPPER',
        regionCategory: 'UPPER_EGYPT',
        labelAr: 'نطاق محافظات الصعيد',
        basePricePiastres: egpToPiastres(120),
        perKmPiastres: egpToPiastres(2.4),
      },
    ],
    offers: [
      {
        id: 'OFFER-CAIRO-LAUNCH',
        titleAr: 'عرض انطلاقة العباسية ووسط البلد',
        targetZoneOrGovAr: 'القاهرة',
        discountPercent: 10,
        startsAtDay: 1,
        expiresAtDay: 4,
        active: false,
        attractedOrdersCount: 0,
      },
    ],
  };
}

export function createInitialCompetitors(): CompetitorCompany[] {
  return [
    {
      id: 'COMP-BURAQ',
      nameAr: 'براق إكسبريس للشحن',
      sloganAr: 'نخطف الطرد قبل ما تفكر!',
      tier: 'LOCAL_AGGRESSIVE',
      avgPricePerOrderPiastres: egpToPiastres(125),
      quotedSlaHours: 13,
      reputation: 64,
      marketSharePercent: 32,
      poachedOrdersCount: 0,
      wonAuctionsCount: 1,
      strengthsAr: 'أسعار حارقة واستجابة فورية للطلبات المنسية في الاستقبال',
      weaknessAr: 'معدل تلف وتأخير مرتفع في أوقات الذروة',
    },
    {
      id: 'COMP-DELTA-ARROW',
      nameAr: 'سهم الدلتا اللوجستي',
      sloganAr: 'شبكة محافظات من بحري لقبلي',
      tier: 'REGIONAL_BALANCED',
      avgPricePerOrderPiastres: egpToPiastres(155),
      quotedSlaHours: 14,
      reputation: 71,
      marketSharePercent: 38,
      poachedOrdersCount: 0,
      wonAuctionsCount: 2,
      strengthsAr: 'تغطية قوية لقرى ومراكز الدلتا والقاهرة الكبرى',
      weaknessAr: 'مرونة ضعيفة في التفاوض السريع مع التجار الصغار',
    },
    {
      id: 'COMP-TALQA',
      nameAr: 'طلقة لوجستكس VIP',
      sloganAr: 'دقة الساعة... بسعر الساعة',
      tier: 'PREMIUM_FAST',
      avgPricePerOrderPiastres: egpToPiastres(195),
      quotedSlaHours: 11,
      reputation: 82,
      marketSharePercent: 20,
      poachedOrdersCount: 0,
      wonAuctionsCount: 1,
      strengthsAr: 'التزام صارم بمواعيد التسليم (11-12 ساعة) وتغليف ممتاز',
      weaknessAr: 'تكلفة شحن مرتفعة يرفضها التجار الحساسون للسعر',
    },
  ];
}

export function createInitialMarketAuctions(
  currentDay = 1,
  nowTotalMinutes = 540
): MarketShippingAuction[] {
  return [
    {
      id: `AUC-D${currentDay}-1`,
      clientNameAr: 'مجموعة التوحيد للمنسوجات بالعتبة',
      clientTypeAr: 'تاجر جملة ملابس',
      pickupZoneAr: 'العتبة',
      deliveryZoneAr: 'مدينة نصر',
      distanceKm: 9.8,
      dailyShipmentsCount: 3,
      weightKgPerShipment: 9,
      reserveMaxPricePiastres: egpToPiastres(175),
      minRequiredSlaHours: 12,
      competitorLeadingBidPiastres: egpToPiastres(148),
      competitorLeadingNameAr: 'سهم الدلتا اللوجستي',
      competitorLeadingSlaHours: 14,
      expiresAtTotalMinutes: nowTotalMinutes + 360,
      expiresTimeLabel: formatClockTime((nowTotalMinutes + 360) % 1440),
      status: 'OPEN',
    },
    {
      id: `AUC-D${currentDay}-2`,
      clientNameAr: 'سنتر البستان لتوريد الشاشات',
      clientTypeAr: 'موزع إلكترونيات',
      pickupZoneAr: 'وسط البلد (البستان)',
      deliveryZoneAr: 'المهندسين',
      distanceKm: 6.4,
      weightKgPerShipment: 6.5,
      dailyShipmentsCount: 2,
      reserveMaxPricePiastres: egpToPiastres(210),
      minRequiredSlaHours: 11,
      competitorLeadingBidPiastres: egpToPiastres(182),
      competitorLeadingNameAr: 'طلقة لوجستكس VIP',
      competitorLeadingSlaHours: 12,
      expiresAtTotalMinutes: nowTotalMinutes + 480,
      expiresTimeLabel: formatClockTime((nowTotalMinutes + 480) % 1440),
      status: 'OPEN',
    },
  ];
}

/**
 * Sections 24-25: Calculates customer shipping price AND company operational cost
 * based on the active PricingEngineState, route distance in km, weight in kg, and SLA hours.
 */
export function calculateShipmentPricingQuote(
  state: GameState,
  params: {
    pickupZoneAr: string;
    deliveryZoneAr: string;
    weightKg: number;
    quotedSlaHours?: number;
  }
): {
  distanceKm: number;
  distanceAccuracyType: 'VERIFIED_CORRIDOR' | 'ESTIMATED_METRIC';
  customerPricePiastres: number;
  companyActualCostPiastres: number;
  expectedProfitMarginPiastres: number;
  appliedOfferTitleAr?: string;
  discountPiastres: number;
  pricingExplanationAr: string;
} {
  const pricing = state.pricingEngine || createInitialPricingEngineState();
  const route = calculateEgyptRouteDistance(
    params.pickupZoneAr,
    params.deliveryZoneAr
  );
  const weightKg = Math.max(0.5, params.weightKg);
  const quotedSlaHours = Math.max(
    MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS,
    params.quotedSlaHours ?? DEFAULT_QUOTED_CLIENT_SLA_HOURS
  );

  // Company's actual operational cost (fuel + courier trip + warehouse handling)
  const fuelAndTransitCostEgp = Math.round(18 + route.distanceKm * 1.9 + weightKg * 1.2);
  const warehouseHandlingCostEgp = Math.round(14 + weightKg * 0.8);
  const companyActualCostPiastres = egpToPiastres(
    fuelAndTransitCostEgp + warehouseHandlingCostEgp
  );

  const extraWeightKg = Math.max(0, weightKg - 5);
  const weightSurchargePiastres = Math.round(
    extraWeightKg * pricing.perKgSurchargePiastres
  );
  const expressSurchargePiastres =
    quotedSlaHours <= 12 ? pricing.expressSlaSurchargePiastres : 0;

  let rawCustomerPricePiastres = 0;
  let modeReason = '';

  if (pricing.mode === 'MANUAL') {
    rawCustomerPricePiastres =
      pricing.manualFixedFeePiastres +
      weightSurchargePiastres +
      expressSurchargePiastres;
    modeReason = `تسعير يدوي ثابت (${formatEGP(pricing.manualFixedFeePiastres)})`;
  } else if (pricing.mode === 'BRACKET') {
    const matchedBracket =
      pricing.brackets.find(
        (b) => route.distanceKm >= b.minKm && route.distanceKm <= b.maxKm
      ) || pricing.brackets[pricing.brackets.length - 1];
    rawCustomerPricePiastres =
      matchedBracket.pricePiastres +
      weightSurchargePiastres +
      expressSurchargePiastres;
    modeReason = `${matchedBracket.labelAr} (${route.distanceKm} كم)`;
  } else if (pricing.mode === 'REGIONAL') {
    const toNode = findEgyptLocationByNameOrId(params.deliveryZoneAr);
    const regRule =
      pricing.regionalRules.find(
        (r) => r.regionCategory === toNode.regionCategory
      ) || pricing.regionalRules[0];
    rawCustomerPricePiastres =
      regRule.basePricePiastres +
      Math.round(route.distanceKm * regRule.perKmPiastres) +
      weightSurchargePiastres +
      expressSurchargePiastres;
    modeReason = `${regRule.labelAr} (${route.distanceKm} كم)`;
  } else {
    // AUTO mode
    rawCustomerPricePiastres =
      pricing.baseFeePiastres +
      Math.round(route.distanceKm * pricing.perKmRatePiastres) +
      weightSurchargePiastres +
      expressSurchargePiastres;
    modeReason = `تسعير تلقائي بالكيلومتر (${route.distanceKm} كم × ${formatEGP(pricing.perKmRatePiastres)})`;
  }

  // Check active geographic promotional offers
  const activeOffer = pricing.offers.find(
    (o) =>
      o.active &&
      (params.pickupZoneAr.includes(o.targetZoneOrGovAr) ||
        params.deliveryZoneAr.includes(o.targetZoneOrGovAr) ||
        route.governorateToAr.includes(o.targetZoneOrGovAr))
  );

  const discountPiastres = activeOffer
    ? Math.round((rawCustomerPricePiastres * activeOffer.discountPercent) / 100)
    : 0;
  const customerPricePiastres = Math.max(
    egpToPiastres(35),
    rawCustomerPricePiastres - discountPiastres
  );
  const expectedProfitMarginPiastres =
    customerPricePiastres - companyActualCostPiastres;

  return {
    distanceKm: route.distanceKm,
    distanceAccuracyType: route.accuracyType,
    customerPricePiastres,
    companyActualCostPiastres,
    expectedProfitMarginPiastres,
    appliedOfferTitleAr: activeOffer?.titleAr,
    discountPiastres,
    pricingExplanationAr: `${modeReason}${
      activeOffer
        ? ` — خصم عرض (${activeOffer.titleAr} -${activeOffer.discountPercent}%)`
        : ''
    }`,
  };
}

/**
 * Interactive Client Negotiation Engine (Price + SLA Hours >= 10h operational minimum).
 * - Standard warehouse orders have a minimum operational time of 10 hours.
 * - Default quoted SLA to the client is 15 hours (giving a 5-hour buffer).
 * - If the player negotiates price or delivery SLA hours, the client responds logically
 *   like a real merchant, and the result impacts reputation, client trust, and competitor dynamics.
 */
export function negotiateShipmentWithClient(
  state: GameState,
  trackingNumber: string,
  proposedPricePiastres: number,
  proposedQuotedSlaHours: number
): {
  nextState: GameState;
  accepted: boolean;
  counterOfferPricePiastres?: number;
  counterOfferSlaHours?: number;
  clientReplyAr: string;
} {
  const idx = state.shipments.findIndex(
    (s) => s.trackingNumber === trackingNumber
  );
  if (idx === -1) {
    throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);
  }
  const sh = state.shipments[idx];
  if (sh.status !== 'NEW_REQUEST') {
    throw new Error('لا يمكن التفاوض إلا على الطلبات الجديدة قبل قبولها.');
  }

  const minOpHours =
    sh.minOperationalHours ?? MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS;
  if (proposedQuotedSlaHours < minOpHours) {
    throw new Error(
      `لا يمكن الوعد بتوصيل طلب مستودع قياسي في أقل من الحد الأدنى التشغيلي (${minOpHours} ساعات تشمل الاستلام والفرز والتغليف والتوزيع). تفاوض مع العميل على ${minOpHours} ساعات فأكثر.`
    );
  }

  const client = state.clients.find((c) => c.id === sh.clientId);
  const clientTrust = client?.trustLevel ?? 70;
  const companyRep = state.company.reputation;
  const originalFee = sh.serviceFeePiastres;
  const requestedSla =
    sh.clientRequestedSlaHours ?? DEFAULT_QUOTED_CLIENT_SLA_HOURS;

  // Evaluate price tolerance: higher trust and faster SLA allow higher price
  const slaBonusRatio =
    proposedQuotedSlaHours <= 11
      ? 1.22
      : proposedQuotedSlaHours <= 13
        ? 1.14
        : proposedQuotedSlaHours <= 15
          ? 1.08
          : 0.96;
  const reputationBonusRatio = 1 + (companyRep - 60) * 0.0025;
  const maxAcceptablePricePiastres = Math.round(
    originalFee * slaBonusRatio * reputationBonusRatio
  );

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  if (
    proposedPricePiastres <= maxAcceptablePricePiastres &&
    proposedQuotedSlaHours <= Math.max(15, requestedSla + 2)
  ) {
    // Client accepts the negotiated terms!
    const updatedEstimate = computeShipmentEstimateBreakdown(
      { ...sh, serviceFeePiastres: proposedPricePiastres },
      'EMP-MAHMOUD',
      'محمود عبد العزيز',
      timeLabel
    );

    const updatedShipment: Shipment = {
      ...sh,
      serviceFeePiastres: proposedPricePiastres,
      quotedClientSlaHours: proposedQuotedSlaHours,
      minOperationalHours: minOpHours,
      Negotiated: true,
      accountantEstimate: updatedEstimate,
      timeline: [
        ...sh.timeline,
        {
          id: `EVT-NEG-${state.company.currentDay}-${sh.timeline.length + 1}`,
          day: state.company.currentDay,
          timestampLabel: `${timeLabel} — اتفاق تفاوض مع العميل`,
          totalMinutes: state.clock.totalElapsedMinutes,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MANAGEMENT',
          note: `تم الاتفاق مع (${sh.clientName}) على سعر شحن ${formatEGP(proposedPricePiastres)} ومهلة تسليم للعميل خلال ${proposedQuotedSlaHours} ساعة (الحد الأدنى التشغيلي ${minOpHours} ساعات).`,
        },
      ],
    };

    const nextShipments = [...state.shipments];
    nextShipments[idx] = updatedShipment;

    const clientReplyAr =
      proposedQuotedSlaHours < DEFAULT_QUOTED_CLIENT_SLA_HOURS
        ? `موافق يا فندم! تسليم خلال ${proposedQuotedSlaHours} ساعة بسعر ${formatEGP(proposedPricePiastres)} ممتاز جداً لشغلنا، اعتمد الطرد فوراً.`
        : `اتفقنا على ${formatEGP(proposedPricePiastres)} ومهلة ${proposedQuotedSlaHours} ساعة عشان نضمن وصول البضاعة سليمة ومن غير استعجال يضر الطرد.`;

    const nextState: GameState = {
      ...state,
      shipments: nextShipments,
      clients: state.clients.map((c) =>
        c.id === sh.clientId
          ? { ...c, trustLevel: Math.min(100, c.trustLevel + 2) }
          : c
      ),
    };

    return {
      nextState,
      accepted: true,
      clientReplyAr,
    };
  }

  // Client makes a realistic counter-offer instead of blindly walking away
  const counterPrice = Math.max(
    sh.estimatedOperatingCostPiastres + egpToPiastres(25),
    Math.round((originalFee + maxAcceptablePricePiastres) / 2)
  );
  const counterSla = Math.max(
    minOpHours,
    Math.min(15, Math.round((requestedSla + proposedQuotedSlaHours) / 2))
  );

  const competitorName =
    state.competitors?.[0]?.nameAr || 'براق إكسبريس للشحن';

  const clientReplyAr =
    proposedPricePiastres > maxAcceptablePricePiastres
      ? `السعر ده (${formatEGP(proposedPricePiastres)}) عالي علينا يا ريس، شركة «${competitorName}» عرضت سعر أقل! آخر كلام عندي ${formatEGP(counterPrice)} والتسليم خلال ${counterSla} ساعة (فوق الحد الأدنى ${minOpHours} ساعات).`
      : `العميل بتاعي مستعجل ومش هيقدر ينتظر ${proposedQuotedSlaHours} ساعة! نقدر نتفق على ${counterSla} ساعة بسعر ${formatEGP(counterPrice)}؟`;

  // Update the shipment with the client's counter-offer so the player can accept it with 1 click
  const updatedEstimate = computeShipmentEstimateBreakdown(
    { ...sh, serviceFeePiastres: counterPrice },
    'EMP-MAHMOUD',
    'محمود عبد العزيز',
    timeLabel
  );

  const updatedShipment: Shipment = {
    ...sh,
    serviceFeePiastres: counterPrice,
    quotedClientSlaHours: counterSla,
    minOperationalHours: minOpHours,
    Negotiated: true,
    accountantEstimate: updatedEstimate,
  };

  const nextShipments = [...state.shipments];
  nextShipments[idx] = updatedShipment;

  return {
    nextState: {
      ...state,
      shipments: nextShipments,
    },
    accepted: false,
    counterOfferPricePiastres: counterPrice,
    counterOfferSlaHours: counterSla,
    clientReplyAr,
  };
}

/**
 * Handles competitive Order Poaching when the player forgets to accept/reject a NEW_REQUEST
 * before its `acceptanceDeadlineTotalMinutes`.
 * - A rival shipping company poaches the order (`يسحب الأوردر لشركة منافسة`).
 * - Player's reputation drops logically (-2), and the client leaves a realistic reaction
 *   (sometimes satirical, sometimes calm, occasionally a logical complaint—never exaggerated).
 */
export function poachExpiredOrderByCompetitor(
  state: GameState,
  shipmentIndex: number
): GameState {
  const sh = state.shipments[shipmentIndex];
  if (!sh) return state;

  const expireKey = `EXPIRE-ACCEPT-${sh.trackingNumber}`;
  if (sh.processedEventKeys.includes(expireKey)) return state;

  const nowTotal = state.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const competitors = state.competitors || createInitialCompetitors();
  const poacherIdx =
    (sh.trackingNumber.charCodeAt(sh.trackingNumber.length - 1) +
      state.company.currentDay) %
    competitors.length;
  const poacher = competitors[poacherIdx] || competitors[0];

  // Realistic, varied client reaction (satirical / analytical / mild complaint — not exaggerated)
  const reactionMode = sh.trackingNumber.charCodeAt(4) % 3;
  const clientReactionNoteAr =
    reactionMode === 0
      ? `تعليق ساخر من (${sh.clientName}): «يبدو أن الاستقبال في انجوبيا إكسبريس كان بيشرب شاي بالنعناع! سلمنا الطرد لشركة ${poacher.nameAr} وربنا يعوض.»`
      : reactionMode === 1
        ? `ملاحظة هادئة من (${sh.clientName}): «انتظرنا ردكم حتى انتهاء المهلة (${sh.acceptanceDeadlineTimeLabel || ''}) ثم حولنا الشحنة إلى ${poacher.nameAr} لالتزامنا بموعد مع المستلم.»`
        : `شكوى منطقية من (${sh.clientName}): «تأخر البت في طلب الشحن ${sh.trackingNumber} عطل خط التوزيع لدينا واضطررنا للتعاقد الفوري مع ${poacher.nameAr}.»`;

  const expiredShipment: Shipment = {
    ...sh,
    status: 'CANCELLED_EXPIRED',
    operationalLocation: 'CLIENT_PREMISES',
    responsibleDepartment: 'COMPLETED',
    lastStatusChangeTotalMinutes: nowTotal,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: undefined,
    poachedByCompetitorId: poacher.id,
    poachedByCompetitorName: poacher.nameAr,
    clientReactionNoteAr,
    failureReason: `انتهت مهلة القرار وسحبت شركة «${poacher.nameAr}» الطلب من العميل`,
    processedEventKeys: [...sh.processedEventKeys, expireKey],
    timeline: [
      ...sh.timeline,
      {
        id: `EVT-${state.company.currentDay}-${sh.timeline.length + 1}`,
        day: state.company.currentDay,
        timestampLabel: `${timeLabel} — سحب الأوردر لشركة منافسة (${poacher.nameAr})`,
        totalMinutes: nowTotal,
        status: 'CANCELLED_EXPIRED',
        location: 'CLIENT_PREMISES',
        department: 'MANAGEMENT',
        note: `انتهت مهلة القبول (${sh.acceptanceDeadlineTimeLabel || ''}) دون قرار، فخطف المنافس «${poacher.nameAr}» الشحنة. ${clientReactionNoteAr}`,
      },
    ],
  };

  const copyShipments = [...state.shipments];
  copyShipments[shipmentIndex] = expiredShipment;

  const updatedCompetitors = competitors.map((c, idx) =>
    idx === poacherIdx
      ? {
          ...c,
          poachedOrdersCount: c.poachedOrdersCount + 1,
          marketSharePercent: Math.min(60, c.marketSharePercent + 1),
        }
      : c
  );

  const updatedClients = state.clients.map((c) =>
    c.id === sh.clientId
      ? {
          ...c,
          trustLevel: Math.max(0, c.trustLevel - 4),
          history: [
            ...c.history,
            {
              id: `HIST-${state.company.currentDay}-${c.history.length + 1}`,
              day: state.company.currentDay,
              summary: `سحبت شركة (${poacher.nameAr}) الشحنة ${sh.trackingNumber} بعد انتهاء مهلة الرد`,
              trustDelta: -4,
            },
          ],
        }
      : c
  );

  const updatedSituations = state.situations.map((sit) =>
    sit.relatedShipmentTracking === sh.trackingNumber && !sit.resolved
      ? {
          ...sit,
          resolved: true,
          outcomeSummary: `انتهت مهلة قبول الشحنة ${sh.trackingNumber} وسحبتها شركة «${poacher.nameAr}».`,
        }
      : sit
  );

  // Reputation drops modestly (-2), not exaggerated
  let nextState: GameState = {
    ...state,
    shipments: copyShipments,
    situations: updatedSituations,
    competitors: updatedCompetitors,
    clients: updatedClients,
    company: {
      ...state.company,
      reputation: Math.max(0, state.company.reputation - 2),
      customerSatisfaction: Math.max(
        0,
        state.company.customerSatisfaction - 2
      ),
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: expireKey,
    trackingNumber: sh.trackingNumber,
    title: `المنافس «${poacher.nameAr}» خطف الشحنة ${sh.trackingNumber}!`,
    message: `نسيت اتخاذ قرار في الشحنة ${sh.trackingNumber} قبل (${sh.acceptanceDeadlineTimeLabel || ''})، فسحبتها شركة «${poacher.nameAr}» وتراجعت سمعتك (-2). ${clientReactionNoteAr}`,
    department: 'MANAGEMENT',
    outcomeLabel: `سُحبت للمنافس (${poacher.nameAr})`,
    severity: 'URGENT',
  });

  return nextState;
}

/**
 * Allows the player to submit a competitive bid in a B2B Market Shipping Auction (`مزاد تسعير تنافسي`).
 */
export function submitMarketAuctionBid(
  state: GameState,
  auctionId: string,
  playerBidPiastres: number,
  playerCommittedSlaHours: number
): GameState {
  if (playerCommittedSlaHours < MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS) {
    throw new Error(
      `لا يمكن المزايدة بمهلة أقل من الحد الأدنى التشغيلي (${MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS} ساعات).`
    );
  }

  const auctions =
    state.marketAuctions ||
    createInitialMarketAuctions(
      state.company.currentDay,
      state.clock.totalElapsedMinutes
    );
  const aucIdx = auctions.findIndex((a) => a.id === auctionId);
  if (aucIdx === -1) {
    throw new Error('المزاد المطلوب غير موجود.');
  }

  const auction = auctions[aucIdx];
  if (auction.status !== 'OPEN') {
    throw new Error('هذا المزاد مغلق بالفعل.');
  }

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const nowTotal = state.clock.totalElapsedMinutes;

  // Multi-factor auction evaluation:
  // 1. Price competitiveness
  const playerPriceFactor = (auction.reserveMaxPricePiastres - playerBidPiastres) / 100;
  const compPriceFactor =
    (auction.reserveMaxPricePiastres - auction.competitorLeadingBidPiastres) / 100;

  // 2. SLA / Contract speed commitment
  const playerSlaFactor = (16 - playerCommittedSlaHours) * 11;
  const compSlaFactor = (16 - auction.competitorLeadingSlaHours) * 11;

  // 3. Reputation & Profile Trust
  const profileBonus = state.companyProfile?.trustBonusEarned ?? 0;
  const playerRepFactor = (state.company.reputation + profileBonus) * 0.55;
  const compRepFactor = 71 * 0.55;

  // 4. Operational Capacity (active couriers + operational vehicles)
  const activeCouriersCount = state.couriers.filter(
    (c) =>
      c.status !== 'UNAVAILABLE' &&
      (c.ownsPersonalMotorcycle || Boolean(c.vehicleId))
  ).length;
  const operationalVehiclesCount = state.vehicles.filter(
    (v) => v.status !== 'NEEDS_MAINTENANCE'
  ).length;
  const capacityRatio = Math.min(
    1.25,
    (activeCouriersCount * 3 + operationalVehiclesCount * 2) /
      Math.max(3, auction.dailyShipmentsCount)
  );
  const playerCapacityFactor = capacityRatio * 14;
  const compCapacityFactor = 1.0 * 14;

  // 5. Zone Coverage (branches or Wakkelny zones covering pickup/delivery)
  const coveredZones = state.companyProfile?.coveredZonesAr || [];
  const hasZoneMatch =
    coveredZones.some(
      (z) =>
        auction.pickupZoneAr.includes(z) || auction.deliveryZoneAr.includes(z)
    ) ||
    (state.branches || []).some((b) => b.active);
  const playerZoneFactor = hasZoneMatch ? 8 : 3;
  const compZoneFactor = 6;

  // 6. Reliability (on-time delivery history vs delayed/failed)
  const deliveredCount = state.shipments.filter((s) => s.status === 'DELIVERED').length;
  const failedCount = state.shipments.filter(
    (s) => s.status === 'DELIVERY_FAILED' || s.status === 'CANCELLED_EXPIRED'
  ).length;
  const reliabilityRatio =
    deliveredCount + failedCount > 0
      ? deliveredCount / (deliveredCount + failedCount)
      : 0.82;
  const playerReliabilityFactor = reliabilityRatio * 12;
  const compReliabilityFactor = 0.8 * 12;

  const playerScore =
    playerPriceFactor +
    playerSlaFactor +
    playerRepFactor +
    playerCapacityFactor +
    playerZoneFactor +
    playerReliabilityFactor;

  const competitorScore =
    compPriceFactor +
    compSlaFactor +
    compRepFactor +
    compCapacityFactor +
    compZoneFactor +
    compReliabilityFactor;

  const wonByPlayer =
    playerBidPiastres <= auction.reserveMaxPricePiastres &&
    playerScore >= competitorScore;

  const updatedAuction: MarketShippingAuction = {
    ...auction,
    status: wonByPlayer ? 'WON_BY_PLAYER' : 'WON_BY_COMPETITOR',
    playerBidPiastres,
    playerCommittedSlaHours,
    outcomeSummaryAr: wonByPlayer
      ? `فازت «${state.company.name}» بالمزاد (نقاط التقييم الشامل: ${Math.round(playerScore)} مقابل ${Math.round(competitorScore)}) بفضل توازن السعر (${formatEGP(playerBidPiastres)})، مهلة الـ ${playerCommittedSlaHours} ساعة، السمعة (${state.company.reputation}/100)، والقدرة التشغيلية المتاحة!`
      : `حسمت شركة «${auction.competitorLeadingNameAr}» المزاد لصالحها (نقاط التقييم: ${Math.round(competitorScore)} مقابل ${Math.round(playerScore)}) لأن معادلة السعر (${formatEGP(auction.competitorLeadingBidPiastres)}) والمهلة (${auction.competitorLeadingSlaHours} ساعة) والقدرة التشغيلية وتغطية المنطقة كانت أقوى.`,
  };

  const nextAuctions = [...auctions];
  nextAuctions[aucIdx] = updatedAuction;

  let nextShipments = [...state.shipments];
  const nextToasts = [...(state.timedShipmentToasts || [])];

  if (wonByPlayer) {
    // Generate the first high-priority auction shipment immediately into NEW_REQUEST
    const trkNum = `TRK-AUC-${state.company.currentDay}${state.shipments.length + 1}`;
    const quote = calculateShipmentPricingQuote(state, {
      pickupZoneAr: auction.pickupZoneAr,
      deliveryZoneAr: auction.deliveryZoneAr,
      weightKg: auction.weightKgPerShipment,
      quotedSlaHours: playerCommittedSlaHours,
    });

    const newAuctionShipment: Shipment = {
      trackingNumber: trkNum,
      clientId: 'CLI-SAEED',
      clientName: auction.clientNameAr,
      pickupZone: auction.pickupZoneAr,
      deliveryZone: auction.deliveryZoneAr,
      description: `دفعة شحن مزاد تنافسي (${auction.dailyShipmentsCount} طرود مجمعة) — ${auction.clientTypeAr}`,
      priority: 'HIGH',
      weightKg: auction.weightKgPerShipment,
      weightGrams: Math.round(auction.weightKgPerShipment * 1000),
      lengthCm: 42,
      widthCm: 32,
      heightCm: 25,
      volumeCm3: 33600,
      volumeM3: 0.34,
      packageSizeAr: 'طرد مزاد تجاري',
      distanceKm: auction.distanceKm,
      distanceAccuracyType: quote.distanceAccuracyType,
      minOperationalHours: MIN_WAREHOUSE_OPERATIONAL_SLA_HOURS,
      quotedClientSlaHours: playerCommittedSlaHours,
      serviceFeePiastres: playerBidPiastres * auction.dailyShipmentsCount,
      estimatedOperatingCostPiastres: Math.round(
        quote.companyActualCostPiastres * auction.dailyShipmentsCount * 0.85
      ),
      actualOperatingCostPiastres: 0,
      codAmountPiastres: 0,
      paymentTerms: 'PREPAID_CASH',
      accountantProcessed: true,
      accountantEstimate: computeShipmentEstimateBreakdown(
        {
          serviceFeePiastres: playerBidPiastres * auction.dailyShipmentsCount,
          estimatedOperatingCostPiastres: Math.round(
            quote.companyActualCostPiastres * auction.dailyShipmentsCount * 0.85
          ),
          codAmountPiastres: 0,
          weightKg: auction.weightKgPerShipment,
          volumeM3: 0.34,
        },
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
      createdAtDay: state.company.currentDay,
      createdAtTotalMinutes: nowTotal,
      acceptanceDeadlineTotalMinutes: nowTotal + 180,
      acceptanceDeadlineTimeLabel: formatClockTime((nowTotal + 180) % 1440),
      lastStatusChangeTotalMinutes: nowTotal,
      lastUpdatedTimeLabel: timeLabel,
      expectedDeliveryTotalMinutes: nowTotal + playerCommittedSlaHours * 60,
      expectedDeliveryTimeLabel: formatClockTime(
        (nowTotal + playerCommittedSlaHours * 60) % 1440
      ),
      isDelayed: false,
      requiresManagerIntervention: false,
      attemptCount: 0,
      Negotiated: true,
      processedEventKeys: [],
      timeline: [
        {
          id: `EVT-AUC-${trkNum}-1`,
          day: state.company.currentDay,
          timestampLabel: `${timeLabel} — ترسية مزاد شحن تنافسي`,
          totalMinutes: nowTotal,
          status: 'NEW_REQUEST',
          location: 'CLIENT_PREMISES',
          department: 'MANAGEMENT',
          note: `فازت الشركة بمزاد (${auction.clientNameAr}) بإجمالي ${formatEGP(playerBidPiastres * auction.dailyShipmentsCount)} ومهلة تسليم ${playerCommittedSlaHours} ساعة.`,
        },
      ],
    };
    nextShipments = [newAuctionShipment, ...nextShipments];
    nextToasts.unshift({
      id: `TOAST-NEW-${trkNum}`,
      dedupeKey: `TOAST-NEW-${trkNum}`,
      shipmentId: trkNum,
      trackingNumber: trkNum,
      clientName: auction.clientNameAr,
      stage: 'NEW_ORDER',
      messageAr: `أوردر جديد من مزاد ${auction.clientNameAr} (${trkNum}) — راجعه الآن`,
      durationMs: 2000,
      createdAtMs: Date.now(),
      targetSection: 'SHIPMENTS',
    });
  }

  const currentMastery = state.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          testedAuctionOrPricing: true,
        },
      }
    : undefined;

  let nextState: GameState = {
    ...state,
    marketAuctions: nextAuctions,
    shipments: nextShipments,
    timedShipmentToasts: nextToasts.slice(0, 12),
    onboardingMastery: updatedMastery,
    company: {
      ...state.company,
      reputation: wonByPlayer
        ? Math.min(100, state.company.reputation + 2)
        : state.company.reputation,
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `AUCTION-BID-${auctionId}`,
    title: wonByPlayer
      ? `فزت بمزاد (${auction.clientNameAr})!`
      : `خسرت مزاد (${auction.clientNameAr}) لصالح منافس`,
    message: updatedAuction.outcomeSummaryAr || '',
    department: 'MANAGEMENT',
    outcomeLabel: wonByPlayer ? 'فوز بالمزاد وإضافة شحنة' : 'فوز المنافس',
    severity: wonByPlayer ? 'SUCCESS' : 'WARNING',
  });

  return nextState;
}

/**
 * Updates the company's Pricing Engine configuration and toggles geographic promotional offers.
 */
export function updatePricingEngineConfig(
  state: GameState,
  patch: Partial<PricingEngineState>
): GameState {
  const current = state.pricingEngine || createInitialPricingEngineState();
  const currentMastery = state.onboardingMastery;
  return {
    ...state,
    onboardingMastery: currentMastery
      ? {
          ...currentMastery,
          appliedSystems: {
            ...currentMastery.appliedSystems,
            testedAuctionOrPricing: true,
          },
        }
      : undefined,
    pricingEngine: {
      ...current,
      ...patch,
    },
  };
}

export function launchGeographicPromoOffer(
  state: GameState,
  titleAr: string,
  targetZoneOrGovAr: string,
  discountPercent: number
): GameState {
  const current = state.pricingEngine || createInitialPricingEngineState();
  const newOffer: GeographicPromotionalOffer = {
    id: `OFFER-${state.company.currentDay}-${current.offers.length + 1}`,
    titleAr: titleAr.trim() || `عرض شحن ${targetZoneOrGovAr}`,
    targetZoneOrGovAr,
    discountPercent: Math.max(5, Math.min(35, discountPercent)),
    startsAtDay: state.company.currentDay,
    expiresAtDay: state.company.currentDay + 3,
    active: true,
    attractedOrdersCount: 1,
  };

  let nextState: GameState = {
    ...state,
    pricingEngine: {
      ...current,
      offers: [newOffer, ...current.offers],
    },
    company: {
      ...state.company,
      marketingPower: Math.min(
        100,
        (state.company.marketingPower ?? 55) + 4
      ),
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: newOffer.id,
    title: `تفعيل عرض جغرافي: ${newOffer.titleAr}`,
    message: `تم تفعيل خصم ${newOffer.discountPercent}% على شحنات (${targetZoneOrGovAr}) لمدة 3 أيام لرفع القوة التسويقية وجذب التجار.`,
    department: 'MARKETING',
    outcomeLabel: `خصم ${newOffer.discountPercent}% (${targetZoneOrGovAr})`,
    severity: 'SUCCESS',
  });

  return nextState;
}
