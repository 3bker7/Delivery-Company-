import {
  BUSINESS_DEVELOPER_PLATFORMS,
  CAIRO_GIZA_ZONES,
  CONTRACT_MARKETING_CATALOG,
  OPERATIONS_UPGRADE_CATALOG,
  PlatformContractId,
  PlatformScenarioTemplate,
  SmartDispatchPolicy,
  VEHICLE_STORE_CATALOG,
  VehicleCatalogId,
  WAKKELNY_SCENARIOS,
  ZORO_SCENARIOS,
} from '../config/businessDeveloperConfig';
import {
  BusinessDeveloperState,
  Courier,
  GameState,
  PlatformDirectOrder,
  PlatformRouteBatch,
  SmartDispatchDecisionLog,
  SocialMediaPost,
  Vehicle,
} from '../types/game';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushNotification } from './notificationEngine';

/**
 * Formats weight consistently in both Grams and Kilograms (1000g = 1kg).
 */
export function formatWeightGramsAndKg(weightGrams: number): string {
  const safeGrams = Math.max(0, Math.round(weightGrams));
  const kg = safeGrams / 1000;
  return `${safeGrams.toLocaleString('en-US')} جرام (${kg.toFixed(2)} كجم)`;
}

/**
 * Calculates volume in cubic centimeters (cm³ = Length × Width × Height).
 */
export function calculateVolumeCm3(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  return Math.max(
    1,
    Math.round(Math.max(1, lengthCm) * Math.max(1, widthCm) * Math.max(1, heightCm))
  );
}

/**
 * Formats volume in cm³ and dimensions in cm.
 */
export function formatVolumeAndDimensions(
  volumeCm3: number,
  lengthCm?: number,
  widthCm?: number,
  heightCm?: number
): string {
  const safeVol = Math.max(0, Math.round(volumeCm3));
  if (lengthCm && widthCm && heightCm) {
    return `${safeVol.toLocaleString('en-US')} سم³ (${lengthCm}×${widthCm}×${heightCm} سم)`;
  }
  return `${safeVol.toLocaleString('en-US')} سم³`;
}

/**
 * Resolves the effective max weight (grams) and max volume (cm³) of a vehicle.
 */
export function getVehicleCapacityLimits(vehicle: Vehicle): {
  maxWeightGrams: number;
  maxVolumeCm3: number;
} {
  if (
    typeof vehicle.maxWeightGrams === 'number' &&
    vehicle.maxWeightGrams > 0 &&
    typeof vehicle.maxVolumeCm3 === 'number' &&
    vehicle.maxVolumeCm3 > 0
  ) {
    return {
      maxWeightGrams: vehicle.maxWeightGrams,
      maxVolumeCm3: vehicle.maxVolumeCm3,
    };
  }

  if (vehicle.catalogId) {
    const cat = VEHICLE_STORE_CATALOG.find((c) => c.id === vehicle.catalogId);
    if (cat) {
      return {
        maxWeightGrams: cat.maxWeightGrams,
        maxVolumeCm3: cat.maxVolumeCm3,
      };
    }
  }

  // Fallback for legacy Day 1 vehicles
  if (vehicle.type === 'CARGO_VAN') {
    return {
      maxWeightGrams: 300000, // 300 kg
      maxVolumeCm3: 2496000,
    };
  }
  return {
    maxWeightGrams: 12000, // 12 kg
    maxVolumeCm3: 80000,
  };
}

/**
 * Checks whether a given total weight (grams) and volume (cm³) fits inside a vehicle.
 */
export function checkVehicleCapacityFit(
  vehicle: Vehicle,
  totalWeightGrams: number,
  totalVolumeCm3: number
): {
  fits: boolean;
  reasonAr?: string;
  weightUtilizationPercent: number;
  volumeUtilizationPercent: number;
} {
  const limits = getVehicleCapacityLimits(vehicle);
  const weightUtilizationPercent = Math.round(
    (totalWeightGrams / Math.max(1, limits.maxWeightGrams)) * 100
  );
  const volumeUtilizationPercent = Math.round(
    (totalVolumeCm3 / Math.max(1, limits.maxVolumeCm3)) * 100
  );

  if (totalWeightGrams > limits.maxWeightGrams) {
    return {
      fits: false,
      reasonAr: `إجمالي الوزن (${formatWeightGramsAndKg(totalWeightGrams)}) يتجاوز أقصى حمولة وزن للمركبة (${formatWeightGramsAndKg(limits.maxWeightGrams)}).`,
      weightUtilizationPercent,
      volumeUtilizationPercent,
    };
  }

  if (totalVolumeCm3 > limits.maxVolumeCm3) {
    return {
      fits: false,
      reasonAr: `إجمالي الحجم (${totalVolumeCm3.toLocaleString('en-US')} سم³) يتجاوز السعة الحجمية لصندوق المركبة (${limits.maxVolumeCm3.toLocaleString('en-US')} سم³).`,
      weightUtilizationPercent,
      volumeUtilizationPercent,
    };
  }

  return {
    fits: true,
    weightUtilizationPercent,
    volumeUtilizationPercent,
  };
}

/**
 * Creates the initial BusinessDeveloperState.
 * Contains ONLY two platforms: WAKKELNY and ZORO.
 * Unlocks at the start of Day 3.
 */
export function createInitialBusinessDeveloperState(
  currentDay = 1
): BusinessDeveloperState {
  const unlocked = currentDay >= 3;

  return {
    unlockedAtDay: 3,
    isUnlocked: unlocked,
    contracts: {
      WAKKELNY: {
        id: 'WAKKELNY',
        nameAr: BUSINESS_DEVELOPER_PLATFORMS.WAKKELNY.nameAr,
        unlocked,
        signed: false,
        contractFeePiastres: BUSINESS_DEVELOPER_PLATFORMS.WAKKELNY.contractFeePiastres,
        feePaidOnce: false,
        slaScore: 90,
        status: unlocked ? 'AVAILABLE' : 'LOCKED',
        completedOrdersCount: 0,
        delayedOrFailedOrdersCount: 0,
        totalRevenueEarnedPiastres: 0,
        totalOperatingCostPiastres: 0,
        totalPenaltiesPiastres: 0,
        totalBonusesPiastres: 0,
        extraDailyOrdersFromMarketing: 0,
      },
      ZORO: {
        id: 'ZORO',
        nameAr: BUSINESS_DEVELOPER_PLATFORMS.ZORO.nameAr,
        unlocked,
        signed: false,
        contractFeePiastres: BUSINESS_DEVELOPER_PLATFORMS.ZORO.contractFeePiastres,
        feePaidOnce: false,
        slaScore: 90,
        status: unlocked ? 'AVAILABLE' : 'LOCKED',
        completedOrdersCount: 0,
        delayedOrFailedOrdersCount: 0,
        totalRevenueEarnedPiastres: 0,
        totalOperatingCostPiastres: 0,
        totalPenaltiesPiastres: 0,
        totalBonusesPiastres: 0,
        extraDailyOrdersFromMarketing: 0,
      },
    },
    platformOrders: [],
    routeBatches: [],
    smartDispatchPolicy: 'BALANCED',
    smartDispatchLogs: [],
    processedLeaseCycleDays: [],
    lastGeneratedOrdersDay: 0,
    followersCount: 420,
    upgradeLevels: {
      'UPG-DISPATCH-UNIT': 0,
      'UPG-DRIVER-TRAINING': 0,
      'UPG-PREVENTIVE-WORKSHOP': 0,
      'UPG-CONTRACT-RELATIONS': 0,
      'UPG-SMART-TRACKING': 0,
    },
    contractCampaigns: [],
    dynamicEvents: [],
  };
}

/**
 * Ensures `state.businessDeveloper` is initialized and synchronized with `currentDay`.
 * Enforces that ONLY WAKKELNY and ZORO exist in `contracts`.
 */
export function ensureBusinessDeveloperState(state: GameState): GameState {
  const day = state.company.currentDay;
  const unlocked = day >= 3;
  const existing =
    state.businessDeveloper || createInitialBusinessDeveloperState(day);

  const wak = existing.contracts?.WAKKELNY || {
    id: 'WAKKELNY' as const,
    nameAr: BUSINESS_DEVELOPER_PLATFORMS.WAKKELNY.nameAr,
    unlocked,
    signed: false,
    contractFeePiastres: BUSINESS_DEVELOPER_PLATFORMS.WAKKELNY.contractFeePiastres,
    feePaidOnce: false,
    slaScore: 90,
    status: unlocked ? ('AVAILABLE' as const) : ('LOCKED' as const),
    completedOrdersCount: 0,
    delayedOrFailedOrdersCount: 0,
    totalRevenueEarnedPiastres: 0,
    totalOperatingCostPiastres: 0,
    totalPenaltiesPiastres: 0,
    totalBonusesPiastres: 0,
    extraDailyOrdersFromMarketing: 0,
  };

  const zoro = existing.contracts?.ZORO || {
    id: 'ZORO' as const,
    nameAr: BUSINESS_DEVELOPER_PLATFORMS.ZORO.nameAr,
    unlocked,
    signed: false,
    contractFeePiastres: BUSINESS_DEVELOPER_PLATFORMS.ZORO.contractFeePiastres,
    feePaidOnce: false,
    slaScore: 90,
    status: unlocked ? ('AVAILABLE' as const) : ('LOCKED' as const),
    completedOrdersCount: 0,
    delayedOrFailedOrdersCount: 0,
    totalRevenueEarnedPiastres: 0,
    totalOperatingCostPiastres: 0,
    totalPenaltiesPiastres: 0,
    totalBonusesPiastres: 0,
    extraDailyOrdersFromMarketing: 0,
  };

  return {
    ...state,
    businessDeveloper: {
      ...existing,
      unlockedAtDay: 3,
      isUnlocked: unlocked,
      contracts: {
        WAKKELNY: {
          ...wak,
          unlocked,
          status: wak.signed
            ? wak.status === 'LOCKED' || wak.status === 'AVAILABLE'
              ? 'ACTIVE'
              : wak.status
            : unlocked
              ? 'AVAILABLE'
              : 'LOCKED',
        },
        ZORO: {
          ...zoro,
          unlocked,
          status: zoro.signed
            ? zoro.status === 'LOCKED' || zoro.status === 'AVAILABLE'
              ? 'ACTIVE'
              : zoro.status
            : unlocked
              ? 'AVAILABLE'
              : 'LOCKED',
        },
      },
    },
  };
}

export interface PlatformContractReadinessCheck {
  allowed: boolean;
  rejectionReasonAr?: string;
  contractFeePiastres: number;
  currentCashPiastres: number;
  hasEnoughCash: boolean;
  isDayUnlocked: boolean;
  activeCouriersWithVehiclesCount: number;
  requiredActiveCouriersCount: number;
  hasOperationalFleet: boolean;
  currentReputation: number;
  requiredReputation: number;
  hasEnoughReputation: boolean;
  expectedDailyOrdersMin: number;
  expectedDailyOrdersMax: number;
  fleetDailyOrderCapacity: number;
  capacityStatusAr: string;
}

/**
 * Evaluates all operational, financial, fleet, and reputation requirements
 * before signing a platform contract (WAKKELNY or ZORO) per Section 19.
 */
export function evaluatePlatformContractReadiness(
  state: GameState,
  platformId: PlatformContractId
): PlatformContractReadinessCheck {
  const nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const config = BUSINESS_DEVELOPER_PLATFORMS[platformId];
  const contract = bd.contracts[platformId];

  const isDayUnlocked = nextState.company.currentDay >= 3 && bd.isUnlocked;
  const currentCashPiastres = nextState.company.cashPiastres;
  const contractFeePiastres = config.contractFeePiastres;
  const hasEnoughCash = currentCashPiastres >= contractFeePiastres;

  const activeCouriersWithVehicles = nextState.couriers.filter((c) => {
    if (c.status === 'UNAVAILABLE') return false;
    const veh = resolveCourierEffectiveVehicle(nextState, c);
    return Boolean(veh && veh.maintenanceHealth > 20);
  });

  const activeCouriersWithVehiclesCount = activeCouriersWithVehicles.length;
  const requiredActiveCouriersCount = platformId === 'WAKKELNY' ? 1 : 2;
  const hasOperationalFleet =
    activeCouriersWithVehiclesCount >= requiredActiveCouriersCount;

  const currentReputation = nextState.company.reputation;
  const requiredReputation = platformId === 'WAKKELNY' ? 45 : 50;
  const hasEnoughReputation = currentReputation >= requiredReputation;

  const expectedDailyOrdersMin = config.baseOrdersPerDay;
  const expectedDailyOrdersMax = config.maxOrdersPerDayWithReputation;
  const fleetDailyOrderCapacity = activeCouriersWithVehiclesCount * 4;

  const capacityStatusAr =
    fleetDailyOrderCapacity >= expectedDailyOrdersMin
      ? `الأسطول الحالي (${activeCouriersWithVehiclesCount} مندوب بمركبة نشطة) قادر على استيعاب نحو ${fleetDailyOrderCapacity} طلبات مباشرة يومياً.`
      : `تحذير سعة: الأسطول الحالي (${activeCouriersWithVehiclesCount} مندوب بمركبة) أقل من الحجم اليومي المتوقع (${expectedDailyOrdersMin}–${expectedDailyOrdersMax} طلبات).`;

  let rejectionReasonAr: string | undefined;

  if (contract?.signed || contract?.feePaidOnce) {
    rejectionReasonAr = `تم توقيع عقد «${config.nameAr}» وسداد رسومه مسبقاً.`;
  } else if (!isDayUnlocked) {
    rejectionReasonAr =
      'قسم تطوير الأعمال (Business Developer) يفتح رسمياً في بداية اليوم الثالث بعد استقرار التأسيس.';
  } else if (!hasEnoughReputation) {
    rejectionReasonAr = `سمعة الشركة الحالية (${currentReputation}%) أقل من الحد الأدنى المطلوب للتعاقد مع «${config.nameAr}» (${requiredReputation}%).`;
  } else if (!hasOperationalFleet) {
    rejectionReasonAr = `يتطلب التعاقد مع «${config.nameAr}» توفر ${requiredActiveCouriersCount} مندوب توصيل نشط بمركبة صالحة للتشغيل على الأقل (المتوفر حالياً: ${activeCouriersWithVehiclesCount}).`;
  } else if (!hasEnoughCash) {
    rejectionReasonAr = `السيولة النقدية الحالية (${formatEGP(currentCashPiastres)}) غير كافية لسداد رسوم التعاقد مع «${config.nameAr}» البالغة ${formatEGP(contractFeePiastres)}.`;
  }

  return {
    allowed: !rejectionReasonAr,
    rejectionReasonAr,
    contractFeePiastres,
    currentCashPiastres,
    hasEnoughCash,
    isDayUnlocked,
    activeCouriersWithVehiclesCount,
    requiredActiveCouriersCount,
    hasOperationalFleet,
    currentReputation,
    requiredReputation,
    hasEnoughReputation,
    expectedDailyOrdersMin,
    expectedDailyOrdersMax,
    fleetDailyOrderCapacity,
    capacityStatusAr,
  };
}

/**
 * Signs a Business Developer contract (WAKKELNY: 8,000 EGP | ZORO: 15,000 EGP).
 * - Requires Day >= 3, reputation threshold, operational fleet & couriers, and sufficient cash balance.
 * - Deducts the contract fee ONCE only.
 * - Immediately generates the first batch of platform orders for today.
 */
export function signPlatformContract(
  state: GameState,
  platformId: PlatformContractId
): GameState {
  if (platformId !== 'WAKKELNY' && platformId !== 'ZORO') {
    throw new Error('منصة غير معتمدة. قسم تطوير الأعمال يضم منصتي «وكلني» و«زورو» فقط.');
  }

  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const contract = bd.contracts[platformId];
  const config = BUSINESS_DEVELOPER_PLATFORMS[platformId];

  const readiness = evaluatePlatformContractReadiness(nextState, platformId);
  if (!readiness.allowed) {
    throw new Error(
      readiness.rejectionReasonAr ||
        `تعذر توقيع عقد «${config.nameAr}» لعدم استيفاء المتطلبات.`
    );
  }

  const feeRefId = `BD-CONTRACT-SIGN-${platformId}`;
  if (nextState.executedDecisionIds.includes(feeRefId)) {
    throw new Error(`تم سداد رسوم التعاقد مع «${config.nameAr}» مسبقاً.`);
  }

  nextState = recordLedgerTransaction(nextState, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: config.contractFeePiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: feeRefId,
    description: `رسوم توقيع عقد شراكة التوصيل مع منصة «${config.nameAr}» (تُخصم مرة واحدة فقط)`,
  });

  const updatedContract = {
    ...contract,
    unlocked: true,
    signed: true,
    signedAtDay: nextState.company.currentDay,
    feePaidOnce: true,
    status: 'ACTIVE' as const,
  };

  nextState = {
    ...nextState,
    executedDecisionIds: [...nextState.executedDecisionIds, feeRefId],
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      followersCount: nextState.businessDeveloper!.followersCount + 250,
      contracts: {
        ...nextState.businessDeveloper!.contracts,
        [platformId]: updatedContract,
      },
    },
  };

  nextState = generatePlatformOrdersForContract(
    nextState,
    platformId,
    nextState.company.currentDay
  );

  nextState = pushNotification(nextState, {
    dedupeKey: feeRefId,
    title: `تم توقيع عقد الشراكة مع «${config.nameAr}»!`,
    message: `تم سداد رسوم التعاقد (${formatEGP(config.contractFeePiastres)}) لمرة واحدة، وبدأت طلبات «${config.nameAr}» المباشرة في التدفق دون المرور بمستودعاتك.`,
    department: 'MANAGEMENT',
    outcomeLabel: `تفعيل عقد ${config.nameAr}`,
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Generates direct platform orders (Wakkelny or Zoro) for the specified day.
 * - Never enters player warehouses (`bypassesPlayerWarehouse: true`).
 * - Shipping revenue is strictly `shippingTariffPiastres`, never `merchantOrderValuePiastres`.
 */
export function generatePlatformOrdersForContract(
  state: GameState,
  platformId: PlatformContractId,
  day: number,
  extraCountOverride?: number
): GameState {
  const nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const contract = bd.contracts[platformId];
  if (!contract || !contract.signed || contract.status === 'SUSPENDED') {
    return nextState;
  }

  const scenarios: PlatformScenarioTemplate[] =
    platformId === 'WAKKELNY' ? WAKKELNY_SCENARIOS : ZORO_SCENARIOS;
  const config = BUSINESS_DEVELOPER_PLATFORMS[platformId];

  const relationsUpgradeLevel = bd.upgradeLevels['UPG-CONTRACT-RELATIONS'] || 0;
  const reputationFactor = Math.max(
    0,
    Math.floor((nextState.company.reputation - 60) / 12)
  );
  const slaBonusOrders = contract.slaScore >= 90 ? 1 : contract.slaScore < 65 ? -1 : 0;

  const targetCount =
    extraCountOverride ??
    Math.min(
      config.maxOrdersPerDayWithReputation,
      Math.max(
        2,
        config.baseOrdersPerDay +
          reputationFactor +
          relationsUpgradeLevel * 2 +
          contract.extraDailyOrdersFromMarketing +
          slaBonusOrders
      )
    );

  const existingTodayForPlatform = bd.platformOrders.filter(
    (o) => o.platformId === platformId && o.createdAtDay === day
  );

  if (existingTodayForPlatform.length >= targetCount && extraCountOverride === undefined) {
    return nextState;
  }

  const countToCreate =
    extraCountOverride !== undefined
      ? extraCountOverride
      : Math.max(0, targetCount - existingTodayForPlatform.length);

  const nowTotal = nextState.clock.totalElapsedMinutes;
  const nowMinutesFromMidnight = nextState.clock.minutesFromMidnight;

  const newOrders: PlatformDirectOrder[] = [];

  for (let i = 0; i < countToCreate; i++) {
    const seqNum = existingTodayForPlatform.length + i + 1;
    const scenario = scenarios[(day + seqNum - 1) % scenarios.length];
    const orderId = `${platformId}-D${day}-${seqNum}`;
    if (bd.platformOrders.some((o) => o.id === orderId)) {
      continue;
    }

    const trackingNumber = `${platformId === 'WAKKELNY' ? 'WAK' : 'ZRO'}-${day}0${seqNum}`;
    const volumeCm3 = calculateVolumeCm3(
      scenario.lengthCm,
      scenario.widthCm,
      scenario.heightCm
    );
    const deadlineMinutesFromMidnight = Math.min(
      1360,
      nowMinutesFromMidnight + scenario.maxDeliveryWindowMinutes + (i % 3) * 15
    );
    const deadlineTotal =
      nowTotal + (deadlineMinutesFromMidnight - nowMinutesFromMidnight);

    const zoneInfo = CAIRO_GIZA_ZONES.find(
      (z) => z.nameAr === scenario.deliveryZone
    );
    const estKm = zoneInfo ? zoneInfo.avgDistanceKm : 9;
    const estTripCostEgp = Math.max(14, Math.round(estKm * 2.2));

    newOrders.push({
      id: orderId,
      trackingNumber,
      platformId,
      scenarioId: scenario.id,
      titleAr: scenario.titleAr,
      descriptionAr: scenario.descriptionAr,
      pickupPartnerAr: scenario.pickupPartnerAr,
      pickupZone: scenario.pickupZone,
      deliveryZone: scenario.deliveryZone,
      directionSector: scenario.directionSector,
      weightGrams: scenario.weightGrams,
      lengthCm: scenario.lengthCm,
      widthCm: scenario.widthCm,
      heightCm: scenario.heightCm,
      volumeCm3,
      shippingTariffPiastres: egpToPiastres(scenario.shippingTariffEgp),
      merchantOrderValuePiastres: egpToPiastres(scenario.merchantOrderValueEgp),
      estimatedTripCostPiastres: egpToPiastres(estTripCostEgp),
      actualTripCostPiastres: 0,
      prepTimeMinutes: scenario.prepTimeMinutes,
      maxDeliveryWindowMinutes: scenario.maxDeliveryWindowMinutes,
      createdAtDay: day,
      createdAtTotalMinutes: nowTotal,
      readyForPickupTotalMinutes: nowTotal + scenario.prepTimeMinutes,
      deadlineTotalMinutes: deadlineTotal,
      deadlineTimeLabel: formatClockTime(deadlineMinutesFromMidnight),
      status: 'WAITING_DISPATCH',
      priority: scenario.priority,
      fragile: scenario.fragile,
      hotFoodSensitive: scenario.hotFoodSensitive,
      batchable: scenario.batchable,
      requiresCarOrTruck: scenario.requiresCarOrTruck,
      bypassesPlayerWarehouse: true,
      specialRiskNoteAr: scenario.specialRiskNoteAr,
      settledFinancially: false,
    });
  }

  return {
    ...nextState,
    businessDeveloper: {
      ...bd,
      lastGeneratedOrdersDay: day,
      platformOrders: [...newOrders, ...bd.platformOrders],
    },
  };
}

/**
 * Generates daily platform orders for all signed contracts on a new day.
 */
export function generateAllDailyPlatformOrders(
  state: GameState,
  day: number
): GameState {
  let nextState = ensureBusinessDeveloperState(state);
  nextState = generatePlatformOrdersForContract(nextState, 'WAKKELNY', day);
  nextState = generatePlatformOrdersForContract(nextState, 'ZORO', day);
  return nextState;
}

/**
 * Purchases or Leases a vehicle from the Vehicle Store (`VEHICLE_STORE_CATALOG`).
 * - BUY: Deducts `buyPricePiastres` once from cash, sets `ownershipType: 'OWNED'`, `leaseCostPerCyclePiastres: 0`.
 * - LEASE: Sets `ownershipType: 'LEASED'`, `leaseCostPerCyclePiastres: item.leasePricePerCyclePiastres`.
 *   Lease rent is deducted ONLY in the 8-day cycle (`processEightDayVehicleLeaseCycle`), never daily!
 */
export function purchaseOrLeaseFleetVehicle(
  state: GameState,
  catalogId: VehicleCatalogId,
  mode: 'BUY' | 'LEASE'
): GameState {
  let nextState = ensureBusinessDeveloperState(state);
  const item = VEHICLE_STORE_CATALOG.find((c) => c.id === catalogId);
  if (!item) {
    throw new Error('طراز المركبة المطلوب غير موجود في متجر المركبات.');
  }

  const day = nextState.company.currentDay;
  const vehicleIndex = nextState.vehicles.length + 1;
  const newVehicleId = `VEH-${catalogId}-D${day}-${vehicleIndex}`;

  if (mode === 'BUY') {
    const afford = canAffordImmediatePayment(nextState, item.buyPricePiastres);
    if (!afford.allowed) {
      throw new Error(
        `السيولة النقدية (${formatEGP(nextState.company.cashPiastres)}) لا تكفي لشراء «${item.nameAr}» بسعر ${formatEGP(item.buyPricePiastres)}.`
      );
    }

    nextState = recordLedgerTransaction(nextState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: item.buyPricePiastres,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: `BUY-${newVehicleId}`,
      description: `شراء مركبة مملوكة للأسطول: ${item.nameAr} (بدون أي إيجار دوري)`,
    });
  } else {
    // For LEASE: verify company has positive cash and is solvent; periodic rent is deducted in the 8-day cycle
    if (nextState.company.cashPiastres <= 0) {
      throw new Error(
        'لا يمكن استئجار مركبة جديدة والخزينة خالية من السيولة النقدية.'
      );
    }
  }

  const newVehicle: Vehicle = {
    id: newVehicleId,
    name: `${item.nameAr} #${vehicleIndex}`,
    type: item.legacyType,
    typeAr: `${item.nameAr} (${mode === 'BUY' ? 'تمليك' : 'إيجار دوري كل 8 أيام'})`,
    catalogId: item.id,
    vehicleClass: item.vehicleClass,
    ownershipType: mode === 'BUY' ? 'OWNED' : 'LEASED',
    buyPricePiastres: item.buyPricePiastres,
    leaseCostPerCyclePiastres:
      mode === 'LEASE' ? item.leasePricePerCyclePiastres : 0,
    leasedAtDay: mode === 'LEASE' ? day : undefined,
    purchasedAtDay: mode === 'BUY' ? day : undefined,
    assignedCourierId: null,
    status: 'AVAILABLE',
    capacity: item.maxConcurrentOrders,
    usedCapacityToday: 0,
    maxWeightGrams: item.maxWeightGrams,
    maxWeightKg: item.maxWeightKg,
    internalLengthCm: item.internalLengthCm,
    internalWidthCm: item.internalWidthCm,
    internalHeightCm: item.internalHeightCm,
    maxVolumeCm3: item.maxVolumeCm3,
    usedWeightGrams: 0,
    usedVolumeCm3: 0,
    totalDistanceKm: 0,
    tripsCompletedCount: 0,
    operatingCostPerTripPiastres: item.baseOperatingCostPerTripPiastres,
    maintenanceHealth: 100,
  };

  nextState = {
    ...nextState,
    vehicles: [...nextState.vehicles, newVehicle],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `ACQUIRE-${newVehicleId}`,
    title:
      mode === 'BUY'
        ? `شراء مركبة جديدة للأسطول: ${item.nameAr}`
        : `استئجار مركبة جديدة للأسطول: ${item.nameAr}`,
    message:
      mode === 'BUY'
        ? `تم شراء «${newVehicle.name}» بمبلغ ${formatEGP(item.buyPricePiastres)} (مملوكة للشركة بدون إيجار دوري). السعة: ${formatWeightGramsAndKg(item.maxWeightGrams)} | ${item.maxVolumeCm3.toLocaleString('en-US')} سم³.`
        : `تم ضم «${newVehicle.name}» بنظام الإيجار الدوري (${formatEGP(item.leasePricePerCyclePiastres)} تُخصم في دورة الـ 8 أيام فقط).`,
    department: 'DISPATCH_COURIERS',
    outcomeLabel: mode === 'BUY' ? 'توسيع الأسطول المملوك' : 'عقد إيجار مركبة (دورة 8 أيام)',
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Sells an owned vehicle (`ownershipType === 'OWNED'`) at a fair resale value
 * based on its `maintenanceHealth` and usage, provided it is not currently on an active mission.
 */
export function sellOwnedVehicle(
  state: GameState,
  vehicleId: string
): GameState {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    throw new Error('المركبة غير موجودة في الأسطول.');
  }
  if (vehicle.ownershipType !== 'OWNED') {
    throw new Error('لا يمكن بيع مركبة مستأجرة أو مملوكة شخصياً للمندوب؛ البيع متاح للمركبات المملوكة للشركة فقط.');
  }

  const activeOrderUsingVehicle = (
    state.businessDeveloper?.platformOrders || []
  ).some(
    (o) =>
      o.assignedVehicleId === vehicleId &&
      (o.status === 'PREPARING_AT_PARTNER' || o.status === 'PICKED_UP_IN_TRANSIT')
  );
  const activeShipmentUsingVehicle = state.shipments.some(
    (s) =>
      s.assignedVehicleId === vehicleId &&
      (s.status === 'ASSIGNED_TO_COURIER' ||
        s.status === 'OUT_FOR_DELIVERY' ||
        s.status === 'DELIVERY_ATTEMPT')
  );

  if (activeOrderUsingVehicle || activeShipmentUsingVehicle || vehicle.status === 'IN_USE') {
    throw new Error('لا يمكن بيع المركبة أثناء تنفيذها رحلة توصيل نشطة.');
  }

  const catalogItem = VEHICLE_STORE_CATALOG.find(
    (c) => c.id === vehicle.catalogId
  );
  const baseBuyPiastres =
    vehicle.buyPricePiastres ||
    catalogItem?.buyPricePiastres ||
    egpToPiastres(45000);
  const retention = catalogItem?.resaleRetentionBaseRatio ?? 0.72;
  const healthFactor = Math.max(0.35, vehicle.maintenanceHealth / 100);
  const resaleValuePiastres = Math.round(baseBuyPiastres * retention * healthFactor);

  let nextState = recordLedgerTransaction(state, {
    type: 'CASH_COLLECTION',
    amountPiastres: resaleValuePiastres,
    debitAccount: 'CASH',
    creditAccount: 'OPENING_EQUITY',
    referenceId: `SELL-VEH-${vehicleId}-D${state.company.currentDay}`,
    description: `حصيلة بيع المركبة المملوكة (${vehicle.name}) بحالة فنية ${vehicle.maintenanceHealth}%`,
  });

  const updatedCouriers = nextState.couriers.map((c) =>
    c.vehicleId === vehicleId
      ? {
          ...c,
          vehicleId: c.ownsPersonalMotorcycle ? `VEH-PERSONAL-${c.id}` : '',
          needsCompanyVehicle: !c.ownsPersonalMotorcycle,
        }
      : c
  );

  nextState = {
    ...nextState,
    vehicles: nextState.vehicles.filter((v) => v.id !== vehicleId),
    couriers: updatedCouriers,
  };

  return nextState;
}

/**
 * Terminates a leased vehicle contract and returns the vehicle when not on an active mission.
 */
export function terminateLeasedVehicle(
  state: GameState,
  vehicleId: string
): GameState {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    throw new Error('المركبة غير موجودة.');
  }
  if (vehicle.ownershipType !== 'LEASED') {
    throw new Error('هذه المركبة ليست مستأجرة.');
  }
  if (vehicle.status === 'IN_USE') {
    throw new Error('لا يمكن إنهاء إيجار المركبة أثناء وجودها في رحلة نشطة.');
  }

  const updatedCouriers = state.couriers.map((c) =>
    c.vehicleId === vehicleId
      ? {
          ...c,
          vehicleId: c.ownsPersonalMotorcycle ? `VEH-PERSONAL-${c.id}` : '',
          needsCompanyVehicle: !c.ownsPersonalMotorcycle,
        }
      : c
  );

  return {
    ...state,
    vehicles: state.vehicles.filter((v) => v.id !== vehicleId),
    couriers: updatedCouriers,
  };
}

/**
 * Unassigns a vehicle from its current courier so it can be reassigned to another courier.
 */
export function unassignVehicleFromCourier(
  state: GameState,
  vehicleId: string
): GameState {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    throw new Error('المركبة غير موجودة.');
  }
  if (vehicle.status === 'IN_USE') {
    throw new Error('لا يمكن سحب المركبة من المندوب أثناء تنفيذ رحلة توصيل نشطة.');
  }

  const updatedVehicles = state.vehicles.map((v) =>
    v.id === vehicleId ? { ...v, assignedCourierId: null } : v
  );

  const updatedCouriers = state.couriers.map((c) =>
    c.vehicleId === vehicleId
      ? {
          ...c,
          vehicleId: '',
          needsCompanyVehicle: !c.ownsPersonalMotorcycle,
        }
      : c
  );

  return {
    ...state,
    vehicles: updatedVehicles,
    couriers: updatedCouriers,
  };
}

/**
 * Strict 1-to-1 assignment of a company vehicle to a courier.
 * - A single vehicle CANNOT be assigned to two couriers at the same time (Acceptance Test 7).
 * - Updates the courier's weight (grams) and volume (cm³) capacity limits to match the assigned vehicle.
 */
export function assignVehicleToCourier(
  state: GameState,
  vehicleId: string,
  courierId: string
): GameState {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    throw new Error('المركبة المطلوبة غير موجودة في أسطول الشركة.');
  }

  const courier = state.couriers.find((c) => c.id === courierId);
  if (!courier) {
    throw new Error('المندوب المطلوب غير موجود.');
  }

  // Strict 1-to-1 check: if this vehicle is already assigned to ANOTHER courier, reject!
  const otherCourierWithSameVehicle = state.couriers.find(
    (c) =>
      c.id !== courierId &&
      c.status !== 'UNAVAILABLE' &&
      (c.vehicleId === vehicleId || vehicle.assignedCourierId === c.id)
  );
  if (
    (vehicle.assignedCourierId && vehicle.assignedCourierId !== courierId) ||
    otherCourierWithSameVehicle
  ) {
    const otherName = otherCourierWithSameVehicle?.name || 'مندوب آخر';
    throw new Error(
      `لا يمكن تخصيص المركبة (${vehicle.name}) لمندوبين في وقت واحد؛ المركبة مخصصة حالياً للمندوب (${otherName}). يجب فك ارتباطها أولاً.`
    );
  }

  const limits = getVehicleCapacityLimits(vehicle);

  // Release any previous company vehicle held by this courier
  const updatedVehicles = state.vehicles.map((v) => {
    if (v.id === vehicleId) {
      return {
        ...v,
        assignedCourierId: courierId,
      };
    }
    if (v.assignedCourierId === courierId) {
      return {
        ...v,
        assignedCourierId: null,
      };
    }
    return v;
  });

  const updatedCouriers = state.couriers.map((c) => {
    if (c.id !== courierId) return c;
    return {
      ...c,
      vehicleId,
      needsCompanyVehicle: false,
      maxLoad: vehicle.capacity || c.maxLoad,
      maxWeightGrams: limits.maxWeightGrams,
      maxVolumeCm3: limits.maxVolumeCm3,
      tripOperatingCostPiastres: vehicle.operatingCostPerTripPiastres,
    };
  });

  return {
    ...state,
    vehicles: updatedVehicles,
    couriers: updatedCouriers,
  };
}

/**
 * Processes the 8-Day Vehicle Lease Cycle (Acceptance Tests 16 & 17):
 * - Runs ONLY on every 8th day (Day 8, 16, 24...).
 * - Deducts lease rent ONLY for vehicles with `ownershipType === 'LEASED'`.
 * - NEVER deducts rent for `OWNED` vehicles or `PERSONAL_COURIER` motorcycles.
 * - Protected by `processedLeaseCycleDays` so reloading never double-deducts.
 */
export function processEightDayVehicleLeaseCycle(
  state: GameState,
  targetDay?: number
): GameState {
  const day = targetDay ?? state.company.currentDay;
  if (day <= 0 || day % 8 !== 0) {
    return state;
  }

  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;

  if (bd.processedLeaseCycleDays.includes(day)) {
    return nextState;
  }

  const leasedVehicles = nextState.vehicles.filter(
    (v) =>
      v.ownershipType === 'LEASED' &&
      (v.leaseCostPerCyclePiastres ?? 0) > 0
  );

  const totalLeaseDuePiastres = leasedVehicles.reduce(
    (sum, v) => sum + (v.leaseCostPerCyclePiastres || 0),
    0
  );

  if (totalLeaseDuePiastres <= 0) {
    return {
      ...nextState,
      businessDeveloper: {
        ...bd,
        processedLeaseCycleDays: [...bd.processedLeaseCycleDays, day],
      },
    };
  }

  const availableCash = nextState.company.cashPiastres;
  const amountPaid = Math.min(availableCash, totalLeaseDuePiastres);
  const shortfall = Math.max(0, totalLeaseDuePiastres - amountPaid);

  if (amountPaid > 0) {
    nextState = recordLedgerTransaction(nextState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: amountPaid,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: `VEHICLE-LEASE-CYCLE-D${day}`,
      description: `سداد إيجار المركبات المستأجرة لدورة الـ 8 أيام (${leasedVehicles.length} مركبة — اليوم ${day})`,
    });
  }

  // If cash was insufficient to pay all leased vehicles, repossess unpaid leased vehicles (zero-debt rule)
  let remainingVehicles = [...nextState.vehicles];
  let updatedCouriers = [...nextState.couriers];

  if (shortfall > 0) {
    let coveredSoFar = 0;
    const repossessedIds: string[] = [];
    for (const lv of leasedVehicles) {
      const rent = lv.leaseCostPerCyclePiastres || 0;
      if (coveredSoFar + rent <= amountPaid) {
        coveredSoFar += rent;
      } else {
        repossessedIds.push(lv.id);
      }
    }

    remainingVehicles = remainingVehicles.filter(
      (v) => !repossessedIds.includes(v.id)
    );
    updatedCouriers = updatedCouriers.map((c) =>
      repossessedIds.includes(c.vehicleId)
        ? {
            ...c,
            vehicleId: c.ownsPersonalMotorcycle ? `VEH-PERSONAL-${c.id}` : '',
            needsCompanyVehicle: !c.ownsPersonalMotorcycle,
          }
        : c
    );

    nextState = pushNotification(nextState, {
      dedupeKey: `LEASE-SHORTFALL-D${day}`,
      title: 'استرداد مركبات مستأجرة لعدم كفاية السيولة في دورة الـ 8 أيام',
      message: `تم سحب ${repossessedIds.length} مركبة مستأجرة لعدم توفر كامل إيجار الدورة (${formatEGP(totalLeaseDuePiastres)}).`,
      department: 'ACCOUNTING',
      outcomeLabel: 'سحب مركبات مستأجرة',
      severity: 'URGENT',
    });
  }

  return {
    ...nextState,
    vehicles: remainingVehicles,
    couriers: updatedCouriers,
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      processedLeaseCycleDays: [
        ...nextState.businessDeveloper!.processedLeaseCycleDays,
        day,
      ],
    },
  };
}

/**
 * Helper to resolve the effective vehicle for a courier (either an assigned company vehicle
 * or a virtual personal motorcycle if `courier.ownsPersonalMotorcycle === true`).
 */
export function resolveCourierEffectiveVehicle(
  state: GameState,
  courier: Courier
): Vehicle | null {
  if (courier.vehicleId) {
    const found = state.vehicles.find((v) => v.id === courier.vehicleId);
    if (found) return found;
  }

  if (courier.ownsPersonalMotorcycle && !courier.needsCompanyVehicle) {
    return {
      id: `VEH-PERSONAL-${courier.id}`,
      name: `موتوسيكل شخصي (${courier.name})`,
      type: 'MOTORCYCLE',
      typeAr: 'موتوسيكل شخصي مملوك للمندوب (بدون إيجار على الشركة)',
      catalogId: 'MOTO_ECONOMY',
      vehicleClass: 'MOTORCYCLE',
      ownershipType: 'PERSONAL_COURIER',
      leaseCostPerCyclePiastres: 0,
      assignedCourierId: courier.id,
      status: 'AVAILABLE',
      capacity: 3,
      usedCapacityToday: 0,
      maxWeightGrams: courier.maxWeightGrams || 12000, // 12 kg
      maxWeightKg: 12,
      internalLengthCm: 46,
      internalWidthCm: 42,
      internalHeightCm: 42,
      maxVolumeCm3: courier.maxVolumeCm3 || 81144,
      operatingCostPerTripPiastres: egpToPiastres(16),
      maintenanceHealth: 90,
    };
  }

  return null;
}

/**
 * Mode 1: Dispatches a single Platform Direct Order independently (`INDEPENDENT`).
 * Validates courier availability, vehicle assignment, weight (grams) and volume (cm³).
 */
export function dispatchPlatformOrderIndependent(
  state: GameState,
  orderId: string,
  courierId: string,
  modeOverride: 'INDEPENDENT' | 'SMART_AUTO' = 'INDEPENDENT'
): GameState {
  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;

  const orderIdx = bd.platformOrders.findIndex((o) => o.id === orderId);
  if (orderIdx === -1) {
    throw new Error('الطلب المطلوب غير موجود في قائمة طلبات المنصات.');
  }
  const order = bd.platformOrders[orderIdx];
  if (order.status !== 'WAITING_DISPATCH') {
    throw new Error('تم توجيه هذا الطلب بالفعل أو لم يعد في حالة انتظار التوزيع.');
  }

  const courier = nextState.couriers.find((c) => c.id === courierId);
  if (!courier || courier.status === 'UNAVAILABLE') {
    throw new Error('المندوب المختار غير متاح حالياً.');
  }

  const vehicle = resolveCourierEffectiveVehicle(nextState, courier);
  if (!vehicle || courier.needsCompanyVehicle) {
    throw new Error(
      `المندوب (${courier.name}) تم توظيفه بدون مركبة ولم تُخصص له مركبة من أسطول الشركة بعد.`
    );
  }

  if (vehicle.maintenanceHealth <= 15) {
    throw new Error(
      `المركبة (${vehicle.name}) بحالة فنية حرجة (${vehicle.maintenanceHealth}%) وتحتاج صيانة فورية قبل الانطلاق.`
    );
  }

  if (order.requiresCarOrTruck && vehicle.vehicleClass === 'MOTORCYCLE') {
    throw new Error(
      `هذا الطلب (${order.titleAr}) يتطلب سيارة توصيل أو شاحنة نقل نظراً لحجمه ووزنه (${formatWeightGramsAndKg(order.weightGrams)}).`
    );
  }

  const currentUsedWeight = courier.currentWeightGrams || 0;
  const currentUsedVolume = courier.currentVolumeCm3 || 0;

  const capCheck = checkVehicleCapacityFit(
    vehicle,
    currentUsedWeight + order.weightGrams,
    currentUsedVolume + order.volumeCm3
  );
  if (!capCheck.fits) {
    throw new Error(capCheck.reasonAr || 'الحمولة تتجاوز سعة المركبة المخصصة.');
  }

  const dispatchUpgradeLevel = bd.upgradeLevels['UPG-DISPATCH-UNIT'] || 0;
  const fuelDiscountRatio = Math.max(0.7, 1 - dispatchUpgradeLevel * 0.08);
  const actualTripCostPiastres = Math.round(
    Math.max(
      order.estimatedTripCostPiastres,
      vehicle.operatingCostPerTripPiastres
    ) * fuelDiscountRatio
  );

  const afford = canAffordImmediatePayment(nextState, actualTripCostPiastres);
  if (!afford.allowed) {
    throw new Error(
      `السيولة النقدية (${formatEGP(nextState.company.cashPiastres)}) لا تكفي لتغطية تكلفة وقود وتشغيل الرحلة (${formatEGP(actualTripCostPiastres)}).`
    );
  }

  nextState = recordLedgerTransaction(nextState, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: actualTripCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: `TRIP-COST-${order.id}`,
    description: `تكلفة وقود وتشغيل رحلة توصيل (${order.trackingNumber} — ${order.pickupZone} إلى ${order.deliveryZone})`,
  });

  const nowTotal = nextState.clock.totalElapsedMinutes;
  const zoneInfo = CAIRO_GIZA_ZONES.find(
    (z) => z.nameAr === order.deliveryZone
  );
  const baseTravelMinutes = zoneInfo ? zoneInfo.baseTripMinutes : 25;
  const speedBonus = Math.max(0.75, 115 / Math.max(60, courier.efficiency));
  const travelMinutes = Math.max(
    10,
    Math.round(baseTravelMinutes * speedBonus) + order.prepTimeMinutes
  );
  const expectedArrivalTotal = nowTotal + travelMinutes;
  const expectedArrivalMinutesFromMidnight = Math.min(
    1435,
    nextState.clock.minutesFromMidnight + travelMinutes
  );

  const updatedOrder: PlatformDirectOrder = {
    ...order,
    status: 'PICKED_UP_IN_TRANSIT',
    dispatchMode: modeOverride,
    assignedCourierId: courier.id,
    assignedCourierName: courier.name,
    assignedVehicleId: vehicle.id,
    assignedVehicleName: vehicle.name,
    actualTripCostPiastres,
    dispatchedAtTotalMinutes: nowTotal,
    expectedArrivalTotalMinutes: expectedArrivalTotal,
    expectedArrivalTimeLabel: formatClockTime(expectedArrivalMinutesFromMidnight),
  };

  const copyOrders = [...nextState.businessDeveloper!.platformOrders];
  copyOrders[orderIdx] = updatedOrder;

  const updatedCouriers = nextState.couriers.map((c) =>
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
  );

  const updatedVehicles = nextState.vehicles.map((v) =>
    v.id === vehicle.id
      ? {
          ...v,
          status: 'IN_USE' as const,
          usedCapacityToday: v.usedCapacityToday + 1,
          usedWeightGrams: (v.usedWeightGrams || 0) + order.weightGrams,
          usedVolumeCm3: (v.usedVolumeCm3 || 0) + order.volumeCm3,
        }
      : v
  );

  return {
    ...nextState,
    couriers: updatedCouriers,
    vehicles: updatedVehicles,
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      platformOrders: copyOrders,
    },
  };
}

/**
 * Mode 2: Dispatches multiple Platform Direct Orders in a Directional Route Batch (`BATCH_DIRECTIONAL`).
 * Validates:
 * 1. Directional compatibility (same `directionSector` or compatible corridor).
 * 2. Combined Weight (`grams`) and Volume (`cm³`) fit within the courier's vehicle capacity (Acceptance Tests 8 & 11).
 * 3. Hot food / urgent SLA compatibility (prevents batching unbatchable peak rush food orders if they risk spoiling).
 * 4. Builds explicit pickup-before-delivery stop sequence and calculates fuel savings.
 */
export function dispatchPlatformOrdersBatched(
  state: GameState,
  orderIds: string[],
  courierId: string,
  fromSmartAuto = false
): GameState {
  const uniqueIds = Array.from(new Set(orderIds));
  if (uniqueIds.length < 2) {
    throw new Error('يتطلب التوصيل المجمع اختيار طلبين (2) على الأقل في نفس الاتجاه.');
  }

  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;

  const selectedOrders = uniqueIds.map((id) => {
    const found = bd.platformOrders.find((o) => o.id === id);
    if (!found) {
      throw new Error(`الطلب (${id}) غير موجود.`);
    }
    if (found.status !== 'WAITING_DISPATCH') {
      throw new Error(`الطلب (${found.trackingNumber}) ليس في حالة انتظار التوزيع.`);
    }
    return found;
  });

  // Check directional compatibility (Acceptance Test 11)
  const primarySector = selectedOrders[0].directionSector;
  const incompatibleDirectionOrder = selectedOrders.find(
    (o) =>
      o.directionSector !== primarySector &&
      o.directionSector !== 'CENTRAL' &&
      primarySector !== 'CENTRAL'
  );
  if (incompatibleDirectionOrder) {
    throw new Error(
      `لا يمكن تجميع طلبات في اتجاهات متعاكسة (${selectedOrders[0].deliveryZone} و ${incompatibleDirectionOrder.deliveryZone})؛ التجميع مسموح فقط للطلبات المتقاربة أو الواقعة على نفس خط السير.`
    );
  }

  // Check if any order has strict non-batchable urgent food window when combined with > 2 stops
  const urgentNonBatchable = selectedOrders.find(
    (o) => !o.batchable && o.hotFoodSensitive && selectedOrders.length >= 2
  );
  if (urgentNonBatchable) {
    throw new Error(
      `الطلب (${urgentNonBatchable.trackingNumber} — ${urgentNonBatchable.titleAr}) حساس جداً للوقت والحرارة ولا يسمح بالتجميع لتفادي برودة الطعام وتأخر الموعد.`
    );
  }

  const courier = nextState.couriers.find((c) => c.id === courierId);
  if (!courier || courier.status === 'UNAVAILABLE') {
    throw new Error('المندوب المختار غير متاح.');
  }

  const vehicle = resolveCourierEffectiveVehicle(nextState, courier);
  if (!vehicle || courier.needsCompanyVehicle) {
    throw new Error(
      `المندوب (${courier.name}) لا يمتلك مركبة مخصصة حالياً.`
    );
  }

  if (vehicle.maintenanceHealth <= 15) {
    throw new Error(
      `المركبة (${vehicle.name}) تحتاج صيانة فورية قبل تنفيذ خط تجميع.`
    );
  }

  const totalWeightGrams = selectedOrders.reduce(
    (sum, o) => sum + o.weightGrams,
    0
  );
  const totalVolumeCm3 = selectedOrders.reduce(
    (sum, o) => sum + o.volumeCm3,
    0
  );

  if (
    selectedOrders.some((o) => o.requiresCarOrTruck) &&
    vehicle.vehicleClass === 'MOTORCYCLE'
  ) {
    throw new Error(
      'تتضمن الدفعة المجمعة طرداً كبيراً يتطلب سيارة توصيل صغيرة أو شاحنة نقل.'
    );
  }

  const capCheck = checkVehicleCapacityFit(
    vehicle,
    (courier.currentWeightGrams || 0) + totalWeightGrams,
    (courier.currentVolumeCm3 || 0) + totalVolumeCm3
  );
  if (!capCheck.fits) {
    throw new Error(capCheck.reasonAr || 'إجمالي وزن أو حجم الدفعة يتجاوز سعة المركبة.');
  }

  const rawIndependentCostPiastres = selectedOrders.reduce(
    (sum, o) => sum + o.estimatedTripCostPiastres,
    0
  );
  const dispatchUpgradeLevel = bd.upgradeLevels['UPG-DISPATCH-UNIT'] || 0;
  const batchEfficiencyRatio = Math.max(0.62, 0.72 - dispatchUpgradeLevel * 0.04);
  const totalBatchTripCostPiastres = Math.round(
    rawIndependentCostPiastres * batchEfficiencyRatio
  );
  const savedFuelPiastres = Math.max(
    0,
    rawIndependentCostPiastres - totalBatchTripCostPiastres
  );

  const afford = canAffordImmediatePayment(nextState, totalBatchTripCostPiastres);
  if (!afford.allowed) {
    throw new Error(
      `السيولة النقدية (${formatEGP(nextState.company.cashPiastres)}) لا تكفي لتغطية وقود خط التجميع (${formatEGP(totalBatchTripCostPiastres)}).`
    );
  }

  const batchId = `BATCH-D${nextState.company.currentDay}-${bd.routeBatches.length + 1}`;

  nextState = recordLedgerTransaction(nextState, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: totalBatchTripCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: batchId,
    description: `وقود وتشغيل خط توصيل مجمع (${selectedOrders.length} طلبات في اتجاه ${selectedOrders[0].deliveryZone} — وفر ${formatEGP(savedFuelPiastres)})`,
  });

  // Sequence: All Pickups first, then Deliveries in order of deadline
  const sortedByDeadline = [...selectedOrders].sort(
    (a, b) => a.deadlineTotalMinutes - b.deadlineTotalMinutes
  );
  const pickupSteps = sortedByDeadline.map(
    (o, idx) => `استلام (${idx + 1}): ${o.pickupPartnerAr} (${o.pickupZone})`
  );
  const deliverySteps = sortedByDeadline.map(
    (o, idx) => `تسليم (${idx + 1}): ${o.deliveryZone} [${o.trackingNumber}]`
  );
  const routeStopsSequenceAr = [...pickupSteps, ...deliverySteps];

  const nowTotal = nextState.clock.totalElapsedMinutes;
  const maxPrep = Math.max(...selectedOrders.map((o) => o.prepTimeMinutes));
  const perStopCostShare = Math.round(
    totalBatchTripCostPiastres / selectedOrders.length
  );

  const updatedPlatformOrders = nextState.businessDeveloper!.platformOrders.map(
    (o) => {
      const stopIdx = sortedByDeadline.findIndex((s) => s.id === o.id);
      if (stopIdx === -1) return o;
      const arrivalOffsetMinutes = maxPrep + 20 + stopIdx * 10;
      const expectedArrivalTotal = nowTotal + arrivalOffsetMinutes;
      const expectedArrivalClock = Math.min(
        1435,
        nextState.clock.minutesFromMidnight + arrivalOffsetMinutes
      );

      return {
        ...o,
        status: 'PICKED_UP_IN_TRANSIT' as const,
        dispatchMode: fromSmartAuto
          ? ('SMART_AUTO' as const)
          : ('BATCH_DIRECTIONAL' as const),
        batchId,
        assignedCourierId: courier.id,
        assignedCourierName: courier.name,
        assignedVehicleId: vehicle.id,
        assignedVehicleName: vehicle.name,
        actualTripCostPiastres: perStopCostShare,
        dispatchedAtTotalMinutes: nowTotal,
        expectedArrivalTotalMinutes: expectedArrivalTotal,
        expectedArrivalTimeLabel: formatClockTime(expectedArrivalClock),
      };
    }
  );

  const totalRevenuePiastres = selectedOrders.reduce(
    (sum, o) => sum + o.shippingTariffPiastres,
    0
  );

  const newBatch: PlatformRouteBatch = {
    id: batchId,
    day: nextState.company.currentDay,
    createdAtTimeLabel: formatClockTime(nextState.clock.minutesFromMidnight),
    directionSector: primarySector,
    orderIds: uniqueIds,
    courierId: courier.id,
    courierName: courier.name,
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    totalWeightGrams,
    totalVolumeCm3,
    totalRevenuePiastres,
    savedFuelPiastres,
    totalTripCostPiastres: totalBatchTripCostPiastres,
    routeStopsSequenceAr,
    riskLevel: selectedOrders.length >= 3 ? 'MODERATE' : 'LOW',
    explanationAr: `تجميع ${selectedOrders.length} طلبات متوافقة اتجاهياً بوزن إجمالي ${formatWeightGramsAndKg(totalWeightGrams)} وحجم ${totalVolumeCm3.toLocaleString('en-US')} سم³ وفر ${formatEGP(savedFuelPiastres)} من تكلفة الوقود.`,
  };

  const updatedCouriers = nextState.couriers.map((c) =>
    c.id === courier.id
      ? {
          ...c,
          status: 'ON_MISSION' as const,
          currentLoad: c.currentLoad + selectedOrders.length,
          currentWeightGrams: (c.currentWeightGrams || 0) + totalWeightGrams,
          currentVolumeCm3: (c.currentVolumeCm3 || 0) + totalVolumeCm3,
          activePlatformOrderIds: [
            ...(c.activePlatformOrderIds || []),
            ...uniqueIds,
          ],
        }
      : c
  );

  const updatedVehicles = nextState.vehicles.map((v) =>
    v.id === vehicle.id
      ? {
          ...v,
          status: 'IN_USE' as const,
          usedCapacityToday: v.usedCapacityToday + selectedOrders.length,
          usedWeightGrams: (v.usedWeightGrams || 0) + totalWeightGrams,
          usedVolumeCm3: (v.usedVolumeCm3 || 0) + totalVolumeCm3,
        }
      : v
  );

  return {
    ...nextState,
    couriers: updatedCouriers,
    vehicles: updatedVehicles,
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      platformOrders: updatedPlatformOrders,
      routeBatches: [newBatch, ...nextState.businessDeveloper!.routeBatches],
    },
  };
}

/**
 * Mode 3: Smart Auto-Dispatch (`runSmartAutoDispatch`) according to manager's chosen policy.
 * Evaluates waiting orders, available couriers, vehicle capacities, and directions,
 * and logs transparent Arabic reasoning for each decision.
 */
export function runSmartAutoDispatch(
  state: GameState,
  policyOverride?: SmartDispatchPolicy
): GameState {
  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const policy = policyOverride || bd.smartDispatchPolicy || 'BALANCED';

  nextState = {
    ...nextState,
    businessDeveloper: {
      ...bd,
      smartDispatchPolicy: policy,
    },
  };

  const waitingOrders = [...nextState.businessDeveloper!.platformOrders].filter(
    (o) => o.status === 'WAITING_DISPATCH'
  );
  if (waitingOrders.length === 0) {
    throw new Error('لا توجد طلبات منصات في قائمة الانتظار حالياً لتوزيعها تلقائياً.');
  }

  // Sort waiting orders according to policy
  waitingOrders.sort((a, b) => {
    if (policy === 'URGENT_FIRST' || policy === 'FASTEST') {
      return a.deadlineTotalMinutes - b.deadlineTotalMinutes;
    }
    if (policy === 'LOWEST_COST') {
      return a.estimatedTripCostPiastres - b.estimatedTripCostPiastres;
    }
    return (
      b.shippingTariffPiastres -
      b.estimatedTripCostPiastres -
      (a.shippingTariffPiastres - a.estimatedTripCostPiastres)
    );
  });

  const logsAdded: SmartDispatchDecisionLog[] = [];
  const handledOrderIds = new Set<string>();

  for (const order of waitingOrders) {
    if (handledOrderIds.has(order.id)) continue;

    // Find available couriers who have a valid vehicle that fits this order
    const candidateCouriers = nextState.couriers.filter((c) => {
      if (c.status === 'UNAVAILABLE' || c.needsCompanyVehicle) return false;
      const veh = resolveCourierEffectiveVehicle(nextState, c);
      if (!veh || veh.maintenanceHealth <= 15) return false;
      if (order.requiresCarOrTruck && veh.vehicleClass === 'MOTORCYCLE') {
        return false;
      }
      const fit = checkVehicleCapacityFit(
        veh,
        (c.currentWeightGrams || 0) + order.weightGrams,
        (c.currentVolumeCm3 || 0) + order.volumeCm3
      );
      return fit.fits;
    });

    if (candidateCouriers.length === 0) continue;

    // Sort candidate couriers by policy
    candidateCouriers.sort((a, b) => {
      const vehA = resolveCourierEffectiveVehicle(nextState, a)!;
      const vehB = resolveCourierEffectiveVehicle(nextState, b)!;
      if (policy === 'FASTEST' || policy === 'URGENT_FIRST') {
        return b.efficiency - a.efficiency;
      }
      if (policy === 'LOWEST_COST') {
        return (
          vehA.operatingCostPerTripPiastres - vehB.operatingCostPerTripPiastres
        );
      }
      return b.efficiency - a.efficiency;
    });

    const chosenCourier = candidateCouriers[0];
    const chosenVehicle = resolveCourierEffectiveVehicle(
      nextState,
      chosenCourier
    )!;

    // Check if we should batch a second compatible order in the same direction
    const allowBatchingInPolicy =
      policy === 'LOWEST_COST' ||
      policy === 'BALANCED' ||
      policy === 'MAX_WAIT_TIME';

    const partnerOrder =
      allowBatchingInPolicy && order.batchable
        ? waitingOrders.find(
            (other) =>
              other.id !== order.id &&
              !handledOrderIds.has(other.id) &&
              other.batchable &&
              other.directionSector === order.directionSector &&
              (!other.requiresCarOrTruck ||
                chosenVehicle.vehicleClass !== 'MOTORCYCLE') &&
              checkVehicleCapacityFit(
                chosenVehicle,
                (chosenCourier.currentWeightGrams || 0) +
                  order.weightGrams +
                  other.weightGrams,
                (chosenCourier.currentVolumeCm3 || 0) +
                  order.volumeCm3 +
                  other.volumeCm3
              ).fits
          )
        : undefined;

    try {
      if (partnerOrder) {
        nextState = dispatchPlatformOrdersBatched(
          nextState,
          [order.id, partnerOrder.id],
          chosenCourier.id,
          true
        );
        handledOrderIds.add(order.id);
        handledOrderIds.add(partnerOrder.id);

        logsAdded.push({
          id: `SDLOG-D${nextState.company.currentDay}-${Date.now()}-${logsAdded.length + 1}`,
          day: nextState.company.currentDay,
          timeLabel: formatClockTime(nextState.clock.minutesFromMidnight),
          policyUsed: policy,
          orderIds: [order.trackingNumber, partnerOrder.trackingNumber],
          modeChosen: 'BATCH_DIRECTIONAL',
          courierName: chosenCourier.name,
          vehicleName: chosenVehicle.name,
          totalWeightGrams: order.weightGrams + partnerOrder.weightGrams,
          totalVolumeCm3: order.volumeCm3 + partnerOrder.volumeCm3,
          expectedRevenuePiastres:
            order.shippingTariffPiastres + partnerOrder.shippingTariffPiastres,
          expectedCostPiastres: Math.round(
            (order.estimatedTripCostPiastres +
              partnerOrder.estimatedTripCostPiastres) *
              0.7
          ),
          reasonAr: `دمج الطلبين (${order.trackingNumber} + ${partnerOrder.trackingNumber}) في نفس الاتجاه (${order.deliveryZone}) مع المندوب (${chosenCourier.name}) لتوفير الوقود مع توافق الوزن (${formatWeightGramsAndKg(order.weightGrams + partnerOrder.weightGrams)}) والحجم.`,
        });
      } else {
        nextState = dispatchPlatformOrderIndependent(
          nextState,
          order.id,
          chosenCourier.id,
          'SMART_AUTO'
        );
        handledOrderIds.add(order.id);

        logsAdded.push({
          id: `SDLOG-D${nextState.company.currentDay}-${Date.now()}-${logsAdded.length + 1}`,
          day: nextState.company.currentDay,
          timeLabel: formatClockTime(nextState.clock.minutesFromMidnight),
          policyUsed: policy,
          orderIds: [order.trackingNumber],
          modeChosen: 'INDEPENDENT',
          courierName: chosenCourier.name,
          vehicleName: chosenVehicle.name,
          totalWeightGrams: order.weightGrams,
          totalVolumeCm3: order.volumeCm3,
          expectedRevenuePiastres: order.shippingTariffPiastres,
          expectedCostPiastres: order.estimatedTripCostPiastres,
          reasonAr: `توجيه مستقل فوري للطلب (${order.trackingNumber}) مع المندوب (${chosenCourier.name}) بمركبة (${chosenVehicle.name}) لضمان الالتزام بموعد التسليم (${order.deadlineTimeLabel}).`,
        });
      }
    } catch {
      // Skip if liquidity or constraints prevented this specific dispatch
    }
  }

  return {
    ...nextState,
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      smartDispatchLogs: [
        ...logsAdded,
        ...nextState.businessDeveloper!.smartDispatchLogs,
      ].slice(0, 25),
    },
  };
}

/**
 * Advances active Platform Direct Orders on every simulation clock tick.
 * - Settles shipping tariff (`shippingTariffPiastres`) into `CASH` & `SERVICE_REVENUE` upon delivery (never merchant order value!).
 * - Applies SLA penalties if delayed or expired.
 * - Updates courier load, vehicle wear, followers, and social media posts.
 */
export function tickPlatformOrdersSimulation(state: GameState): GameState {
  if (!state.businessDeveloper) return state;
  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const nowTotal = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);

  let ordersChanged = false;
  const updatedOrders = [...bd.platformOrders];
  let contracts = { ...bd.contracts };
  let followers = bd.followersCount;
  const newSocialPosts: SocialMediaPost[] = [];

  for (let i = 0; i < updatedOrders.length; i++) {
    const ord = updatedOrders[i];
    if (ord.settledFinancially) continue;

    // 1. Check WAITING_DISPATCH orders that exceeded their deadline without being dispatched
    if (
      ord.status === 'WAITING_DISPATCH' &&
      nowTotal > ord.deadlineTotalMinutes
    ) {
      ordersChanged = true;
      const contract = contracts[ord.platformId];
      const config = BUSINESS_DEVELOPER_PLATFORMS[ord.platformId];
      const penaltyPiastres = Math.min(
        nextState.company.cashPiastres,
        egpToPiastres(config.latePenaltyEgp)
      );

      if (penaltyPiastres > 0) {
        nextState = recordLedgerTransaction(nextState, {
          type: 'OPERATING_EXPENSE_PAID',
          amountPiastres: penaltyPiastres,
          debitAccount: 'OPERATING_EXPENSE',
          creditAccount: 'CASH',
          referenceId: `PLAT-EXPIRE-${ord.id}`,
          description: `غرامة انتهاء مهلة طلب منصة «${config.nameAr}» (${ord.trackingNumber}) دون توزيع`,
        });
      }

      updatedOrders[i] = {
        ...ord,
        status: 'FAILED_OR_CANCELLED',
        settledFinancially: true,
        outcomeNoteAr: 'ألغي الطلب لانتهاء مهلة التوصيل دون تخصيص مندوب ومركبة.',
      };

      const nextSla = Math.max(20, contract.slaScore - 5);
      contracts = {
        ...contracts,
        [ord.platformId]: {
          ...contract,
          slaScore: nextSla,
          status: nextSla < 55 ? 'WARNING' : contract.status,
          delayedOrFailedOrdersCount: contract.delayedOrFailedOrdersCount + 1,
          totalPenaltiesPiastres:
            contract.totalPenaltiesPiastres + penaltyPiastres,
        },
      };
      followers = Math.max(50, followers - 18);
      nextState = {
        ...nextState,
        company: {
          ...nextState.company,
          reputation: Math.max(0, nextState.company.reputation - 2),
        },
      };
      continue;
    }

    // 2. Check PICKED_UP_IN_TRANSIT orders that have reached their arrival time
    if (
      ord.status === 'PICKED_UP_IN_TRANSIT' &&
      ord.expectedArrivalTotalMinutes !== undefined &&
      nowTotal >= ord.expectedArrivalTotalMinutes
    ) {
      ordersChanged = true;
      const isLate = nowTotal > ord.deadlineTotalMinutes;
      const contract = contracts[ord.platformId];
      const config = BUSINESS_DEVELOPER_PLATFORMS[ord.platformId];

      // Strictly earn ONLY the shipping company's tariff (reduced by late penalty if late), NEVER merchantOrderValuePiastres!
      const lateDeductionPiastres = isLate
        ? Math.min(
            Math.round(ord.shippingTariffPiastres * 0.35),
            egpToPiastres(config.latePenaltyEgp)
          )
        : 0;
      const netShippingRevenuePiastres = Math.max(
        egpToPiastres(15),
        ord.shippingTariffPiastres - lateDeductionPiastres
      );

      // Record earned shipping tariff revenue + cash receipt
      nextState = recordLedgerTransaction(nextState, {
        type: 'REVENUE_EARNED',
        amountPiastres: netShippingRevenuePiastres,
        debitAccount: 'ACCOUNTS_RECEIVABLE',
        creditAccount: 'SERVICE_REVENUE',
        referenceId: `PLAT-REV-${ord.id}`,
        description: `إيراد توصيل طلب «${config.nameAr}» (${ord.trackingNumber}) — تعريفة الشحن فقط بدون قيمة البضاعة`,
      });
      nextState = recordLedgerTransaction(nextState, {
        type: 'CASH_COLLECTION',
        amountPiastres: netShippingRevenuePiastres,
        debitAccount: 'CASH',
        creditAccount: 'ACCOUNTS_RECEIVABLE',
        referenceId: `PLAT-CASH-${ord.id}`,
        description: `تحصيل نقدي لتعريفة شحن طلب «${config.nameAr}» (${ord.trackingNumber})`,
      });

      updatedOrders[i] = {
        ...ord,
        status: isLate ? 'DELAYED_DELIVERED' : 'DELIVERED',
        completedAtTotalMinutes: nowTotal,
        settledFinancially: true,
        outcomeNoteAr: isLate
          ? `تم التسليم مع تأخير عن الموعد؛ حُصل صافي أجر الشحن ${formatEGP(netShippingRevenuePiastres)} بعد خصم تأخير ${formatEGP(lateDeductionPiastres)}.`
          : `تم التسليم بنجاح في الموعد المحدد (${timeLabel}) وحُصل أجر الشحن ${formatEGP(netShippingRevenuePiastres)}.`,
      };

      // Release courier and vehicle capacity
      nextState = {
        ...nextState,
        couriers: nextState.couriers.map((c) => {
          if (c.id !== ord.assignedCourierId) return c;
          const remainingIds = (c.activePlatformOrderIds || []).filter(
            (id) => id !== ord.id
          );
          return {
            ...c,
            status:
              remainingIds.length === 0 && c.assignedTrackingNumbers.length === 0
                ? ('AVAILABLE' as const)
                : c.status,
            currentLoad: Math.max(0, c.currentLoad - 1),
            currentWeightGrams: Math.max(
              0,
              (c.currentWeightGrams || 0) - ord.weightGrams
            ),
            currentVolumeCm3: Math.max(
              0,
              (c.currentVolumeCm3 || 0) - ord.volumeCm3
            ),
            activePlatformOrderIds: remainingIds,
            successfulDeliveriesCount: isLate
              ? c.successfulDeliveriesCount
              : c.successfulDeliveriesCount + 1,
            failedOrDelayedCount: isLate
              ? c.failedOrDelayedCount + 1
              : c.failedOrDelayedCount,
          };
        }),
        vehicles: nextState.vehicles.map((v) => {
          if (v.id !== ord.assignedVehicleId) return v;
          const workshopLevel = bd.upgradeLevels['UPG-PREVENTIVE-WORKSHOP'] || 0;
          const wear = Math.max(1, 2 - Math.floor(workshopLevel * 0.5));
          return {
            ...v,
            status: 'AVAILABLE' as const,
            usedWeightGrams: Math.max(
              0,
              (v.usedWeightGrams || 0) - ord.weightGrams
            ),
            usedVolumeCm3: Math.max(0, (v.usedVolumeCm3 || 0) - ord.volumeCm3),
            totalDistanceKm: (v.totalDistanceKm || 0) + 9,
            tripsCompletedCount: (v.tripsCompletedCount || 0) + 1,
            maintenanceHealth: Math.max(15, v.maintenanceHealth - wear),
          };
        }),
        employees: nextState.employees.map((e) => {
          const linkedCourier = nextState.couriers.find(
            (c) => c.id === ord.assignedCourierId
          );
          if (!linkedCourier || e.id !== linkedCourier.employeeId) return e;
          return {
            ...e,
            completedTasksCount: e.completedTasksCount + 1,
          };
        }),
        company: {
          ...nextState.company,
          reputation: isLate
            ? Math.max(0, nextState.company.reputation - 1)
            : Math.min(100, nextState.company.reputation + 1),
        },
      };

      const nextSla = isLate
        ? Math.max(25, contract.slaScore - 4)
        : Math.min(100, contract.slaScore + 2);
      const nextDelayedCount = isLate
        ? contract.delayedOrFailedOrdersCount + 1
        : contract.delayedOrFailedOrdersCount;

      const shouldCancelContract =
        isLate &&
        contract.status === 'WARNING' &&
        (nextSla <= 40 || nextDelayedCount >= 5);
      const nextContractStatus = shouldCancelContract
        ? ('SUSPENDED' as const)
        : nextSla < 58 || nextDelayedCount >= 3
          ? ('WARNING' as const)
          : ('ACTIVE' as const);

      if (shouldCancelContract) {
        nextState = pushNotification(nextState, {
          dedupeKey: `CONTRACT-CANCELLED-${ord.platformId}-D${nextState.company.currentDay}`,
          title: `فسخ وإيقاف عقد «${config.nameAr}» لتجاوز حد الشكاوى والتأخير!`,
          message: `بسبب تكرار الشكاوى والتأخير (${nextDelayedCount} مخالفات، مؤشر التزام ${nextSla}%) بعد الإنذار المسبق، تم فسخ/تعليق العقد تلقائياً دون استرداد رسوم جدية التعاقد (${formatEGP(contract.contractFeePiastres)}) تطبيقاً لشروط العقد الموقعة.`,
          department: 'MANAGEMENT',
          outcomeLabel: 'فسخ عقد بدون استرداد رسوم الجدية',
          severity: 'URGENT',
        });
      } else if (nextContractStatus === 'WARNING' && contract.status !== 'WARNING') {
        nextState = pushNotification(nextState, {
          dedupeKey: `CONTRACT-WARNING-${ord.platformId}-D${nextState.company.currentDay}-${nextDelayedCount}`,
          title: `إنذار رسمي من إدارة عقد «${config.nameAr}»`,
          message: `انخفض مؤشر الالتزام إلى ${nextSla}% (${nextDelayedCount} شكاوى تأخير). هذه فرصة تصحيح قبل الإلغاء التلقائي للعقد ومصادرة رسوم جدية التعاقد (${formatEGP(contract.contractFeePiastres)}).`,
          department: 'MANAGEMENT',
          outcomeLabel: 'إنذار قبل فسخ العقد',
          severity: 'WARNING',
        });
      }

      contracts = {
        ...contracts,
        [ord.platformId]: {
          ...contract,
          slaScore: nextSla,
          status: nextContractStatus,
          completedOrdersCount: isLate
            ? contract.completedOrdersCount
            : contract.completedOrdersCount + 1,
          delayedOrFailedOrdersCount: nextDelayedCount,
          totalRevenueEarnedPiastres:
            contract.totalRevenueEarnedPiastres + netShippingRevenuePiastres,
          totalOperatingCostPiastres:
            contract.totalOperatingCostPiastres + ord.actualTripCostPiastres,
          totalPenaltiesPiastres:
            contract.totalPenaltiesPiastres + lateDeductionPiastres,
        },
      };

      followers = isLate ? Math.max(50, followers - 12) : followers + 16;

      // Add real-event-driven social post
      const postDedupe = `SOC-PLAT-${ord.id}`;
      if (!(nextState.socialPosts || []).some((p) => p.dedupeKey === postDedupe)) {
        newSocialPosts.push({
          id: postDedupe,
          dedupeKey: postDedupe,
          day: nextState.company.currentDay,
          timeLabel,
          totalMinutes: nowTotal,
          authorClientId: ord.platformId,
          authorName:
            ord.platformId === 'WAKKELNY'
              ? `عميل منصة وكلني (${ord.deliveryZone})`
              : `عميل متجر زورو (${ord.deliveryZone})`,
          authorRoleAr:
            ord.platformId === 'WAKKELNY' ? 'طلب مطاعم ساخن' : 'متسوق تجارة إلكترونية',
          authorHandle:
            ord.platformId === 'WAKKELNY' ? '@wakkelny_foodie' : '@zoro_shopper_eg',
          authorAvatarId: ord.platformId === 'WAKKELNY' ? 'nourhan' : 'kareem',
          relatedTrackingNumber: ord.trackingNumber,
          sentiment: isLate ? 'COMPLAINT' : 'PRAISE',
          ratingStars: isLate ? 2 : 5,
          contentAr: isLate
            ? `طلبي (${ord.titleAr}) رقم ${ord.trackingNumber} وصل متأخر عن الميعاد المتوقع في ${ord.deliveryZone}. نرجو تحسين سرعة التوجيه.`
            : `تجربة ممتازة! استلمت طلبي (${ord.titleAr}) رقم ${ord.trackingNumber} في ${ord.deliveryZone} بسرعة وبحالة ممتازة مع المندوب ${ord.assignedCourierName || ''}.`,
          likesCount: isLate ? 19 : 34,
          commentsCount: isLate ? 7 : 5,
          reputationDelta: isLate ? -1 : 1,
          complaintStatus: isLate ? 'OPEN' : undefined,
          complaintCategory: isLate ? 'DELAY' : undefined,
        });
      }
    }
  }

  if (!ordersChanged) return nextState;

  return {
    ...nextState,
    socialPosts: [...newSocialPosts, ...(nextState.socialPosts || [])],
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      contracts,
      followersCount: followers,
      platformOrders: updatedOrders,
    },
  };
}

/**
 * Purchases an Operations Center / HQ Upgrade (`OPERATIONS_UPGRADE_CATALOG`).
 */
export function purchaseOperationsUpgrade(
  state: GameState,
  upgradeId: string
): GameState {
  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const config = OPERATIONS_UPGRADE_CATALOG.find((u) => u.id === upgradeId);
  if (!config) {
    throw new Error('ترقية مركز التشغيل غير موجودة.');
  }

  const currentLevel = bd.upgradeLevels[upgradeId] || 0;
  if (currentLevel >= config.maxLevel) {
    throw new Error(`تم الوصول للحد الأقصى للمستوى (${config.maxLevel}) لهذه الترقية.`);
  }

  const nextLevel = currentLevel + 1;
  const costPiastres = config.costPiastres * nextLevel;

  const afford = canAffordImmediatePayment(nextState, costPiastres);
  if (!afford.allowed) {
    throw new Error(
      `السيولة النقدية (${formatEGP(nextState.company.cashPiastres)}) لا تكفي لترقية «${config.nameAr}» للمستوى ${nextLevel} بتكلفة ${formatEGP(costPiastres)}.`
    );
  }

  nextState = recordLedgerTransaction(nextState, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: costPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: `OP-UPG-${upgradeId}-L${nextLevel}-D${nextState.company.currentDay}`,
    description: `تطوير المقر ومركز التشغيل: ${config.nameAr} (المستوى ${nextLevel})`,
  });

  // Apply immediate buff if Driver Training
  let updatedCouriers = [...nextState.couriers];
  let updatedEmployees = [...nextState.employees];
  if (upgradeId === 'UPG-DRIVER-TRAINING') {
    updatedCouriers = updatedCouriers.map((c) => ({
      ...c,
      efficiency: Math.min(100, c.efficiency + 5),
    }));
    updatedEmployees = updatedEmployees.map((e) =>
      e.role === 'COURIER_MOTO' || e.role === 'COURIER_VAN'
        ? { ...e, efficiency: Math.min(100, e.efficiency + 5) }
        : e
    );
  }

  return {
    ...nextState,
    couriers: updatedCouriers,
    employees: updatedEmployees,
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      upgradeLevels: {
        ...nextState.businessDeveloper!.upgradeLevels,
        [upgradeId]: nextLevel,
      },
    },
  };
}

/**
 * Launches a Contract-Specific Marketing Campaign (`CONTRACT_MARKETING_CATALOG`).
 * - Outcome depends dynamically on reputation, SLA score, and operational fleet capacity.
 * - Followers/engagement NEVER guarantee automatic profit if capacity is saturated (Acceptance Test 19 & 21).
 */
export function launchContractMarketingCampaign(
  state: GameState,
  campaignCatalogId: string
): GameState {
  let nextState = ensureBusinessDeveloperState(state);
  const bd = nextState.businessDeveloper!;
  const template = CONTRACT_MARKETING_CATALOG.find(
    (c) => c.id === campaignCatalogId
  );
  if (!template) {
    throw new Error('الحملة التسويقية المطلوبة غير موجودة.');
  }

  if (
    template.targetPlatform !== 'GENERAL_BRAND' &&
    !bd.contracts[template.targetPlatform].signed
  ) {
    throw new Error(
      `يجب توقيع عقد منصة «${BUSINESS_DEVELOPER_PLATFORMS[template.targetPlatform].nameAr}» أولاً قبل إطلاق حملة مخصصة لها.`
    );
  }

  const afford = canAffordImmediatePayment(nextState, template.costPiastres);
  if (!afford.allowed) {
    throw new Error(
      `السيولة النقدية (${formatEGP(nextState.company.cashPiastres)}) لا تكفي لإطلاق «${template.nameAr}» بتكلفة ${formatEGP(template.costPiastres)}.`
    );
  }

  const runId = `CMKT-${campaignCatalogId}-D${nextState.company.currentDay}-${bd.contractCampaigns.length + 1}`;

  nextState = recordLedgerTransaction(nextState, {
    type: 'MARKETING_CAMPAIGN_PAID',
    amountPiastres: template.costPiastres,
    debitAccount: 'MARKETING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: runId,
    description: `إطلاق حملة تسويق عقود: ${template.nameAr}`,
  });

  // Evaluate operational readiness vs incoming demand
  const activeCouriersWithVehicles = nextState.couriers.filter(
    (c) =>
      c.status !== 'UNAVAILABLE' &&
      !c.needsCompanyVehicle &&
      resolveCourierEffectiveVehicle(nextState, c) !== null
  ).length;
  const waitingOrdersCount = bd.platformOrders.filter(
    (o) => o.status === 'WAITING_DISPATCH'
  ).length;

  const isOvercapacity =
    activeCouriersWithVehicles === 0 ||
    waitingOrdersCount > activeCouriersWithVehicles * 3;
  const reputationLow =
    nextState.company.reputation < template.minRequiredReputation;

  const actualExtraOrders = reputationLow
    ? Math.max(1, Math.floor(template.expectedExtraOrdersPerDay * 0.5))
    : template.expectedExtraOrdersPerDay;
  const actualFollowersGain = reputationLow
    ? Math.round(template.expectedFollowersGain * 0.6)
    : template.expectedFollowersGain;
  const reputationDelta = isOvercapacity
    ? -2 // Marketing while fleet is saturated causes customer frustration!
    : template.expectedReputationBoost;

  const outcomeSummaryAr = isOvercapacity
    ? `جذبت الحملة +${actualFollowersGain} متابع، لكن نقص المناديب والمركبات المتاحة مقارنة بالطلبات أدى لتراكم الطابور وتراجع السمعة بـ ${reputationDelta}. التفاعل وحده لا يضمن الربح دون قدرة تشغيلية!`
    : reputationLow
      ? `حققت الحملة نتائج محدودة (+${actualExtraOrders} طلبات/يوم) بسبب انخفاض سمعة الشركة الحالية عن المستوى الأمثل (${template.minRequiredReputation}).`
      : `نجحت الحملة في رفع تدفق الطلبات بـ +${actualExtraOrders} طلبات يومياً وإضافة +${actualFollowersGain} متابع مع جاهزية تشغيلية جيدة.`;

  let updatedContracts = { ...bd.contracts };
  if (template.targetPlatform !== 'GENERAL_BRAND') {
    const prevC = updatedContracts[template.targetPlatform];
    updatedContracts = {
      ...updatedContracts,
      [template.targetPlatform]: {
        ...prevC,
        extraDailyOrdersFromMarketing:
          prevC.extraDailyOrdersFromMarketing + actualExtraOrders,
      },
    };
  }

  nextState = {
    ...nextState,
    company: {
      ...nextState.company,
      reputation: Math.max(
        0,
        Math.min(100, nextState.company.reputation + reputationDelta)
      ),
    },
    businessDeveloper: {
      ...nextState.businessDeveloper!,
      followersCount: Math.max(
        50,
        nextState.businessDeveloper!.followersCount + actualFollowersGain
      ),
      contracts: updatedContracts,
      contractCampaigns: [
        {
          id: runId,
          catalogId: template.id,
          targetPlatform: template.targetPlatform,
          nameAr: template.nameAr,
          launchedAtDay: nextState.company.currentDay,
          expiresAtDay: nextState.company.currentDay + template.durationDays,
          costPiastres: template.costPiastres,
          extraOrdersPerDay: actualExtraOrders,
          followersGained: actualFollowersGain,
          reputationDelta,
          outcomeSummaryAr,
          overcapacityWarningTriggered: isOvercapacity,
        },
        ...nextState.businessDeveloper!.contractCampaigns,
      ],
    },
  };

  if (template.targetPlatform !== 'GENERAL_BRAND') {
    nextState = generatePlatformOrdersForContract(
      nextState,
      template.targetPlatform,
      nextState.company.currentDay,
      actualExtraOrders
    );
  }

  return nextState;
}

/**
 * Adds equity capital investment from company partners/founders (without creating debt or negative balance)
 * so the manager can scale up contracts (`وكلني` 8,000 EGP / `زورو` 15,000 EGP) and purchase/lease fleet vehicles.
 */
export function injectPartnerCapitalExpansion(
  state: GameState,
  amountEgp: number,
  reasonAr = 'تمويل رأسمالي توسعي من الشركاء لتوقيع عقود المنصات وتحديث الأسطول (بدون ديون)'
): GameState {
  const safeEgp = Math.max(1000, Math.min(2000000, Math.round(amountEgp)));
  const amountPiastres = egpToPiastres(safeEgp);
  const refId = `PARTNER-EQUITY-D${state.company.currentDay}-${state.ledger.length + 1}`;

  return recordLedgerTransaction(state, {
    type: 'CASH_COLLECTION',
    amountPiastres,
    debitAccount: 'CASH',
    creditAccount: 'OPENING_EQUITY',
    referenceId: refId,
    description: reasonAr,
  });
}
