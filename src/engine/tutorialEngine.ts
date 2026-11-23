import { GameState, TutorialState, TutorialStepItem } from '../types/game';

export function createInitialTutorialState(): TutorialState {
  const steps: TutorialStepItem[] = [
    // Day 1: أساسيات التشغيل (8 progressive steps)
    {
      id: 'TUT-D1-1',
      day: 1,
      stepNumber: 1,
      order: 1,
      titleAr: '1. التعرف على المكتب والسيولة النقدية',
      instructionAr:
        'راجع شريط السيولة النقدية (2,500 ج.م) واعتمد قرار الميزانية الأول في غرفة العمليات.',
      targetSection: 'MAIN_CONTROL',
      completed: false,
    },
    {
      id: 'TUT-D1-2',
      day: 1,
      stepNumber: 2,
      order: 2,
      titleAr: '2. استقبال أول طلب شحن',
      instructionAr:
        'افتح طلب شحن الحاج سعيد (TRK-1002) أو راجعه من قسم العمليات والشحنات.',
      targetSection: 'MAIN_CONTROL',
      completed: false,
    },
    {
      id: 'TUT-D1-3',
      day: 1,
      stepNumber: 3,
      order: 3,
      titleAr: '3. مراجعة تقدير المحاسب الإداري',
      instructionAr:
        'افتح تفاصيل الشحنة TRK-1002 لمشاهدة تقدير المحاسب الإداري (إيراد الشحن ناقص تكلفة البنزين والمندوب والتغليف = صافي الربح المتوقع).',
      targetSection: 'SHIPMENTS',
      completed: false,
    },
    {
      id: 'TUT-D1-4',
      day: 1,
      stepNumber: 4,
      order: 4,
      titleAr: '4. الموافقة على الطلب المنطقي',
      instructionAr:
        'اعتمد قبول طلب الشحنة TRK-1002 ليبدأ انتقالها تلقائياً إلى المستودع.',
      targetSection: 'MAIN_CONTROL',
      completed: false,
    },
    {
      id: 'TUT-D1-5',
      day: 1,
      stepNumber: 5,
      order: 5,
      titleAr: '5. متابعة وصول الشحنة للمستودع',
      instructionAr:
        'افتح قسم «المستودع» لمراقبة السعة الحجمية والوزن ووصول الشحنة لطابور الاستلام.',
      targetSection: 'WAREHOUSE',
      completed: false,
    },
    {
      id: 'TUT-D1-6',
      day: 1,
      stepNumber: 6,
      order: 6,
      titleAr: '6. مراقبة الفرز والتغليف',
      instructionAr:
        'شغّل ساعة اللعبة أو قدّم الوقت (+15د) لمشاهدة موظف المستودع يفرز ويغلف الشحنة تلقائياً.',
      targetSection: 'WAREHOUSE',
      completed: false,
    },
    {
      id: 'TUT-D1-7',
      day: 1,
      stepNumber: 7,
      order: 7,
      titleAr: '7. متابعة استلام المندوب والخروج للتوصيل',
      instructionAr:
        'راقب انتقال الشحنة من «جاهزة لاستلام المندوب» إلى «مع المندوب — قيد التوصيل».',
      targetSection: 'COURIERS',
      completed: false,
    },
    {
      id: 'TUT-D1-8',
      day: 1,
      stepNumber: 8,
      order: 8,
      titleAr: '8. مشاهدة نتيجة التسليم والأثر المالي',
      instructionAr:
        'بعد إتمام التسليم، افتح قسم «الحسابات» للتأكد من قيد الإيراد وفصل تحصيل التاجر (COD) عن أرباح الشركة.',
      targetSection: 'LEDGER',
      completed: false,
    },

    // Day 2: إدارة النمو والمشكلات (10 progressive steps)
    {
      id: 'TUT-D2-1',
      day: 2,
      stepNumber: 1,
      order: 1,
      titleAr: '1. فتح قسم التسويق (Marketing)',
      instructionAr:
        'انتقل إلى قسم «التسويق» لاستكشاف باقات جلب العملاء الجدد وتوسيع نشاط انجوبيا اكسبريس.',
      targetSection: 'MARKETING',
      completed: false,
    },
    {
      id: 'TUT-D2-2',
      day: 2,
      stepNumber: 2,
      order: 2,
      titleAr: '2. إطلاق حملة تسويقية بميزانية مناسبة',
      instructionAr:
        'اختر باقة تسويق تناسب سيولتك النقدية (مثل شريحة 1,000–1,500 ج.م) وأطلق الحملة.',
      targetSection: 'MARKETING',
      completed: false,
    },
    {
      id: 'TUT-D2-3',
      day: 2,
      stepNumber: 3,
      order: 3,
      titleAr: '3. ملاحظة زيادة العملاء والطلبات ذات المواعيد النهائية',
      instructionAr:
        'راجع الطلبات الجديدة التي ولّدتها الحملة وانتبه لمهلة القبول والتسليم.',
      targetSection: 'SHIPMENTS',
      completed: false,
    },
    {
      id: 'TUT-D2-4',
      day: 2,
      stepNumber: 4,
      order: 4,
      titleAr: '4. فحص ضغط المستودع (الوزن والحجم)',
      instructionAr:
        'افتح «المستودع» لمتابعة نسبة استغلال السعة الحجمية (م³) والوزن (كجم) وطوابير الفرز والتغليف.',
      targetSection: 'WAREHOUSE',
      completed: false,
    },
    {
      id: 'TUT-D2-5',
      day: 2,
      stepNumber: 5,
      order: 5,
      titleAr: '5. فتح الموارد البشرية (HR) ونشر إعلان توظيف',
      instructionAr:
        'افتح قسم «الموارد البشرية HR» وانشر إعلان توظيف (مندوب أو موظف مستودع أو محاسب إداري) لعرض المرشحين.',
      targetSection: 'EMPLOYEES',
      completed: false,
    },
    {
      id: 'TUT-D2-6',
      day: 2,
      stepNumber: 6,
      order: 6,
      titleAr: '6. مقارنة مهارات المرشحين والرواتب الدورية (كل 8 أيام)',
      instructionAr:
        'قارن بين المرشحين (مبتدئ، متوسط، خبير) من حيث المهارات التخصصية والراتب الدوري قبل التعيين.',
      targetSection: 'EMPLOYEES',
      completed: false,
    },
    {
      id: 'TUT-D2-7',
      day: 2,
      stepNumber: 7,
      order: 7,
      titleAr: '7. مراجعة تقرير المحاسب الإداري (الحد 8 طلبات/يوم)',
      instructionAr:
        'تحقق من قدرة المحاسب الإداري على معالجة الطلبات اليومية وصافي الربح المتوقع لكل بوليصة.',
      targetSection: 'LEDGER',
      completed: false,
    },
    {
      id: 'TUT-D2-8',
      day: 2,
      stepNumber: 8,
      order: 8,
      titleAr: '8. فتح هاتف السوشيال ميديا ومتابعة آراء العملاء',
      instructionAr:
        'اضغط على «السوشيال ميديا» لفتح الهاتف الذكي ومطالعة منشورات العملاء وتقييماتهم.',
      targetSection: 'SOCIAL_MEDIA',
      completed: false,
    },
    {
      id: 'TUT-D2-9',
      day: 2,
      stepNumber: 9,
      order: 9,
      titleAr: '9. معالجة شكوى أو مشكلة تشغيلية',
      instructionAr:
        'اتخذ إجراءً إدارياً لمعالجة شكوى عميل على السوشيال ميديا أو مشكلة شحنة متأخرة.',
      targetSection: 'SOCIAL_MEDIA',
      completed: false,
    },
    {
      id: 'TUT-D2-10',
      day: 2,
      stepNumber: 10,
      order: 10,
      titleAr: '10. الاطلاع على لوحة أداء الموظفين والحوافز',
      instructionAr:
        'راجع درجات أداء الموظفين (من 100) والعوامل المؤثرة وموعد دورة الرواتب القادمة (اليوم 8).',
      targetSection: 'EMPLOYEES',
      completed: false,
    },
  ];

  return {
    dismissed: false,
    startBriefingDismissedForDay: 0,
    seenFeatureHints: [],
    steps,
    day1Steps: steps.filter((s) => s.day === 1),
    day2Steps: steps.filter((s) => s.day === 2),
  };
}

/**
 * Automatically evaluates and advances tutorial steps based on real gameplay state and active section.
 */
export function syncTutorialProgress(
  state: GameState,
  activeSectionOrSocialOpen?: string | boolean,
  openedDrawerTracking?: string | boolean | null
): GameState {
  const tut = state.tutorial || createInitialTutorialState();
  let changed = false;

  const activeSection =
    typeof activeSectionOrSocialOpen === 'string'
      ? activeSectionOrSocialOpen
      : activeSectionOrSocialOpen === true
        ? 'SOCIAL_MEDIA'
        : undefined;

  const hasResolvedD1Finance = state.situations.some(
    (s) => s.id === 'SIT-D1-1-FINANCE-REVIEW' && s.resolved
  );
  const trk1002 = state.shipments.find((s) => s.trackingNumber === 'TRK-1002');
  const trk1002Accepted =
    trk1002 &&
    trk1002.status !== 'NEW_REQUEST' &&
    trk1002.status !== 'REJECTED';
  const anyDelivered = state.shipments.some((s) => s.status === 'DELIVERED');
  const anyCampaignLaunched = (state.marketing?.campaigns.length || 0) > 0;
  const anyJobAdPosted = (state.hrJobAds?.length || 0) > 0;
  const anyComplaintResolved = (state.socialPosts || []).some(
    (p) => p.complaintStatus === 'RESOLVED' || p.complaintResolved
  );

  const nextSteps = tut.steps.map((step) => {
    if (step.completed) return step;
    let shouldComplete = false;

    switch (step.id) {
      case 'TUT-D1-1':
        shouldComplete =
          Boolean(hasResolvedD1Finance) || activeSection === 'OPEN_DASHBOARD';
        break;
      case 'TUT-D1-2':
        shouldComplete =
          Boolean(hasResolvedD1Finance) ||
          activeSection === 'SHIPMENTS' ||
          Boolean(openedDrawerTracking);
        break;
      case 'TUT-D1-3':
        shouldComplete =
          Boolean(openedDrawerTracking) ||
          activeSection === 'SHIPMENTS' ||
          Boolean(trk1002Accepted);
        break;
      case 'TUT-D1-4':
        shouldComplete = Boolean(trk1002Accepted);
        break;
      case 'TUT-D1-5':
        shouldComplete =
          activeSection === 'WAREHOUSE' ||
          Boolean(
            trk1002 &&
              (trk1002.status === 'PREPARING_AT_WAREHOUSE' ||
                trk1002.status === 'READY_FOR_DISPATCH' ||
                trk1002.status === 'OUT_FOR_DELIVERY' ||
                trk1002.status === 'DELIVERED')
          );
        break;
      case 'TUT-D1-6':
        shouldComplete = Boolean(
          trk1002 &&
            (trk1002.status === 'READY_FOR_DISPATCH' ||
              trk1002.status === 'OUT_FOR_DELIVERY' ||
              trk1002.status === 'DELIVERED')
        );
        break;
      case 'TUT-D1-7':
        shouldComplete =
          activeSection === 'COURIERS' ||
          Boolean(
            trk1002 &&
              (trk1002.status === 'OUT_FOR_DELIVERY' ||
                trk1002.status === 'DELIVERED')
          );
        break;
      case 'TUT-D1-8':
        shouldComplete = Boolean(anyDelivered);
        break;
      case 'TUT-D2-1':
        shouldComplete = activeSection === 'MARKETING' || anyCampaignLaunched;
        break;
      case 'TUT-D2-2':
        shouldComplete = anyCampaignLaunched;
        break;
      case 'TUT-D2-3':
        shouldComplete =
          anyCampaignLaunched &&
          (activeSection === 'SHIPMENTS' || state.shipments.length > 4);
        break;
      case 'TUT-D2-4':
        shouldComplete =
          activeSection === 'WAREHOUSE' && state.company.currentDay >= 2;
        break;
      case 'TUT-D2-5':
        shouldComplete = anyJobAdPosted;
        break;
      case 'TUT-D2-6':
        shouldComplete = anyJobAdPosted && activeSection === 'EMPLOYEES';
        break;
      case 'TUT-D2-7':
        shouldComplete =
          activeSection === 'LEDGER' && state.company.currentDay >= 2;
        break;
      case 'TUT-D2-8':
        shouldComplete = activeSection === 'SOCIAL_MEDIA';
        break;
      case 'TUT-D2-9':
        shouldComplete =
          anyComplaintResolved ||
          state.executedDecisionIds.some((id) => id.startsWith('ADMIN-ACT-'));
        break;
      case 'TUT-D2-10':
        shouldComplete =
          activeSection === 'EMPLOYEES' && state.company.currentDay >= 2;
        break;
    }

    if (shouldComplete) {
      changed = true;
      return { ...step, completed: true };
    }
    return step;
  });

  if (
    !changed &&
    tut.day1Steps?.length === 8 &&
    tut.day2Steps?.length === 10
  ) {
    return state;
  }

  return {
    ...state,
    tutorial: {
      ...tut,
      steps: nextSteps,
      day1Steps: nextSteps.filter((s) => s.day === 1),
      day2Steps: nextSteps.filter((s) => s.day === 2),
    },
  };
}
