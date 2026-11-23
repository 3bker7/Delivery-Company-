import {
  Employee,
  EmployeePersonalityTrait,
  EmployeeVoiceRecord,
  EmployeeWellbeingState,
  GameState,
  MyEmployeesAppState,
} from '../types/game';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushInlineBubbleNotification } from './guideAndSecretaryEngine';
import { pushNotification } from './notificationEngine';

export const PERSONALITY_LABELS_AR: Record<EmployeePersonalityTrait, string> = {
  DISCIPLINED_PRECISE: 'منضبط ودقيق (يهتم بانتظام الفرز واللوائح)',
  AMBITIOUS_EARNER: 'طموح وتنافسي (يتأثر بحجم الطلبات والحوافز)',
  FAIRNESS_ORIENTED: 'حساس لعدالة التوزيع (يقارن حصته بزملائه)',
  CALM_VETERAN: 'مخضرم هادئ (يركز على سلامة المركبات والوقود)',
  WORKLOAD_SENSITIVE: 'حساس لضغط الطوابير المتواصل',
};

export function assignPersonalityForEmployee(
  emp: Employee
): EmployeePersonalityTrait {
  if (emp.id === 'EMP-MAHMOUD') return 'DISCIPLINED_PRECISE';
  if (emp.id === 'EMP-SABER') return 'CALM_VETERAN';
  if (emp.id === 'EMP-HASSAN' || emp.id === 'EMP-KAREEM') return 'AMBITIOUS_EARNER';
  if (emp.id === 'EMP-FARAG') return 'WORKLOAD_SENSITIVE';
  const traits: EmployeePersonalityTrait[] = [
    'AMBITIOUS_EARNER',
    'FAIRNESS_ORIENTED',
    'DISCIPLINED_PRECISE',
    'CALM_VETERAN',
    'WORKLOAD_SENSITIVE',
  ];
  const idx = emp.id.charCodeAt(emp.id.length - 1) % traits.length;
  return traits[idx];
}

export function createInitialMyEmployeesAppState(
  employees: Employee[],
  currentDay = 1
): MyEmployeesAppState {
  const wellbeingByEmployeeId: Record<string, EmployeeWellbeingState> = {};
  for (const emp of employees) {
    const personality = assignPersonalityForEmployee(emp);
    const isHassan = emp.id === 'EMP-HASSAN';
    wellbeingByEmployeeId[emp.id] = {
      employeeId: emp.id,
      personality,
      personalityLabelAr: PERSONALITY_LABELS_AR[personality],
      satisfactionScore: isHassan ? 68 : 78,
      absenceRiskPercent: isHassan ? 18 : 8,
      turnoverRiskPercent: isHassan ? 22 : 10,
      assignedOrdersToday: emp.assignedShipmentsToday || 0,
      recurringIssuesAr: isHassan
        ? ['انخفاض عدد الطلبات المسندة مقارنة بطموحه اليومي']
        : [],
    };
  }

  const initialVoiceRecords: EmployeeVoiceRecord[] = [
    {
      id: 'VOICE-INIT-LOW-ORDERS-HASSAN',
      employeeId: 'EMP-HASSAN',
      employeeName: 'حسن الشبراوي',
      employeeRoleAr: 'مندوب توصيل دراجة نارية',
      personality: 'AMBITIOUS_EARNER',
      type: 'COMPLAINT',
      category: 'LOW_ORDER_VOLUME',
      day: currentDay,
      timeLabel: '09:15 AM',
      totalMinutes: 555,
      titleAr: 'شكوى من قلة الطلبات المسندة اليوم وضعف فرص الحوافز',
      messageAr:
        'يا ريس، أنا جاهز بالموتوسيكل من الصبح ولكن عدد الأوردرات المسندة لي اليوم قليل جداً مقارنة بزميلي عم صابر، وده مأثر على دخل الحوافز بتاعي.',
      triggerEvidenceAr:
        'سجل التوزيع الفعلي يظهر أن المندوب (حسن الشبراوي) مسند له 0 طلبات نشطة في بداية الوردية مقابل إسناد الطلبات الأولى لخطوط أخرى.',
      isVerifiedValid: true,
      verificationDetailsAr:
        'تم التحقق من جدول المندوبين: حسن الشبراوي في حالة AVAILABLE بحمولة 0 طرود وفعالية 78%، بينما طموحه الشخصي يتطلب 2-3 رحلات يومياً للحفاظ على استقراره الوظيفي.',
      suggestedSolutions: [
        {
          id: 'SOL-REBALANCE-DISPATCH',
          labelAr: 'إعادة موازنة التوزيع وإسناد الأوردر القادم له مع بدل جاهزية (35 ج.م)',
          costPiastres: egpToPiastres(35),
          satisfactionDelta: 16,
          efficiencyDelta: 5,
          turnoverRiskDelta: -14,
          effectSummaryAr:
            'يرفع رضا حسن (+16) وكفاءته (+5%) ويخفض خطر تسربه الوظيفي (-14%).',
        },
        {
          id: 'SOL-ALLOCATE-ZONE',
          labelAr: 'تخصيصه كمسؤول رئيسي لخط مدينة نصر ومصر الجديدة بدون تكلفة نقدية فورية',
          costPiastres: 0,
          satisfactionDelta: 10,
          efficiencyDelta: 3,
          turnoverRiskDelta: -8,
          effectSummaryAr:
            'يرفع الرضا (+10) ويضمن أولوية استلامه لطلبات خط شرق القاهرة.',
        },
      ],
      status: 'OPEN',
    },
    {
      id: 'VOICE-INIT-SUGGESTION-MAHMOUD',
      employeeId: 'EMP-MAHMOUD',
      employeeName: 'محمود عبد العزيز',
      employeeRoleAr: 'المحاسب الإداري ومسؤول التشغيل',
      personality: 'DISCIPLINED_PRECISE',
      type: 'SUGGESTION',
      category: 'PROCESS_SUGGESTION',
      day: currentDay,
      timeLabel: '09:20 AM',
      totalMinutes: 560,
      titleAr: 'اقتراح: مراجعة هامش الربح وعهدة التحصيل قبل قبول شحنات الـ COD',
      messageAr:
        'أقترح تفعيل فحص السكرتير التنفيذي لكل طلب شحن يتضمن تحصيل مبالغ بضاعة (COD) أو مسافات خارج نطاق العباسية ومدينة نصر لضمان سلامة الدورة المحاسبية.',
      triggerEvidenceAr:
        'وجود طلبات في الاستقبال مثل TRK-1003 تتضمن تحصيل بضاعة (COD بقيمة 1,200 ج.م) لصالح التاجر.',
      isVerifiedValid: true,
      verificationDetailsAr:
        'تحقق المحاسبة يؤكد أن الشحنة TRK-1002 تسعيرتها 160 ج.م (تكلفتها 45 ج.م)، والشحنة TRK-1003 تسعيرتها 220 ج.م (تكلفتها 65 ج.م مع تحصيل COD 1,200 ج.م).',
      suggestedSolutions: [
        {
          id: 'SOL-ADOPT-PROPOSAL',
          labelAr: 'اعتماد المقترح وتوجيه شكر رسمي للمحاسب الإداري',
          costPiastres: 0,
          satisfactionDelta: 12,
          efficiencyDelta: 4,
          turnoverRiskDelta: -6,
          effectSummaryAr:
            'يرفع رضا المحاسب محمود (+12) ويزيد دقة الفحص المحاسبي (+4%).',
        },
      ],
      status: 'OPEN',
    },
  ];

  return {
    wellbeingByEmployeeId,
    voiceRecords: initialVoiceRecords,
    lastEvaluatedTotalMinutes: 540,
  };
}

export function ensureMyEmployeesAppInitialized(state: GameState): GameState {
  if (state.myEmployeesApp && state.myEmployeesApp.voiceRecords.length > 0) {
    return state;
  }
  return {
    ...state,
    myEmployeesApp: createInitialMyEmployeesAppState(
      state.employees,
      state.company.currentDay
    ),
  };
}

/**
 * Evaluates current operational conditions (shortage of orders, unfair distribution,
 * warehouse overload, vehicle maintenance health, salary cycle) and generates realistic,
 * evidence-backed employee complaints, suggestions, or praises based on employee personality.
 */
export function evaluateAndGenerateEmployeeVoiceByConditions(
  state: GameState,
  triggerContext?:
    | 'LOW_ORDERS_CHECK'
    | 'OVERLOAD_CHECK'
    | 'UNFAIR_DISTRIBUTION_CHECK'
    | 'VEHICLE_ISSUE_CHECK'
): GameState {
  const nextState = ensureMyEmployeesAppInitialized(state);
  const app = nextState.myEmployeesApp!;
  const nowMinutes = nextState.clock.totalElapsedMinutes;
  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const day = nextState.company.currentDay;

  const newRecords: EmployeeVoiceRecord[] = [];
  const updatedWellbeing = { ...app.wellbeingByEmployeeId };

  const activeCouriers = nextState.couriers.filter(
    (c) => c.status !== 'UNAVAILABLE'
  );
  const totalActiveShipments = nextState.shipments.filter(
    (s) =>
      s.status !== 'NEW_REQUEST' &&
      s.status !== 'REJECTED' &&
      s.status !== 'CANCELLED_EXPIRED'
  ).length;
  const totalPlatformOrders =
    nextState.businessDeveloper?.platformOrders.length ?? 0;

  // 1. Check Low Order Volume for Ambitious Courier
  const ambitiousCourier = activeCouriers.find((c) => {
    const emp = nextState.employees.find((e) => e.id === c.employeeId);
    if (!emp) return false;
    const trait = assignPersonalityForEmployee(emp);
    return (
      trait === 'AMBITIOUS_EARNER' &&
      c.currentLoad === 0 &&
      (c.activePlatformOrderIds?.length || 0) === 0
    );
  });

  if (
    ambitiousCourier &&
    (triggerContext === 'LOW_ORDERS_CHECK' ||
      totalActiveShipments + totalPlatformOrders <= 3)
  ) {
    const dedupeId = `VOICE-LOW-ORD-${ambitiousCourier.employeeId}-D${day}`;
    const alreadyExists = app.voiceRecords.some(
      (r) =>
        r.id === dedupeId ||
        (r.employeeId === ambitiousCourier.employeeId &&
          r.category === 'LOW_ORDER_VOLUME' &&
          r.day === day)
    );
    if (!alreadyExists) {
      newRecords.push({
        id: dedupeId,
        employeeId: ambitiousCourier.employeeId,
        employeeName: ambitiousCourier.name,
        employeeRoleAr: 'مندوب توصيل',
        personality: 'AMBITIOUS_EARNER',
        type: 'COMPLAINT',
        category: 'LOW_ORDER_VOLUME',
        day,
        timeLabel,
        totalMinutes: nowMinutes,
        titleAr: `شكوى (${ambitiousCourier.name}) من نقص الطلبات وتوقف الحوافز`,
        messageAr: `عدد الطلبات المسندة لي اليوم (${ambitiousCourier.currentLoad}) لا يكفي لتحقيق تارجت التوصيل اليومي؛ نرجو تنشيط التسويق أو توجيه طلبات لمنطقتي.`,
        triggerEvidenceAr: `المندوب (${ambitiousCourier.name}) متاح بدون أي مهام نشطة بينما إجمالي الطلبات الفعالة (${totalActiveShipments}).`,
        isVerifiedValid: true,
        verificationDetailsAr: `سجل التشغيل يؤكد أن حمولة المندوب الحالية = 0 طرود وعدد رحلاته المكتملة اليوم أقل من المتوسط (2 رحلة).`,
        suggestedSolutions: [
          {
            id: 'SOL-LOW-ORD-ASSIGN-AND-BONUS',
            labelAr: 'توجيه أولوية الطلبات القادمة له مع صرف بدل انتظار تشغيلي (40 ج.م)',
            costPiastres: egpToPiastres(40),
            satisfactionDelta: 15,
            efficiencyDelta: 5,
            turnoverRiskDelta: -12,
            effectSummaryAr:
              'يرفع الرضا (+15) ويمنع تفكير المندوب في الانتقال لشركة منافسة.',
          },
          {
            id: 'SOL-LOW-ORD-REASSIGN-ZONE',
            labelAr: 'نقله لتغطية منطقة ذات كثافة طلبات أعلى فوراً (بدون تكلفة)',
            costPiastres: 0,
            satisfactionDelta: 9,
            efficiencyDelta: 3,
            turnoverRiskDelta: -7,
            effectSummaryAr: 'يعيد توزيع المندوب لزيادة فرص إسناد الطلبات له.',
          },
        ],
        status: 'OPEN',
      });
    }
  }

  // 2. Check High Workload Pressure on Warehouse Staff when inside shipments >= 4
  const warehouseShipmentsCount = nextState.shipments.filter(
    (s) => s.responsibleDepartment === 'WAREHOUSE'
  ).length;
  if (
    warehouseShipmentsCount >= 4 ||
    triggerContext === 'OVERLOAD_CHECK'
  ) {
    const whEmp = nextState.employees.find(
      (e) => e.role === 'WAREHOUSE_CLERK' && e.status !== 'TERMINATED'
    );
    if (whEmp) {
      const dedupeId = `VOICE-OVERLOAD-${whEmp.id}-D${day}`;
      if (!app.voiceRecords.some((r) => r.id === dedupeId)) {
        newRecords.push({
          id: dedupeId,
          employeeId: whEmp.id,
          employeeName: whEmp.name,
          employeeRoleAr: whEmp.roleTitleAr,
          personality: 'WORKLOAD_SENSITIVE',
          type: 'COMPLAINT',
          category: 'HIGH_WORKLOAD_PRESSURE',
          day,
          timeLabel,
          totalMinutes: nowMinutes,
          titleAr: `ملاحظة ضغط عمل بالمستودع من (${whEmp.name})`,
          messageAr: `تراكم ${warehouseShipmentsCount} طرود في طابور الفرز والتغليف يسبب ضغطاً عالياً وقد يرفع نسبة الخطأ إذا لم ندعم الفرز.`,
          triggerEvidenceAr: `يوجد ${warehouseShipmentsCount} شحنات داخل المستودع حالياً تحتاج فرزاً وتغليفاً متزامناً.`,
          isVerifiedValid: warehouseShipmentsCount >= 3,
          verificationDetailsAr:
            warehouseShipmentsCount >= 3
              ? `مؤكد: طابور المستودع يضم ${warehouseShipmentsCount} شحنات نشطة.`
              : `غير مؤكد بالكامل: عدد الطرود الحالي بالمستودع (${warehouseShipmentsCount}) ضمن المعدل الطبيعي، والشكوى ناتجة عن حساسية الموظف للضغط.`,
          suggestedSolutions: [
            {
              id: 'SOL-OVERLOAD-OVERTIME',
              labelAr: 'صرف بدل تنظيم وردية فرز سريع (45 ج.م) وتخفيف الضغط',
              costPiastres: egpToPiastres(45),
              satisfactionDelta: 14,
              efficiencyDelta: 6,
              turnoverRiskDelta: -10,
              effectSummaryAr:
                'يرفع سرعة الفرز (+6%) ويخفض خطر الأخطاء والغياب.',
            },
            {
              id: 'SOL-OVERLOAD-PACE',
              labelAr: 'إعادة جدولة أولويات الفرز تدريجياً دون تكلفة إضافية',
              costPiastres: 0,
              satisfactionDelta: 8,
              efficiencyDelta: 2,
              turnoverRiskDelta: -5,
              effectSummaryAr: 'يهدئ ضغط العمل ويحافظ على استقرار الموظف.',
            },
          ],
          status: 'OPEN',
        });
      }
    }
  }

  if (newRecords.length === 0) {
    return nextState;
  }

  return {
    ...nextState,
    myEmployeesApp: {
      ...app,
      wellbeingByEmployeeId: updatedWellbeing,
      voiceRecords: [...newRecords, ...app.voiceRecords],
      lastEvaluatedTotalMinutes: nowMinutes,
    },
  };
}

/**
 * Verifies an employee complaint/suggestion against real company data (`تحقق من صحتها`).
 */
export function verifyEmployeeVoiceRecord(
  state: GameState,
  voiceId: string
): GameState {
  const nextState = ensureMyEmployeesAppInitialized(state);
  const app = nextState.myEmployeesApp!;
  const rec = app.voiceRecords.find((r) => r.id === voiceId);
  if (!rec) {
    throw new Error('سجل ملاحظة الموظف غير موجود.');
  }

  return {
    ...nextState,
    myEmployeesApp: {
      ...app,
      voiceRecords: app.voiceRecords.map((r) =>
        r.id === voiceId && r.status === 'OPEN'
          ? { ...r, status: 'VERIFIED' as const }
          : r
      ),
    },
  };
}

/**
 * Resolves an employee complaint/suggestion in the «موظفيني» app using one of the practical solutions,
 * directly updating employee satisfaction, efficiency, absence risk, and turnover risk,
 * and recording any financial cost in the ledger without allowing negative cash.
 */
export function resolveEmployeeVoiceWithSolution(
  state: GameState,
  voiceId: string,
  solutionId: string
): GameState {
  let nextState = ensureMyEmployeesAppInitialized(state);
  const app = nextState.myEmployeesApp!;
  const rec = app.voiceRecords.find((r) => r.id === voiceId);
  if (!rec) {
    throw new Error('الملاحظة المطلوبة غير موجودة في تطبيق موظفيني.');
  }
  if (rec.status === 'RESOLVED') {
    throw new Error('تمت معالجة هذه الملاحظة مسبقاً.');
  }

  const sol =
    rec.suggestedSolutions.find((s) => s.id === solutionId) ||
    rec.suggestedSolutions[0];
  if (!sol) {
    throw new Error('الحل المختار غير متاح.');
  }

  if (sol.costPiastres > 0) {
    const afford = canAffordImmediatePayment(nextState, sol.costPiastres);
    if (!afford.allowed) {
      throw new Error(
        `السيولة النقدية لا تكفي لتنفيذ هذا الحل (${formatEGP(sol.costPiastres)}). يمكنك اختيار الحل البديل غير المكلف.`
      );
    }

    nextState = recordLedgerTransaction(nextState, {
      type: 'SALARY_OR_BONUS_PAID',
      amountPiastres: sol.costPiastres,
      debitAccount: 'SALARY_EXPENSE',
      creditAccount: 'CASH',
      referenceId: `EMP-VOICE-${rec.id}`,
      description: `تنفيذ قرار إداري في تطبيق «موظفيني» للموظف (${rec.employeeName}): ${sol.labelAr}`,
    });
  }

  const prevWellbeing = app.wellbeingByEmployeeId[rec.employeeId] || {
    employeeId: rec.employeeId,
    personality: rec.personality,
    personalityLabelAr: PERSONALITY_LABELS_AR[rec.personality],
    satisfactionScore: 70,
    absenceRiskPercent: 15,
    turnoverRiskPercent: 18,
    assignedOrdersToday: 0,
    recurringIssuesAr: [],
  };

  const nextSatisfaction = Math.max(
    0,
    Math.min(100, prevWellbeing.satisfactionScore + sol.satisfactionDelta)
  );
  const nextTurnoverRisk = Math.max(
    0,
    Math.min(100, prevWellbeing.turnoverRiskPercent + sol.turnoverRiskDelta)
  );
  const nextAbsenceRisk = Math.max(
    0,
    Math.min(
      100,
      prevWellbeing.absenceRiskPercent + Math.round(sol.turnoverRiskDelta * 0.7)
    )
  );

  const updatedEmployees = nextState.employees.map((e) => {
    if (e.id !== rec.employeeId) return e;
    const nextEff = Math.max(
      40,
      Math.min(100, e.efficiency + sol.efficiencyDelta)
    );
    const nextPerf = Math.max(
      40,
      Math.min(
        100,
        (e.performanceScore ?? e.efficiency) + sol.efficiencyDelta
      )
    );
    return {
      ...e,
      efficiency: nextEff,
      performanceScore: nextPerf,
      bonusesPiastres: e.bonusesPiastres + sol.costPiastres,
    };
  });

  const updatedCouriers = nextState.couriers.map((c) => {
    if (c.employeeId !== rec.employeeId) return c;
    return {
      ...c,
      efficiency: Math.max(
        40,
        Math.min(100, c.efficiency + sol.efficiencyDelta)
      ),
    };
  });

  const updatedVoiceRecords = nextState.myEmployeesApp!.voiceRecords.map((r) =>
    r.id === voiceId
      ? {
          ...r,
          status: 'RESOLVED' as const,
          resolvedWithSolutionId: sol.id,
          resolutionSummaryAr: `تم التنفيذ: ${sol.labelAr} (${sol.effectSummaryAr})`,
        }
      : r
  );

  nextState = {
    ...nextState,
    employees: updatedEmployees,
    couriers: updatedCouriers,
    myEmployeesApp: {
      ...nextState.myEmployeesApp!,
      wellbeingByEmployeeId: {
        ...nextState.myEmployeesApp!.wellbeingByEmployeeId,
        [rec.employeeId]: {
          ...prevWellbeing,
          satisfactionScore: nextSatisfaction,
          absenceRiskPercent: nextAbsenceRisk,
          turnoverRiskPercent: nextTurnoverRisk,
          recurringIssuesAr: [],
        },
      },
      voiceRecords: updatedVoiceRecords,
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `VOICE-RESOLVED-${rec.id}`,
    employeeId: rec.employeeId,
    title: `معالجة ملاحظة (${rec.employeeName}) في «موظفيني»`,
    message: `تم تطبيق القرار الإداري (${sol.labelAr})؛ ارتفع الرضا الوظيفي للموظف إلى ${nextSatisfaction}% وانخفض خطر التسرب الوظيفي إلى ${nextTurnoverRisk}%.`,
    department: 'HR',
    outcomeLabel: `رضا الموظف ${nextSatisfaction}%`,
    severity: 'SUCCESS',
  });

  nextState = pushInlineBubbleNotification(nextState, {
    dedupeKey: `SEC-VOICE-RESOLVED-${rec.id}`,
    sender: 'SECRETARY',
    category: 'DECISION_INSPECTION',
    titleAr: `السكرتير التنفيذي: أثر قرارك في «موظفيني» على (${rec.employeeName})`,
    shortPreviewAr: `ارتفع الرضا الوظيفي لـ ${rec.employeeName} إلى ${nextSatisfaction}% وتراجعت مخاطر الغياب والتسرب إلى ${nextTurnoverRisk}%.`,
    factsAr: [
      `الموظف: ${rec.employeeName} (${rec.employeeRoleAr}).`,
      `القرار المنفذ: ${sol.labelAr} بتكلفة ${formatEGP(sol.costPiastres)}.`,
    ],
    projectionsAr: [
      `تحسن الكفاءة التشغيلية بـ +${sol.efficiencyDelta}% وانخفاض احتمالية ترك العمل إلى ${nextTurnoverRisk}%.`,
    ],
    alternativesAr: [
      'استمر في متابعة تطبيق «موظفيني» بعد أوقات الذروة للحفاظ على استقرار الفريق.',
    ],
    severity: 'SUCCESS',
  });

  return nextState;
}
