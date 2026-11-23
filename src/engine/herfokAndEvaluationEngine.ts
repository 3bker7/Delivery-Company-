import {
  GameState,
  HerfokComment,
  HerfokPost,
  IngobiaClientEvaluationSample,
  IngobiaDailyEvaluation,
} from '../types/game';
import { formatClockTime, formatEGP } from './financeEngine';
import { pushNotification } from './notificationEngine';

/**
 * Generates between 2 and 7 authentic, sarcastic Egyptian street slang comments for a Herfok post
 * without repeating templates.
 */
function buildDiverseHerfokComments(
  seedIndex: number,
  topicType: HerfokPost['category'],
  companyName: string,
  competitorName = 'براق إكسبريس للشحن'
): HerfokComment[] {
  const streetPool: HerfokComment[] = [
    {
      id: `HCOM-${seedIndex}-1`,
      authorNameAr: 'المعلم زينهم بتاع العتبة',
      authorRoleAr: 'تاجر جملة — حارة اليهود',
      tone: 'SARCASTIC',
      contentAr: `يا جدعان حد يصحّي الاستقبال في «${companyName}»! الأوردر قاعد مستني الفرج لحد ما «${competitorName}» دخلت خطفته من قدامهم عيني عينك.. انتوا فاتحين شركة شحن ولا دار مسنين؟ 😂`,
      likesCount: 29 + (seedIndex % 11),
    },
    {
      id: `HCOM-${seedIndex}-2`,
      authorNameAr: 'كابتن شيكا الصاروخ',
      authorRoleAr: 'طيار دليفري حُر — شبرا',
      tone: 'SARCASTIC',
      contentAr:
        'المدير اللي فاكر الموتوسيكل بيطير من فوق كوبري أكتوبر في 10 دقايق ده محتاج ينزل يركب ورايا في عز الضهر عشان يعرف إن الله حق! 😂🛵',
      likesCount: 41 + (seedIndex % 9),
    },
    {
      id: `HCOM-${seedIndex}-3`,
      authorNameAr: 'أبلة فاهيتا بتاعة الهاند ميد',
      authorRoleAr: 'صاحبة بيدج إكسسوارات وشنط',
      tone: 'CRITIC',
      contentAr: `والنبي يا «${companyName}» الكرتونة مكتوب عليها "قابل للكسر" بالخط العريض.. يعني مش كورة شراب في حجز خماسي! لو الإزاز اتشرخ تاني هعملكوا فضيحة في جروبات التجار كلها! 💅`,
      likesCount: 33 + (seedIndex % 7),
    },
    {
      id: `HCOM-${seedIndex}-4`,
      authorNameAr: 'عم حنفي أمين المخزن القديم',
      authorRoleAr: 'خبرة 30 سنة تستيف كراتين',
      tone: 'SARCASTIC',
      contentAr:
        'اللي يوعد زبون بتوصيل شحنة مخزن في 3 ساعات ده تلاقيه بيشحنها بالبلوتوث أو بيبعتها مع الحمام الزاجل! الشغل الصح فرز وتقفيل وتوزيع ميقلش عن 10 لـ 15 ساعة يا بهوات.',
      likesCount: 38 + (seedIndex % 13),
    },
    {
      id: `HCOM-${seedIndex}-5`,
      authorNameAr: 'الحاج عبد الصبور القماش',
      authorRoleAr: 'تاجر منسوجات — الموسكي',
      tone: 'SUPPORTER',
      contentAr: `كلمة حق تتقال.. رجالة «${companyName}» لما بيشدوا حيلهم بيوصلوا الأمانة بالمللي، والمحاسب بتاعهم مبيخلطش فلوس التحصيل (COD) بفلوس الشحن وده أهم حاجة عندنا في السوق.`,
      likesCount: 19 + (seedIndex % 6),
    },
    {
      id: `HCOM-${seedIndex}-6`,
      authorNameAr: 'حمادة كراتين',
      authorRoleAr: 'سمسار بوالص شحن',
      tone: 'SARCASTIC',
      contentAr:
        topicType === 'PRICING_DEBATE'
          ? 'اللي بيحرق سعر الشحن لـ 25 جنيه عشان يلم زباين وفي الآخر المندوب يخلع بالبنزين.. مبروك عليك الإفلاس مقدماً يا وحش اللوجستيات! 😂💸'
          : 'السوق بقى مولع نار، اللي هينام على ودانه ساعة واحدة الشركات التانية هتبلعه بزبائنه وبمناديبه كمان!',
      likesCount: 27 + (seedIndex % 8),
    },
    {
      id: `HCOM-${seedIndex}-7`,
      authorNameAr: 'م. طارق الشناوي',
      authorRoleAr: 'استشاري تشغيل وسلاسل إمداد',
      tone: 'ANALYTICAL',
      contentAr:
        'السر مش في عدد الإعلانات، السر في إنك متقبلش أوردر خسران بعد خصم البنزين والمندوب، وتخلّي عينك على الديون والصيانة قبل ما الأسطول يعطل منك في نص الموسم.',
      likesCount: 21 + (seedIndex % 5),
    },
    {
      id: `HCOM-${seedIndex}-8`,
      authorNameAr: 'سيد بليلة',
      authorRoleAr: 'ميكانيكي موتوسيكلات بالعباسية',
      tone: 'SARCASTIC',
      contentAr:
        'نص مكن الشركات شغال بالدعاء والبركة! يا جدعان غيّروا زيت وشدّوا جنزير بدل ما المندوب يركن جنب الرصيف والزبون يقعد يلطم ع الأوردر! 🔧😂',
      likesCount: 35 + (seedIndex % 10),
    },
    {
      id: `HCOM-${seedIndex}-9`,
      authorNameAr: 'مدام نهى (براند فاشون)',
      authorRoleAr: 'تاجرة ملابس أونلاين',
      tone: 'CRITIC',
      contentAr: `العميلة بتاعتي كانت طالبة الفستان لفرح بنت خالتها، لو المندوب اتأخر نص ساعة الفرح هيخلص وهلبّس الفستان للمندوب شخصياً! ركزوا معانا يا «${companyName}»! 😂👗`,
      likesCount: 44 + (seedIndex % 12),
    },
  ];

  // Rotate starting offset deterministically using seedIndex so every post has a fresh combination
  const count = Math.max(3, Math.min(6, 3 + (seedIndex % 4)));
  const rotated: HerfokComment[] = [];
  for (let i = 0; i < count; i++) {
    const idx = (seedIndex * 2 + i) % streetPool.length;
    rotated.push({
      ...streetPool[idx],
      id: `HCOM-${seedIndex}-${i + 1}`,
    });
  }
  return rotated;
}

export function createInitialHerfokPosts(): HerfokPost[] {
  return [
    {
      id: 'HERFOK-INIT-1',
      day: 1,
      timeLabel: '09:00 AM',
      totalMinutes: 540,
      authorNameAr: 'راديو هيرفوك — فرع العتبة والعباسية',
      authorHandle: '@herfok_egypt_logistics',
      authorRoleAr: 'المنصة الشعبية الساخرة لسوق الشحن في مصر',
      category: 'MARKET_SATIRE',
      contentAr:
        'اصحى للكلام! «انجوبيا إكسبريس» فتحت المكتب النهاردة في العباسية ومعاها سيولة 13,000 جنيه وعليها شوية فواتير كهرباء وضرائب وإيجار بـ 5,000 جنيه، وداخلة تناطح حيتان السوق «براق إكسبريس» و«سهم الدلتا»! يا ترى المدير الجديد هيسدد الفواتير ويشغل المخزن صح ولا الطرود هتبات ع الرصيف؟ 😂📦🔥',
      likesCount: 48,
      sharesCount: 14,
      comments: buildDiverseHerfokComments(
        1,
        'MARKET_SATIRE',
        'انجوبيا إكسبريس'
      ),
    },
  ];
}

export function createInitialIngobiaEvaluations(): IngobiaDailyEvaluation[] {
  return [
    {
      id: 'EVAL-INIT-D1',
      day: 1,
      timeLabel: '09:00 AM',
      totalMinutes: 540,
      eligibleTransactedClientsCount: 1,
      sampledClientsCount: 1,
      overallScoreOutOf100: 72,
      reputationDelta: 0,
      summaryAr:
        'التقييم التأسيسي المبدئي لشركة «انجوبيا إكسبريس»: يصدر التقييم الرسمي كل 24 ساعة لعينة 30% من العملاء الذين تعاملوا فعلياً مع الشركة.',
      samples: [
        {
          clientId: 'CLI-NOURHAN',
          clientNameAr: 'نورهان جاليري للإكسسوارات',
          trackingNumber: 'TRK-1001',
          scoreOutOf100: 72,
          stars: 4,
          verdictAr:
            'طرد TRK-1001 جاهز بالمستودع، بانتظار سرعة التوصيل اليوم للدقي.',
        },
      ],
    },
  ];
}

/**
 * Section 30: Generates a new «هيرفوك» post every 5 in-game hours (300 game minutes),
 * always written in sharp, humorous Egyptian street slang with 3 to 6 rotating comments.
 */
export function runFiveHourHerfokPulseIfDue(state: GameState): GameState {
  const existingPosts = state.herfokPosts || createInitialHerfokPosts();
  const nowTotal = state.clock.totalElapsedMinutes;
  const bucketIndex = Math.floor(nowTotal / 300); // Every 300 minutes (5 hours)
  const eventKey = `HERFOK-5H-BUCKET-${bucketIndex}`;

  if (
    bucketIndex <= 1 ||
    state.processedSimulationEventIds.includes(eventKey)
  ) {
    return state;
  }

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const deliveredCount = state.shipments.filter(
    (s) => s.status === 'DELIVERED'
  ).length;
  const poachedShipments = state.shipments.filter((s) =>
    Boolean(s.poachedByCompetitorName)
  );
  const delayedCount = state.shipments.filter((s) => s.isDelayed).length;
  const unpaidDebtsCount = (state.debts || []).filter(
    (d) => d.status !== 'PAID'
  ).length;
  const baseFee = state.pricingEngine?.baseFeePiastres ?? 4500;

  let category: HerfokPost['category'] = 'MARKET_SATIRE';
  let contentAr = '';
  let relatedTrackingNumber: string | undefined;
  let relatedCompetitorNameAr: string | undefined;

  const satireTemplates = [
    `يا خبر بفلوس! شركة «${state.company.name}» مشغلة التسعير على (${formatEGP(baseFee)})، والتجار في العتبة بيقولوا: "لو هتوصلوا في الميعاد ومن غير ما الكراتين تتفعص هندفع وإحنا مغمضين، أما لو هتناموا ع الأوردر يبقى الله الغني!" 😂📦`,
    `سؤال بريء من قهوة التجار بمدينة نصر: هو المندوب اللي بيقول للعميل "أنا تحت البيت" وهو لسه على دائري المنيب ده تبع انهي مدرسة في اللوجستيات بالظبط؟! 😂🛵`,
    `حرب المزايدات بين «${state.company.name}» و«براق إكسبريس» قلبت على مزاد سمك في سوق العبور! اللي هيضرب سعر تحت التكلفة هيرجع آخر الشهر يبيع مكتب المدير عشان يسدد البنزين! 💸😂`,
  ];

  if (poachedShipments.length > 0 && bucketIndex % 2 === 0) {
    const lastPoached = poachedShipments[poachedShipments.length - 1];
    category = 'COMPETITOR_NEWS';
    relatedTrackingNumber = lastPoached.trackingNumber;
    relatedCompetitorNameAr = lastPoached.poachedByCompetitorName;
    contentAr = `فضيحة بجلاجل في سوق الشحن! بينما إدارة «${state.company.name}» كانت بتشرب شاي في الخمسينة ونسيت ترد على الأوردر (${lastPoached.trackingNumber})، دخلت شركة «${lastPoached.poachedByCompetitorName}» لهفته في ثانية من التاجر (${lastPoached.clientName}).. النوم في الاستقبال بيجيب الفقر يا بهوات! 😂🏃‍♂️💨`;
  } else if (delayedCount > 0 && bucketIndex % 3 === 0) {
    category = 'COMPANY_CRITIQUE';
    contentAr = `بلاغ عاجل من رصيف المخزن: فيه ${delayedCount} شحنة متأخرة في «${state.company.name}» والتجار واقفين ع التليفون مستنيين الفرج! يا ترى المكن محتاج صيانة ولا المناديب تايهين في زحمة رمسيس؟ شدّوا اللحاف شوية يا رجالة! 🚨😂`;
  } else if (unpaidDebtsCount >= 3 && bucketIndex % 3 === 1) {
    category = 'COMPANY_CRITIQUE';
    contentAr = `إشاعة في الحتة إن محصل الكهرباء ومندوب الضرائب وصاحب الملك واقفين طابور قدام باب «${state.company.name}» مستنيين الـ ${unpaidDebtsCount} فواتير اللي لسه متسددتش! خلّصوا ديونكم الأول قبل ما يقطعوا السلك ع السيستم! ⚡😂`;
  } else if (deliveredCount >= 2 && bucketIndex % 2 === 1) {
    category = 'COMPANY_PRAISE';
    contentAr = `شابوه لرجالة «${state.company.name}»! سلّموا لحد دلوقتي ${deliveredCount} شحنات على الفرازة ومن غير فلسفة ولا أعذار، وحسابات الـ COD مرصودة بالمليم. لما الشغل بيبقى نضيف السوق كله بيضرب تعظيم سلام! 👏🚚✨`;
  } else {
    category = 'PRICING_DEBATE';
    contentAr = satireTemplates[bucketIndex % satireTemplates.length];
  }

  const newPost: HerfokPost = {
    id: `HERFOK-${state.company.currentDay}-${bucketIndex}`,
    day: state.company.currentDay,
    timeLabel,
    totalMinutes: nowTotal,
    authorNameAr:
      category === 'COMPETITOR_NEWS'
        ? 'رادار الخطف والمنافسين — هيرفوك'
        : category === 'COMPANY_PRAISE'
          ? 'رابطة تجار العتبة ومدينة نصر'
          : 'ميكروفون هيرفوك الساخر',
    authorHandle: '@herfok_pulse',
    authorRoleAr: 'نبض الشارع التجاري كل 5 ساعات',
    category,
    contentAr,
    relatedTrackingNumber,
    relatedCompetitorNameAr,
    likesCount: 22 + ((bucketIndex * 9) % 45),
    sharesCount: 5 + (bucketIndex % 14),
    comments: buildDiverseHerfokComments(
      bucketIndex,
      category,
      state.company.name,
      relatedCompetitorNameAr
    ),
  };

  return {
    ...state,
    herfokPosts: [newPost, ...existingPosts].slice(0, 25),
    processedSimulationEventIds: [
      ...state.processedSimulationEventIds,
      eventKey,
    ],
  };
}

/**
 * Sections 33-34: Runs the official «تقييم إنجوبيا» (`Ingobia Evaluation`) every 24 game hours
 * (1440 game minutes) on a 30% sample of eligible clients who actually transacted with the company.
 */
export function runDailyIngobiaEvaluationIfDue(
  state: GameState,
  forceRun = false
): GameState {
  const nowTotal = state.clock.totalElapsedMinutes;
  const evalBucket = Math.floor(nowTotal / 1440); // Every 24 hours (1440 mins)
  const evalKey = `INGOBIA-EVAL-24H-${evalBucket}`;

  if (
    !forceRun &&
    (evalBucket < 1 || state.processedSimulationEventIds.includes(evalKey))
  ) {
    return state;
  }

  // Eligible shipments: shipments that actually had an operational outcome or active transaction
  const eligibleShipments = state.shipments.filter(
    (s) =>
      s.status === 'DELIVERED' ||
      s.status === 'DELIVERY_FAILED' ||
      s.status === 'CANCELLED_EXPIRED' ||
      s.status === 'RETURNED' ||
      s.status === 'OUT_FOR_DELIVERY' ||
      s.status === 'READY_FOR_DISPATCH'
  );

  if (eligibleShipments.length === 0) {
    return state;
  }

  // 30% sample of eligible transacted shipments/clients (at least 1)
  const sampleSize = Math.max(1, Math.ceil(eligibleShipments.length * 0.3));
  const sampledShipments = eligibleShipments.slice(0, sampleSize);

  const samples: IngobiaClientEvaluationSample[] = sampledShipments.map((s) => {
    let score = 75;
    let verdictAr = 'خدمة منتظمة والتزام جيد بالتعليمات.';
    if (s.status === 'DELIVERED' && !s.isDelayed) {
      score = 94;
      verdictAr = `تسليم ممتاز في الموعد المحدد للشحنة ${s.trackingNumber} دون أي تلف.`;
    } else if (s.status === 'DELIVERED' && s.isDelayed) {
      score = 68;
      verdictAr = `وصلت الشحنة ${s.trackingNumber} سليمة ولكن بعد تجاوز الموعد المتوقع.`;
    } else if (s.status === 'CANCELLED_EXPIRED') {
      score = 42;
      verdictAr = `انتهت مهلة قبول الشحنة ${s.trackingNumber} في الاستقبال واضطررنا لتحويلها لشركة منافسة.`;
    } else if (s.status === 'DELIVERY_FAILED' || s.status === 'RETURNED') {
      score = 48;
      verdictAr = `تعثرت محاولة تسليم الشحنة ${s.trackingNumber} وتأثر جدول التوريد لدينا.`;
    } else if (s.isDelayed) {
      score = 56;
      verdictAr = `الشحنة ${s.trackingNumber} متأخرة حالياً عن المهلة المتفق عليها.`;
    } else {
      score = 82;
      verdictAr = `معاملة احترافية في استلام وفرز الشحنة ${s.trackingNumber}.`;
    }

    const stars: 1 | 2 | 3 | 4 | 5 =
      score >= 88
        ? 5
        : score >= 74
          ? 4
          : score >= 58
            ? 3
            : score >= 45
              ? 2
              : 1;

    return {
      clientId: s.clientId,
      clientNameAr: s.clientName,
      trackingNumber: s.trackingNumber,
      scoreOutOf100: score,
      stars,
      verdictAr,
    };
  });

  const overallScoreOutOf100 = Math.round(
    samples.reduce((sum, item) => sum + item.scoreOutOf100, 0) / samples.length
  );

  const reputationDelta =
    overallScoreOutOf100 >= 85
      ? 3
      : overallScoreOutOf100 >= 72
        ? 1
        : overallScoreOutOf100 >= 58
          ? 0
          : -2;

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const evaluation: IngobiaDailyEvaluation = {
    id: `EVAL-D${state.company.currentDay}-${evalBucket}-${ (state.ingobiaEvaluations?.length ?? 0) + 1 }`,
    day: state.company.currentDay,
    timeLabel,
    totalMinutes: nowTotal,
    eligibleTransactedClientsCount: eligibleShipments.length,
    sampledClientsCount: samples.length,
    overallScoreOutOf100,
    reputationDelta,
    summaryAr: `تقرير «تقييم إنجوبيا» الدوري (عينة 30%: ${samples.length} من أصل ${eligibleShipments.length} معاملة فعلية) — متوسط التقييم ${overallScoreOutOf100}/100 (${reputationDelta >= 0 ? `+${reputationDelta}` : reputationDelta} سمعة).`,
    samples,
  };

  const existingEvals =
    state.ingobiaEvaluations || createInitialIngobiaEvaluations();

  let nextState: GameState = {
    ...state,
    ingobiaEvaluations: [evaluation, ...existingEvals].slice(0, 20),
    company: {
      ...state.company,
      reputation: Math.max(
        0,
        Math.min(100, state.company.reputation + reputationDelta)
      ),
    },
    processedSimulationEventIds: forceRun
      ? state.processedSimulationEventIds
      : [...state.processedSimulationEventIds, evalKey],
  };

  nextState = pushNotification(nextState, {
    dedupeKey: evaluation.id,
    title: `صدور تقرير «تقييم إنجوبيا» (${overallScoreOutOf100}/100)`,
    message: evaluation.summaryAr,
    department: 'CUSTOMER_SERVICE',
    outcomeLabel: `تأثير السمعة: ${reputationDelta >= 0 ? `+${reputationDelta}` : reputationDelta}`,
    severity: reputationDelta >= 0 ? 'SUCCESS' : 'WARNING',
  });

  return nextState;
}
