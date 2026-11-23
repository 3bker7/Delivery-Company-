import {
  DeliveryAttemptResult,
  GameState,
  Shipment,
} from '../types/game';
import { tickPlatformOrdersSimulation } from './businessDeveloperEngine';
import { formatClockTime } from './financeEngine';
import { recalculateAllEmployeesPerformance } from './hrEngine';
import {
  runDailyIngobiaEvaluationIfDue,
  runFiveHourHerfokPulseIfDue,
} from './herfokAndEvaluationEngine';
import {
  checkAndApplyCompanyLevelUpgrade,
  recordSyncMilestone,
} from './levelAndTimeEngine';
import { pushNotification } from './notificationEngine';
import { poachExpiredOrderByCompetitor } from './pricingAndMarketEngine';
import {
  appendCustodyEvent,
  completeShipmentDelivery,
  dispatchShipmentInTransit,
  failShipmentDelivery,
  prepareShipmentForPickup,
} from './shipmentEngine';
import { recordSocialPostForShipmentEvent } from './socialMediaEngine';
import {
  evaluateOnboardingMasteryProgress,
  runEightHourObligationReminderIfDue,
  syncManagerGuideTasksWithRealState,
} from './guideAndSecretaryEngine';
import { evaluateAndGenerateEmployeeVoiceByConditions } from './myEmployeesAppEngine';

/**
 * Deterministic helper to evaluate delivery outcome based on courier efficiency,
 * vehicle maintenance health, client trust, and attempt number.
 */
function determineDeliveryAttemptOutcome(
  state: GameState,
  shipment: Shipment
): { success: boolean; result: DeliveryAttemptResult; reason?: string } {
  if (shipment.attemptCount >= 1 || shipment.priority === 'HIGH') {
    return { success: true, result: 'DELIVERED_SUCCESS' };
  }

  const courier = state.couriers.find((c) => c.id === shipment.assignedCourierId);
  const vehicle = state.vehicles.find((v) => v.id === shipment.assignedVehicleId);

  if (
    state.discoveredEvents.includes('MOTO_QUICK_FIX_RISK') &&
    vehicle?.id === 'VEH-MOTO-1' &&
    shipment.attemptCount === 0
  ) {
    return {
      success: false,
      result: 'COURIER_DELAYED',
      reason:
        'تأخر المندوب بسبب ضعف سحب الدبرياج في مطلع الكوبري وإغلاق محل المستلم قبل الوصول',
    };
  }

  if (courier && courier.efficiency < 55 && shipment.attemptCount === 0) {
    return {
      success: false,
      result: 'CLIENT_ABSENT',
      reason: 'المستلم لم يتواجد في العنوان عند وصول المندوب ولم يرد على الهاتف',
    };
  }

  return { success: true, result: 'DELIVERED_SUCCESS' };
}

/**
 * Advances the central game clock by `deltaMinutes` and processes all due events
 * in strict chronological and priority order.
 */
export function advanceSimulationClock(
  state: GameState,
  deltaMinutes: number,
  forceAdvanceWhenPaused = false
): GameState {
  if (state.phase !== 'OFFICE_PLAY') {
    return state;
  }
  if (state.clock.isPaused && !forceAdvanceWhenPaused) {
    return state;
  }
  if (deltaMinutes <= 0) {
    return state;
  }

  let current = { ...state };
  let remaining = deltaMinutes;

  while (remaining > 0) {
    const step = Math.min(5, remaining);
    remaining -= step;

    const rawNextMinutes = current.clock.minutesFromMidnight + step;
    const crossedMidnight = rawNextMinutes >= 1440;
    const nextMinutesFromMidnight = rawNextMinutes % 1440;
    const nextTotalElapsed = current.clock.totalElapsedMinutes + step;
    const nextDay = crossedMidnight
      ? current.company.currentDay + 1
      : current.company.currentDay;

    current = {
      ...current,
      clock: {
        ...current.clock,
        day: nextDay,
        minutesFromMidnight: nextMinutesFromMidnight,
        totalElapsedMinutes: nextTotalElapsed,
      },
      company: {
        ...current.company,
        currentDay: nextDay,
      },
    };

    if (crossedMidnight) {
      current = recordSyncMilestone(
        current,
        'NEW_DAY',
        `دخول اليوم ${nextDay} تلقائياً مع استمرار حركة العالم`
      );
    }

    current = runCentralOperationalAuditTick(current);
  }

  return recalculateAllEmployeesPerformance(current);
}

/**
 * Central Delivery, Warehouse, Marketing & Deadline State Detector.
 */
export function runCentralOperationalAuditTick(state: GameState): GameState {
  let nextState = { ...state };
  const nowTotal = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);

  // 1. Check employee training completion
  let employeesUpdated = false;
  const updatedEmployees = nextState.employees.map((emp) => {
    if (
      emp.status === 'IN_TRAINING' &&
      emp.trainingCompletesAtTotalMinutes !== undefined &&
      nowTotal >= emp.trainingCompletesAtTotalMinutes
    ) {
      employeesUpdated = true;
      return {
        ...emp,
        status: 'ACTIVE' as const,
        efficiency: Math.min(100, emp.efficiency + 10),
        errorRatePercent: Math.max(0, emp.errorRatePercent - 2),
        trainingCompletesAtTotalMinutes: undefined,
      };
    }
    return emp;
  });

  if (employeesUpdated) {
    nextState = {
      ...nextState,
      employees: updatedEmployees,
      couriers: nextState.couriers.map((c) => {
        const linkedEmp = updatedEmployees.find((e) => e.id === c.employeeId);
        return linkedEmp ? { ...c, efficiency: linkedEmp.efficiency } : c;
      }),
    };
  }

  // 2. Check NEW_REQUEST shipments whose acceptance deadline has expired (`acceptanceDeadlineTotalMinutes`)
  // Competitor shipping company poaches the order and player reputation drops logically
  for (let i = 0; i < nextState.shipments.length; i++) {
    const sh = nextState.shipments[i];
    if (
      sh.status === 'NEW_REQUEST' &&
      sh.acceptanceDeadlineTotalMinutes !== undefined &&
      nowTotal > sh.acceptanceDeadlineTotalMinutes
    ) {
      const expireKey = `EXPIRE-ACCEPT-${sh.trackingNumber}`;
      if (sh.processedEventKeys.includes(expireKey)) continue;

      nextState = poachExpiredOrderByCompetitor(nextState, i);
      const poachedSh = nextState.shipments[i];
      if (poachedSh) {
        nextState = recordSocialPostForShipmentEvent(
          nextState,
          poachedSh,
          'DEADLINE_EXPIRED',
          poachedSh.failureReason || 'انتهاء مهلة قبول واستلام الشحنة وسحبها لشركة منافسة'
        );
      }
    }
  }

  // 3. Check Marketing Deadline Tasks expiration
  if (nextState.marketing && nextState.marketing.deadlineTasks.length > 0) {
    let tasksChanged = false;
    const updatedTasks = nextState.marketing.deadlineTasks.map((task) => {
      if (task.status === 'ACTIVE' && nowTotal > task.deadlineTotalMinutes) {
        tasksChanged = true;
        return {
          ...task,
          status:
            task.completedShipmentsCount >= task.targetShipmentsCount
              ? ('COMPLETED' as const)
              : ('EXPIRED' as const),
        };
      }
      return task;
    });

    if (tasksChanged) {
      nextState = {
        ...nextState,
        marketing: {
          ...nextState.marketing,
          deadlineTasks: updatedTasks,
        },
      };
    }
  }

  // 4. Sort active shipments by priority (HIGH first) then by nextStepDueTotalMinutes
  const activeIndices = nextState.shipments
    .map((s, idx) => ({ s, idx }))
    .filter(
      ({ s }) =>
        s.status !== 'NEW_REQUEST' &&
        s.status !== 'REJECTED' &&
        s.status !== 'CANCELLED_EXPIRED' &&
        s.status !== 'DELIVERED' &&
        s.status !== 'RETURNED'
    )
    .sort((a, b) => {
      if (a.s.priority !== b.s.priority) {
        return a.s.priority === 'HIGH' ? -1 : 1;
      }
      return (
        (a.s.nextStepDueTotalMinutes ?? 999999) -
        (b.s.nextStepDueTotalMinutes ?? 999999)
      );
    });

  for (const { s: initialShipment } of activeIndices) {
    const shIdx = nextState.shipments.findIndex(
      (item) => item.trackingNumber === initialShipment.trackingNumber
    );
    if (shIdx === -1) continue;
    const sh = nextState.shipments[shIdx];

    // Check SLA Deadline Breach
    const slaEventKey = `SLA-DELAY-${sh.trackingNumber}-EXP-${sh.expectedDeliveryTotalMinutes}`;
    if (
      nowTotal > sh.expectedDeliveryTotalMinutes &&
      !sh.isDelayed &&
      !sh.processedEventKeys.includes(slaEventKey)
    ) {
      const delayReason =
        sh.delayReason ||
        (sh.status === 'READY_FOR_DISPATCH'
          ? 'انتظار توفر مندوب توصيل متاح'
          : sh.responsibleDepartment === 'WAREHOUSE'
            ? 'تراكم ضغط الفرز والتجهيز داخل المستودع'
            : 'ازدحام مروري في خط السير وتجاوز المهلة المتوقعة');

      const delayedShipment: Shipment = {
        ...sh,
        isDelayed: true,
        delayReason,
        requiresManagerIntervention: true,
        currentRemediationAction:
          sh.currentRemediationAction || 'تجاوز الموعد المتوقع — متاح لتدخل المدير',
        processedEventKeys: [...sh.processedEventKeys, slaEventKey],
        timeline: [
          ...sh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${sh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — تنبيه تجاوز الموعد المتوقع`,
            totalMinutes: nowTotal,
            status: sh.status,
            location: sh.operationalLocation,
            department: sh.responsibleDepartment,
            note: `تجاوزت الشحنة موعد التسليم المتوقع (${sh.expectedDeliveryTimeLabel}). السبب المسجل: ${delayReason}.`,
          },
        ],
      };

      const copyShipments = [...nextState.shipments];
      copyShipments[shIdx] = delayedShipment;
      nextState = { ...nextState, shipments: copyShipments };

      nextState = recordSocialPostForShipmentEvent(
        nextState,
        delayedShipment,
        'DELAYED_SLA',
        delayReason
      );

      nextState = pushNotification(nextState, {
        dedupeKey: slaEventKey,
        trackingNumber: sh.trackingNumber,
        title: `تأخر الشحنة ${sh.trackingNumber} عن الموعد`,
        message: `تجاوزت الشحنة ${sh.trackingNumber} (${sh.clientName}) الموعد المتوقع (${sh.expectedDeliveryTimeLabel}). السبب: ${delayReason}.`,
        department: sh.responsibleDepartment,
        outcomeLabel: 'متأخرة عن الموعد',
        actionRequiredLabel: 'افتح تفاصيل الشحنة للاستفسار أو التدخل الإداري',
        severity: 'WARNING',
      });
    }

    const currentSh = nextState.shipments[shIdx];
    if (
      currentSh.nextStepDueTotalMinutes === undefined ||
      nowTotal < currentSh.nextStepDueTotalMinutes
    ) {
      continue;
    }

    // Step A1: ASSIGNED_TO_WAREHOUSE / RECEIVED_AT_WAREHOUSE / WAITING_SORTING -> SORTING -> PREPARING_AT_WAREHOUSE
    if (
      currentSh.status === 'ASSIGNED_TO_WAREHOUSE' ||
      currentSh.status === 'RECEIVED_AT_WAREHOUSE' ||
      currentSh.status === 'WAITING_SORTING'
    ) {
      const eventKey = `WH-RCV-${currentSh.trackingNumber}`;
      if (currentSh.processedEventKeys.includes(eventKey)) continue;

      const warehouse = nextState.warehouses[0];
      const clerk = nextState.employees.find(
        (e) => e.role === 'WAREHOUSE_CLERK' && e.status !== 'TERMINATED'
      );
      const shelf = `رف B-${(shIdx + 1) * 12}`;

      const inWarehouseCount = nextState.shipments.filter(
        (x) =>
          x.status === 'RECEIVED_AT_WAREHOUSE' ||
          x.status === 'SORTING' ||
          x.status === 'PREPARING_AT_WAREHOUSE'
      ).length;
      const basePrepMinutes = clerk && clerk.status === 'ACTIVE' ? 25 : 40;
      const workloadPenalty = inWarehouseCount * 10;
      const prepDuration = basePrepMinutes + workloadPenalty;

      const updated: Shipment = {
        ...currentSh,
        status: 'PREPARING_AT_WAREHOUSE',
        operationalLocation: 'BEING_PREPARED',
        responsibleDepartment: 'WAREHOUSE',
        shelfLocation: shelf,
        assignedWarehouseStaffId: clerk?.id,
        lastStatusChangeTotalMinutes: nowTotal,
        lastUpdatedTimeLabel: timeLabel,
        nextStepDueTotalMinutes: nowTotal + prepDuration,
        processedEventKeys: [...currentSh.processedEventKeys, eventKey],
        custodyChain: appendCustodyEvent(currentSh, {
          stage: 'SORTED',
          actorEmployeeId: clerk?.id,
          actorName: clerk?.name || 'موظف المستودع',
          department: 'WAREHOUSE',
          day: nextState.company.currentDay,
          timeLabel,
          totalMinutes: nowTotal,
          conditionNote: `تم استلام الشحنة وفرزها في (${shelf}) وبدء التغليف والتجهيز`,
        }),
        timeline: [
          ...currentSh.timeline,
          {
            id: `EVT-${nextState.company.currentDay}-${currentSh.timeline.length + 1}`,
            day: nextState.company.currentDay,
            timestampLabel: `${timeLabel} — استلام بالمستودع وبدء الفرز والتجهيز`,
            totalMinutes: nowTotal,
            status: 'PREPARING_AT_WAREHOUSE',
            location: 'BEING_PREPARED',
            department: 'WAREHOUSE',
            actorName: clerk?.name || 'موظف المستودع',
            note: `تم استلام الشحنة بالمستودع وفحص رقم التتبع وتسكينها في (${shelf})، وجارٍ تجهيزها للخروج (مدة التجهيز المتوقعة ${prepDuration} دقيقة).`,
          },
        ],
      };

      const copy = [...nextState.shipments];
      copy[shIdx] = updated;

      const updatedWarehouses = warehouse
        ? nextState.warehouses.map((w, i) =>
            i === 0
              ? {
                  ...w,
                  logs: [
                    {
                      id: `WLOG-${nextState.company.currentDay}-${w.logs.length + 1}`,
                      day: nextState.company.currentDay,
                      timeLabel,
                      trackingNumber: currentSh.trackingNumber,
                      action: 'RECEIVED' as const,
                      staffName: clerk?.name || 'أحمد فرج',
                      shelfLocation: shelf,
                      note: `استلام وفرز الشحنة في ${shelf}`,
                    },
                    ...w.logs,
                  ],
                }
              : w
          )
        : nextState.warehouses;

      nextState = {
        ...nextState,
        shipments: copy,
        warehouses: updatedWarehouses,
      };

      nextState = pushNotification(nextState, {
        dedupeKey: eventKey,
        trackingNumber: currentSh.trackingNumber,
        title: `استلام الشحنة ${currentSh.trackingNumber} بالمستودع`,
        message: `تم استلام الشحنة ${currentSh.trackingNumber} بالمستودع في (${shelf}) وبدأ الموظف ${clerk?.name || 'أحمد فرج'} في فرزها وتجهيزها.`,
        department: 'WAREHOUSE',
        outcomeLabel: 'قيد الفرز والتجهيز بالمستودع',
        severity: 'INFO',
      });
      continue;
    }

    // Step B: SORTING / WAITING_PACKAGING / PREPARING_AT_WAREHOUSE -> READY_FOR_DISPATCH
    if (
      currentSh.status === 'SORTING' ||
      currentSh.status === 'WAITING_PACKAGING' ||
      currentSh.status === 'PREPARING_AT_WAREHOUSE'
    ) {
      const eventKey = `WH-PREP-${currentSh.trackingNumber}`;
      if (currentSh.processedEventKeys.includes(eventKey)) continue;

      nextState = prepareShipmentForPickup(nextState, currentSh.trackingNumber);
      const afterPrepIdx = nextState.shipments.findIndex(
        (x) => x.trackingNumber === currentSh.trackingNumber
      );
      if (afterPrepIdx !== -1) {
        const shAfter = nextState.shipments[afterPrepIdx];
        const copy = [...nextState.shipments];
        copy[afterPrepIdx] = {
          ...shAfter,
          processedEventKeys: [...shAfter.processedEventKeys, eventKey],
        };
        nextState = { ...nextState, shipments: copy };
      }

      nextState = pushNotification(nextState, {
        dedupeKey: eventKey,
        trackingNumber: currentSh.trackingNumber,
        title: `الشحنة ${currentSh.trackingNumber} جاهزة للخروج`,
        message: `اكتمل تجهيز الشحنة ${currentSh.trackingNumber} بالمستودع وأصبحت جاهزة للتسليم للمندوب.`,
        department: 'WAREHOUSE',
        outcomeLabel: 'جاهزة لاستلام المندوب',
        severity: 'INFO',
      });
      continue;
    }

    // Step C: READY_FOR_DISPATCH -> Assign to available Courier & Dispatch OUT_FOR_DELIVERY
    if (currentSh.status === 'READY_FOR_DISPATCH') {
      const availableCouriers = nextState.couriers.filter(
        (c) =>
          c.status !== 'UNAVAILABLE' &&
          c.currentLoad < c.maxLoad &&
          !c.needsCompanyVehicle &&
          Boolean(c.vehicleId || c.ownsPersonalMotorcycle)
      );

      if (availableCouriers.length === 0) {
        const noCourierKey = `NO-COURIER-${currentSh.trackingNumber}`;
        if (!currentSh.processedEventKeys.includes(noCourierKey)) {
          const updated: Shipment = {
            ...currentSh,
            isDelayed: true,
            delayReason:
              'عدم توفر مندوب متاح حالياً (جميع المناديب وصلوا للحد الأقصى للحمولة)',
            currentRemediationAction:
              'في قائمة الانتظار بالمستودع لحين عودة أقرب مندوب من خط السير',
            nextStepDueTotalMinutes: nowTotal + 20,
            processedEventKeys: [...currentSh.processedEventKeys, noCourierKey],
            timeline: [
              ...currentSh.timeline,
              {
                id: `EVT-${nextState.company.currentDay}-${currentSh.timeline.length + 1}`,
                day: nextState.company.currentDay,
                timestampLabel: `${timeLabel} — انتظار توفر مندوب`,
                totalMinutes: nowTotal,
                status: 'READY_FOR_DISPATCH',
                location: 'WAITING_FOR_COURIER',
                department: 'DISPATCH_COURIERS',
                note: 'الشحنة جاهزة للخروج لكنها في قائمة الانتظار لعدم توفر مندوب بحمولة شاغرة حالياً.',
              },
            ],
          };
          const copy = [...nextState.shipments];
          copy[shIdx] = updated;
          nextState = { ...nextState, shipments: copy };

          nextState = pushNotification(nextState, {
            dedupeKey: noCourierKey,
            trackingNumber: currentSh.trackingNumber,
            title: `انتظار مندوب للشحنة ${currentSh.trackingNumber}`,
            message: `الشحنة ${currentSh.trackingNumber} جاهزة بالمستودع ولكن لا يوجد مندوب متاح حالياً.`,
            department: 'DISPATCH_COURIERS',
            outcomeLabel: 'في قائمة الانتظار',
            actionRequiredLabel: 'ستخرج تلقائياً فور تفريغ حمولة أقرب مندوب',
            severity: 'WARNING',
          });
        } else {
          const copy = [...nextState.shipments];
          copy[shIdx] = {
            ...currentSh,
            nextStepDueTotalMinutes: nowTotal + 15,
          };
          nextState = { ...nextState, shipments: copy };
        }
        continue;
      }

      if (nextState.company.cashPiastres < currentSh.estimatedOperatingCostPiastres) {
        const noCashKey = `NO-CASH-DISPATCH-${currentSh.trackingNumber}`;
        if (!currentSh.processedEventKeys.includes(noCashKey)) {
          const copy = [...nextState.shipments];
          copy[shIdx] = {
            ...currentSh,
            isDelayed: true,
            delayReason: 'نقص السيولة النقدية اللازمة لمصروف خروج المندوب',
            requiresManagerIntervention: true,
            nextStepDueTotalMinutes: nowTotal + 30,
            processedEventKeys: [...currentSh.processedEventKeys, noCashKey],
          };
          nextState = { ...nextState, shipments: copy };
        }
        continue;
      }

      nextState = dispatchShipmentInTransit(nextState, currentSh.trackingNumber);
      continue;
    }

    // Step D: OUT_FOR_DELIVERY -> Attempt Delivery -> DELIVERED or DELIVERY_FAILED
    if (currentSh.status === 'OUT_FOR_DELIVERY') {
      const outcome = determineDeliveryAttemptOutcome(nextState, currentSh);
      if (outcome.success) {
        nextState = completeShipmentDelivery(nextState, currentSh.trackingNumber);
      } else {
        nextState = failShipmentDelivery(
          nextState,
          currentSh.trackingNumber,
          outcome.reason || 'تعذر التسليم في المحاولة الأولى',
          0,
          outcome.result
        );
      }
      continue;
    }
  }

  nextState = tickPlatformOrdersSimulation(nextState);
  nextState = runFiveHourHerfokPulseIfDue(nextState);
  nextState = runDailyIngobiaEvaluationIfDue(nextState);
  nextState = runEightHourObligationReminderIfDue(nextState);
  nextState = checkAndApplyCompanyLevelUpgrade(nextState);
  nextState = evaluateAndGenerateEmployeeVoiceByConditions(nextState);
  nextState = syncManagerGuideTasksWithRealState(nextState);
  nextState = evaluateOnboardingMasteryProgress(nextState);
  return nextState;
}

/**
 * Helper to trigger an unlocated shipment scenario in the warehouse (for testing & gameplay depth).
 */
export function flagShipmentUnlocatedInWarehouse(
  state: GameState,
  trackingNumber: string
): GameState {
  const idx = state.shipments.findIndex((s) => s.trackingNumber === trackingNumber);
  if (idx === -1) throw new Error(`الشحنة ${trackingNumber} غير موجودة.`);

  const sh = state.shipments[idx];
  const nowTotal = state.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  const updated: Shipment = {
    ...sh,
    status: 'UNLOCATED_IN_WAREHOUSE',
    operationalLocation: 'INSIDE_WAREHOUSE',
    responsibleDepartment: 'WAREHOUSE',
    isDelayed: true,
    requiresManagerIntervention: true,
    delayReason: 'تعذر العثور على الشحنة في الرف المسجل أثناء الفرز (وضعها موظف في رف فرعي بالخطأ)',
    currentRemediationAction: 'تم فتح إجراء بحث داخلي بالمستودع — بانتظار توجيه المدير لتكليف موظف بالجرد',
    lastStatusChangeTotalMinutes: nowTotal,
    lastUpdatedTimeLabel: timeLabel,
    nextStepDueTotalMinutes: undefined,
    timeline: [
      ...sh.timeline,
      {
        id: `EVT-${state.company.currentDay}-${sh.timeline.length + 1}`,
        day: state.company.currentDay,
        timestampLabel: `${timeLabel} — تعذر العثور على الشحنة بالمستودع`,
        totalMinutes: nowTotal,
        status: 'UNLOCATED_IN_WAREHOUSE',
        location: 'INSIDE_WAREHOUSE',
        department: 'WAREHOUSE',
        note: 'لم يعثر موظف التجهيز على الطرد في الرف المحدد. تم بدء إجراء بحث داخلي قبل اتخاذ أي قرار نهائي.',
      },
    ],
  };

  const copy = [...state.shipments];
  copy[idx] = updated;

  let nextState: GameState = {
    ...state,
    shipments: copy,
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `UNLOCATED-${trackingNumber}-${nowTotal}`,
    trackingNumber,
    title: `تعذر العثور على الشحنة ${trackingNumber} بالمستودع`,
    message: `لم يعثر موظف المستودع على الشحنة ${trackingNumber} في الرف المخصص. تم بدء إجراء بحث داخلي.`,
    department: 'WAREHOUSE',
    outcomeLabel: 'تعذر العثور عليها (قيد البحث)',
    actionRequiredLabel: 'كلف موظفاً بالبحث الداخلي من نافذة الشحنة',
    severity: 'URGENT',
  });

  return nextState;
}
