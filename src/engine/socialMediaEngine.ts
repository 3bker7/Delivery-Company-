import {
  GameState,
  Shipment,
  SocialComplaintActionType,
  SocialMediaPost,
} from '../types/game';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { pushNotification } from './notificationEngine';

export function createInitialSocialPosts(
  companyName = 'انجوبيا اكسبريس — Ingobia Express'
): SocialMediaPost[] {
  return [
    {
      id: 'POST-INIT-1',
      dedupeKey: 'INIT-POST-MANAGER-APPOINTMENT-D1',
      day: 1,
      timeLabel: '08:45',
      totalMinutes: 525,
      authorClientId: 'CLI-NOURHAN',
      authorName: 'نشرة أخبار السوق واللوجستيات — القاهرة',
      authorRoleAr: 'منصة متابعة شركات الشحن والتجارة الإلكترونية',
      authorHandle: '@cairo_logistics_news',
      authorAvatarId: 'mahmoud',
      sentiment: 'CAMPAIGN_BUZZ',
      ratingStars: 5,
      contentAr: `إعلان إداري: تعيين مدير تنفيذي وتشغيلي جديد لقيادة شركة «${companyName}» بمقرها الرئيسي في العباسية، وخطة لإعادة هيكلة خطوط التوزيع والفرز في القاهرة والجيزة.`,
      likesCount: 24,
      commentsCount: 5,
      reputationDelta: 0,
      complaintResolved: false,
    },
    {
      id: 'POST-INIT-2',
      dedupeKey: 'INIT-POST-SAEED-D0',
      day: 1,
      timeLabel: '08:55',
      totalMinutes: 535,
      authorClientId: 'CLI-SAEED',
      authorName: 'الحاج سعيد للملابس الجاهزة',
      authorRoleAr: 'تاجر جملة بالعتبة',
      authorHandle: '@saeed_textiles',
      authorAvatarId: 'hag_saeed',
      relatedTrackingNumber: 'TRK-1002',
      sentiment: 'CAMPAIGN_BUZZ',
      ratingStars: 4,
      contentAr: `سمعنا إن فيه إدارة تشغيل جديدة مسكت «${companyName}» في العباسية. بعتنا ليهم النهاردة طلبية عينات المعادي (TRK-1002) وهنتابع التزامهم في المواعيد.`,
      likesCount: 15,
      commentsCount: 2,
      reputationDelta: 0,
      complaintResolved: false,
    },
  ];
}

/**
 * Updates initial opening social media posts when the player customizes their company name.
 */
export function syncCompanyNameInSocialPosts(
  state: GameState,
  newCompanyName: string
): GameState {
  const cleanName = newCompanyName.trim() || state.company.name;
  const updatedPosts = (state.socialPosts || []).map((post) => {
    if (post.dedupeKey === 'INIT-POST-MANAGER-APPOINTMENT-D1') {
      return {
        ...post,
        contentAr: `إعلان إداري: تعيين مدير تنفيذي وتشغيلي جديد لقيادة شركة «${cleanName}» بمقرها الرئيسي في العباسية، وخطة لإعادة هيكلة خطوط التوزيع والفرز في القاهرة والجيزة.`,
      };
    }
    if (post.dedupeKey === 'INIT-POST-SAEED-D0') {
      return {
        ...post,
        contentAr: `سمعنا إن فيه إدارة تشغيل جديدة مسكت «${cleanName}» في العباسية. بعتنا ليهم النهاردة طلبية عينات المعادي (TRK-1002) وهنتابع التزامهم في المواعيد.`,
      };
    }
    return post;
  });

  return {
    ...state,
    socialPosts: updatedPosts,
  };
}

/**
 * Generates an authentic Social Media post strictly tied to a real simulation event on a shipment.
 * - On-time delivery -> PRAISE post (never creates a complaint for an on-time delivery!)
 * - Delayed / Failed / Expired / Damaged -> COMPLAINT post with OPEN complaint task
 */
export function recordSocialPostForShipmentEvent(
  state: GameState,
  shipment: Shipment,
  eventType:
    | 'DELIVERED_ON_TIME'
    | 'DELAYED'
    | 'DELAYED_SLA'
    | 'FAILED'
    | 'DELIVERY_FAILED'
    | 'EXPIRED'
    | 'CANCELLED_EXPIRED'
    | 'DEADLINE_EXPIRED'
    | 'DAMAGED_OR_LOST',
  customReasonAr?: string
): GameState {
  const normalizedType =
    eventType === 'DELIVERY_FAILED'
      ? 'FAILED'
      : eventType === 'CANCELLED_EXPIRED' || eventType === 'DEADLINE_EXPIRED'
        ? 'EXPIRED'
        : eventType === 'DELAYED_SLA'
          ? 'DELAYED'
          : eventType;

  const dedupeKey = `SOCIAL-${normalizedType}-${shipment.trackingNumber}`;
  const existingPosts = state.socialPosts || [];
  if (existingPosts.some((p) => p.dedupeKey === dedupeKey)) {
    return state;
  }

  const client = state.clients.find((c) => c.id === shipment.clientId);
  const avatarId = client?.avatarId || 'hag_saeed';
  const roleAr = client?.roleAr || 'عميل تجاري';
  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const nowMinutes = state.clock.totalElapsedMinutes;

  let post: SocialMediaPost;

  if (normalizedType === 'DELIVERED_ON_TIME') {
    post = {
      id: `POST-D${state.company.currentDay}-${existingPosts.length + 1}`,
      dedupeKey,
      day: state.company.currentDay,
      timeLabel,
      totalMinutes: nowMinutes,
      authorClientId: shipment.clientId,
      authorName: shipment.clientName,
      authorRoleAr: roleAr,
      authorHandle: `@client_${shipment.clientId.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      authorAvatarId: avatarId,
      relatedTrackingNumber: shipment.trackingNumber,
      sentiment: 'PRAISE',
      ratingStars: 5,
      contentAr: `شهادة حق في «انجوبيا اكسبريس»: الشحنة (${shipment.trackingNumber}) وصلت ${shipment.deliveryZone} في ميعادها بالظبط وبحالة ممتازة. شغل منظم ويستاهل 5 نجوم!`,
      likesCount: 18,
      commentsCount: 4,
      reputationDelta: 2,
      complaintResolved: false,
    };
  } else {
    const complaintCategory: SocialMediaPost['complaintCategory'] =
      normalizedType === 'DELAYED'
        ? 'DELAY'
        : normalizedType === 'FAILED'
          ? 'DELIVERY_FAILED'
          : normalizedType === 'EXPIRED'
            ? 'EXPIRED_DEADLINE'
            : 'DAMAGE_OR_LOSS';

    const reasonText =
      customReasonAr ||
      shipment.failureReason ||
      shipment.delayReason ||
      'بدون حل واضح';

    const contentMap: Record<'DELAYED' | 'FAILED' | 'EXPIRED' | 'DAMAGED_OR_LOST', string> = {
      DELAYED: `تأخير غير مقبول من «انجوبيا اكسبريس» في الشحنة (${shipment.trackingNumber}) المتجهة إلى ${shipment.deliveryZone}. الميعاد كان ${shipment.expectedDeliveryTimeLabel} ولحد دلوقتي موصلتش! (${reasonText})`,
      FAILED: `للأسف تجربة سيئة النهاردة في الشحنة (${shipment.trackingNumber}) لـ ${shipment.deliveryZone} — تعذر التسليم (${reasonText}) ومحتاجين تدخل فوري من الإدارة!`,
      EXPIRED: `اضطرينا نسحب طلب الشحنة (${shipment.trackingNumber}) ونروح لشركة شحن منافسة بسبب انتهاء مهلة القبول/التجهيز عند انجوبيا اكسبريس بدون تنفيذ!`,
      DAMAGED_OR_LOST: `مشكلة خطيرة في الشحنة (${shipment.trackingNumber}) داخل مستودع انجوبيا اكسبريس (${reasonText}). نرجو التحقيق والتعويض العاجل!`,
    };

    post = {
      id: `POST-D${state.company.currentDay}-${existingPosts.length + 1}`,
      dedupeKey,
      day: state.company.currentDay,
      timeLabel,
      totalMinutes: nowMinutes,
      authorClientId: shipment.clientId,
      authorName: shipment.clientName,
      authorRoleAr: roleAr,
      authorHandle: `@client_${shipment.clientId.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      authorAvatarId: avatarId,
      relatedTrackingNumber: shipment.trackingNumber,
      sentiment: 'COMPLAINT',
      ratingStars: 1,
      contentAr: contentMap[normalizedType],
      likesCount: 12,
      commentsCount: 6,
      reputationDelta: -3,
      complaintStatus: 'OPEN',
      complaintResolved: false,
      complaintCategory,
    };
  }

  return {
    ...state,
    socialPosts: [post, ...existingPosts],
  };
}

/**
 * Resolves an open customer complaint on Social Media via an administrative intervention.
 * Prevents double resolution and applies real financial, reputation, client trust, and shipment effects.
 */
export function resolveSocialMediaComplaint(
  state: GameState,
  postId: string,
  actionType: SocialComplaintActionType
): GameState {
  const posts = state.socialPosts || [];
  const postIdx = posts.findIndex((p) => p.id === postId);
  if (postIdx === -1) {
    throw new Error('المنشور غير موجود.');
  }

  const post = posts[postIdx];
  if (post.sentiment !== 'COMPLAINT') {
    throw new Error('هذا المنشور ليس شكوى عميل.');
  }
  if (post.complaintStatus === 'RESOLVED' || post.complaintResolved) {
    throw new Error(
      'تمت معالجة هذه الشكوى مسبقاً، ولا يمكن احتساب حل الشكوى أو التعويض مرتين.'
    );
  }

  const actionCostMap: Record<SocialComplaintActionType, number> = {
    CONTACT_CLIENT_APOLOGIZE: 0,
    FOLLOW_UP_SHIPMENT: 0,
    INVESTIGATE_DELAY_CAUSE: egpToPiastres(15),
    RESCHEDULE_PRIORITY_DELIVERY: egpToPiastres(35),
    EXPEDITE_DELIVERY: egpToPiastres(30),
    INSPECT_DAMAGE_COMPENSATE: egpToPiastres(60),
    GRANT_COMPENSATION_DISCOUNT: egpToPiastres(40),
  };

  const costPiastres = actionCostMap[actionType] ?? 0;
  if (costPiastres > 0) {
    const afford = canAffordImmediatePayment(state, costPiastres);
    if (!afford.allowed) {
      throw new Error(
        afford.reason ||
          'السيولة النقدية غير كافية لتنفيذ قرار معالجة الشكوى.'
      );
    }
  }

  let nextState = { ...state };
  if (costPiastres > 0) {
    nextState = recordLedgerTransaction(nextState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: costPiastres,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: `SOC-RESOLVE-${post.id}`,
      description: `تكلفة معالجة شكوى العميل (${post.authorName}) بخصوص الشحنة ${post.relatedTrackingNumber || ''}`,
    });
  }

  let resolutionSummaryAr = '';
  let reputationRecovery = 2;
  let trustRecovery = 4;

  switch (actionType) {
    case 'CONTACT_CLIENT_APOLOGIZE':
    case 'FOLLOW_UP_SHIPMENT':
      resolutionSummaryAr =
        'تم التواصل المباشر مع العميل ومتابعة حالة الشحنة وتقديم اعتذار رسمي وتحديث موعد التسليم المتوقع.';
      reputationRecovery = 2;
      trustRecovery = 3;
      break;
    case 'INVESTIGATE_DELAY_CAUSE':
      resolutionSummaryAr =
        'تم فتح تحقيق تشغيلي موثق وتحديد مرحلة التأخير وتوجيه إنذار للمسؤول ومشاركة التقرير مع العميل.';
      reputationRecovery = 3;
      trustRecovery = 5;
      break;
    case 'RESCHEDULE_PRIORITY_DELIVERY':
    case 'EXPEDITE_DELIVERY':
      resolutionSummaryAr =
        'تمت إعادة جدولة الشحنة بأولوية قصوى وتخصيص خط سير عاجل لإتمام التسليم.';
      reputationRecovery = 4;
      trustRecovery = 7;
      break;
    case 'INSPECT_DAMAGE_COMPENSATE':
    case 'GRANT_COMPENSATION_DISCOUNT':
      resolutionSummaryAr = `تم فحص الطرد وصرف تعويض فوري للعميل بقيمة ${formatEGP(costPiastres)} لاحتواء الأزمة واستعادة الثقة.`;
      reputationRecovery = 5;
      trustRecovery = 9;
      break;
  }

  const updatedPost: SocialMediaPost = {
    ...post,
    complaintStatus: 'RESOLVED',
    complaintResolved: true,
    resolvedActionType: actionType,
    resolutionSummaryAr,
    resolutionNoteAr: resolutionSummaryAr,
  };

  const nextPosts = [...(nextState.socialPosts || [])];
  nextPosts[postIdx] = updatedPost;

  const isExpedite =
    actionType === 'RESCHEDULE_PRIORITY_DELIVERY' ||
    actionType === 'EXPEDITE_DELIVERY';

  // Update related shipment if applicable
  const nextShipments = nextState.shipments.map((sh) => {
    if (sh.trackingNumber !== post.relatedTrackingNumber) return sh;
    if (
      isExpedite &&
      sh.status !== 'DELIVERED' &&
      sh.status !== 'REJECTED' &&
      sh.status !== 'CANCELLED_EXPIRED'
    ) {
      return {
        ...sh,
        priority: 'HIGH' as const,
        isDelayed: false,
        requiresManagerIntervention: false,
        nextStepDueTotalMinutes: nextState.clock.totalElapsedMinutes + 10,
        currentRemediationAction: resolutionSummaryAr,
      };
    }
    return {
      ...sh,
      currentRemediationAction: resolutionSummaryAr,
    };
  });

  // Update client trust
  const nextClients = nextState.clients.map((c) =>
    c.id === post.authorClientId
      ? {
          ...c,
          trustLevel: Math.min(100, c.trustLevel + trustRecovery),
          history: [
            ...c.history,
            {
              id: `HIST-${nextState.company.currentDay}-${c.history.length + 1}`,
              day: nextState.company.currentDay,
              summary: `معالجة شكوى السوشيال ميديا (${post.relatedTrackingNumber || ''}): ${resolutionSummaryAr}`,
              trustDelta: trustRecovery,
            },
          ],
        }
      : c
  );

  nextState = {
    ...nextState,
    socialPosts: nextPosts,
    shipments: nextShipments,
    clients: nextClients,
    company: {
      ...nextState.company,
      reputation: Math.min(
        100,
        nextState.company.reputation + reputationRecovery
      ),
      customerSatisfaction: Math.min(
        100,
        nextState.company.customerSatisfaction + reputationRecovery
      ),
    },
  };

  nextState = pushNotification(nextState, {
    dedupeKey: `RESOLVED-POST-${post.id}`,
    trackingNumber: post.relatedTrackingNumber,
    title: `تم إغلاق شكوى العميل (${post.authorName})`,
    message: `${resolutionSummaryAr} ارتفعت السمعة بـ +${reputationRecovery} نقاط.`,
    department: 'CUSTOMER_SERVICE',
    outcomeLabel: 'تم حل الشكوى',
    severity: 'SUCCESS',
  });

  return nextState;
}
