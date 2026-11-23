import {
  GameState,
  PlatformDirectOrder,
  WakkelnyOrderTimingBreakdown,
  WakkelnyZoneAllocation,
} from '../types/game';
import {
  checkVehicleCapacityFit,
  ensureBusinessDeveloperState,
  resolveCourierEffectiveVehicle,
} from './businessDeveloperEngine';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { calculateEgyptRouteDistance } from './geographyEngine';
import { pushInlineBubbleNotification } from './guideAndSecretaryEngine';
import { pushNotification } from './notificationEngine';

export const DEFAULT_WAKKELNY_LAUNCH_HUB = 'العباسية — المقر التشغيلي';

export function createInitialWakkelnyZones(
  defaultCourierIds: string[] = []
): WakkelnyZoneAllocation[] {
  return [
    {
      zoneId: 'WAK-ZONE-NASR-HELIOPOLIS',
      zoneNameAr: 'مدينة نصر ومصر الجديدة',
      sector: 'EAST',
      geographicScopeAr:
        'عباس العقاد، مكرم عبيد، الكوربة، الميرغني، وميدان روكسي (نطاق 8 كم)',
      partnerRestaurantsAr: [
        'مشويات الحاتي الأصيل — مدينة نصر',
        'شاورما الريم الدمشقي — الكوربة',
        'برجر فاكتوري — الميرغني',
      ],
      potentialCustomersCount: 1450,
      allocatedCourierIds: defaultCourierIds.slice(0, 1),
      currentActiveOrdersCount: 0,
      expectedHourlyDemand: 4,
      peakHoursLabelAr: '01:00 PM – 04:00 PM و 08:00 PM – 11:00 PM',
      avgTripCostPiastres: egpToPiastres(22),
      avgDeliveryTariffPiastres: egpToPiastres(85),
      speedBonusThresholdMinutes: 35,
      speedBonusAmountPiastres: egpToPiastres(20),
    },
    {
      zoneId: 'WAK-ZONE-DOWNTOWN-ABBASIYA',
      zoneNameAr: 'وسط البلد والعباسية والزمالك',
      sector: 'CENTRAL',
      geographicScopeAr:
        'العباسية، ميدان التحرير، طلعت حرب، الزمالك، وغمرة (نطاق 6.5 كم)',
      partnerRestaurantsAr: [
        'كشري التحرير الملكي — وسط البلد',
        'فطائر الحسين الساخنة — العباسية',
        'بيسترو النيل — الزمالك',
      ],
      potentialCustomersCount: 1620,
      allocatedCourierIds: defaultCourierIds.slice(1, 2),
      currentActiveOrdersCount: 0,
      expectedHourlyDemand: 5,
      peakHoursLabelAr: '12:00 PM – 03:30 PM و 07:00 PM – 10:30 PM',
      avgTripCostPiastres: egpToPiastres(18),
      avgDeliveryTariffPiastres: egpToPiastres(78),
      speedBonusThresholdMinutes: 30,
      speedBonusAmountPiastres: egpToPiastres(18),
    },
    {
      zoneId: 'WAK-ZONE-DOKKI-MOHANDESSIN',
      zoneNameAr: 'الدقي والمهندسين والعجوزة',
      sector: 'WEST',
      geographicScopeAr:
        'شارع جامعة الدول، مصدق، ميدان الدقي، والبطل أحمد عبد العزيز (نطاق 9 كم)',
      partnerRestaurantsAr: [
        'بيتزا نابولي الساخنة — الدقي',
        'أسماك بحري الطازجة — المهندسين',
        'سوشي وأندومي ووك — جامعة الدول',
      ],
      potentialCustomersCount: 1380,
      allocatedCourierIds: [],
      currentActiveOrdersCount: 0,
      expectedHourlyDemand: 4,
      peakHoursLabelAr: '02:00 PM – 05:00 PM و 08:30 PM – 11:30 PM',
      avgTripCostPiastres: egpToPiastres(25),
      avgDeliveryTariffPiastres: egpToPiastres(92),
      speedBonusThresholdMinutes: 38,
      speedBonusAmountPiastres: egpToPiastres(22),
    },
    {
      zoneId: 'WAK-ZONE-MAADI-SOUTH',
      zoneNameAr: 'المعادي وجنوب القاهرة',
      sector: 'SOUTH',
      geographicScopeAr:
        'شارع 9 بالمعادي، دجلة، زهراء المعادي، وكورنيش المعادي (نطاق 11 كم)',
      partnerRestaurantsAr: [
        'برجر شارع 9 — المعادي',
        'مطبخ دجلة الإيطالي — المعادي',
      ],
      potentialCustomersCount: 980,
      allocatedCourierIds: [],
      currentActiveOrdersCount: 0,
      expectedHourlyDemand: 3,
      peakHoursLabelAr: '01:30 PM – 04:30 PM و 07:30 PM – 10:30 PM',
      avgTripCostPiastres: egpToPiastres(28),
      avgDeliveryTariffPiastres: egpToPiastres(105),
      speedBonusThresholdMinutes: 42,
      speedBonusAmountPiastres: egpToPiastres(25),
    },
  ];
}

export function ensureWakkelnyZonesInitialized(state: GameState): GameState {
  const nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  if (bd.wakkelnyZones && bd.wakkelnyZones.length > 0) {
    return nextState;
  }
  const activeCourierIds = nextState.couriers
    .filter((c) => c.status !== 'UNAVAILABLE')
    .map((c) => c.id);

  return {
    ...nextState,
    businessDeveloper: {
      ...bd,
      wakkelnyLaunchHubAr:
        bd.wakkelnyLaunchHubAr || DEFAULT_WAKKELNY_LAUNCH_HUB,
      wakkelnyZones: createInitialWakkelnyZones(activeCourierIds),
      orderTimingsById: bd.orderTimingsById || {},
    },
  };
}

/**
 * Sets the Wakkelny Launch Hub (`مقر الانطلاق`) and updates courier allocations across service zones.
 */
export function configureWakkelnyHubAndZoneCouriers(
  state: GameState,
  launchHubAr: string,
  zoneId: string,
  allocatedCourierIds: string[]
): GameState {
  let nextState = ensureWakkelnyZonesInitialized(state);
  const bd = nextState.businessDeveloper!;
  const zones = bd.wakkelnyZones || [];

  const targetZone = zones.find((z) => z.zoneId === zoneId);
  if (!targetZone) {
    throw new Error('منطقة خدمة وكلني المطلوبة غير موجودة.');
  }

  // Ensure a courier is only allocated to one primary Wakkelny service zone at a time
  const uniqueCourierIds = Array.from(new Set(allocatedCourierIds));
  const updatedZones = zones.map((z) => {
    if (z.zoneId === zoneId) {
      return {
        ...z,
        allocatedCourierIds: uniqueCourierIds,
      };
    }
    return {
      ...z,
      allocatedCourierIds: z.allocatedCourierIds.filter(
        (cid) => !uniqueCourierIds.includes(cid)
      ),
    };
  });

  // Also update courier.zoneAr to reflect their assigned zone
  const updatedCouriers = nextState.couriers.map((c) => {
    if (!uniqueCourierIds.includes(c.id)) return c;
    return {
      ...c,
      zoneAr: targetZone.zoneNameAr,
    };
  });

  nextState = {
    ...nextState,
    couriers: updatedCouriers,
    businessDeveloper: {
      ...bd,
      wakkelnyLaunchHubAr: launchHubAr.trim() || DEFAULT_WAKKELNY_LAUNCH_HUB,
      wakkelnyZones: updatedZones,
    },
  };

  return pushInlineBubbleNotification(nextState, {
    dedupeKey: `WAK-ZONE-CFG-${zoneId}-${uniqueCourierIds.join(',')}`,
    sender: 'SECRETARY',
    category: 'WAKKELNY_ALERT',
    titleAr: `تحديث تغطية منطقة «${targetZone.zoneNameAr}» في وكلني`,
    shortPreviewAr: `تم تخصيص ${uniqueCourierIds.length} مندوب لمنطقة (${targetZone.zoneNameAr}) بمقر انطلاق (${launchHubAr}).`,
    factsAr: [
      `المنطقة: ${targetZone.zoneNameAr} — النطاق: ${targetZone.geographicScopeAr}.`,
      `عدد المندوبين المخصصين للمنطقة الآن: ${uniqueCourierIds.length} مندوب.`,
      `متوسط الطلب المتوقع: ${targetZone.expectedHourlyDemand} طلبات/ساعة (ذروة: ${targetZone.peakHoursLabelAr}).`,
    ],
    projectionsAr: [
      uniqueCourierIds.length === 0
        ? 'ترك المنطقة بدون مندوب مخصص سيمنع الإسناد العادي لطلباتها ويتطلب تغطية استثنائية أعلى تكلفة.'
        : `تخصيص ${uniqueCourierIds.length} مندوب يقلل زمن الوصول للمطاعم ويزيد فرص كسب مكافأة السرعة (+${formatEGP(targetZone.speedBonusAmountPiastres)}).`,
    ],
    alternativesAr: [
      'راقب توازن المندوبين بين المناطق وفق أوقات الذروة.',
    ],
    severity: uniqueCourierIds.length > 0 ? 'SUCCESS' : 'WARNING',
  });
}

/**
 * Matches a Wakkelny order to its corresponding service zone.
 */
export function resolveWakkelnyZoneForOrder(
  state: GameState,
  order: PlatformDirectOrder
): WakkelnyZoneAllocation | undefined {
  const zones = state.businessDeveloper?.wakkelnyZones || [];
  return (
    zones.find(
      (z) =>
        z.zoneNameAr.includes(order.pickupZone) ||
        z.zoneNameAr.includes(order.deliveryZone) ||
        order.pickupZone.includes(z.zoneNameAr) ||
        z.sector === order.directionSector
    ) || zones[0]
  );
}

/**
 * Calculates granular food order timing for Wakkelny:
 * - Never applies the 10-hour warehouse minimum! Food orders operate on a realistic minutes model (20–55 mins).
 * - Explicitly separates:
 *   1. Distance & transit time to restaurant (`distanceToRestaurantKm`, `transitToRestaurantMinutes`)
 *   2. Restaurant prep time (`restaurantPrepMinutes`) & Courier wait time at restaurant (`courierWaitAtRestaurantMinutes`)
 *   3. Distance & transit time from restaurant to client (`distanceRestaurantToClientKm`, `transitToClientMinutes`)
 *   4. Virtual traffic congestion factor (`virtualTrafficFactor`)
 *   5. Vehicle & load + other assigned orders on the same courier (`otherAssignedOrdersDelayMinutes`)
 *   6. Exceptional out-of-zone coverage cost and time (`isExceptionalOutOfZoneCoverage`, `exceptionalExtraCostPiastres`)
 */
export function calculateWakkelnyOrderTimingBreakdown(
  state: GameState,
  order: PlatformDirectOrder,
  courierId: string,
  options?: {
    extraRestaurantKitchenDelayMinutes?: number;
    extraCourierRoadDelayMinutes?: number;
  }
): WakkelnyOrderTimingBreakdown {
  const nextState = ensureWakkelnyZonesInitialized(state);
  const bd = nextState.businessDeveloper!;
  const courier = nextState.couriers.find((c) => c.id === courierId);
  const vehicle = courier
    ? resolveCourierEffectiveVehicle(nextState, courier)
    : null;
  const zone = resolveWakkelnyZoneForOrder(nextState, order);

  const isAllocatedToThisZone = Boolean(
    zone && courier && zone.allocatedCourierIds.includes(courier.id)
  );

  // Distance from courier's current zone / launch hub to the restaurant
  const courierOriginAr = isAllocatedToThisZone
    ? order.pickupZone
    : courier?.zoneAr || bd.wakkelnyLaunchHubAr || 'العباسية';

  const toRestaurantRoute = calculateEgyptRouteDistance(
    courierOriginAr,
    order.pickupZone
  );
  const restaurantToClientRoute = calculateEgyptRouteDistance(
    order.pickupZone,
    order.deliveryZone
  );

  const distanceToRestaurantKm = isAllocatedToThisZone
    ? Math.min(2.8, toRestaurantRoute.distanceKm)
    : Math.max(6.5, toRestaurantRoute.distanceKm);

  const distanceRestaurantToClientKm = Math.max(
    2.2,
    restaurantToClientRoute.distanceKm
  );

  // Virtual traffic congestion based on time of day & active traffic events
  const clockMins = nextState.clock.minutesFromMidnight;
  const isPeakHour =
    (clockMins >= 780 && clockMins <= 990) || // 1:00 PM - 4:30 PM
    (clockMins >= 1170 && clockMins <= 1380); // 7:30 PM - 11:00 PM
  const hasTrafficEvent = (bd.dynamicEvents || []).some(
    (e) => e.active && e.type === 'TRAFFIC_CONGESTION'
  );
  const virtualTrafficFactor =
    (isPeakHour ? 1.22 : 1.0) * (hasTrafficEvent ? 1.18 : 1.0);

  // Vehicle speed & load factor
  const vehicleSpeedKmH =
    vehicle?.vehicleClass === 'MOTORCYCLE' ? 32 : 24;
  const currentLoadCount =
    (courier?.activePlatformOrderIds?.length || 0) +
    (courier?.assignedTrackingNumbers.length || 0);
  const loadSlowdownFactor = 1 + currentLoadCount * 0.12;

  const baseTransitToRest = Math.max(
    4,
    Math.round(
      ((distanceToRestaurantKm / vehicleSpeedKmH) *
        60 *
        virtualTrafficFactor *
        loadSlowdownFactor)
    )
  );
  const baseTransitToClient = Math.max(
    7,
    Math.round(
      ((distanceRestaurantToClientKm / vehicleSpeedKmH) *
        60 *
        virtualTrafficFactor *
        loadSlowdownFactor)
    )
  );

  // Other assigned orders on the same courier add sequential stop delay
  const otherAssignedOrdersDelayMinutes = currentLoadCount * 11;

  // Restaurant prep vs Courier arrival at restaurant
  const restaurantDelayMinutes = Math.max(
    0,
    options?.extraRestaurantKitchenDelayMinutes ?? 0
  );
  const courierRoadDelayMinutes = Math.max(
    0,
    options?.extraCourierRoadDelayMinutes ?? 0
  );

  const restaurantPrepMinutes =
    Math.max(8, order.prepTimeMinutes) + restaurantDelayMinutes;
  const transitToRestaurantMinutes =
    baseTransitToRest +
    otherAssignedOrdersDelayMinutes +
    Math.round(courierRoadDelayMinutes * 0.4);

  // Courier wait at restaurant is strictly max(0, restaurantPrepMinutes - transitToRestaurantMinutes)
  const courierWaitAtRestaurantMinutes = Math.max(
    0,
    restaurantPrepMinutes - transitToRestaurantMinutes
  );

  const timeUntilPickupFromRest = Math.max(
    restaurantPrepMinutes,
    transitToRestaurantMinutes
  );

  const transitToClientMinutes =
    baseTransitToClient + Math.round(courierRoadDelayMinutes * 0.6);

  const totalExpectedMinutes =
    timeUntilPickupFromRest + transitToClientMinutes;

  const isExceptionalOutOfZoneCoverage =
    !isAllocatedToThisZone && distanceToRestaurantKm > 5.5;
  const exceptionalExtraCostPiastres = isExceptionalOutOfZoneCoverage
    ? egpToPiastres(Math.round(distanceToRestaurantKm * 2.2))
    : 0;

  const nowTotal = nextState.clock.totalElapsedMinutes;
  const prepStartedAtTotalMinutes = nowTotal;
  const prepReadyAtTotalMinutes = nowTotal + restaurantPrepMinutes;
  const courierArrivedAtRestaurantTotalMinutes =
    nowTotal + transitToRestaurantMinutes;
  const courierPickedUpAtTotalMinutes = nowTotal + timeUntilPickupFromRest;

  let delayAttribution: WakkelnyOrderTimingBreakdown['delayAttribution'] =
    'NONE';
  if (restaurantDelayMinutes > 0 && courierRoadDelayMinutes > 0) {
    delayAttribution = 'BOTH';
  } else if (restaurantDelayMinutes > 0) {
    delayAttribution = 'RESTAURANT_DELAY';
  } else if (
    courierRoadDelayMinutes > 0 ||
    otherAssignedOrdersDelayMinutes >= 15
  ) {
    delayAttribution = 'COURIER_OR_TRAFFIC_DELAY';
  }

  const speedBonusThreshold = zone?.speedBonusThresholdMinutes ?? 35;
  const speedBonusEligible =
    order.platformId === 'WAKKELNY' &&
    totalExpectedMinutes <= speedBonusThreshold &&
    courierRoadDelayMinutes === 0;
  const speedBonusEarnedPiastres = speedBonusEligible
    ? zone?.speedBonusAmountPiastres ?? egpToPiastres(20)
    : 0;

  return {
    restaurantPrepMinutes,
    courierWaitAtRestaurantMinutes,
    distanceToRestaurantKm: Math.round(distanceToRestaurantKm * 10) / 10,
    distanceRestaurantToClientKm:
      Math.round(distanceRestaurantToClientKm * 10) / 10,
    virtualTrafficFactor: Math.round(virtualTrafficFactor * 100) / 100,
    transitToRestaurantMinutes,
    transitToClientMinutes,
    otherAssignedOrdersDelayMinutes,
    totalExpectedMinutes,
    isExceptionalOutOfZoneCoverage,
    exceptionalExtraCostPiastres,
    prepStartedAtTotalMinutes,
    prepReadyAtTotalMinutes,
    courierArrivedAtRestaurantTotalMinutes,
    courierPickedUpAtTotalMinutes,
    restaurantDelayMinutes,
    courierRoadDelayMinutes,
    delayAttribution,
    speedBonusEligible,
    speedBonusEarnedPiastres,
  };
}

/**
 * Dispatches a Wakkelny order with strict zone coverage enforcement:
 * - Never applies the 10-hour warehouse minimum (food orders use minute-level timing).
 * - Rejects assigning a zone's order to a distant out-of-zone courier unless
 *   `allowExceptionalCoverage === true`, in which case it accounts for the extra distance, time, and cost.
 * - Separates restaurant prep wait from road transit time.
 * - Distinguishes Restaurant Delay vs Courier Delay so couriers are never penalized for kitchen delays.
 * - Awards speed bonus ONLY if contractually eligible and met.
 */
export function dispatchWakkelnyOrderWithZoneSimulation(
  state: GameState,
  orderId: string,
  courierId: string,
  options?: {
    allowExceptionalCoverage?: boolean;
    extraRestaurantKitchenDelayMinutes?: number;
    extraCourierRoadDelayMinutes?: number;
  }
): {
  nextState: GameState;
  timing: WakkelnyOrderTimingBreakdown;
} {
  let nextState = ensureWakkelnyZonesInitialized(state);
  const bd = nextState.businessDeveloper!;
  const orderIdx = bd.platformOrders.findIndex((o) => o.id === orderId);
  if (orderIdx === -1) {
    throw new Error('طلب وكلني المطلوب غير موجود.');
  }
  const order = bd.platformOrders[orderIdx];
  if (order.status !== 'WAITING_DISPATCH') {
    throw new Error('هذا الطلب تم توجيهه بالفعل.');
  }

  const courier = nextState.couriers.find((c) => c.id === courierId);
  if (!courier || courier.status === 'UNAVAILABLE') {
    throw new Error('المندوب المختار غير متاح حالياً.');
  }

  const vehicle = resolveCourierEffectiveVehicle(nextState, courier);
  if (!vehicle || courier.needsCompanyVehicle) {
    throw new Error(
      `المندوب (${courier.name}) لا يمتلك مركبة مخصصة حالياً.`
    );
  }

  const fitCheck = checkVehicleCapacityFit(
    vehicle,
    (courier.currentWeightGrams || 0) + order.weightGrams,
    (courier.currentVolumeCm3 || 0) + order.volumeCm3
  );
  if (!fitCheck.fits) {
    throw new Error(fitCheck.reasonAr || 'الحمولة تتجاوز سعة المركبة.');
  }

  // Check courier overload
  const currentActiveOnCourier =
    (courier.activePlatformOrderIds?.length || 0) +
    courier.assignedTrackingNumbers.length;
  if (currentActiveOnCourier >= (vehicle.capacity || 3)) {
    throw new Error(
      `الطلبات المسندة للمندوب (${courier.name}) وصلت للحد الأقصى لطاقة المركبة (${vehicle.capacity || 3} طلبات متزامنة). لا يمكن تحميله فوق طاقته.`
    );
  }

  const timing = calculateWakkelnyOrderTimingBreakdown(
    nextState,
    order,
    courierId,
    options
  );

  // Enforce Zone Coverage Rule: do not assign an order to a distant out-of-zone courier unless exceptional coverage is explicitly enabled
  if (
    timing.isExceptionalOutOfZoneCoverage &&
    !options?.allowExceptionalCoverage
  ) {
    throw new Error(
      `الطلب (${order.trackingNumber}) في منطقة (${order.pickupZone}) بعيد عن نطاق تغطية المندوب (${courier.name} — المسافة للمطعم ${timing.distanceToRestaurantKm} كم). خصص مندوباً للمنطقة أولاً أو فعّل خيار «التغطية الاستثنائية» مع احتساب التكلفة الإضافية (${formatEGP(timing.exceptionalExtraCostPiastres)}).`
    );
  }

  const totalTripCostPiastres =
    order.estimatedTripCostPiastres + timing.exceptionalExtraCostPiastres;

  const afford = canAffordImmediatePayment(nextState, totalTripCostPiastres);
  if (!afford.allowed) {
    throw new Error(
      `السيولة النقدية لا تكفي لتغطية تكلفة الرحلة (${formatEGP(totalTripCostPiastres)}).`
    );
  }

  nextState = recordLedgerTransaction(nextState, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: totalTripCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: `WAK-TRIP-${order.id}`,
    description: `تكلفة تشغيل رحلة وكلني (${order.trackingNumber})${
      timing.isExceptionalOutOfZoneCoverage
        ? ` شاملة بدل تغطية استثنائية خارج المنطقة (${formatEGP(timing.exceptionalExtraCostPiastres)})`
        : ''
    }`,
  });

  const nowTotal = nextState.clock.totalElapsedMinutes;
  const expectedArrivalTotal = nowTotal + timing.totalExpectedMinutes;
  const expectedArrivalClock =
    (nextState.clock.minutesFromMidnight + timing.totalExpectedMinutes) % 1440;

  // Stage starts at PREPARING_AT_PARTNER if prep takes longer than courier transit to restaurant,
  // and transitions seamlessly during simulation ticks
  const updatedOrder: PlatformDirectOrder = {
    ...order,
    status: 'PICKED_UP_IN_TRANSIT',
    dispatchMode: 'INDEPENDENT',
    assignedCourierId: courier.id,
    assignedCourierName: courier.name,
    assignedVehicleId: vehicle.id,
    assignedVehicleName: vehicle.name,
    actualTripCostPiastres: totalTripCostPiastres,
    dispatchedAtTotalMinutes: nowTotal,
    readyForPickupTotalMinutes: timing.prepReadyAtTotalMinutes,
    expectedArrivalTotalMinutes: expectedArrivalTotal,
    expectedArrivalTimeLabel: formatClockTime(expectedArrivalClock),
    specialRiskNoteAr:
      timing.delayAttribution === 'RESTAURANT_DELAY'
        ? `تأخير تحضير من المطعم (+${timing.restaurantDelayMinutes} د) — لا يُحتسب خطأ على المندوب (${courier.name}).`
        : timing.delayAttribution === 'COURIER_OR_TRAFFIC_DELAY'
          ? `تأخير طريق/مندوب (+${timing.courierRoadDelayMinutes + timing.otherAssignedOrdersDelayMinutes} د).`
          : timing.speedBonusEligible
            ? `مؤهل لمكافأة السرعة (+${formatEGP(timing.speedBonusEarnedPiastres)}) عند التسليم خلال ${timing.totalExpectedMinutes} د.`
            : undefined,
  };

  // If speed bonus is earned and contractually active, record it once upon dispatch/completion
  let totalBonusesAdded = 0;
  const bonusRefKey = `WAK-SPEED-BONUS-${order.id}`;
  if (
    timing.speedBonusEligible &&
    timing.speedBonusEarnedPiastres > 0 &&
    !nextState.ledger.some((e) => e.referenceId === bonusRefKey)
  ) {
    totalBonusesAdded = timing.speedBonusEarnedPiastres;
    nextState = recordLedgerTransaction(nextState, {
      type: 'REVENUE_EARNED',
      amountPiastres: totalBonusesAdded,
      debitAccount: 'ACCOUNTS_RECEIVABLE',
      creditAccount: 'SERVICE_REVENUE',
      referenceId: bonusRefKey,
      description: `مكافأة سرعة توصيل من عقد «وكلني» للطلب (${order.trackingNumber} — زمن ${timing.totalExpectedMinutes} دقيقة)`,
    });
    nextState = recordLedgerTransaction(nextState, {
      type: 'CASH_COLLECTION',
      amountPiastres: totalBonusesAdded,
      debitAccount: 'CASH',
      creditAccount: 'ACCOUNTS_RECEIVABLE',
      referenceId: `${bonusRefKey}-CASH`,
      description: `تحصيل نقدي لمكافأة سرعة توصيل «وكلني» (${order.trackingNumber})`,
    });
  }

  // Attribute delay to employee ONLY if it was a personal courier road delay, NEVER if restaurant delay!
  const updatedEmployees = nextState.employees.map((e) => {
    if (e.id !== courier.employeeId) return e;
    if (
      timing.delayAttribution === 'COURIER_OR_TRAFFIC_DELAY' &&
      timing.courierRoadDelayMinutes > 0
    ) {
      return {
        ...e,
        attributedDelaysCount: e.attributedDelaysCount + 1,
      };
    }
    return e;
  });

  const updatedOrders = [...nextState.businessDeveloper!.platformOrders];
  updatedOrders[orderIdx] = updatedOrder;

  const prevWakContract = nextState.businessDeveloper!.contracts.WAKKELNY;

  nextState = {
    ...nextState,
    employees: updatedEmployees,
    couriers: nextState.couriers.map((c) =>
      c.id === courier.id
        ? {
            ...c,
            status: 'ON_MISSION' as const,
            currentLoad: c.currentLoad + 1,
            currentWeightGrams: (c.currentWeightGrams || 0) + order.weightGrams,
            currentVolumeCm3: (c.currentVolumeCm3 || 0) + order.volumeCm3,
            activePlatformOrderIds: [
              ...(c.activePlatformOrderIds || []),
              order.id,
            ],
          }
        : c
    ),
    vehicles: nextState.vehicles.map((v) =>
      v.id === vehicle.id
        ? {
            ...v,
            status: 'IN_USE' as const,
            usedCapacityToday: v.usedCapacityToday + 1,
            usedWeightGrams: (v.usedWeightGrams || 0) + order.weightGrams,
            usedVolumeCm3: (v.usedVolumeCm3 || 0) + order.volumeCm3,
          }
        : v
    ),
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      platformOrders: updatedOrders,
      contracts: {
        ...nextState.businessDeveloper!.contracts,
        WAKKELNY: {
          ...prevWakContract,
          totalBonusesPiastres:
            prevWakContract.totalBonusesPiastres + totalBonusesAdded,
        },
      },
      orderTimingsById: {
        ...(nextState.businessDeveloper!.orderTimingsById || {}),
        [order.id]: timing,
      },
    },
  };

  if (timing.delayAttribution === 'RESTAURANT_DELAY') {
    nextState = pushNotification(nextState, {
      dedupeKey: `WAK-REST-DELAY-${order.id}`,
      trackingNumber: order.trackingNumber,
      title: `تأخر تحضير المطعم في طلب (${order.trackingNumber})`,
      message: `تأخر مطعم (${order.pickupPartnerAr}) لمدة ${timing.restaurantDelayMinutes} دقيقة في تحضير الوجبة؛ انتظر المندوب (${courier.name}) بالمطعم ${timing.courierWaitAtRestaurantMinutes} د وتم إعفاؤه تماماً من مسؤولية التأخير.`,
      department: 'DISPATCH_COURIERS',
      outcomeLabel: 'تأخير مطعم (المندوب غير مسؤول)',
      severity: 'WARNING',
    });
  }

  return {
    nextState,
    timing,
  };
}
