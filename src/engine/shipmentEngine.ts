import {
  AdminDelayActionType,
  DelayInquiryReport,
  DeliveryAttemptResult,
  GameState,
  OperationalLocation,
  ResponsibleDepartment,
  Shipment,
  ShipmentCustodyEvent,
  ShipmentDamageLossReport,
  ShipmentStatus,
} from '../types/game';
import {
  computeShipmentEstimateBreakdown,
  processShipmentWithAccountant,
} from './accountingEngine';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushNotification } from './notificationEngine';
import { recordSocialPostForShipmentEvent } from './socialMediaEngine';

export const SHIPMENT_STATUS_LABELS_AR: Record<ShipmentStatus, string> = {
  NEW_REQUEST: 'طلب جديد',
  ACCEPTED: 'مقبول',
  REJECTED: 'مرفوض',
  CANCELLED_EXPIRED: 'ملغاة لانتهاء المهلة',
  ASSIGNED_TO_WAREHOUSE: 'مسند إلى المستودع (في انتظار الاستلام)',
  ARRIVED_AT_WAREHOUSE: 'وصلت إلى المستودع',
  RECEIVED_AT_WAREHOUSE: 'تم استلامها بالمستودع',
  WAITING_SORTING: 'تنتظر الفرز',
  SORTING: 'قيد الفرز',
  WAITING_PACKAGING: 'تنتظر التغليف',
  PREPARING_AT_WAREHOUSE: 'قيد التجهيز والتغليف',
  READY_FOR_DISPATCH: 'جاهزة لاستلام المندوب',
  ASSIGNED_TO_COURIER: 'استلمها المندوب',
  OUT_FOR_DELIVERY: 'خرج المندوب للتوصيل',
  DELIVERY_ATTEMPT: 'في محاولة تسليم',
  DELIVERED: 'تم التسليم',
  DELIVERY_FAILED: 'فشل التسليم',
  DELAYED_IN_WAREHOUSE: 'متأخرة داخل المستودع',
  UNLOCATED_IN_WAREHOUSE: 'تعذر العثور عليها (بحث داخلي)',
  UNDER_INVESTIGATION: 'قيد التحقيق في المشكلة',
  DAMAGED_OR_LOST: 'تضرر أو فقدان تشغيلي',
  RETURNED: 'مرتجع للتاجر',
};

export const OPERATIONAL_LOCATION_LABELS_AR: Record<OperationalLocation, string> = {
  AWAITING_RECEIPT: 'في انتظار الاستلام',
  INSIDE_WAREHOUSE: 'داخل المستودع',
  SORTING_ZONE: 'منطقة الفرز',
  PACKAGING_ZONE: 'منطقة التغليف',
  BEING_PREPARED: 'قيد الفرز والتجهيز',
  WAITING_FOR_COURIER: 'في انتظار مندوب',
  WITH_COURIER: 'مع المندوب',
  IN_DELIVERY_ATTEMPT: 'في محاولة تسليم',
  RETURNING_TO_WAREHOUSE: 'عائدة إلى المستودع',
  DELIVERED_TO_RECIPIENT: 'تم التسليم للمستلم',
  CLIENT_PREMISES: 'لدى العميل',
};

export const DEPARTMENT_LABELS_AR: Record<ResponsibleDepartment, string> = {
  MANAGEMENT: 'الإدارة والاستقبال',
  ACCOUNTING: 'المحاسبة الإدارية',
  MARKETING: 'التسويق واكتساب العملاء',
  HR: 'الموارد البشرية',
  WAREHOUSE: 'المستودع والفرز',
  DISPATCH_COURIERS: 'التوزيع والمندوبون',
  CUSTOMER_SERVICE: 'متابعة العملاء والتحقيق',
  COMPLETED: 'مكتملة / مغلقة',
};

export const DELIVERY_RESULT_LABELS_AR: Record<DeliveryAttemptResult, string> = {
  DELIVERED_SUCCESS: 'تم التسليم بنجاح',
  CLIENT_REFUSED: 'العميل رفض الاستلام',
  CLIENT_ABSENT: 'العميل غير موجود',
  WRONG_ADDRESS: 'العنوان غير صحيح',
  UNREACHABLE_AREA: 'تعذر الوصول للمنطقة',
  COURIER_DELAYED: 'تأخر المندوب عن الموعد',
  SHIPMENT_UNLOCATED: 'الشحنة لم يُعثر عليها',
  SHIPMENT_DAMAGED: 'تلف أثناء المناولة أو النقل',
  POSTPONED_OPERATIONAL: 'تأجلت المحاولة لسبب تشغيلي',
};

const WAREHOUSE_INSIDE_STATUSES: ShipmentStatus[] = [
  'ASSIGNED_TO_WAREHOUSE',
  'ARRIVED_AT_WAREHOUSE',
  'RECEIVED_AT_WAREHOUSE',
  'WAITING_SORTING',
  'SORTING',
  'WAITING_PACKAGING',
  'PREPARING_AT_WAREHOUSE',
  'READY_FOR_DISPATCH',
  'DELAYED_IN_WAREHOUSE',
  'UNLOCATED_IN_WAREHOUSE',
];

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  NEW_REQUEST: ['ACCEPTED', 'REJECTED', 'CANCELLED_EXPIRED'],
  ACCEPTED: ['ASSIGNED_TO_WAREHOUSE', 'ARRIVED_AT_WAREHOUSE', 'RECEIVED_AT_WAREHOUSE'],
  REJECTED: [],
  CANCELLED_EXPIRED: [],
  ASSIGNED_TO_WAREHOUSE: [
    'ARRIVED_AT_WAREHOUSE',
    'RECEIVED_AT_WAREHOUSE',
    'WAITING_SORTING',
    'PREPARING_AT_WAREHOUSE',
    'DELAYED_IN_WAREHOUSE',
    'UNLOCATED_IN_WAREHOUSE',
  ],
  ARRIVED_AT_WAREHOUSE: [
    'RECEIVED_AT_WAREHOUSE',
    'WAITING_SORTING',
    'SORTING',
    'PREPARING_AT_WAREHOUSE',
    'DELAYED_IN_WAREHOUSE',
    'UNLOCATED_IN_WAREHOUSE',
  ],
  RECEIVED_AT_WAREHOUSE: [
    'WAITING_SORTING',
    'SORTING',
    'PREPARING_AT_WAREHOUSE',
    'DELAYED_IN_WAREHOUSE',
    'UNLOCATED_IN_WAREHOUSE',
  ],
  WAITING_SORTING: [
    'SORTING',
    'PREPARING_AT_WAREHOUSE',
    'DELAYED_IN_WAREHOUSE',
    'UNLOCATED_IN_WAREHOUSE',
  ],
  SORTING: [
    'WAITING_PACKAGING',
    'PREPARING_AT_WAREHOUSE',
    'READY_FOR_DISPATCH',
    'DELAYED_IN_WAREHOUSE',
    'UNLOCATED_IN_WAREHOUSE',
  ],
  WAITING_PACKAGING: [
    'PREPARING_AT_WAREHOUSE',
    'READY_FOR_DISPATCH',
    'DELAYED_IN_WAREHOUSE',
  ],
  PREPARING_AT_WAREHOUSE: [
    'READY_FOR_DISPATCH',
    'DELAYED_IN_WAREHOUSE',
    'UNLOCATED_IN_WAREHOUSE',
    'DAMAGED_OR_LOST',
  ],
  DELAYED_IN_WAREHOUSE: ['SORTING', 'PREPARING_AT_WAREHOUSE', 'READY_FOR_DISPATCH'],
  UNLOCATED_IN_WAREHOUSE: [
    'UNDER_INVESTIGATION',
    'PREPARING_AT_WAREHOUSE',
    'READY_FOR_DISPATCH',
    'DAMAGED_OR_LOST',
  ],
  UNDER_INVESTIGATION: [
    'PREPARING_AT_WAREHOUSE',
    'READY_FOR_DISPATCH',
    'RETURNED',
    'DAMAGED_OR_LOST',
  ],
  DAMAGED_OR_LOST: ['RETURNED'],
  READY_FOR_DISPATCH: ['ASSIGNED_TO_COURIER', 'OUT_FOR_DELIVERY'],
  ASSIGNED_TO_COURIER: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERY_ATTEMPT', 'DELIVERED', 'DELIVERY_FAILED', 'DAMAGED_OR_LOST'],
  DELIVERY_ATTEMPT: ['DELIVERED', 'DELIVERY_FAILED'],
  DELIVERED: [],
  DELIVERY_FAILED: ['READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'RETURNED'],
  RETURNED: [],
};

export function canTransitionShipment(
  currentStatus: ShipmentStatus,
  targetStatus: ShipmentStatus
): boolean {
  return ALLOWED_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function isShipmentInsideWarehouse(status: ShipmentStatus): boolean {
  return WAREHOUSE_INSIDE_STATUSES.includes(status);
}

/**
 * Helper to append an entry to a shipment's chain of custody (`custodyChain`).
 */
export function appendCustodyEvent(
  shipment: Shipment,
  event: Omit<ShipmentCustodyEvent, 'id'>
): ShipmentCustodyEvent[] {
  const existing = shipment.custodyChain || [];
  return [
    ...existing,
    {
      ...event,
      id: `CUST-${shipment.trackingNumber}-${existing.length + 1}`,
    },
  ];
}

/**
 * Section 4: Calculates physical warehouse utilization (count, weight in kg, volume in m³)
 * and breaks down the warehouse queues.
 */
export function getWarehouseUtilizationMetrics(state: GameState): {
  warehouseId: string;
  warehouseName: string;
  insideShipmentsCount: number;
  maxCapacity: number;
  usedWeightKg: number;
  maxWeightKg: number;
  remainingWeightKg: number;
  weightPercent: number;
  usedVolumeM3: number;
  maxVolumeM3: number;
  remainingVolumeM3: number;
  volumePercent: number;
  utilizationPercent: number;
  statusTone: 'SAFE' | 'NEARING_LIMIT' | 'OVERLOADED';
  queues: {
    arrived: Shipment[];
    waitingSorting: Shipment[];
    sorting: Shipment[];
    waitingPackaging: Shipment[];
    preparing: Shipment[];
    readyForDispatch: Shipment[];
    delayedOrUnlocated: Shipment[];
  };
} {
  const wh = state.warehouses[0];
  const maxCapacity = wh?.maxCapacity ?? 8;
  const maxWeightKg = (wh?.maxWeightKg ?? 180) + (wh?.rentedExtraWeightKg ?? 0);
  const maxVolumeM3 =
    Math.round(((wh?.maxVolumeM3 ?? 6.5) + (wh?.rentedExtraVolumeM3 ?? 0)) * 100) / 100;

  const insideShipments = state.shipments.filter(
    (s) =>
      (!wh || s.warehouseId === wh.id) && isShipmentInsideWarehouse(s.status)
  );

  const usedWeightKg =
    Math.round(
      insideShipments.reduce((sum, s) => sum + (s.weightKg ?? 4), 0) * 10
    ) / 10;
  const usedVolumeM3 =
    Math.round(
      insideShipments.reduce((sum, s) => sum + (s.volumeM3 ?? 0.15), 0) * 100
    ) / 100;

  const countPercent = Math.min(100, Math.round((insideShipments.length / Math.max(1, maxCapacity)) * 100));
  const weightPercent = Math.min(100, Math.round((usedWeightKg / Math.max(1, maxWeightKg)) * 100));
  const volumePercent = Math.min(100, Math.round((usedVolumeM3 / Math.max(0.1, maxVolumeM3)) * 100));
  const utilizationPercent = Math.max(countPercent, weightPercent, volumePercent);

  let statusTone: 'SAFE' | 'NEARING_LIMIT' | 'OVERLOADED' = 'SAFE';
  if (utilizationPercent >= 95 || insideShipments.length >= maxCapacity) {
    statusTone = 'OVERLOADED';
  } else if (utilizationPercent >= 75) {
    statusTone = 'NEARING_LIMIT';
  }

  return {
    warehouseId: wh?.id || 'WH-CAIRO-MAIN',
    warehouseName: wh?.name || 'مستودع انجوبيا المركزي',
    insideShipmentsCount: insideShipments.length,
    maxCapacity,
    usedWeightKg,
    maxWeightKg,
    remainingWeightKg: Math.max(0, Math.round((maxWeightKg - usedWeightKg) * 10) / 10),
    weightPercent,
    usedVolumeM3,
    maxVolumeM3,
    remainingVolumeM3: Math.max(0, Math.round((maxVolumeM3 - usedVolumeM3) * 100) / 100),
    volumePercent,
    utilizationPercent,
    statusTone,
    queues: {
      arrived: insideShipments.filter(
        (s) => s.status === 'ASSIGNED_TO_WAREHOUSE' || s.status === 'RECEIVED_AT_WAREHOUSE'
      ),
      waitingSorting: insideShipments.filter((s) => s.status === 'WAITING_SORTING'),
      sorting: insideShipments.filter((s) => s.status === 'SORTING'),
      waitingPackaging: insideShipments.filter((s) => s.status === 'WAITING_PACKAGING'),
      preparing: insideShipments.filter((s) => s.status === 'PREPARING_AT_WAREHOUSE'),
      readyForDispatch: insideShipments.filter((s) => s.status === 'READY_FOR_DISPATCH'),
      delayedOrUnlocated: insideShipments.filter(
        (s) => s.status === 'DELAYED_IN_WAREHOUSE' || s.status === 'UNLOCATED_IN_WAREHOUSE'
      ),
    },
  };
}

/**
 * Checks whether the warehouse and courier fleet have operational capacity,
 * including physical weight (kg) and volume (m³) limits.
 */
export function getAvailableOperationalCapacity(
  state: GameState,
  incomingShipment?: { weightKg?: number; volumeM3?: number }
): {
  hasCapacity: boolean;
  availableCourierId?: string;
  availableVehicleId?: string;
  reason?: string;
} {
  const whMetrics = getWarehouseUtilizationMetrics(state);
  const reqWeight = incomingShipment?.weightKg ?? 4;
  const reqVolume = incomingShipment?.volumeM3 ?? 0.15;

  if (whMetrics.insideShipmentsCount >= whMetrics.maxCapacity) {
    return {
      hasCapacity: false,
      reason: `المستودع (${whMetrics.warehouseName}) وصل للحد الأقصى لعدد الطرود (${whMetrics.maxCapacity} شحنات). يرجى توسيع السعة أو انتظار خروج الطرود الجاهزة.`,
    };
  }

  if (whMetrics.usedWeightKg + reqWeight > whMetrics.maxWeightKg) {
    return {
      hasCapacity: false,
      reason: `وزن الشحنة (${reqWeight} كجم) يتجاوز الوزن المتبقي بالمستودع (${whMetrics.remainingWeightKg} كجم متاح من أصل ${whMetrics.maxWeightKg} كجم).`,
    };
  }

  if (whMetrics.usedVolumeM3 + reqVolume > whMetrics.maxVolumeM3) {
    return {
      hasCapacity: false,
      reason: `حجم الشحنة (${reqVolume} م³) يتجاوز المساحة المتبقية بالمستودع (${whMetrics.remainingVolumeM3} م³ متاح من أصل ${whMetrics.maxVolumeM3} م³).`,
    };
  }

  if (state.fleetAndEquipment) {
    if (state.fleetAndEquipment.fuelLevelPercent <= 0) {
      return {
        hasCapacity: false,
        reason:
          'نفد بنزين ووقود أسطول التوصيل بالكامل (0%). يرجى تزويد البنزين للأسطول أولاً من قسم المندوبين أو المستودع.',
      };
    }
    if (state.fleetAndEquipment.sortingMachineHealth <= 10) {
      return {
        hasCapacity: false,
        reason:
          'توقفت ماكينات الفرز والتغليف بالمستودع بسبب عطل فني حرج. يرجى إجراء صيانة لماكينات الفرز أولاً.',
      };
    }
  }

  const couriers = state.couriers.filter(
    (c) => c.status !== 'UNAVAILABLE' && c.currentLoad < c.maxLoad
  );

  const vehicles = state.vehicles.filter(
    (v) => v.status !== 'NEEDS_MAINTENANCE' && v.maintenanceHealth > 15
  );

  if (vehicles.length === 0) {
    return {
      hasCapacity: false,
      reason: 'لا توجد مركبات صالحة للتشغيل حالياً بسبب الأعطال.',
    };
  }

  return {
    hasCapacity: true,
    availableCourierId: couriers[0]?.id,
    availableVehicleId: vehicles[0]?.id,
  };
}

/**
 * Section 4: Allows the manager to rent external warehouse space or upgrade shelving capacity.
 */
export function expandOrRentWarehouseCapacity(
  state: GameState,
  option: 'RENT_EXTERNAL_SPACE' | 'UPGRADE_SHELVES'
): GameState {
  const costPiastres =
    option === 'RENT_EXTERNAL_SPACE' ? egpToPiastres(250) : egpToPiastres(450);
  const afford = canAffordImmediatePayment(state, costPiastres);
  if (!afford.allowed) {
    throw new Error(afford.reason || 'السيولة النقدية لا تكفي لتوسيع سعة المستودع.');
  }

  const actionKey = `WH-EXPAND-${option}-D${state.company.currentDay}-${state.ledger.length}`;
  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: costPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: actionKey,
    description:
      option === 'RENT_EXTERNAL_SPACE'
        ? 'استئجار مساحة تخزين خارجية مساندة (+4 شحنات، +80 كجم، +2.5 م³)'
        : 'تركيب أرفف فرز وتخزين معدنية إضافية بالمستودع (+6 شحنات، +140 كجم، +4.0 م³)',
  });

  const nextWarehouses = nextState.warehouses.map((w, idx) => {
    if (idx !== 0) return w;
    if (option === 'RENT_EXTERNAL_SPACE') {
      return {
        ...w,
        maxCapacity: w.maxCapacity + 4,
        rentedExtraWeightKg: (w.rentedExtraWeightKg ?? 0) + 80,
        rentedExtraVolumeM3: Math.round(((w.rentedExtraVolumeM3 ?? 0) + 2.5) * 100) / 100,
      };
    }
    return {
      ...w,
      maxCapacity: w.maxCapacity + 6,
      maxWeightKg: (w.maxWeightKg ?? 180) + 140,
      maxVolumeM3: Math.round(((w.maxVolumeM3 ?? 6.5) + 4.0) * 100) / 100,
      efficiencyLevel: Math.min(100, w.efficiencyLevel + 5),
    };
  });

  nextState = {
    ...nextState,
    warehouses: nextWarehouses,
    executedDecisionIds: [...nextState.executedDecisionIds, actionKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: actionKey,
    title:
      option === 'RENT_EXTERNAL_SPACE'
        ? 'استئجار مساحة تخزين خارجية'
        : 'توسيع أرفف وسعة المستودع',
    message:
      option === 'RENT_EXTERNAL_SPACE'
        ? 'تمت إضافة سعة استيعابية فورية (+4 طرود، +80 كجم، +2.5 م³) للمستودع.'
        : 'تمت ترقية أرفف المستودع المركزي (+6 طرود، +140 كجم، +4.0 م³) ورفع كفاءة الفرز.',
    department: 'WAREHOUSE',
    outcomeLabel: `خصم نقدي ${formatEGP(costPiastres)}`,
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Accepts a NEW_REQUEST shipment.
 * Enforces physical weight/volume warehouse capacity, ensures accountant financial review,
 * and transitions the shipment into the internal warehouse receiving/sorting queue.
 */
export function acceptShipmentRequest(
  state: GameState,
  trackingNumber: string,
  negotiatedFeePiastres?: number
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة رقم ${trackingNumber} غير موجودة.`);

  let nextState = { ...state };
  let shipment = nextState.shipments[idx];

  if (shipment.status !== 'NEW_REQUEST') {
    throw new Error(
      `لا يمكن قبول الشحنة ${trackingNumber} لأن حالتها الحالية هي: ${SHIPMENT_STATUS_LABELS_AR[shipment.status]}.`
    );
  }

  const capacityCheck = getAvailableOperationalCapacity(nextState, {
    weightKg: shipment.weightKg ?? 4,
    volumeM3: shipment.volumeM3 ?? 0.15,
  });
  if (!capacityCheck.hasCapacity) {
    throw new Error(capacityCheck.reason || 'لا تتوفر سعة بالمستودع لقبول الشحنة.');
  }

  if (nextState.company.cashPiastres < shipment.estimatedOperatingCostPiastres) {
    throw new Error(
      `السيولة النقدية (${formatEGP(nextState.company.cashPiastres)}) غير كافية لتغطية تكلفة تشغيل الشحنة (${formatEGP(shipment.estimatedOperatingCostPiastres)}).`
    );
  }

  // If shipment hasn't been processed by the Administrative Accountant yet, process it now
  if (!shipment.accountantEstimate || !shipment.accountantProcessed) {
    nextState = processShipmentWithAccountant(nextState, trackingNumber);
    shipment = nextState.shipments[idx];
  }

  const finalFee = negotiatedFeePiastres ?? shipment.serviceFeePiastres;
  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const warehouse = nextState.warehouses[0];
  const whClerk = nextState.employees.find(
    (e) => e.role === 'WAREHOUSE_CLERK' && e.status !== 'TERMINATED'
  );

  // Recalculate accountant estimate if fee was negotiated
  const updatedEstimate =
    negotiatedFeePiastres !== undefined
      ? computeShipmentEstimateBreakdown(
          { ...shipment, serviceFeePiastres: finalFee },
          shipment.accountantEstimate?.reviewedByEmployeeId,
          shipment.accountantEstimate?.reviewedByEmployeeName,
          timeLabel
        )
      : shipment.accountantEstimate;

  const receiptDelayMinutes = warehouse && warehouse.efficiencyLevel >= 80 ? 15 : 25;
  const expectedDeliveryMinutes = nowMinutes + 150; // 2.5 hours SLA
  const expectedDeliveryClockMinutes =
    (nextState.clock.minutesFromMidnight + 150) % 1440;

  const updatedShipment: Shipment = {
    ...shipment,
    serviceFeePiastres: finalFee,
    accountantEstimate: updatedEstimate,
    Negotiated: negotiatedFeePiastres !== undefined,
    status: 'ASSIGNED_TO_WAREHOUSE',
    operationalLocation: 'AWAITING_RECEIPT',
    responsibleDepartment: 'WAREHOUSE',
    warehouseId: warehouse?.id || 'WH-CAIRO-MAIN',
    assignedWarehouseStaffId: whClerk?.id,
    acceptedAtTotalMinutes: nowMinutes,
    lastStatusChangeTotalMinutes: nowMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: nowMinutes + receiptDelayMinutes,
    expectedDeliveryTotalMinutes: expectedDeliveryMinutes,
    expectedDeliveryTimeLabel: formatClockTime(expectedDeliveryClockMinutes),
    custodyChain: appendCustodyEvent(shipment, {
      stage: 'RECEIVED_AT_WAREHOUSE',
      actorEmployeeId: whClerk?.id,
      actorName: whClerk?.name || 'أمين المستودع',
      department: 'WAREHOUSE',
      day: nextState.company.currentDay,
      timeLabel,
      totalMinutes: nowMinutes,
      conditionNote: `إسناد الشحنة (${shipment.weightKg ?? 4} كجم / ${shipment.volumeM3 ?? 0.15} م³) إلى المستودع للاستلام والفرز`,
    }),
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${nextState.company.currentDay}-${shipment.timeline.length + 1}`,
        day: nextState.company.currentDay,
        timestampLabel: `${timeLabel} — قبول الطلب وإحالته للمستودع`,
        totalMinutes: nowMinutes,
        status: 'ASSIGNED_TO_WAREHOUSE',
        location: 'AWAITING_RECEIPT',
        department: 'WAREHOUSE',
        actorName: 'إدارة المكتب',
        note:
          negotiatedFeePiastres !== undefined
            ? `تم قبول الشحنة بعد التفاوض بسعر ${formatEGP(finalFee)}، وإسنادها إلى ${warehouse?.name || 'المستودع'} لاستلامها وفرزها.`
            : `تم قبول الشحنة بسعر ${formatEGP(finalFee)}، وإسنادها تلقائياً إلى ${warehouse?.name || 'المستودع'} لبدء دورة الاستلام والفرز.`,
      },
    ],
  };

  const nextShipments = [...nextState.shipments];
  nextShipments[idx] = updatedShipment;

  // Automatically resolve any open StorySituation tied to this shipment so accepting from ShipmentsPanel never soft-locks MAIN_CONTROL
  const nextSituations = nextState.situations.map((sit) =>
    sit.relatedShipmentTracking === trackingNumber && !sit.resolved
      ? {
          ...sit,
          resolved: true,
          outcomeSummary:
            negotiatedFeePiastres !== undefined
              ? `تم قبول الشحنة ${trackingNumber} بعد التفاوض بسعر ${formatEGP(finalFee)} وإحالتها للمستودع.`
              : `تم قبول الشحنة ${trackingNumber} بسعر ${formatEGP(finalFee)} وإحالتها للمستودع للاستلام والفرز.`,
        }
      : sit
  );

  const nextToasts = [
    {
      id: `TOAST-WH-${trackingNumber}-${Date.now()}`,
      dedupeKey: `TOAST-WH-${trackingNumber}`,
      shipmentId: trackingNumber,
      trackingNumber,
      clientName: shipment.clientName,
      stage: 'AT_WAREHOUSE' as const,
      messageAr: `تم نقل شحنة شركة ${shipment.clientName} إلى المستودع (${trackingNumber})`,
      durationMs: 4000 as const,
      createdAtMs: Date.now(),
      targetSection: 'WAREHOUSE',
    },
    ...(nextState.timedShipmentToasts || []).filter(
      (t) => t.dedupeKey !== `TOAST-WH-${trackingNumber}`
    ),
  ].slice(0, 12);

  const currentMastery = nextState.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          reviewedAndDecidedOrder: true,
        },
      }
    : undefined;

  nextState = {
    ...nextState,
    shipments: nextShipments,
    situations: nextSituations,
    timedShipmentToasts: nextToasts,
    onboardingMastery: updatedMastery,
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `ACCEPT-${trackingNumber}`,
    trackingNumber,
    title: `إسناد الشحنة ${trackingNumber} إلى المستودع`,
    message: `تم قبول الشحنة ${trackingNumber} (${shipment.clientName}) وإحالتها إلى المستودع للاستلام والفرز. الموعد المتوقع للتسليم ${updatedShipment.expectedDeliveryTimeLabel}.`,
    department: 'WAREHOUSE',
    outcomeLabel: 'في انتظار استلام المستودع',
    severity: 'INFO',
  });

  return nextState;
}

/**
 * Rejects a NEW_REQUEST shipment with zero revenue and zero operating cost,
 * and resolves any linked StorySituation so the player is never blocked from ending the day.
 */
export function rejectShipmentRequest(
  state: GameState,
  trackingNumber: string,
  reasonNote: string
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة رقم ${trackingNumber} غير موجودة.`);

  const shipment = state.shipments[idx];
  if (shipment.status !== 'NEW_REQUEST') {
    throw new Error(
      `لا يمكن رفض الشحنة ${trackingNumber} لأن حالتها الحالية هي: ${SHIPMENT_STATUS_LABELS_AR[shipment.status]}.`
    );
  }

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'REJECTED',
    operationalLocation: 'CLIENT_PREMISES',
    responsibleDepartment: 'COMPLETED',
    lastStatusChangeTotalMinutes: state.clock.totalElapsedMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: undefined,
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${state.company.currentDay}-${shipment.timeline.length + 1}`,
        day: state.company.currentDay,
        timestampLabel: `${timeLabel} — اعتذار عن الطلب`,
        totalMinutes: state.clock.totalElapsedMinutes,
        status: 'REJECTED',
        location: 'CLIENT_PREMISES',
        department: 'MANAGEMENT',
        note: reasonNote,
      },
    ],
  };

  const nextShipments = [...state.shipments];
  nextShipments[idx] = updatedShipment;

  const updatedClients = state.clients.map((c) => {
    if (c.id !== shipment.clientId) return c;
    return {
      ...c,
      trustLevel: Math.max(0, c.trustLevel - 8),
      history: [
        ...c.history,
        {
          id: `HIST-${state.company.currentDay}-${c.history.length + 1}`,
          day: state.company.currentDay,
          summary: `تم رفض طلب الشحنة ${trackingNumber}`,
          trustDelta: -8,
        },
      ],
    };
  });

  const nextSituations = state.situations.map((sit) =>
    sit.relatedShipmentTracking === trackingNumber && !sit.resolved
      ? {
          ...sit,
          resolved: true,
          outcomeSummary: `تم الاعتذار عن طلب الشحنة ${trackingNumber} (${reasonNote}).`,
        }
      : sit
  );

  return {
    ...state,
    shipments: nextShipments,
    situations: nextSituations,
    clients: updatedClients,
    company: {
      ...state.company,
      reputation: Math.max(0, state.company.reputation - 2),
    },
  };
}

/**
 * Internal step: Warehouse completes packaging and prepares a shipment -> READY_FOR_DISPATCH.
 */
export function prepareShipmentForPickup(
  state: GameState,
  trackingNumber: string
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const shipment = state.shipments[idx];
  const nowMinutes = state.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const clerk = state.employees.find(
    (e) => e.role === 'WAREHOUSE_CLERK' && e.status !== 'TERMINATED'
  );
  const shelf = shipment.shelfLocation || `رف A-${(idx + 1) * 10}`;

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'READY_FOR_DISPATCH',
    operationalLocation: 'WAITING_FOR_COURIER',
    responsibleDepartment: 'WAREHOUSE',
    shelfLocation: shelf,
    assignedWarehouseStaffId: clerk?.id,
    lastStatusChangeTotalMinutes: nowMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: nowMinutes + 15,
    isDelayed: false,
    custodyChain: appendCustodyEvent(shipment, {
      stage: 'PACKAGED',
      actorEmployeeId: clerk?.id,
      actorName: clerk?.name || 'موظف المستودع',
      department: 'WAREHOUSE',
      day: state.company.currentDay,
      timeLabel,
      totalMinutes: nowMinutes,
      conditionNote: `إتمام الفرز والتغليف السليم وتجهيز الشحنة في (${shelf}) لتسليمها للمندوب`,
    }),
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${state.company.currentDay}-${shipment.timeline.length + 1}`,
        day: state.company.currentDay,
        timestampLabel: `${timeLabel} — إتمام الفرز والتجهيز بالمستودع`,
        totalMinutes: nowMinutes,
        status: 'READY_FOR_DISPATCH',
        location: 'WAITING_FOR_COURIER',
        department: 'WAREHOUSE',
        actorName: clerk?.name || 'موظف المستودع',
        note: `تم فحص الشحنة وتغليفها وتحديد موقعها التخزيني (${shelf}) وتجهيزها للخروج مع المندوب.`,
      },
    ],
  };

  const nextShipments = [...state.shipments];
  nextShipments[idx] = updatedShipment;

  const nextEmployees = state.employees.map((e) =>
    e.id === clerk?.id
      ? { ...e, completedTasksCount: e.completedTasksCount + 1 }
      : e
  );

  const nextWarehouses = state.warehouses.map((w, wIdx) =>
    wIdx === 0
      ? {
          ...w,
          logs: [
            {
              id: `WLOG-${state.company.currentDay}-${w.logs.length + 1}`,
              day: state.company.currentDay,
              timeLabel,
              trackingNumber,
              action: 'PREPARED' as const,
              staffName: clerk?.name || 'أحمد فرج',
              shelfLocation: shelf,
              note: `تم تجهيز وتغليف الشحنة ${trackingNumber} للخروج للتوزيع`,
            },
            ...w.logs,
          ],
        }
      : w
  );

  return {
    ...state,
    shipments: nextShipments,
    employees: nextEmployees,
    warehouses: nextWarehouses,
  };
}

/**
 * Assigns a courier (if not already assigned) and dispatches shipment to OUT_FOR_DELIVERY,
 * recording the operating trip expense in the ledger and logging custody handoff.
 */
export function dispatchShipmentInTransit(
  state: GameState,
  trackingNumber: string,
  preferredCourierId?: string
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const shipment = state.shipments[idx];
  if (
    shipment.status !== 'READY_FOR_DISPATCH' &&
    shipment.status !== 'ASSIGNED_TO_COURIER' &&
    shipment.status !== 'DELIVERY_FAILED' &&
    shipment.status !== 'ACCEPTED'
  ) {
    throw new Error(
      `انتقال غير مسموح للشحنة ${trackingNumber} من ${SHIPMENT_STATUS_LABELS_AR[shipment.status]} إلى خروج للتوصيل.`
    );
  }

  const candidateCouriers = state.couriers.filter(
    (c) => c.status !== 'UNAVAILABLE' && c.currentLoad < c.maxLoad
  );
  const selectedCourier =
    (preferredCourierId
      ? candidateCouriers.find((c) => c.id === preferredCourierId)
      : undefined) ||
    candidateCouriers.find((c) => c.coveredZones.includes(shipment.deliveryZone)) ||
    candidateCouriers[0];

  if (!selectedCourier) {
    throw new Error('لا يوجد مندوب متاح بحمولة كافية حالياً لإسناد الشحنة.');
  }

  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: shipment.estimatedOperatingCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: shipment.trackingNumber,
    description: `تكلفة تشغيل وخروج المندوب (${selectedCourier.name}) لتوصيل الشحنة ${shipment.trackingNumber} إلى ${shipment.deliveryZone}`,
  });

  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const deliveryTripDuration = selectedCourier.efficiency >= 80 ? 35 : 50;
  const expectedAttemptClock =
    (nextState.clock.minutesFromMidnight + deliveryTripDuration) % 1440;
  const expectedAttemptLabel = formatClockTime(expectedAttemptClock);

  const custodyWithHandoff = appendCustodyEvent(shipment, {
    stage: 'HANDED_TO_COURIER',
    actorEmployeeId: selectedCourier.employeeId,
    actorName: selectedCourier.name,
    department: 'DISPATCH_COURIERS',
    day: nextState.company.currentDay,
    timeLabel,
    totalMinutes: nowMinutes,
    conditionNote: `استلام المندوب ${selectedCourier.name} للشحنة من المستودع بحالة سليمة وخروجه للتوصيل`,
  });

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'OUT_FOR_DELIVERY',
    operationalLocation: 'WITH_COURIER',
    responsibleDepartment: 'DISPATCH_COURIERS',
    assignedCourierId: selectedCourier.id,
    assignedEmployeeId: selectedCourier.employeeId,
    assignedVehicleId: selectedCourier.vehicleId,
    actualOperatingCostPiastres:
      shipment.actualOperatingCostPiastres + shipment.estimatedOperatingCostPiastres,
    lastStatusChangeTotalMinutes: nowMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: nowMinutes + deliveryTripDuration,
    expectedDeliveryTimeLabel: expectedAttemptLabel,
    custodyChain: custodyWithHandoff,
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${nextState.company.currentDay}-${shipment.timeline.length + 1}`,
        day: nextState.company.currentDay,
        timestampLabel: `${timeLabel} — خروج المندوب للتوصيل`,
        totalMinutes: nowMinutes,
        status: 'OUT_FOR_DELIVERY',
        location: 'WITH_COURIER',
        department: 'DISPATCH_COURIERS',
        actorName: selectedCourier.name,
        note: `تسلم المندوب (${selectedCourier.name}) الشحنة وخرج للتوصيل إلى ${shipment.deliveryZone}. موعد التسليم المتوقع ${expectedAttemptLabel}.`,
      },
    ],
  };

  const nextShipments = [...nextState.shipments];
  nextShipments[idx] = updatedShipment;

  const nextCouriers = nextState.couriers.map((c) =>
    c.id === selectedCourier.id
      ? {
          ...c,
          status: 'ON_MISSION' as const,
          currentLoad: c.assignedTrackingNumbers.includes(trackingNumber)
            ? c.currentLoad
            : c.currentLoad + 1,
          assignedTrackingNumbers: c.assignedTrackingNumbers.includes(trackingNumber)
            ? c.assignedTrackingNumbers
            : [...c.assignedTrackingNumbers, trackingNumber],
        }
      : c
  );

  const nextVehicles = nextState.vehicles.map((v) =>
    v.id === selectedCourier.vehicleId
      ? {
          ...v,
          usedCapacityToday: v.usedCapacityToday + 1,
          maintenanceHealth: Math.max(15, v.maintenanceHealth - 2),
        }
      : v
  );

  const currentFleetEquip = nextState.fleetAndEquipment || {
    fuelLevelPercent: 85,
    sortingMachineHealth: 88,
    adminSystemHealth: 94,
    lastRefueledDay: nextState.company.currentDay,
    lastMachineMaintainedDay: nextState.company.currentDay,
    activeBreakdowns: [],
  };

  const nextFuelPercent = Math.max(0, currentFleetEquip.fuelLevelPercent - 6);
  const nextSortingHealth = Math.max(15, currentFleetEquip.sortingMachineHealth - 2);
  const activeBreakdowns: string[] = [];
  if (nextFuelPercent <= 20) {
    activeBreakdowns.push('انخفاض حرج في مخزون بنزين الأسطول (يحتاج تزويد وقود فوري)');
  }
  if (nextSortingHealth <= 35) {
    activeBreakdowns.push('تباطؤ وأعطال متكررة في سير وماكينات الفرز والتغليف بالمستودع');
  }

  const nextToasts = [
    {
      id: `TOAST-COUR-${trackingNumber}-${Date.now()}`,
      dedupeKey: `TOAST-COUR-${trackingNumber}-ATT-${shipment.attemptCount}`,
      shipmentId: trackingNumber,
      trackingNumber,
      clientName: shipment.clientName,
      stage: 'WITH_COURIER' as const,
      messageAr: `شحنة شركة ${shipment.clientName} مع المندوب (${selectedCourier.name})`,
      durationMs: 5000 as const,
      createdAtMs: Date.now(),
      targetSection: 'SHIPMENTS',
    },
    ...(nextState.timedShipmentToasts || []).filter(
      (t) => t.dedupeKey !== `TOAST-COUR-${trackingNumber}-ATT-${shipment.attemptCount}`
    ),
  ].slice(0, 12);

  const currentMastery = nextState.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          movedAndDeliveredOrder: true,
        },
      }
    : undefined;

  nextState = {
    ...nextState,
    shipments: nextShipments,
    couriers: nextCouriers,
    vehicles: nextVehicles,
    timedShipmentToasts: nextToasts,
    onboardingMastery: updatedMastery,
    fleetAndEquipment: {
      ...currentFleetEquip,
      fuelLevelPercent: nextFuelPercent,
      sortingMachineHealth: nextSortingHealth,
      activeBreakdowns,
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `OUT-${trackingNumber}-ATT-${shipment.attemptCount}`,
    trackingNumber,
    title: `خروج الشحنة ${trackingNumber} للتوصيل`,
    message: `الشحنة ${trackingNumber} خرجت مع المندوب ${selectedCourier.name}، وموعد التسليم المتوقع ${expectedAttemptLabel}.`,
    department: 'DISPATCH_COURIERS',
    outcomeLabel: `مع المندوب ${selectedCourier.name}`,
    severity: 'INFO',
  });

  return nextState;
}

/**
 * Completes delivery of an OUT_FOR_DELIVERY or DELIVERY_ATTEMPT shipment ( -> DELIVERED).
 * Strictly prevents double delivery or double collection, updates marketing deadline tasks,
 * and records event-driven social media feedback.
 */
export function completeShipmentDelivery(
  state: GameState,
  trackingNumber: string
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const shipment = state.shipments[idx];
  if (shipment.status === 'DELIVERED') {
    throw new Error(
      `تم تسجيل تسليم الشحنة ${trackingNumber} مسبقاً، لا يمكن التسليم أو التحصيل مرتين.`
    );
  }
  if (
    shipment.status !== 'OUT_FOR_DELIVERY' &&
    shipment.status !== 'DELIVERY_ATTEMPT'
  ) {
    throw new Error(
      `لا يمكن تسليم الشحنة ${trackingNumber} لأن حالتها الحالية هي: ${SHIPMENT_STATUS_LABELS_AR[shipment.status]}.`
    );
  }

  let nextState = { ...state };
  const netServiceFee = Math.max(
    0,
    shipment.serviceFeePiastres - (shipment.discountAppliedPiastres || 0)
  );
  let cashCollectedForFee = 0;
  let receivableAdded = 0;
  let codCollected = 0;

  if (shipment.paymentTerms === 'PREPAID_CASH') {
    nextState = recordLedgerTransaction(nextState, {
      type: 'REVENUE_EARNED',
      amountPiastres: netServiceFee,
      debitAccount: 'CASH',
      creditAccount: 'SERVICE_REVENUE',
      referenceId: shipment.trackingNumber,
      description: `تحصيل نقدي لإيراد شحنة ${shipment.trackingNumber} (${shipment.clientName})`,
    });
    cashCollectedForFee = netServiceFee;
  } else if (shipment.paymentTerms === 'POSTPAID_RECEIVABLE') {
    nextState = recordLedgerTransaction(nextState, {
      type: 'REVENUE_EARNED',
      amountPiastres: netServiceFee,
      debitAccount: 'ACCOUNTS_RECEIVABLE',
      creditAccount: 'SERVICE_REVENUE',
      referenceId: shipment.trackingNumber,
      description: `إثبات إيراد شحنة آجل على حساب العميل ${shipment.clientName} — شحنة ${shipment.trackingNumber}`,
    });
    receivableAdded = netServiceFee;
  } else if (shipment.paymentTerms === 'COD_MERCHANT') {
    nextState = recordLedgerTransaction(nextState, {
      type: 'REVENUE_EARNED',
      amountPiastres: netServiceFee,
      debitAccount: 'CASH',
      creditAccount: 'SERVICE_REVENUE',
      referenceId: shipment.trackingNumber,
      description: `إيراد خدمة الشحن المحصل نقداً عند التسليم — شحنة ${shipment.trackingNumber}`,
    });
    cashCollectedForFee = netServiceFee;

    if (shipment.codAmountPiastres > 0) {
      nextState = recordLedgerTransaction(nextState, {
        type: 'COD_COLLECTED',
        amountPiastres: shipment.codAmountPiastres,
        debitAccount: 'CASH',
        creditAccount: 'MERCHANT_COD_PAYABLE',
        referenceId: shipment.trackingNumber,
        description: `تحصيل مبلغ بضاعة (COD) لصالح التاجر ${shipment.clientName} كأمانة — شحنة ${shipment.trackingNumber}`,
      });
      codCollected = shipment.codAmountPiastres;
    }
  }

  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const courier = nextState.couriers.find((c) => c.id === shipment.assignedCourierId);
  const wasOnTime = !shipment.isDelayed && nowMinutes <= shipment.expectedDeliveryTotalMinutes + 15;

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'DELIVERED',
    operationalLocation: 'DELIVERED_TO_RECIPIENT',
    responsibleDepartment: 'COMPLETED',
    completedAtDay: nextState.company.currentDay,
    lastStatusChangeTotalMinutes: nowMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: undefined,
    isDelayed: false,
    requiresManagerIntervention: false,
    attemptCount: shipment.attemptCount + 1,
    lastAttemptResult: 'DELIVERED_SUCCESS',
    revenueEarnedPiastres: netServiceFee,
    cashCollectedForFeePiastres: cashCollectedForFee,
    receivableOutstandingPiastres: receivableAdded,
    codCollectedInCashPiastres: codCollected,
    custodyChain: appendCustodyEvent(shipment, {
      stage: 'DELIVERY_ATTEMPTED',
      actorEmployeeId: shipment.assignedEmployeeId,
      actorName: courier?.name || 'المندوب',
      department: 'COMPLETED',
      day: nextState.company.currentDay,
      timeLabel,
      totalMinutes: nowMinutes,
      conditionNote: `تم التسليم النهائي للمستلم في ${shipment.deliveryZone} بنجاح`,
    }),
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${nextState.company.currentDay}-${shipment.timeline.length + 1}`,
        day: nextState.company.currentDay,
        timestampLabel: `${timeLabel} — تم التسليم بنجاح`,
        totalMinutes: nowMinutes,
        status: 'DELIVERED',
        location: 'DELIVERED_TO_RECIPIENT',
        department: 'COMPLETED',
        actorName: courier?.name || 'المندوب',
        note:
          shipment.paymentTerms === 'POSTPAID_RECEIVABLE'
            ? `تم تسليم الشحنة بنجاح، وأُدرج مبلغ ${formatEGP(netServiceFee)} في مستحقات العملاء الآجلة.`
            : shipment.paymentTerms === 'COD_MERCHANT'
              ? `تم تسليم الشحنة وتحصيل ${formatEGP(netServiceFee)} إيراد شحن + ${formatEGP(codCollected)} أمانات تحصيل للتاجر.`
              : `تم تسليم الشحنة بنجاح وتحصيل رسوم الشحن نقداً (${formatEGP(netServiceFee)}).`,
      },
    ],
  };

  const nextShipments = [...nextState.shipments];
  nextShipments[idx] = updatedShipment;

  const nextCouriers = nextState.couriers.map((c) => {
    if (c.id !== shipment.assignedCourierId) return c;
    const remainingAssigned = c.assignedTrackingNumbers.filter(
      (t) => t !== trackingNumber
    );
    return {
      ...c,
      currentLoad: Math.max(0, remainingAssigned.length),
      assignedTrackingNumbers: remainingAssigned,
      status: remainingAssigned.length === 0 ? ('AVAILABLE' as const) : c.status,
      successfulDeliveriesCount: c.successfulDeliveriesCount + 1,
      deliveryHistory: [
        {
          id: `CDEL-${nextState.company.currentDay}-${c.deliveryHistory.length + 1}`,
          day: nextState.company.currentDay,
          timeLabel,
          trackingNumber,
          result: 'DELIVERED_SUCCESS' as const,
          note: `تسليم ناجح في ${shipment.deliveryZone}`,
        },
        ...c.deliveryHistory,
      ],
    };
  });

  const nextEmployees = nextState.employees.map((e) =>
    e.id === shipment.assignedEmployeeId
      ? { ...e, completedTasksCount: e.completedTasksCount + 1 }
      : e
  );

  const nextClients = nextState.clients.map((c) => {
    if (c.id !== shipment.clientId) return c;
    return {
      ...c,
      receivableBalancePiastres: c.receivableBalancePiastres + receivableAdded,
      merchantCodBalancePiastres: c.merchantCodBalancePiastres + codCollected,
      trustLevel: Math.min(100, c.trustLevel + 6),
      history: [
        ...c.history,
        {
          id: `HIST-${nextState.company.currentDay}-${c.history.length + 1}`,
          day: nextState.company.currentDay,
          summary: `تسليم ناجح للشحنة ${shipment.trackingNumber}`,
          trustDelta: +6,
        },
      ],
    };
  });

  // Update marketing deadline tasks if applicable
  const nextMarketing = nextState.marketing
    ? {
        ...nextState.marketing,
        deadlineTasks: nextState.marketing.deadlineTasks.map((task) => {
          if (task.status !== 'ACTIVE') return task;
          const nextCompleted = task.completedShipmentsCount + 1;
          return {
            ...task,
            completedShipmentsCount: nextCompleted,
            status:
              nextCompleted >= task.targetShipmentsCount
                ? ('COMPLETED' as const)
                : task.status,
          };
        }),
      }
    : nextState.marketing;

  const nextToasts = [
    {
      id: `TOAST-DELIV-${trackingNumber}-${Date.now()}`,
      dedupeKey: `TOAST-DELIV-${trackingNumber}`,
      shipmentId: trackingNumber,
      trackingNumber,
      clientName: shipment.clientName,
      stage: 'DELIVERED' as const,
      messageAr: `تم قبول واستلام شحنة شركة ${shipment.clientName} بنجاح (${trackingNumber})`,
      durationMs: 5000 as const,
      createdAtMs: Date.now(),
      targetSection: 'SHIPMENTS',
    },
    ...(nextState.timedShipmentToasts || []).filter(
      (t) => t.dedupeKey !== `TOAST-DELIV-${trackingNumber}`
    ),
  ].slice(0, 12);

  const currentMastery = nextState.onboardingMastery;
  const updatedMastery = currentMastery
    ? {
        ...currentMastery,
        appliedSystems: {
          ...currentMastery.appliedSystems,
          movedAndDeliveredOrder: true,
        },
      }
    : undefined;

  nextState = {
    ...nextState,
    shipments: nextShipments,
    couriers: nextCouriers,
    employees: nextEmployees,
    clients: nextClients,
    marketing: nextMarketing,
    timedShipmentToasts: nextToasts,
    onboardingMastery: updatedMastery,
    company: {
      ...nextState.company,
      reputation: Math.min(100, nextState.company.reputation + 3),
      customerSatisfaction: Math.min(100, nextState.company.customerSatisfaction + 4),
    },
  };

  if (wasOnTime) {
    nextState = recordSocialPostForShipmentEvent(
      nextState,
      updatedShipment,
      'DELIVERED_ON_TIME'
    );
  }

  nextState = pushNotification(nextState, {
    dedupeKey: `DELIVERED-${trackingNumber}`,
    trackingNumber,
    title: `نجاح تسليم الشحنة ${trackingNumber}`,
    message: `تم تسليم الشحنة ${trackingNumber} للعميل في ${shipment.deliveryZone} بنجاح بواسطة ${courier?.name || 'المندوب'}.`,
    department: 'DISPATCH_COURIERS',
    outcomeLabel: 'تم التسليم والتحصيل',
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Fails a delivery attempt (OUT_FOR_DELIVERY -> DELIVERY_FAILED).
 * Records the exact attempt result, updates timeline, triggers a real customer complaint on social media,
 * sends notification, and flags for manager action.
 */
export function failShipmentDelivery(
  state: GameState,
  trackingNumber: string,
  failureReason: string,
  additionalReturnCostPiastres = 0,
  attemptResult: DeliveryAttemptResult = 'CLIENT_ABSENT'
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const shipment = state.shipments[idx];
  if (
    shipment.status !== 'OUT_FOR_DELIVERY' &&
    shipment.status !== 'DELIVERY_ATTEMPT'
  ) {
    throw new Error(
      `لا يمكن تسجيل فشل تسليم الشحنة ${trackingNumber} من حالتها الحالية (${SHIPMENT_STATUS_LABELS_AR[shipment.status]}).`
    );
  }

  let nextState = { ...state };
  if (additionalReturnCostPiastres > 0) {
    nextState = recordLedgerTransaction(nextState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: additionalReturnCostPiastres,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: shipment.trackingNumber,
      description: `تكلفة إضافية نتيجة تعذر تسليم الشحنة ${shipment.trackingNumber}: ${failureReason}`,
    });
  }

  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const courier = nextState.couriers.find((c) => c.id === shipment.assignedCourierId);

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'DELIVERY_FAILED',
    operationalLocation: 'RETURNING_TO_WAREHOUSE',
    responsibleDepartment: 'CUSTOMER_SERVICE',
    failureReason,
    delayReason: failureReason,
    isDelayed: true,
    requiresManagerIntervention: true,
    currentRemediationAction: 'بانتظار قرار المدير: اعتماد إعادة محاولة التسليم أو إرجاع الطرد للتاجر',
    attemptCount: shipment.attemptCount + 1,
    lastAttemptResult: attemptResult,
    lastStatusChangeTotalMinutes: nowMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: undefined,
    actualOperatingCostPiastres:
      shipment.actualOperatingCostPiastres + additionalReturnCostPiastres,
    revenueEarnedPiastres: 0,
    custodyChain: appendCustodyEvent(shipment, {
      stage: 'DELIVERY_ATTEMPTED',
      actorEmployeeId: shipment.assignedEmployeeId,
      actorName: courier?.name || 'المندوب',
      department: 'DISPATCH_COURIERS',
      day: nextState.company.currentDay,
      timeLabel,
      totalMinutes: nowMinutes,
      conditionNote: `تعذر التسليم (${DELIVERY_RESULT_LABELS_AR[attemptResult]}): ${failureReason}`,
    }),
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${nextState.company.currentDay}-${shipment.timeline.length + 1}`,
        day: nextState.company.currentDay,
        timestampLabel: `${timeLabel} — تعذر محاولة التسليم`,
        totalMinutes: nowMinutes,
        status: 'DELIVERY_FAILED',
        location: 'RETURNING_TO_WAREHOUSE',
        department: 'CUSTOMER_SERVICE',
        actorName: courier?.name || 'المندوب',
        note: `تعذر التسليم (${DELIVERY_RESULT_LABELS_AR[attemptResult]}): ${failureReason}. تحتاج الشحنة إلى توجيه إداري.`,
      },
    ],
  };

  const nextShipments = [...nextState.shipments];
  nextShipments[idx] = updatedShipment;

  const nextCouriers = nextState.couriers.map((c) => {
    if (c.id !== shipment.assignedCourierId) return c;
    const remaining = c.assignedTrackingNumbers.filter((t) => t !== trackingNumber);
    return {
      ...c,
      currentLoad: Math.max(0, remaining.length),
      assignedTrackingNumbers: remaining,
      status: remaining.length === 0 ? ('AVAILABLE' as const) : c.status,
      failedOrDelayedCount: c.failedOrDelayedCount + 1,
      deliveryHistory: [
        {
          id: `CDEL-${nextState.company.currentDay}-${c.deliveryHistory.length + 1}`,
          day: nextState.company.currentDay,
          timeLabel,
          trackingNumber,
          result: attemptResult,
          note: failureReason,
        },
        ...c.deliveryHistory,
      ],
    };
  });

  // Only attribute delay to employee if it was an operational courier delay, NOT client absence or vehicle breakdown
  const isCourierPersonalFault = attemptResult === 'COURIER_DELAYED' && !state.discoveredEvents.includes('MOTO_QUICK_FIX_RISK');
  const nextEmployees = nextState.employees.map((e) =>
    e.id === shipment.assignedEmployeeId && isCourierPersonalFault
      ? { ...e, attributedDelaysCount: e.attributedDelaysCount + 1 }
      : e
  );

  const nextToasts = [
    {
      id: `TOAST-REFUSED-${trackingNumber}-${Date.now()}`,
      dedupeKey: `TOAST-REFUSED-${trackingNumber}-ATT-${updatedShipment.attemptCount}`,
      shipmentId: trackingNumber,
      trackingNumber,
      clientName: shipment.clientName,
      stage: 'REFUSED' as const,
      messageAr: `رفض أو تعذر استلام شحنة شركة ${shipment.clientName} (${trackingNumber})`,
      durationMs: 5000 as const,
      createdAtMs: Date.now(),
      targetSection: 'SHIPMENTS',
    },
    ...(nextState.timedShipmentToasts || []),
  ].slice(0, 12);

  nextState = {
    ...nextState,
    shipments: nextShipments,
    couriers: nextCouriers,
    employees: nextEmployees,
    timedShipmentToasts: nextToasts,
  };

  nextState = recordSocialPostForShipmentEvent(
    nextState,
    updatedShipment,
    'DELIVERY_FAILED',
    failureReason
  );

  nextState = pushNotification(nextState, {
    dedupeKey: `FAILED-${trackingNumber}-ATT-${updatedShipment.attemptCount}`,
    trackingNumber,
    title: `تعذر تسليم الشحنة ${trackingNumber}`,
    message: `تعذر تسليم الشحنة ${trackingNumber}. السبب: ${failureReason}. تم تسجيل محاولة التوصيل.`,
    department: 'CUSTOMER_SERVICE',
    outcomeLabel: DELIVERY_RESULT_LABELS_AR[attemptResult],
    actionRequiredLabel: 'مطلوب قرار إداري (إعادة محاولة أو مرتجع)',
    severity: 'URGENT',
  });

  return nextState;
}

/**
 * Section 7: Records or investigates operational damage or loss based on the shipment's custody chain.
 * If evidence is inconclusive, returns `stage: 'UNCONFIRMED'` ("سبب غير محسوم") without penalizing staff.
 */
export function investigateShipmentCustodyAndDamage(
  state: GameState,
  trackingNumber: string
): ShipmentDamageLossReport {
  const sh = state.shipments.find((s) => s.trackingNumber === trackingNumber);
  if (!sh) {
    throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);
  }

  if (sh.damageLossReport) {
    return sh.damageLossReport;
  }

  const chain = sh.custodyChain || [];
  const lastEvent = chain[chain.length - 1];

  if (sh.status === 'UNLOCATED_IN_WAREHOUSE') {
    const whClerk = state.employees.find((e) => e.id === sh.assignedWarehouseStaffId);
    return {
      incidentType: 'LOSS',
      stage: 'WAREHOUSE',
      confirmedEvidence: true,
      responsibleEmployeeId: whClerk?.id,
      responsibleEmployeeName: whClerk?.name || 'أمين المستودع',
      investigationSummaryAr: `ثبت من سجل العهدة أن آخر استلام مسجل للشحنة كان داخل المستودع (${sh.shelfLocation || 'قسم الفرز'}) تحت مسؤولية ${whClerk?.name || 'موظف المستودع'} ولم تُسلم للمندوب بعد.`,
    };
  }

  if (
    lastEvent &&
    (lastEvent.stage === 'HANDED_TO_COURIER' || lastEvent.stage === 'OUT_FOR_DELIVERY') &&
    sh.status === 'DAMAGED_OR_LOST'
  ) {
    return {
      incidentType: 'DAMAGE',
      stage: 'DELIVERY',
      confirmedEvidence: true,
      responsibleEmployeeId: lastEvent.actorEmployeeId,
      responsibleEmployeeName: lastEvent.actorName,
      investigationSummaryAr: `ثبت من سجل العهدة أن الشحنة خرجت سليمة من المستودع واستلمها المندوب (${lastEvent.actorName}) في الساعة ${lastEvent.timeLabel}، وحدث التضرر أثناء خط السير.`,
    };
  }

  return {
    incidentType: 'DAMAGE',
    stage: 'UNCONFIRMED',
    confirmedEvidence: false,
    investigationSummaryAr:
      'سبب غير محسوم: لا توجد أدلة قاطعة في سجل التسليم والاستلام تدين موظفاً بعينه دون اكتمال الفحص الميداني.',
  };
}

/**
 * Transitions a DELIVERY_FAILED or UNDER_INVESTIGATION shipment to RETURNED (مرتجع للتاجر).
 */
export function returnFailedShipmentToMerchant(
  state: GameState,
  trackingNumber: string
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const shipment = state.shipments[idx];
  if (!canTransitionShipment(shipment.status, 'RETURNED')) {
    throw new Error(
      `لا يمكن تحويل الشحنة ${trackingNumber} إلى مرتجع إلا بعد حالة فشل التسليم أو التحقيق.`
    );
  }

  const nowMinutes = state.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  const updatedShipment: Shipment = {
    ...shipment,
    status: 'RETURNED',
    operationalLocation: 'CLIENT_PREMISES',
    responsibleDepartment: 'COMPLETED',
    completedAtDay: state.company.currentDay,
    lastStatusChangeTotalMinutes: nowMinutes,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: undefined,
    isDelayed: false,
    requiresManagerIntervention: false,
    currentRemediationAction: 'تم إغلاق البوليصة كمرتجع للتاجر',
    timeline: [
      ...shipment.timeline,
      {
        id: `EVT-${state.company.currentDay}-${shipment.timeline.length + 1}`,
        day: state.company.currentDay,
        timestampLabel: `${timeLabel} — إرجاع الطرد للتاجر`,
        totalMinutes: nowMinutes,
        status: 'RETURNED',
        location: 'CLIENT_PREMISES',
        department: 'COMPLETED',
        note: `تم إرجاع الشحنة إلى العميل (${shipment.clientName}) وإغلاق البوليصة كمرتجع دون احتساب إيراد توصيل.`,
      },
    ],
  };

  const nextShipments = [...state.shipments];
  nextShipments[idx] = updatedShipment;

  return {
    ...state,
    shipments: nextShipments,
  };
}

/**
 * Generates the structured 7-point Delay Inquiry Report for Section 7 («الاستفسار عن التأخير»).
 */
export function buildShipmentDelayInquiryReport(
  state: GameState,
  trackingNumber: string
): DelayInquiryReport {
  const sh = state.shipments.find((s) => s.trackingNumber === trackingNumber);
  if (!sh) {
    throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);
  }

  const minutesSinceChange = Math.max(
    0,
    state.clock.totalElapsedMinutes - sh.lastStatusChangeTotalMinutes
  );

  const courier = state.couriers.find((c) => c.id === sh.assignedCourierId);
  const whStaff = state.employees.find((e) => e.id === sh.assignedWarehouseStaffId);

  let responsiblePartyLabel = DEPARTMENT_LABELS_AR[sh.responsibleDepartment];
  if (courier && sh.responsibleDepartment === 'DISPATCH_COURIERS') {
    responsiblePartyLabel = `المندوب: ${courier.name} (${DEPARTMENT_LABELS_AR[sh.responsibleDepartment]})`;
  } else if (whStaff && sh.responsibleDepartment === 'WAREHOUSE') {
    responsiblePartyLabel = `موظف المستودع: ${whStaff.name} (${sh.shelfLocation || 'قسم الفرز'})`;
  }

  const recordedDelayReason = sh.delayReason
    ? sh.delayReason
    : sh.isDelayed
      ? 'السبب قيد التحقق'
      : 'لا يوجد تأخير مسجل — الشحنة ضمن المهلة الطبيعية';

  const ongoingActionLabel =
    sh.currentRemediationAction ||
    (sh.status === 'DELIVERED'
      ? 'تم إتمام التسليم وإغلاق الشحنة'
      : 'سير العمل التشغيلي المعتاد بين المستودع والتوزيع');

  const availableManagerActions: DelayInquiryReport['availableManagerActions'] = [];

  if (
    sh.status !== 'DELIVERED' &&
    sh.status !== 'REJECTED' &&
    sh.status !== 'RETURNED' &&
    sh.status !== 'CANCELLED_EXPIRED'
  ) {
    if (sh.responsibleDepartment === 'WAREHOUSE') {
      availableManagerActions.push({
        actionType: 'CONTACT_WAREHOUSE',
        label: 'التواصل مع المستودع لتسريع الفحص ومعرفة السبب',
        costPiastres: 0,
        description: 'يحدث حالة الشحنة ويقلل زمن الانتظار بالمستودع.',
      });
    }

    if (sh.status === 'UNLOCATED_IN_WAREHOUSE') {
      availableManagerActions.push({
        actionType: 'ASSIGN_STAFF_SEARCH',
        label: 'تكليف موظف بالبحث الداخلي الفوري عن الشحنة',
        costPiastres: egpToPiastres(25),
        description: 'جرد الرفوف واستخراج الشحنة وتجهيزها فوراً للخروج (بدل عمل إضافي 25 ج.م).',
      });
    }

    if (
      sh.status === 'ASSIGNED_TO_WAREHOUSE' ||
      sh.status === 'RECEIVED_AT_WAREHOUSE' ||
      sh.status === 'WAITING_SORTING' ||
      sh.status === 'SORTING' ||
      sh.status === 'WAITING_PACKAGING' ||
      sh.status === 'PREPARING_AT_WAREHOUSE' ||
      sh.status === 'DELAYED_IN_WAREHOUSE'
    ) {
      availableManagerActions.push({
        actionType: 'PRIORITIZE_PREPARATION',
        label: 'إعادة ترتيب أولوية تجهيز الشحنة بالمستودع (أولوية قصوى)',
        costPiastres: egpToPiastres(20),
        description: 'تقديم الشحنة في طابور الفرز لتصبح جاهزة للخروج فوراً (20 ج.م).',
      });
    }

    if (sh.status === 'READY_FOR_DISPATCH' || sh.status === 'OUT_FOR_DELIVERY') {
      availableManagerActions.push({
        actionType: 'REASSIGN_COURIER',
        label: 'إسناد الشحنة إلى مندوب آخر متاح',
        costPiastres: egpToPiastres(15),
        description: 'نقل المهمة إلى مندوب بديل متاح لتفادي التأخير.',
      });
    }

    if (sh.status === 'DELIVERY_FAILED') {
      availableManagerActions.push({
        actionType: 'APPROVE_RETRY_ATTEMPT',
        label: 'اعتماد إعادة محاولة التسليم وفق سياسة الشركة',
        costPiastres: sh.estimatedOperatingCostPiastres,
        description: `إرسال الشحنة في محاولة توصيل جديدة مع تحديد موعد محدث (تكلفة مشوار ${formatEGP(sh.estimatedOperatingCostPiastres)}).`,
      });
    }

    availableManagerActions.push({
      actionType: 'NOTIFY_CLIENT_NEW_ETA',
      label: 'التواصل مع العميل وتقديم موعد تسليم محدث',
      costPiastres: 0,
      description: 'يمدد المهلة المتوقعة بموافقة العميل ويحمي سمعة الشركة.',
    });

    if (!sh.discountAppliedPiastres) {
      availableManagerActions.push({
        actionType: 'OFFER_CLIENT_DISCOUNT',
        label: 'تقديم خصم تعويضي للعميل (25.00 ج.م من رسوم الشحن)',
        costPiastres: 0,
        description: 'يخفض رسوم الخدمة بـ 25 ج.م ويرفع ثقة العميل ورضاه.',
      });
    }
  }

  return {
    trackingNumber: sh.trackingNumber,
    currentLocationLabel: OPERATIONAL_LOCATION_LABELS_AR[sh.operationalLocation],
    minutesSinceLastChange: minutesSinceChange,
    responsiblePartyLabel,
    recordedDelayReason,
    ongoingActionLabel,
    updatedExpectedDeliveryLabel: sh.expectedDeliveryTimeLabel,
    needsManagerDecision: sh.requiresManagerIntervention || sh.isDelayed,
    availableManagerActions,
  };
}

/**
 * Executes a Manager Administrative Intervention on a delayed/problematic shipment (Section 8).
 */
export function executeAdminShipmentAction(
  state: GameState,
  trackingNumber: string,
  actionType: AdminDelayActionType
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const sh = state.shipments[idx];
  const actionKey = `ADMIN-ACT-${trackingNumber}-${actionType}-M${state.clock.totalElapsedMinutes}`;
  if (state.executedDecisionIds.includes(actionKey)) {
    throw new Error('تم تنفيذ هذا الإجراء الإداري بالفعل.');
  }

  let nextState = { ...state };
  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);

  let updatedShipment: Shipment = { ...sh };

  switch (actionType) {
    case 'CONTACT_WAREHOUSE': {
      updatedShipment = {
        ...sh,
        delayReason:
          sh.delayReason || 'تراكم طرود الفرز الصباحي في المستودع وجارٍ إنهاء التجهيز',
        currentRemediationAction: 'تم التواصل مع مشرف المستودع وتسريع استلام الشحنة',
        nextStepDueTotalMinutes: nowMinutes + 10,
        lastUpdatedTimeLabel: timeLabel,
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — تدخل إداري (متابعة المستودع)`,
            totalMinutes: nowMinutes,
            status: sh.status,
            location: sh.operationalLocation,
            department: 'MANAGEMENT',
            actorName: 'مدير الشركة',
            note: 'تم التواصل مع المستودع لتسريع الفحص وتحديد الموعد الدقيق للتجهيز.',
          },
        ],
      };
      break;
    }

    case 'ASSIGN_STAFF_SEARCH': {
      const searchCost = egpToPiastres(25);
      const afford = canAffordImmediatePayment(nextState, searchCost);
      if (!afford.allowed) throw new Error(afford.reason);

      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: searchCost,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: trackingNumber,
        description: `بدل تكليف بحث داخلي وجرد بالمستودع للعثور على الشحنة ${trackingNumber}`,
      });

      updatedShipment = {
        ...sh,
        status: 'READY_FOR_DISPATCH',
        operationalLocation: 'WAITING_FOR_COURIER',
        responsibleDepartment: 'WAREHOUSE',
        isDelayed: false,
        requiresManagerIntervention: false,
        delayReason: 'تم العثور على الشحنة في الرف الفرعي بعد البحث الداخلي',
        currentRemediationAction: 'تم العثور على الشحنة وتجهيزها للخروج مع أقرب مندوب',
        lastStatusChangeTotalMinutes: nowMinutes,
        lastUpdatedTimeLabel: timeLabel,
        nextStepDueTotalMinutes: nowMinutes + 10,
        actualOperatingCostPiastres: sh.actualOperatingCostPiastres + searchCost,
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — نجاح البحث الداخلي بالمستودع`,
            totalMinutes: nowMinutes,
            status: 'READY_FOR_DISPATCH',
            location: 'WAITING_FOR_COURIER',
            department: 'WAREHOUSE',
            actorName: 'فريق جرد المستودع',
            note: 'تم العثور على الشحنة بعد إجراء البحث الداخلي وتجهيزها للخروج فوراً.',
          },
        ],
      };
      break;
    }

    case 'PRIORITIZE_PREPARATION': {
      const prioCost = egpToPiastres(20);
      const afford = canAffordImmediatePayment(nextState, prioCost);
      if (!afford.allowed) throw new Error(afford.reason);

      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: prioCost,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: trackingNumber,
        description: `مصروف فرز سريع وأولوية قصوى بالمستودع للشحنة ${trackingNumber}`,
      });

      updatedShipment = {
        ...sh,
        priority: 'HIGH',
        status: 'READY_FOR_DISPATCH',
        operationalLocation: 'WAITING_FOR_COURIER',
        isDelayed: false,
        requiresManagerIntervention: false,
        currentRemediationAction: 'تم رفع أولوية الشحنة وتجهيزها للخروج فوراً',
        lastStatusChangeTotalMinutes: nowMinutes,
        lastUpdatedTimeLabel: timeLabel,
        nextStepDueTotalMinutes: nowMinutes + 10,
        actualOperatingCostPiastres: sh.actualOperatingCostPiastres + prioCost,
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — رفع أولوية التجهيز`,
            totalMinutes: nowMinutes,
            status: 'READY_FOR_DISPATCH',
            location: 'WAITING_FOR_COURIER',
            department: 'WAREHOUSE',
            actorName: 'مدير الشركة',
            note: 'تم تقديم أولوية تجهيز الشحنة بالمستودع لتصبح جاهزة للخروج فوراً.',
          },
        ],
      };
      break;
    }

    case 'REASSIGN_COURIER': {
      const altCourier = nextState.couriers.find(
        (c) =>
          c.id !== sh.assignedCourierId &&
          c.status !== 'UNAVAILABLE' &&
          c.currentLoad < c.maxLoad
      );
      if (!altCourier) {
        throw new Error('لا يوجد مندوب بديل متاح بحمولة فارغة حالياً.');
      }

      const reassignCost = egpToPiastres(15);
      const afford = canAffordImmediatePayment(nextState, reassignCost);
      if (!afford.allowed) throw new Error(afford.reason);

      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: reassignCost,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: trackingNumber,
        description: `تكلفة نقل وإعادة إسناد الشحنة ${trackingNumber} إلى المندوب ${altCourier.name}`,
      });

      updatedShipment = {
        ...sh,
        assignedCourierId: altCourier.id,
        assignedEmployeeId: altCourier.employeeId,
        assignedVehicleId: altCourier.vehicleId,
        currentRemediationAction: `تم إسناد الشحنة إلى المندوب البديل (${altCourier.name})`,
        nextStepDueTotalMinutes: nowMinutes + 20,
        lastUpdatedTimeLabel: timeLabel,
        isDelayed: false,
        requiresManagerIntervention: false,
        actualOperatingCostPiastres: sh.actualOperatingCostPiastres + reassignCost,
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — إعادة إسناد لمندوب بديل`,
            totalMinutes: nowMinutes,
            status: sh.status,
            location: sh.operationalLocation,
            department: 'DISPATCH_COURIERS',
            actorName: altCourier.name,
            note: `تم تحويل الشحنة إلى المندوب ${altCourier.name} لتسريع التوصيل.`,
          },
        ],
      };
      break;
    }

    case 'APPROVE_RETRY_ATTEMPT': {
      nextState = dispatchShipmentInTransit(nextState, trackingNumber);
      const retried = nextState.shipments.find(
        (s) => s.trackingNumber === trackingNumber
      )!;
      updatedShipment = {
        ...retried,
        isDelayed: false,
        requiresManagerIntervention: false,
        currentRemediationAction: 'تم اعتماد إعادة محاولة التوصيل وخروج المندوب مجدداً',
      };
      break;
    }

    case 'NOTIFY_CLIENT_NEW_ETA': {
      const newExpectedTotal = Math.max(nowMinutes + 60, sh.expectedDeliveryTotalMinutes + 60);
      const newClockLabel = formatClockTime(
        (nextState.clock.minutesFromMidnight + 60) % 1440
      );
      updatedShipment = {
        ...sh,
        expectedDeliveryTotalMinutes: newExpectedTotal,
        expectedDeliveryTimeLabel: newClockLabel,
        isDelayed: false,
        requiresManagerIntervention: false,
        currentRemediationAction: `تم إبلاغ العميل بالموعد المحدث (${newClockLabel})`,
        lastUpdatedTimeLabel: timeLabel,
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — تحديث الموعد مع العميل`,
            totalMinutes: nowMinutes,
            status: sh.status,
            location: sh.operationalLocation,
            department: 'CUSTOMER_SERVICE',
            actorName: 'مدير الشركة',
            note: `تم التواصل مع العميل والاتفاق على موعد تسليم محدث (${newClockLabel}).`,
          },
        ],
      };
      break;
    }

    case 'OFFER_CLIENT_DISCOUNT': {
      const discount = egpToPiastres(25);
      updatedShipment = {
        ...sh,
        discountAppliedPiastres: discount,
        currentRemediationAction: 'تم منح العميل خصم 25.00 ج.م من رسوم الشحن كتعويض عن التأخير',
        requiresManagerIntervention: false,
        lastUpdatedTimeLabel: timeLabel,
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — اعتماد خصم تعويضي للعميل`,
            totalMinutes: nowMinutes,
            status: sh.status,
            location: sh.operationalLocation,
            department: 'MANAGEMENT',
            actorName: 'مدير الشركة',
            note: 'تم منح العميل خصماً تعويضياً بقيمة 25.00 ج.م على فاتورة الشحن للحفاظ على ثقته.',
          },
        ],
      };
      nextState = {
        ...nextState,
        clients: nextState.clients.map((c) =>
          c.id === sh.clientId
            ? { ...c, trustLevel: Math.min(100, c.trustLevel + 5) }
            : c
        ),
      };
      break;
    }

    default:
      break;
  }

  const nextShipments = [...nextState.shipments];
  const targetIdx = nextShipments.findIndex((s) => s.trackingNumber === trackingNumber);
  nextShipments[targetIdx] = updatedShipment;

  return {
    ...nextState,
    shipments: nextShipments,
    executedDecisionIds: [...nextState.executedDecisionIds, actionKey],
  };
}

/**
 * Refuels the delivery vehicle fleet (120 EGP immediate cash payment, no negative balance/debt allowed).
 * Restores fuelLevelPercent to 100%.
 */
export function refuelFleetVehicles(state: GameState): GameState {
  const costPiastres = egpToPiastres(120);
  const afford = canAffordImmediatePayment(state, costPiastres);
  if (!afford.allowed) {
    throw new Error(
      afford.reason ||
        'السيولة النقدية لا تكفي لتزويد بنزين الأسطول (120.00 ج.م) — لا يُسمح بالرصيد السالب أو الديون.'
    );
  }

  const refKey = `FLEET-REFUEL-D${state.company.currentDay}-${state.ledger.length + 1}`;
  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: costPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: refKey,
    description: 'تزويد خزانات البنزين والوقود لأسطول دراجات وسيارات التوصيل (100%)',
  });

  const currentEquip = nextState.fleetAndEquipment || {
    fuelLevelPercent: 85,
    sortingMachineHealth: 88,
    adminSystemHealth: 94,
    lastRefueledDay: nextState.company.currentDay,
    lastMachineMaintainedDay: nextState.company.currentDay,
    activeBreakdowns: [],
  };

  nextState = {
    ...nextState,
    fleetAndEquipment: {
      ...currentEquip,
      fuelLevelPercent: 100,
      lastRefueledDay: nextState.company.currentDay,
      activeBreakdowns: currentEquip.activeBreakdowns.filter(
        (b) => !b.includes('بنزين')
      ),
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: refKey,
    title: 'تم تزويد بنزين ووقود الأسطول بالكامل (100%)',
    message:
      'تم تموين مركبات ودراجات التوصيل بالوقود بتكلفة 120.00 ج.م لضمان عدم توقف خطوط التوزيع.',
    department: 'DISPATCH_COURIERS',
    outcomeLabel: 'مخزون الوقود 100%',
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Repairs and maintains the warehouse sorting & packaging machines and administrative systems (150 EGP).
 */
export function repairWarehouseSortingMachines(state: GameState): GameState {
  const costPiastres = egpToPiastres(150);
  const afford = canAffordImmediatePayment(state, costPiastres);
  if (!afford.allowed) {
    throw new Error(
      afford.reason ||
        'السيولة النقدية لا تكفي لصيانة ماكينات الفرز والأعطال الإدارية (150.00 ج.م) — لا يُسمح بالرصيد السالب.'
    );
  }

  const refKey = `WH-MACHINE-MAINT-D${state.company.currentDay}-${state.ledger.length + 1}`;
  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: costPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: refKey,
    description: 'صيانة وإصلاح ماكينات الفرز والتغليف والأنظمة الإدارية بالمستودع',
  });

  const currentEquip = nextState.fleetAndEquipment || {
    fuelLevelPercent: 85,
    sortingMachineHealth: 88,
    adminSystemHealth: 94,
    lastRefueledDay: nextState.company.currentDay,
    lastMachineMaintainedDay: nextState.company.currentDay,
    activeBreakdowns: [],
  };

  nextState = {
    ...nextState,
    warehouses: nextState.warehouses.map((w, idx) =>
      idx === 0
        ? { ...w, efficiencyLevel: Math.min(100, Math.max(88, w.efficiencyLevel + 8)) }
        : w
    ),
    fleetAndEquipment: {
      ...currentEquip,
      sortingMachineHealth: 100,
      adminSystemHealth: 100,
      lastMachineMaintainedDay: nextState.company.currentDay,
      activeBreakdowns: currentEquip.activeBreakdowns.filter(
        (b) => !b.includes('الفرز') && !b.includes('إداري')
      ),
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: refKey,
    title: 'إتمام صيانة ماكينات الفرز والأنظمة الإدارية',
    message:
      'تم إصلاح وصيانة خطوط الفرز والتغليف بالمستودع بتكلفة 150.00 ج.م ورفع الكفاءة التشغيلية إلى 100%.',
    department: 'WAREHOUSE',
    outcomeLabel: 'كفاءة الماكينات 100%',
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Repairs a specific fleet vehicle (motorcycle or cargo van) to 95% health and AVAILABLE status (160 EGP).
 */
export function repairFleetVehicle(
  state: GameState,
  vehicleId: string
): GameState {
  const vehIdx = state.vehicles.findIndex((v) => v.id === vehicleId);
  if (vehIdx === -1) {
    throw new Error('المركبة المطلوبة غير موجودة في أسطول الشركة.');
  }

  const veh = state.vehicles[vehIdx];
  const costPiastres = veh.type === 'CARGO_VAN' ? egpToPiastres(240) : egpToPiastres(160);
  const afford = canAffordImmediatePayment(state, costPiastres);
  if (!afford.allowed) {
    throw new Error(
      afford.reason ||
        `السيولة النقدية لا تكفي لإصلاح المركبة (${formatEGP(costPiastres)}) — لا يُسمح بالاستدانة أو الرصيد السالب.`
    );
  }

  const refKey = `VEH-REPAIR-${vehicleId}-D${state.company.currentDay}-${state.ledger.length + 1}`;
  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: costPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: refKey,
    description: `إصلاح أعطال وصيانة شاملة للمركبة (${veh.name})`,
  });

  nextState = {
    ...nextState,
    vehicles: nextState.vehicles.map((v, i) =>
      i === vehIdx
        ? {
            ...v,
            status: 'AVAILABLE' as const,
            maintenanceHealth: 95,
          }
        : v
    ),
    discoveredEvents: nextState.discoveredEvents.filter(
      (ev) => ev !== 'MOTO_QUICK_FIX_RISK'
    ),
  };

  nextState = pushNotification(nextState, {
    dedupeKey: refKey,
    title: `إصلاح وتشغيل المركبة: ${veh.name}`,
    message: `تم إصلاح أعطال المركبة (${veh.name}) بتكلفة ${formatEGP(costPiastres)} وعادت للخدمة بكفاءة فنية 95%.`,
    department: 'DISPATCH_COURIERS',
    outcomeLabel: 'جاهزة للتشغيل (95%)',
    severity: 'SUCCESS',
  });

  return nextState;
}

