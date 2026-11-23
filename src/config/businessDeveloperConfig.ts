import { egpToPiastres } from '../engine/financeEngine';

export type PlatformContractId = 'WAKKELNY' | 'ZORO';

export type VehicleCatalogId =
  | 'MOTO_ECONOMY'
  | 'MOTO_HEAVY'
  | 'SMALL_DELIVERY_CAR'
  | 'MEDIUM_TRUCK'
  | 'LARGE_TRUCK';

export type VehicleOwnershipType = 'OWNED' | 'LEASED' | 'PERSONAL_COURIER';

export type DispatchModeType =
  | 'INDEPENDENT'
  | 'BATCH_DIRECTIONAL'
  | 'SMART_AUTO';

export type SmartDispatchPolicy =
  | 'FASTEST'
  | 'LOWEST_COST'
  | 'BALANCED'
  | 'URGENT_FIRST'
  | 'MAX_WAIT_TIME';

export type DirectionSector = 'NORTH' | 'EAST' | 'WEST' | 'SOUTH' | 'CENTRAL';

export interface PlatformScenarioTemplate {
  id: string;
  platformId: PlatformContractId;
  titleAr: string;
  descriptionAr: string;
  pickupPartnerAr: string;
  pickupZone: string;
  deliveryZone: string;
  directionSector: DirectionSector;
  weightGrams: number; // 1000g = 1kg
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeCm3: number; // lengthCm * widthCm * heightCm
  shippingTariffEgp: number; // إيراد التوصيل الخاص بشركة الشحن فقط
  merchantOrderValueEgp: number; // قيمة الطعام/المنتج للتاجر (لا تُحسب ضمن إيرادات شركة الشحن أبداً)
  prepTimeMinutes: number;
  maxDeliveryWindowMinutes: number;
  priority: 'NORMAL' | 'HIGH' | 'PEAK_RUSH';
  fragile: boolean;
  hotFoodSensitive: boolean;
  batchable: boolean;
  requiresCarOrTruck: boolean;
  specialRiskNoteAr?: string;
}

export interface PlatformContractConfig {
  id: PlatformContractId;
  nameAr: string;
  badgeAr: string;
  unlockDay: number;
  contractFeeEgp: number;
  contractFeePiastres: number;
  categoryAr: string;
  modelSummaryAr: string;
  warehouseRuleAr: string;
  revenueRuleAr: string;
  targetSlaPercent: number;
  baseOrdersPerDay: number;
  maxOrdersPerDayWithReputation: number;
  latePenaltyEgp: number;
  damagePenaltyEgp: number;
  excellenceBonusEgp: number;
  prosAr: string[];
  risksAr: string[];
}

/**
 * STRICT RULE: Business Developer contains ONLY TWO platforms:
 * 1. وكلني (WAKKELNY) — 8,000 EGP
 * 2. زورو (ZORO) — 15,000 EGP
 * No third platform may ever be added.
 */
export const BUSINESS_DEVELOPER_PLATFORMS: Record<
  PlatformContractId,
  PlatformContractConfig
> = {
  WAKKELNY: {
    id: 'WAKKELNY',
    nameAr: 'وكلني — Wakkelny',
    badgeAr: 'منصة توصيل مطاعم وطلبات سريعة',
    unlockDay: 3,
    contractFeeEgp: 8000,
    contractFeePiastres: egpToPiastres(8000),
    categoryAr: 'توصيل وجبات ساخنة وطلبات مطاعم فورية',
    modelSummaryAr:
      'يتوجه المندوب مباشرة إلى المطعم لاستلام الطلب فور تجهيزه وتوصيله للعميل النهائي دون المرور بمستودعات شركتك.',
    warehouseRuleAr: 'لا تمر طلبات وكلني بمستودعات اللاعب نهائياً (من المطعم إلى العميل مباشرة).',
    revenueRuleAr:
      'تحصل شركتك على تعريفة التوصيل فقط (35–95 ج.م للطلب)، بينما ثمن الوجبة يخص المطعم ولا يدخل في إيرادات شركتك.',
    targetSlaPercent: 88,
    baseOrdersPerDay: 4,
    maxOrdersPerDayWithReputation: 10,
    latePenaltyEgp: 25,
    damagePenaltyEgp: 45,
    excellenceBonusEgp: 120,
    prosAr: [
      'تدفق نقدي يومي سريع ومتكرر خلال ساعات الذروة',
      'لا يستهلك أي مساحة تخزينية أو عمالة فرز داخل مستودعك',
      'مناسب جداً للموتوسيكلات الاقتصادية والقوية والمناديب أصحاب الموتوسيكل الخاص',
    ],
    risksAr: [
      'حساسية عالية للوقت؛ تأخر الطلب يبرد الطعام ويخفض تقييم العقد والسمعة فوراً',
      'احتمال تأخر المطعم في تجهيز الطلب قبل تسليمه للمندوب',
      'تجميع أكثر من طلب في اتجاهات متباعدة قد يتسبب في تأخير الوجبات الساخنة',
    ],
  },
  ZORO: {
    id: 'ZORO',
    nameAr: 'زورو — Zoro E-Commerce',
    badgeAr: 'منصة تجارة إلكترونية وشحن طرود من مخازن زورو',
    unlockDay: 3,
    contractFeeEgp: 15000,
    contractFeePiastres: egpToPiastres(15000),
    categoryAr: 'توصيل طرود تجارة إلكترونية مباشرة من مراكز ومخازن زورو للعميل',
    modelSummaryAr:
      'يستلم أسطولك الشحنات الجاهزة مباشرة من مخازن ومراكز توزيع «زورو» ويوصلها للعملاء دون إدخالها مستودعات شركتك.',
    warehouseRuleAr:
      'المنتجات مخزنة مسبقاً في مخازن زورو الخاصة؛ لا تستهلك مساحة في مستودعات شركتك.',
    revenueRuleAr:
      'تحصل شركتك على أجر الشحن المتفق عليه حسب فئة الوزن والحجم والمسافة، وليس القيمة التجارية للمنتج.',
    targetSlaPercent: 85,
    baseOrdersPerDay: 4,
    maxOrdersPerDayWithReputation: 12,
    latePenaltyEgp: 40,
    damagePenaltyEgp: 85,
    excellenceBonusEgp: 220,
    prosAr: [
      'عائد شحن أعلى للرحلة الواحدة وإمكانية تجميع خطوط توزيع كاملة في نفس الاتجاه',
      'نوافذ تسليم أوسع نسبياً من المطاعم مما يتيح تخطيط مسارات ذكية عالية الربحية',
      'يتدرج من طرود خفيفة للموتوسيكل حتى دفعات كبيرة للسيارات والشاحنات',
    ],
    risksAr: [
      'بعض الطرود كبيرة الوزن أو الحجم وتتطلب سيارة توصيل أو نقل متوسطة/كبيرة',
      'المنتجات القابلة للكسر تتأثر بحالة المركبة ومهارة المندوب',
      'مواسم العروض والحملات ترفع الأحجام فجأة وتكشف أي عجز في الأسطول',
    ],
  },
};

export interface VehicleStoreCatalogItem {
  id: VehicleCatalogId;
  nameAr: string;
  categoryAr: string;
  vehicleClass: 'MOTORCYCLE' | 'SMALL_CAR' | 'MEDIUM_TRUCK' | 'LARGE_TRUCK';
  legacyType: 'MOTORCYCLE' | 'CARGO_VAN';
  buyPriceEgp: number;
  buyPricePiastres: number;
  leasePricePerCycleEgp: number; // لكل دورة 8 أيام
  leasePricePerCyclePiastres: number;
  maxWeightKg: number;
  maxWeightGrams: number; // 1000g = 1kg
  internalLengthCm: number;
  internalWidthCm: number;
  internalHeightCm: number;
  maxVolumeCm3: number; // L * W * H
  maxConcurrentOrders: number;
  speedMultiplier: number; // 1.0 baseline
  fuelCostPerKmPiastres: number;
  baseOperatingCostPerTripPiastres: number;
  maintenanceCostEgp: number;
  wearPerTripPercent: number;
  resaleRetentionBaseRatio: number; // e.g., 0.72 of buy price at 100% health
  bestForAr: string;
  prosAr: string;
  consAr: string;
}

/**
 * Central Vehicle Store Catalog matching the exact prices & capacities in the specification:
 * - موتوسيكل اقتصادي: Buy 45,000 | Lease 2,000 / 8 days | 10 kg (10,000 g)
 * - موتوسيكل قوي: Buy 75,000 | Lease 3,200 / 8 days | 20 kg (20,000 g)
 * - سيارة توصيل صغيرة: Buy 350,000 | Lease 16,000 / 8 days | 300 kg (300,000 g)
 * - سيارة نقل متوسطة: Buy 750,000 | Lease 32,000 / 8 days | 1,000 kg (1,000,000 g)
 * - سيارة نقل كبيرة: Buy 1,500,000 | Lease 60,000 / 8 days | 3,000 kg (3,000,000 g)
 */
export const VEHICLE_STORE_CATALOG: VehicleStoreCatalogItem[] = [
  {
    id: 'MOTO_ECONOMY',
    nameAr: 'موتوسيكل اقتصادي (بوكس توصيل قياسي)',
    categoryAr: 'موتوسيكلات التوصيل',
    vehicleClass: 'MOTORCYCLE',
    legacyType: 'MOTORCYCLE',
    buyPriceEgp: 45000,
    buyPricePiastres: egpToPiastres(45000),
    leasePricePerCycleEgp: 2000,
    leasePricePerCyclePiastres: egpToPiastres(2000),
    maxWeightKg: 10,
    maxWeightGrams: 10000,
    internalLengthCm: 45,
    internalWidthCm: 40,
    internalHeightCm: 40,
    maxVolumeCm3: 45 * 40 * 40, // 72,000 cm³
    maxConcurrentOrders: 3,
    speedMultiplier: 1.15,
    fuelCostPerKmPiastres: egpToPiastres(1.5),
    baseOperatingCostPerTripPiastres: egpToPiastres(18),
    maintenanceCostEgp: 140,
    wearPerTripPercent: 2,
    resaleRetentionBaseRatio: 0.72,
    bestForAr: 'طلبات وكلني السريعة والطرود الخفيفة جداً من زورو',
    prosAr: 'سريع في الزحام، استهلاك وقود منخفض جداً، وإيجار دوري اقتصادي.',
    consAr: 'حمولة محدودة (10 كجم / 72,000 سم³) ولا يناسب الطرود المتوسطة أو الكبيرة.',
  },
  {
    id: 'MOTO_HEAVY',
    nameAr: 'موتوسيكل قوي (صندوق حراري موسع)',
    categoryAr: 'موتوسيكلات التوصيل',
    vehicleClass: 'MOTORCYCLE',
    legacyType: 'MOTORCYCLE',
    buyPriceEgp: 75000,
    buyPricePiastres: egpToPiastres(75000),
    leasePricePerCycleEgp: 3200,
    leasePricePerCyclePiastres: egpToPiastres(3200),
    maxWeightKg: 20,
    maxWeightGrams: 20000,
    internalLengthCm: 55,
    internalWidthCm: 50,
    internalHeightCm: 50,
    maxVolumeCm3: 55 * 50 * 50, // 137,500 cm³
    maxConcurrentOrders: 4,
    speedMultiplier: 1.25,
    fuelCostPerKmPiastres: egpToPiastres(2.0),
    baseOperatingCostPerTripPiastres: egpToPiastres(24),
    maintenanceCostEgp: 210,
    wearPerTripPercent: 1.5,
    resaleRetentionBaseRatio: 0.75,
    bestForAr: 'تجميع طلبات وكلني العائلية + طرود زورو الخفيفة والمتوسطة',
    prosAr: 'ضعف حمولة الموتوسيكل الاقتصادي (20 كجم) وأسرع في المسافات المتوسطة وأقل أعطالاً.',
    consAr: 'تكلفة شراء وإيجار أعلى من الاقتصادي.',
  },
  {
    id: 'SMALL_DELIVERY_CAR',
    nameAr: 'سيارة توصيل صغيرة (فان مغلقة)',
    categoryAr: 'سيارات التوصيل الصغيرة',
    vehicleClass: 'SMALL_CAR',
    legacyType: 'CARGO_VAN',
    buyPriceEgp: 350000,
    buyPricePiastres: egpToPiastres(350000),
    leasePricePerCycleEgp: 16000,
    leasePricePerCyclePiastres: egpToPiastres(16000),
    maxWeightKg: 300,
    maxWeightGrams: 300000,
    internalLengthCm: 160,
    internalWidthCm: 130,
    internalHeightCm: 120,
    maxVolumeCm3: 160 * 130 * 120, // 2,496,000 cm³
    maxConcurrentOrders: 8,
    speedMultiplier: 0.95,
    fuelCostPerKmPiastres: egpToPiastres(4.5),
    baseOperatingCostPerTripPiastres: egpToPiastres(48),
    maintenanceCostEgp: 480,
    wearPerTripPercent: 1.2,
    resaleRetentionBaseRatio: 0.78,
    bestForAr: 'تجميع خطوط زورو وتوصيل الأجهزة المنزلية والطلبات المتعددة بأمان',
    prosAr: 'حمولة ممتازة (300 كجم) وحماية عالية للطرود القابلة للكسر وتجميع حتى 8 طلبات.',
    consAr: 'أبطأ قليلاً في الشوارع الضيقة واستهلاك وقود أعلى من الموتوسيكل.',
  },
  {
    id: 'MEDIUM_TRUCK',
    nameAr: 'سيارة نقل متوسطة (صندوق مغلق)',
    categoryAr: 'سيارات النقل المتوسطة',
    vehicleClass: 'MEDIUM_TRUCK',
    legacyType: 'CARGO_VAN',
    buyPriceEgp: 750000,
    buyPricePiastres: egpToPiastres(750000),
    leasePricePerCycleEgp: 32000,
    leasePricePerCyclePiastres: egpToPiastres(32000),
    maxWeightKg: 1000,
    maxWeightGrams: 1000000,
    internalLengthCm: 280,
    internalWidthCm: 180,
    internalHeightCm: 170,
    maxVolumeCm3: 280 * 180 * 170, // 8,568,000 cm³
    maxConcurrentOrders: 14,
    speedMultiplier: 0.85,
    fuelCostPerKmPiastres: egpToPiastres(7.5),
    baseOperatingCostPerTripPiastres: egpToPiastres(85),
    maintenanceCostEgp: 900,
    wearPerTripPercent: 1.0,
    resaleRetentionBaseRatio: 0.8,
    bestForAr: 'دفعات مخازن زورو المجمعة والطلبيات التجارية الثقيلة',
    prosAr: 'سعة ضخمة (1,000 كجم / 8.56 مليون سم³) تخفض تكلفة الشحنة الواحدة عند التجميع.',
    consAr: 'تحتاج خطوط تشغيل كثيفة لتغطية إيجارها الدوري وتكلفة وقودها.',
  },
  {
    id: 'LARGE_TRUCK',
    nameAr: 'سيارة نقل كبيرة (جامبو شحن ثقيل)',
    categoryAr: 'سيارات النقل الكبيرة',
    vehicleClass: 'LARGE_TRUCK',
    legacyType: 'CARGO_VAN',
    buyPriceEgp: 1500000,
    buyPricePiastres: egpToPiastres(1500000),
    leasePricePerCycleEgp: 60000,
    leasePricePerCyclePiastres: egpToPiastres(60000),
    maxWeightKg: 3000,
    maxWeightGrams: 3000000,
    internalLengthCm: 420,
    internalWidthCm: 210,
    internalHeightCm: 210,
    maxVolumeCm3: 420 * 210 * 210, // 18,522,000 cm³
    maxConcurrentOrders: 24,
    speedMultiplier: 0.78,
    fuelCostPerKmPiastres: egpToPiastres(12.0),
    baseOperatingCostPerTripPiastres: egpToPiastres(140),
    maintenanceCostEgp: 1600,
    wearPerTripPercent: 0.8,
    resaleRetentionBaseRatio: 0.82,
    bestForAr: 'مواسم الذروة وحملات زورو الكبرى ونقل الدفعات الضخمة عبر المناطق',
    prosAr: 'أعلى سعة في الأسطول (3,000 كجم / 18.52 مليون سم³) وتستوعب دفعات كاملة بسهولة.',
    consAr: 'التزام إيجاري أو رأسمالي كبير جداً ولا تناسب الطلبات المفردة الصغيرة.',
  },
];

export interface ZoneMapConfig {
  id: string;
  nameAr: string;
  directionSector: DirectionSector;
  sectorLabelAr: string;
  mapX: number; // 0 to 100 percentage on interactive map
  mapY: number; // 0 to 100 percentage on interactive map
  avgDistanceKm: number;
  baseTripMinutes: number;
  trafficLevel: 'LOW' | 'MODERATE' | 'HIGH_CONGESTION';
  trafficLabelAr: string;
  orderDensityLabelAr: string;
}

export const CAIRO_GIZA_ZONES: ZoneMapConfig[] = [
  {
    id: 'ZONE-NASR',
    nameAr: 'مدينة نصر',
    directionSector: 'EAST',
    sectorLabelAr: 'قطاع شرق القاهرة',
    mapX: 74,
    mapY: 38,
    avgDistanceKm: 9,
    baseTripMinutes: 25,
    trafficLevel: 'HIGH_CONGESTION',
    trafficLabelAr: 'زحام مرتفع أوقات الذروة',
    orderDensityLabelAr: 'كثافة مطاعم وتجارة إلكترونية عالية جداً',
  },
  {
    id: 'ZONE-HELIOPOLIS',
    nameAr: 'مصر الجديدة',
    directionSector: 'EAST',
    sectorLabelAr: 'قطاع شرق القاهرة',
    mapX: 78,
    mapY: 22,
    avgDistanceKm: 11,
    baseTripMinutes: 28,
    trafficLevel: 'MODERATE',
    trafficLabelAr: 'سيولة متوسطة',
    orderDensityLabelAr: 'طلبات مطاعم وطلبات زورو عالية القيمة',
  },
  {
    id: 'ZONE-NEW-CAIRO',
    nameAr: 'التجمع الخامس',
    directionSector: 'EAST',
    sectorLabelAr: 'قطاع شرق القاهرة',
    mapX: 90,
    mapY: 46,
    avgDistanceKm: 18,
    baseTripMinutes: 35,
    trafficLevel: 'LOW',
    trafficLabelAr: 'طرق سريعة مفتوحة',
    orderDensityLabelAr: 'طرود زورو كبيرة ووجبات عائلية',
  },
  {
    id: 'ZONE-DOWNTOWN',
    nameAr: 'وسط البلد',
    directionSector: 'CENTRAL',
    sectorLabelAr: 'قطاع وسط القاهرة',
    mapX: 50,
    mapY: 45,
    avgDistanceKm: 6,
    baseTripMinutes: 20,
    trafficLevel: 'HIGH_CONGESTION',
    trafficLabelAr: 'تكدس مروري مركزي',
    orderDensityLabelAr: 'كثافة مطاعم ومحلات تجارية عالية',
  },
  {
    id: 'ZONE-ZAMALEK',
    nameAr: 'الزمالك',
    directionSector: 'CENTRAL',
    sectorLabelAr: 'قطاع وسط القاهرة',
    mapX: 43,
    mapY: 38,
    avgDistanceKm: 7,
    baseTripMinutes: 22,
    trafficLevel: 'MODERATE',
    trafficLabelAr: 'متوسط على الكباري',
    orderDensityLabelAr: 'طلبات مطاعم سريعة وحساسة للوقت',
  },
  {
    id: 'ZONE-SHUBRA',
    nameAr: 'شبرا مصر',
    directionSector: 'NORTH',
    sectorLabelAr: 'قطاع شمال القاهرة',
    mapX: 48,
    mapY: 18,
    avgDistanceKm: 8,
    baseTripMinutes: 24,
    trafficLevel: 'HIGH_CONGESTION',
    trafficLabelAr: 'كثافة سكانية ومرورية عالية',
    orderDensityLabelAr: 'طلبات مكثفة ومتقاربة مناسبة للتجميع',
  },
  {
    id: 'ZONE-DOKKI',
    nameAr: 'الدقي',
    directionSector: 'WEST',
    sectorLabelAr: 'قطاع الجيزة والغرب',
    mapX: 33,
    mapY: 50,
    avgDistanceKm: 10,
    baseTripMinutes: 26,
    trafficLevel: 'MODERATE',
    trafficLabelAr: 'متوسط على المحاور',
    orderDensityLabelAr: 'توازن بين مطاعم وكلني وطرود زورو',
  },
  {
    id: 'ZONE-MOHANDESSIN',
    nameAr: 'المهندسين',
    directionSector: 'WEST',
    sectorLabelAr: 'قطاع الجيزة والغرب',
    mapX: 28,
    mapY: 36,
    avgDistanceKm: 11,
    baseTripMinutes: 28,
    trafficLevel: 'HIGH_CONGESTION',
    trafficLabelAr: 'زحام تجاري نشط',
    orderDensityLabelAr: 'كثافة عالية جداً في ذروة الغداء والعشاء',
  },
  {
    id: 'ZONE-MAADI',
    nameAr: 'المعادي',
    directionSector: 'SOUTH',
    sectorLabelAr: 'قطاع جنوب القاهرة',
    mapX: 56,
    mapY: 76,
    avgDistanceKm: 13,
    baseTripMinutes: 30,
    trafficLevel: 'MODERATE',
    trafficLabelAr: 'سيولة على الكورنيش والأوتوستراد',
    orderDensityLabelAr: 'طلبات زورو منزلية ومطاعم متميزة',
  },
];

/**
 * 6 Wakkelny Scenarios + 6 Zoro Scenarios (Section 4 & 5 of specification)
 */
export const WAKKELNY_SCENARIOS: PlatformScenarioTemplate[] = [
  {
    id: 'WAK-SCEN-1-FAST',
    platformId: 'WAKKELNY',
    titleAr: 'طلب وجبة سريعة عادية',
    descriptionAr: 'وجبة شاورما وساندوتشات ساخنة جاهزة للاستلام الفوري',
    pickupPartnerAr: 'مطعم الشيف الدمشقي — مدينة نصر',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'مصر الجديدة',
    directionSector: 'EAST',
    weightGrams: 850, // 0.85 kg
    lengthCm: 24,
    widthCm: 20,
    heightCm: 15,
    volumeCm3: 24 * 20 * 15, // 7,200 cm³
    shippingTariffEgp: 42,
    merchantOrderValueEgp: 260,
    prepTimeMinutes: 5,
    maxDeliveryWindowMinutes: 45,
    priority: 'NORMAL',
    fragile: false,
    hotFoodSensitive: true,
    batchable: true,
    requiresCarOrTruck: false,
  },
  {
    id: 'WAK-SCEN-2-PEAK-RUSH',
    platformId: 'WAKKELNY',
    titleAr: 'طلب وقت الذروة (ساعة الغداء)',
    descriptionAr: 'طلب غداء عاجل لمكتب شركة — العميل يتابع الدقيقة',
    pickupPartnerAr: 'برجر فاكتوري — المهندسين',
    pickupZone: 'المهندسين',
    deliveryZone: 'الدقي',
    directionSector: 'WEST',
    weightGrams: 1450, // 1.45 kg
    lengthCm: 28,
    widthCm: 24,
    heightCm: 18,
    volumeCm3: 28 * 24 * 18, // 12,096 cm³
    shippingTariffEgp: 60,
    merchantOrderValueEgp: 420,
    prepTimeMinutes: 10,
    maxDeliveryWindowMinutes: 35,
    priority: 'PEAK_RUSH',
    fragile: false,
    hotFoodSensitive: true,
    batchable: false,
    requiresCarOrTruck: false,
    specialRiskNoteAr: 'حساس جداً للوقت؛ التجميع غير المستقر قد يعرض الوجبة للبرودة والتأخير.',
  },
  {
    id: 'WAK-SCEN-3-FAMILY-FEAST',
    platformId: 'WAKKELNY',
    titleAr: 'طلب عائلي ثقيل ومتعدد الأكياس',
    descriptionAr: 'صواني مشويات وطواجن ساخنة + مشروبات لعزومة عائلية',
    pickupPartnerAr: 'قصر المشويات الأصلي — وسط البلد',
    pickupZone: 'وسط البلد',
    deliveryZone: 'الزمالك',
    directionSector: 'CENTRAL',
    weightGrams: 6800, // 6.80 kg
    lengthCm: 42,
    widthCm: 35,
    heightCm: 30,
    volumeCm3: 42 * 35 * 30, // 44,100 cm³
    shippingTariffEgp: 85,
    merchantOrderValueEgp: 1350,
    prepTimeMinutes: 15,
    maxDeliveryWindowMinutes: 50,
    priority: 'HIGH',
    fragile: true,
    hotFoodSensitive: true,
    batchable: true,
    requiresCarOrTruck: false,
    specialRiskNoteAr: 'حجم ووزن مرتفعان نسبياً (6.8 كجم / 44,100 سم³) ويحتاج تثبيتاً جيداً داخل صندوق المركبة.',
  },
  {
    id: 'WAK-SCEN-4-RESTAURANT-DELAY',
    platformId: 'WAKKELNY',
    titleAr: 'طلب يتأخر المطعم في تجهيزه',
    descriptionAr: 'ضغط داخل مطبخ المطعم يؤخر تسليم الأوردر للمندوب 15 دقيقة إضافية',
    pickupPartnerAr: 'بيتزا نابولي السريعة — المعادي',
    pickupZone: 'المعادي',
    deliveryZone: 'المعادي',
    directionSector: 'SOUTH',
    weightGrams: 1900, // 1.90 kg
    lengthCm: 35,
    widthCm: 35,
    heightCm: 14,
    volumeCm3: 35 * 35 * 14, // 17,150 cm³
    shippingTariffEgp: 55,
    merchantOrderValueEgp: 490,
    prepTimeMinutes: 20,
    maxDeliveryWindowMinutes: 45,
    priority: 'HIGH',
    fragile: false,
    hotFoodSensitive: true,
    batchable: false,
    requiresCarOrTruck: false,
    specialRiskNoteAr: 'تأخر التجهيز من المطعم يقلل الهامش الزمني المتبقي للتوصيل (لا يُحسب ذنباً شخصياً على المندوب).',
  },
  {
    id: 'WAK-SCEN-5-CUSTOMER-CHANGE',
    platformId: 'WAKKELNY',
    titleAr: 'طلب يغير العميل تفاصيله أو يتأخر في الرد',
    descriptionAr: 'وجبة كشري وطواجن — العميل طلب تعديل رقم العقار أثناء الطريق',
    pickupPartnerAr: 'كشري التحرير الذهبي — شبرا مصر',
    pickupZone: 'شبرا مصر',
    deliveryZone: 'شبرا مصر',
    directionSector: 'NORTH',
    weightGrams: 2200, // 2.20 kg
    lengthCm: 30,
    widthCm: 25,
    heightCm: 20,
    volumeCm3: 30 * 25 * 20, // 15,000 cm³
    shippingTariffEgp: 48,
    merchantOrderValueEgp: 310,
    prepTimeMinutes: 5,
    maxDeliveryWindowMinutes: 50,
    priority: 'NORMAL',
    fragile: false,
    hotFoodSensitive: true,
    batchable: true,
    requiresCarOrTruck: false,
    specialRiskNoteAr: 'يحتاج مندوباً ذا مهارة تواصل جيدة مع العملاء لتفادي فشل التسليم.',
  },
  {
    id: 'WAK-SCEN-6-DIRECTIONAL-PAIR',
    platformId: 'WAKKELNY',
    titleAr: 'طلب مثالي للتجميع الاتجاهي السريع',
    descriptionAr: 'وجبة سوشي وباستا في نفس مربع مدينة نصر — مصر الجديدة',
    pickupPartnerAr: 'أوشن بايتس — مدينة نصر',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'مصر الجديدة',
    directionSector: 'EAST',
    weightGrams: 1100, // 1.10 kg
    lengthCm: 26,
    widthCm: 22,
    heightCm: 16,
    volumeCm3: 26 * 22 * 16, // 9,152 cm³
    shippingTariffEgp: 46,
    merchantOrderValueEgp: 540,
    prepTimeMinutes: 5,
    maxDeliveryWindowMinutes: 55,
    priority: 'NORMAL',
    fragile: false,
    hotFoodSensitive: true,
    batchable: true,
    requiresCarOrTruck: false,
  },
];

export const ZORO_SCENARIOS: PlatformScenarioTemplate[] = [
  {
    id: 'ZORO-SCEN-1-LIGHT',
    platformId: 'ZORO',
    titleAr: 'طرد إلكترونيات وإكسسوارات خفيف',
    descriptionAr: 'سماعات لاسلكية وشاحن أصلي مغلف من مخزن زورو المركزي',
    pickupPartnerAr: 'مركز توزيع زورو (شرق القاهرة — مدينة نصر)',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'مصر الجديدة',
    directionSector: 'EAST',
    weightGrams: 650, // 0.65 kg
    lengthCm: 22,
    widthCm: 16,
    heightCm: 10,
    volumeCm3: 22 * 16 * 10, // 3,520 cm³
    shippingTariffEgp: 65,
    merchantOrderValueEgp: 1450,
    prepTimeMinutes: 5,
    maxDeliveryWindowMinutes: 90,
    priority: 'NORMAL',
    fragile: false,
    hotFoodSensitive: false,
    batchable: true,
    requiresCarOrTruck: false,
  },
  {
    id: 'ZORO-SCEN-2-MEDIUM',
    platformId: 'ZORO',
    titleAr: 'طرد ملابس وأحذية متوسط الحجم',
    descriptionAr: 'صندوق طلبيات أزياء ومستلزمات منزلية من مخزن زورو',
    pickupPartnerAr: 'مركز توزيع زورو (شرق القاهرة — مدينة نصر)',
    pickupZone: 'مدينة نصر',
    deliveryZone: 'التجمع الخامس',
    directionSector: 'EAST',
    weightGrams: 4800, // 4.80 kg
    lengthCm: 40,
    widthCm: 32,
    heightCm: 25,
    volumeCm3: 40 * 32 * 25, // 32,000 cm³
    shippingTariffEgp: 95,
    merchantOrderValueEgp: 2200,
    prepTimeMinutes: 5,
    maxDeliveryWindowMinutes: 110,
    priority: 'NORMAL',
    fragile: false,
    hotFoodSensitive: false,
    batchable: true,
    requiresCarOrTruck: false,
  },
  {
    id: 'ZORO-SCEN-3-HEAVY-CAR',
    platformId: 'ZORO',
    titleAr: 'طرد أجهزة منزلية كبير (يتطلب سيارة توصيل/نقل)',
    descriptionAr: 'فرن كهربائي وميكروويف ومبرد مياه — يتجاوز سعة الموتوسيكل',
    pickupPartnerAr: 'مخزن زورو اللوجستي الثقيل — التجمع الخامس',
    pickupZone: 'التجمع الخامس',
    deliveryZone: 'المعادي',
    directionSector: 'SOUTH',
    weightGrams: 42000, // 42.00 kg (> 20 kg motorcycle max!)
    lengthCm: 85,
    widthCm: 65,
    heightCm: 60,
    volumeCm3: 85 * 65 * 60, // 331,500 cm³ (> 137,500 cm³ moto max!)
    shippingTariffEgp: 240,
    merchantOrderValueEgp: 8900,
    prepTimeMinutes: 10,
    maxDeliveryWindowMinutes: 120,
    priority: 'HIGH',
    fragile: true,
    hotFoodSensitive: false,
    batchable: true,
    requiresCarOrTruck: true,
    specialRiskNoteAr: 'الوزن 42 كجم والحجم 331,500 سم³؛ لا يركب على أي موتوسيكل ويتطلب سيارة توصيل صغيرة أو شاحنة.',
  },
  {
    id: 'ZORO-SCEN-4-FRAGILE',
    platformId: 'ZORO',
    titleAr: 'طرد شاشات وزجاجيات قابل للكسر',
    descriptionAr: 'شاشة كمبيوتر احترافية 27 بوصة وأدوات قهوة زجاجية',
    pickupPartnerAr: 'مخزن زورو المركزي (الجيزة — الدقي)',
    pickupZone: 'الدقي',
    deliveryZone: 'المهندسين',
    directionSector: 'WEST',
    weightGrams: 7500, // 7.50 kg
    lengthCm: 48,
    widthCm: 36,
    heightCm: 28,
    volumeCm3: 48 * 36 * 28, // 48,384 cm³
    shippingTariffEgp: 135,
    merchantOrderValueEgp: 7400,
    prepTimeMinutes: 5,
    maxDeliveryWindowMinutes: 95,
    priority: 'HIGH',
    fragile: true,
    hotFoodSensitive: false,
    batchable: true,
    requiresCarOrTruck: false,
    specialRiskNoteAr: 'قابل للكسر؛ يتطلب مركبة بحالة فنية جيدة ومندوباً ذا دقة عالية.',
  },
  {
    id: 'ZORO-SCEN-5-HUB-BATCH',
    platformId: 'ZORO',
    titleAr: 'دفعة طرود مجمعة من مخزن زورو لنفس الخط',
    descriptionAr: '4 صناديق مستلزمات مكتبية وإلكترونيات متجهة لخط وسط البلد والزمالك',
    pickupPartnerAr: 'مخزن زورو المركزي — وسط البلد',
    pickupZone: 'وسط البلد',
    deliveryZone: 'الزمالك',
    directionSector: 'CENTRAL',
    weightGrams: 14500, // 14.50 kg (fits Heavy Moto or Car, exceeds Economy Moto 10kg!)
    lengthCm: 50,
    widthCm: 45,
    heightCm: 40,
    volumeCm3: 50 * 45 * 40, // 90,000 cm³ (fits Heavy Moto 137.5k or Car, exceeds Economy Moto 72k!)
    shippingTariffEgp: 165,
    merchantOrderValueEgp: 4600,
    prepTimeMinutes: 10,
    maxDeliveryWindowMinutes: 105,
    priority: 'NORMAL',
    fragile: false,
    hotFoodSensitive: false,
    batchable: true,
    requiresCarOrTruck: false,
    specialRiskNoteAr: 'تتجاوز حمولة الموتوسيكل الاقتصادي (14.5 كجم / 90,000 سم³) وتحتاج موتوسيكل قوي أو سيارة.',
  },
  {
    id: 'ZORO-SCEN-6-BULK-PALLET',
    platformId: 'ZORO',
    titleAr: 'شحنة موسم عروض زورو الكبرى (حمولة تجارية)',
    descriptionAr: 'دفعة كراتين أجهزة ومستلزمات منزلية لتغطية عروض نهاية الأسبوع',
    pickupPartnerAr: 'مخزن زورو الإقليمي — التجمع الخامس',
    pickupZone: 'التجمع الخامس',
    deliveryZone: 'شبرا مصر',
    directionSector: 'NORTH',
    weightGrams: 185000, // 185 kg
    lengthCm: 140,
    widthCm: 110,
    heightCm: 100,
    volumeCm3: 140 * 110 * 100, // 1,540,000 cm³
    shippingTariffEgp: 420,
    merchantOrderValueEgp: 24000,
    prepTimeMinutes: 15,
    maxDeliveryWindowMinutes: 135,
    priority: 'PEAK_RUSH',
    fragile: false,
    hotFoodSensitive: false,
    batchable: true,
    requiresCarOrTruck: true,
    specialRiskNoteAr: 'حمولة ثقيلة (185 كجم / 1.54 مليون سم³)؛ تتطلب سيارة توصيل صغيرة أو شاحنة نقل متوسطة/كبيرة.',
  },
];

export interface OperationsUpgradeConfig {
  id: string;
  nameAr: string;
  categoryAr: string;
  costEgp: number;
  costPiastres: number;
  maxLevel: number;
  descriptionAr: string;
  effectSummaryAr: string;
}

export const OPERATIONS_UPGRADE_CATALOG: OperationsUpgradeConfig[] = [
  {
    id: 'UPG-DISPATCH-UNIT',
    nameAr: 'وحدة التوزيع والتوجيه المركزي الذكي',
    categoryAr: 'مركز التشغيل',
    costEgp: 3500,
    costPiastres: egpToPiastres(3500),
    maxLevel: 3,
    descriptionAr:
      'تجهيز غرفة عمليات التوجيه بشاشات تتبع لحظي وخوارزميات تقليل المسافات المهدرة.',
    effectSummaryAr: 'يخفض تكلفة الوقود لكل رحلة بنسبة 8% لكل مستوى ويزيد دقة التوزيع الذكي.',
  },
  {
    id: 'UPG-DRIVER-TRAINING',
    nameAr: 'أكاديمية تدريب المناديب على القيادة الآمنة وخدمة العملاء',
    categoryAr: 'الموارد البشرية والأسطول',
    costEgp: 2800,
    costPiastres: egpToPiastres(2800),
    maxLevel: 3,
    descriptionAr:
      'برنامج تدريبي عملي لرفع سرعة التسليم ومهارة التعامل مع العملاء في طلبات وكلني وزورو.',
    effectSummaryAr: 'يرفع كفاءة وسرعة جميع المناديب بـ +5 نقاط لكل مستوى ويقلل أخطاء التسليم.',
  },
  {
    id: 'UPG-PREVENTIVE-WORKSHOP',
    nameAr: 'ورشة الصيانة الوقائية السريعة للأسطول',
    categoryAr: 'الصيانة والمركبات',
    costEgp: 4200,
    costPiastres: egpToPiastres(4200),
    maxLevel: 3,
    descriptionAr:
      'إنشاء نقطة فحص فني يومي للموتوسيكلات والسيارات داخل مقر الشركة قبل انطلاق الوردية.',
    effectSummaryAr: 'يقلل استهلاك وتآكل المركبات بنسبة 25% لكل مستوى ويخفض تكلفة الإصلاح.',
  },
  {
    id: 'UPG-CONTRACT-RELATIONS',
    nameAr: 'فريق متابعة عقود المنصات (وكلني & زورو)',
    categoryAr: 'تطوير الأعمال',
    costEgp: 3200,
    costPiastres: egpToPiastres(3200),
    maxLevel: 3,
    descriptionAr:
      'تخصيص مسؤولي حسابات للتنسيق اللحظي مع مطاعم وكلني ومخازن زورو لتقليل وقت الانتظار.',
    effectSummaryAr: 'يرفع عدد الطلبات اليومية المتاحة من العقود بـ +2 طلب لكل مستوى ويحسن تقييم SLA.',
  },
  {
    id: 'UPG-SMART-TRACKING',
    nameAr: 'نظام التتبع اللحظي وتنبيهات العملاء التلقائية',
    categoryAr: 'التكنولوجيا والجودة',
    costEgp: 3000,
    costPiastres: egpToPiastres(3000),
    maxLevel: 3,
    descriptionAr:
      'إرسال إشعارات دقيقة للعميل بموقع المندوب والوقت المتوقع للوصول لتفادي غياب العميل.',
    effectSummaryAr: 'يرفع رضا العملاء والسمعة ويقلل حالات فشل التسليم بنسبة 30%.',
  },
];

export interface ContractMarketingCampaignTemplate {
  id: string;
  targetPlatform: PlatformContractId | 'GENERAL_BRAND';
  nameAr: string;
  costEgp: number;
  costPiastres: number;
  durationDays: number;
  expectedExtraOrdersPerDay: number;
  expectedFollowersGain: number;
  expectedReputationBoost: number;
  minRequiredReputation: number;
  descriptionAr: string;
  warningIfOvercapacityAr: string;
}

export const CONTRACT_MARKETING_CATALOG: ContractMarketingCampaignTemplate[] = [
  {
    id: 'MKT-WAKKELNY-RESTAURANTS',
    targetPlatform: 'WAKKELNY',
    nameAr: 'حملة توسع سلاسل مطاعم «وكلني» في أوقات الذروة',
    costEgp: 1200,
    costPiastres: egpToPiastres(1200),
    durationDays: 3,
    expectedExtraOrdersPerDay: 3,
    expectedFollowersGain: 380,
    expectedReputationBoost: 3,
    minRequiredReputation: 50,
    descriptionAr:
      'ترويج قدرات التوصيل السريع لشركتك لدى أشهر المطاعم المتعاقدة مع منصة وكلني لزيادة تدفق الطلبات اليومية.',
    warningIfOvercapacityAr:
      'تحذير تشغيلي: إذا لم يتوفر عدد كافٍ من المناديب والموتوسيكلات، ستتأخر الوجبات الساخنة وتتحول الحملة إلى شكاوى!',
  },
  {
    id: 'MKT-ZORO-HUB-PARTNER',
    targetPlatform: 'ZORO',
    nameAr: 'حملة الشريك اللوجستي المعتمد لمخازن «زورو»',
    costEgp: 2200,
    costPiastres: egpToPiastres(2200),
    durationDays: 4,
    expectedExtraOrdersPerDay: 4,
    expectedFollowersGain: 650,
    expectedReputationBoost: 4,
    minRequiredReputation: 55,
    descriptionAr:
      'رفع حصة شركتك من خطوط توزيع مخازن زورو، بما يشمل الطرود المتوسطة والدفعات المجمعة عالية العائد.',
    warningIfOvercapacityAr:
      'تحذير تشغيلي: تتضمن الحملة طروداً متوسطة وكبيرة قد تتطلب موتوسيكلات قوية أو سيارات توصيل.',
  },
  {
    id: 'MKT-BRAND-REPUTATION',
    targetPlatform: 'GENERAL_BRAND',
    nameAr: 'حملة تحسين السمعة وبناء الثقة الرقمية',
    costEgp: 950,
    costPiastres: egpToPiastres(950),
    durationDays: 3,
    expectedExtraOrdersPerDay: 2,
    expectedFollowersGain: 520,
    expectedReputationBoost: 6,
    minRequiredReputation: 35,
    descriptionAr:
      'نشر قصص نجاح التوصيل الموثوق لشركتك على منصات التواصل لرفع عدد المتابعين واستعادة ثقة السوق.',
    warningIfOvercapacityAr:
      'زيادة المتابعين ترفع التفاعل، لكن الربح الحقيقي يتحقق فقط عند الالتزام بمواعيد التسليم.',
  },
  {
    id: 'MKT-SEASONAL-MEGA-SURGE',
    targetPlatform: 'ZORO',
    nameAr: 'حملة استعداد لموسم التخفيضات الكبرى (Mega Flash Sale)',
    costEgp: 3600,
    costPiastres: egpToPiastres(3600),
    durationDays: 4,
    expectedExtraOrdersPerDay: 6,
    expectedFollowersGain: 1100,
    expectedReputationBoost: 5,
    minRequiredReputation: 65,
    descriptionAr:
      'فتح خطوط التوريد السريع لعروض المواسم الكبرى مع مكافآت التزام مرتفعة عند تحقيق نسبة تسليم فوق 90%.',
    warningIfOvercapacityAr:
      'تتطلب أسطولاً قوياً ومناديب متاحين؛ الفشل في تغطية الذروة يؤدي لخصومات تعاقدية قاسية.',
  },
];
