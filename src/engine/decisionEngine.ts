import {
  DecisionConditionCheck,
  DecisionOption,
  GameState,
  StorySituation,
} from '../types/game';
import {
  canAffordImmediatePayment,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import {
  acceptShipmentRequest,
  getAvailableOperationalCapacity,
  rejectShipmentRequest,
} from './shipmentEngine';

/**
 * Evaluates whether a decision option can currently be executed.
 * Pure function used both for UI display and for pre-execution re-validation.
 */
export function evaluateDecisionConditions(
  state: GameState,
  situation: StorySituation,
  option: DecisionOption
): DecisionConditionCheck {
  // 1. Check if this decision or situation was already resolved
  if (situation.resolved || state.executedDecisionIds.includes(option.id)) {
    return {
      allowed: false,
      reasonIfDenied: 'تم اتخاذ هذا القرار مسبقاً ولا يمكن تكراره.',
    };
  }

  // 2. Check immediate cash requirement if any
  if (option.requiredCashPiastres && option.requiredCashPiastres > 0) {
    const cashCheck = canAffordImmediatePayment(state, option.requiredCashPiastres);
    if (!cashCheck.allowed) {
      return {
        allowed: false,
        reasonIfDenied: cashCheck.reason,
      };
    }
  }

  // 3. Check operational capacity if required
  if (option.requiresOperationalCapacity) {
    const capCheck = getAvailableOperationalCapacity(state);
    if (!capCheck.hasCapacity) {
      return {
        allowed: false,
        reasonIfDenied: capCheck.reason,
      };
    }
  }

  // 4. Check minimum client trust if required (e.g., for price negotiation)
  if (option.requiresMinTrust) {
    const client = state.clients.find((c) => c.id === option.requiresMinTrust?.clientId);
    if (!client || client.trustLevel < option.requiresMinTrust.minTrust) {
      return {
        allowed: false,
        reasonIfDenied: `مستوى ثقة العميل الحالي (${client?.trustLevel ?? 0}%) أقل من الحد المطلوب للتفاوض (${option.requiresMinTrust.minTrust}%).`,
      };
    }
  }

  // 5. Specific checks for shipment acceptance
  if (
    (option.effectType === 'ACCEPT_SHIPMENT' ||
      option.effectType === 'NEGOTIATE_SHIPMENT') &&
    option.targetShipmentId
  ) {
    const sh = state.shipments.find((s) => s.trackingNumber === option.targetShipmentId);
    if (!sh) {
      return { allowed: false, reasonIfDenied: 'الشحنة المرتبطة غير موجودة.' };
    }
    if (sh.status !== 'NEW_REQUEST') {
      return {
        allowed: false,
        reasonIfDenied: 'تم البت في طلب هذه الشحنة بالفعل.',
      };
    }
    const fuelCheck = canAffordImmediatePayment(
      state,
      sh.estimatedOperatingCostPiastres
    );
    if (!fuelCheck.allowed) {
      return {
        allowed: false,
        reasonIfDenied: `السيولة لا تكفي لتغطية تكلفة تشغيل الشحنة (${formatEGP(sh.estimatedOperatingCostPiastres)}).`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Executes a decision option atomically after re-verifying all conditions.
 * Prevents duplicate clicks or invalid state mutations.
 */
export function executeDecisionOption(
  state: GameState,
  situationId: string,
  optionId: string
): GameState {
  const situationIndex = state.situations.findIndex((s) => s.id === situationId);
  if (situationIndex === -1) {
    throw new Error('الموقف الإداري غير موجود.');
  }

  const situation = state.situations[situationIndex];
  const option = situation.options.find((o) => o.id === optionId);
  if (!option) {
    throw new Error('خيار القرار غير موجود.');
  }

  // Re-validate conditions strictly before execution
  const check = evaluateDecisionConditions(state, situation, option);
  if (!check.allowed) {
    throw new Error(check.reasonIfDenied || 'لا تتحقق شروط تنفيذ هذا القرار.');
  }

  let nextState: GameState = {
    ...state,
    executedDecisionIds: [...state.executedDecisionIds, option.id],
  };

  let outcomeSummary = '';

  switch (option.effectType) {
    case 'ACKNOWLEDGE_BRIEFING': {
      outcomeSummary =
        'تمت مراجعة الموقف المالي والتشغيلي للشركة واعتماد خطة عمل اليوم.';
      nextState = {
        ...nextState,
        completedTaskIds: [...nextState.completedTaskIds, `TASK-${situation.id}`],
      };
      break;
    }

    case 'ACCEPT_SHIPMENT': {
      if (!option.targetShipmentId) {
        throw new Error('لا يوجد رقم تتبع مرتبط بهذا القرار.');
      }
      nextState = acceptShipmentRequest(nextState, option.targetShipmentId);
      const sh = nextState.shipments.find(
        (s) => s.trackingNumber === option.targetShipmentId
      )!;
      outcomeSummary = `تم قبول الشحنة ${sh.trackingNumber} لصالح (${sh.clientName}) بسعر خدمة ${formatEGP(sh.serviceFeePiastres)}. يمكنك الآن تجهيزها وإرسالها للتسليم من لوحة الشحنات.`;
      break;
    }

    case 'NEGOTIATE_SHIPMENT': {
      if (!option.targetShipmentId || !option.customAmountPiastres) {
        throw new Error('بيانات التفاوض على الشحنة غير مكتملة.');
      }
      nextState = acceptShipmentRequest(
        nextState,
        option.targetShipmentId,
        option.customAmountPiastres
      );
      // Slight trust trade-off for raising price, but accepted because client trust met threshold
      const sh = nextState.shipments.find(
        (s) => s.trackingNumber === option.targetShipmentId
      )!;
      nextState = {
        ...nextState,
        clients: nextState.clients.map((c) =>
          c.id === sh.clientId
            ? {
                ...c,
                trustLevel: Math.max(0, c.trustLevel - 3),
                history: [
                  ...c.history,
                  {
                    id: `HIST-${nextState.company.currentDay}-${c.history.length + 1}`,
                    day: nextState.company.currentDay,
                    summary: `تفاوض على رفع سعر الشحنة ${sh.trackingNumber} إلى ${formatEGP(option.customAmountPiastres!)}`,
                    trustDelta: -3,
                  },
                ],
              }
            : c
        ),
      };
      outcomeSummary = `وافق العميل بعد التفاوض على رفع سعر شحن البوليصة ${sh.trackingNumber} إلى ${formatEGP(option.customAmountPiastres)} بشرط الالتزام بموعد التسليم اليوم.`;
      break;
    }

    case 'REJECT_SHIPMENT': {
      if (!option.targetShipmentId) {
        throw new Error('لا يوجد رقم تتبع مرتبط بهذا القرار.');
      }
      nextState = rejectShipmentRequest(
        nextState,
        option.targetShipmentId,
        'اعتذار الإدارة عن قبول الطلب لعدم مناسبة الشروط أو السعة.'
      );
      outcomeSummary = `تم الاعتذار عن الشحنة ${option.targetShipmentId}. لم يتم تسجيل أي إيرادات أو تكاليف تشغيل لها، وتأثرت ثقة العميل سلباً.`;
      break;
    }

    case 'PAY_LIABILITY_FULL': {
      const amount = option.requiredCashPiastres || 0;
      nextState = recordLedgerTransaction(nextState, {
        type: 'LIABILITY_PAYMENT',
        amountPiastres: amount,
        debitAccount: 'LIABILITIES_PAYABLE',
        creditAccount: 'CASH',
        referenceId: `DEBT-DAY-${nextState.company.currentDay}`,
        description: `سداد كامل التزام متأخر (${situation.title})`,
      });
      nextState = {
        ...nextState,
        company: {
          ...nextState.company,
          reputation: Math.min(100, nextState.company.reputation + 5),
        },
        discoveredEvents: [...nextState.discoveredEvents, 'SETTLED_GARAGE_DEBT_FULL'],
      };
      outcomeSummary = `تم سداد الالتزام المالي بالكامل (${formatEGP(amount)}) نقداً من الخزينة، مما رفع سمعة الشركة والتزامها المالي.`;
      break;
    }

    case 'PAY_LIABILITY_PARTIAL': {
      const amount = option.requiredCashPiastres || 0;
      nextState = recordLedgerTransaction(nextState, {
        type: 'LIABILITY_PAYMENT',
        amountPiastres: amount,
        debitAccount: 'LIABILITIES_PAYABLE',
        creditAccount: 'CASH',
        referenceId: `DEBT-PART-DAY-${nextState.company.currentDay}`,
        description: `سداد دفعة جزئية من التزام مستحق (${situation.title})`,
      });
      nextState = {
        ...nextState,
        discoveredEvents: [...nextState.discoveredEvents, 'DEFERRED_GARAGE_DEBT'],
      };
      outcomeSummary = `تم سداد دفعة جزئية (${formatEGP(amount)}) نقداً وتأجيل باقي المديونية في حساب الالتزامات المستحقة.`;
      break;
    }

    case 'VEHICLE_FULL_MAINTENANCE': {
      const cost = option.requiredCashPiastres || 0;
      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: cost,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: option.targetVehicleId || 'VEH-MAINT',
        description: `صيانة شاملة وتغيير طقم دبرياج وزيت للمركبة ${option.targetVehicleId || ''}`,
      });
      nextState = {
        ...nextState,
        vehicles: nextState.vehicles.map((v) =>
          v.id === option.targetVehicleId
            ? { ...v, maintenanceHealth: 95, status: 'AVAILABLE' }
            : v
        ),
        discoveredEvents: [...nextState.discoveredEvents, 'MOTO_FULL_MAINT_DONE'],
      };
      outcomeSummary = `تم إجراء صيانة شاملة للمركبة بتكلفة ${formatEGP(cost)}، وارتفعت كفاءتها الفنية إلى 95% لضمان عدم تعطل الشحنات.`;
      break;
    }

    case 'VEHICLE_QUICK_FIX': {
      const cost = option.requiredCashPiastres || 0;
      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: cost,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: option.targetVehicleId || 'VEH-QUICK',
        description: `إصلاح مؤقت سريع للمركبة ${option.targetVehicleId || ''}`,
      });
      nextState = {
        ...nextState,
        vehicles: nextState.vehicles.map((v) =>
          v.id === option.targetVehicleId
            ? { ...v, maintenanceHealth: Math.max(40, v.maintenanceHealth - 10) }
            : v
        ),
        discoveredEvents: [...nextState.discoveredEvents, 'MOTO_QUICK_FIX_RISK'],
      };
      outcomeSummary = `تم إجراء إصلاح مؤقت بتكلفة ${formatEGP(cost)} لتوفير السيولة، لكن كفاءة المركبة لا تزال منخفضة وقد تواجه تأخيراً في الخطوط البعيدة.`;
      break;
    }

    case 'BUY_NEW_MOTORCYCLE': {
      const cost = option.requiredCashPiastres || 0;
      nextState = recordLedgerTransaction(nextState, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: cost,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: 'ASSET-MOTO-NEW',
        description: 'شراء تروسيكل/موتوسيكل شحن إضافي لتوسيع الأسطول',
      });
      outcomeSummary = `تم شراء مركبة جديدة بتكلفة ${formatEGP(cost)} وإضافتها لأسطول الشركة.`;
      break;
    }

    case 'SETTLE_MERCHANT_COD': {
      if (!option.targetClientId || !option.requiredCashPiastres) {
        throw new Error('بيانات توريد تحصيل التاجر غير مكتملة.');
      }
      const amount = option.requiredCashPiastres;
      const client = nextState.clients.find((c) => c.id === option.targetClientId);
      nextState = recordLedgerTransaction(nextState, {
        type: 'COD_SETTLED',
        amountPiastres: amount,
        debitAccount: 'MERCHANT_COD_PAYABLE',
        creditAccount: 'CASH',
        referenceId: `COD-SETTLE-${option.targetClientId}`,
        description: `توريد وسداد أمانات التحصيل (COD) للتاجر ${client?.name || ''}`,
      });
      nextState = {
        ...nextState,
        clients: nextState.clients.map((c) =>
          c.id === option.targetClientId
            ? {
                ...c,
                merchantCodBalancePiastres: Math.max(
                  0,
                  c.merchantCodBalancePiastres - amount
                ),
                trustLevel: Math.min(100, c.trustLevel + 8),
                history: [
                  ...c.history,
                  {
                    id: `HIST-${nextState.company.currentDay}-${c.history.length + 1}`,
                    day: nextState.company.currentDay,
                    summary: `توريد مبلغ التحصيل (COD) في موعده بقيمة ${formatEGP(amount)}`,
                    trustDelta: +8,
                  },
                ],
              }
            : c
        ),
        company: {
          ...nextState.company,
          reputation: Math.min(100, nextState.company.reputation + 4),
        },
      };
      outcomeSummary = `تم تسليم أمانات التحصيل (${formatEGP(amount)}) للتاجر ${client?.name}، وانخفض التزام أمانات التجار وزادت ثقة العميل.`;
      break;
    }

    case 'COLLECT_CLIENT_RECEIVABLE': {
      if (!option.targetClientId || !option.customAmountPiastres) {
        throw new Error('بيانات تحصيل المديونية غير مكتملة.');
      }
      const amount = option.customAmountPiastres;
      const client = nextState.clients.find((c) => c.id === option.targetClientId);
      nextState = recordLedgerTransaction(nextState, {
        type: 'CASH_COLLECTION',
        amountPiastres: amount,
        debitAccount: 'CASH',
        creditAccount: 'ACCOUNTS_RECEIVABLE',
        referenceId: `REC-COLL-${option.targetClientId}-D${nextState.company.currentDay}`,
        description: `تحصيل نقدي لمستحقات آجلة من العميل ${client?.name || ''}`,
      });
      nextState = {
        ...nextState,
        clients: nextState.clients.map((c) =>
          c.id === option.targetClientId
            ? {
                ...c,
                receivableBalancePiastres: Math.max(
                  0,
                  c.receivableBalancePiastres - amount
                ),
                history: [
                  ...c.history,
                  {
                    id: `HIST-${nextState.company.currentDay}-${c.history.length + 1}`,
                    day: nextState.company.currentDay,
                    summary: `سداد مستحقات آجلة بقيمة ${formatEGP(amount)}`,
                    trustDelta: +3,
                  },
                ],
              }
            : c
        ),
      };
      outcomeSummary = `تم تحصيل ${formatEGP(amount)} نقداً من مستحقات العميل ${client?.name} وإيداعها في الخزينة.`;
      break;
    }
  }

  const updatedSituation: StorySituation = {
    ...situation,
    resolved: true,
    chosenOptionId: option.id,
    outcomeSummary,
  };

  const nextSituations = [...nextState.situations];
  nextSituations[situationIndex] = updatedSituation;

  return {
    ...nextState,
    situations: nextSituations,
  };
}
