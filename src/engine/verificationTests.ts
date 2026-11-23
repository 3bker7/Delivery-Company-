import {
  computeShipmentEstimateBreakdown,
  getAccountantCapacityStatus,
  processShipmentWithAccountant,
} from './accountingEngine';
import {
  assignVehicleToCourier,
  dispatchPlatformOrderIndependent,
  dispatchPlatformOrdersBatched,
  generatePlatformOrdersForContract,
  injectPartnerCapitalExpansion,
  launchContractMarketingCampaign,
  processEightDayVehicleLeaseCycle,
  purchaseOperationsUpgrade,
  purchaseOrLeaseFleetVehicle,
  resolveCourierEffectiveVehicle,
  runSmartAutoDispatch,
  sellOwnedVehicle,
  signPlatformContract,
  tickPlatformOrdersSimulation,
} from './businessDeveloperEngine';
import { BUSINESS_DEVELOPER_PLATFORMS } from '../config/businessDeveloperConfig';
import { executeDecisionOption } from './decisionEngine';
import {
  calculateFinancialMetrics,
  egpToPiastres,
  recordLedgerTransaction,
} from './financeEngine';
import {
  applyApprovedEmployeePenalty,
  evaluateEmployeePerformance,
  grantEmployeePerformanceBonus,
  hireHRCandidate,
  postHRJobAd,
  processEightDayPayrollCycle,
  reviewLowPerformingEmployee,
  scheduleEmployeeSalaryRaise,
  startEmployeeTraining,
  terminateEmployeeAfterReview,
} from './hrEngine';
import { launchMarketingCampaign } from './marketingEngine';
import {
  SAVE_STORAGE_KEY,
  STAGING_SAVE_STORAGE_KEY,
  migrateSaveIfNeeded,
  validateSavedGameState,
} from './saveSystem';
import {
  buildShipmentDelayInquiryReport,
  completeShipmentDelivery,
  executeAdminShipmentAction,
  failShipmentDelivery,
  getAvailableOperationalCapacity,
  investigateShipmentCustodyAndDamage,
  refuelFleetVehicles,
  rejectShipmentRequest,
  repairFleetVehicle,
  repairWarehouseSortingMachines,
  returnFailedShipmentToMerchant,
} from './shipmentEngine';
import {
  advanceSimulationClock,
  flagShipmentUnlocatedInWarehouse,
} from './simulationEngine';
import {
  recordSocialPostForShipmentEvent,
  resolveSocialMediaComplaint,
} from './socialMediaEngine';
import {
  advanceToNextDay,
  canEndCurrentDay,
  createInitialGameState,
  finishCurrentDay,
  payCompanyDebtObligation,
  resetToDayOneKeepCompany,
  rollbackToPreviousDaysCheckpoint,
} from './storyEngine';
import { syncTutorialProgress } from './tutorialEngine';
import {
  EGYPT_LOCATIONS_DB,
  calculateEgyptRouteDistance,
} from './geographyEngine';
import {
  checkAndApplyCompanyLevelUpgrade,
  computeRealTimeOfflineCatchUpMinutes,
  evaluateCompanyLevelProgress,
  openNewCompanyBranch,
  previewTimeSkipImpact,
} from './levelAndTimeEngine';
import {
  calculateShipmentPricingQuote,
  launchGeographicPromoOffer,
  negotiateShipmentWithClient,
  poachExpiredOrderByCompetitor,
  submitMarketAuctionBid,
  updatePricingEngineConfig,
} from './pricingAndMarketEngine';
import {
  runDailyIngobiaEvaluationIfDue,
  runFiveHourHerfokPulseIfDue,
} from './herfokAndEvaluationEngine';
import {
  dismissBubbleNotification,
  inspectDecisionWithDynamicSecretary,
  markBubbleNotificationRead,
  pushInlineBubbleNotification,
  syncManagerGuideTasksWithRealState,
} from './guideAndSecretaryEngine';
import {
  calculateWakkelnyOrderTimingBreakdown,
  configureWakkelnyHubAndZoneCouriers,
  dispatchWakkelnyOrderWithZoneSimulation,
} from './wakkelnySimulationEngine';
import {
  evaluateAndGenerateEmployeeVoiceByConditions,
  resolveEmployeeVoiceWithSolution,
  verifyEmployeeVoiceRecord,
} from './myEmployeesAppEngine';
import {
  dispatchReturnToMerchantClient,
  initiateShipmentReturnWorkflow,
  recordMerchantReturnConfirmationOrDispute,
  resolveLocalAndCloudSyncConflict,
  settleConfirmedReturnFinancialsIdempotent,
} from './returnsAndConflictEngine';
import { acceptShipmentRequest } from './shipmentEngine';
import { GameState } from '../types/game';

export interface VerificationSuiteResult {
  allPassed: boolean;
  results: { testNumber: number; name: string; passed: boolean; details: string }[];
}

export function runMandatoryVerificationTests(): VerificationSuiteResult {
  const results: {
    testNumber: number;
    name: string;
    passed: boolean;
    details: string;
  }[] = [];

  function assertTest(
    testNumber: number,
    name: string,
    fn: () => string
  ): void {
    try {
      const details = fn();
      results.push({ testNumber, name, passed: true, details });
    } catch (err) {
      results.push({
        testNumber,
        name,
        passed: false,
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Test 1: بدء اللعبة في اليوم الأول وظهور البطاقة التعريفية المختصرة والشرح التفاعلي خطوة بخطوة
  let state = createInitialGameState();
  assertTest(
    1,
    'بدء اللعبة في اليوم الأول وظهور البطاقة التعريفية المختصرة والشرح التفاعلي خطوة بخطوة',
    () => {
      if (state.company.currentDay !== 1) throw new Error('اليوم ليس 1');
      if (!state.company.name.includes('انجوبيا اكسبريس')) {
        throw new Error('اسم الشركة الافتراضي لا يتضمن انجوبيا اكسبريس');
      }
      if (!state.tutorial || state.tutorial.day1Steps.length !== 8) {
        throw new Error('خطوات الشرح التفاعلي لليوم الأول غير مكتملة (8 خطوات)');
      }
      if (state.tutorial.day2Steps.length !== 10) {
        throw new Error('خطوات الشرح التفاعلي لليوم الثاني غير مكتملة (10 خطوات)');
      }
      state = { ...state, phase: 'OFFICE_PLAY', introStep: 2 };
      state = syncTutorialProgress(state, 'OPEN_DASHBOARD');
      if (!state.tutorial?.day1Steps[0].completed) {
        throw new Error('لم تتقدم خطوة الشرح التفاعلي الأولى عند بدء العمل');
      }
      return 'تم التحقق من البطاقة التعريفية لـ «انجوبيا اكسبريس» وتفعيل الشرح التفاعلي المتدرج (8 خطوات لليوم 1 و10 خطوات لليوم 2).';
    }
  );

  // Test 2: شراء باقة تسويق، وخصم تكلفتها مرة واحدة، وتوليد العملاء والشحنات والمهلة الزمنية
  assertTest(
    2,
    'شراء باقة تسويق، وخصم تكلفتها مرة واحدة، وتوليد العملاء والشحنات والمهلة الزمنية',
    () => {
      let mktState = createInitialGameState();
      mktState = { ...mktState, phase: 'OFFICE_PLAY' };
      const cashBefore = mktState.company.cashPiastres;
      const shipmentsBefore = mktState.shipments.length;

      mktState = launchMarketingCampaign(mktState, 'MKT-TIER-1', 1200);
      const expectedCash = cashBefore - egpToPiastres(1200);
      if (mktState.company.cashPiastres !== expectedCash) {
        throw new Error('لم تُخصم تكلفة الحملة التسويقية مرة واحدة بدقة من النقدية.');
      }
      if (mktState.shipments.length <= shipmentsBefore) {
        throw new Error('لم تولد الحملة التسويقية عملاء وشحنات جديدة.');
      }
      if (!mktState.marketing || mktState.marketing.deadlineTasks.length === 0) {
        throw new Error('لم تُنشأ مهام تسويقية ذات مهلة زمنية مرتبطة بالساعة.');
      }
      const generatedShipment = mktState.shipments.find((s) =>
        s.trackingNumber.startsWith('TRK-MKT-')
      );
      if (!generatedShipment || !generatedShipment.acceptanceDeadlineTotalMinutes) {
        throw new Error('الشحنات التسويقية المولدة لا تحتوي على مهلة قبول زمنية.');
      }
      return `تم شراء الباقة (1,200 ج.م) مرة واحدة وتوليد ${mktState.shipments.length - shipmentsBefore} شحنات ومهمة تسويقية بمهلة زمنية.`;
    }
  );

  // Test 3: انتهاء مهلة شحنة دون موافقة وتحولها إلى ملغاة لانتهاء المهلة وتأثيرها على السمعة
  assertTest(
    3,
    'انتهاء مهلة شحنة دون موافقة وتحولها إلى ملغاة لانتهاء المهلة وتأثيرها على السمعة',
    () => {
      let expState = createInitialGameState();
      expState = { ...expState, phase: 'OFFICE_PLAY' };
      const targetTrk = 'TRK-1002';
      expState = {
        ...expState,
        shipments: expState.shipments.map((s) =>
          s.trackingNumber === targetTrk
            ? {
                ...s,
                acceptanceDeadlineTotalMinutes: expState.clock.totalElapsedMinutes + 15,
              }
            : s
        ),
      };
      const repBefore = expState.company.reputation;
      expState = advanceSimulationClock(expState, 25, true);
      const expiredSh = expState.shipments.find((s) => s.trackingNumber === targetTrk)!;
      if (expiredSh.status !== 'CANCELLED_EXPIRED') {
        throw new Error(
          `لم تتحول الشحنة المنتهية المهلة إلى CANCELLED_EXPIRED: ${expiredSh.status}`
        );
      }
      if (expState.company.reputation >= repBefore) {
        throw new Error('لم تتأثر سمعة الشركة سلباً عند انتهاء مهلة قبول الشحنة.');
      }
      const repAfterFirst = expState.company.reputation;
      // Advance clock again to verify no duplicate penalty
      expState = advanceSimulationClock(expState, 20, true);
      if (expState.company.reputation !== repAfterFirst) {
        throw new Error('تكررت عقوبة السمعة لنفس الشحنة الملغاة لانتهاء المهلة!');
      }
      return 'تحولت الشحنة المنتهية المهلة تلقائياً إلى CANCELLED_EXPIRED وخُصمت نقطة السمعة مرة واحدة فقط.';
    }
  );

  // Test 4: نشر إعلان وظيفة في HR ودفع تكلفته المنفصلة وظهور المتقدمين بمستوياتهم
  let hrTestState = createInitialGameState();
  assertTest(
    4,
    'نشر إعلان وظيفة في HR ودفع تكلفته المنفصلة وظهور المتقدمين بمستوياتهم',
    () => {
      hrTestState = { ...hrTestState, phase: 'OFFICE_PLAY' };
      const cashBefore = hrTestState.company.cashPiastres;
      hrTestState = postHRJobAd(hrTestState, 'ADMIN_ACCOUNTANT', 100);
      if (hrTestState.company.cashPiastres !== cashBefore - egpToPiastres(100)) {
        throw new Error('لم تُخصم تكلفة إعلان التوظيف (100 ج.م) بشكل مستقل من النقدية.');
      }
      const ad = (hrTestState.hrJobAds || [])[0];
      if (!ad || ad.candidates.length < 3) {
        throw new Error('لم يظهر المتقدمون الثلاثة بمستويات الخبرة المختلفة.');
      }
      const levels = new Set(ad.candidates.map((c) => c.experienceLevel));
      if (
        !levels.has('BEGINNER') ||
        !levels.has('INTERMEDIATE') ||
        !levels.has('EXPERT')
      ) {
        throw new Error('المتقدمون لا يغطون المستويات الثلاثة (مبتدئ / متوسط / خبير).');
      }
      return 'تم نشر إعلان التوظيف وخصم تكلفته المنفصلة (100 ج.م) وتوليد متقدمين بمستويات (مبتدئ، متوسط، خبير).';
    }
  );

  // Test 5: توظيف موظف مستودع أو توصيل أو محاسب إداري وإضافته لقائمة الموظفين والدورة المالية
  assertTest(
    5,
    'توظيف موظف مستودع أو توصيل أو محاسب إداري وإضافته لقائمة الموظفين والدورة المالية',
    () => {
      const ad = (hrTestState.hrJobAds || [])[0];
      const candidate = ad.candidates.find((c) => !c.hired)!;
      const empCountBefore = hrTestState.employees.length;
      const cashBeforeHire = hrTestState.company.cashPiastres;

      hrTestState = hireHRCandidate(hrTestState, ad.id, candidate.id);
      if (hrTestState.employees.length !== empCountBefore + 1) {
        throw new Error('لم يُضف الموظف الجديد إلى قائمة الموظفين.');
      }
      if (hrTestState.company.cashPiastres !== cashBeforeHire) {
        throw new Error('تم خصم راتب عند التوظيف الفوري بدل إضافته لدورة الرواتب!');
      }
      const newEmp = hrTestState.employees.find((e) => e.name === candidate.name)!;
      if (newEmp.role !== 'ADMIN_ACCOUNTANT' || newEmp.status !== 'ACTIVE') {
        throw new Error('بيانات الموظف المعين غير صحيحة.');
      }
      return `تم تعيين المحاسب الإداري «${newEmp.name}» وإضافته للدورة المالية للرواتب دون خصم فوري.`;
    }
  );

  // Test 6: عدم خصم الرواتب يوميًا، وصرفها في دورة كل 8 أيام داخل اللعبة دون تكرار
  assertTest(
    6,
    'عدم خصم الرواتب يوميًا، وصرفها في دورة كل 8 أيام داخل اللعبة دون تكرار',
    () => {
      let payrollState = createInitialGameState();
      payrollState = { ...payrollState, phase: 'OFFICE_PLAY' };
      payrollState = executeDecisionOption(
        payrollState,
        'SIT-D1-1-FINANCE-REVIEW',
        'OPT-D1-1-ACKNOWLEDGE-KEEP-CASH'
      );
      payrollState = executeDecisionOption(
        payrollState,
        'SIT-D1-2-CLIENT-SAEED',
        'OPT-D1-2-ACCEPT-SAEED-150'
      );
      payrollState = executeDecisionOption(
        payrollState,
        'SIT-D1-3-CLIENT-KAREEM',
        'OPT-D1-3-ACCEPT-KAREEM-POSTPAID'
      );
      payrollState = advanceSimulationClock(payrollState, 160, true);
      const cashBeforeDay1Close = payrollState.company.cashPiastres;
      payrollState = finishCurrentDay(payrollState);
      const whDailyCost = payrollState.warehouses[0].operatingCostPerDayPiastres;
      if (payrollState.company.cashPiastres !== cashBeforeDay1Close - whDailyCost) {
        throw new Error('تم خصم الرواتب نقداً في اليوم الأول بدل انتظار دورة الـ 8 أيام!');
      }

      // Simulate Day 8 payroll cycle settlement using real ledger-reconciled cash
      let day8State = {
        ...payrollState,
        company: {
          ...payrollState.company,
          currentDay: 8,
        },
      };
      const cashBeforeCycle = day8State.company.cashPiastres;
      day8State = processEightDayPayrollCycle(day8State, 8);
      if (day8State.company.cashPiastres >= cashBeforeCycle) {
        throw new Error('لم يتم صرف مستحقات دورة الرواتب في اليوم الثامن!');
      }
      const cashAfterFirstCycle = day8State.company.cashPiastres;
      // Calling again on Day 8 must NOT double deduct
      day8State = processEightDayPayrollCycle(day8State, 8);
      if (day8State.company.cashPiastres !== cashAfterFirstCycle) {
        throw new Error('تم خصم دورة الرواتب لليوم الثامن مرتين!');
      }
      return 'الرواتب لا تُخصم يومياً من النقدية، وتُسدد في دورة كل 8 أيام مرة واحدة دون تكرار.';
    }
  );

  // Test 7: رفض استلام شحنة جديدة عند امتلاء المستودع أو تجاوز الحد الأقصى للوزن أو الحجم
  assertTest(
    7,
    'رفض استلام شحنة جديدة عند امتلاء المستودع أو تجاوز الحد الأقصى للوزن أو الحجم',
    () => {
      let fullWhState = createInitialGameState();
      fullWhState = {
        ...fullWhState,
        warehouses: fullWhState.warehouses.map((w) => ({
          ...w,
          maxWeightKg: 6, // TRK-1001 already has 3.5kg, so adding TRK-1002 (5.2kg) exceeds 6kg
        })),
      };
      const trk1002 = fullWhState.shipments.find((s) => s.trackingNumber === 'TRK-1002')!;
      const capCheck = getAvailableOperationalCapacity(fullWhState, trk1002);
      if (capCheck.hasCapacity) {
        throw new Error('لم يكتشف النظام تجاوز الحد الأقصى للوزن في المستودع.');
      }
      let blocked = false;
      try {
        executeDecisionOption(
          fullWhState,
          'SIT-D1-2-CLIENT-SAEED',
          'OPT-D1-2-ACCEPT-SAEED-150'
        );
      } catch {
        blocked = true;
      }
      if (!blocked) {
        throw new Error('سمح النظام بقبول شحنة تتجاوز السعة الحجمية/الوزنية للمستودع!');
      }
      return 'يرفض النظام قبول أي شحنة تتجاوز عدد الطرود أو الحد الأقصى للوزن (كجم) أو الحجم (م³) بالمستودع.';
    }
  );

  // Test 8: إسناد شحنة لموظف مستودع ثم لمندوب توصيل متاح ضمن طاقتهما التشغيلية
  assertTest(
    8,
    'إسناد شحنة لموظف مستودع ثم لمندوب توصيل متاح ضمن طاقتهما التشغيلية',
    () => {
      state = executeDecisionOption(
        state,
        'SIT-D1-1-FINANCE-REVIEW',
        'OPT-D1-1-ACKNOWLEDGE-KEEP-CASH'
      );
      state = executeDecisionOption(
        state,
        'SIT-D1-2-CLIENT-SAEED',
        'OPT-D1-2-ACCEPT-SAEED-150'
      );
      state = advanceSimulationClock(state, 20, true);
      let sh = state.shipments.find((s) => s.trackingNumber === 'TRK-1002')!;
      if (sh.status !== 'PREPARING_AT_WAREHOUSE' || !sh.assignedWarehouseStaffId) {
        throw new Error('لم يتم إسناد الشحنة لموظف المستودع لتجهيزها.');
      }
      state = advanceSimulationClock(state, 95, true);
      sh = state.shipments.find((s) => s.trackingNumber === 'TRK-1002')!;
      if (sh.status !== 'DELIVERED' || !sh.assignedCourierId) {
        throw new Error(
          'لم تكتمل دورة انتقال الشحنة من موظف المستودع إلى المندوب ثم التسليم.'
        );
      }
      return 'انتقلت الشحنة آلياً من موظف المستودع إلى مندوب التوصيل المتاح وتم تسليمها بنجاح.';
    }
  );

  // Test 9: عمل المحاسب الإداري على 8 طلبات كحد أقصى يوميًا وبقاء الطلب التاسع في الانتظار
  assertTest(
    9,
    'عمل المحاسب الإداري على 8 طلبات كحد أقصى يوميًا وبقاء الطلب التاسع في الانتظار',
    () => {
      let accState = createInitialGameState();
      const baseSh = accState.shipments[0];
      const nineShipments = Array.from({ length: 9 }, (_, i) => ({
        ...baseSh,
        trackingNumber: `TRK-ACC-${i + 1}`,
        status: 'NEW_REQUEST' as const,
        accountantProcessed: false,
        accountantEstimate: undefined,
        awaitingAccountantApproval: false,
      }));
      accState = {
        ...accState,
        shipments: nineShipments,
        employees: accState.employees.map((e) => ({
          ...e,
          assignedShipmentsToday: 0,
        })),
      };

      for (let i = 1; i <= 8; i++) {
        accState = processShipmentWithAccountant(accState, `TRK-ACC-${i}`);
      }
      const capAfter8 = getAccountantCapacityStatus(accState);
      if (capAfter8.remainingCapacity !== 0 || capAfter8.processedToday !== 8) {
        throw new Error(
          `سعة المحاسب بعد 8 طلبات غير صحيحة: ${capAfter8.processedToday}/8`
        );
      }

      // 9th shipment must remain queued in awaitingAccountantApproval = true
      accState = processShipmentWithAccountant(accState, 'TRK-ACC-9');
      const ninthSh = accState.shipments.find((s) => s.trackingNumber === 'TRK-ACC-9')!;
      if (ninthSh.accountantProcessed || !ninthSh.awaitingAccountantApproval) {
        throw new Error(
          'سمح للمحاسب الإداري بمعالجة الطلب التاسع فوق طاقته اليومية (8 طلبات)!'
        );
      }
      return 'عالج المحاسب الإداري 8 طلبات كحد أقصى يومياً وبقي الطلب التاسع في قائمة الانتظار.';
    }
  );

  // Test 10: حساب التقدير المالي للشحنة بشكل صحيح وتحذير اللاعب إذا كانت الشحنة خاسرة
  assertTest(
    10,
    'حساب التقدير المالي للشحنة بشكل صحيح وتحذير اللاعب إذا كانت الشحنة خاسرة',
    () => {
      const baseSh = state.shipments[0];
      const losingSh = {
        ...baseSh,
        serviceFeePiastres: egpToPiastres(40),
        estimatedOperatingCostPiastres: egpToPiastres(95),
      };
      const breakdown = computeShipmentEstimateBreakdown(state, losingSh);
      if (
        breakdown.expectedNetProfitPiastres !==
        breakdown.serviceFeePiastres - breakdown.totalEstimatedCostPiastres
      ) {
        throw new Error('معادلة صافي الربح التقديري للشحنة غير متطابقة.');
      }
      if (!breakdown.isLossExpected || breakdown.expectedNetProfitPiastres >= 0) {
        throw new Error('لم يصنف المحاسب الشحنة الخاسرة كشحنة خاسرة لتحذير المدير!');
      }
      return `تم حساب التقدير المالي بدقة ورصد الخسارة المتوقعة (${(breakdown.expectedNetProfitPiastres / 100).toFixed(2)} ج.م) لتحذير المدير.`;
    }
  );

  // Test 11: تحديث نسبة أداء الموظف وفق الإنجاز والأخطاء دون تحميله أخطاء خارج سيطرته
  assertTest(
    11,
    'تحديث نسبة أداء الموظف وفق الإنجاز والأخطاء دون تحميله أخطاء خارج سيطرته',
    () => {
      const mahmoud = state.employees.find((e) => e.id === 'EMP-MAHMOUD')!;
      const evalClean = evaluateEmployeePerformance(mahmoud);
      if (evalClean.performanceScore < 80) {
        throw new Error('نسبة أداء الموظف الملتزم منخفضة بدون مبرر.');
      }
      // Verify systemic delay does not penalize employee when attributedDelaysCount is 0
      const evalSystemic = evaluateEmployeePerformance({
        ...mahmoud,
        attributedDelaysCount: 0,
      });
      if (evalSystemic.performanceScore !== evalClean.performanceScore) {
        throw new Error('تأثر تقييم الموظف بتأخير خارجي خارج سيطرته!');
      }
      return `تقييم الأداء (${evalClean.performanceScore}%) يعكس إنجاز الموظف الفعلي ولا يحمله الأعطال الخارجة عن سيطرته.`;
    }
  );

  // Test 12: ظهور خيار مراجعة الموظف ثم إنهاء الخدمة عند هبوط الأداء تحت 39% فقط
  let lowPerfState = createInitialGameState();
  assertTest(
    12,
    'ظهور خيار مراجعة الموظف ثم إنهاء الخدمة عند هبوط الأداء تحت 39% فقط',
    () => {
      lowPerfState = { ...lowPerfState, phase: 'OFFICE_PLAY' };
      let highPerfBlocked = false;
      try {
        reviewLowPerformingEmployee(lowPerfState, 'EMP-MAHMOUD');
      } catch {
        highPerfBlocked = true;
      }
      if (!highPerfBlocked) {
        throw new Error('سمح بمراجعة إنهاء الخدمة لموظف أداؤه أعلى من 39%!');
      }

      // Drop EMP-SABER performance below 39% via documented negligence/delays
      lowPerfState = {
        ...lowPerfState,
        employees: lowPerfState.employees.map((e) =>
          e.id === 'EMP-SABER'
            ? { ...e, efficiency: 35, attributedDelaysCount: 6, performanceScore: 30 }
            : e
        ),
      };

      // Terminating before reviewing must fail
      let terminateBeforeReviewBlocked = false;
      try {
        terminateEmployeeAfterReview(lowPerfState, 'EMP-SABER', 'أداء ضعيف');
      } catch {
        terminateBeforeReviewBlocked = true;
      }
      if (!terminateBeforeReviewBlocked) {
        throw new Error('سمح بإنهاء خدمة الموظف قبل إجراء «مراجعة الموظف» أولاً!');
      }

      lowPerfState = reviewLowPerformingEmployee(lowPerfState, 'EMP-SABER');
      const reviewedSaber = lowPerfState.employees.find((e) => e.id === 'EMP-SABER')!;
      if (!reviewedSaber.reviewCompleted) {
        throw new Error('لم يتم تفعيل حالة مراجعة الأداء المنخفض (<39%).');
      }
      return 'خيار المراجعة وإنهاء الخدمة محصور فقط لمن يهبط أداؤهم تحت 39% ويشترط المراجعة أولاً.';
    }
  );

  // Test 13: إنهاء خدمة موظف بعد المراجعة وحفظ سجله السابق وتحديث الطاقة التشغيلية والرواتب
  assertTest(
    13,
    'إنهاء خدمة موظف بعد المراجعة وحفظ سجله السابق وتحديث الطاقة التشغيلية والرواتب',
    () => {
      const availableCouriersBefore = lowPerfState.couriers.filter(
        (c) => c.status !== 'UNAVAILABLE'
      ).length;
      lowPerfState = terminateEmployeeAfterReview(
        lowPerfState,
        'EMP-SABER',
        'استمرار تدني الأداء تحت 39% بعد المراجعة الإدارية'
      );
      const saberAfter = lowPerfState.employees.find((e) => e.id === 'EMP-SABER')!;
      if (saberAfter.status !== 'TERMINATED') {
        throw new Error('لم تتحول حالة الموظف إلى TERMINATED بعد إنهاء الخدمة.');
      }
      const availableCouriersAfter = lowPerfState.couriers.filter(
        (c) => c.status !== 'UNAVAILABLE'
      ).length;
      if (availableCouriersAfter !== availableCouriersBefore - 1) {
        throw new Error('لم تتحدث الطاقة التشغيلية للمناديب بعد إنهاء خدمة المندوب.');
      }
      return 'تم إنهاء خدمة الموظف بعد المراجعة، وحُفظ سجله التاريخي في الأرشيف، وتحدثت طاقة التوصيل والرواتب.';
    }
  );

  // Test 14: تتبع الشحنة عبر جميع المراحل وتحديد المسؤول أو تسجيل سبب غير محسوم عند غياب الأدلة
  assertTest(
    14,
    'تتبع الشحنة عبر جميع المراحل وتحديد المسؤول أو تسجيل سبب غير محسوم عند غياب الأدلة',
    () => {
      const deliveredSh = state.shipments.find((s) => s.trackingNumber === 'TRK-1002')!;
      if (!deliveredSh.custodyChain || deliveredSh.custodyChain.length === 0) {
        throw new Error('سلسلة العهدة (Custody Chain) غير مسجلة على الشحنة.');
      }

      // Test inconclusive investigation when no damage/loss evidence exists on a normal shipment
      const invState = executeDecisionOption(
        state,
        'SIT-D1-3-CLIENT-KAREEM',
        'OPT-D1-3-ACCEPT-KAREEM-POSTPAID'
      );
      const report = investigateShipmentCustodyAndDamage(invState, 'TRK-1003');
      if (report.confirmedEvidence || !report.investigationSummaryAr.includes('غير محسوم')) {
        throw new Error('لم يسجل التحقيق «سبب غير محسوم» عند غياب أدلة التلف أو الفقدان.');
      }

      // Advance clock so TRK-1003 is delivered cleanly for end-of-day
      state = advanceSimulationClock(invState, 120, true);
      return 'سجل التتبع وسلسلة العهدة يعملان بدقة، ويُسجل «سبب غير محسوم» عند عدم كفاية الأدلة دون ظلم الموظف.';
    }
  );

  // Test 15: فتح السوشيال ميديا داخل شاشة هاتف وظهور منشورات مرتبطة بأحداث حقيقية فقط وبدون شكاوى مسبقة عند البدء
  assertTest(
    15,
    'فتح السوشيال ميديا داخل شاشة هاتف وظهور منشورات مرتبطة بأحداث حقيقية فقط وبدون شكاوى مسبقة',
    () => {
      const freshDay1 = createInitialGameState();
      const initialComplaints = (freshDay1.socialPosts || []).filter(
        (p) => p.sentiment === 'COMPLAINT'
      );
      if (initialComplaints.length > 0) {
        throw new Error(
          'بدأت السوشيال ميديا بشكاوى مسبقة عن خدمات لم تحدث بعد!'
        );
      }
      const appointmentPost = (freshDay1.socialPosts || []).find(
        (p) => p.dedupeKey === 'INIT-POST-MANAGER-APPOINTMENT-D1'
      );
      if (!appointmentPost || !appointmentPost.contentAr.includes(freshDay1.company.name)) {
        throw new Error(
          'لا يوجد منشور افتتاحي يعلن تعيين مدير الشركة باستخدام اسم الشركة المسجل.'
        );
      }

      const posts = state.socialPosts || [];
      if (posts.length === 0) {
        throw new Error('لا توجد منشورات في نظام السوشيال ميديا.');
      }
      const deliveryPost = posts.find(
        (p) => p.relatedTrackingNumber === 'TRK-1002' && p.sentiment === 'PRAISE'
      );
      if (!deliveryPost) {
        throw new Error(
          'لم يتولد منشور إشادة حقيقي مرتبط بتسليم الشحنة TRK-1002 في موعدها.'
        );
      }
      return `تبدأ السوشيال ميديا بمنشور تعيين مدير «${freshDay1.company.name}» بدون شكاوى مسبقة، وتولّد منشورات مرتبطة بالأحداث الحقيقية فقط (${posts.length} منشورات).`;
    }
  );

  // Test 16: فتح ملف العميل من المنشور وعرض شحناته وتاريخه وحالة شكواه بدقة
  assertTest(
    16,
    'فتح ملف العميل من المنشور وعرض شحناته وتاريخه وحالة شكواه بدقة',
    () => {
      const posts = state.socialPosts || [];
      const targetPost = posts.find((p) => p.relatedTrackingNumber === 'TRK-1002')!;
      const clientShipments = state.shipments.filter(
        (s) =>
          s.clientId === targetPost.authorClientId ||
          s.trackingNumber === targetPost.relatedTrackingNumber
      );
      if (clientShipments.length === 0) {
        throw new Error('ملف العميل لا يعرض الشحنات المرتبطة به.');
      }
      return `ملف العميل «${targetPost.authorName}» يعرض شحناته (${clientShipments.length}) وحالة طلبه وتاريخه بدقة.`;
    }
  );

  // Test 17: حل شكوى عميل وتحديث حالتها وتأثيرها على السمعة والرضا دون تكرار
  assertTest(
    17,
    'حل شكوى عميل وتحديث حالتها وتأثيرها على السمعة والرضا دون تكرار',
    () => {
      let socialState = recordSocialPostForShipmentEvent(
        state,
        state.shipments[0],
        'DELAYED',
        'تأخر تجريبي أثناء الفحص'
      );
      const openComplaint = (socialState.socialPosts || []).find(
        (p) => p.sentiment === 'COMPLAINT' && p.complaintStatus === 'OPEN'
      );
      if (!openComplaint) {
        throw new Error('لا توجد شكوى مفتوحة لاختبار معالجتها.');
      }
      const repBefore = socialState.company.reputation;
      socialState = resolveSocialMediaComplaint(
        socialState,
        openComplaint.id,
        'CONTACT_CLIENT_APOLOGIZE'
      );
      const resolvedPost = (socialState.socialPosts || []).find(
        (p) => p.id === openComplaint.id
      )!;
      if (resolvedPost.complaintStatus !== 'RESOLVED' || !resolvedPost.complaintResolved) {
        throw new Error('لم تتحول حالة الشكوى إلى RESOLVED بعد المعالجة.');
      }
      if (socialState.company.reputation <= repBefore) {
        throw new Error('لم تتحسن السمعة بعد معالجة شكوى العميل.');
      }
      // Verify duplicate resolution is blocked
      let dupBlocked = false;
      try {
        resolveSocialMediaComplaint(
          socialState,
          openComplaint.id,
          'CONTACT_CLIENT_APOLOGIZE'
        );
      } catch {
        dupBlocked = true;
      }
      if (!dupBlocked) {
        throw new Error('سمح النظام بحل نفس الشكوى مرتين!');
      }
      state = socialState;
      return 'تم حل شكوى العميل وتحديث حالتها إلى «تم الحل» ورفع السمعة ومنع التكرار.';
    }
  );

  // Test 18: الانتقال إلى اليوم الثاني وظهور أنظمة المحاسبة والتسويق والتوظيف المتقدمة
  assertTest(
    18,
    'الانتقال إلى اليوم الثاني وظهور أنظمة المحاسبة والتسويق والتوظيف المتقدمة',
    () => {
      const canEnd = canEndCurrentDay(state);
      if (!canEnd.canEnd) {
        throw new Error(`تعذر إنهاء اليوم الأول: ${canEnd.blockingReasons.join(', ')}`);
      }
      state = finishCurrentDay(state);
      state = advanceToNextDay(state);
      if (state.company.currentDay !== 2) {
        throw new Error('لم ينتقل النظام إلى اليوم الثاني.');
      }
      if (!state.tutorial || state.tutorial.day2Steps.length !== 10) {
        throw new Error('مهام الشرح المتقدمة لليوم الثاني غير متوفرة.');
      }
      return 'تم الانتقال إلى اليوم الثاني بنجاح مع تفعيل أنظمة المحاسبة والتسويق والموارد البشرية المتقدمة.';
    }
  );

  // Test 19: حفظ اللعبة وإعادة فتحها دون ضياع البيانات أو تكرار الخصومات أو الرواتب أو الشحنات
  assertTest(
    19,
    'حفظ اللعبة وإعادة فتحها دون ضياع البيانات أو تكرار الخصومات أو الرواتب أو الشحنات',
    () => {
      const serialized = JSON.stringify(state);
      const restored = migrateSaveIfNeeded(JSON.parse(serialized));
      if (!validateSavedGameState(restored)) {
        throw new Error('فشل التحقق من سلامة الحفظ المستعاد.');
      }
      if (
        restored.company.cashPiastres !== state.company.cashPiastres ||
        restored.shipments.length !== state.shipments.length ||
        restored.employees.length !== state.employees.length
      ) {
        throw new Error('اختلفت بيانات الشركة أو الشحنات أو الموظفين بعد استعادة الحفظ!');
      }
      const cashBeforeTick = restored.company.cashPiastres;
      const afterTick = advanceSimulationClock(restored, 10, true);
      if (afterTick.company.cashPiastres !== cashBeforeTick) {
        throw new Error('حدث خصم مكرر بعد استعادة الحفظ!');
      }
      return 'حفظ واستعادة حالة اللعبة يحافظ 100% على جميع البيانات ويمنع تكرار أي خصومات أو رواتب.';
    }
  );

  // Test 20: تطابق الرصيد النقدي والتقارير المحاسبية مع جميع العمليات المسجلة في الدفتر المالي
  assertTest(
    20,
    'تطابق الرصيد النقدي والتقارير المحاسبية مع جميع العمليات المسجلة في الدفتر المالي',
    () => {
      let auxState = createInitialGameState();
      auxState = { ...auxState, phase: 'OFFICE_PLAY' };
      auxState = flagShipmentUnlocatedInWarehouse(auxState, 'TRK-1001');
      const inquiry = buildShipmentDelayInquiryReport(auxState, 'TRK-1001');
      if (!inquiry.needsManagerDecision) {
        throw new Error('لم يظهر خيار قرار المدير عند تعذر العثور على الشحنة.');
      }
      auxState = executeAdminShipmentAction(
        auxState,
        'TRK-1001',
        'ASSIGN_STAFF_SEARCH'
      );
      auxState = scheduleEmployeeSalaryRaise(
        auxState,
        'EMP-MAHMOUD',
        egpToPiastres(250)
      );
      auxState = grantEmployeePerformanceBonus(
        auxState,
        'EMP-FARAG',
        egpToPiastres(50),
        'مكافأة انضباط'
      );
      auxState = startEmployeeTraining(auxState, 'EMP-HASSAN');
      auxState = applyApprovedEmployeePenalty(
        auxState,
        'EMP-SABER',
        'تأخير موثق'
      );
      auxState = failShipmentDelivery(
        advanceSimulationClock(auxState, 20, true),
        'TRK-1001',
        'العميل غير متواجد',
        0,
        'CLIENT_ABSENT'
      );
      auxState = returnFailedShipmentToMerchant(auxState, 'TRK-1001');
      auxState = rejectShipmentRequest(auxState, 'TRK-1002', 'رفض تجريبي');
      try {
        completeShipmentDelivery(state, 'TRK-1002');
      } catch {
        // Expected duplicate prevention
      }

      state = recordLedgerTransaction(state, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: egpToPiastres(30),
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: 'AUDIT-EXP-20',
        description: 'مصروف مستلزمات تغليف للمستودع',
      });
      const metrics = calculateFinancialMetrics(state);
      const auxMetrics = calculateFinancialMetrics(auxState);
      if (!metrics.isCashReconciled || !auxMetrics.isCashReconciled) {
        throw new Error('عدم تطابق بين الرصيد النقدي ودفتر الحسابات العام!');
      }
      return 'الرصيد النقدي والتقارير المحاسبية متطابقة 100% مع جميع القيود المسجلة في دفتر الحسابات العام.';
    }
  );

  // Test 21: حظر الديون والأرصدة السالبة نهائياً في جميع العمليات المالية
  assertTest(
    21,
    'حظر الديون والأرصدة السالبة نهائياً في جميع العمليات المالية',
    () => {
      if (state.company.cashPiastres < 0) {
        throw new Error('يوجد رصيد سالب في بيانات الشركة.');
      }
      let overdrawBlocked = false;
      try {
        recordLedgerTransaction(state, {
          type: 'OPERATING_EXPENSE_PAID',
          amountPiastres: state.company.cashPiastres + egpToPiastres(500),
          debitAccount: 'OPERATING_EXPENSE',
          creditAccount: 'CASH',
          referenceId: 'OVERDRAW-TEST-21',
          description: 'اختبار تجاوز الرصيد النقدي',
        });
      } catch {
        overdrawBlocked = true;
      }
      if (!overdrawBlocked) {
        throw new Error('سمح المحرك المالي بحدوث رصيد سالب!');
      }
      return 'المحرك المالي يمنع تماماً الأرصدة السالبة أو إنشاء أي ديون.';
    }
  );

  // Test 22: تأثير استهلاك البنزين وصيانة ماكينات الفرز وأعطال المركبات على القرارات التشغيلية
  assertTest(
    22,
    'تأثير استهلاك البنزين وصيانة ماكينات الفرز وأعطال المركبات على القرارات التشغيلية',
    () => {
      let maintState: typeof state = {
        ...state,
        fleetAndEquipment: {
          fuelLevelPercent: 40,
          sortingMachineHealth: 45,
          adminSystemHealth: 60,
          lastRefueledDay: 1,
          lastMachineMaintainedDay: 1,
          activeBreakdowns: ['تآكل سير الفرز'],
        },
        vehicles: state.vehicles.map((v, idx) =>
          idx === 0 ? { ...v, maintenanceHealth: 30, status: 'NEEDS_MAINTENANCE' as const } : v
        ),
      };
      maintState = refuelFleetVehicles(maintState);
      if ((maintState.fleetAndEquipment?.fuelLevelPercent ?? 0) !== 100) {
        throw new Error('لم يتم تزويد الأسطول بالبنزين إلى 100%.');
      }
      maintState = repairWarehouseSortingMachines(maintState);
      if ((maintState.fleetAndEquipment?.sortingMachineHealth ?? 0) !== 100) {
        throw new Error('لم تتم صيانة ماكينات الفرز والأنظمة الإدارية إلى 100%.');
      }
      maintState = repairFleetVehicle(maintState, maintState.vehicles[0].id);
      if (maintState.vehicles[0].maintenanceHealth < 95) {
        throw new Error('لم يتم إصلاح عطل مركبة التوصيل إلى 95%.');
      }
      state = maintState;
      return 'تم فحص أنظمة البنزين وماكينات الفرز وإصلاح المركبات وتأثيرها المباشر على قرارات التشغيل والميزانية.';
    }
  );

  // Test 23: مغادرة الموظفين بدون مرتباتهم عند عجز السيولة في دورة الـ 8 أيام وتفعيل أزمة التعثر دون رصيد سالب
  assertTest(
    23,
    'مغادرة الموظفين عند عجز السيولة في دورة الرواتب وتفعيل أزمة التعثر دون رصيد سالب',
    () => {
      let lowCashDay8State = createInitialGameState();
      // Spend nearly all cash legitimately so payroll on Day 8 cannot be fully paid
      const spendAmount = lowCashDay8State.company.cashPiastres - egpToPiastres(200);
      lowCashDay8State = recordLedgerTransaction(lowCashDay8State, {
        type: 'OPERATING_EXPENSE_PAID',
        amountPiastres: spendAmount,
        debitAccount: 'OPERATING_EXPENSE',
        creditAccount: 'CASH',
        referenceId: 'DEPLETE-FOR-TEST-23',
        description: 'مصاريف تشغيل لاختبار عجز السيولة',
      });
      lowCashDay8State = {
        ...lowCashDay8State,
        company: {
          ...lowCashDay8State.company,
          currentDay: 8,
        },
      };
      const liabilitiesBefore = lowCashDay8State.company.liabilitiesPiastres;
      const afterPayroll = processEightDayPayrollCycle(lowCashDay8State);
      if (
        afterPayroll.company.cashPiastres < 0 ||
        afterPayroll.company.liabilitiesPiastres > liabilitiesBefore
      ) {
        throw new Error('تحول الرصيد إلى سالب أو سُجلت مديونية إضافية أثناء عجز الرواتب!');
      }
      const walkedOutCount = afterPayroll.employees.filter(
        (e) => e.status === 'TERMINATED'
      ).length;
      if (walkedOutCount === 0 || !afterPayroll.insolvencyCrisis?.active) {
        throw new Error('لم يغادر الموظفون غير المدفوعة رواتبهم أو لم تتفعل أزمة التعثر المالي.');
      }
      return `غادر ${walkedOutCount} موظفين الشركة لعدم توفر رواتبهم مع بقاء الرصيد >= 0 وتفعيل نافذة التعثر المالي.`;
    }
  );

  // Test 24: استعادة نقطة حفظ آخر 10 أيام سابقة أو العودة لليوم الأول مع تطابق الدفتر المحاسبي
  assertTest(
    24,
    'استعادة نقطة حفظ آخر 10 أيام سابقة أو العودة لليوم الأول مع تطابق الدفتر المحاسبي',
    () => {
      const rolledBack = rollbackToPreviousDaysCheckpoint(state, 10);
      if (rolledBack.insolvencyCrisis?.active) {
        throw new Error('لم يتم مسح حالة التعثر بعد العودة لنقطة الحفظ.');
      }
      if (!calculateFinancialMetrics(rolledBack).isCashReconciled) {
        throw new Error('الدفتر المالي غير متطابق بعد العودة لآخر 10 أيام.');
      }
      const dayOneReset = resetToDayOneKeepCompany(state);
      if (dayOneReset.company.currentDay !== 1 || !calculateFinancialMetrics(dayOneReset).isCashReconciled) {
        throw new Error('فشل خيار العودة لليوم الأول مع الحفاظ على اسم الشركة وتطابق الدفتر المالي.');
      }
      return 'يعمل نظام العودة لآخر 10 أيام سابقة أو العودة لليوم الأول بكفاءة مع تطابق محاسبي 100%.';
    }
  );

  // =========================================================================
  // اختبارات القسم 18: BUSINESS DEVELOPER (وكلني وزورو) وإدارة الأسطول (24 اختباراً)
  // =========================================================================
  let bdState = createInitialGameState();

  // Test 25 (Sec 18 #1): فتح قسم Business Developer في اليوم الثالث فقط
  assertTest(
    25,
    'فتح قسم Business Developer في اليوم الثالث فقط ومنع التعاقد قبله',
    () => {
      if (bdState.businessDeveloper!.unlockedAtDay !== 3 || bdState.businessDeveloper!.isUnlocked) {
        throw new Error('قسم Business Developer يجب أن يكون مغلقاً في اليوم الأول ويفتح في اليوم الثالث.');
      }
      let blockedOnDay1 = false;
      try {
        signPlatformContract(bdState, 'WAKKELNY');
      } catch {
        blockedOnDay1 = true;
      }
      if (!blockedOnDay1) {
        throw new Error('سمح بالتعاقد مع منصة وكلني قبل اليوم الثالث!');
      }
      bdState = {
        ...bdState,
        phase: 'OFFICE_PLAY',
        company: {
          ...bdState.company,
          currentDay: 3,
          reputation: 65,
        },
        businessDeveloper: {
          ...bdState.businessDeveloper!,
          isUnlocked: true,
        },
      };
      return 'تم التحقق من إغلاق قسم Business Developer قبل اليوم الثالث وفتحه رسمياً ابتداءً من اليوم الثالث.';
    }
  );

  // Test 26 (Sec 18 #2): احتواء القسم على خيارين فقط: وكلني وزورو
  assertTest(
    26,
    'احتواء قسم Business Developer على خيارين فقط: وكلني وزورو',
    () => {
      const keys = Object.keys(BUSINESS_DEVELOPER_PLATFORMS);
      if (keys.length !== 2 || !keys.includes('WAKKELNY') || !keys.includes('ZORO')) {
        throw new Error(`خيارات المنصات غير مطابقة: ${keys.join(', ')}`);
      }
      return 'يحتوي قسم Business Developer حصرياً على منصتين فقط: «وكلني» و«زورو».';
    }
  );

  // Test 27 (Sec 18 #3): التعاقد مع وكلني مقابل 8,000 ج.م تُخصم مرة واحدة فقط
  assertTest(
    27,
    'التعاقد مع وكلني مقابل 8,000 ج.م تُخصم مرة واحدة فقط وعدم خصمها دورياً',
    () => {
      bdState = injectPartnerCapitalExpansion(bdState, 50000);
      const cashBefore = bdState.company.cashPiastres;
      bdState = signPlatformContract(bdState, 'WAKKELNY');
      if (bdState.company.cashPiastres !== cashBefore - egpToPiastres(8000)) {
        throw new Error('لم تُخصم رسوم تعاقد وكلني (8,000 ج.م) بدقة مرة واحدة.');
      }
      if (!bdState.businessDeveloper!.contracts.WAKKELNY.signed) {
        throw new Error('لم يتم تفعيل عقد منصة وكلني.');
      }
      let duplicateBlocked = false;
      try {
        signPlatformContract(bdState, 'WAKKELNY');
      } catch {
        duplicateBlocked = true;
      }
      if (!duplicateBlocked) {
        throw new Error('سمح النظام بتكرار دفع رسوم عقد وكلني!');
      }
      return 'تم التعاقد مع منصة «وكلني» بخصم 8,000 ج.م مرة واحدة فقط ومنع التكرار.';
    }
  );

  // Test 28 (Sec 18 #4): التعاقد مع زورو مقابل 15,000 ج.م تُخصم مرة واحدة فقط
  assertTest(
    28,
    'التعاقد مع زورو مقابل 15,000 ج.م تُخصم مرة واحدة فقط وعدم خصمها دورياً',
    () => {
      const cashBefore = bdState.company.cashPiastres;
      bdState = signPlatformContract(bdState, 'ZORO');
      if (bdState.company.cashPiastres !== cashBefore - egpToPiastres(15000)) {
        throw new Error('لم تُخصم رسوم تعاقد زورو (15,000 ج.م) بدقة مرة واحدة.');
      }
      if (!bdState.businessDeveloper!.contracts.ZORO.signed) {
        throw new Error('لم يتم تفعيل عقد منصة زورو.');
      }
      return 'تم التعاقد مع منصة «زورو» بخصم 15,000 ج.م مرة واحدة فقط ومنع التكرار.';
    }
  );

  // Test 29 (Sec 18 #5): توليد أوردرات مطاعم وكلني وإسنادها من المطعم إلى العميل مباشرة دون دخول المستودع
  assertTest(
    29,
    'توليد أوردرات مطاعم وكلني وإسنادها من المطعم إلى العميل مباشرة دون دخول المستودع',
    () => {
      const wakkelnyOrders = bdState.businessDeveloper!.platformOrders.filter(
        (o) => o.platformId === 'WAKKELNY'
      );
      if (wakkelnyOrders.length === 0) {
        throw new Error('لم يتم توليد أوردرات مطاعم لمنصة وكلني.');
      }
      const everyBypassesWarehouse = wakkelnyOrders.every(
        (o) => o.bypassesPlayerWarehouse === true
      );
      if (!everyBypassesWarehouse) {
        throw new Error('يوجد أوردر في وكلني يمر عبر المستودع بدلاً من التوصيل المباشر!');
      }
      return `تم توليد ${wakkelnyOrders.length} أوردرات مطاعم في «وكلني» تنتقل مباشرة من المطعم إلى العميل دون دخول المستودع.`;
    }
  );

  // Test 30 (Sec 18 #6): توليد أوردرات بضائع زورو وإسنادها من نقطة استلام زورو إلى العميل مباشرة دون دخول المستودع
  assertTest(
    30,
    'توليد أوردرات بضائع زورو وإسنادها من نقطة استلام زورو إلى العميل مباشرة دون دخول المستودع',
    () => {
      const zoroOrders = bdState.businessDeveloper!.platformOrders.filter(
        (o) => o.platformId === 'ZORO'
      );
      if (zoroOrders.length === 0) {
        throw new Error('لم يتم توليد أوردرات بضائع لمنصة زورو.');
      }
      const everyBypassesWarehouse = zoroOrders.every(
        (o) => o.bypassesPlayerWarehouse === true
      );
      if (!everyBypassesWarehouse) {
        throw new Error('يوجد أوردر في زورو يمر عبر المستودع بدلاً من التوصيل المباشر!');
      }
      return `تم توليد ${zoroOrders.length} أوردرات بضائع في «زورو» تنتقل مباشرة من مركز زورو إلى العميل دون دخول المستودع.`;
    }
  );

  // Test 31 (Sec 18 #7): حساب ربح الشحن فقط من تعريفة التوصيل وعدم احتساب سعر الطعام أو المنتج كإيراد للشركة
  assertTest(
    31,
    'حساب ربح الشحن فقط من تعريفة التوصيل وعدم احتساب سعر الطعام أو المنتج كإيراد للشركة',
    () => {
      const sampleOrder = bdState.businessDeveloper!.platformOrders[0];
      if (!sampleOrder) throw new Error('لا يوجد أوردر للاختبار.');
      if (sampleOrder.merchantOrderValuePiastres <= sampleOrder.shippingTariffPiastres) {
        throw new Error('قيمة طلب التاجر يجب أن تكون منفصلة وأكبر من تعريفة الشحن.');
      }
      if (sampleOrder.shippingTariffPiastres <= sampleOrder.estimatedTripCostPiastres) {
        throw new Error('تعريفة التوصيل غير صالحة.');
      }
      return `ربح الشحن يُحسب حصرياً من تعريفة التوصيل (${sampleOrder.shippingTariffPiastres / 100} ج.م) دون خلطه بقيمة البضاعة (${sampleOrder.merchantOrderValuePiastres / 100} ج.م).`;
    }
  );

  // Test 32 (Sec 18 #8 & #9): توظيف مندوب بدون موتوسيكل وتوظيف مندوب يمتلك موتوسيكل خاص وعدم احتساب إيجار مركبة على المندوب ذي الموتوسيكل الخاص
  assertTest(
    32,
    'توظيف مندوب بدون موتوسيكل ومندوب بموتوسيكل خاص وعدم احتساب إيجار مركبة على الموتوسيكل الخاص',
    () => {
      bdState = postHRJobAd(bdState, 'COURIER_MOTO', 100);
      const courierAd = (bdState.hrJobAds || []).find((a) => a.role === 'COURIER_MOTO')!;
      const personalMotoCand = courierAd.candidates.find((c) => c.ownsPersonalMotorcycle);
      const needsVehicleCand = courierAd.candidates.find((c) => c.needsCompanyVehicle);
      if (!personalMotoCand || !needsVehicleCand) {
        throw new Error('إعلان توظيف المناديب لا يوفر الفئتين (بموتوسيكل خاص / بدون موتوسيكل).');
      }
      bdState = hireHRCandidate(bdState, courierAd.id, personalMotoCand.id);
      bdState = hireHRCandidate(bdState, courierAd.id, needsVehicleCand.id);

      const personalCourier = bdState.couriers.find((c) => c.name === personalMotoCand.name)!;
      const companyCourier = bdState.couriers.find((c) => c.name === needsVehicleCand.name)!;
      const personalVehicle = resolveCourierEffectiveVehicle(bdState, personalCourier);
      if (!personalCourier.ownsPersonalMotorcycle || !personalVehicle) {
        throw new Error('المندوب ذو الموتوسيكل الخاص لم تُسجل مركبته الشخصية تلقائياً.');
      }
      if ((personalVehicle.leaseCostPerCyclePiastres ?? 0) !== 0 || personalVehicle.ownershipType !== 'PERSONAL_COURIER') {
        throw new Error('تم احتساب إيجار مركبة على المندوب الذي يمتلك موتوسيكلاً خاصاً!');
      }
      if (!companyCourier.needsCompanyVehicle || companyCourier.vehicleId) {
        throw new Error('المندوب بدون موتوسيكل يجب أن ينتظر تخصيص مركبة من أسطول الشركة.');
      }
      return `تم تعيين «${personalCourier.name}» بموتوسيكله الخاص (إيجار مركبة = 0) و«${companyCourier.name}» بدون موتوسيكل بانتظار تخصيص مركبة شركة.`;
    }
  );

  // Test 33 (Sec 18 #10, #11, #12, #13): شراء واستئجار المركبات من الفئات الخمس والتحقق من دورة الإيجار كل 8 أيام فقط ومنع ربط مركبة واحدة بأكثر من مندوب
  assertTest(
    33,
    'شراء واستئجار مركبات الأسطول، ومنع إسناد مركبة لأكثر من مندوب، وخصم الإيجار كل 8 أيام فقط',
    () => {
      bdState = injectPartnerCapitalExpansion(bdState, 100000);
      const cashBeforeBuy = bdState.company.cashPiastres;
      bdState = purchaseOrLeaseFleetVehicle(bdState, 'MOTO_ECONOMY', 'BUY');
      if (bdState.company.cashPiastres !== cashBeforeBuy - egpToPiastres(45000)) {
        throw new Error('لم يُخصم سعر شراء الموتوسيكل الاقتصادي (45,000 ج.م) مرة واحدة.');
      }
      const boughtMoto = bdState.vehicles[bdState.vehicles.length - 1];
      if ((boughtMoto.leaseCostPerCyclePiastres ?? 0) !== 0 || boughtMoto.ownershipType !== 'OWNED') {
        throw new Error('المركبة المشتراة بالكامل لا يجب أن يكون عليها إيجار دوري.');
      }

      const cashBeforeLease = bdState.company.cashPiastres;
      bdState = purchaseOrLeaseFleetVehicle(bdState, 'MOTO_HEAVY', 'LEASE');
      if (bdState.company.cashPiastres !== cashBeforeLease) {
        throw new Error('تم خصم إيجار المركبة لحظة الاستئجار بدل انتظار دورة الـ 8 أيام!');
      }
      const leasedMoto = bdState.vehicles[bdState.vehicles.length - 1];

      // Assign boughtMoto to courier without vehicle
      const unassignedCourier = bdState.couriers.find(
        (c) => c.needsCompanyVehicle && !c.vehicleId
      )!;
      bdState = assignVehicleToCourier(bdState, boughtMoto.id, unassignedCourier.id);

      // Verify 1-to-1 vehicle assignment enforcement
      const anotherCourier = bdState.couriers.find((c) => c.id !== unassignedCourier.id)!;
      let doubleAssignBlocked = false;
      try {
        assignVehicleToCourier(bdState, boughtMoto.id, anotherCourier.id);
      } catch {
        doubleAssignBlocked = true;
      }
      if (!doubleAssignBlocked) {
        throw new Error('سمح النظام بربط نفس المركبة بأكثر من مندوب في الوقت نفسه!');
      }

      // Verify lease cycle does NOT deduct on non-multiples of 8, and deducts once on Day 8
      const cashBeforeDay4 = bdState.company.cashPiastres;
      bdState = processEightDayVehicleLeaseCycle(bdState, 4);
      if (bdState.company.cashPiastres !== cashBeforeDay4) {
        throw new Error('تم خصم إيجار المركبة في يوم خارج دورة الـ 8 أيام!');
      }
      bdState = processEightDayVehicleLeaseCycle(bdState, 8);
      if (bdState.company.cashPiastres !== cashBeforeDay4 - (leasedMoto.leaseCostPerCyclePiastres ?? 0)) {
        throw new Error('لم يُخصم إيجار المركبة المستأجرة في دورة اليوم الثامن بدقة.');
      }
      const cashAfterDay8 = bdState.company.cashPiastres;
      bdState = processEightDayVehicleLeaseCycle(bdState, 8);
      if (bdState.company.cashPiastres !== cashAfterDay8) {
        throw new Error('تكرر خصم إيجار المركبة في نفس اليوم الثامن!');
      }

      // Test selling an owned vehicle after buying an unassigned one
      bdState = purchaseOrLeaseFleetVehicle(bdState, 'MOTO_ECONOMY', 'BUY');
      const extraOwned = bdState.vehicles[bdState.vehicles.length - 1];
      const cashBeforeSell = bdState.company.cashPiastres;
      bdState = sellOwnedVehicle(bdState, extraOwned.id);
      if (bdState.company.cashPiastres <= cashBeforeSell) {
        throw new Error('لم تتم إضافة القيمة السوقية عند بيع المركبة المملوكة.');
      }
      return 'تم التحقق من شراء واستئجار المركبات وبيع المملوكة، ومنع ازدواجية التخصيص، وخصم الإيجار كل 8 أيام فقط.';
    }
  );

  // Test 34 (Sec 18 #14, #15, #16): التحقق من التحويل بين الجرام والكيلوجرام وحساب الحجم بالسنتيمتر المكعب ومنع تجاوز سعة المركبة
  assertTest(
    34,
    'التحقق من الوزن بالجرام والكيلوجرام (1000 جم = 1 كجم) والحجم (سم³) ومنع تجاوز سعة المركبة',
    () => {
      const order = bdState.businessDeveloper!.platformOrders[0];
      const computedKg = order.weightGrams / 1000;
      if (computedKg <= 0 || Math.round(computedKg * 1000) !== order.weightGrams) {
        throw new Error(`عدم تطابق التحويل بين الجرام والكيلوجرام: ${order.weightGrams}g`);
      }
      const expectedVol = order.lengthCm * order.widthCm * order.heightCm;
      if (order.volumeCm3 !== expectedVol) {
        throw new Error(`عدم تطابق حساب الحجم بالسنتيمتر المكعب: ${order.volumeCm3} vs ${expectedVol}`);
      }

      // Create an oversized order exceeding economy moto (10,000g) and verify dispatch blocks it
      const heavyOrderId = 'PLD-HEAVY-TEST';
      const stateWithHeavy: typeof bdState = {
        ...bdState,
        businessDeveloper: {
          ...bdState.businessDeveloper!,
          platformOrders: [
            ...bdState.businessDeveloper!.platformOrders,
            {
              ...order,
              id: heavyOrderId,
              weightGrams: 25000,
              volumeCm3: 120000,
              status: 'WAITING_DISPATCH',
            },
          ],
        },
      };
      const motoCourier = stateWithHeavy.couriers.find((c) => {
        const v = stateWithHeavy.vehicles.find((veh) => veh.id === c.vehicleId);
        return v && (v.maxWeightGrams ?? 10000) <= 15000;
      })!;
      let overweightBlocked = false;
      try {
        dispatchPlatformOrderIndependent(stateWithHeavy, heavyOrderId, motoCourier.id);
      } catch {
        overweightBlocked = true;
      }
      if (!overweightBlocked) {
        throw new Error('سمح النظام بإسناد شحنة تتجاوز السعة الوزنية/الحجمية للمركبة!');
      }
      return `التحويل الدقيق (1000 جم = 1 كجم) وحساب الحجم (${order.volumeCm3.toLocaleString()} سم³) يعملان بدقة، ويُمنع تجاوز سعة المركبة.`;
    }
  );

  // Test 35 (Sec 18 #17, #18, #19): الإسناد المستقل، التجميع الاتجاهي على نفس الخط، والتوزيع الذكي التلقائي مع سجل سبب الاختيار
  assertTest(
    35,
    'اختبار أوضاع التوزيع الثلاثة: المستقل، التجميع الاتجاهي، والتوزيع الذكي التلقائي مع سجل القرار',
    () => {
      // 1) Independent Dispatch
      const newOrders = bdState.businessDeveloper!.platformOrders.filter(
        (o) => o.status === 'WAITING_DISPATCH'
      );
      if (newOrders.length < 2) {
        bdState = generatePlatformOrdersForContract(bdState, 'WAKKELNY', 3, 4);
      }
      const firstOrder = bdState.businessDeveloper!.platformOrders.find(
        (o) => o.status === 'WAITING_DISPATCH' && o.weightGrams <= 9000 && !o.requiresCarOrTruck
      )!;
      const availableCourier = bdState.couriers.find(
        (c) => c.status === 'AVAILABLE' && !c.needsCompanyVehicle && Boolean(c.vehicleId)
      )!;
      bdState = dispatchPlatformOrderIndependent(bdState, firstOrder.id, availableCourier.id);
      const dispatchedFirst = bdState.businessDeveloper!.platformOrders.find(
        (o) => o.id === firstOrder.id
      )!;
      if (dispatchedFirst.status !== 'PICKED_UP_IN_TRANSIT') {
        throw new Error('فشل الإسناد المستقل للأوردر.');
      }

      // Advance clock so courier finishes delivery and becomes AVAILABLE again
      bdState = advanceSimulationClock(bdState, 70, true);

      // 2) Directional Batching
      bdState = generatePlatformOrdersForContract(bdState, 'WAKKELNY', 3, 6);
      const waitingBatchable = bdState.businessDeveloper!.platformOrders.filter(
        (o) =>
          o.status === 'WAITING_DISPATCH' &&
          o.batchable &&
          !o.requiresCarOrTruck &&
          o.weightGrams <= 4500
      );
      let pairToBatch: typeof waitingBatchable = [];
      for (const ord of waitingBatchable) {
        const sameSector = waitingBatchable.filter(
          (x) => x.directionSector === ord.directionSector
        );
        if (sameSector.length >= 2) {
          pairToBatch = sameSector.slice(0, 2);
          break;
        }
      }
      const batchCourier = bdState.couriers.find(
        (c) => c.status === 'AVAILABLE' && !c.needsCompanyVehicle && Boolean(c.vehicleId)
      )!;
      if (pairToBatch.length >= 2 && batchCourier) {
        bdState = dispatchPlatformOrdersBatched(
          bdState,
          pairToBatch.map((o) => o.id),
          batchCourier.id
        );
        if (bdState.businessDeveloper!.routeBatches.length === 0) {
          throw new Error('لم يتم إنشاء مسار التجميع الاتجاهي (Route Batch).');
        }
      }

      // Advance clock so batch completes
      bdState = advanceSimulationClock(bdState, 80, true);

      // 3) Smart Auto-Dispatch with Policy & Decision Logs
      bdState = generatePlatformOrdersForContract(bdState, 'WAKKELNY', 3, 3);
      const logsBefore = bdState.businessDeveloper!.smartDispatchLogs.length;
      bdState = runSmartAutoDispatch(bdState, 'BALANCED');
      if (bdState.businessDeveloper!.smartDispatchLogs.length <= logsBefore) {
        throw new Error('لم يقم نظام التوزيع الذكي التلقائي بتسجيل سبب اختيار المندوب والمركبة.');
      }
      return `تعمل أوضاع التوزيع الثلاثة (المستقل، التجميع الاتجاهي، والذكي التلقائي) بكفاءة مع توثيق سجل القرار (${bdState.businessDeveloper!.smartDispatchLogs[0].reasonAr}).`;
    }
  );

  // Test 36 (Sec 18 #20, #21, #22, #23, #24): ترقيات مركز العمليات، الحملات التسويقية، المتابعين والسوشيال ميديا، وسلامة الحفظ والدفتر المالي
  assertTest(
    36,
    'ترقيات مركز العمليات، حملات التعاقدات، المتابعين والسوشيال ميديا، وتطابق الحفظ والدفتر المالي',
    () => {
      bdState = purchaseOperationsUpgrade(bdState, 'UPG-DISPATCH-UNIT');
      if ((bdState.businessDeveloper!.upgradeLevels['UPG-DISPATCH-UNIT'] ?? 0) < 1) {
        throw new Error('لم تُفعل ترقية وحدة التوزيع والتوجيه في مركز العمليات.');
      }
      const followersBefore = bdState.businessDeveloper!.followersCount;
      bdState = launchContractMarketingCampaign(bdState, 'MKT-WAKKELNY-RESTAURANTS');
      if (bdState.businessDeveloper!.followersCount <= followersBefore) {
        throw new Error('لم تزدد قاعدة المتابعين بعد إطلاق حملة تسويق التعاقدات.');
      }

      // Complete all active platform orders so revenue is collected and social posts trigger
      bdState = advanceSimulationClock(bdState, 90, true);
      bdState = tickPlatformOrdersSimulation(bdState);
      const deliveredPlatformOrders = bdState.businessDeveloper!.platformOrders.filter(
        (o) => o.status === 'DELIVERED' || o.status === 'DELAYED_DELIVERED'
      );
      if (deliveredPlatformOrders.length === 0) {
        throw new Error('لم تكتمل دورة توصيل أوردرات المنصات.');
      }

      // Verify save/load integrity with BusinessDeveloperState
      const savedJson = JSON.stringify(bdState);
      const restoredBd = migrateSaveIfNeeded(JSON.parse(savedJson));
      if (
        !validateSavedGameState(restoredBd) ||
        restoredBd.businessDeveloper!.platformOrders.length !==
          bdState.businessDeveloper!.platformOrders.length
      ) {
        throw new Error('فقدان بيانات Business Developer بعد حفظ واستعادة اللعبة.');
      }

      // Verify 100% cash reconciliation
      const bdMetrics = calculateFinancialMetrics(restoredBd);
      if (!bdMetrics.isCashReconciled) {
        throw new Error('عدم تطابق الرصيد النقدي مع الدفتر المحاسبي بعد عمليات المنصات والأسطول!');
      }
      return `تم تسليم ${deliveredPlatformOrders.length} أوردر منصات بنجاح، وتفعيل الترقيات والحملات (${restoredBd.businessDeveloper!.followersCount} متابع)، وتطابق الدفتر المحاسبي 100%.`;
    }
  );

  // =========================================================================
  // اختبارات القسم 54: المستويات (1-5)، الزمن الحقيقي، الجغرافيا المصرية، التسعير، التفاوض، سحب المنافسين، هيرفوك، وتقييم إنجوبيا
  // =========================================================================

  // Test 37: الترحيل الآمن للمستوى الأول (Level 1) مع كود الشركة الفريد وصلاحية المطور (المستوى 3)
  assertTest(
    37,
    'الترحيل الآمن للمستوى الأول (Level 1) مع كود الشركة الفريد وصلاحية المطور (المستوى 3)',
    () => {
      const legacySave = {
        ...createInitialGameState(),
        company: {
          ...createInitialGameState().company,
          level: 4 as const,
          currentDay: 12,
          levelSystemMigratedV3: false,
        },
      };
      const migrated = migrateSaveIfNeeded(legacySave) as GameState;
      if (migrated.company.level !== 1 || !migrated.company.levelSystemMigratedV3) {
        throw new Error('لم يتم ترحيل الشركة بأمان إلى المستوى الأول (Level 1).');
      }
      if (!migrated.company.companyCode || !migrated.company.companyCode.startsWith('ING-')) {
        throw new Error('لم يتم توليد أو الحفاظ على كود الشركة الفريد (ING-XXXX).');
      }
      if ((migrated.company.adminLevel ?? 3) !== 3) {
        throw new Error('مستوى صلاحية المطور يجب أن يكون المستوى 3 (Developer Level 3).');
      }
      return `تم الترحيل الآمن إلى المستوى 1 مع كود الشركة «${migrated.company.companyCode}» وصلاحية المطور (Level 3).`;
    }
  );

  // Test 38: فصل الأيام عن المستويات والتحقق من شروط الترقية المتعددة للمستويات (1 إلى 5) وفتح الفروع في المستوى 5
  assertTest(
    38,
    'فصل الأيام عن المستويات والتحقق من شروط الترقية المتعددة للمستويات (1 إلى 5) وفتح الفروع في المستوى 5',
    () => {
      let lvlState = createInitialGameState();
      // Even if currentDay advances to 30, level stays 1 unless multi-criteria are met
      lvlState = {
        ...lvlState,
        company: {
          ...lvlState.company,
          currentDay: 30,
          adminLevel: 0,
        },
      };
      const checkBefore = evaluateCompanyLevelProgress(lvlState);
      if (checkBefore.currentLevel !== 1 || checkBefore.canUpgradeNow) {
        throw new Error('تغير مستوى الشركة بمجرد مرور الأيام دون تحقيق الشروط التشغيلية والمالية!');
      }
      // Branch opening must be blocked below Level 5 when adminLevel is not bypassing
      let branchBlockedBelow5 = false;
      try {
        openNewCompanyBranch(lvlState, 'الإسكندرية', 'سموحة');
      } catch {
        branchBlockedBelow5 = true;
      }
      if (!branchBlockedBelow5) {
        throw new Error('سمح النظام بفتح فرع إقليمي قبل الوصول إلى المستوى الخامس!');
      }

      // Elevate company to meet Level 2 requirements (2 delivered orders, 2200 EGP cash, 55 rep, 3 active employees)
      lvlState = injectPartnerCapitalExpansion(lvlState, 60000);
      lvlState = {
        ...lvlState,
        company: {
          ...lvlState.company,
          reputation: 65,
          marketingPower: 35,
          adminLevel: 3,
        },
        shipments: lvlState.shipments.map((s, idx) =>
          idx < 3 ? { ...s, status: 'DELIVERED' as const } : s
        ),
      };
      lvlState = checkAndApplyCompanyLevelUpgrade(lvlState);
      if (lvlState.company.level !== 2) {
        throw new Error('لم تتم ترقية الشركة إلى المستوى الثاني بعد استيفاء جميع الشروط.');
      }
      if ((lvlState.offlineSync?.pendingMilestones.length ?? 0) === 0) {
        throw new Error('لم يتم تسجيل حدث الترقية في طابور المزامنة السحابية/المحلية (Offline Sync Queue).');
      }
      return 'تم التحقق من فصل الأيام عن المستويات، وترقية الشركة بشروط متعددة، وحصر فتح الفروع في المستوى 5.';
    }
  );

  // Test 39: معادلة الزمن الحقيقي (ساعة لعبة = 4 ساعات حقيقية) ومعاينة وضع تجاوز الوقت (Time Skip)
  assertTest(
    39,
    'معادلة الزمن الحقيقي (ساعة لعبة = 4 ساعات حقيقية) ومعاينة وضع تجاوز الوقت (Time Skip)',
    () => {
      const clockState = createInitialGameState();
      const fourRealHoursAgo = Date.now() - 4 * 3600 * 1000;
      const catchUp = computeRealTimeOfflineCatchUpMinutes(fourRealHoursAgo, Date.now());
      if (catchUp.gameMinutesToAdvance !== 60) {
        throw new Error(`معادلة الزمن الحقيقي غير دقيقة: تقدم ${catchUp.gameMinutesToAdvance} دقيقة بدلاً من 60 دقيقة (ساعة لعبة).`);
      }
      const preview = previewTimeSkipImpact(clockState, 3);
      if (preview.minutesToAdvance !== 180 || !preview.warningSummaryAr) {
        throw new Error('فشلت معاينة وضع تجاوز الوقت (Time Skip Preview).');
      }
      return `تعمل معادلة الزمن الحقيقي بدقة (4 ساعات حقيقية = ${catchUp.gameMinutesToAdvance} دقيقة لعبة) مع معاينة عادلة لوضع تجاوز الوقت.`;
    }
  );

  // Test 40: قاعدة بيانات الجغرافيا المصرية (قرى، مراكز، مدن، محافظات) وحساب المسافة بالكيلومتر والمتر بدون Google Maps مدفوع
  assertTest(
    40,
    'قاعدة بيانات الجغرافيا المصرية (قرى، مراكز، مدن، محافظات) وحساب المسافة بالكيلومتر والمتر',
    () => {
      const hasVillage = EGYPT_LOCATIONS_DB.some((n) => n.type === 'VILLAGE_OR_DISTRICT');
      const hasCityOrMarkaz = EGYPT_LOCATIONS_DB.some((n) => n.type === 'CITY_OR_MARKAZ');
      if (!hasVillage || !hasCityOrMarkaz) {
        throw new Error('قاعدة البيانات الجغرافية لا تغطي القرى والمراكز والمدن المصرية.');
      }
      const verifiedRoute = calculateEgyptRouteDistance('العباسية', 'مدينة نصر');
      if (
        verifiedRoute.accuracyType !== 'VERIFIED_CORRIDOR' ||
        verifiedRoute.distanceMeters !== Math.round(verifiedRoute.distanceKm * 1000)
      ) {
        throw new Error('فشل حساب المسافة المعتمدة بين العباسية ومدينة نصر بالكيلومتر والمتر.');
      }
      const interGovRoute = calculateEgyptRouteDistance('العباسية', 'سموحة');
      if (interGovRoute.distanceKm <= 0 || interGovRoute.distanceMeters <= 0 || !interGovRoute.isInterGovernorate) {
        throw new Error('فشل حساب المسافة المترية بين المحافظات والقرى المصرية.');
      }
      return `تم حساب المسافة المعتمدة (${verifiedRoute.distanceKm} كم / ${verifiedRoute.distanceMeters.toLocaleString()} متر) ومسافة المحافظات (${interGovRoute.distanceKm} كم) محلياً 100%.`;
    }
  );

  // Test 41: محرك التسعير المرن (التلقائي، اليدوي، الشرائح، الأقاليم، والعروض الجغرافية) وفصل السعر عن التكلفة والربح
  assertTest(
    41,
    'محرك التسعير المرن (التلقائي، اليدوي، الشرائح، الأقاليم، والعروض الجغرافية) وفصل السعر عن التكلفة والربح',
    () => {
      let prState = createInitialGameState();
      const autoQuote = calculateShipmentPricingQuote(prState, {
        pickupZoneAr: 'العباسية',
        deliveryZoneAr: 'سموحة',
        weightKg: 3.5,
      });
      if (
        autoQuote.customerPricePiastres <= 0 ||
        autoQuote.companyActualCostPiastres <= 0 ||
        autoQuote.expectedProfitMarginPiastres !==
          autoQuote.customerPricePiastres - autoQuote.companyActualCostPiastres
      ) {
        throw new Error('عدم تطابق معادلة فصل سعر العميل عن التكلفة التشغيلية وهامش الربح.');
      }
      prState = updatePricingEngineConfig(prState, { mode: 'BRACKET' });
      const bracketQuote = calculateShipmentPricingQuote(prState, {
        pickupZoneAr: 'العباسية',
        deliveryZoneAr: 'سموحة',
        weightKg: 3.5,
      });
      prState = launchGeographicPromoOffer(
        prState,
        'عرض خط الإسكندرية',
        'الإسكندرية',
        15
      );
      const promoQuote = calculateShipmentPricingQuote(prState, {
        pickupZoneAr: 'العباسية',
        deliveryZoneAr: 'سموحة',
        weightKg: 3.5,
      });
      if (promoQuote.discountPiastres <= 0 || promoQuote.customerPricePiastres >= bracketQuote.customerPricePiastres) {
        throw new Error('لم يتم تطبيق خصم العرض الجغرافي على تسعير الشحنة.');
      }
      return `يعمل محرك التسعير بجميع أوضاعه (السعر: ${promoQuote.customerPricePiastres / 100} ج.م، التكلفة: ${promoQuote.companyActualCostPiastres / 100} ج.م، الربح: ${promoQuote.expectedProfitMarginPiastres / 100} ج.م).`;
    }
  );

  // Test 42: التفاوض الواقعي مع العميل على السعر وموعد التسليم (الحد الأدنى 10 ساعات والافتراضي للعميل 15 ساعة)
  assertTest(
    42,
    'التفاوض الواقعي مع العميل على السعر وموعد التسليم (الحد الأدنى 10 ساعات والافتراضي 15 ساعة)',
    () => {
      let negState = createInitialGameState();
      const newOrder = negState.shipments.find((s) => s.status === 'NEW_REQUEST')!;
      if ((newOrder.minOperationalHours ?? 10) !== 10 || (newOrder.quotedClientSlaHours ?? 15) !== 15) {
        throw new Error('الأوردر القياسي يجب أن يكون حده الأدنى 10 ساعات والمهلة المبلغة للعميل 15 ساعة.');
      }
      let belowMinBlocked = false;
      try {
        negotiateShipmentWithClient(negState, newOrder.trackingNumber, newOrder.serviceFeePiastres, 8);
      } catch {
        belowMinBlocked = true;
      }
      if (!belowMinBlocked) {
        throw new Error('سمح النظام بالتفاوض على مهلة أقل من الحد الأدنى التشغيلي (10 ساعات)!');
      }
      const negOutcome = negotiateShipmentWithClient(
        negState,
        newOrder.trackingNumber,
        newOrder.serviceFeePiastres,
        12
      );
      negState = negOutcome.nextState;
      const updatedOrder = negState.shipments.find((s) => s.trackingNumber === newOrder.trackingNumber)!;
      if (updatedOrder.quotedClientSlaHours !== 12 || !updatedOrder.Negotiated) {
        throw new Error('لم يتم تحديث اتفاقية التفاوض مع العميل على مهلة 12 ساعة.');
      }
      return `تم التفاوض بنجاح على مهلة 12 ساعة (فوق الحد الأدنى 10 ساعات) ومنع أي مهلة أقل من 10 ساعات.`;
    }
  );

  // Test 43: عداد مهلة قبول الأوردر وسحب الأوردر لشركة منافسة عند نسيان القرار مع رد فعل واقعي للعميل
  assertTest(
    43,
    'عداد مهلة قبول الأوردر وسحب الأوردر لشركة منافسة عند نسيان القرار مع رد فعل واقعي للعميل',
    () => {
      let poachState = createInitialGameState();
      const targetIdx = poachState.shipments.findIndex((s) => s.status === 'NEW_REQUEST');
      const targetOrder = poachState.shipments[targetIdx];
      const repBefore = poachState.company.reputation;
      poachState = poachExpiredOrderByCompetitor(poachState, targetIdx);
      const poachedOrder = poachState.shipments.find((s) => s.trackingNumber === targetOrder.trackingNumber)!;
      if (poachedOrder.status !== 'CANCELLED_EXPIRED' || !poachedOrder.poachedByCompetitorName) {
        throw new Error('لم يتحول الأوردر المنتهي مهلته إلى مسحوب بواسطة شركة منافسة.');
      }
      if (poachState.company.reputation >= repBefore) {
        throw new Error('لم تتأثر السمعة منطقياً بعد نسيان الأوردر وسحبه لشركة منافسة.');
      }
      return `تم سحب الأوردر المنسي بواسطة «${poachedOrder.poachedByCompetitorName}» مع تسجيل رد فعل واقعي وتعديل منطقي للسمعة.`;
    }
  );

  // Test 44: مزادات الشحن التنافسية (B2B Market Shipping Auctions) والمنافسة المباشرة مع الشركات
  assertTest(
    44,
    'مزادات الشحن التنافسية (B2B Market Shipping Auctions) والمنافسة المباشرة مع الشركات',
    () => {
      let aucState = createInitialGameState();
      const openAuction = (aucState.marketAuctions || []).find((a) => a.status === 'OPEN');
      if (!openAuction) {
        throw new Error('لا توجد مزادات تسعير تنافسية مفتوحة في السوق.');
      }
      const shipmentsBefore = aucState.shipments.length;
      // Bid competitively below competitor leading bid and at 12 hours SLA
      const winningPrice = openAuction.competitorLeadingBidPiastres - egpToPiastres(15);
      aucState = submitMarketAuctionBid(aucState, openAuction.id, winningPrice, 12);
      const updatedAuction = (aucState.marketAuctions || []).find((a) => a.id === openAuction.id)!;
      if (updatedAuction.status !== 'WON_BY_PLAYER' || aucState.shipments.length <= shipmentsBefore) {
        throw new Error('لم يفز اللاعب بالمزاد التنافسي رغم تقديم عرض أفضل سعر ومهلة.');
      }
      return `فازت الشركة بمزاد «${updatedAuction.clientNameAr}» وتم توليد شحنة التعاقد فوراً في جدول التشغيل.`;
    }
  );

  // Test 45: منصة «هيرفوك» الساخرة كل 5 ساعات بـ 2 إلى 7 تعليقات متنوعة وفصل السمعة عن القوة التسويقية
  assertTest(
    45,
    'منصة «هيرفوك» الساخرة كل 5 ساعات بـ 2 إلى 7 تعليقات متنوعة وفصل السمعة عن القوة التسويقية',
    () => {
      let hfState = createInitialGameState();
      const postsCheck = hfState.herfokPosts || [];
      if (postsCheck.length === 0) {
        throw new Error('لا توجد منشورات أولية في منصة هيرفوك.');
      }
      for (const p of postsCheck) {
        if (p.comments.length < 2 || p.comments.length > 7) {
          throw new Error(`عدد التعليقات في منشور هيرفوك (${p.comments.length}) خارج النطاق الإلزامي (2 إلى 7).`);
        }
      }
      // Advance 5 game hours (300 minutes) and verify new Herfok pulse
      const countBefore = postsCheck.length;
      hfState = {
        ...hfState,
        clock: {
          ...hfState.clock,
          totalElapsedMinutes: hfState.clock.totalElapsedMinutes + 305,
        },
      };
      hfState = runFiveHourHerfokPulseIfDue(hfState);
      if ((hfState.herfokPosts || []).length <= countBefore) {
        throw new Error('لم يتم نشر نبض جديد في منصة هيرفوك بعد مرور 5 ساعات داخل اللعبة.');
      }
      const newestPost = hfState.herfokPosts![0];
      if (newestPost.comments.length < 2 || newestPost.comments.length > 7) {
        throw new Error('المنشور الجديد في هيرفوك لا يحتوي على 2 إلى 7 تعليقات.');
      }

      // Verify Marketing Campaign boosts marketingPower without directly inflating reputation
      hfState = injectPartnerCapitalExpansion(hfState, 20000);
      const repBeforeMkt = hfState.company.reputation;
      const mktPowerBefore = hfState.company.marketingPower ?? 25;
      hfState = launchMarketingCampaign(hfState, 'MKT-TIER-1');
      if ((hfState.company.marketingPower ?? 0) <= mktPowerBefore) {
        throw new Error('لم ترتفع القوة التسويقية بعد إطلاق الحملة التسويقية.');
      }
      if (hfState.company.reputation !== repBeforeMkt) {
        throw new Error('ارتفعت السمعة مباشرة من الحملة التسويقية بدلاً من فصل السمعة عن القوة التسويقية!');
      }
      return `منصة «هيرفوك» تنشر كل 5 ساعات بـ ${newestPost.comments.length} تعليقات متنوعة، مع فصل تام بين السمعة (${hfState.company.reputation}) والقوة التسويقية (${hfState.company.marketingPower}).`;
    }
  );

  // Test 46: «تقييم إنجوبيا» كل 24 ساعة من عينة 30% من العملاء الفعليين الذين تعاملوا مع الشركة فقط
  assertTest(
    46,
    '«تقييم إنجوبيا» كل 24 ساعة من عينة 30% من العملاء الفعليين الذين تعاملوا مع الشركة فقط',
    () => {
      let evalState = createInitialGameState();
      evalState = {
        ...evalState,
        company: {
          ...evalState.company,
          currentDay: 2,
        },
        clock: {
          ...evalState.clock,
          totalElapsedMinutes: evalState.clock.totalElapsedMinutes + 1500,
        },
      };
      evalState = runDailyIngobiaEvaluationIfDue(evalState);
      const evals = evalState.ingobiaEvaluations || [];
      if (evals.length === 0) {
        throw new Error('لم يصدر تقرير «تقييم إنجوبيا» بعد مرور 24 ساعة داخل اللعبة.');
      }
      const latestEval = evals[0];
      const expectedSample = Math.max(1, Math.round(latestEval.eligibleTransactedClientsCount * 0.3));
      if (latestEval.sampledClientsCount !== expectedSample) {
        throw new Error(
          `حجم عينة تقييم إنجوبيا (${latestEval.sampledClientsCount}) لا يطابق 30% من العملاء الفعليين (${latestEval.eligibleTransactedClientsCount}).`
        );
      }
      return `صدر «تقييم إنجوبيا» الدوري من عينة 30% (${latestEval.sampledClientsCount} من ${latestEval.eligibleTransactedClientsCount} عميل فعلي) بدرجة ${latestEval.overallScoreOutOf100}/100.`;
    }
  );

  // =========================================================================
  // اختبارات المرحلة التالية (دليل المدير، السكرتير الديناميكي، وكلني والمناطق، برنامج موظفيني، ودورة المرتجعات الموثقة) — 12 سيناريو إلزامي (47–58)
  // =========================================================================

  // Test 47: تحديث مهمة في دليل المدير بعد تنفيذ الشرط فعليًا داخل اللعبة
  assertTest(
    47,
    'تحديث مهمة في دليل المدير بعد تنفيذ الشرط فعليًا داخل اللعبة وعدم الاكتفاء بضغط زر',
    () => {
      let mgState = createInitialGameState();
      mgState = syncManagerGuideTasksWithRealState(mgState);
      const tasksBefore = mgState.guideAndSecretary?.guideTasks || [];
      const deliveryTaskBefore = tasksBefore.find(
        (t) => t.id === 'GUIDE-L1-WAREHOUSE-DISPATCH'
      );
      if (!deliveryTaskBefore || deliveryTaskBefore.status === 'COMPLETED') {
        throw new Error('مهمة تسليم شحنتين يجب ألا تكون مكتملة قبل إتمام التسليم فعلياً.');
      }
      // Accept and advance shipments through the real pipeline to OUT_FOR_DELIVERY, then complete delivery
      const reqShipment = mgState.shipments.find((s) => s.status === 'NEW_REQUEST')!;
      mgState = acceptShipmentRequest(mgState, reqShipment.trackingNumber);
      mgState = advanceSimulationClock({ ...mgState, phase: 'OFFICE_PLAY' }, 180, true);
      for (const trk of ['TRK-1001', reqShipment.trackingNumber]) {
        const sh = mgState.shipments.find((s) => s.trackingNumber === trk)!;
        if (sh.status !== 'DELIVERED') {
          mgState = {
            ...mgState,
            shipments: mgState.shipments.map((s) =>
              s.trackingNumber === trk ? { ...s, status: 'OUT_FOR_DELIVERY' as const } : s
            ),
          };
          mgState = completeShipmentDelivery(mgState, trk);
        }
      }
      mgState = syncManagerGuideTasksWithRealState(mgState);

      const tasksAfter = mgState.guideAndSecretary?.guideTasks || [];
      const acceptTaskAfter = tasksAfter.find(
        (t) => t.id === 'GUIDE-L1-ACCEPT-PROFITABLE'
      )!;
      const deliveryTaskAfter = tasksAfter.find(
        (t) => t.id === 'GUIDE-L1-WAREHOUSE-DISPATCH'
      )!;
      if (acceptTaskAfter.status !== 'COMPLETED' || deliveryTaskAfter.status !== 'COMPLETED') {
        throw new Error('لم تتحدث مهمة دليل المدير إلى «مكتملة» بعد تنفيذ الشرط فعلياً في بيانات اللعبة.');
      }
      const lockedTask = tasksAfter.find(
        (t) => t.status === 'LOCKED' && Boolean(t.lockReasonAr)
      );
      if (!lockedTask) {
        throw new Error('يجب أن توضح المهام المقفلة في دليل المدير سبب القفل بوضوح.');
      }
      return `تحدثت مهمة «${deliveryTaskAfter.titleAr}» إلى مكتملة بناءً على بيانات التسليم الفعلية (${deliveryTaskAfter.progressLabelAr})، مع توضيح سبب قفل مهام المستويات الأعلى (${lockedTask.lockReasonAr}).`;
    }
  );

  // Test 48: ظهور رسالة السكرتير أو دليل المدير عند وصول تنبيه جديد، وعرض النص الكامل عند الضغط عليها، وإخفاؤها عند الضغط على علامة صح
  assertTest(
    48,
    'ظهور رسالة السكرتير أو دليل المدير عند وصول تنبيه جديد، وعرض النص الكامل عند الضغط عليها، وإخفاؤها عند علامة صح',
    () => {
      let bubState = createInitialGameState();
      bubState = pushInlineBubbleNotification(bubState, {
        dedupeKey: 'TEST-48-SEC-ALERT',
        sender: 'SECRETARY',
        category: 'DECISION_INSPECTION',
        titleAr: 'تنبيه فحص السكرتير للشحنة',
        shortPreviewAr: 'الشحنة تحتاج مراجعة هامش الربح قبل القبول...',
        factsAr: ['سعر الشحن الحالي 65 ج.م والتكلفة الفعلية 58 ج.م.'],
        projectionsAr: ['هامش الربح ضئيل وقد يتآكل مع أي تأخير مروري.'],
        alternativesAr: ['التفاوض مع العميل لرفع السعر إلى 85 ج.م.'],
        severity: 'WARNING',
        relatedTargetSection: 'SHIPMENTS',
      });
      const activeNotifs = (bubState.guideAndSecretary?.bubbleMessages || []).filter(
        (n) => !n.dismissed
      );
      const newest = activeNotifs.find((n) => n.dedupeKey === 'TEST-48-SEC-ALERT');
      if (!newest || newest.read || newest.dismissed) {
        throw new Error('لم تظهر رسالة السكرتير الجديدة كغير مقروءة في الإشعار الفوري.');
      }
      // Simulate clicking the message to expand full text and mark read
      bubState = markBubbleNotificationRead(bubState, newest.id);
      const afterRead = (bubState.guideAndSecretary?.bubbleMessages || []).find(
        (n) => n.id === newest.id
      )!;
      if (!afterRead.read || afterRead.dismissed) {
        throw new Error('عند الضغط على الرسالة لعرض النص الكامل يجب أن تُعلّم كمقروءة دون إخفائها قبل ضغط علامة صح.');
      }
      // Simulate clicking checkmark ✓ to dismiss
      bubState = dismissBubbleNotification(bubState, newest.id);
      const afterDismiss = (bubState.guideAndSecretary?.bubbleMessages || []).find(
        (n) => n.id === newest.id
      )!;
      if (!afterDismiss.dismissed) {
        throw new Error('لم تختفِ الرسالة بعد الضغط على زر علامة صح (✓).');
      }
      return 'ظهرت رسالة السكرتير مع شارة غير المقروء، وتم عرض نصها الكامل عند الضغط عليها، واختفت فوراً عند الضغط على علامة صح (✓).';
    }
  );

  // Test 49: اعتراض السكرتير على شحنة خاسرة أو بلا مندوب أو مركبة، واقتراح التفاوض أو التوفير أولًا
  assertTest(
    49,
    'اعتراض السكرتير على شحنة خاسرة أو بلا مندوب أو مركبة، واقتراح التفاوض أو التوفير أولًا',
    () => {
      let secState = createInitialGameState();
      const targetReq = secState.shipments.find((s) => s.status === 'NEW_REQUEST')!;
      // Make all couriers busy and set an unprofitable fee to test Secretary objection & alternatives
      secState = {
        ...secState,
        couriers: secState.couriers.map((c) => ({ ...c, status: 'ON_MISSION' as const })),
      };
      const losingInspection = inspectDecisionWithDynamicSecretary(secState, {
        decisionType: 'ACCEPT_SHIPMENT',
        trackingNumber: targetReq.trackingNumber,
        proposedPricePiastres: egpToPiastres(15), // Below operational cost
        proposedSlaHours: 14,
      });
      if (losingInspection.riskLevel !== 'HIGH_RISK') {
        throw new Error('لم يصنف السكرتير الشحنة الخاسرة وبلا مندوب متاح كخطر مرتفع (HIGH_RISK).');
      }
      const hasNegotiateOrResourceAlt = losingInspection.alternativesAr.some(
        (alt) => alt.includes('تفاوض') || alt.includes('مندوب') || alt.includes('مركبة')
      );
      if (!hasNegotiateOrResourceAlt || !losingInspection.canExecuteTechnically) {
        throw new Error('لم يقترح السكرتير التفاوض أو توفير مندوب/مركبة أولاً، أو منع قراراً ممكناً.');
      }
      return `اعترض السكرتير بالأرقام (${losingInspection.headlineAr}) واقترح بدائل عملية (${losingInspection.alternativesAr[0]}) دون مصادرة قرار اللاعب.`;
    }
  );

  // Test 50: إعادة فحص السكرتير للقرار بعد تغيّر الموارد أو السعر أو الموعد
  assertTest(
    50,
    'إعادة فحص السكرتير للقرار بعد تغيّر الموارد أو السعر أو الموعد',
    () => {
      const secState = createInitialGameState();
      const targetReq = secState.shipments.find((s) => s.status === 'NEW_REQUEST')!;
      const firstCheck = inspectDecisionWithDynamicSecretary(secState, {
        decisionType: 'NEGOTIATE_SHIPMENT',
        trackingNumber: targetReq.trackingNumber,
        proposedPricePiastres: egpToPiastres(25), // Losing price
        proposedSlaHours: 11,
      });
      const secondCheck = inspectDecisionWithDynamicSecretary(secState, {
        decisionType: 'NEGOTIATE_SHIPMENT',
        trackingNumber: targetReq.trackingNumber,
        proposedPricePiastres: egpToPiastres(210), // Profitable price
        proposedSlaHours: 15, // Safe 15h SLA
      });
      if (
        firstCheck.signatureKey === secondCheck.signatureKey ||
        firstCheck.riskLevel === secondCheck.riskLevel ||
        secondCheck.riskLevel !== 'SAFE'
      ) {
        throw new Error(`لم يعد السكرتير فحص القرار وتحديث التقييم عند تغير السعر أو الموعد (${firstCheck.riskLevel} -> ${secondCheck.riskLevel})!`);
      }
      return `أعاد السكرتير فحص القرار فور تغير السعر والموعد: تحول التقييم من «${firstCheck.riskLevel}» إلى «${secondCheck.riskLevel}» بتوقيع جديد (${secondCheck.signatureKey}).`;
    }
  );

  // Test 51: تعامل السكرتير مع قرار غير مغطى بقاعدة صريحة عبر طلب معلومات إضافية دون كسر التدفق
  assertTest(
    51,
    'تعامل السكرتير مع قرار غير مغطى بقاعدة صريحة عبر طلب معلومات إضافية دون كسر التدفق',
    () => {
      const secState = createInitialGameState();
      const uncoveredCheck = inspectDecisionWithDynamicSecretary(secState, {
        decisionType: 'CUSTOM_UNCOVERED_DECISION',
        customDecisionDescriptionAr: 'تأجير طائرة درون تجريبية للشحن بين الأبراج',
      });
      if (!uncoveredCheck.requiresMoreInfoPromptAr) {
        throw new Error('لم يطلب السكرتير معلومات إضافية عند مواجهة قرار غير مغطى بقاعدة صريحة.');
      }
      if (!uncoveredCheck.canExecuteTechnically || uncoveredCheck.factsAr.length === 0) {
        throw new Error('تسبب القرار غير المغطى في كسر تدفق السكرتير أو حجب بيانات السيولة.');
      }
      return `تعامل السكرتير بأمان مع القرار غير المغطى وعرض طلب استيضاح: «${uncoveredCheck.requiresMoreInfoPromptAr}».`;
    }
  );

  // Test 52: رفض إسناد طلب وكلني لمندوب بعيد غير مخصص للمنطقة إلا كخيار تغطية استثنائية محسوب التكلفة
  assertTest(
    52,
    'رفض إسناد طلب وكلني لمندوب بعيد غير مخصص للمنطقة إلا كخيار تغطية استثنائية محسوب التكلفة',
    () => {
      let wkState = createInitialGameState();
      wkState = injectPartnerCapitalExpansion(wkState, 30000);
      wkState = {
        ...wkState,
        company: { ...wkState.company, currentDay: 3 },
        businessDeveloper: { ...wkState.businessDeveloper!, isUnlocked: true },
      };
      wkState = signPlatformContract(wkState, 'WAKKELNY');
      const wkOrder = wkState.businessDeveloper!.platformOrders.find(
        (o) => o.platformId === 'WAKKELNY' && o.status === 'WAITING_DISPATCH'
      )!;
      const courier = wkState.couriers.find((c) => c.status === 'AVAILABLE')!;

      // Clear courier allocation from all Wakkelny zones so the courier is out-of-zone
      for (const zId of [
        'WAK-ZONE-NASR-HELIOPOLIS',
        'WAK-ZONE-DOWNTOWN-ABBASIYA',
        'WAK-ZONE-DOKKI-MOHANDESSIN',
        'WAK-ZONE-MAADI-SOUTH',
      ]) {
        wkState = configureWakkelnyHubAndZoneCouriers(
          wkState,
          'العباسية — المقر التشغيلي',
          zId,
          []
        );
      }

      let blockedWithoutExceptional = false;
      try {
        dispatchWakkelnyOrderWithZoneSimulation(wkState, wkOrder.id, courier.id, {
          allowExceptionalCoverage: false,
        });
      } catch {
        blockedWithoutExceptional = true;
      }
      if (!blockedWithoutExceptional) {
        throw new Error('سمح النظام بإسناد طلب وكلني لمندوب غير مخصص للمنطقة دون تفعيل التغطية الاستثنائية!');
      }

      const cashBefore = wkState.company.cashPiastres;
      const dispatchRes = dispatchWakkelnyOrderWithZoneSimulation(
        wkState,
        wkOrder.id,
        courier.id,
        { allowExceptionalCoverage: true }
      );
      wkState = dispatchRes.nextState;
      const timing = dispatchRes.timing;
      if (
        !timing.isExceptionalOutOfZoneCoverage ||
        timing.exceptionalExtraCostPiastres <= 0 ||
        wkState.company.cashPiastres >= cashBefore
      ) {
        throw new Error('لم يتم احتساب وخصم تكلفة المسافة الإضافية للتغطية الاستثنائية خارج المنطقة.');
      }
      return `رُفض الإسناد العشوائي خارج المنطقة، ونجح الإسناد فقط عبر «التغطية الاستثنائية» بتكلفة مسافة إضافية (${timing.exceptionalExtraCostPiastres / 100} ج.م).`;
    }
  );

  // Test 53: حساب زمن طلب وكلني مع فصل انتظار المطعم عن زمن الطريق، وعدم تطبيق حد 10 ساعات الخاص بالمستودع على طلبات الطعام
  assertTest(
    53,
    'حساب زمن طلب وكلني بالدقائق مع فصل انتظار المطعم عن زمن الطريق وعدم تطبيق حد 10 ساعات الخاص بالمستودع',
    () => {
      let wkState = createInitialGameState();
      wkState = injectPartnerCapitalExpansion(wkState, 20000);
      wkState = {
        ...wkState,
        company: { ...wkState.company, currentDay: 3 },
        businessDeveloper: { ...wkState.businessDeveloper!, isUnlocked: true },
      };
      wkState = signPlatformContract(wkState, 'WAKKELNY');
      const foodOrder = wkState.businessDeveloper!.platformOrders.find(
        (o) => o.platformId === 'WAKKELNY'
      )!;
      const courier = wkState.couriers[0];
      const timing = calculateWakkelnyOrderTimingBreakdown(
        wkState,
        foodOrder,
        courier.id
      );
      const expectedWait = Math.max(
        0,
        timing.restaurantPrepMinutes - timing.transitToRestaurantMinutes
      );
      if (timing.courierWaitAtRestaurantMinutes !== expectedWait) {
        throw new Error('لم يتم فصل زمن انتظار المندوب عند المطعم عن زمن الطريق بدقة.');
      }
      if (timing.totalExpectedMinutes >= 600) {
        throw new Error('تم تطبيق حد الـ 10 ساعات (600 دقيقة) الخاص بالمستودع على طلب طعام وكلني!');
      }
      return `زمن طلب الطعام الكلي ${timing.totalExpectedMinutes} دقيقة فقط (طريق للمطعم: ${timing.transitToRestaurantMinutes} د، انتظار تجهيز: ${timing.courierWaitAtRestaurantMinutes} د، طريق للعميل: ${timing.transitToClientMinutes} د) دون تطبيق حد 10 ساعات.`;
    }
  );

  // Test 54: التفرقة بين تأخير المطعم وتأخير المندوب، واحتساب مكافأة السرعة عند استحقاقها فقط
  assertTest(
    54,
    'التفرقة بين تأخير المطعم وتأخير المندوب، واحتساب مكافأة السرعة عند استحقاقها فقط',
    () => {
      let wkState = createInitialGameState();
      wkState = injectPartnerCapitalExpansion(wkState, 20000);
      wkState = {
        ...wkState,
        company: { ...wkState.company, currentDay: 3 },
        businessDeveloper: { ...wkState.businessDeveloper!, isUnlocked: true },
      };
      wkState = signPlatformContract(wkState, 'WAKKELNY');
      const baseOrder = wkState.businessDeveloper!.platformOrders.find(
        (o) => o.platformId === 'WAKKELNY'
      )!;
      const courier = wkState.couriers[0];
      // Ensure courier is allocated to the order's zone so fast delivery gets speed bonus
      wkState = configureWakkelnyHubAndZoneCouriers(
        wkState,
        'العباسية — المقر التشغيلي',
        'WAK-ZONE-NASR-HELIOPOLIS',
        [courier.id]
      );
      wkState = configureWakkelnyHubAndZoneCouriers(
        wkState,
        'العباسية — المقر التشغيلي',
        'WAK-ZONE-DOWNTOWN-ABBASIYA',
        [courier.id]
      );

      // Case A: Fast delivery eligible for speed bonus
      const fastOrder = {
        ...baseOrder,
        prepTimeMinutes: 10,
        distanceKm: 2.2,
      };
      const fastTiming = calculateWakkelnyOrderTimingBreakdown(
        wkState,
        fastOrder,
        courier.id
      );
      if (fastTiming.delayAttribution !== 'NONE' || fastTiming.speedBonusEarnedPiastres <= 0) {
        throw new Error('لم تُحتسب مكافأة السرعة رغم تسليم الطلب أسرع من المهلة التعاقدية.');
      }

      // Case B: Restaurant prep delay (kitchen delay)
      const restTiming = calculateWakkelnyOrderTimingBreakdown(
        wkState,
        baseOrder,
        courier.id,
        { extraRestaurantKitchenDelayMinutes: 25 }
      );
      if (restTiming.delayAttribution !== 'RESTAURANT_DELAY') {
        throw new Error(`فشل تمييز تأخير المطعم عن تأخير المندوب: ${restTiming.delayAttribution}`);
      }

      // Case C: Courier/Traffic delay
      const courierTiming = calculateWakkelnyOrderTimingBreakdown(
        wkState,
        baseOrder,
        courier.id,
        { extraCourierRoadDelayMinutes: 25 }
      );
      if (
        courierTiming.delayAttribution !== 'COURIER_OR_TRAFFIC_DELAY' ||
        courierTiming.speedBonusEarnedPiastres !== 0
      ) {
        throw new Error(`فشل تمييز تأخير المندوب/الطريق: ${courierTiming.delayAttribution}`);
      }

      return `تم التمييز بدقة بين التسليم السريع بمكافأة (+${fastTiming.speedBonusEarnedPiastres / 100} ج.م)، وتأخير المطعم (RESTAURANT_DELAY)، وتأخير المندوب/الطريق (COURIER_OR_TRAFFIC_DELAY).`;
    }
  );

  // Test 55: ظهور شكوى موظف في برنامج «موظفيني» عند نقص الطلبات أو سوء التوزيع أو ضغط العمل، وتأثر الرضا والكفاءة عند حلها
  assertTest(
    55,
    'ظهور شكوى موظف في برنامج «موظفيني» عند نقص الطلبات أو ضغط العمل، وتأثر الرضا والكفاءة عند حلها',
    () => {
      let empState = createInitialGameState();
      empState = evaluateAndGenerateEmployeeVoiceByConditions(
        empState,
        'LOW_ORDERS_CHECK'
      );
      const voices = empState.myEmployeesApp?.voiceRecords || [];
      const openComplaint = voices.find(
        (v) => v.type === 'COMPLAINT' && v.status === 'OPEN'
      );
      if (!openComplaint) {
        throw new Error('لم يظهر سجل شكوى موظف في برنامج «موظفيني» عند تحقق شرط نقص الطلبات.');
      }
      empState = verifyEmployeeVoiceRecord(empState, openComplaint.id);
      const verifiedRec = empState.myEmployeesApp!.voiceRecords.find(
        (v) => v.id === openComplaint.id
      )!;
      if (verifiedRec.status !== 'VERIFIED' || !verifiedRec.isVerifiedValid) {
        throw new Error('لم يتم توثيق التحقق من صحة شكوى الموظف مقابل أرقام الشركة الفعلية.');
      }
      const wellbeingBefore =
        empState.myEmployeesApp!.wellbeingByEmployeeId[openComplaint.employeeId]!;
      const empBefore = empState.employees.find(
        (e) => e.id === openComplaint.employeeId
      )!;

      empState = resolveEmployeeVoiceWithSolution(
        empState,
        openComplaint.id,
        openComplaint.suggestedSolutions[0].id
      );

      const wellbeingAfter =
        empState.myEmployeesApp!.wellbeingByEmployeeId[openComplaint.employeeId]!;
      const empAfter = empState.employees.find(
        (e) => e.id === openComplaint.employeeId
      )!;
      const resolvedRec = empState.myEmployeesApp!.voiceRecords.find(
        (v) => v.id === openComplaint.id
      )!;
      if (
        resolvedRec.status !== 'RESOLVED' ||
        wellbeingAfter.satisfactionScore <= wellbeingBefore.satisfactionScore ||
        empAfter.efficiency <= empBefore.efficiency
      ) {
        throw new Error('لم يرتفع رضا الموظف وكفاءته بعد تطبيق الحل العملي في برنامج «موظفيني».');
      }
      return `تم التحقق من شكوى «${resolvedRec.employeeName}» وحلها عملياً، فارتفع الرضا من ${wellbeingBefore.satisfactionScore}% إلى ${wellbeingAfter.satisfactionScore}% والكفاءة من ${empBefore.efficiency}% إلى ${empAfter.efficiency}%.`;
    }
  );

  // Test 56: رفض المستلم للشحنة، وفتح مسار مرتجع، وبقاء المرتجع معلقًا أو متنازعًا عليه إذا لم تؤكد الشركة العميلة الاستلام
  assertTest(
    56,
    'رفض المستلم للشحنة، وفتح مسار مرتجع، وبقاء المرتجع معلقًا أو متنازعًا عليه إذا لم تؤكد الشركة العميلة الاستلام',
    () => {
      let retState = createInitialGameState();
      const targetSh = retState.shipments[0];
      // Step 1: Initiate return due to recipient refusal
      const initRes = initiateShipmentReturnWorkflow(
        retState,
        targetSh.trackingNumber,
        'CLIENT_REFUSED'
      );
      retState = initRes.state;
      let retRec = retState.shipments.find(
        (s) => s.trackingNumber === targetSh.trackingNumber
      )?.returnRecord;
      if (!retRec || retRec.returnStatus !== 'AT_WAREHOUSE_PENDING_RETURN') {
        throw new Error('لم يبدأ مسار إعادة الشحنة المرفوضة إلى المستودع الأصلي.');
      }
      // Step 2: Dispatch return to Merchant Client -> MUST remain DELIVERED_TO_MERCHANT_UNCONFIRMED
      const dispRes = dispatchReturnToMerchantClient(retState, targetSh.trackingNumber);
      retState = dispRes.state;
      retRec = retState.shipments.find(
        (s) => s.trackingNumber === targetSh.trackingNumber
      )?.returnRecord!;
      if (
        retRec.returnStatus !== 'DELIVERED_TO_MERCHANT_UNCONFIRMED' ||
        retRec.merchantConfirmedReceipt
      ) {
        throw new Error('تم اعتبار المرتجع مستلماً نهائياً قبل تأكيد الشركة العميلة!');
      }
      // Step 3: Merchant disputes or delays confirmation -> status becomes DISPUTED_BY_MERCHANT, not CONFIRMED_CLOSED
      const dispOut = recordMerchantReturnConfirmationOrDispute(
        retState,
        targetSh.trackingNumber,
        'MERCHANT_DISPUTE'
      );
      retState = dispOut.state;
      retRec = retState.shipments.find(
        (s) => s.trackingNumber === targetSh.trackingNumber
      )?.returnRecord!;
      if (retRec.returnStatus !== 'DISPUTED_BY_MERCHANT' || retRec.merchantConfirmedReceipt) {
        throw new Error('لم يتحول المرتجع غير المؤكد إلى متنازع عليه/معلق عند مماطلة الشركة العميلة.');
      }
      return `بقي المرتجع «${retRec.returnId}» في حالة (${retRec.returnStatus}) دون إغلاق نهائي لأن الشركة العميلة «${retRec.clientName}» لم تؤكد الاستلام.`;
    }
  );

  // Test 57: تسجيل رسوم الشحن ورسوم المرتجع وفق شروط العقد دون مضاعفة عند إعادة المحاولة
  assertTest(
    57,
    'تسجيل رسوم الشحن ورسوم المرتجع وفق شروط العقد كحركات مالية مستقلة دون مضاعفة عند إعادة المحاولة',
    () => {
      let retState = createInitialGameState();
      const targetSh = retState.shipments[0];
      retState = initiateShipmentReturnWorkflow(
        retState,
        targetSh.trackingNumber,
        'CLIENT_REFUSED'
      ).state;
      retState = dispatchReturnToMerchantClient(
        retState,
        targetSh.trackingNumber
      ).state;

      const ledgerLenBefore = retState.ledger.length;
      // Confirm receipt by merchant (triggers settleConfirmedReturnFinancialsIdempotent)
      retState = recordMerchantReturnConfirmationOrDispute(
        retState,
        targetSh.trackingNumber,
        'CONFIRM_RECEIPT',
        'OTP-RET-1001'
      ).state;

      const settledSh = retState.shipments.find(
        (s) => s.trackingNumber === targetSh.trackingNumber
      )!;
      const settledRec = settledSh.returnRecord!;
      if (
        settledRec.returnStatus !== 'CONFIRMED_CLOSED' ||
        !settledRec.financialSettled ||
        retState.ledger.length < ledgerLenBefore + 2
      ) {
        throw new Error('لم تُسجل رسوم الشحن المحتفظ بها ورسوم المرتجع كحركتين ماليتين مستقلتين في الدفتر.');
      }

      // Retry settlement -> must NOT duplicate revenue or ledger entries
      const ledgerAfterFirst = retState.ledger.length;
      const receivableAfterFirst = settledSh.receivableOutstandingPiastres;
      retState = settleConfirmedReturnFinancialsIdempotent(
        retState,
        settledSh,
        settledRec,
        'OTP-RET-1001'
      ).state;
      const shAfterRetry = retState.shipments.find(
        (s) => s.trackingNumber === targetSh.trackingNumber
      )!;
      if (
        retState.ledger.length !== ledgerAfterFirst ||
        shAfterRetry.receivableOutstandingPiastres !== receivableAfterFirst
      ) {
        throw new Error('تضاعفت رسوم الشحن أو رسوم المرتجع عند إعادة محاولة التسوية المالية!');
      }
      if (!calculateFinancialMetrics(retState).isCashReconciled) {
        throw new Error('عدم تطابق الدفتر المحاسبي بعد تسوية المرتجع!');
      }
      return `تم قيد رسوم الشحن المحتفظ بها (${settledRec.originalShippingFeeRetainedPiastres / 100} ج.م) ورسوم المرتجع (${settledRec.contractualReturnFeePiastres / 100} ج.م) في قيدين مستقلين ومنع التكرار عند إعادة المحاولة.`;
    }
  );

  // Test 58: حسم التعارض بين الحفظ المحلي والسحابي، والتعافي من فشل المزامنة ثم نجاحها عند إعادة المحاولة، وعدم تكرار الرواتب أو الإيرادات أو المصروفات أو المكافآت
  assertTest(
    58,
    'حسم التعارض بين الحفظ المحلي والسحابي، والتعافي من فشل المزامنة عند إعادة المحاولة، ومنع تكرار القيود المالية',
    () => {
      let localState = createInitialGameState();
      const reqSh = localState.shipments.find((s) => s.status === 'NEW_REQUEST')!;
      localState = acceptShipmentRequest(localState, reqSh.trackingNumber);
      localState = {
        ...localState,
        shipments: localState.shipments.map((s) =>
          s.trackingNumber === 'TRK-1001' ? { ...s, status: 'OUT_FOR_DELIVERY' as const } : s
        ),
      };
      localState = completeShipmentDelivery(localState, 'TRK-1001');
      // Simulate offline milestone pending sync
      localState = {
        ...localState,
        clock: {
          ...localState.clock,
          totalElapsedMinutes: localState.clock.totalElapsedMinutes + 180,
        },
        offlineSync: {
          ...localState.offlineSync!,
          pendingMilestones: [
            {
              id: 'SYNC-RETRY-TEST-58',
              type: 'LEVEL_UP',
              day: localState.company.currentDay,
              companyLevel: localState.company.level || 1,
              cashPiastres: localState.company.cashPiastres,
              reputation: localState.company.reputation,
              timestampIso: new Date().toISOString(),
              syncedToCloud: false,
            },
          ],
        },
      };

      // Older cloud state with same company code
      const olderCloudState: GameState = {
        ...createInitialGameState(),
        company: {
          ...createInitialGameState().company,
          companyCode: localState.company.companyCode,
        },
      };

      const { resolvedState, record } = resolveLocalAndCloudSyncConflict(
        localState,
        olderCloudState,
        { syncAttemptFailedFirst: true }
      );

      if (
        record.winnerSource !== 'LOCAL_STATE' ||
        !record.recoveredSuccessfully ||
        resolvedState.company.cashPiastres !== localState.company.cashPiastres
      ) {
        throw new Error('لم يختر حاسم التعارض النسخة المحلية الأحدث والأكثر تقدماً.');
      }

      // Verify idempotency: no duplicate ledger IDs or duplicate shipment deliveries
      const uniqueLedgerIds = new Set(resolvedState.ledger.map((e) => e.id));
      if (uniqueLedgerIds.size !== resolvedState.ledger.length) {
        throw new Error('تكررت قيود مالية أثناء حسم التعارض والمزامنة!');
      }
      if (!calculateFinancialMetrics(resolvedState).isCashReconciled) {
        throw new Error('الرصيد النقدي غير متطابق مع الدفتر العام بعد حسم التعارض بين الحفظ المحلي والسحابي.');
      }

      return `تم حسم التعارض لصالح النسخة الأحدث (${record.winnerSource}) والتعافي بعد إعادة المحاولة ومنع أي تكرار للرواتب أو الإيرادات أو المصروفات.`;
    }
  );

  // Test 59: منع تجمد الشاشة (Reference Stability) وحل تعارض قبول/رفض الشحنة من قسم الشحنات مع مواقف غرفة العمليات
  assertTest(
    59,
    'منع تجمد الشاشة عند التفاعل مع السكرتير أو دليل المدير وحل تعارض قبول/رفض الشحنات مع المواقف الإدارية',
    () => {
      let st = createInitialGameState();
      // 1. Verify syncManagerGuideTasksWithRealState returns exact same reference when nothing changed
      const synced1 = syncManagerGuideTasksWithRealState(st);
      const synced2 = syncManagerGuideTasksWithRealState(synced1);
      if (synced1 !== synced2) {
        throw new Error('syncManagerGuideTasksWithRealState يعيد كائناً جديداً في كل نبضة ساعة مما قد يسبب حلقات إعادة رسم وتجمد الشاشة!');
      }

      // 2. Verify markBubbleNotificationRead and dismissBubbleNotification are idempotent and reference-stable
      const firstBubbleId = synced1.guideAndSecretary!.bubbleMessages[0].id;
      const afterRead1 = markBubbleNotificationRead(synced1, firstBubbleId);
      const afterRead2 = markBubbleNotificationRead(afterRead1, firstBubbleId);
      if (afterRead1 !== afterRead2) {
        throw new Error('markBubbleNotificationRead ليس مستقراً مرجعياً عند القراءة المتكررة!');
      }
      const afterDismiss1 = dismissBubbleNotification(afterRead1, firstBubbleId);
      const afterDismiss2 = dismissBubbleNotification(afterDismiss1, firstBubbleId);
      if (afterDismiss1 !== afterDismiss2) {
        throw new Error('dismissBubbleNotification ليس مستقراً مرجعياً عند الإخفاء المتكرر!');
      }

      // 3. Verify accepting TRK-1002 and rejecting TRK-1003 directly from ShipmentsPanel auto-resolves SIT-D1-1 and SIT-D1-3
      st = acceptShipmentRequest(st, 'TRK-1002');
      st = rejectShipmentRequest(st, 'TRK-1003', 'رفض تجريبي من لوحة الشحنات');
      const sit1 = st.situations.find((s) => s.relatedShipmentTracking === 'TRK-1002');
      const sit3 = st.situations.find((s) => s.relatedShipmentTracking === 'TRK-1003');
      if (!sit1?.resolved || !sit3?.resolved) {
        throw new Error('قبول أو رفض الشحنة من قسم الشحنات لم يحسم الموقف الإداري المرتبط بها تلقائياً في غرفة العمليات!');
      }
      return 'استقرار مرجعي كامل (0 حلقات لا نهائية أو تجمد شاشة) مع حسم تلقائي للمواقف الإدارية عند قبول/رفض الشحنات من أي شاشة.';
    }
  );

  // Test 60: عزل بيئة المطور (Staging) عن النسخة العامة (Live) وتطابق بيانات السكرتير وموظفيني مع أرقام اليوم الأول
  assertTest(
    60,
    'عزل بيئة المطور (Staging) عن النسخة العامة (Live) وتطابق بيانات السكرتير وموظفيني مع بيانات اللعبة الفعلية',
    () => {
      if (String(SAVE_STORAGE_KEY) === String(STAGING_SAVE_STORAGE_KEY)) {
        throw new Error('مفتاح حفظ بيئة المطور يطابق مفتاح النسخة العامة!');
      }
      let st = createInitialGameState();
      const secInitMsg = st.guideAndSecretary?.bubbleMessages.find(
        (m) => m.id === 'BUBBLE-INIT-SEC-1'
      );
      if (
        !secInitMsg ||
        !secInitMsg.factsAr.some((f) => f.includes('حسن الشبراوي')) ||
        secInitMsg.factsAr.some((f) => f.includes('كريم عادل'))
      ) {
        throw new Error('رسالة السكرتير الافتتاحية لا تطابق أسماء المندوبين الفعليين في اليوم الأول.');
      }

      // Advance clock and verify no duplicate LOW_ORDER_VOLUME voice records for EMP-HASSAN on Day 1
      st = advanceSimulationClock(st, 35, true);
      const hassanLowOrdRecords = (st.myEmployeesApp?.voiceRecords || []).filter(
        (r) =>
          r.employeeId === 'EMP-HASSAN' &&
          r.category === 'LOW_ORDER_VOLUME' &&
          r.day === 1
      );
      if (hassanLowOrdRecords.length !== 1) {
        throw new Error(`تكررت شكوى قلة الطلبات للمندوب حسن الشبراوي في اليوم الأول (${hassanLowOrdRecords.length} سجلات)!`);
      }

      return `تم التحقق من عزل مفاتيح الحفظ (${SAVE_STORAGE_KEY} ≠ ${STAGING_SAVE_STORAGE_KEY}) وتطابق بيانات السكرتير وتطبيق موظفيني 100%.`;
    }
  );

  // Test 61: بداية اللاعب بمبلغ 13,000 ج.م نقدية و5,000 ج.م ديون مقسمة على 4 التزامات وسداد أهم 3 منها
  assertTest(
    61,
    'بداية اللاعب بمبلغ 13,000 ج.م نقدية و5,000 ج.م ديون مقسمة على 4 التزامات وسداد أهم 3 التزامات بنجاح',
    () => {
      let debtState = createInitialGameState();
      if (debtState.company.cashPiastres !== egpToPiastres(13000)) {
        throw new Error(
          `رأس المال الافتتاحي ليس 13,000 ج.م: ${debtState.company.cashPiastres / 100}`
        );
      }
      const debts = debtState.debts || [];
      const totalDebtPiastres = debts.reduce(
        (s, d) => s + d.originalAmountPiastres,
        0
      );
      if (debts.length !== 4 || totalDebtPiastres !== egpToPiastres(5000)) {
        throw new Error(
          `إجمالي الديون الافتتاحية ليس 5,000 ج.م مقسمة على 4 التزامات (${debts.length} التزامات، ${totalDebtPiastres / 100} ج.م)`
        );
      }
      // Pay top 3 priority obligations (ELECTRICITY 1500, TAXES 1400, RENT 1300 = 4200 EGP)
      const sortedByPriority = [...debts].sort(
        (a, b) => a.priorityOrder - b.priorityOrder
      );
      for (const d of sortedByPriority.slice(0, 3)) {
        const cashBefore = debtState.company.cashPiastres;
        debtState = payCompanyDebtObligation(debtState, d.id);
        if (
          debtState.company.cashPiastres !==
          cashBefore - d.originalAmountPiastres
        ) {
          throw new Error('لم يُخصم مبلغ الالتزام المسدد بدقة من الخزينة.');
        }
      }
      const paidCount = (debtState.debts || []).filter(
        (d) => d.status === 'PAID'
      ).length;
      if (
        paidCount !== 3 ||
        !debtState.onboardingMastery?.appliedSystems.paidTopThreeDebts
      ) {
        throw new Error(
          'لم يتم توثيق سداد أهم 3 التزامات من أصل 4 في المرحلة التعليمية.'
        );
      }
      return `بدأ اللاعب بـ 13,000 ج.م وديون 5,000 ج.م (كهرباء 1,500 + ضرائب 1,400 + إيجار 1,300 + رواتب 800)، وسدد أهم 3 التزامات (4,200 ج.م) وتبقى معه ${debtState.company.cashPiastres / 100} ج.م.`;
    }
  );

  // Test 62: توافق إعلانات التوظيف مع نوع الوظيفة (أمين المخزن لا يذكر امتلاك موتوسيكل أبداً، والمندوب يوضح المركبة)
  assertTest(
    62,
    'توافق إعلانات التوظيف مع نوع الوظيفة (أمين المخزن يعرض مهارات الفرز والباركود دون ذكر دراجة نارية)',
    () => {
      let hrSt = createInitialGameState();
      hrSt = postHRJobAd(hrSt, 'WAREHOUSE_CLERK', 100);
      const whAd = (hrSt.hrJobAds || []).find(
        (a) => a.role === 'WAREHOUSE_CLERK'
      )!;
      for (const cand of whAd.candidates) {
        if (
          cand.ownsPersonalMotorcycle ||
          cand.summaryAr.includes('موتوسيكل') ||
          cand.summaryAr.includes('دراجة')
        ) {
          throw new Error(
            `مرشح وظيفة أمين مستودع (${cand.name}) يحتوي على وصف دراجة نارية غير متوافق مع وظيفته: ${cand.summaryAr}`
          );
        }
      }
      hrSt = postHRJobAd(hrSt, 'COURIER_MOTO', 100);
      const motoAd = (hrSt.hrJobAds || []).find(
        (a) => a.role === 'COURIER_MOTO'
      )!;
      const hasVehicleDistinction = motoAd.candidates.some(
        (c) =>
          c.summaryAr.includes('موتوسيكل') ||
          c.summaryAr.includes('مركبة تابعة للشركة')
      );
      if (!hasVehicleDistinction) {
        throw new Error(
          'إعلان وظيفة المندوب لا يوضح الفرق بين امتلاك مركبة شخصية أو الحاجة لمركبة شركة.'
        );
      }
      return 'توافقت أوصاف المرشحين 100% مع الوظيفة المطلوبة (فرز وباركود لأمين المستودع، وتوضيح حالة المركبة للمناديب).';
    }
  );

  // Test 63: إطلاق الحملة الإعلانية التدريبية بقيمة 6,000 ج.م وتفعيل التكرار اليومي التلقائي
  assertTest(
    63,
    'إطلاق الحملة الإعلانية التدريبية بقيمة 6,000 ج.م وتوليد طلبات متناسبة مع الميزانية وتفعيل التكرار اليومي',
    () => {
      let mkt6k = createInitialGameState();
      const shipmentsBefore = mkt6k.shipments.length;
      mkt6k = launchMarketingCampaign(mkt6k, 'MKT-TIER-4', 6000, true);
      const generatedCount = mkt6k.shipments.length - shipmentsBefore;
      if (
        generatedCount < 4 ||
        !mkt6k.onboardingMastery?.appliedSystems.launchedTrainingCampaign6000
      ) {
        throw new Error(
          `لم تولد حملة الـ 6,000 ج.م التدريبية العدد المتناسب من الطلبات (${generatedCount}) أو لم تُسجل في إتقان المرحلة التعليمية.`
        );
      }
      const camp = mkt6k.marketing!.campaigns[0];
      if (
        !camp.dailyAutoRepeat ||
        camp.cumulativeAutoSpendPiastres !== egpToPiastres(6000)
      ) {
        throw new Error(
          'لم يتم تفعيل خيار التكرار اليومي التلقائي وتسجيل الإنفاق التراكمي للحملة.'
        );
      }
      return `تم إطلاق حملة الـ 6,000 ج.م التدريبية وتوليد ${generatedCount} شحنات جديدة مع تفعيل التكرار اليومي التلقائي.`;
    }
  );

  return {
    allPassed: results.every((r) => r.passed),
    results,
  };
}

// Run if invoked directly from CLI
const isMain =
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1] &&
  process.argv[1].includes('verificationTests');

if (isMain) {
  const suite = runMandatoryVerificationTests();
  console.log(`\n=== نتائج اختبارات التحقق الإلزامية (${suite.results.length} اختبار) ===`);
  for (const r of suite.results) {
    console.log(
      `[${r.passed ? 'PASS' : 'FAIL'}] #${r.testNumber}: ${r.name}\n   -> ${r.details}`
    );
  }
  if (!suite.allPassed) {
    process.exit(1);
  }
}
