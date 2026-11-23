import { Employee, GameState, Shipment, Warehouse } from '../types/game';
import { computeShipmentEstimateBreakdown } from './accountingEngine';
import {
  createInitialBusinessDeveloperState,
  ensureBusinessDeveloperState,
} from './businessDeveloperEngine';
import { calculateEgyptRouteDistance } from './geographyEngine';
import { buildRoleSkillsForLevel, evaluateEmployeePerformance } from './hrEngine';
import {
  createInitialHerfokPosts,
  createInitialIngobiaEvaluations,
} from './herfokAndEvaluationEngine';
import {
  createInitialOfflineSyncState,
  createInitialRealTimeBridge,
  generateUniqueCompanyCode,
} from './levelAndTimeEngine';
import { createInitialMarketingState } from './marketingEngine';
import {
  createInitialCompetitors,
  createInitialMarketAuctions,
  createInitialPricingEngineState,
} from './pricingAndMarketEngine';
import { createInitialSocialPosts } from './socialMediaEngine';
import { createInitialGameState } from './storyEngine';
import { createInitialTutorialState } from './tutorialEngine';
import {
  createInitialBubbleMessages,
  createInitialManagerGuideTasks,
  syncManagerGuideTasksWithRealState,
} from './guideAndSecretaryEngine';
import { ensureMyEmployeesAppInitialized } from './myEmployeesAppEngine';
import { ensureClientContractProfiles } from './returnsAndConflictEngine';
import { ensureWakkelnyZonesInitialized } from './wakkelnySimulationEngine';

export const SAVE_STORAGE_KEY = 'egypt_shipping_sim_save_v1';
export const PRE_V3_BACKUP_STORAGE_KEY = 'egypt_shipping_sim_backup_pre_v3';
export const CURRENT_SAVE_SCHEMA_VERSION = 2;

export interface SaveResult {
  success: boolean;
  errorMessage?: string;
}

export interface LoadResult {
  success: boolean;
  state?: GameState;
  errorMessage?: string;
}

/**
 * Safely migrates a v1 or older v2 saved state to the latest v2 schema by backfilling
 * marketing, HR job ads, 8-day payroll cycle, social media posts, tutorial, physical
 * warehouse/shipment dimensions, and Business Developer state without losing player progress or ledger.
 */
export function migrateSaveIfNeeded(rawObj: unknown): unknown {
  if (!rawObj || typeof rawObj !== 'object') return rawObj;
  const candidate = rawObj as Record<string, unknown>;
  const defaults = createInitialGameState();

  const currentDay =
    typeof (candidate.company as { currentDay?: number })?.currentDay === 'number'
      ? (candidate.company as { currentDay: number }).currentDay
      : 1;

  // Normalize company name to Ingobia Express and perform safe one-time migration to Level 1
  const rawCompany = (candidate.company as Record<string, unknown>) || {};
  const alreadyMigratedV3 = Boolean(rawCompany.levelSystemMigratedV3);

  if (!alreadyMigratedV3 && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        PRE_V3_BACKUP_STORAGE_KEY,
        JSON.stringify(candidate)
      );
    } catch {
      // Ignore storage quota errors on backup
    }
  }

  const companyId =
    typeof rawCompany.id === 'string' && rawCompany.id
      ? rawCompany.id
      : defaults.company.id;
  const companyCode =
    typeof rawCompany.companyCode === 'string' && rawCompany.companyCode
      ? rawCompany.companyCode
      : generateUniqueCompanyCode(companyId);

  const company = {
    ...defaults.company,
    ...rawCompany,
    id: companyId,
    companyCode,
    name:
      rawCompany.name === 'شركة النيل السريع للشحن' || !rawCompany.name
        ? 'انجوبيا اكسبريس — Ingobia Express'
        : (rawCompany.name as string),
    // Section 8 & 10: Safe migration to Level 1 for existing accounts while keeping Admin Level = 3
    level: alreadyMigratedV3 && typeof rawCompany.level === 'number'
      ? Math.max(1, Math.min(5, rawCompany.level))
      : 1,
    adminLevel:
      typeof rawCompany.adminLevel === 'number' ? rawCompany.adminLevel : 3,
    marketingPower:
      typeof rawCompany.marketingPower === 'number'
        ? rawCompany.marketingPower
        : 58,
    levelSystemMigratedV3: true,
  };

  // Backfill warehouses with maxWeightKg and maxVolumeM3
  const rawWarehouses = Array.isArray(candidate.warehouses)
    ? (candidate.warehouses as Partial<Warehouse>[])
    : defaults.warehouses;
  const migratedWarehouses = rawWarehouses.map((w, idx) => ({
    ...defaults.warehouses[0],
    ...w,
    name:
      idx === 0 && w.name === 'مستودع العباسية المركزي للفرز'
        ? 'مستودع انجوبيا المركزي للفرز (العباسية)'
        : w.name || defaults.warehouses[0].name,
    maxWeightKg: typeof w.maxWeightKg === 'number' ? w.maxWeightKg : 180,
    maxVolumeM3: typeof w.maxVolumeM3 === 'number' ? w.maxVolumeM3 : 6.5,
    rentedExtraWeightKg:
      typeof w.rentedExtraWeightKg === 'number' ? w.rentedExtraWeightKg : 0,
    rentedExtraVolumeM3:
      typeof w.rentedExtraVolumeM3 === 'number' ? w.rentedExtraVolumeM3 : 0,
  }));

  // Backfill employees with role, skills, performanceScore, and 8-day cycle
  const rawEmployees = Array.isArray(candidate.employees)
    ? (candidate.employees as Partial<Employee>[])
    : defaults.employees;
  const migratedEmployees = rawEmployees.map((emp) => {
    const isMahmoud = emp.id === 'EMP-MAHMOUD';
    const role =
      isMahmoud && emp.role === 'OPERATIONS_SUPERVISOR'
        ? 'ADMIN_ACCOUNTANT'
        : emp.role || 'COURIER_MOTO';
    const expLevel = emp.experienceLevel || (isMahmoud ? 'EXPERT' : 'INTERMEDIATE');
    const merged: Employee = {
      ...defaults.employees[0],
      ...emp,
      role,
      roleTitleAr:
        isMahmoud && emp.role === 'OPERATIONS_SUPERVISOR'
          ? 'المحاسب الإداري ومسؤول التشغيل'
          : emp.roleTitleAr || 'موظف تشغيل',
      experienceLevel: expLevel,
      skills:
        Array.isArray(emp.skills) && emp.skills.length > 0
          ? emp.skills
          : buildRoleSkillsForLevel(role, expLevel),
      salaryCycleDays: 8,
      salaryDueDay: 8,
      dailyCapacity:
        role === 'ADMIN_ACCOUNTANT' && (!emp.dailyCapacity || emp.dailyCapacity === 0)
          ? 8
          : emp.dailyCapacity ?? 4,
    };
    const perf = evaluateEmployeePerformance(merged);
    return {
      ...merged,
      performanceScore:
        typeof emp.performanceScore === 'number'
          ? emp.performanceScore
          : perf.performanceScore,
      performancePositiveFactors:
        Array.isArray(emp.performancePositiveFactors)
          ? emp.performancePositiveFactors
          : perf.positiveFactors,
      performanceNegativeFactors:
        Array.isArray(emp.performanceNegativeFactors)
          ? emp.performanceNegativeFactors
          : perf.negativeFactors,
      isLowPerformWarning:
        typeof emp.isLowPerformWarning === 'boolean'
          ? emp.isLowPerformWarning
          : perf.isLowPerformWarning,
      reviewCompleted: Boolean(emp.reviewCompleted),
    };
  });

  // Backfill shipments with physical weight/volume (grams & cm3) and accountant estimate
  const rawShipments = Array.isArray(candidate.shipments)
    ? (candidate.shipments as Record<string, unknown>[])
    : defaults.shipments;

  const migratedShipments = rawShipments.map((s) => {
    let status = (s.status as string) || 'NEW_REQUEST';
    if (status === 'READY_FOR_PICKUP') status = 'READY_FOR_DISPATCH';
    if (status === 'IN_TRANSIT') status = 'OUT_FOR_DELIVERY';

    const weightKg = typeof s.weightKg === 'number' ? s.weightKg : 6;
    const weightGrams =
      typeof s.weightGrams === 'number'
        ? s.weightGrams
        : Math.round(weightKg * 1000);
    const volumeM3 = typeof s.volumeM3 === 'number' ? s.volumeM3 : 0.2;
    const lengthCm = typeof s.lengthCm === 'number' ? s.lengthCm : 35;
    const widthCm = typeof s.widthCm === 'number' ? s.widthCm : 28;
    const heightCm = typeof s.heightCm === 'number' ? s.heightCm : 20;
    const volumeCm3 =
      typeof s.volumeCm3 === 'number'
        ? s.volumeCm3
        : lengthCm * widthCm * heightCm;
    const serviceFeePiastres =
      typeof s.serviceFeePiastres === 'number' ? s.serviceFeePiastres : 15000;
    const estimatedOperatingCostPiastres =
      typeof s.estimatedOperatingCostPiastres === 'number'
        ? s.estimatedOperatingCostPiastres
        : 5500;
    const codAmountPiastres =
      typeof s.codAmountPiastres === 'number' ? s.codAmountPiastres : 0;

    const existingEstimate = s.accountantEstimate as Shipment['accountantEstimate'];
    const accountantEstimate =
      existingEstimate ||
      computeShipmentEstimateBreakdown(
        {
          serviceFeePiastres,
          estimatedOperatingCostPiastres,
          codAmountPiastres,
          weightKg,
          volumeM3,
        },
        'EMP-MAHMOUD',
        'محمود عبد العزيز',
        '09:00'
      );

    const routeInfo = calculateEgyptRouteDistance(
      (s.pickupZone as string) || 'العباسية',
      (s.deliveryZone as string) || 'الدقي'
    );

    return {
      ...defaults.shipments[0],
      ...s,
      status,
      weightKg,
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
      volumeCm3,
      volumeM3,
      distanceKm:
        typeof s.distanceKm === 'number' ? s.distanceKm : routeInfo.distanceKm,
      distanceAccuracyType:
        (s.distanceAccuracyType as Shipment['distanceAccuracyType']) ||
        routeInfo.accuracyType,
      minOperationalHours:
        typeof s.minOperationalHours === 'number' ? s.minOperationalHours : 10,
      quotedClientSlaHours:
        typeof s.quotedClientSlaHours === 'number'
          ? s.quotedClientSlaHours
          : 15,
      packageSizeAr: (s.packageSizeAr as string) || 'طرد قياسي',
      accountantEstimate,
      accountantProcessed:
        typeof s.accountantProcessed === 'boolean' ? s.accountantProcessed : true,
      custodyChain: Array.isArray(s.custodyChain) ? s.custodyChain : [],
      priority: s.priority || 'NORMAL',
      operationalLocation:
        s.operationalLocation ||
        (status === 'DELIVERED'
          ? 'DELIVERED_TO_RECIPIENT'
          : status === 'OUT_FOR_DELIVERY'
            ? 'WITH_COURIER'
            : status === 'READY_FOR_DISPATCH'
              ? 'WAITING_FOR_COURIER'
              : 'INSIDE_WAREHOUSE'),
      responsibleDepartment:
        s.responsibleDepartment ||
        (status === 'DELIVERED' || status === 'REJECTED' || status === 'RETURNED'
          ? 'COMPLETED'
          : status === 'OUT_FOR_DELIVERY'
            ? 'DISPATCH_COURIERS'
            : 'WAREHOUSE'),
      warehouseId: (s.warehouseId as string) || 'WH-CAIRO-MAIN',
      processedEventKeys: Array.isArray(s.processedEventKeys)
        ? s.processedEventKeys
        : [],
    };
  });

  const rawClock = (candidate.clock as Partial<GameState['clock']>) || {};
  const rawMinutes =
    typeof rawClock.minutesFromMidnight === 'number' &&
    rawClock.minutesFromMidnight >= 0 &&
    rawClock.minutesFromMidnight < 1350
      ? rawClock.minutesFromMidnight
      : 540;
  const validSpeed =
    rawClock.speedMultiplier === 1 ||
    rawClock.speedMultiplier === 2 ||
    rawClock.speedMultiplier === 4 ||
    rawClock.speedMultiplier === 8
      ? rawClock.speedMultiplier
      : 1;

  const mergedState: GameState = {
    ...defaults,
    ...candidate,
    saveVersion: CURRENT_SAVE_SCHEMA_VERSION,
    company,
    clock: {
      day: currentDay,
      minutesFromMidnight: rawMinutes,
      totalElapsedMinutes:
        typeof rawClock.totalElapsedMinutes === 'number'
          ? rawClock.totalElapsedMinutes
          : currentDay * 540,
      isPaused: Boolean(rawClock.isPaused),
      speedMultiplier: validSpeed,
    },
    warehouses: migratedWarehouses,
    employees: migratedEmployees,
    couriers: Array.isArray(candidate.couriers)
      ? (candidate.couriers as GameState['couriers'])
      : defaults.couriers,
    notifications: Array.isArray(candidate.notifications)
      ? (candidate.notifications as GameState['notifications'])
      : defaults.notifications,
    processedSimulationEventIds: Array.isArray(
      candidate.processedSimulationEventIds
    )
      ? (candidate.processedSimulationEventIds as string[])
      : [],
    shipments: migratedShipments as Shipment[],
    marketing:
      (candidate.marketing as GameState['marketing']) ||
      createInitialMarketingState(),
    hrJobAds: Array.isArray(candidate.hrJobAds)
      ? (candidate.hrJobAds as GameState['hrJobAds'])
      : [],
    payrollCycle: (candidate.payrollCycle as GameState['payrollCycle']) || {
      cycleLengthDays: 8,
      lastPayrollPaidDay: 0,
      nextPayrollDueDay: Math.ceil(currentDay / 8) * 8 || 8,
      processedCycleDays: [],
      unpaidSalariesPiastres: 0,
    },
    fleetAndEquipment:
      (candidate.fleetAndEquipment as GameState['fleetAndEquipment']) || {
        fuelLevelPercent: 85,
        sortingMachineHealth: 88,
        adminSystemHealth: 94,
        lastRefueledDay: 1,
        lastMachineMaintainedDay: 1,
        activeBreakdowns: [],
      },
    dayCheckpoints: Array.isArray(candidate.dayCheckpoints)
      ? (candidate.dayCheckpoints as GameState['dayCheckpoints'])
      : [],
    businessDeveloper:
      (candidate.businessDeveloper as GameState['businessDeveloper']) ||
      createInitialBusinessDeveloperState(currentDay),
    pricingEngine:
      (candidate.pricingEngine as GameState['pricingEngine']) ||
      createInitialPricingEngineState(),
    competitors: Array.isArray(candidate.competitors)
      ? (candidate.competitors as GameState['competitors'])
      : createInitialCompetitors(),
    marketAuctions: Array.isArray(candidate.marketAuctions)
      ? (candidate.marketAuctions as GameState['marketAuctions'])
      : createInitialMarketAuctions(currentDay, rawMinutes),
    herfokPosts: Array.isArray(candidate.herfokPosts)
      ? (candidate.herfokPosts as GameState['herfokPosts'])
      : createInitialHerfokPosts(),
    ingobiaEvaluations: Array.isArray(candidate.ingobiaEvaluations)
      ? (candidate.ingobiaEvaluations as GameState['ingobiaEvaluations'])
      : createInitialIngobiaEvaluations(),
    branches: Array.isArray(candidate.branches)
      ? (candidate.branches as GameState['branches'])
      : [],
    realTimeBridge:
      (candidate.realTimeBridge as GameState['realTimeBridge']) ||
      createInitialRealTimeBridge(),
    offlineSync:
      (candidate.offlineSync as GameState['offlineSync']) ||
      createInitialOfflineSyncState(),
    socialPosts: Array.isArray(candidate.socialPosts)
      ? (candidate.socialPosts as GameState['socialPosts'])
      : createInitialSocialPosts(),
    tutorial:
      (candidate.tutorial as GameState['tutorial']) ||
      createInitialTutorialState(),
    guideAndSecretary:
      (candidate.guideAndSecretary as GameState['guideAndSecretary']) || {
        guideTasks: createInitialManagerGuideTasks(),
        bubbleMessages: createInitialBubbleMessages(currentDay),
      },
  };

  let hydrated = ensureBusinessDeveloperState(mergedState);
  hydrated = ensureWakkelnyZonesInitialized(hydrated);
  hydrated = ensureMyEmployeesAppInitialized(hydrated);
  hydrated = ensureClientContractProfiles(hydrated);
  hydrated = syncManagerGuideTasksWithRealState(hydrated);
  return hydrated;
}

/**
 * Validates that a loaded JSON object conforms to the required GameState schema
 * and that the displayed cash matches the ledger sum invariant.
 */
export function validateSavedGameState(candidate: unknown): candidate is GameState {
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  const raw = candidate as Partial<GameState>;
  const alreadyMigrated =
    raw.saveVersion === CURRENT_SAVE_SCHEMA_VERSION &&
    Boolean(raw.company?.levelSystemMigratedV3) &&
    Boolean(raw.guideAndSecretary) &&
    Boolean(raw.myEmployeesApp);

  const migrated = (alreadyMigrated
    ? raw
    : migrateSaveIfNeeded(candidate)) as Partial<GameState>;

  if (migrated.saveVersion !== CURRENT_SAVE_SCHEMA_VERSION) {
    return false;
  }
  if (!migrated.company || typeof migrated.company.cashPiastres !== 'number') {
    return false;
  }
  if (
    !migrated.clock ||
    !Array.isArray(migrated.warehouses) ||
    !Array.isArray(migrated.employees) ||
    !Array.isArray(migrated.couriers) ||
    !Array.isArray(migrated.vehicles) ||
    !Array.isArray(migrated.clients) ||
    !Array.isArray(migrated.shipments) ||
    !Array.isArray(migrated.notifications) ||
    !Array.isArray(migrated.ledger) ||
    !Array.isArray(migrated.situations) ||
    !Array.isArray(migrated.executedDecisionIds)
  ) {
    return false;
  }

  // Verify ledger reconciliation invariant
  const ledgerCashSum = migrated.ledger.reduce(
    (sum, entry) =>
      sum + (typeof entry.cashDeltaPiastres === 'number' ? entry.cashDeltaPiastres : 0),
    0
  );

  if (ledgerCashSum !== migrated.company.cashPiastres) {
    return false;
  }

  return true;
}

export const STAGING_SAVE_STORAGE_KEY = 'egypt_shipping_sim_staging_save_v2';

export function saveGameToStorage(
  state: GameState,
  isStagingMode = false
): SaveResult {
  try {
    const payload: GameState = {
      ...state,
      saveVersion: CURRENT_SAVE_SCHEMA_VERSION,
      lastSavedTimestamp: new Date().toISOString(),
    };
    const serialized = JSON.stringify(payload);
    const targetKey = isStagingMode ? STAGING_SAVE_STORAGE_KEY : SAVE_STORAGE_KEY;
    window.localStorage.setItem(targetKey, serialized);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      errorMessage:
        err instanceof Error
          ? `تعذر حفظ التقدم في المتصفح: ${err.message}`
          : 'تعذر حفظ بيانات اللعبة في ذاكرة المتصفح المحلية.',
    };
  }
}

export function loadGameFromStorage(isStagingMode = false): LoadResult {
  try {
    const targetKey = isStagingMode ? STAGING_SAVE_STORAGE_KEY : SAVE_STORAGE_KEY;
    const raw = window.localStorage.getItem(targetKey);
    if (!raw) {
      return { success: false };
    }
    const parsed = migrateSaveIfNeeded(JSON.parse(raw)) as GameState;
    if (!validateSavedGameState(parsed)) {
      return {
        success: false,
        errorMessage:
          'ملف الحفظ المحفوظ غير متوافق أو تالف. يرجى بدء لعبة جديدة.',
      };
    }
    return {
      success: true,
      state: parsed,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage:
        err instanceof Error
          ? `خطأ أثناء قراءة ملف الحفظ: ${err.message}`
          : 'خطأ غير متوقع أثناء استعادة الحفظ.',
    };
  }
}

export function clearSavedGameStorage(isStagingMode = false): SaveResult {
  try {
    const targetKey = isStagingMode ? STAGING_SAVE_STORAGE_KEY : SAVE_STORAGE_KEY;
    window.localStorage.removeItem(targetKey);
    return { success: true };
  } catch {
    return {
      success: false,
      errorMessage: 'تعذر مسح ملف الحفظ من المتصفح.',
    };
  }
}
