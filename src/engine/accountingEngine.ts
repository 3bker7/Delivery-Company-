import {
  Employee,
  GameState,
  Shipment,
  ShipmentAccountantEstimate,
} from '../types/game';
import { egpToPiastres, formatClockTime, formatEGP } from './financeEngine';
import { pushNotification } from './notificationEngine';

export const MAX_DAILY_REQUESTS_PER_ACCOUNTANT = 8;

/**
 * Finds all active employees who can process shipment accounting estimates:
 * Primary: ADMIN_ACCOUNTANT (up to 8 requests/day each)
 * Fallback when no ADMIN_ACCOUNTANT is hired yet: OPERATIONS_SUPERVISOR (Mahmoud, up to 8 requests/day)
 */
export function getActiveAccountants(state: GameState): Employee[] {
  const dedicatedAccountants = state.employees.filter(
    (e) =>
      !e.terminated &&
      e.status !== 'TERMINATED' &&
      e.status !== 'SUSPENDED' &&
      e.role === 'ADMIN_ACCOUNTANT'
  );
  if (dedicatedAccountants.length > 0) {
    return dedicatedAccountants;
  }
  return state.employees.filter(
    (e) =>
      !e.terminated &&
      e.status !== 'TERMINATED' &&
      e.status !== 'SUSPENDED' &&
      e.role === 'OPERATIONS_SUPERVISOR'
  );
}

/**
 * Returns remaining daily accountant processing capacity across the company.
 */
export function getAccountantCapacityStatus(state: GameState): {
  totalDailyCapacity: number;
  processedToday: number;
  remainingCapacity: number;
  remainingCapacityToday: number;
  availableAccountant: Employee | undefined;
} {
  const accountants = getActiveAccountants(state);
  const totalDailyCapacity = accountants.reduce(
    (sum, a) => sum + (a.dailyCapacity || MAX_DAILY_REQUESTS_PER_ACCOUNTANT),
    0
  );
  const processedToday = accountants.reduce(
    (sum, a) => sum + (a.assignedShipmentsToday || 0),
    0
  );
  const availableAccountant = accountants.find(
    (a) =>
      (a.assignedShipmentsToday || 0) <
      (a.dailyCapacity || MAX_DAILY_REQUESTS_PER_ACCOUNTANT)
  );
  const remaining = Math.max(0, totalDailyCapacity - processedToday);

  return {
    totalDailyCapacity,
    processedToday,
    remainingCapacity: remaining,
    remainingCapacityToday: remaining,
    availableAccountant,
  };
}

/**
 * Computes a detailed financial estimate for a shipment request.
 * Supports both `(shipment, reviewerId?, reviewerName?, timeLabel?)` and `(state, shipment, accountant?)`.
 * Strictly separates:
 * - Service Fee (إيراد خدمة الشحن للشركة)
 * - Allocated Costs (بنزين + مندوب + تغليف ومناولة + حصة مصروفات تشغيلية + تكاليف إضافية)
 * - Merchant COD Collection (تحصيل لصالح التاجر = أمانة وليس إيراداً للشركة!)
 * - Expected Net Profit = Service Fee - Total Allocated Costs
 */
export function computeShipmentEstimateBreakdown(
  stateOrShipment:
    | GameState
    | Pick<
        Shipment,
        | 'serviceFeePiastres'
        | 'estimatedOperatingCostPiastres'
        | 'codAmountPiastres'
      > &
        Partial<Shipment>,
  shipmentOrReviewerId?:
    | (Pick<
        Shipment,
        | 'serviceFeePiastres'
        | 'estimatedOperatingCostPiastres'
        | 'codAmountPiastres'
      > &
        Partial<Shipment>)
    | string,
  accountantOrReviewerName?: Employee | string,
  optionalTimeLabel?: string
): ShipmentAccountantEstimate {
  let shipment: Pick<
    Shipment,
    'serviceFeePiastres' | 'estimatedOperatingCostPiastres' | 'codAmountPiastres'
  > &
    Partial<Shipment>;
  let reviewerId = 'EMP-MAHMOUD';
  let reviewerName = 'محمود عبد العزيز';
  let timeLabel = optionalTimeLabel || '09:00';

  if (
    stateOrShipment &&
    'clock' in stateOrShipment &&
    typeof shipmentOrReviewerId === 'object' &&
    shipmentOrReviewerId !== null
  ) {
    const state = stateOrShipment as GameState;
    shipment = shipmentOrReviewerId;
    timeLabel = formatClockTime(state.clock.minutesFromMidnight);
    if (accountantOrReviewerName && typeof accountantOrReviewerName === 'object') {
      reviewerId = accountantOrReviewerName.id;
      reviewerName = accountantOrReviewerName.name;
    }
  } else {
    shipment = stateOrShipment as Pick<
      Shipment,
      | 'serviceFeePiastres'
      | 'estimatedOperatingCostPiastres'
      | 'codAmountPiastres'
    > &
      Partial<Shipment>;
    if (typeof shipmentOrReviewerId === 'string') {
      reviewerId = shipmentOrReviewerId;
    }
    if (typeof accountantOrReviewerName === 'string') {
      reviewerName = accountantOrReviewerName;
    }
  }

  const weightKg = shipment.weightKg ?? 4;
  const volumeM3 = shipment.volumeM3 ?? 0.25;

  const baseTripCost =
    shipment.estimatedOperatingCostPiastres || egpToPiastres(50);

  // Split operating cost transparently into fuel, courier share, packaging, and overhead
  const estimatedFuelCostPiastres = Math.round(baseTripCost * 0.45);
  const estimatedCourierCostPiastres = Math.round(baseTripCost * 0.35);
  const packagingBase =
    shipment.packagingType === 'REINFORCED_FRAGILE'
      ? egpToPiastres(18)
      : shipment.packagingType === 'HEAVY_DUTY' || weightKg > 15
        ? egpToPiastres(22)
        : Math.max(egpToPiastres(10), Math.round(baseTripCost * 0.12));

  const allocatedOverheadPiastres =
    volumeM3 > 0.8
      ? egpToPiastres(15)
      : Math.max(egpToPiastres(5), Math.round(baseTripCost * 0.08));

  const totalEstimatedCostPiastres = shipment.estimatedOperatingCostPiastres
    ? shipment.estimatedOperatingCostPiastres
    : estimatedFuelCostPiastres +
      estimatedCourierCostPiastres +
      packagingBase +
      allocatedOverheadPiastres;

  const adjustedPackaging = Math.max(
    0,
    totalEstimatedCostPiastres -
      estimatedFuelCostPiastres -
      estimatedCourierCostPiastres -
      allocatedOverheadPiastres
  );

  const serviceFeePiastres = Math.max(
    0,
    shipment.serviceFeePiastres - (shipment.discountAppliedPiastres || 0)
  );

  const expectedNetProfitPiastres =
    serviceFeePiastres - totalEstimatedCostPiastres;
  const isLossExpected = expectedNetProfitPiastres < 0;

  return {
    processedByAccountantId: reviewerId,
    processedByAccountantName: reviewerName,
    processedAtTimeLabel: timeLabel,
    reviewedByEmployeeId: reviewerId,
    reviewedByEmployeeName: reviewerName,
    reviewedAtTimeLabel: timeLabel,
    serviceFeePiastres,
    estimatedFuelCostPiastres,
    estimatedCourierCostPiastres,
    fuelAndCourierCostPiastres:
      estimatedFuelCostPiastres + estimatedCourierCostPiastres,
    estimatedPackagingCostPiastres: adjustedPackaging,
    packagingAndWarehouseCostPiastres: adjustedPackaging,
    allocatedOverheadPiastres,
    adminOverheadPiastres: allocatedOverheadPiastres,
    extraExternalCostPiastres: 0,
    totalEstimatedCostPiastres,
    expectedNetProfitPiastres,
    merchantCodTrustPiastres: shipment.codAmountPiastres || 0,
    isLossExpected,
    isExpectedLoss: isLossExpected,
    lossReasonAr: isLossExpected
      ? `تكلفة التشغيل المخصصة (${formatEGP(totalEstimatedCostPiastres)}) تتجاوز إيراد بوليصة الشحن (${formatEGP(serviceFeePiastres)}). القرار النهائي للمدير.`
      : undefined,
  };
}

/**
 * Processes a shipment through the Administrative Accountant (max 8 requests/day per accountant).
 * If daily capacity (8 requests/accountant) is exhausted, marks the shipment as awaitingAccountantApproval = true
 * and triggers a clear administrative warning notification.
 */
export function processShipmentWithAccountant(
  state: GameState,
  trackingNumber: string
): GameState {
  const shIdx = state.shipments.findIndex(
    (s) => s.trackingNumber === trackingNumber
  );
  if (shIdx === -1) {
    throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);
  }

  const shipment = state.shipments[shIdx];
  if (
    shipment.accountantProcessed &&
    shipment.accountantEstimate &&
    !shipment.awaitingAccountantApproval
  ) {
    return state;
  }

  const cap = getAccountantCapacityStatus(state);
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  if (!cap.availableAccountant) {
    // Accountant capacity reached! Mark as waiting for accountant processing
    const updatedShipment: Shipment = {
      ...shipment,
      accountantProcessed: false,
      awaitingAccountantApproval: true,
      responsibleDepartment: 'ACCOUNTING',
    };
    const nextShipments = [...state.shipments];
    nextShipments[shIdx] = updatedShipment;

    let nextState: GameState = {
      ...state,
      shipments: nextShipments,
    };

    nextState = pushNotification(nextState, {
      dedupeKey: `ACC-OVERLOAD-D${state.company.currentDay}`,
      trackingNumber,
      title: 'تراكم طلبات بانتظار المحاسب الإداري (الحد 8 طلبات/يوم)',
      message: `وصل المحاسب الإداري للحد الأقصى اليومي (${cap.totalDailyCapacity} طلبات). الشحنة ${trackingNumber} تنتظر المعالجة المالية وقد تنتهي مهلتها إذا لم يتم تعيين محاسب إضافي من قسم HR.`,
      causeReasonAr:
        'استنفاد طاقة معالجة المحاسب الإداري (8 طلبات يومياً لكل محاسب)',
      department: 'ACCOUNTING',
      outcomeLabel: 'بانتظار معالجة المحاسب',
      actionRequiredLabel:
        'افتح قسم الموارد البشرية HR لتعيين محاسب إداري إضافي',
      targetSection: 'EMPLOYEES',
      severity: 'WARNING',
    });

    return nextState;
  }

  const accountant = cap.availableAccountant;
  const estimate = computeShipmentEstimateBreakdown(state, shipment, accountant);

  const updatedShipment: Shipment = {
    ...shipment,
    accountantProcessed: true,
    accountantEstimate: estimate,
    awaitingAccountantApproval: false,
    custodyChain: [
      ...(shipment.custodyChain || []),
      {
        id: `CUST-${shipment.trackingNumber}-ACC`,
        stage: 'ACCOUNTANT_REVIEW',
        stageAr: 'المراجعة والتسعير المحاسبي',
        actorEmployeeId: accountant.id,
        employeeId: accountant.id,
        actorName: accountant.name,
        employeeName: accountant.name,
        department: 'ACCOUNTING',
        roleAr: accountant.roleTitleAr,
        day: state.company.currentDay,
        timeLabel,
        totalMinutes: state.clock.totalElapsedMinutes,
        conditionNote: `إعداد التقدير المالي: إيراد الخدمة ${formatEGP(estimate.serviceFeePiastres)}، التكلفة المتوقعة ${formatEGP(estimate.totalEstimatedCostPiastres)}، صافي الربح المتوقع ${formatEGP(estimate.expectedNetProfitPiastres)}.`,
        note: `إعداد التقدير المالي: إيراد الخدمة ${formatEGP(estimate.serviceFeePiastres)}، التكلفة المتوقعة ${formatEGP(estimate.totalEstimatedCostPiastres)}، صافي الربح المتوقع ${formatEGP(estimate.expectedNetProfitPiastres)}.`,
      },
    ],
  };

  const nextShipments = [...state.shipments];
  nextShipments[shIdx] = updatedShipment;

  const nextEmployees = state.employees.map((e) =>
    e.id === accountant.id
      ? {
          ...e,
          assignedShipmentsToday: (e.assignedShipmentsToday || 0) + 1,
          completedTasksCount: e.completedTasksCount + 1,
          handledTrackingNumbers: [
            ...(e.handledTrackingNumbers || []),
            trackingNumber,
          ],
        }
      : e
  );

  return {
    ...state,
    shipments: nextShipments,
    employees: nextEmployees,
  };
}
