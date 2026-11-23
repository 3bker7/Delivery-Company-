import {
  Courier,
  Employee,
  EmployeeExperienceLevel,
  EmployeeRole,
  EmployeeSkillMetric,
  GameState,
  HRCandidate,
  HRJobAd,
} from '../types/game';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushNotification } from './notificationEngine';

export interface HRJobAdTemplate {
  role: EmployeeRole;
  roleTitleAr: string;
  minAdCostEgp: number;
  maxAdCostEgp: number;
  defaultAdCostEgp: number;
  descriptionAr: string;
}

export const HR_JOB_AD_TEMPLATES: HRJobAdTemplate[] = [
  {
    role: 'COURIER_MOTO',
    roleTitleAr: 'مندوب توصيل',
    minAdCostEgp: 50,
    maxAdCostEgp: 100,
    defaultAdCostEgp: 75,
    descriptionAr: 'نشر إعلان توظيف مناديب توصيل (مبتدئ / متوسط / خبير) لزيادة سرعة التوزيع.',
  },
  {
    role: 'WAREHOUSE_CLERK',
    roleTitleAr: 'عامل مستودع وفرز',
    minAdCostEgp: 60,
    maxAdCostEgp: 120,
    defaultAdCostEgp: 90,
    descriptionAr: 'نشر إعلان توظيف عمال فرز وتغليف لتسريع طابور المستودع وتقليل الأخطاء.',
  },
  {
    role: 'ADMIN_ACCOUNTANT',
    roleTitleAr: 'محاسب إداري',
    minAdCostEgp: 80,
    maxAdCostEgp: 150,
    defaultAdCostEgp: 115,
    descriptionAr: 'نشر إعلان توظيف محاسب إداري (كل محاسب يعالج حتى 8 طلبات شحن يومياً).',
  },
];

export const EXPERIENCE_LEVEL_LABELS_AR: Record<EmployeeExperienceLevel, string> = {
  BEGINNER: 'مبتدئ',
  INTERMEDIATE: 'متوسط الخبرة',
  EXPERT: 'خبير محترف',
};

/**
 * Generates role-specific skill metrics based on role and experience level.
 */
export function buildRoleSkillsForLevel(
  role: EmployeeRole,
  level: EmployeeExperienceLevel
): EmployeeSkillMetric[] {
  const base =
    level === 'EXPERT' ? 90 : level === 'INTERMEDIATE' ? 76 : 60;

  if (role === 'COURIER_MOTO' || role === 'COURIER_VAN') {
    return [
      { id: 'speed', labelAr: 'سرعة التوصيل', score: Math.min(98, base + 2) },
      { id: 'routes', labelAr: 'معرفة الطرق والمناطق', score: Math.min(98, base + 4) },
      { id: 'Punctuality', labelAr: 'الالتزام بالمواعيد', score: base },
      { id: 'care', labelAr: 'سلامة الشحنات أثناء النقل', score: Math.min(99, base + 3) },
      { id: 'client_comm', labelAr: 'التعامل مع العملاء عند التسليم', score: Math.max(50, base - 2) },
    ];
  }

  if (role === 'WAREHOUSE_CLERK') {
    return [
      { id: 'sorting', labelAr: 'سرعة الفرز والتجهيز', score: base + 2 },
      { id: 'organization', labelAr: 'دقة التنظيم داخل المستودع', score: base + 3 },
      { id: 'damage_reduction', labelAr: 'تقليل التلف والأخطاء', score: base + 1 },
      { id: 'packaging', labelAr: 'سرعة التغليف والتسليم للمندوب', score: base },
    ];
  }

  // ADMIN_ACCOUNTANT or OPERATIONS_SUPERVISOR
  return [
    { id: 'accuracy', labelAr: 'دقة الحسابات ومراجعة الفواتير', score: Math.min(99, base + 4) },
    { id: 'speed', labelAr: 'سرعة معالجة الطلبات (8 طلبات/يوم)', score: base + 2 },
    { id: 'loss_detection', labelAr: 'اكتشاف الخسائر ومخاطر التسعير', score: Math.min(98, base + 3) },
    { id: 'organization', labelAr: 'تنظيم السجلات والتقارير المالية', score: base + 1 },
  ];
}

/**
 * Calculates the total monthly payroll commitment across all active staff.
 */
export function calculateTotalMonthlyPayrollPiastres(state: GameState): number {
  return state.employees
    .filter((e) => e.status !== 'TERMINATED')
    .reduce((sum, emp) => sum + emp.baseMonthlySalaryPiastres, 0);
}

/**
 * Calculates total 8-day cycle salary commitment across all active staff.
 */
export function calculateEightDayPayrollCommitmentPiastres(state: GameState): number {
  return state.employees
    .filter((e) => e.status !== 'TERMINATED')
    .reduce(
      (sum, emp) => sum + Math.round((emp.baseMonthlySalaryPiastres / 30) * 8),
      0
    );
}

/**
 * Calculates an employee's net payable balance:
 * Accrued Salary - Approved Penalties - Paid Salary
 */
export function calculateEmployeeNetPayablePiastres(emp: Employee): number {
  return Math.max(
    0,
    emp.accruedSalaryPiastres -
      emp.approvedPenaltiesPiastres -
      emp.paidSalaryPiastres
  );
}

/**
 * Section 6: Evaluates a single employee's 0-100 performance score and positive/negative factors.
 * Never penalizes employees for systemic issues outside their control.
 */
export function evaluateEmployeePerformance(emp: Employee): {
  performanceScore: number;
  positiveFactors: string[];
  negativeFactors: string[];
  isLowPerformWarning: boolean;
} {
  if (emp.status === 'TERMINATED') {
    return {
      performanceScore: emp.performanceScore ?? 0,
      positiveFactors: emp.performancePositiveFactors || [],
      negativeFactors: emp.performanceNegativeFactors || ['تم إنهاء الخدمة رسمياً'],
      isLowPerformWarning: false,
    };
  }

  const positiveFactors: string[] = [];
  const negativeFactors: string[] = [];

  // Start from efficiency + completed tasks contribution
  let score = emp.efficiency;

  if (emp.completedTasksCount >= 4) {
    score += Math.min(10, Math.floor(emp.completedTasksCount * 1.5));
    positiveFactors.push(`إنجاز ${emp.completedTasksCount} مهام تشغيلية بنجاح وفي الوقت المحدد`);
  } else if (emp.completedTasksCount > 0) {
    positiveFactors.push(`المساهمة في تنفيذ ${emp.completedTasksCount} مهام ضمن دورة العمل`);
  }

  if (emp.errorRatePercent <= 3) {
    score += 3;
    positiveFactors.push(`انخفاض معدل الأخطاء التشغيلية (${emp.errorRatePercent}%)`);
  } else if (emp.errorRatePercent >= 8) {
    score -= (emp.errorRatePercent - 5) * 3;
    negativeFactors.push(`ارتفاع معدل الأخطاء أثناء التنفيذ (${emp.errorRatePercent}%)`);
  }

  if (emp.attributedDelaysCount > 0) {
    const delayPenalty = emp.attributedDelaysCount * 12;
    score -= delayPenalty;
    negativeFactors.push(
      `تسجيل ${emp.attributedDelaysCount} حالات تأخير أو تقصير مباشر منسوبة للموظف`
    );
  } else {
    positiveFactors.push('سجل خالٍ من التأخيرات الشخصية المباشرة');
  }

  if (emp.bonusesPiastres > 0) {
    score += 4;
    positiveFactors.push('حافز معنوي مرتفع بعد صرف مكافأة الأداء');
  }

  const clampedScore = Math.max(5, Math.min(100, Math.round(score)));
  if (clampedScore < 39) {
    negativeFactors.push('مؤشر الأداء الإجمالي أقل من الحد الأدنى المعتمد بالشركة (39%)');
  }

  return {
    performanceScore: clampedScore,
    positiveFactors,
    negativeFactors,
    isLowPerformWarning: clampedScore < 39,
  };
}

/**
 * Recalculates performance metrics across all employees.
 */
export function recalculateAllEmployeesPerformance(state: GameState): GameState {
  const updatedEmployees = state.employees.map((emp) => {
    const evalResult = evaluateEmployeePerformance(emp);
    return {
      ...emp,
      performanceScore: evalResult.performanceScore,
      performancePositiveFactors: evalResult.positiveFactors,
      performanceNegativeFactors: evalResult.negativeFactors,
      isLowPerformWarning: evalResult.isLowPerformWarning,
    };
  });

  return {
    ...state,
    employees: updatedEmployees,
  };
}

/**
 * Section 3: Publishes an HR Job Ad with an independent ad fee:
 * - COURIER_MOTO: 50 - 100 EGP
 * - WAREHOUSE_CLERK: 60 - 120 EGP
 * - ADMIN_ACCOUNTANT: 80 - 150 EGP
 * Deducts ad fee once from cash and generates 3 candidates (BEGINNER, INTERMEDIATE, EXPERT).
 */
export function postHRJobAd(
  state: GameState,
  role: EmployeeRole,
  customAdCostEgp?: number
): GameState {
  const template =
    HR_JOB_AD_TEMPLATES.find((t) => t.role === role) || HR_JOB_AD_TEMPLATES[0];

  const chosenAdCostEgp =
    customAdCostEgp !== undefined
      ? Math.max(
          template.minAdCostEgp,
          Math.min(template.maxAdCostEgp, Math.round(customAdCostEgp))
        )
      : template.defaultAdCostEgp;

  const adCostPiastres = egpToPiastres(chosenAdCostEgp);
  const afford = canAffordImmediatePayment(state, adCostPiastres);
  if (!afford.allowed) {
    throw new Error(
      afford.reason || 'السيولة النقدية لا تكفي لسداد رسوم نشر إعلان التوظيف.'
    );
  }

  const existingAdsCount = state.hrJobAds?.length || 0;
  const adId = `JOBAD-D${state.company.currentDay}-${existingAdsCount + 1}`;
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);

  let nextState = recordLedgerTransaction(state, {
    type: 'HR_JOB_AD_PAID',
    amountPiastres: adCostPiastres,
    debitAccount: 'HR_RECRUITMENT_EXPENSE',
    creditAccount: 'CASH',
    referenceId: adId,
    description: `رسوم نشر إعلان توظيف (${template.roleTitleAr}) لاستقطاب مرشحين جدد`,
  });

  const namePools: Record<string, [string, string, string]> = {
    COURIER_MOTO: ['كريم عبد التواب', 'مصطفى الدمنهوري', 'ياسر أبو سريع'],
    WAREHOUSE_CLERK: ['وليد السوهاجي', 'سامح القليوبي', 'عادل المنصوري'],
    ADMIN_ACCOUNTANT: ['نهى عبد الرحمن', 'طارق الدمرداش', 'الأستاذ حاتم الشاذلي'],
  };

  const names = namePools[role] || ['رامي فؤاد', 'شريف حمدي', 'خالد زكي'];

  const baseSalariesEgp: Record<EmployeeExperienceLevel, number> =
    role === 'ADMIN_ACCOUNTANT'
      ? { BEGINNER: 2700, INTERMEDIATE: 3450, EXPERT: 4200 }
      : role === 'WAREHOUSE_CLERK'
        ? { BEGINNER: 2400, INTERMEDIATE: 3000, EXPERT: 3750 }
        : { BEGINNER: 2550, INTERMEDIATE: 3150, EXPERT: 3900 };

  const levels: EmployeeExperienceLevel[] = ['BEGINNER', 'INTERMEDIATE', 'EXPERT'];

  const candidates: HRCandidate[] = levels.map((lvl, idx) => {
    const monthlyPiastres = egpToPiastres(baseSalariesEgp[lvl]);
    const cycleSalaryPiastres = Math.round((monthlyPiastres / 30) * 8);
    const expectedEfficiency =
      lvl === 'EXPERT' ? 91 : lvl === 'INTERMEDIATE' ? 80 : 66;
    const expectedErrorRate =
      lvl === 'EXPERT' ? 1 : lvl === 'INTERMEDIATE' ? 3 : 6;
    const dailyCap =
      role === 'ADMIN_ACCOUNTANT'
        ? 8
        : role === 'WAREHOUSE_CLERK'
          ? lvl === 'EXPERT'
            ? 12
            : 8
          : lvl === 'EXPERT'
            ? 4
            : 3;

    const isCourierRole = role === 'COURIER_MOTO' || role === 'COURIER_VAN';
    // Candidate 2 (INTERMEDIATE) owns a personal motorcycle; Candidate 1 (BEGINNER) and 3 (EXPERT) need a company vehicle
    const ownsPersonalMoto = isCourierRole ? lvl === 'INTERMEDIATE' : false;
    const needsCompanyVeh = isCourierRole ? !ownsPersonalMoto : false;

    const roleBadgeAr = isCourierRole
      ? ownsPersonalMoto
        ? ' — يمتلك مركبة شخصية جاهزة'
        : ' — بدون مركبة (يحتاج تخصيص مركبة من الشركة)'
      : role === 'WAREHOUSE_CLERK'
        ? lvl === 'EXPERT'
          ? ' — خبير فرز وتغليف آمن ومطابقة بوالص'
          : lvl === 'INTERMEDIATE'
            ? ' — منظم مخازن واستلام وتسليم عهدة'
            : ' — متدرب فرز وتجهيز طرود'
        : lvl === 'EXPERT'
          ? ' — محاسب تكاليف ومطابقة تحصيل COD'
          : lvl === 'INTERMEDIATE'
            ? ' — مراجع حسابات وبوالص شحن'
            : ' — مساعد إداري وتسجيل فواتير';

    const priorPerfAr = isCourierRole
      ? lvl === 'EXPERT'
        ? 'سجل ميداني ممتاز (98% تسليم في الموعد) مع منصات التوصيل السريع والتجارة الإلكترونية؛ يحتاج مركبة من أسطول الشركة.'
        : lvl === 'INTERMEDIATE'
          ? 'خبرة ميدانية منتظمة ويمتلك موتوسيكل شخصي مرخص وجاهز للعمل الفوري دون تحميل الشركة إيجار مركبة.'
          : 'مندوب مجتهد براتب اقتصادي ولكن لا يمتلك مركبة شخصية ويحتاج تخصيص موتوسيكل أو سيارة من أسطول الشركة.'
      : role === 'WAREHOUSE_CLERK'
        ? lvl === 'EXPERT'
          ? 'خبرة 5 سنوات في إدارة المستودعات والفرز السريع وتغليف الشحنات القابلة للكسر بنسبة تلف شبه منعدمة.'
          : lvl === 'INTERMEDIATE'
            ? 'سجل منتظم في استلام الطرود وفحص حالتها وترتيب أرفف المستودع وتسليم العهدة للمناديب بدقة.'
            : 'موظف مستودع مبتدئ براتب اقتصادي؛ يجيد الفرز الأساسي وتجهيز الكراتين ويحتاج متابعة في أوقات الذروة.'
        : lvl === 'EXPERT'
          ? 'خبرة قوية في تسعير الشحنات وحساب تكلفة الوقود والمندوب ومطابقة أمانات التجار (COD) بلا أخطاء.'
          : lvl === 'INTERMEDIATE'
            ? 'يجيد مراجعة طلبات الشحن وتقدير هامش الربح ومتابعة مواعيد العقود والالتزامات المالية.'
            : 'محاسب مبتدئ براتب اقتصادي؛ يساعد في تسجيل الفواتير ومراجعة الحسابات اليومية الأساسية.';

    const summaryTextAr = isCourierRole
      ? lvl === 'EXPERT'
        ? 'كفاءة توصيل قصوى ومعرفة دقيقة بمسارات القاهرة والجيزة وندرة في الشكاوى (يحتاج تخصيص مركبة من الأسطول).'
        : lvl === 'INTERMEDIATE'
          ? 'يمتلك موتوسيكل شخصي خاص به (يوفر على الشركة شراء أو استئجار مركبة) مع توازن ممتاز بين الراتب والسرعة.'
          : 'مندوب بدون مركبة شخصية براتب اقتصادي؛ يلزم توفير مركبة متاحة من أسطول الشركة لتنفيذ خطوط السير.'
      : role === 'WAREHOUSE_CLERK'
        ? lvl === 'EXPERT'
          ? 'يرفع سرعة تجهيز الشحنات داخل المستودع ويمنع تكدس الطرود أو تلف البضائع الحساسة قبل خروجها للتوصيل.'
          : lvl === 'INTERMEDIATE'
            ? 'توازن ممتاز بين الراتب وسرعة الفرز والتغليف وضبط محاضر الاستلام والتسليم داخل المخزن.'
            : 'خيار اقتصادي لتغطية نوبات العمل بالمستودع؛ مناسب للأحجام الصغيرة والمتوسطة من الطرود اليومية.'
        : lvl === 'EXPERT'
          ? 'يضمن دقة عالية في تحليل ربحية كل طلب قبل قبوله ويمنع التسرب المالي أو أخطاء تسوية الحسابات.'
          : lvl === 'INTERMEDIATE'
            ? 'كفاءة جيدة جداً في إعداد تقارير التكلفة ومتابعة الذمم والتحصيلات بتكلفة راتب متوازنة.'
            : 'مناسب للشركات الناشئة لتغطية المهام الإدارية والمحاسبية الأولية بأقل تكلفة رواتب ممكنة.';

    return {
      id: `${adId}-CAND-${idx + 1}`,
      jobAdId: adId,
      name: names[idx],
      role,
      roleTitleAr: `${template.roleTitleAr} (${EXPERIENCE_LEVEL_LABELS_AR[lvl]}${roleBadgeAr})`,
      experienceLevel: lvl,
      experienceLabelAr: EXPERIENCE_LEVEL_LABELS_AR[lvl],
      salaryPerCyclePiastres: cycleSalaryPiastres,
      baseMonthlySalaryPiastres: monthlyPiastres,
      expectedEfficiency,
      expectedErrorRatePercent: expectedErrorRate,
      dailyCapacity: dailyCap,
      ownsPersonalMotorcycle: ownsPersonalMoto,
      needsCompanyVehicle: needsCompanyVeh,
      orderAcceptanceRatePercent:
        lvl === 'EXPERT' ? 97 : lvl === 'INTERMEDIATE' ? 90 : 82,
      customerHandlingScore:
        lvl === 'EXPERT' ? 93 : lvl === 'INTERMEDIATE' ? 84 : 72,
      priorPerformanceSummaryAr: priorPerfAr,
      skills: buildRoleSkillsForLevel(role, lvl),
      summaryAr: summaryTextAr,
      hired: false,
    };
  });

  const newJobAd: HRJobAd = {
    id: adId,
    role,
    roleTitleAr: template.roleTitleAr,
    adCostPiastres,
    postedAtDay: nextState.company.currentDay,
    postedAtTimeLabel: timeLabel,
    status: 'OPEN',
    candidates,
  };

  nextState = {
    ...nextState,
    hrJobAds: [newJobAd, ...(nextState.hrJobAds || [])],
    executedDecisionIds: [...nextState.executedDecisionIds, adId],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: adId,
    title: `تم نشر إعلان توظيف: ${template.roleTitleAr}`,
    message:
      role === 'COURIER_MOTO' || role === 'COURIER_VAN'
        ? `تقدم 3 مرشحين (${names.join('، ')}) للوظيفة. قارن بين كفاءتهم ورواتبهم ومن يمتلك مركبة شخصية مقابل من يحتاج مركبة شركة.`
        : `تقدم 3 مرشحين (${names.join('، ')}) لوظيفة ${template.roleTitleAr}. قارن بين مهاراتهم التخصصية وسرعة إنجازهم ورواتبهم من قسم الموارد البشرية (HR).`,
    department: 'MANAGEMENT',
    outcomeLabel: `رسوم إعلان ${formatEGP(adCostPiastres)}`,
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Section 3: Hires a candidate from an active HR Job Ad.
 * Does NOT deduct salary upon hiring (salary is paid on the 8-day central payroll cycle).
 */
export function hireHRCandidate(
  state: GameState,
  jobAdId: string,
  candidateId: string
): GameState {
  const ads = state.hrJobAds || [];
  const adIdx = ads.findIndex((a) => a.id === jobAdId);
  if (adIdx === -1) {
    throw new Error('إعلان التوظيف غير موجود.');
  }

  const jobAd = ads[adIdx];
  const candIdx = jobAd.candidates.findIndex((c) => c.id === candidateId);
  if (candIdx === -1) {
    throw new Error('المرشح المطلوب غير موجود في قائمة المتقدمين.');
  }

  const candidate = jobAd.candidates[candIdx];
  if (candidate.hired) {
    throw new Error('تم تعيين هذا المرشح بالفعل.');
  }

  const newEmpId = `EMP-HIRED-${state.employees.length + 1}-D${state.company.currentDay}`;
  const dailyWage = Math.round(candidate.baseMonthlySalaryPiastres / 30);

  const newEmployee: Employee = {
    id: newEmpId,
    name: candidate.name,
    role: candidate.role,
    roleTitleAr: candidate.roleTitleAr,
    experienceLevel: candidate.experienceLevel,
    skills: candidate.skills,
    baseMonthlySalaryPiastres: candidate.baseMonthlySalaryPiastres,
    salaryDueDay: 8,
    salaryCycleDays: 8,
    dailyWagePiastres: dailyWage,
    status: 'ACTIVE',
    efficiency: candidate.expectedEfficiency,
    performanceScore: candidate.expectedEfficiency,
    performancePositiveFactors: [
      `تم التعيين بمستوى (${candidate.experienceLabelAr})`,
      'جاهز لاستلام المهام التشغيلية فوراً',
    ],
    performanceNegativeFactors: [],
    isLowPerformWarning: false,
    reviewCompleted: false,
    hiredAtDay: state.company.currentDay,
    completedTasksCount: 0,
    errorRatePercent: candidate.expectedErrorRatePercent,
    attributedDelaysCount: 0,
    bonusesPiastres: 0,
    approvedPenaltiesPiastres: 0,
    accruedSalaryPiastres: 0,
    paidSalaryPiastres: 0,
    dailyCapacity: candidate.dailyCapacity,
    assignedShipmentsToday: 0,
    penaltyHistory: [],
  };

  let nextCouriers = [...state.couriers];
  let nextWarehouses = [...state.warehouses];

  if (candidate.role === 'COURIER_MOTO' || candidate.role === 'COURIER_VAN') {
    const newCourierId = `COUR-HIRED-${nextCouriers.length + 1}`;
    const ownsPersonalMoto = Boolean(candidate.ownsPersonalMotorcycle);
    const needsCompanyVeh = candidate.needsCompanyVehicle ?? !ownsPersonalMoto;

    const newCourier: Courier = {
      id: newCourierId,
      employeeId: newEmpId,
      name: candidate.name,
      vehicleId: ownsPersonalMoto ? `VEH-PERSONAL-${newCourierId}` : '',
      ownsPersonalMotorcycle: ownsPersonalMoto,
      needsCompanyVehicle: needsCompanyVeh,
      status: 'AVAILABLE',
      zoneAr: 'القاهرة الكبرى والجيزة',
      coveredZones: [
        'الدقي',
        'المعادي',
        'مدينة نصر',
        'مصر الجديدة',
        'المهندسين',
        'الزمالك',
        'شبرا مصر',
        'وسط البلد',
        'التجمع الخامس',
      ],
      maxLoad: candidate.experienceLevel === 'EXPERT' ? 3 : 2,
      currentLoad: 0,
      maxWeightGrams: ownsPersonalMoto ? 12000 : 0,
      maxVolumeCm3: ownsPersonalMoto ? 81144 : 0,
      currentWeightGrams: 0,
      currentVolumeCm3: 0,
      assignedTrackingNumbers: [],
      activePlatformOrderIds: [],
      efficiency: candidate.expectedEfficiency,
      monthlySalaryPiastres: candidate.baseMonthlySalaryPiastres,
      tripOperatingCostPiastres: egpToPiastres(ownsPersonalMoto ? 18 : 35),
      successfulDeliveriesCount: 0,
      failedOrDelayedCount: 0,
      deliveryHistory: [],
    };
    nextCouriers = [...nextCouriers, newCourier];
  } else if (candidate.role === 'WAREHOUSE_CLERK') {
    nextWarehouses = nextWarehouses.map((w, i) =>
      i === 0
        ? {
            ...w,
            efficiencyLevel: Math.min(100, w.efficiencyLevel + 8),
          }
        : w
    );
  }

  const updatedCandidates = jobAd.candidates.map((c, i) =>
    i === candIdx ? { ...c, hired: true } : c
  );

  const updatedAds = [...ads];
  updatedAds[adIdx] = {
    ...jobAd,
    candidates: updatedCandidates,
  };

  let nextState: GameState = {
    ...state,
    employees: [...state.employees, newEmployee],
    couriers: nextCouriers,
    warehouses: nextWarehouses,
    hrJobAds: updatedAds,
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `HIRE-${newEmpId}`,
    title: `تعيين موظف جديد: ${candidate.name}`,
    message: `انضم ${candidate.name} (${candidate.roleTitleAr}) إلى فريق انجوبيا اكسبريس براتب دورة (كل 8 أيام) قدره ${formatEGP(candidate.salaryPerCyclePiastres)}.`,
    department: 'MANAGEMENT',
    outcomeLabel: 'إضافة للطاقة التشغيلية',
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * Section 3: Processes the 8-Day Central Payroll Cycle.
 * - Executes at most once on every 8th game day (Day 8, 16, 24...).
 * - Never double-deducts on reload.
 * - Handles partial liquidity cleanly without creating money from thin air.
 */
export function processEightDayPayrollCycle(
  state: GameState,
  targetDay?: number
): GameState {
  const day = targetDay ?? state.company.currentDay;
  if (day <= 0 || day % 8 !== 0) {
    return state;
  }

  const currentPayroll = state.payrollCycle || {
    cycleLengthDays: 8,
    lastPayrollPaidDay: 0,
    nextPayrollDueDay: 8,
    processedCycleDays: [],
    unpaidSalariesPiastres: 0,
  };

  // Strict guard against duplicate execution on reload
  if (currentPayroll.processedCycleDays.includes(day)) {
    return state;
  }

  let nextState = { ...state };
  const activeStaff = nextState.employees.filter((e) => e.status !== 'TERMINATED');

  // Calculate total due for this 8-day cycle (either accrued unpaid balance or 8 days wage)
  let totalDuePiastres = 0;
  const employeeDueMap = new Map<string, number>();

  for (const emp of activeStaff) {
    const netAccrued = calculateEmployeeNetPayablePiastres(emp);
    const eightDayWage = Math.round((emp.baseMonthlySalaryPiastres / 30) * 8);
    const due = netAccrued > 0 ? netAccrued : eightDayWage;
    employeeDueMap.set(emp.id, due);
    totalDuePiastres += due;
  }

  if (totalDuePiastres <= 0) {
    return {
      ...nextState,
      payrollCycle: {
        ...currentPayroll,
        lastPayrollPaidDay: day,
        nextPayrollDueDay: day + 8,
        processedCycleDays: [...currentPayroll.processedCycleDays, day],
      },
    };
  }

  const availableCash = nextState.company.cashPiastres;
  const amountPaidInCash = Math.min(availableCash, totalDuePiastres);
  const unpaidShortfall = Math.max(0, totalDuePiastres - amountPaidInCash);

  if (amountPaidInCash > 0) {
    // Check how much of totalDue was already accrued in ACCRUED_SALARIES_PAYABLE
    const totalAccruedOnBooks = activeStaff.reduce(
      (sum, e) => sum + calculateEmployeeNetPayablePiastres(e),
      0
    );

    if (totalAccruedOnBooks >= amountPaidInCash) {
      nextState = recordLedgerTransaction(nextState, {
        type: 'SALARY_OR_BONUS_PAID',
        amountPiastres: amountPaidInCash,
        debitAccount: 'ACCRUED_SALARIES_PAYABLE',
        creditAccount: 'CASH',
        referenceId: `PAYROLL-CYCLE-D${day}`,
        description: `صرف رواتب دورة الـ 8 أيام للموظفين (اليوم ${day})`,
      });
    } else {
      nextState = recordLedgerTransaction(nextState, {
        type: 'SALARY_OR_BONUS_PAID',
        amountPiastres: amountPaidInCash,
        debitAccount: 'SALARY_EXPENSE',
        creditAccount: 'CASH',
        referenceId: `PAYROLL-CYCLE-D${day}`,
        description: `صرف رواتب دورة الـ 8 أيام للموظفين (اليوم ${day})`,
      });
    }
  }

  let remainingCashPool = amountPaidInCash;
  const walkedOutNames: string[] = [];

  const updatedEmployees = nextState.employees.map((emp) => {
    if (emp.status === 'TERMINATED') return emp;
    const due = employeeDueMap.get(emp.id) || 0;

    if (unpaidShortfall === 0 || remainingCashPool >= due) {
      remainingCashPool = Math.max(0, remainingCashPool - due);
      return {
        ...emp,
        paidSalaryPiastres: emp.paidSalaryPiastres + due,
        accruedSalaryPiastres: Math.max(emp.accruedSalaryPiastres, due),
      };
    }

    // Employee salary could not be paid in full (no negative balance or debt allowed -> employee walks out)
    const partialPaid = Math.max(0, remainingCashPool);
    remainingCashPool = 0;
    walkedOutNames.push(emp.name);

    return {
      ...emp,
      paidSalaryPiastres: emp.paidSalaryPiastres + partialPaid,
      accruedSalaryPiastres: emp.paidSalaryPiastres + partialPaid,
      status: 'TERMINATED' as const,
      terminated: true,
      terminatedAtDay: day,
      terminationReason:
        'غادر الشركة لعدم توفر سيولة نقدية لصرف الراتب في موعده (نظام منع الديون والرصيد السالب)',
      performanceScore: Math.max(10, (emp.performanceScore ?? emp.efficiency) - 25),
    };
  });

  const updatedCouriers = nextState.couriers.map((c) => {
    const linkedEmp = updatedEmployees.find((e) => e.id === c.employeeId);
    if (linkedEmp?.status === 'TERMINATED') {
      return {
        ...c,
        status: 'UNAVAILABLE' as const,
        currentLoad: 0,
        assignedTrackingNumbers: [],
      };
    }
    return c;
  });

  nextState = {
    ...nextState,
    employees: updatedEmployees,
    couriers: updatedCouriers,
    company: {
      ...nextState.company,
      // Zero-debt rule: never add unpaid shortfall as negative cash or new company debt
      liabilitiesPiastres: Math.max(0, nextState.company.liabilitiesPiastres),
      reputation:
        unpaidShortfall > 0
          ? Math.max(0, nextState.company.reputation - 12)
          : nextState.company.reputation,
    },
    payrollCycle: {
      cycleLengthDays: 8,
      lastPayrollPaidDay: day,
      nextPayrollDueDay: day + 8,
      processedCycleDays: [...currentPayroll.processedCycleDays, day],
      unpaidSalariesPiastres: 0,
    },
    insolvencyCrisis:
      unpaidShortfall > 0
        ? {
            active: true,
            day,
            triggeredOnDay: day,
            reasonType: 'UNPAID_SALARIES_WALKOUT',
            titleAr: 'مغادرة موظفين وتوقف تشغيلي بسبب عجز السيولة عن صرف الرواتب',
            detailsAr: `لم تكفِ السيولة النقدية بالخزينة لسداد رواتب دورة اليوم ${day} بالكامل (عجز قدره ${formatEGP(unpaidShortfall)}). وبموجب نظام منع الديون والرصيد السالب، غادر (${walkedOutNames.join('، ') || 'فريق العمل'}) الشركة لعدم استلام رواتبهم. يمكنك الآن استعادة نقطة الحفظ لآخر 10 أيام سابقة لتصحيح مسار السيولة أو العودة لليوم الأول.`,
            descriptionAr: `لم تكفِ السيولة النقدية بالخزينة لسداد رواتب دورة اليوم ${day} بالكامل (عجز قدره ${formatEGP(unpaidShortfall)}). وبموجب نظام منع الديون والرصيد السالب، غادر (${walkedOutNames.join('، ') || 'فريق العمل'}) الشركة لعدم استلام رواتبهم. يمكنك الآن استعادة نقطة الحفظ لآخر 10 أيام سابقة لتصحيح مسار السيولة أو العودة لليوم الأول.`,
            affectedEmployeesCount: walkedOutNames.length,
            shortfallPiastres: unpaidShortfall,
            departedEmployeeNames: walkedOutNames,
            brokenEquipmentLabels: [],
          }
        : nextState.insolvencyCrisis,
  };

  if (unpaidShortfall > 0) {
    nextState = pushNotification(nextState, {
      dedupeKey: `PAYROLL-SHORTFALL-D${day}`,
      title: `أزمة رواتب ومغادرة موظفين في دورة اليوم ${day}`,
      message: `نفدت السيولة النقدية قبل سداد كامل الرواتب (${formatEGP(unpaidShortfall)} غير مغطاة). غادر (${walkedOutNames.join('، ')}) العمل لعدم السماح بالرصيد السالب أو الديون. يُوصى بالعودة لآخر 10 أيام سابقة أو اليوم الأول.`,
      department: 'MANAGEMENT',
      outcomeLabel: `مغادرة ${walkedOutNames.length} موظف`,
      severity: 'URGENT',
    });
  } else {
    nextState = pushNotification(nextState, {
      dedupeKey: `PAYROLL-PAID-D${day}`,
      title: `سداد رواتب دورة الـ 8 أيام بالكامل (اليوم ${day})`,
      message: `تم صرف إجمالي رواتب الدورة البالغة ${formatEGP(amountPaidInCash)} لجميع الموظفين في موعدها.`,
      department: 'MANAGEMENT',
      outcomeLabel: `سداد ${formatEGP(amountPaidInCash)}`,
      severity: 'SUCCESS',
    });
  }

  return recalculateAllEmployeesPerformance(nextState);
}

/**
 * Section 6: Reviews a low-performing employee (`performanceScore < 39`).
 * Must be executed BEFORE `terminateEmployeeAfterReview` can be called.
 */
export function reviewLowPerformingEmployee(
  state: GameState,
  employeeId: string
): GameState {
  const empIdx = state.employees.findIndex((e) => e.id === employeeId);
  if (empIdx === -1) throw new Error('الموظف غير موجود.');

  const emp = state.employees[empIdx];
  if (emp.status === 'TERMINATED') {
    throw new Error('تم إنهاء خدمة هذا الموظف مسبقاً.');
  }

  const evalResult = evaluateEmployeePerformance(emp);
  const currentScore = emp.performanceScore ?? evalResult.performanceScore;

  if (currentScore >= 39) {
    throw new Error(
      `لا يمكن فتح جلسة مراجعة تدنّي أداء حرجة لأن مؤشر أداء الموظف (${currentScore}%) أعلى من الحد الحرج (39%).`
    );
  }

  const reviewKey = `EMP-REVIEW-${emp.id}-D${state.company.currentDay}`;
  const updatedEmp: Employee = {
    ...emp,
    performanceScore: currentScore,
    isLowPerformWarning: true,
    reviewCompleted: true,
    performanceNegativeFactors: evalResult.negativeFactors,
  };

  const nextEmployees = [...state.employees];
  nextEmployees[empIdx] = updatedEmp;

  let nextState: GameState = {
    ...state,
    employees: nextEmployees,
    executedDecisionIds: state.executedDecisionIds.includes(reviewKey)
      ? state.executedDecisionIds
      : [...state.executedDecisionIds, reviewKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: reviewKey,
    title: `إتمام مراجعة الأداء الحرج للموظف ${emp.name}`,
    message: `تم توثيق جلسة مراجعة الأداء للموظف ${emp.name} (مؤشر الأداء ${currentScore}%). يمكنك الآن منحه فرصة للتدريب أو اتخاذ قرار إنهاء الخدمة.`,
    department: 'MANAGEMENT',
    outcomeLabel: 'اكتملت المراجعة الإدارية',
    severity: 'WARNING',
  });

  return nextState;
}

/**
 * Section 6: Terminates an employee whose performance is `< 39%` AFTER completing `reviewLowPerformingEmployee`.
 * Preserves historical records and ledger entries while removing active operational capacity.
 */
export function terminateEmployeeAfterReview(
  state: GameState,
  employeeId: string,
  reasonNote = 'تدني مستوى الأداء عن الحد الأدنى المعتمد (أقل من 39%) بعد المراجعة الرسمية'
): GameState {
  const empIdx = state.employees.findIndex((e) => e.id === employeeId);
  if (empIdx === -1) throw new Error('الموظف غير موجود.');

  const emp = state.employees[empIdx];
  if (emp.status === 'TERMINATED') {
    throw new Error('تم إنهاء خدمة هذا الموظف بالفعل.');
  }

  const evalResult = evaluateEmployeePerformance(emp);
  const currentScore = emp.performanceScore ?? evalResult.performanceScore;

  if (currentScore >= 39) {
    throw new Error(
      `لا يجوز إنهاء خدمة الموظف ${emp.name} لأن مؤشر أدائه (${currentScore}%) لم ينخفض تحت 39%.`
    );
  }

  if (!emp.reviewCompleted) {
    throw new Error(
      `يجب إجراء «مراجعة الموظف» أولاً لتوثيق أسباب تدني الأداء قبل تفعيل قرار «إنهاء الخدمة».`
    );
  }

  const termKey = `TERMINATE-${emp.id}-D${state.company.currentDay}`;
  const updatedEmp: Employee = {
    ...emp,
    status: 'TERMINATED',
    terminatedAtDay: state.company.currentDay,
    dailyCapacity: 0,
    assignedShipmentsToday: 0,
    performanceNegativeFactors: [
      ...(emp.performanceNegativeFactors || []),
      `تم إنهاء الخدمة في اليوم ${state.company.currentDay}: ${reasonNote}`,
    ],
  };

  const nextEmployees = [...state.employees];
  nextEmployees[empIdx] = updatedEmp;

  // Disable linked courier capacity without deleting history
  const nextCouriers = state.couriers.map((c) =>
    c.employeeId === emp.id
      ? {
          ...c,
          status: 'UNAVAILABLE' as const,
          maxLoad: 0,
          currentLoad: 0,
          assignedTrackingNumbers: [],
        }
      : c
  );

  let nextState: GameState = {
    ...state,
    employees: nextEmployees,
    couriers: nextCouriers,
    executedDecisionIds: [...state.executedDecisionIds, termKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: termKey,
    title: `إنهاء خدمة الموظف ${emp.name}`,
    message: `تم إنهاء خدمة ${emp.name} (${emp.roleTitleAr}) رسمياً مع الاحتفاظ بسجله السابق، وتحديث الطاقة التشغيلية للقسم.`,
    department: 'MANAGEMENT',
    outcomeLabel: 'تم إنهاء الخدمة',
    severity: 'WARNING',
  });

  return nextState;
}

/**
 * 1. Schedules a future salary raise starting from the next day.
 * Does NOT retroactively change past expenses or efficiency.
 */
export function scheduleEmployeeSalaryRaise(
  state: GameState,
  employeeId: string,
  raiseAmountPiastres: number
): GameState {
  if (raiseAmountPiastres <= 0) {
    throw new Error('قيمة الزيادة في الراتب يجب أن تكون أكبر من الصفر.');
  }

  const empIndex = state.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) throw new Error('الموظف غير موجود.');

  const emp = state.employees[empIndex];
  if (emp.status === 'TERMINATED') {
    throw new Error('لا يمكن تعديل راتب موظف منتهية خدمته.');
  }

  const raiseActionKey = `RAISE-${emp.id}-D${state.company.currentDay}`;
  if (state.executedDecisionIds.includes(raiseActionKey)) {
    throw new Error('تم اعتماد زيادة راتب لهذا الموظف اليوم بالفعل.');
  }

  const newMonthlySalary = emp.baseMonthlySalaryPiastres + raiseAmountPiastres;
  const effectiveDay = state.company.currentDay + 1;

  const updatedEmp: Employee = {
    ...emp,
    futureSalaryEffectiveDay: effectiveDay,
    futureMonthlySalaryPiastres: newMonthlySalary,
  };

  const nextEmployees = [...state.employees];
  nextEmployees[empIndex] = updatedEmp;

  const nextCouriers = state.couriers.map((c) =>
    c.employeeId === emp.id
      ? { ...c, monthlySalaryPiastres: newMonthlySalary }
      : c
  );

  let nextState: GameState = {
    ...state,
    employees: nextEmployees,
    couriers: nextCouriers,
    executedDecisionIds: [...state.executedDecisionIds, raiseActionKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: raiseActionKey,
    title: 'اعتماد زيادة راتب مستقبلية',
    message: `تم اعتماد زيادة راتب الموظف ${emp.name} ليصبح ${formatEGP(newMonthlySalary)} شهرياً ابتداءً من اليوم ${effectiveDay}.`,
    department: 'MANAGEMENT',
    outcomeLabel: `يسري من اليوم ${effectiveDay}`,
    severity: 'INFO',
  });

  return nextState;
}

/**
 * 2. Awards an immediate performance bonus to an employee.
 * Deducted immediately from available cash and recorded as a SALARY_EXPENSE.
 */
export function grantEmployeePerformanceBonus(
  state: GameState,
  employeeId: string,
  bonusAmountPiastres: number,
  reason: string
): GameState {
  if (bonusAmountPiastres <= 0) {
    throw new Error('قيمة المكافأة يجب أن تكون أكبر من الصفر.');
  }

  const afford = canAffordImmediatePayment(state, bonusAmountPiastres);
  if (!afford.allowed) {
    throw new Error(afford.reason || 'السيولة النقدية لا تكفي لصرف المكافأة.');
  }

  const empIndex = state.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) throw new Error('الموظف غير موجود.');
  const emp = state.employees[empIndex];
  if (emp.status === 'TERMINATED') {
    throw new Error('لا يمكن صرف مكافأة لموظف منتهية خدمته.');
  }

  const bonusKey = `BONUS-${emp.id}-D${state.company.currentDay}-${state.ledger.length}`;

  let nextState = recordLedgerTransaction(state, {
    type: 'SALARY_OR_BONUS_PAID',
    amountPiastres: bonusAmountPiastres,
    debitAccount: 'SALARY_EXPENSE',
    creditAccount: 'CASH',
    referenceId: emp.id,
    description: `صرف مكافأة أداء نقدية للموظف ${emp.name}: ${reason}`,
  });

  const newEfficiency = Math.min(100, emp.efficiency + 4);
  const updatedEmp: Employee = {
    ...emp,
    bonusesPiastres: emp.bonusesPiastres + bonusAmountPiastres,
    efficiency: newEfficiency,
  };

  const evalPerf = evaluateEmployeePerformance(updatedEmp);
  updatedEmp.performanceScore = evalPerf.performanceScore;
  updatedEmp.performancePositiveFactors = evalPerf.positiveFactors;
  updatedEmp.performanceNegativeFactors = evalPerf.negativeFactors;
  updatedEmp.isLowPerformWarning = evalPerf.isLowPerformWarning;

  const nextEmployees = [...nextState.employees];
  nextEmployees[empIndex] = updatedEmp;

  const nextCouriers = nextState.couriers.map((c) =>
    c.employeeId === emp.id
      ? { ...c, efficiency: updatedEmp.efficiency }
      : c
  );

  nextState = {
    ...nextState,
    employees: nextEmployees,
    couriers: nextCouriers,
    executedDecisionIds: [...nextState.executedDecisionIds, bonusKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: bonusKey,
    title: 'صرف مكافأة أداء',
    message: `تم صرف مكافأة قدرها ${formatEGP(bonusAmountPiastres)} للموظف ${emp.name} وارتفع مؤشر أدائه إلى ${updatedEmp.performanceScore}%.`,
    department: 'MANAGEMENT',
    outcomeLabel: `خصم نقدي ${formatEGP(bonusAmountPiastres)}`,
    severity: 'SUCCESS',
  });

  return nextState;
}

/**
 * 3. Enrolls an employee in a training program.
 * Costs immediate cash, takes a set duration (in game minutes), and improves efficiency upon completion.
 */
export function startEmployeeTraining(
  state: GameState,
  employeeId: string
): GameState {
  const trainingCostPiastres = egpToPiastres(120);
  const trainingDurationMinutes = 90;

  const afford = canAffordImmediatePayment(state, trainingCostPiastres);
  if (!afford.allowed) {
    throw new Error(afford.reason || 'السيولة غير كافية لتكلفة التدريب.');
  }

  const empIndex = state.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) throw new Error('الموظف غير موجود.');
  const emp = state.employees[empIndex];

  if (emp.status === 'IN_TRAINING') {
    throw new Error('الموظف ملتحق بتدريب جارٍ بالفعل.');
  }
  if (emp.status === 'TERMINATED') {
    throw new Error('الموظف منتهية خدمته.');
  }

  let nextState = recordLedgerTransaction(state, {
    type: 'OPERATING_EXPENSE_PAID',
    amountPiastres: trainingCostPiastres,
    debitAccount: 'OPERATING_EXPENSE',
    creditAccount: 'CASH',
    referenceId: `TRAIN-${emp.id}`,
    description: `تكلفة دورة تدريبية لرفع كفاءة التشغيل للموظف ${emp.name}`,
  });

  const completesAt = nextState.clock.totalElapsedMinutes + trainingDurationMinutes;

  const updatedEmp: Employee = {
    ...emp,
    status: 'IN_TRAINING',
    trainingCompletesAtTotalMinutes: completesAt,
  };

  const nextEmployees = [...nextState.employees];
  nextEmployees[empIndex] = updatedEmp;

  return {
    ...nextState,
    employees: nextEmployees,
  };
}

/**
 * 4. Opens an administrative investigation into an employee's performance when delays/errors occurred.
 */
export function conductEmployeeInvestigation(
  state: GameState,
  employeeId: string
): GameState {
  const empIndex = state.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) throw new Error('الموظف غير موجود.');
  const emp = state.employees[empIndex];

  const invKey = `INVESTIGATE-${emp.id}-D${state.company.currentDay}`;
  if (state.executedDecisionIds.includes(invKey)) {
    throw new Error('تم إجراء التحقيق الإداري مع هذا الموظف اليوم بالفعل.');
  }

  const updatedEmp: Employee = {
    ...emp,
    errorRatePercent: Math.max(1, emp.errorRatePercent - 2),
  };

  const evalPerf = evaluateEmployeePerformance(updatedEmp);
  updatedEmp.performanceScore = evalPerf.performanceScore;
  updatedEmp.performancePositiveFactors = evalPerf.positiveFactors;
  updatedEmp.performanceNegativeFactors = evalPerf.negativeFactors;
  updatedEmp.isLowPerformWarning = evalPerf.isLowPerformWarning;

  const nextEmployees = [...state.employees];
  nextEmployees[empIndex] = updatedEmp;

  let nextState: GameState = {
    ...state,
    employees: nextEmployees,
    executedDecisionIds: [...state.executedDecisionIds, invKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: invKey,
    title: 'نتيجة تحقيق إداري',
    message: `تم التحقيق مع ${emp.name} بشأن حالات التأخير (${emp.attributedDelaysCount}) وتوجيه إنذار رسمي لتحسين الانضباط.`,
    department: 'MANAGEMENT',
    outcomeLabel: 'توثيق سبب التأخير',
    severity: 'INFO',
  });

  return nextState;
}

/**
 * 5. Applies an official policy-based financial penalty to an employee's accrued salary.
 */
export function applyApprovedEmployeePenalty(
  state: GameState,
  employeeId: string,
  reason: string
): GameState {
  const empIndex = state.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) throw new Error('الموظف غير موجود.');
  const emp = state.employees[empIndex];

  if (emp.attributedDelaysCount === 0) {
    throw new Error(
      'لا يمكن توقيع جزاء مالي على الموظف لعدم وجود حالات تأخير أو تقصير مسجلة ضدّه.'
    );
  }

  const penaltyEventKey = `PENALTY-${emp.id}-DELAYCOUNT-${emp.attributedDelaysCount}`;
  if (state.executedDecisionIds.includes(penaltyEventKey)) {
    throw new Error(
      'تم توقيع الجزاء المالي عن واقعة التأخير المسجلة مسبقاً، ولا يجوز احتساب الغرامة مرتين.'
    );
  }

  const policyPenaltyPiastres = egpToPiastres(50);
  const actualDeduction = Math.min(
    policyPenaltyPiastres,
    Math.max(egpToPiastres(50), emp.accruedSalaryPiastres)
  );

  let nextState = state;
  if (emp.accruedSalaryPiastres >= actualDeduction) {
    nextState = recordLedgerTransaction(state, {
      type: 'PENALTY_RECORDED',
      amountPiastres: actualDeduction,
      debitAccount: 'ACCRUED_SALARIES_PAYABLE',
      creditAccount: 'SALARY_EXPENSE',
      referenceId: emp.id,
      description: `خصم جزاء إداري معتمد من مستحقات الموظف ${emp.name}: ${reason}`,
    });
  }

  const timeLabel = formatClockTime(nextState.clock.minutesFromMidnight);
  const updatedEmp: Employee = {
    ...emp,
    approvedPenaltiesPiastres: emp.approvedPenaltiesPiastres + actualDeduction,
    penaltyHistory: [
      ...emp.penaltyHistory,
      {
        id: `PEN-${nextState.company.currentDay}-${emp.penaltyHistory.length + 1}`,
        day: nextState.company.currentDay,
        timeLabel,
        amountPiastres: actualDeduction,
        reason,
      },
    ],
  };

  const nextEmployees = [...nextState.employees];
  nextEmployees[empIndex] = updatedEmp;

  return {
    ...nextState,
    employees: nextEmployees,
    executedDecisionIds: [...nextState.executedDecisionIds, penaltyEventKey],
  };
}

/**
 * 6. Reallocates tasks / expands warehouse support for an employee.
 */
export function reassignEmployeeTasks(
  state: GameState,
  employeeId: string
): GameState {
  const empIndex = state.employees.findIndex((e) => e.id === employeeId);
  if (empIndex === -1) throw new Error('الموظف غير موجود.');
  const emp = state.employees[empIndex];

  const key = `REASSIGN-EMP-${emp.id}-D${state.company.currentDay}`;
  if (state.executedDecisionIds.includes(key)) {
    throw new Error('تم إعادة توزيع مهام هذا الموظف اليوم بالفعل.');
  }

  const nextWarehouses = state.warehouses.map((w) => ({
    ...w,
    efficiencyLevel: Math.min(100, w.efficiencyLevel + 6),
  }));

  return {
    ...state,
    warehouses: nextWarehouses,
    executedDecisionIds: [...state.executedDecisionIds, key],
  };
}
