export type ShipmentStatus =
  | 'NEW_REQUEST' // طلب جديد
  | 'ACCEPTED' // مقبول (تم إنشاء رقم تتبع وإسناد للمستودع)
  | 'REJECTED' // مرفوض
  | 'CANCELLED_EXPIRED' // ملغاة لانتهاء المهلة
  | 'ASSIGNED_TO_WAREHOUSE' // مسند إلى المستودع (في انتظار الاستلام)
  | 'ARRIVED_AT_WAREHOUSE' // وصلت إلى المستودع
  | 'RECEIVED_AT_WAREHOUSE' // تم استلامها بالمستودع
  | 'WAITING_SORTING' // تنتظر الفرز
  | 'SORTING' // قيد الفرز
  | 'WAITING_PACKAGING' // تنتظر التغليف
  | 'PREPARING_AT_WAREHOUSE' // قيد التجهيز والتغليف
  | 'READY_FOR_DISPATCH' // جاهزة لاستلام المندوب
  | 'ASSIGNED_TO_COURIER' // استلمها المندوب
  | 'OUT_FOR_DELIVERY' // قيد التوصيل
  | 'DELIVERY_ATTEMPT' // في محاولة تسليم
  | 'DELIVERED' // تم التسليم بنجاح
  | 'DELIVERY_FAILED' // فشل التسليم
  | 'DELAYED_IN_WAREHOUSE' // متأخرة داخل المستودع
  | 'UNLOCATED_IN_WAREHOUSE' // تعذر العثور عليها (بحث داخلي)
  | 'DAMAGED_OR_LOST' // تالفة أو مفقودة
  | 'UNDER_INVESTIGATION' // قيد التحقيق في المشكلة
  | 'RETURNED'; // ملغاة أو مرتجعة للتاجر

export type OperationalLocation =
  | 'AWAITING_RECEIPT' // في انتظار الاستلام
  | 'INSIDE_WAREHOUSE' // داخل المستودع
  | 'SORTING_ZONE' // منطقة الفرز
  | 'PACKAGING_ZONE' // منطقة التغليف
  | 'BEING_PREPARED' // قيد التجهيز
  | 'WAITING_FOR_COURIER' // جاهزة لاستلام المندوب
  | 'WITH_COURIER' // مع المندوب
  | 'IN_DELIVERY_ATTEMPT' // في محاولة تسليم
  | 'RETURNING_TO_WAREHOUSE' // عائدة إلى المستودع
  | 'DELIVERED_TO_RECIPIENT' // سُلّمت للمستلم
  | 'CLIENT_PREMISES'; // لدى العميل

export type ResponsibleDepartment =
  | 'MANAGEMENT' // الإدارة والاستقبال
  | 'ACCOUNTING' // المحاسبة الإدارية
  | 'MARKETING' // التسويق واكتساب العملاء
  | 'HR' // الموارد البشرية
  | 'WAREHOUSE' // المستودع والفرز
  | 'DISPATCH_COURIERS' // التوزيع والمندوبون
  | 'CUSTOMER_SERVICE' // متابعة العملاء والتحقيق
  | 'COMPLETED'; // مغلقة

export type DeliveryAttemptResult =
  | 'DELIVERED_SUCCESS' // تم التسليم بنجاح
  | 'CLIENT_REFUSED' // العميل رفض الاستلام
  | 'CLIENT_ABSENT' // العميل غير موجود
  | 'WRONG_ADDRESS' // العنوان غير صحيح
  | 'UNREACHABLE_AREA' // تعذر الوصول
  | 'COURIER_DELAYED' // تأخر المندوب
  | 'SHIPMENT_UNLOCATED' // الشحنة لم يُعثر عليها
  | 'SHIPMENT_DAMAGED' // تلف أثناء المناولة أو النقل
  | 'POSTPONED_OPERATIONAL'; // تأجلت المحاولة لسبب تشغيلي

export type PaymentTerms = 'PREPAID_CASH' | 'POSTPAID_RECEIVABLE' | 'COD_MERCHANT';

export type AccountCode =
  | 'CASH' // النقدية بالخزينة والبنك
  | 'ACCOUNTS_RECEIVABLE' // مستحقات لدى العملاء
  | 'SERVICE_REVENUE' // إيرادات خدمات الشحن المكتسبة
  | 'OPERATING_EXPENSE' // مصروفات الشحن والتشغيل والصيانة والتسويق
  | 'HR_RECRUITMENT_EXPENSE' // مصروفات إعلانات التوظيف
  | 'MARKETING_EXPENSE' // مصروفات الحملات التسويقية
  | 'SALARY_EXPENSE' // مصروفات الرواتب والمكافآت
  | 'ACCRUED_SALARIES_PAYABLE' // رواتب مستحقة الدفع (التزام دورة 8 أيام)
  | 'MERCHANT_COD_PAYABLE' // أمانات تحصيل الدفع عند الاستلام للتجار
  | 'LIABILITIES_PAYABLE' // التزامات وديون مستحقة للغير
  | 'OPENING_EQUITY'; // رأس المال / الرصيد الافتتاحي

export type LedgerEntryType =
  | 'OPENING_BALANCE'
  | 'REVENUE_EARNED'
  | 'CASH_COLLECTION'
  | 'OPERATING_EXPENSE_PAID'
  | 'OPERATING_EXPENSE_ACCRUED'
  | 'HR_JOB_AD_PAID'
  | 'MARKETING_CAMPAIGN_PAID'
  | 'SALARY_ACCRUED'
  | 'SALARY_OR_BONUS_PAID'
  | 'PENALTY_RECORDED'
  | 'COD_COLLECTED'
  | 'COD_SETTLED'
  | 'LIABILITY_PAYMENT';

export interface GameClock {
  day: number;
  minutesFromMidnight: number; // e.g., 540 = 09:00 AM, 1080 = 18:00 (06:00 PM)
  totalElapsedMinutes: number;
  isPaused: boolean;
  speedMultiplier: 1 | 2 | 4 | 8 | 12;
}

export interface CompanyState {
  id: string;
  companyCode?: string; // كود الشركة الفريد (مثال: ING-4829)
  name: string;
  currentDay: number;
  level: number; // مستوى الشركة التشغيلي والتجاري (1 إلى 5) منفصل عن الأيام
  adminLevel?: number; // المستوى الإداري الخاص بالمطور (3 لصلاحيات المطور والتحرير والاختبار)
  openingCashPiastres: number;
  cashPiastres: number;
  liabilitiesPiastres: number;
  reputation: number; // السمعة المبنية على الأداء الفعلي والتقييمات (تبدأ من 49)
  xp?: number; // نقاط خبرة الشركة المكتسبة من المهمات والتحديات
  marketingPower?: number; // القوة التسويقية المبنية على الحملات والظهور الإعلامي (منفصلة عن السمعة)
  customerSatisfaction: number;
  levelSystemMigratedV3?: boolean;
}

export type OrganicAcquisitionSource =
  | 'ORGANIC_NEW_DISCOVERY' // عميل عضوي جديد عبر اكتشاف الشركة في المنطقة
  | 'ORGANIC_REFERRAL' // عميل عضوي جديد عبر توصية أو علاقات تجارية
  | 'ORGANIC_RETURNING_CLIENT' // عميل عائد بسبب تجربة توصيل سابقة ناجحة
  | 'PAID_MARKETING' // مكتسب عبر حملة تسويقية مدفوعة
  | 'STORY_OR_CONTRACT'; // عميل أساسي أو تعاقدي

export interface WarehouseLogItem {
  id: string;
  day: number;
  timeLabel: string;
  trackingNumber: string;
  action:
    | 'RECEIVED'
    | 'SORTED'
    | 'PACKAGED'
    | 'PREPARED'
    | 'HANDED_TO_COURIER'
    | 'UNLOCATED_ALERT'
    | 'DAMAGED_ALERT'
    | 'FOUND'
    | 'RETURN_RECEIVED';
  staffName: string;
  shelfLocation: string;
  note: string;
}

export interface Warehouse {
  id: string;
  name: string;
  locationAr: string;
  maxCapacity: number; // Maximum slot count
  maxVolumeM3: number; // السعة الحجمية المتاحة بالمتر المكعب
  maxWeightKg: number; // الحد الأقصى للوزن بالكيلوجرام
  storageLocationsCount?: number; // عدد المواقع التخزينية
  receivingRatePerHour?: number; // معدل الاستلام والفرز في الساعة
  packagingRatePerHour?: number; // معدل التغليف والتجهيز في الساعة
  errorAndDamageRatePercent?: number; // معدل الأخطاء والتلف بالمستودع
  rentPerCyclePiastres?: number; // إيجار المستودع كل دورة
  rentedExternalVolumeM3?: number; // سعة حجمية خارجية إضافية متعاقد عليها
  rentedExternalWeightKg?: number; // سعة وزن خارجية إضافية متعاقد عليها
  rentedExtraVolumeM3?: number;
  rentedExtraWeightKg?: number;
  operatingCostPerDayPiastres: number;
  efficiencyLevel: number; // 0 to 100
  logs: WarehouseLogItem[];
}

export type EmployeeRole =
  | 'OPERATIONS_SUPERVISOR'
  | 'WAREHOUSE_CLERK'
  | 'COURIER_MOTO'
  | 'COURIER_VAN'
  | 'ADMIN_ACCOUNTANT';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
export type EmployeeExperienceLevel = ExperienceLevel;

export interface RoleSkillMetric {
  id: string;
  labelAr: string;
  score: number; // 0 to 100
}
export type EmployeeSkillMetric = RoleSkillMetric;

export interface EmployeePenaltyRecord {
  id: string;
  day: number;
  timeLabel: string;
  amountPiastres: number;
  reason: string;
}

export interface EmployeePerformanceFactor {
  id: string;
  labelAr: string;
  delta: number; // e.g., +6 or -12
  isControllableByEmployee: boolean;
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  roleTitleAr: string;
  experienceLevel?: ExperienceLevel; // مبتدئ، متوسط، خبير
  skills?: RoleSkillMetric[];
  roleSpecificSkills?: RoleSkillMetric[];
  baseMonthlySalaryPiastres: number; // Kept for compatibility
  periodicSalaryPiastres?: number; // الراتب الدوري لكل 8 أيام
  salaryDueDay: number;
  salaryCycleDays?: number;
  dailyWagePiastres: number;
  status:
    | 'ACTIVE'
    | 'BUSY'
    | 'DELAYED'
    | 'IN_TRAINING'
    | 'UNDER_INVESTIGATION'
    | 'SUSPENDED'
    | 'ON_LEAVE'
    | 'TERMINATED';
  efficiency: number; // 0 to 100 (overall skill/efficiency)
  speedScore?: number; // سرعة الإنجاز (0-100)
  accuracyScore?: number; // الدقة (0-100)
  punctualityScore?: number; // الالتزام بالمواعيد (0-100)
  stressToleranceScore?: number; // تحمل ضغط العمل (0-100)
  performanceScore?: number; // درجة الأداء المتجددة (0-100)
  performanceFactors?: EmployeePerformanceFactor[];
  performancePositiveFactors?: string[];
  performanceNegativeFactors?: string[];
  isLowPerformWarning?: boolean;
  completedTasksCount: number;
  errorRatePercent: number;
  attributedDelaysCount: number;
  damageOrLossIncidentsCount?: number;
  bonusesPiastres: number;
  approvedPenaltiesPiastres: number;
  accruedSalaryPiastres: number;
  paidSalaryPiastres: number;
  trainingCompletesAtTotalMinutes?: number;
  futureSalaryEffectiveDay?: number;
  futureMonthlySalaryPiastres?: number;
  dailyCapacity: number; // For Admin Accountant: 8 requests/day
  assignedShipmentsToday: number; // For Admin Accountant: processed requests today
  handledTrackingNumbers?: string[];
  reviewCompleted?: boolean; // تم إجراء المراجعة الإدارية (شرط قبل إنهاء الخدمة عند الأداء < 39%)
  terminated?: boolean;
  terminatedAtDay?: number;
  terminationReason?: string;
  hiredAtDay?: number;
  daysWorkedInCurrentCycle?: number;
  penaltyHistory: EmployeePenaltyRecord[];
}

export interface HRCandidate {
  id: string;
  jobAdId: string;
  name: string;
  role: EmployeeRole;
  roleTitleAr: string;
  experienceLevel: ExperienceLevel;
  experienceLabelAr: string;
  salaryPerCyclePiastres: number; // Salary per 8 days
  baseMonthlySalaryPiastres: number;
  periodicSalaryPiastres?: number;
  monthlySalaryEquivalentPiastres?: number;
  expectedEfficiency: number;
  expectedErrorRatePercent: number;
  efficiency?: number;
  speedScore?: number;
  accuracyScore?: number;
  punctualityScore?: number;
  stressToleranceScore?: number;
  errorRatePercent?: number;
  dailyCapacity: number;
  skills: RoleSkillMetric[];
  roleSpecificSkills?: RoleSkillMetric[];
  summaryAr: string;
  bioAr?: string;
  ownsPersonalMotorcycle?: boolean; // يمتلك موتوسيكل شخصي خاص به (الشركة لا تدفع إيجار مركبة عنه)
  needsCompanyVehicle?: boolean; // بدون موتوسيكل ويحتاج مركبة من الشركة لتنفيذ الطلبات
  orderAcceptanceRatePercent?: number;
  customerHandlingScore?: number;
  priorPerformanceSummaryAr?: string;
  hired: boolean;
}

export interface HRJobAd {
  id: string;
  role: EmployeeRole;
  roleTitleAr: string;
  adCostPiastres: number;
  postedAtDay: number;
  postedAtTimeLabel?: string;
  createdAtDay?: number;
  status: 'OPEN' | 'HIRED' | 'CLOSED';
  candidates: HRCandidate[];
}

export interface PayrollCycleState {
  cycleLengthDays: number; // 8 days
  lastPayrollPaidDay: number;
  nextPayrollDueDay: number; // e.g., Day 8, 16, 24...
  processedCycleDays: number[]; // Prevents double payroll deduction on reload
  unpaidSalariesPiastres: number;
  lastPayrollDay?: number;
  nextPayrollDay?: number;
  paidCycleNumbers?: number[];
  lastShortfallWarningDay?: number;
}

export type CourierStatus = 'AVAILABLE' | 'ON_MISSION' | 'ON_BREAK' | 'UNAVAILABLE';

export interface CourierDeliveryRecord {
  id: string;
  day: number;
  timeLabel: string;
  trackingNumber: string;
  result: DeliveryAttemptResult;
  note: string;
}

export interface Courier {
  id: string;
  employeeId: string;
  name: string;
  vehicleId: string;
  ownsPersonalMotorcycle?: boolean; // يمتلك موتوسيكل خاص به (لا تدفع الشركة إيجاراً عنه)
  needsCompanyVehicle?: boolean; // تم توظيفه بدون مركبة ويحتاج تخصيص مركبة من أسطول الشركة
  status: CourierStatus;
  zoneAr: string;
  coveredZones: string[];
  maxLoad: number;
  currentLoad: number;
  maxWeightGrams?: number;
  maxVolumeCm3?: number;
  currentWeightGrams?: number;
  currentVolumeCm3?: number;
  assignedTrackingNumbers: string[];
  activePlatformOrderIds?: string[];
  efficiency: number;
  monthlySalaryPiastres: number;
  tripOperatingCostPiastres: number;
  successfulDeliveriesCount: number;
  failedOrDelayedCount: number;
  deliveryHistory: CourierDeliveryRecord[];
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'MOTORCYCLE' | 'CARGO_VAN';
  typeAr: string;
  catalogId?:
    | 'MOTO_ECONOMY'
    | 'MOTO_HEAVY'
    | 'SMALL_DELIVERY_CAR'
    | 'MEDIUM_TRUCK'
    | 'LARGE_TRUCK';
  vehicleClass?: 'MOTORCYCLE' | 'SMALL_CAR' | 'MEDIUM_TRUCK' | 'LARGE_TRUCK';
  ownershipType?: 'OWNED' | 'LEASED' | 'PERSONAL_COURIER';
  buyPricePiastres?: number;
  leaseCostPerCyclePiastres?: number; // يُخصم فقط في دورة الـ 8 أيام للمركبات المستأجرة
  leasedAtDay?: number;
  purchasedAtDay?: number;
  assignedCourierId?: string | null; // ربط أحادي صارم (مركبة واحدة لمندوب واحد فقط)
  status: 'AVAILABLE' | 'IN_USE' | 'NEEDS_MAINTENANCE';
  capacity: number;
  usedCapacityToday: number;
  maxWeightGrams?: number;
  maxWeightKg?: number;
  internalLengthCm?: number;
  internalWidthCm?: number;
  internalHeightCm?: number;
  maxVolumeCm3?: number;
  usedWeightGrams?: number;
  usedVolumeCm3?: number;
  totalDistanceKm?: number;
  tripsCompletedCount?: number;
  operatingCostPerTripPiastres: number;
  maintenanceHealth: number;
}

export interface ClientInteractionRecord {
  id: string;
  day: number;
  summary: string;
  trustDelta: number;
}

export interface Client {
  id: string;
  name: string;
  roleAr: string;
  type: 'CLOTHING_WORKSHOP' | 'ELECTRONICS_TRADER' | 'PHARMACY_DISTRIBUTOR' | 'LOCAL_STORE';
  typeAr: string;
  receivableBalancePiastres: number;
  merchantCodBalancePiastres: number;
  trustLevel: number;
  avatarId: 'hag_saeed' | 'nourhan' | 'kareem' | 'mahmoud' | 'am_saber';
  acquiredViaMarketingCampaignId?: string;
  acquisitionSource?: OrganicAcquisitionSource;
  organicReasonAr?: string;
  completedShipmentsWithCompanyCount?: number;
  churnedToCompetitor?: boolean;
  contractProfile?: ClientContractAndEvidenceProfile;
  history: ClientInteractionRecord[];
}

export interface ShipmentTimelineEvent {
  id: string;
  day: number;
  timestampLabel: string;
  totalMinutes: number;
  status: ShipmentStatus;
  location: OperationalLocation;
  department: ResponsibleDepartment;
  actorId?: string;
  actorName?: string;
  note: string;
}

export interface ShipmentAccountantEstimate {
  processedByAccountantId: string;
  processedByAccountantName: string;
  processedAtTimeLabel: string;
  reviewedByEmployeeId: string;
  reviewedByEmployeeName: string;
  reviewedAtTimeLabel: string;
  serviceFeePiastres: number; // إيراد خدمة الشحن للشركة
  estimatedFuelCostPiastres: number; // تكلفة البنزين المتوقعة
  estimatedCourierCostPiastres: number; // تكلفة المندوب المخصصة
  fuelAndCourierCostPiastres: number; // البنزين والمندوب معاً
  estimatedPackagingCostPiastres: number; // تكلفة التغليف والمناولة
  packagingAndWarehouseCostPiastres: number;
  allocatedOverheadPiastres: number; // حصة المصروفات التشغيلية المخصصة
  adminOverheadPiastres: number;
  extraExternalCostPiastres: number; // رسوم إضافية أو سعة خارجية
  totalEstimatedCostPiastres: number; // مجموع التكاليف المخصصة للطلب
  expectedNetProfitPiastres: number; // صافي الربح أو الخسارة المتوقعة
  merchantCodTrustPiastres: number; // تحصيل لصالح التاجر (أمانة وليس إيراداً للشركة!)
  isLossExpected: boolean;
  isExpectedLoss: boolean;
  lossReasonAr?: string;
}

export interface ShipmentCustodyEvent {
  id: string;
  stage?: string;
  stageAr?: string;
  actorEmployeeId?: string;
  employeeId?: string;
  actorName?: string;
  employeeName?: string;
  department?: ResponsibleDepartment;
  roleAr?: string;
  day: number;
  timeLabel: string;
  totalMinutes: number;
  conditionNote?: string;
  note?: string;
}

export interface ShipmentDamageLossReport {
  incidentType: 'DAMAGED' | 'LOST' | 'DAMAGE' | 'LOSS';
  stage?: string;
  lastReliableLocationAr?: string;
  stageWhereOccurredAr?: string;
  confirmedEvidence: boolean;
  isConclusive?: boolean;
  responsibleEmployeeId?: string;
  responsibleEmployeeName?: string;
  involvedEmployeeIds?: string[];
  involvedEmployeeNames?: string[];
  investigationSummaryAr: string;
  probableCauseAr?: string;
}

export type AdminDelayActionType =
  | 'CONTACT_WAREHOUSE'
  | 'ASSIGN_STAFF_SEARCH'
  | 'PRIORITIZE_PREPARATION'
  | 'REASSIGN_COURIER'
  | 'PRIORITIZE_NEXT_DELIVERY'
  | 'NOTIFY_CLIENT_NEW_ETA'
  | 'APPROVE_RETRY_ATTEMPT'
  | 'INVESTIGATE_STAFF'
  | 'OFFER_CLIENT_DISCOUNT';

export interface Shipment {
  trackingNumber: string;
  clientId: string;
  clientName: string;
  pickupZone: string;
  deliveryZone: string;
  description: string;
  priority: 'NORMAL' | 'HIGH';
  // Physical properties for Warehouse & Vehicle Capacity (1000g = 1kg, cm3 = L * W * H)
  weightKg?: number;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  volumeCm3?: number;
  volumeM3?: number;
  packageSizeAr?: string;
  dimensionsLabel?: string;
  packagingType?: 'STANDARD' | 'REINFORCED_FRAGILE' | 'HEAVY_DUTY';
  fragilityLevel?: 'LOW' | 'MEDIUM' | 'HIGH_FRAGILE';
  // Financial & Accounting properties
  serviceFeePiastres: number;
  discountAppliedPiastres?: number;
  estimatedOperatingCostPiastres: number;
  actualOperatingCostPiastres: number;
  codAmountPiastres: number;
  paymentTerms: PaymentTerms;
  accountantProcessed?: boolean;
  accountantEstimate?: ShipmentAccountantEstimate;
  awaitingAccountantApproval?: boolean;
  sourceCampaignId?: string;
  organicSourceType?: OrganicAcquisitionSource;
  organicReasonAr?: string;
  // Status & Operational Location
  status: ShipmentStatus;
  operationalLocation: OperationalLocation;
  responsibleDepartment: ResponsibleDepartment;
  warehouseId: string;
  shelfLocation?: string;
  assignedWarehouseStaffId?: string;
  assignedEmployeeId?: string;
  assignedCourierId?: string;
  assignedVehicleId?: string;
  revenueEarnedPiastres: number;
  cashCollectedForFeePiastres: number;
  receivableOutstandingPiastres: number;
  codCollectedInCashPiastres: number;
  codSettledToMerchantPiastres: number;
  // Timers & Deadlines (Central Game Clock)
  createdAtDay: number;
  createdAtTotalMinutes?: number;
  acceptanceDeadlineTotalMinutes?: number;
  acceptanceDeadlineTimeLabel?: string;
  acceptedAtTotalMinutes?: number;
  arrivedAtWarehouseTotalMinutes?: number;
  packagingStartedAtTotalMinutes?: number;
  packagingCompletedAtTotalMinutes?: number;
  pickedUpByCourierTotalMinutes?: number;
  lastStatusChangeTotalMinutes: number;
  lastUpdatedTimeLabel: string;
  nextStepDueTotalMinutes?: number;
  expectedDeliveryTotalMinutes: number;
  expectedDeliveryTimeLabel: string;
  originalExpectedDeliveryTimeLabel?: string;
  completedAtDay?: number;
  isDelayed: boolean;
  delayReason?: string;
  currentRemediationAction?: string;
  requiresManagerIntervention: boolean;
  attemptCount: number;
  lastAttemptResult?: DeliveryAttemptResult;
  failureReason?: string;
  Negotiated?: boolean;
  // Geography, SLA Buffer & Competitor Poaching fields
  distanceKm?: number;
  distanceAccuracyType?: 'VERIFIED_CORRIDOR' | 'ESTIMATED_METRIC';
  minOperationalHours?: number; // الحد الأدنى التشغيلي (9 إلى 10 ساعات للطلبات القياسية بالمستودع)
  quotedClientSlaHours?: number; // المهلة المبلغة للعميل (افتراضياً 15 ساعة لإعطاء هامش أمان للشركة، أو حسب التفاوض >= الحد الأدنى)
  clientRequestedSlaHours?: number; // رغبة العميل في التوصيل السريع للتفاوض عليها
  poachedByCompetitorId?: string;
  poachedByCompetitorName?: string;
  clientReactionNoteAr?: string;
  custodyChain?: ShipmentCustodyEvent[];
  damageLossReport?: ShipmentDamageLossReport;
  returnRecord?: ShipmentReturnRecord;
  processedEventKeys: string[];
  timeline: ShipmentTimelineEvent[];
}

export interface MarketingPackageTier {
  id: string;
  nameAr: string;
  titleAr: string;
  budgetRangeLabelAr: string;
  minBudgetEgp: number;
  maxBudgetEgp: number;
  defaultBudgetEgp: number;
  costPiastres: number;
  minTargetClients: number;
  maxTargetClients: number;
  expectedNewClientsMin: number;
  expectedNewClientsMax: number;
  expectedNewShipmentsMin: number;
  expectedNewShipmentsMax: number;
  requiredMarketingLevel: number;
  levelRequired: number;
  strictDeadlineRatio: number; // Higher tiers bring stricter SLA deadlines
  descriptionAr: string;
}

export interface MarketingCampaign {
  id: string;
  tierId: string;
  tierNameAr: string;
  tierTitleAr: string;
  startedAtDay: number;
  launchedAtDay: number;
  startedAtTimeLabel: string;
  launchedAtTimeLabel: string;
  costPiastres: number;
  budgetSpentPiastres: number;
  leadsGenerated: number;
  convertedClientsCount: number;
  generatedClientsCount: number;
  newShipmentsCount: number;
  generatedShipmentsCount: number;
  generatedTrackingNumbers: string[];
  conversionRatePercent: number;
  status: 'ACTIVE' | 'COMPLETED';
  outcomeSummaryAr: string;
  dailyAutoRepeat?: boolean;
  dailyBudgetPiastres?: number;
  cumulativeAutoSpendPiastres?: number;
  lastAutoRepeatedDay?: number;
  autoRepeatRunsCount?: number;
}

export interface MarketingDeadlineTask {
  id: string;
  titleAr: string;
  descriptionAr: string;
  type: 'DAILY' | 'WEEKLY';
  scope: 'DAILY' | 'WEEKLY';
  createdAtDay: number;
  deadlineTotalMinutes: number;
  deadlineLabelAr: string;
  relatedTrackingNumber?: string;
  targetCount: number;
  targetShipmentsCount: number;
  currentProgress: number;
  completedShipmentsCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  rewardReputationDelta: number;
  reputationImpactOnExpire: number;
}

export interface MarketingState {
  availableBudgetPiastres: number;
  totalSpentPiastres: number;
  totalCampaignSpendPiastres: number;
  acquiredClientsCount: number;
  newShipmentRequestsCount: number;
  conversionRatePercent: number;
  marketingLevel: number;
  churnedClientsCount: number;
  campaigns: MarketingCampaign[];
  tasks: MarketingDeadlineTask[];
  deadlineTasks: MarketingDeadlineTask[];
}

export type SocialComplaintActionType =
  | 'CONTACT_CLIENT_APOLOGIZE'
  | 'INVESTIGATE_DELAY_CAUSE'
  | 'RESCHEDULE_PRIORITY_DELIVERY'
  | 'INSPECT_DAMAGE_COMPENSATE'
  | 'FOLLOW_UP_SHIPMENT'
  | 'EXPEDITE_DELIVERY'
  | 'GRANT_COMPENSATION_DISCOUNT';

export interface SocialMediaPost {
  id: string;
  dedupeKey: string;
  day: number;
  timeLabel: string;
  totalMinutes: number;
  authorClientId: string;
  authorName: string;
  authorRoleAr?: string;
  authorHandle: string;
  authorAvatarId: 'hag_saeed' | 'nourhan' | 'kareem' | 'mahmoud' | 'am_saber';
  relatedTrackingNumber?: string;
  sentiment: 'PRAISE' | 'COMPLAINT' | 'CAMPAIGN_BUZZ';
  ratingStars: 1 | 2 | 3 | 4 | 5;
  contentAr: string;
  likesCount: number;
  commentsCount: number;
  reputationDelta: number;
  complaintStatus?: 'OPEN' | 'RESOLVED';
  complaintResolved?: boolean;
  complaintCategory?: 'DELAY' | 'DELIVERY_FAILED' | 'DAMAGE_OR_LOSS' | 'EXPIRED_DEADLINE';
  resolutionSummaryAr?: string;
  resolutionNoteAr?: string;
  resolvedActionType?: SocialComplaintActionType;
}

export interface TutorialStepItem {
  id: string;
  day: 1 | 2;
  stepNumber: number;
  order: number;
  titleAr: string;
  instructionAr: string;
  targetSection?: string;
  completed: boolean;
}

export interface TutorialState {
  dismissed: boolean;
  startBriefingDismissedForDay: number;
  seenFeatureHints: string[];
  steps: TutorialStepItem[];
  day1Steps: TutorialStepItem[];
  day2Steps: TutorialStepItem[];
}

export interface AppNotification {
  id: string;
  dedupeKey: string;
  day: number;
  timeLabel: string;
  totalMinutes: number;
  trackingNumber?: string;
  employeeId?: string;
  title: string;
  message: string;
  causeReasonAr?: string;
  department: ResponsibleDepartment;
  outcomeLabel: string;
  actionRequiredLabel?: string;
  targetSection?: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  read: boolean;
}

export interface LedgerEntry {
  id: string;
  day: number;
  timeLabel?: string;
  sequenceNumber: number;
  type: LedgerEntryType;
  amountPiastres: number;
  debitAccount: AccountCode;
  creditAccount: AccountCode;
  referenceId: string;
  description: string;
  affectsCash: boolean;
  cashDeltaPiastres: number;
}

export interface DecisionConditionCheck {
  allowed: boolean;
  reasonIfDenied?: string;
}

export interface DecisionOption {
  id: string;
  label: string;
  subtitle: string;
  conditionsDescription: string;
  expectedFinancialImpactLabel: string;
  requiredCashPiastres?: number;
  requiresOperationalCapacity?: boolean;
  requiresMinTrust?: { clientId: string; minTrust: number };
  effectType:
    | 'ACKNOWLEDGE_BRIEFING'
    | 'ACCEPT_SHIPMENT'
    | 'NEGOTIATE_SHIPMENT'
    | 'REJECT_SHIPMENT'
    | 'PAY_LIABILITY_FULL'
    | 'PAY_LIABILITY_PARTIAL'
    | 'VEHICLE_FULL_MAINTENANCE'
    | 'VEHICLE_QUICK_FIX'
    | 'BUY_NEW_MOTORCYCLE'
    | 'SETTLE_MERCHANT_COD'
    | 'COLLECT_CLIENT_RECEIVABLE';
  targetShipmentId?: string;
  targetVehicleId?: string;
  targetClientId?: string;
  customAmountPiastres?: number;
}

export interface StorySituation {
  id: string;
  day: number;
  orderIndex: number;
  title: string;
  speakerName: string;
  speakerRole: string;
  speakerAvatarId: 'mahmoud' | 'am_saber' | 'hag_saeed' | 'nourhan' | 'kareem';
  dialogueText: string;
  documentBadge?: string;
  relatedShipmentTracking?: string;
  mandatory: boolean;
  resolved: boolean;
  chosenOptionId?: string;
  outcomeSummary?: string;
  options: DecisionOption[];
}

export interface DaySummaryReport {
  day: number;
  openingCashPiastres: number;
  closingCashPiastres: number;
  earnedRevenuePiastres: number;
  operatingExpensesPiastres: number;
  accruedSalariesPiastres: number;
  netOperatingProfitPiastres: number;
  cashReceiptsPiastres: number;
  cashPaymentsPiastres: number;
  closingReceivablesPiastres: number;
  closingCodPayablesPiastres: number;
  closingLiabilitiesPiastres: number;
  shipmentsDelivered: number;
  shipmentsFailedOrReturned: number;
  shipmentsRejected: number;
  shipmentsDelayedCount?: number;
  organicOrdersGeneratedToday?: number;
  reputationStart?: number;
  reputationEnd: number;
  reputationDelta?: number;
  employeePerformanceSummary?: {
    id: string;
    name: string;
    roleTitleAr: string;
    efficiency: number;
    performanceScore: number;
    completedTasksCount: number;
  }[];
  notes: string[];
}

export interface DelayInquiryReport {
  trackingNumber: string;
  currentLocationLabel: string;
  minutesSinceLastChange: number;
  responsiblePartyLabel: string;
  recordedDelayReason: string;
  ongoingActionLabel: string;
  updatedExpectedDeliveryLabel: string;
  needsManagerDecision: boolean;
  availableManagerActions: {
    actionType: AdminDelayActionType;
    label: string;
    costPiastres: number;
    description: string;
  }[];
}

export interface FleetAndEquipmentState {
  fuelLevelPercent: number; // 0 to 100 (رصيد الوقود والبنزين للأسطول)
  sortingMachineHealth: number; // 0 to 100 (كفاءة ماكينات الفرز والتغليف بالمستودع)
  adminSystemHealth: number; // 0 to 100 (سلامة الأنظمة الإدارية والمحاسبية)
  lastRefueledDay: number;
  lastMachineMaintainedDay: number;
  activeBreakdowns: string[];
}

export interface InsolvencyCrisisState {
  active: boolean;
  day: number;
  triggeredOnDay?: number;
  reasonType:
    | 'UNPAID_SALARIES_WALKOUT'
    | 'FUEL_DEPLETED_NO_CASH'
    | 'EQUIPMENT_BREAKDOWN_NO_CASH'
    | 'OPERATIONAL_PARALYSIS';
  titleAr: string;
  detailsAr: string;
  descriptionAr?: string;
  affectedEmployeesCount: number;
  shortfallPiastres: number;
  departedEmployeeNames?: string[];
  brokenEquipmentLabels?: string[];
}

export interface DayCheckpointSnapshot {
  day: number;
  savedAtIso: string;
  cashPiastres: number;
  reputation: number;
  serializedState?: string;
  stateSnapshot?: GameState;
}

export type PlatformContractIdType = 'WAKKELNY' | 'ZORO';

export interface PlatformContractRuntimeState {
  id: PlatformContractIdType;
  nameAr: string;
  unlocked: boolean;
  signed: boolean;
  signedAtDay?: number;
  contractFeePiastres: number;
  feePaidOnce: boolean; // تضمن خصم رسوم العقد مرة واحدة فقط
  slaScore: number; // 0 to 100
  status: 'LOCKED' | 'AVAILABLE' | 'ACTIVE' | 'WARNING' | 'SUSPENDED';
  completedOrdersCount: number;
  delayedOrFailedOrdersCount: number;
  totalRevenueEarnedPiastres: number;
  totalOperatingCostPiastres: number;
  totalPenaltiesPiastres: number;
  totalBonusesPiastres: number;
  extraDailyOrdersFromMarketing: number;
}

export type PlatformOrderStatus =
  | 'WAITING_DISPATCH' // بانتظار قرار المدير / التوزيع
  | 'PREPARING_AT_PARTNER' // قيد التجهيز في المطعم أو مخزن زورو
  | 'PICKED_UP_IN_TRANSIT' // استلمه المندوب من المطعم/مخزن زورو وفي الطريق للعميل
  | 'DELIVERED' // تم التسليم للعميل النهائي
  | 'DELAYED_DELIVERED' // تم التسليم مع تأخير
  | 'FAILED_OR_CANCELLED'; // فشل التسليم أو ألغي لانتهاء المهلة

export interface PlatformDirectOrder {
  id: string;
  trackingNumber: string;
  platformId: PlatformContractIdType;
  scenarioId: string;
  titleAr: string;
  descriptionAr: string;
  pickupPartnerAr: string;
  pickupZone: string;
  deliveryZone: string;
  directionSector: 'NORTH' | 'EAST' | 'WEST' | 'SOUTH' | 'CENTRAL';
  weightGrams: number; // 1000g = 1kg
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeCm3: number; // L * W * H
  shippingTariffPiastres: number; // إيراد التوصيل الخاص بشركة الشحن فقط
  merchantOrderValuePiastres: number; // قيمة الطعام/المنتج للتاجر (لا تُحسب ضمن إيرادات شركة الشحن أبداً!)
  estimatedTripCostPiastres: number;
  actualTripCostPiastres: number;
  prepTimeMinutes: number;
  maxDeliveryWindowMinutes: number;
  createdAtDay: number;
  createdAtTotalMinutes: number;
  readyForPickupTotalMinutes: number;
  deadlineTotalMinutes: number;
  deadlineTimeLabel: string;
  dispatchedAtTotalMinutes?: number;
  expectedArrivalTotalMinutes?: number;
  expectedArrivalTimeLabel?: string;
  completedAtTotalMinutes?: number;
  status: PlatformOrderStatus;
  dispatchMode?: 'INDEPENDENT' | 'BATCH_DIRECTIONAL' | 'SMART_AUTO';
  batchId?: string;
  assignedCourierId?: string;
  assignedCourierName?: string;
  assignedVehicleId?: string;
  assignedVehicleName?: string;
  priority: 'NORMAL' | 'HIGH' | 'PEAK_RUSH';
  fragile: boolean;
  hotFoodSensitive: boolean;
  batchable: boolean;
  requiresCarOrTruck: boolean;
   bypassesPlayerWarehouse: true; // دائماً true: لا يمر بمستودعات اللاعب أبداً
  specialRiskNoteAr?: string;
  outcomeNoteAr?: string;
  settledFinancially: boolean;
}

export interface PlatformRouteBatch {
  id: string;
  day: number;
  createdAtTimeLabel: string;
  directionSector: 'NORTH' | 'EAST' | 'WEST' | 'SOUTH' | 'CENTRAL';
  orderIds: string[];
  courierId: string;
  courierName: string;
  vehicleId: string;
  vehicleName: string;
  totalWeightGrams: number;
  totalVolumeCm3: number;
  totalRevenuePiastres: number;
  savedFuelPiastres: number;
  totalTripCostPiastres: number;
  routeStopsSequenceAr: string[]; // نقاط الاستلام ثم نقاط التسليم بالترتيب
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  explanationAr: string;
}

export interface SmartDispatchDecisionLog {
  id: string;
  day: number;
  timeLabel: string;
  policyUsed: 'FASTEST' | 'LOWEST_COST' | 'BALANCED' | 'URGENT_FIRST' | 'MAX_WAIT_TIME';
  orderIds: string[];
  modeChosen: 'INDEPENDENT' | 'BATCH_DIRECTIONAL';
  courierName: string;
  vehicleName: string;
  totalWeightGrams: number;
  totalVolumeCm3: number;
  expectedRevenuePiastres: number;
  expectedCostPiastres: number;
  reasonAr: string;
}

export interface DynamicOperationalEvent {
  id: string;
  day: number;
  timeLabel: string;
  type:
    | 'RESTAURANT_PREP_DELAY'
    | 'TRAFFIC_CONGESTION'
    | 'PEAK_RUSH_WAVE'
    | 'VEHICLE_BREAKDOWN'
    | 'FUEL_SURGE'
    | 'ZORO_SEASONAL_SURGE'
    | 'COURIER_ABSENCE';
  titleAr: string;
  descriptionAr: string;
  affectedZone?: string;
  impactSummaryAr: string;
  active: boolean;
}

export interface ContractMarketingCampaignRun {
  id: string;
  catalogId: string;
  targetPlatform: PlatformContractIdType | 'GENERAL_BRAND';
  nameAr: string;
  launchedAtDay: number;
  expiresAtDay: number;
  costPiastres: number;
  extraOrdersPerDay: number;
  followersGained: number;
  reputationDelta: number;
  outcomeSummaryAr: string;
  overcapacityWarningTriggered: boolean;
}

export interface BusinessDeveloperState {
  unlockedAtDay: number; // يفتح في اليوم الثالث (Day 3)
  isUnlocked: boolean;
  contracts: Record<PlatformContractIdType, PlatformContractRuntimeState>;
  platformOrders: PlatformDirectOrder[];
  routeBatches: PlatformRouteBatch[];
  smartDispatchPolicy: 'FASTEST' | 'LOWEST_COST' | 'BALANCED' | 'URGENT_FIRST' | 'MAX_WAIT_TIME';
  smartDispatchLogs: SmartDispatchDecisionLog[];
  processedLeaseCycleDays: number[]; // يمنع تكرار خصم إيجار المركبات في دورة الـ 8 أيام
  lastGeneratedOrdersDay: number;
  followersCount: number;
  upgradeLevels: Record<string, number>; // معرف الترقية -> المستوى الحالي
  contractCampaigns: ContractMarketingCampaignRun[];
  dynamicEvents: DynamicOperationalEvent[];
}

export type EgyptLocationType = 'GOVERNORATE' | 'CITY_OR_MARKAZ' | 'VILLAGE_OR_DISTRICT';

export interface EgyptLocationNode {
  id: string;
  nameAr: string;
  governorateAr: string;
  markazOrCityAr: string;
  type: EgyptLocationType;
  regionCategory: 'GREATER_CAIRO' | 'DELTA' | 'CANAL_COAST' | 'UPPER_EGYPT';
  lat: number;
  lng: number;
  roadTortuosityFactor: number; // معامل انحناء الطرق الواقعية
  demandDensity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DistanceCalculationResult {
  fromLocationNameAr: string;
  toLocationNameAr: string;
  governorateFromAr: string;
  governorateToAr: string;
  distanceKm: number;
  distanceMeters: number;
  accuracyType: 'VERIFIED_CORRIDOR' | 'ESTIMATED_METRIC';
  accuracyLabelAr: string;
  estimatedTransitMinutes: number;
  isInterGovernorate: boolean;
}

export interface PricingBracketTier {
  id: string;
  labelAr: string;
  minKm: number;
  maxKm: number;
  pricePiastres: number;
}

export interface RegionalPriceRule {
  id: string;
  regionCategory: 'GREATER_CAIRO' | 'DELTA' | 'CANAL_COAST' | 'UPPER_EGYPT';
  labelAr: string;
  basePricePiastres: number;
  perKmPiastres: number;
}

export interface GeographicPromotionalOffer {
  id: string;
  titleAr: string;
  targetZoneOrGovAr: string;
  discountPercent: number;
  startsAtDay: number;
  expiresAtDay: number;
  active: boolean;
  attractedOrdersCount: number;
}

export interface PricingEngineState {
  mode: 'AUTO' | 'MANUAL' | 'BRACKET' | 'REGIONAL';
  baseFeePiastres: number; // رسوم فتح الشحنة الأساسية
  perKmRatePiastres: number; // تسعيرة الكيلومتر
  perKgSurchargePiastres: number; // رسوم الوزن الإضافي لكل كجم فوق 5 كجم
  expressSlaSurchargePiastres: number; // رسوم التوصيل المستعجل
  manualFixedFeePiastres: number; // السعر اليدوي الموحد عند اختيار الوضع اليدوي
  brackets: PricingBracketTier[];
  regionalRules: RegionalPriceRule[];
  offers: GeographicPromotionalOffer[];
}

export interface CompetitorCompany {
  id: string;
  nameAr: string;
  sloganAr: string;
  tier: 'LOCAL_AGGRESSIVE' | 'REGIONAL_BALANCED' | 'PREMIUM_FAST';
  avgPricePerOrderPiastres: number;
  quotedSlaHours: number;
  reputation: number;
  marketSharePercent: number;
  poachedOrdersCount: number;
  wonAuctionsCount: number;
  strengthsAr: string;
  weaknessAr: string;
}

export interface MarketShippingAuction {
  id: string;
  clientNameAr: string;
  clientTypeAr: string;
  pickupZoneAr: string;
  deliveryZoneAr: string;
  distanceKm: number;
  dailyShipmentsCount: number;
  weightKgPerShipment: number;
  reserveMaxPricePiastres: number;
  minRequiredSlaHours: number; // لا يقل عن 10 ساعات للمستودع
  competitorLeadingBidPiastres: number;
  competitorLeadingNameAr: string;
  competitorLeadingSlaHours: number;
  expiresAtTotalMinutes: number;
  expiresTimeLabel: string;
  status: 'OPEN' | 'WON_BY_PLAYER' | 'WON_BY_COMPETITOR' | 'EXPIRED';
  playerBidPiastres?: number;
  playerCommittedSlaHours?: number;
  outcomeSummaryAr?: string;
}

export type HerfokCommentTone =
  | 'SUPPORTER'
  | 'CRITIC'
  | 'SARCASTIC'
  | 'ANALYTICAL'
  | 'NEUTRAL';

export interface HerfokComment {
  id: string;
  authorNameAr: string;
  authorRoleAr: string;
  tone: HerfokCommentTone;
  contentAr: string;
  likesCount: number;
}

export interface HerfokPost {
  id: string;
  day: number;
  timeLabel: string;
  totalMinutes: number;
  authorNameAr: string;
  authorHandle: string;
  authorRoleAr: string;
  category:
    | 'COMPANY_PRAISE'
    | 'COMPANY_CRITIQUE'
    | 'COMPETITOR_NEWS'
    | 'MARKET_SATIRE'
    | 'PRICING_DEBATE';
  contentAr: string;
  relatedTrackingNumber?: string;
  relatedCompetitorNameAr?: string;
  likesCount: number;
  sharesCount: number;
  comments: HerfokComment[]; // دائماً من 2 إلى 7 تعليقات متنوعة
}

export interface IngobiaClientEvaluationSample {
  clientId: string;
  clientNameAr: string;
  trackingNumber: string;
  scoreOutOf100: number;
  stars: 1 | 2 | 3 | 4 | 5;
  verdictAr: string;
}

export interface IngobiaDailyEvaluation {
  id: string;
  day: number;
  timeLabel: string;
  totalMinutes: number;
  eligibleTransactedClientsCount: number;
  sampledClientsCount: number; // 30% من العملاء المستحقين الذين تعاملوا فعلياً
  overallScoreOutOf100: number;
  reputationDelta: number;
  summaryAr: string;
  samples: IngobiaClientEvaluationSample[];
}

export interface CompanyBranch {
  id: string;
  nameAr: string;
  governorateAr: string;
  cityAr: string;
  openedAtDay: number;
  setupCostPiastres: number;
  dailyOperatingCostPiastres: number;
  warehouseCapacitySlots: number;
  assignedEmployeesCount: number;
  assignedVehiclesCount: number;
  active: boolean;
}

export interface RealTimeClockBridgeState {
  mode: 'REALISTIC_1H_TO_4H' | 'TIME_SKIP_ENABLED';
  lastRealTimestampMs: number;
  totalOfflineGameMinutesApplied: number;
  lastCatchUpSummaryAr?: string;
}

export interface PendingSyncMilestone {
  id: string;
  type: 'LEVEL_UP' | 'NEW_DAY' | 'PRE_EXIT_SAVE' | 'MANUAL_CHECKPOINT';
  day: number;
  companyLevel: number;
  cashPiastres: number;
  reputation: number;
  timestampIso: string;
  syncedToCloud: boolean;
}

export interface OfflineSyncQueueState {
  isOnline: boolean;
  requiresOnlineSyncPrompt: boolean;
  promptReasonAr?: string;
  lastLocalSaveIso: string;
  lastCloudSyncIso?: string;
  pendingMilestones: PendingSyncMilestone[];
}

export type ReturnLifecycleStatus =
  | 'NONE'
  | 'RETURN_INITIATED' // بدء إجراءات المرتجع
  | 'AT_WAREHOUSE_PENDING_RETURN' // بالمستودع بانتظار الإرجاع للتاجر
  | 'OUT_FOR_RETURN_TO_MERCHANT' // في الطريق لإرجاعه للشركة العميلة
  | 'DELIVERED_TO_MERCHANT_UNCONFIRMED' // وصل للشركة العميلة وبانتظار تأكيد الاستلام الموثق
  | 'DISPUTED_BY_MERCHANT' // متنازع عليه / مماطلة في تأكيد الاستلام
  | 'CONFIRMED_CLOSED'; // مؤكد الاستلام ومغلق بتوثيق رسمي

export type ReturnResponsibilityParty =
  | 'RECIPIENT' // المستلم النهائي (رفض الاستلام / عدم تواجد)
  | 'MERCHANT_CLIENT' // الشركة العميلة (عنوان خاطئ / بضاعة غير مطابقة)
  | 'SHIPPING_COMPANY' // شركة الشحن (تأخير تشغيلي / تلف أثناء النقل)
  | 'SHARED_OR_EXTERNAL'; // ظرف خارجي مشترك

export interface ShipmentReturnRecord {
  returnId: string;
  trackingNumber: string;
  clientId: string;
  clientName: string;
  reasonType: DeliveryAttemptResult;
  reasonDetailAr: string;
  responsibleParty: ReturnResponsibilityParty;
  currentPhysicalLocationAr: string;
  returnStatus: ReturnLifecycleStatus;
  distanceToMerchantKm: number;
  estimatedReturnMinutes: number;
  assignedReturnCourierId?: string;
  assignedReturnCourierName?: string;
  returnTransportCostPiastres: number;
  contractualReturnFeePiastres: number; // رسوم المرتجع المستحقة وفق شروط العقد
  originalShippingFeeRetainedPiastres: number; // رسوم الشحن الأصلية المحتفظ بها وفق العقد
  merchantConfirmedReceipt: boolean; // لا يعتبر المرتجع مستلماً نهائياً دون تأكيد استلام موثق
  merchantConfirmationCode?: string;
  disputeReasonAr?: string;
  evidenceLogAr: string[];
  initiatedAtTotalMinutes: number;
  dispatchedToMerchantAtTotalMinutes?: number;
  deliveredToMerchantAtTotalMinutes?: number;
  confirmedClosedAtTotalMinutes?: number;
  financialSettlementKey?: string; // يمنع تكرار تسوية رسوم المرتجع عند إعادة المحاولة
  financialSettled: boolean;
}

export interface ClientContractAndEvidenceProfile {
  coveredZonesAr: string[];
  returnFeePolicyAr: string;
  returnFeePiastres: number;
  retainsOriginalFeeOnRecipientRefusal: boolean;
  requiresOtpForReturnConfirmation: boolean;
  totalShipmentsCount: number;
  deliveredCount: number;
  recipientRefusalCount: number;
  recipientAbsentCount: number;
  returnConfirmationDelayCount: number; // عدد مرات تأخير تأكيد استلام المرتجعات (بأدلة موثقة فقط)
  disputedReturnsCount: number;
  documentedEvidenceNotesAr: string[];
}

export type GuideTaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'LOCKED';

export interface ManagerGuideTask {
  id: string;
  levelRequired: 1 | 2 | 3 | 4 | 5;
  titleAr: string;
  whatToDoAr: string;
  whyImportantAr: string;
  practicalGuidanceAr: string;
  lockReasonAr?: string;
  targetSection:
    | 'MAIN_CONTROL'
    | 'SHIPMENTS'
    | 'WAREHOUSE'
    | 'COURIERS'
    | 'BUSINESS_DEVELOPER'
    | 'MARKETING'
    | 'EMPLOYEES'
    | 'DEBTS'
    | 'MAINTENANCE'
    | 'COMPANY_PROFILE'
    | 'LEDGER'
    | 'PHONE_HERFOK'
    | 'PHONE_PRICING'
    | 'PHONE_MY_EMPLOYEES';
  targetButtonLabelAr: string;
  status: GuideTaskStatus;
  progressCurrent: number;
  progressTarget: number;
  progressLabelAr: string;
  linkedToLevelUpgrade: boolean;
  isRenewableChallenge?: boolean;
  renewalTier?: number;
  xpReward?: number;
  cashRewardPiastres?: number;
  reputationReward?: number;
  rewardLabelAr?: string;
  rewardClaimed?: boolean;
}

export interface InlineBubbleNotification {
  id: string;
  dedupeKey: string;
  sender: 'SECRETARY' | 'MANAGER_GUIDE';
  category:
    | 'DECISION_INSPECTION'
    | 'NEGOTIation_RESULT'
    | 'RISK_WARNING'
    | 'GUIDE_HINT'
    | 'TASK_COMPLETED'
    | 'RETURN_ALERT'
    | 'WAKKELNY_ALERT';
  titleAr: string;
  shortPreviewAr: string;
  factsAr: string[]; // حقائق مؤكدة بالأرقام من بيانات الشركة الفعلية
  projectionsAr: string[]; // توقعات تشغيلية ومالية
  alternativesAr: string[]; // بدائل عملية قابلة للتنفيذ دون مصادرة قرار اللاعب
  requiresMoreInfoPromptAr?: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  createdAtDay: number;
  createdAtTimeLabel: string;
  createdAtTotalMinutes: number;
  read: boolean;
  dismissed: boolean; // يختفي عند الضغط على علامة ✓
  relatedTargetSection?: string;
}

export interface WakkelnyZoneAllocation {
  zoneId: string;
  zoneNameAr: string;
  sector: 'NORTH' | 'EAST' | 'WEST' | 'SOUTH' | 'CENTRAL';
  geographicScopeAr: string;
  partnerRestaurantsAr: string[];
  potentialCustomersCount: number;
  allocatedCourierIds: string[];
  currentActiveOrdersCount: number;
  expectedHourlyDemand: number;
  peakHoursLabelAr: string;
  avgTripCostPiastres: number;
  avgDeliveryTariffPiastres: number;
  speedBonusThresholdMinutes: number;
  speedBonusAmountPiastres: number;
}

export interface WakkelnyOrderTimingBreakdown {
  restaurantPrepMinutes: number; // زمن تحضير المطعم
  courierWaitAtRestaurantMinutes: number; // انتظار المندوب للمطعم (منفصل عن زمن الطريق)
  distanceToRestaurantKm: number; // المسافة من موقع المندوب/المقر إلى المطعم
  distanceRestaurantToClientKm: number; // المسافة من المطعم إلى العميل
  virtualTrafficFactor: number; // معامل الازدحام الافتراضي (مثلاً 1.0 إلى 1.45)
  transitToRestaurantMinutes: number; // زمن الطريق إلى المطعم
  transitToClientMinutes: number; // زمن الطريق من المطعم إلى العميل
  otherAssignedOrdersDelayMinutes: number; // زمن إضافي بسبب الطلبات الأخرى المسندة للمندوب
  totalExpectedMinutes: number;
  isExceptionalOutOfZoneCoverage: boolean; // تغطية استثنائية من منطقة أخرى
  exceptionalExtraCostPiastres: number;
  prepStartedAtTotalMinutes: number;
  prepReadyAtTotalMinutes: number;
  courierArrivedAtRestaurantTotalMinutes?: number;
  courierPickedUpAtTotalMinutes?: number;
  restaurantDelayMinutes: number; // تأخير سببه المطعم وليس المندوب
  courierRoadDelayMinutes: number; // تأخير سببه الطريق أو المندوب
  delayAttribution: 'NONE' | 'RESTAURANT_DELAY' | 'COURIER_OR_TRAFFIC_DELAY' | 'BOTH';
  speedBonusEligible: boolean;
  speedBonusEarnedPiastres: number;
}

export type EmployeePersonalityTrait =
  | 'DISCIPLINED_PRECISE' // منضبط ودقيق يكره الفوضى
  | 'AMBITIOUS_EARNER' // طموح يهمه حجم الطلبات والحوافز
  | 'FAIRNESS_ORIENTED' // يركز على عدالة توزيع المهام
  | 'CALM_VETERAN' // مخضرم هادئ يتحمل الضغط ولكن يطلب صيانة المركبات
  | 'WORKLOAD_SENSITIVE'; // حساس لضغط العمل المتواصل دون راحة

export type EmployeeVoiceCategory =
  | 'LOW_ORDER_VOLUME' // قلة الطلبات وتأثيرها على الحوافز
  | 'UNFAIR_DISTRIBUTION' // سوء توزيع المهام والطلبات بين الزملاء
  | 'HIGH_WORKLOAD_PRESSURE' // ضغط العمل وتراكم الطوابير
  | 'SALARY_OR_BONUS_CONCERN' // ملاحظات الرواتب والمكافآت
  | 'VEHICLE_OR_EQUIPMENT_ISSUE' // أعطال المركبات أو ماكينات الفرز
  | 'PROCESS_SUGGESTION' // اقتراح عملي لتحسين التشغيل
  | 'MANAGEMENT_PRAISE'; // إشادة بقرارات الإدارة

export interface EmployeeVoiceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRoleAr: string;
  personality: EmployeePersonalityTrait;
  type: 'COMPLAINT' | 'SUGGESTION' | 'PRAISE';
  category: EmployeeVoiceCategory;
  day: number;
  timeLabel: string;
  totalMinutes: number;
  titleAr: string;
  messageAr: string;
  triggerEvidenceAr: string; // الحدث أو الظرف الفعلي الموثق الذي ولّد الملاحظة
  isVerifiedValid: boolean; // نتيجة التحقق من صحة الشكوى بالأرقام
  verificationDetailsAr: string;
  suggestedSolutions: {
    id: string;
    labelAr: string;
    costPiastres: number;
    satisfactionDelta: number;
    efficiencyDelta: number;
    turnoverRiskDelta: number;
    effectSummaryAr: string;
  }[];
  status: 'OPEN' | 'VERIFIED' | 'RESOLVED';
  resolvedWithSolutionId?: string;
  resolutionSummaryAr?: string;
}

export interface EmployeeWellbeingState {
  employeeId: string;
  personality: EmployeePersonalityTrait;
  personalityLabelAr: string;
  satisfactionScore: number; // 0 to 100
  absenceRiskPercent: number; // 0 to 100
  turnoverRiskPercent: number; // 0 to 100 (مخاطر التسرب الوظيفي)
  assignedOrdersToday: number;
  recurringIssuesAr: string[];
}

export interface MyEmployeesAppState {
  wellbeingByEmployeeId: Record<string, EmployeeWellbeingState>;
  voiceRecords: EmployeeVoiceRecord[];
  lastEvaluatedTotalMinutes: number;
}

export interface SyncConflictResolutionRecord {
  id: string;
  timestampIso: string;
  localDay: number;
  cloudDay: number;
  localLevel: number;
  cloudLevel: number;
  winnerSource: 'LOCAL_STATE' | 'CLOUD_STATE' | 'MERGED_SAFELY';
  syncAttemptFailedFirst: boolean;
  recoveredSuccessfully: boolean;
  summaryAr: string;
}

export interface GameState {
  saveVersion: number;
  phase: 'INTRO_STORY' | 'OFFICE_PLAY' | 'DAY_END_REPORT';
  introStep: number;
  clock: GameClock;
  company: CompanyState;
  warehouses: Warehouse[];
  employees: Employee[];
  couriers: Courier[];
  vehicles: Vehicle[];
  clients: (Client & {
    contractProfile?: ClientContractAndEvidenceProfile;
  })[];
  shipments: (Shipment & {
    returnRecord?: ShipmentReturnRecord;
  })[];
  notifications: AppNotification[];
  ledger: LedgerEntry[];
  situations: StorySituation[];
  marketing?: MarketingState;
  hrJobAds?: HRJobAd[];
  payrollCycle?: PayrollCycleState;
  socialPosts?: SocialMediaPost[];
  tutorial?: TutorialState;
  fleetAndEquipment?: FleetAndEquipmentState;
  insolvencyCrisis?: InsolvencyCrisisState;
  dayCheckpoints?: DayCheckpointSnapshot[];
  businessDeveloper?: BusinessDeveloperState & {
    wakkelnyLaunchHubAr?: string;
    wakkelnyZones?: WakkelnyZoneAllocation[];
    orderTimingsById?: Record<string, WakkelnyOrderTimingBreakdown>;
  };
  pricingEngine?: PricingEngineState;
  competitors?: CompetitorCompany[];
  marketAuctions?: MarketShippingAuction[];
  herfokPosts?: HerfokPost[];
  ingobiaEvaluations?: IngobiaDailyEvaluation[];
  branches?: CompanyBranch[];
  realTimeBridge?: RealTimeClockBridgeState;
  offlineSync?: OfflineSyncQueueState & {
    conflictHistory?: SyncConflictResolutionRecord[];
    simulatedOfflineFailurePending?: boolean;
  };
  guideAndSecretary?: {
    guideTasks: ManagerGuideTask[];
    bubbleMessages: InlineBubbleNotification[];
    lastInspectedDecisionKey?: string;
  };
  myEmployeesApp?: MyEmployeesAppState;
  debts?: CompanyDebtItem[];
  companyProfile?: CompanyProfileState;
  onboardingMastery?: OnboardingSystemMasteryState;
  timedShipmentToasts?: TimedShipmentToast[];
  lastObligationReminderBucket?: number;
  executedDecisionIds: string[];
  processedSimulationEventIds: string[];
  discoveredEvents: string[];
  completedTaskIds: string[];
  claimedTaskRewardIds?: string[];
  lastOrganicOrderTickBucket?: number;
  dayReports: DaySummaryReport[];
  soundEnabled: boolean;
  lastSavedTimestamp: string;
}

export interface CompanyDebtItem {
  id: string;
  category: 'ELECTRICITY' | 'TAXES' | 'RENT' | 'SALARIES' | 'SUPPLIER';
  creditorNameAr: string;
  titleAr: string;
  originalAmountPiastres: number;
  paidAmountPiastres: number;
  remainingAmountPiastres: number;
  dueDay: number;
  dueTimeLabel: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  priorityOrder: number; // 1 = الأعلى أولوية
  latePenaltyDescriptionAr: string;
  impactIfUnpaidAr: string;
  paidAtDay?: number;
  paidAtTimeLabel?: string;
}

export interface CompanyProfileState {
  bioAr: string;
  commercialSloganAr: string;
  avatarIconId: 'TRUCK_SHIELD' | 'EAGLE_EXPRESS' | 'NILE_STAR' | 'CAIRO_FLASH' | 'CROWN_LOGISTICS' | 'CUSTOM';
  customAvatarDataUrl?: string;
  serviceSpecialtiesAr: string[];
  coveredZonesAr: string[];
  lastUpdatedDay: number;
  trustBonusEarned: number;
}

export interface OnboardingPageVisitRecord {
  sectionId: string;
  visitCount: number;
  lastVisitedTotalMinutes: number;
  explanationTitleAr: string;
  explanationBodyAr: string;
}

export interface OnboardingSystemMasteryState {
  pageVisits: Record<string, OnboardingPageVisitRecord>;
  appliedSystems: {
    inspectedDashboardAndFinances: boolean;
    paidTopThreeDebts: boolean;
    performedMaintenanceAction: boolean;
    postedOrHiredHR: boolean;
    launchedTrainingCampaign6000: boolean;
    reviewedAndDecidedOrder: boolean;
    movedAndDeliveredOrder: boolean;
    inspectedContractsOrZones: boolean;
    testedAuctionOrPricing: boolean;
    updatedCompanyProfile: boolean;
  };
  masteryPercentage: number;
  mandatoryPhaseCompleted: boolean;
  graduatedAtDay?: number;
}

export interface TimedShipmentToast {
  id: string;
  dedupeKey: string;
  shipmentId: string;
  trackingNumber: string;
  clientName: string;
  stage: 'NEW_ORDER' | 'AT_WAREHOUSE' | 'WITH_COURIER' | 'DELIVERED' | 'REFUSED';
  messageAr: string;
  durationMs: 2000 | 4000 | 5000;
  createdAtMs: number;
  targetSection: string;
  dismissed?: boolean;
}





