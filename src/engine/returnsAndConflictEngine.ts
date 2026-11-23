import {
  Client,
  ClientContractAndEvidenceProfile,
  DeliveryAttemptResult,
  GameState,
  LedgerEntry,
  ReturnResponsibilityParty,
  Shipment,
  ShipmentReturnRecord,
  SyncConflictResolutionRecord,
} from '../types/game';
import {
  canAffordImmediatePayment,
  egpToPiastres,
  formatClockTime,
  formatEGP,
  recordLedgerTransaction,
} from './financeEngine';
import { calculateEgyptRouteDistance } from './geographyEngine';
import { pushInlineBubbleNotification } from './guideAndSecretaryEngine';
import { pushNotification } from './notificationEngine';

export function createInitialClientContractProfile(
  client: Client
): ClientContractAndEvidenceProfile {
  const isStrict = client.id === 'CLI-KAREEM';
  const isFlexible = client.id === 'CLI-SAEED';

  const defaultZonesByClient: Record<string, string[]> = {
    'CLI-SAEED': ['شبرا مصر', 'وسط البلد', 'العتبة', 'العباسية', 'المعادي'],
    'CLI-NOURHAN': [
      'مدينة نصر',
      'مصر الجديدة',
      'التجمع الخامس',
      'الدقي',
      'الزمالك',
    ],
    'CLI-KAREEM': [
      'المهندسين',
      'الدقي',
      'الجيزة',
      'وسط البلد',
      'مدينة نصر',
    ],
  };

  return {
    coveredZonesAr: defaultZonesByClient[client.id] || [
      'وسط البلد',
      'مدينة نصر',
      'المهندسين',
      'المعادي',
    ],
    returnFeePolicyAr: isStrict
      ? 'في حال رفض المستلم النهائي بدون خطأ من شركة الشحن، تحتفظ شركة الشحن بأجر التوصيل الأصلي + 35 ج.م رسوم إرجاع موثقة. في حال تأخير شركة الشحن، تتحمل شركة الشحن تكلفة الإرجاع كاملة.'
      : isFlexible
        ? 'في حال رفض المستلم أو عدم تواجده، تستحق شركة الشحن 25 ج.م رسوم إرجاع ثابتة بعد توثيق محضر التسليم للمخزن الرئيسي للتاجر.'
        : 'تحتفظ شركة الشحن بنصف أجر التوصيل الأصلي + 30 ج.م رسوم مرتجع عند رفض المستلم، بشرط توقيع إيصال استلام المرتجع من مسؤول مخزن العميل.',
    returnFeePiastres: isStrict
      ? egpToPiastres(35)
      : isFlexible
        ? egpToPiastres(25)
        : egpToPiastres(30),
    retainsOriginalFeeOnRecipientRefusal: isStrict,
    requiresOtpForReturnConfirmation: true,
    totalShipmentsCount: 0,
    deliveredCount: 0,
    recipientRefusalCount: 0,
    recipientAbsentCount: 0,
    returnConfirmationDelayCount: 0,
    disputedReturnsCount: 0,
    documentedEvidenceNotesAr: [
      `تم فتح السجل التعاقدي الموثق مع «${client.name}» (${client.roleAr}) — التزام محضر تسليم المرتجعات مفعل.`,
    ],
  };
}

export function ensureClientContractProfiles(state: GameState): GameState {
  const updatedClients = state.clients.map((cl) => {
    const baseProfile =
      cl.contractProfile || createInitialClientContractProfile(cl);
    const clientShipments = state.shipments.filter((s) => s.clientId === cl.id);
    const deliveredCount = clientShipments.filter(
      (s) => s.status === 'DELIVERED'
    ).length;
    const recipientRefusalCount = clientShipments.filter(
      (s) => s.lastAttemptResult === 'CLIENT_REFUSED'
    ).length;
    const recipientAbsentCount = clientShipments.filter(
      (s) => s.lastAttemptResult === 'CLIENT_ABSENT'
    ).length;

    return {
      ...cl,
      contractProfile: {
        ...baseProfile,
        totalShipmentsCount: Math.max(
          baseProfile.totalShipmentsCount,
          clientShipments.length
        ),
        deliveredCount: Math.max(baseProfile.deliveredCount, deliveredCount),
        recipientRefusalCount: Math.max(
          baseProfile.recipientRefusalCount,
          recipientRefusalCount
        ),
        recipientAbsentCount: Math.max(
          baseProfile.recipientAbsentCount,
          recipientAbsentCount
        ),
      },
    };
  });

  return {
    ...state,
    clients: updatedClients,
  };
}

export function classifyReturnResponsibilityAndDetails(
  reasonType: DeliveryAttemptResult
): {
  responsibleParty: ReturnResponsibilityParty;
  reasonDetailAr: string;
} {
  switch (reasonType) {
    case 'CLIENT_REFUSED':
      return {
        responsibleParty: 'RECIPIENT',
        reasonDetailAr:
          'رفض المستلم النهائي استلام الطرد عند الباب رغم مطابقة الموعد.',
      };
    case 'CLIENT_ABSENT':
      return {
        responsibleParty: 'RECIPIENT',
        reasonDetailAr:
          'عدم تواجد المستلم النهائي في العنوان وإغلاق الهاتف بعد عدة محاولات اتصال.',
      };
    case 'WRONG_ADDRESS':
      return {
        responsibleParty: 'MERCHANT_CLIENT',
        reasonDetailAr:
          'عنوان خاطئ أو ناقص مسجل من قِبل الشركة العميلة على بوليصة الشحن.',
      };
    case 'UNREACHABLE_AREA':
      return {
        responsibleParty: 'SHARED_OR_EXTERNAL',
        reasonDetailAr:
          'منطقة يصعب الوصول إليها حاليًا بسبب إغلاق مروري أو أعمال طرق طارئة.',
      };
    case 'COURIER_DELAYED':
      return {
        responsibleParty: 'SHIPPING_COMPANY',
        reasonDetailAr:
          'تأخر المندوب عن نافذة التسليم المتفق عليها مما أدى لاعتذار العميل عن الاستلام.',
      };
    default:
      return {
        responsibleParty: 'RECIPIENT',
        reasonDetailAr: 'تعذر تسليم الشحنة للمستلم النهائي وبدء إجراءات المرتجع.',
      };
  }
}

/**
 * 1. بدء دورة المرتجع الموثقة (Initiate Documented Return Workflow)
 * يحدد سبب المرتجع، موقعه الحالي، الطرف المسؤول، وتكلفة النقل ورسوم المرتجع المستحقة وفق شروط العقد.
 */
export function initiateShipmentReturnWorkflow(
  state: GameState,
  trackingNumber: string,
  reasonOverride?: DeliveryAttemptResult
): { state: GameState; success: boolean; messageAr: string } {
  const withProfiles = ensureClientContractProfiles(state);
  const shipment = withProfiles.shipments.find(
    (s) => s.trackingNumber === trackingNumber
  );
  if (!shipment) {
    return {
      state: withProfiles,
      success: false,
      messageAr: 'لم يتم العثور على الشحنة المطلوبة.',
    };
  }

  if (
    shipment.returnRecord &&
    shipment.returnRecord.returnStatus === 'CONFIRMED_CLOSED'
  ) {
    return {
      state: withProfiles,
      success: false,
      messageAr: 'تم إغلاق ملف هذا المرتجع مسبقًا بتأكيد استلام موثق.',
    };
  }

  const client = withProfiles.clients.find((c) => c.id === shipment.clientId);
  const contractProfile =
    client?.contractProfile ||
    (client ? createInitialClientContractProfile(client) : undefined);

  const reasonType: DeliveryAttemptResult =
    reasonOverride ||
    (shipment.lastAttemptResult &&
    shipment.lastAttemptResult !== 'DELIVERED_SUCCESS'
      ? shipment.lastAttemptResult
      : 'CLIENT_REFUSED');

  const { responsibleParty, reasonDetailAr } =
    classifyReturnResponsibilityAndDetails(reasonType);

  const routeInfo = calculateEgyptRouteDistance(
    shipment.deliveryZone,
    shipment.pickupZone
  );
  const distanceToMerchantKm = Math.max(4.5, routeInfo.distanceKm);
  const estimatedReturnMinutes = Math.max(
    20,
    routeInfo.estimatedTransitMinutes
  );
  const returnTransportCostPiastres = egpToPiastres(
    Math.round(18 + distanceToMerchantKm * 1.5)
  );

  // حساب رسوم المرتجع المستحقة وأجر الشحن المحتفظ به وفق العقد والمسؤولية
  let contractualReturnFeePiastres = 0;
  let originalShippingFeeRetainedPiastres = 0;

  if (responsibleParty === 'SHIPPING_COMPANY') {
    // إذا كان السبب تأخير شركة الشحن، لا تستحق رسوم مرتجع وتتحمل تكلفة النقل
    contractualReturnFeePiastres = 0;
    originalShippingFeeRetainedPiastres = 0;
  } else if (responsibleParty === 'MERCHANT_CLIENT') {
    // خطأ عنوان من التاجر: شركة الشحن تحتفظ بأجر الشحن الأصلي كاملاً + رسوم المرتجع التعاقدية
    contractualReturnFeePiastres =
      contractProfile?.returnFeePiastres ?? egpToPiastres(30);
    originalShippingFeeRetainedPiastres = shipment.serviceFeePiastres;
  } else {
    // رفض المستلم أو غيابه
    contractualReturnFeePiastres =
      contractProfile?.returnFeePiastres ?? egpToPiastres(30);
    originalShippingFeeRetainedPiastres =
      contractProfile?.retainsOriginalFeeOnRecipientRefusal
        ? shipment.serviceFeePiastres
        : Math.round(shipment.serviceFeePiastres * 0.5);
  }

  const timeLabel = formatClockTime(withProfiles.clock.minutesFromMidnight);
  const returnRecord: ShipmentReturnRecord = {
    returnId: `RET-${shipment.trackingNumber}`,
    trackingNumber: shipment.trackingNumber,
    clientId: shipment.clientId,
    clientName: shipment.clientName,
    reasonType,
    reasonDetailAr,
    responsibleParty,
    currentPhysicalLocationAr:
      'رف المرتجعات المعلقة — مستودع انجوبيا المركزي (العباسية)',
    returnStatus: 'AT_WAREHOUSE_PENDING_RETURN',
    distanceToMerchantKm,
    estimatedReturnMinutes,
    returnTransportCostPiastres,
    contractualReturnFeePiastres,
    originalShippingFeeRetainedPiastres,
    merchantConfirmedReceipt: false,
    evidenceLogAr: [
      `[${timeLabel} - اليوم ${withProfiles.clock.day}] فتح ملف مرتجع رسمي للشحنة ${shipment.trackingNumber}: ${reasonDetailAr}`,
      `تحديد المسؤولية التعاقدية: ${
        responsibleParty === 'RECIPIENT'
          ? 'المستلم النهائي'
          : responsibleParty === 'MERCHANT_CLIENT'
            ? 'الشركة العميلة (التاجر)'
            : responsibleParty === 'SHIPPING_COMPANY'
              ? 'شركة الشحن (تأخير تشغيلي)'
              : 'ظرف طارئ مشترك'
      } — رسوم المرتجع المستحقة عند التوثيق: ${formatEGP(contractualReturnFeePiastres)}.`,
    ],
    initiatedAtTotalMinutes: withProfiles.clock.totalElapsedMinutes,
    financialSettlementKey: `RET-SETTLE-${shipment.trackingNumber}-D${withProfiles.clock.day}`,
    financialSettled: false,
  };

  const updatedShipments = withProfiles.shipments.map((s) =>
    s.trackingNumber === shipment.trackingNumber
      ? {
          ...s,
          status: 'DELIVERY_FAILED' as const,
          operationalLocation: 'RETURNING_TO_WAREHOUSE' as const,
          responsibleDepartment: 'WAREHOUSE' as const,
          lastAttemptResult: reasonType,
          failureReason: reasonDetailAr,
          returnRecord,
          timeline: [
            ...s.timeline,
            {
              id: `EVT-RET-INIT-${s.trackingNumber}-${s.timeline.length + 1}`,
              day: withProfiles.clock.day,
              timestampLabel: `${timeLabel} — فتح ملف مرتجع بالمستودع`,
              totalMinutes: withProfiles.clock.totalElapsedMinutes,
              status: 'DELIVERY_FAILED' as const,
              location: 'RETURNING_TO_WAREHOUSE' as const,
              department: 'WAREHOUSE' as const,
              note: `تم قيد الطرد في سجل المرتجعات المعلقة بالمستودع (${reasonDetailAr}) بانتظار الإرسال لمقر الشركة العميلة وتأكيد الاستلام الموثق.`,
            },
          ],
        }
      : s
  );

  return {
    state: ensureClientContractProfiles({
      ...withProfiles,
      shipments: updatedShipments,
    }),
    success: true,
    messageAr: `تم فتح ملف مرتجع موثق للشحنة ${shipment.trackingNumber} في المستودع. يرجى تكليف مندوب لإرجاع الطرد إلى «${shipment.clientName}» والحصول على تأكيد استلام رسمي.`,
  };
}

/**
 * 2. متابعة إرجاع الشحنة وإيصالها لمقر الشركة العميلة بناءً على الموارد والمسافة
 * ملاحظة جوهرية: وصول المرتجع لمقر الشركة العميلة يحوله إلى DELIVERED_TO_MERCHANT_UNCONFIRMED
 * ولا يعتبر مستلماً نهائياً أو مغلقاً (CONFIRMED_CLOSED) إلا بعد تأكيد استلام موثق من الشركة العميلة!
 */
export function dispatchReturnToMerchantClient(
  state: GameState,
  trackingNumber: string,
  preferredCourierId?: string
): { state: GameState; success: boolean; messageAr: string } {
  let workingState = ensureClientContractProfiles(state);
  let shipment = workingState.shipments.find(
    (s) => s.trackingNumber === trackingNumber
  );
  if (!shipment) {
    return {
      state: workingState,
      success: false,
      messageAr: 'الشحنة غير موجودة.',
    };
  }

  if (!shipment.returnRecord) {
    const initiated = initiateShipmentReturnWorkflow(
      workingState,
      trackingNumber
    );
    if (!initiated.success) return initiated;
    workingState = initiated.state;
    shipment = workingState.shipments.find(
      (s) => s.trackingNumber === trackingNumber
    )!;
  }

  const returnRecord = shipment.returnRecord!;
  if (returnRecord.returnStatus === 'CONFIRMED_CLOSED') {
    return {
      state: workingState,
      success: false,
      messageAr: 'هذا المرتجع مؤكد ومغلق بالفعل.',
    };
  }

  const courier = preferredCourierId
    ? workingState.couriers.find((c) => c.id === preferredCourierId)
    : workingState.couriers.find((c) => c.status !== 'UNAVAILABLE') ||
      workingState.couriers[0];

  if (!courier) {
    return {
      state: workingState,
      success: false,
      messageAr: 'لا يوجد مندوب متاح حاليًا لنقل المرتجع إلى مقر الشركة العميلة.',
    };
  }

  const timeLabel = formatClockTime(workingState.clock.minutesFromMidnight);
  const transportCostRefId = `RET-TRANSPORT-${shipment.trackingNumber}`;
  const alreadyChargedTransport = workingState.ledger.some(
    (l) => l.referenceId === transportCostRefId
  );

  if (!alreadyChargedTransport && returnRecord.returnTransportCostPiastres > 0) {
    const afford = canAffordImmediatePayment(
      workingState,
      returnRecord.returnTransportCostPiastres
    );
    if (!afford.allowed) {
      return {
        state: workingState,
        success: false,
        messageAr: `السيولة النقدية لا تكفي لتغطية تكلفة نقل المرتجع (${formatEGP(returnRecord.returnTransportCostPiastres)}).`,
      };
    }

    workingState = recordLedgerTransaction(workingState, {
      type: 'OPERATING_EXPENSE_PAID',
      amountPiastres: returnRecord.returnTransportCostPiastres,
      debitAccount: 'OPERATING_EXPENSE',
      creditAccount: 'CASH',
      referenceId: transportCostRefId,
      description: `تكلفة نقل وإرجاع ميداني للطرد المرتجع (${shipment.trackingNumber}) لمسافة ${returnRecord.distanceToMerchantKm} كم إلى مقر «${shipment.clientName}»`,
    });
  }

  const updatedReturnRecord: ShipmentReturnRecord = {
    ...returnRecord,
    assignedReturnCourierId: courier.id,
    assignedReturnCourierName: courier.name,
    currentPhysicalLocationAr: `مكتب استلام المرتجعات بمقر «${shipment.clientName}» (بانتظار توقيع/كود تأكيد الاستلام)`,
    returnStatus: 'DELIVERED_TO_MERCHANT_UNCONFIRMED',
    dispatchedToMerchantAtTotalMinutes: workingState.clock.totalElapsedMinutes,
    deliveredToMerchantAtTotalMinutes:
      workingState.clock.totalElapsedMinutes +
      returnRecord.estimatedReturnMinutes,
    merchantConfirmedReceipt: false, // لا يُغلق ولا يعتبر مستلماً نهائياً بدون توثيق الاستلام!
    evidenceLogAr: [
      ...returnRecord.evidenceLogAr,
      `[${timeLabel}] تحرك المندوب «${courier.name}» لمسافة ${returnRecord.distanceToMerchantKm} كم وأوصل الطرد المرتجع إلى مقر «${shipment.clientName}» — الحالة: بانتظار تأكيد الاستلام الموثق من التاجر.`,
    ],
  };

  const updatedShipments = workingState.shipments.map((s) =>
    s.trackingNumber === shipment!.trackingNumber
      ? {
          ...s,
          operationalLocation: 'CLIENT_PREMISES' as const,
          responsibleDepartment: 'CUSTOMER_SERVICE' as const,
          returnRecord: updatedReturnRecord,
          timeline: [
            ...s.timeline,
            {
              id: `EVT-RET-DISP-${s.trackingNumber}-${s.timeline.length + 1}`,
              day: workingState.clock.day,
              timestampLabel: `${timeLabel} — وصول المرتجع لمقر العميل (بانتظار تأكيد الاستلام)`,
              totalMinutes: workingState.clock.totalElapsedMinutes,
              status: s.status,
              location: 'CLIENT_PREMISES' as const,
              department: 'CUSTOMER_SERVICE' as const,
              actorId: courier.id,
              actorName: courier.name,
              note: `أوصل المندوب «${courier.name}» الطرد المرتجع إلى مقر «${shipment!.clientName}» — لم يُغلق الملف بعد بانتظار تأكيد الاستلام الموثق من الشركة العميلة.`,
            },
          ],
        }
      : s
  );

  return {
    state: {
      ...workingState,
      shipments: updatedShipments,
    },
    success: true,
    messageAr: `أوصل المندوب «${courier.name}» المرتجع (${shipment.trackingNumber}) إلى مقر «${shipment.clientName}». الطرد الآن في حالة «بانتظار تأكيد الاستلام الموثق» ولن يُغلق نهائيًا حتى تؤكد الشركة العميلة الاستلام.`,
  };
}

/**
 * 3. توثيق استلام الشركة العميلة للمرتجع أو تسجيل مماطلة/نزاع موثق بالأدلة
 * - لا يُغلق المرتجع (CONFIRMED_CLOSED) ولا يتحول الطرد إلى RETURNED إلا عند CONFIRM_RECEIPT الموثق.
 * - عند CONFIRM_RECEIPT: يتم قيد رسوم الشحن المحتفظ بها ورسوم المرتجع كقيود مالية مستقلة وغير مكررة (Idempotent).
 * - عند MERCHANT_DELAY_CONFIRMATION أو MERCHANT_DISPUTE: يبقى المرتجع مفتوحاً/معلقاً ويُسجل في ملف الشركة العميلة بالأدلة.
 */
export function recordMerchantReturnConfirmationOrDispute(
  state: GameState,
  trackingNumber: string,
  outcomeAction:
    | 'CONFIRM_RECEIPT'
    | 'MERCHANT_DELAY_CONFIRMATION'
    | 'MERCHANT_DISPUTE',
  noteOrConfirmationCode?: string
): { state: GameState; success: boolean; messageAr: string } {
  const workingState = ensureClientContractProfiles(state);
  const shipment = workingState.shipments.find(
    (s) => s.trackingNumber === trackingNumber
  );
  if (!shipment || !shipment.returnRecord) {
    return {
      state: workingState,
      success: false,
      messageAr: 'لا يوجد سجل مرتجع مفتوح لهذه الشحنة بعد.',
    };
  }

  const returnRecord = shipment.returnRecord;
  const timeLabel = formatClockTime(workingState.clock.minutesFromMidnight);

  if (
    outcomeAction === 'MERCHANT_DELAY_CONFIRMATION' ||
    outcomeAction === 'MERCHANT_DISPUTE'
  ) {
    const isDispute = outcomeAction === 'MERCHANT_DISPUTE';
    const nextStatus = isDispute
      ? ('DISPUTED_BY_MERCHANT' as const)
      : ('DELIVERED_TO_MERCHANT_UNCONFIRMED' as const);

    const evidenceNote = isDispute
      ? `[اليوم ${workingState.clock.day} - ${timeLabel}] نزاع استلام مرتجع (${shipment.trackingNumber}): ${
          noteOrConfirmationCode ||
          'ادّعى مسؤول مخزن العميل عدم مطابقة حالة الكرتونة ورفض التوقيع الفوري.'
        }`
      : `[اليوم ${workingState.clock.day} - ${timeLabel}] تأخير توثيق استلام مرتجع (${shipment.trackingNumber}): ${
          noteOrConfirmationCode ||
          'تسلّم مخزن العميل الطرد فعليًا لكنه ماطل في إصدار كود تأكيد الاستلام الرسمي.'
        }`;

    const updatedReturnRecord: ShipmentReturnRecord = {
      ...returnRecord,
      returnStatus: nextStatus,
      merchantConfirmedReceipt: false, // مستحيل اعتباره مستلماً نهائياً دون توثيق!
      disputeReasonAr: evidenceNote,
      evidenceLogAr: [...returnRecord.evidenceLogAr, evidenceNote],
    };

    const updatedClients = workingState.clients.map((cl) => {
      if (cl.id !== shipment.clientId) return cl;
      const profile =
        cl.contractProfile || createInitialClientContractProfile(cl);
      return {
        ...cl,
        contractProfile: {
          ...profile,
          returnConfirmationDelayCount:
            profile.returnConfirmationDelayCount + 1,
          disputedReturnsCount: isDispute
            ? profile.disputedReturnsCount + 1
            : profile.disputedReturnsCount,
          documentedEvidenceNotesAr: [
            evidenceNote,
            ...profile.documentedEvidenceNotesAr,
          ].slice(0, 15),
        },
      };
    });

    const updatedShipments = workingState.shipments.map((s) =>
      s.trackingNumber === shipment.trackingNumber
        ? {
            ...s,
            // يبقى في حالة DELIVERY_FAILED ولا يتحول إلى RETURNED المغلق!
            status: 'DELIVERY_FAILED' as const,
            returnRecord: updatedReturnRecord,
            timeline: [
              ...s.timeline,
              {
                id: `EVT-RET-UNCONF-${s.trackingNumber}-${s.timeline.length + 1}`,
                day: workingState.clock.day,
                timestampLabel: `${timeLabel} — ${isDispute ? 'نزاع استلام مرتجع' : 'تأخر توثيق استلام المرتجع'}`,
                totalMinutes: workingState.clock.totalElapsedMinutes,
                status: 'DELIVERY_FAILED' as const,
                location: 'CLIENT_PREMISES' as const,
                department: 'CUSTOMER_SERVICE' as const,
                note: evidenceNote,
              },
            ],
          }
        : s
    );

    let nextState: GameState = {
      ...workingState,
      clients: updatedClients,
      shipments: updatedShipments,
    };

    nextState = pushInlineBubbleNotification(nextState, {
      dedupeKey: `return-unconfirmed-${shipment.trackingNumber}-${outcomeAction}-${workingState.clock.day}`,
      sender: 'SECRETARY',
      category: 'RETURN_ALERT',
      titleAr: isDispute
        ? `نزاع على تأكيد استلام مرتجع (${shipment.trackingNumber})`
        : `تأخر «${shipment.clientName}» في تأكيد استلام المرتجع`,
      shortPreviewAr: `المرتجع ${shipment.trackingNumber} لم يُغلق نهائيًا لعدم صدور تأكيد استلام موثق من «${shipment.clientName}» — تم تدوين الواقعة بالأدلة في ملف العميل.`,
      factsAr: [
        `حالة المرتجع الحالية: ${
          isDispute
            ? 'متنازع عليه (DISPUTED_BY_MERCHANT)'
            : 'معلق بانتظار التوثيق (DELIVERED_TO_MERCHANT_UNCONFIRMED)'
        }.`,
        `تم تدوين الواقعة في السجل التعاقدي لـ «${shipment.clientName}» ليأخذها السكرتير في الاعتبار عند فحص الصفقات القادمة.`,
      ],
      projectionsAr: [
        'لن يتم إغلاق ملف المرتجع أو إسقاط مطالبة الشركة العميلة إلا بعد إصدار كود التوثيق الرسمي.',
      ],
      alternativesAr: [
        `مطالبة مسؤول مخزن «${shipment.clientName}» بكود التوثيق مقابل محضر تسليم المندوب.`,
        'اشتراط الدفع المقدم أو توثيق OTP فوري في صفقات هذا العميل القادمة.',
      ],
      severity: 'WARNING',
      relatedTargetSection: 'SHIPMENTS',
    });

    return {
      state: nextState,
      success: true,
      messageAr: isDispute
        ? `تم تسجيل النزاع رسميًا بالأدلة على الشحنة ${shipment.trackingNumber}. يظل المرتجع مفتوحًا ومعلقًا حتى يتم الفصل وتوثيق الاستلام.`
        : `تم توثيق مماطلة «${shipment.clientName}» في تأكيد استلام المرتجع (${shipment.trackingNumber}). يظل المرتجع معلقًا وغير مغلق نهائيًا حتى يصدر التأكيد الرسمي.`,
    };
  }

  // حالة CONFIRM_RECEIPT: تأكيد استلام موثق رسمياً من الشركة العميلة
  const confirmationCode =
    noteOrConfirmationCode?.trim() ||
    `OTP-RET-${shipment.trackingNumber.slice(-4)}-${workingState.clock.day}`;

  return settleConfirmedReturnFinancialsIdempotent(
    workingState,
    shipment,
    returnRecord,
    confirmationCode
  );
}

/**
 * 4. التسوية المالية المستقلة والمانعة للتكرار (Idempotent Financial Settlement for Confirmed Returns)
 * تسجل رسوم الشحن المحتفظ بها ورسوم المرتجع بشكل مستقل، ولا تكرر الرسوم عند إعادة المحاولة.
 */
export function settleConfirmedReturnFinancialsIdempotent(
  state: GameState,
  shipment: Shipment,
  returnRecord: ShipmentReturnRecord,
  confirmationCode: string
): { state: GameState; success: boolean; messageAr: string } {
  let workingState = { ...state };
  const timeLabel = formatClockTime(workingState.clock.minutesFromMidnight);
  const settlementKey =
    returnRecord.financialSettlementKey ||
    `RET-SETTLE-${shipment.trackingNumber}`;

  const shippingFeeRefId = `${settlementKey}-ORIG-SHIPPING`;
  const returnFeeRefId = `${settlementKey}-RETURN-FEE`;

  const alreadySettledShippingFee = workingState.ledger.some(
    (l) => l.referenceId === shippingFeeRefId
  );
  const alreadySettledReturnFee = workingState.ledger.some(
    (l) => l.referenceId === returnFeeRefId
  );

  let totalReceivableAdded = 0;

  // 1) قيد مستقل لرسوم الشحن الأصلية المحتفظ بها (إن نص العقد على ذلك ولم تُقيد من قبل)
  if (
    !returnRecord.financialSettled &&
    !alreadySettledShippingFee &&
    returnRecord.originalShippingFeeRetainedPiastres > 0
  ) {
    totalReceivableAdded += returnRecord.originalShippingFeeRetainedPiastres;
    workingState = recordLedgerTransaction(workingState, {
      type: 'REVENUE_EARNED',
      amountPiastres: returnRecord.originalShippingFeeRetainedPiastres,
      debitAccount: 'ACCOUNTS_RECEIVABLE',
      creditAccount: 'SERVICE_REVENUE',
      referenceId: shippingFeeRefId,
      description: `أجر شحن أصلي محتفظ به تعاقديًا للشحنة المرتجعة (${shipment.trackingNumber}) بعد توثيق الاستلام (${confirmationCode})`,
    });
  }

  // 2) قيد مستقل لرسوم المرتجع التعاقدية (منفصل تماماً عن رسوم الشحن الأصلية)
  if (
    !returnRecord.financialSettled &&
    !alreadySettledReturnFee &&
    returnRecord.contractualReturnFeePiastres > 0
  ) {
    totalReceivableAdded += returnRecord.contractualReturnFeePiastres;
    workingState = recordLedgerTransaction(workingState, {
      type: 'REVENUE_EARNED',
      amountPiastres: returnRecord.contractualReturnFeePiastres,
      debitAccount: 'ACCOUNTS_RECEIVABLE',
      creditAccount: 'SERVICE_REVENUE',
      referenceId: returnFeeRefId,
      description: `رسوم معالجة وإرجاع مرتجع موثق (${shipment.trackingNumber}) على حساب «${shipment.clientName}» بكود توثيق (${confirmationCode})`,
    });
  }

  const evidenceCloseNote = `[اليوم ${workingState.clock.day} - ${timeLabel}] تم تأكيد استلام المرتجع (${shipment.trackingNumber}) رسميًا من «${shipment.clientName}» بكود التوثيق (${confirmationCode}) وإغلاق الملف المالي.`;

  const updatedClients = workingState.clients.map((cl) => {
    if (cl.id !== shipment.clientId) return cl;
    const profile =
      cl.contractProfile || createInitialClientContractProfile(cl);
    return {
      ...cl,
      receivableBalancePiastres:
        cl.receivableBalancePiastres + totalReceivableAdded,
      contractProfile: {
        ...profile,
        documentedEvidenceNotesAr: [
          evidenceCloseNote,
          ...profile.documentedEvidenceNotesAr,
        ].slice(0, 15),
      },
    };
  });

  const closedReturnRecord: ShipmentReturnRecord = {
    ...returnRecord,
    returnStatus: 'CONFIRMED_CLOSED',
    currentPhysicalLocationAr: `مخزن «${shipment.clientName}» — مستلم وموثق رسميًا (${confirmationCode})`,
    merchantConfirmedReceipt: true,
    merchantConfirmationCode: confirmationCode,
    confirmedClosedAtTotalMinutes: workingState.clock.totalElapsedMinutes,
    financialSettled: true,
    evidenceLogAr: [...returnRecord.evidenceLogAr, evidenceCloseNote],
  };

  const updatedShipments = workingState.shipments.map((s) =>
    s.trackingNumber === shipment.trackingNumber
      ? {
          ...s,
          status: 'RETURNED' as const,
          operationalLocation: 'CLIENT_PREMISES' as const,
          responsibleDepartment: 'COMPLETED' as const,
          completedAtDay: workingState.clock.day,
          revenueEarnedPiastres:
            s.revenueEarnedPiastres + totalReceivableAdded,
          receivableOutstandingPiastres:
            s.receivableOutstandingPiastres + totalReceivableAdded,
          returnRecord: closedReturnRecord,
          timeline: [
            ...s.timeline,
            {
              id: `EVT-RET-CLOSED-${s.trackingNumber}-${s.timeline.length + 1}`,
              day: workingState.clock.day,
              timestampLabel: `${timeLabel} — تأكيد استلام المرتجع وإغلاق الملف (${confirmationCode})`,
              totalMinutes: workingState.clock.totalElapsedMinutes,
              status: 'RETURNED' as const,
              location: 'CLIENT_PREMISES' as const,
              department: 'COMPLETED' as const,
              note: `تم إغلاق ملف المرتجع نهائيًا بعد توثيق استلام «${shipment.clientName}» بكود (${confirmationCode}).`,
            },
          ],
        }
      : s
  );

  workingState = {
    ...workingState,
    clients: updatedClients,
    shipments: updatedShipments,
  };

  workingState = pushNotification(workingState, {
    dedupeKey: `RET-CONFIRMED-${shipment.trackingNumber}`,
    trackingNumber: shipment.trackingNumber,
    title: `توثيق وإغلاق مرتجع (${shipment.trackingNumber})`,
    message: `أكدت الشركة العميلة (${shipment.clientName}) استلام المرتجع بكود (${confirmationCode}). قُيدت رسوم الشحن المحتفظ بها (${formatEGP(returnRecord.originalShippingFeeRetainedPiastres)}) ورسوم المرتجع (${formatEGP(returnRecord.contractualReturnFeePiastres)}) بشكل مستقل.`,
    department: 'COMPLETED',
    outcomeLabel: 'مرتجع موثق ومغلق',
    severity: 'SUCCESS',
  });

  return {
    state: workingState,
    success: true,
    messageAr: `تم توثيق استلام المرتجع (${shipment.trackingNumber}) بكود (${confirmationCode}) وإغلاق الملف نهائيًا. قُيدت رسوم الشحن المحتفظ بها (${formatEGP(
      returnRecord.originalShippingFeeRetainedPiastres
    )}) ورسوم المرتجع (${formatEGP(
      returnRecord.contractualReturnFeePiastres
    )}) في حساب مستحقات «${shipment.clientName}» دون أي ازدواجية.`,
  };
}

/**
 * 5. حسم التعارض بين الحفظ المحلي والسحابي والتعافي من فشل المزامنة
 * يضمن عدم ضياع تقدم اللاعب أو كود الشركة أو حساب Google وعدم تكرار أي قيود مالية.
 */
export function resolveLocalAndCloudSyncConflict(
  localState: GameState,
  cloudState: GameState,
  options?: { syncAttemptFailedFirst?: boolean }
): {
  resolvedState: GameState;
  record: SyncConflictResolutionRecord;
} {
  const localLevel = localState.company.level || 1;
  const cloudLevel = cloudState.company.level || 1;
  const localDay = localState.clock.day;
  const cloudDay = cloudState.clock.day;
  const localMinutes = localState.clock.totalElapsedMinutes;
  const cloudMinutes = cloudState.clock.totalElapsedMinutes;

  let winnerSource: 'LOCAL_STATE' | 'CLOUD_STATE' | 'MERGED_SAFELY' =
    'LOCAL_STATE';
  let baseState = localState;
  let secondaryState = cloudState;

  if (
    cloudLevel > localLevel ||
    (cloudLevel === localLevel && cloudDay > localDay) ||
    (cloudLevel === localLevel &&
      cloudDay === localDay &&
      cloudMinutes > localMinutes)
  ) {
    winnerSource = 'CLOUD_STATE';
    baseState = cloudState;
    secondaryState = localState;
  } else if (
    localLevel === cloudLevel &&
    localDay === cloudDay &&
    localMinutes === cloudMinutes &&
    localState.ledger.length !== cloudState.ledger.length
  ) {
    winnerSource = 'MERGED_SAFELY';
  }

  const mergedExecutedDecisionIds = Array.from(
    new Set([
      ...baseState.executedDecisionIds,
      ...secondaryState.executedDecisionIds,
    ])
  );
  const mergedProcessedEventIds = Array.from(
    new Set([
      ...baseState.processedSimulationEventIds,
      ...secondaryState.processedSimulationEventIds,
    ])
  );

  // ضمان عدم تكرار أي قيد في دفتر الأستاذ (Deduplicate Ledger by ID & referenceId)
  const seenLedgerKeys = new Set<string>();
  const deduplicatedLedger: LedgerEntry[] = [];
  for (const entry of baseState.ledger) {
    const key = `${entry.id}::${entry.referenceId}::${entry.type}`;
    if (!seenLedgerKeys.has(key)) {
      seenLedgerKeys.add(key);
      deduplicatedLedger.push(entry);
    }
  }

  // Recompute cashPiastres from deduplicatedLedger so the accounting invariant is 100% preserved
  const recomputedCashPiastres = deduplicatedLedger.reduce(
    (sum, entry) => sum + (entry.affectsCash ? entry.cashDeltaPiastres : 0),
    0
  );

  const record: SyncConflictResolutionRecord = {
    id: `SYNC-RESOLVE-${Date.now()}`,
    timestampIso: new Date().toISOString(),
    localDay,
    cloudDay,
    localLevel,
    cloudLevel,
    winnerSource,
    syncAttemptFailedFirst: Boolean(options?.syncAttemptFailedFirst),
    recoveredSuccessfully: true,
    summaryAr: `تم حسم التعارض بأمان (${
      winnerSource === 'LOCAL_STATE'
        ? 'اعتماد التقدم المحلي الأحدث'
        : winnerSource === 'CLOUD_STATE'
          ? 'استرجاع التقدم السحابي الأحدث'
          : 'دمج آمن للنسختين'
    }: المستوى ${baseState.company.level} - اليوم ${baseState.clock.day}) مع التحقق من عدم تكرار أي قيود مالية (${deduplicatedLedger.length} قيد فريد).`,
  };

  const existingHistory = baseState.offlineSync?.conflictHistory || [];
  const resolvedState: GameState = {
    ...baseState,
    company: {
      ...baseState.company,
      companyCode:
        baseState.company.companyCode || secondaryState.company.companyCode,
      cashPiastres: recomputedCashPiastres,
    },
    executedDecisionIds: mergedExecutedDecisionIds,
    processedSimulationEventIds: mergedProcessedEventIds,
    ledger: deduplicatedLedger,
    offlineSync: {
      ...(baseState.offlineSync || {
        isOnline: true,
        requiresOnlineSyncPrompt: false,
        lastLocalSaveIso: new Date().toISOString(),
        pendingMilestones: [],
      }),
      isOnline: true,
      requiresOnlineSyncPrompt: false,
      lastCloudSyncIso: new Date().toISOString(),
      simulatedOfflineFailurePending: false,
      pendingMilestones: (baseState.offlineSync?.pendingMilestones || []).map(
        (m) => ({
          ...m,
          syncedToCloud: true,
        })
      ),
      conflictHistory: [record, ...existingHistory].slice(0, 10),
    },
  };

  return { resolvedState, record };
}
