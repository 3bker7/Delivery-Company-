import React, { useState } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  Crown,
  Flame,
  ImagePlus,
  MapPin,
  Save,
  Shield,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { GameState } from '../types/game';

interface CompanyProfilePanelProps {
  state: GameState;
  onSaveProfile: (patch: {
    companyName?: string;
    commercialSloganAr?: string;
    bioAr?: string;
    avatarIconId?: NonNullable<GameState['companyProfile']>['avatarIconId'];
    customAvatarDataUrl?: string;
    serviceSpecialtiesAr?: string[];
    coveredZonesAr?: string[];
  }) => void;
}

const AVATAR_OPTIONS: {
  id: NonNullable<GameState['companyProfile']>['avatarIconId'];
  labelAr: string;
}[] = [
  { id: 'TRUCK_SHIELD', labelAr: 'درع النقل السريع' },
  { id: 'EAGLE_EXPRESS', labelAr: 'صقر إكسبريس' },
  { id: 'NILE_STAR', labelAr: 'نجمة النيل اللوجستية' },
  { id: 'CAIRO_FLASH', labelAr: 'برق القاهرة' },
  { id: 'CROWN_LOGISTICS', labelAr: 'التاج الذهبي للشحن' },
];

const SPECIALTY_CHOICES = [
  'توصيل التجارة الإلكترونية والبراندات',
  'تحصيل أمانات التجار (COD) بدقة',
  'تغليف مقوى للشحنات القابلة للكسر',
  'توصيل الطلبات الفورية والمطاعم الساخنة',
  'توزيع الجملة وقطع الغيار والمستلزمات الطبية',
  'تغطية المزادات التنافسية وعقود الشركات',
];

const ZONE_CHOICES = [
  'مدينة نصر',
  'العتبة',
  'وسط البلد',
  'المعادي',
  'الدقي',
  'المهندسين',
  'شبرا مصر',
  'مصر الجديدة',
  'الزمالك',
  'التجمع الخامس',
  'الجيزة والهرم',
  'الإسكندرية والدلتا',
];

export const CompanyProfilePanel: React.FC<CompanyProfilePanelProps> = ({
  state,
  onSaveProfile,
}) => {
  const profile = state.companyProfile || {
    bioAr:
      'شركة شحن وخدمات لوجستية متخصصة في التوصيل السريع وإدارة تحصيل أمانات التجار (COD) والفرز الآمن داخل القاهرة الكبرى والمحافظات.',
    commercialSloganAr: 'أمانة طردك.. التزام في الميعاد وحساب بالمليم',
    avatarIconId: 'TRUCK_SHIELD' as const,
    serviceSpecialtiesAr: [
      'توصيل التجارة الإلكترونية والبراندات',
      'تحصيل أمانات التجار (COD) بدقة',
    ],
    coveredZonesAr: ['مدينة نصر', 'العتبة', 'المعادي', 'الدقي'],
    lastUpdatedDay: 1,
    trustBonusEarned: 0,
  };

  const [companyName, setCompanyName] = useState(state.company.name);
  const [sloganAr, setSloganAr] = useState(profile.commercialSloganAr);
  const [bioAr, setBioAr] = useState(profile.bioAr);
  const [avatarIconId, setAvatarIconId] = useState(profile.avatarIconId);
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState(
    profile.customAvatarDataUrl || ''
  );
  const [specialties, setSpecialties] = useState<string[]>(
    profile.serviceSpecialtiesAr
  );
  const [zones, setZones] = useState<string[]>(profile.coveredZonesAr);

  const deliveredCount = state.shipments.filter(
    (s) => s.status === 'DELIVERED'
  ).length;
  const activeContractsCount = Object.values(
    state.businessDeveloper?.contracts || {}
  ).filter((c) => c.signed).length;

  const toggleSpecialty = (item: string) => {
    setSpecialties((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const toggleZone = (z: string) => {
    setZones((prev) =>
      prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAvatarDataUrl(reader.result);
        setAvatarIconId('CUSTOM');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      companyName,
      commercialSloganAr: sloganAr,
      bioAr,
      avatarIconId,
      customAvatarDataUrl: customAvatarDataUrl || undefined,
      serviceSpecialtiesAr: specialties,
      coveredZonesAr: zones,
    });
  };

  return (
    <div className="space-y-4">
      {/* Commercial Trust Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center overflow-hidden">
              {avatarIconId === 'CUSTOM' && customAvatarDataUrl ? (
                <img
                  src={customAvatarDataUrl}
                  alt={companyName}
                  className="w-full h-full object-cover"
                />
              ) : avatarIconId === 'CROWN_LOGISTICS' ? (
                <Crown className="w-6 h-6 text-amber-400" />
              ) : avatarIconId === 'CAIRO_FLASH' ? (
                <Flame className="w-6 h-6 text-orange-400" />
              ) : avatarIconId === 'NILE_STAR' ? (
                <Star className="w-6 h-6 text-sky-400" />
              ) : (
                <Shield className="w-6 h-6 text-indigo-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{companyName}</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                  {state.company.companyCode || 'ING-2026'}
                </span>
              </div>
              <p className="text-xs text-indigo-300 font-bold">{sloganAr}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-xs font-black text-emerald-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>
                مكافأة الثقة التجارية: +{profile.trustBonusEarned} نقاط في المزادات والعقود
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">السمعة التشغيلية</div>
            <div className="text-sm font-black text-amber-400 mt-0.5">
              {state.company.reputation} / 100
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">القوة التسويقية</div>
            <div className="text-sm font-black text-sky-400 mt-0.5">
              {state.company.marketingPower ?? 58} / 100
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">الشحنات المسلمة بنجاح</div>
            <div className="text-sm font-black text-emerald-400 mt-0.5">
              {deliveredCount} شحنة
            </div>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 font-bold">العقود والشراكات المفعلة</div>
            <div className="text-sm font-black text-indigo-400 mt-0.5">
              {activeContractsCount} عقود رسمية
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form
        onSubmit={handleSave}
        className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-200 mb-1">
              الاسم التجاري للشركة
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-200 mb-1">
              الشعار الترويجي (Slogan)
            </label>
            <input
              type="text"
              value={sloganAr}
              onChange={(e) => setSloganAr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-200 mb-1">
            الوصف التعريفي للشركة (يظهر للتجار وأصحاب العقود والمزادات)
          </label>
          <textarea
            rows={3}
            value={bioAr}
            onChange={(e) => setBioAr(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white leading-relaxed"
          />
        </div>

        {/* Avatar Selection */}
        <div>
          <label className="block text-xs font-black text-slate-200 mb-1.5">
            هوية وشعار الشركة (اختر رمزاً أو ارفع صورة شعار مخصصة)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {AVATAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAvatarIconId(opt.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                  avatarIconId === opt.id
                    ? 'bg-indigo-600/30 border-indigo-400 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.labelAr}
              </button>
            ))}

            <label className="px-3 py-1.5 rounded-lg border border-dashed border-sky-500/40 bg-sky-950/30 text-sky-300 text-xs font-bold cursor-pointer hover:bg-sky-900/40 flex items-center gap-1.5">
              <ImagePlus className="w-3.5 h-3.5" />
              <span>رفع صورة شعار من جهازك</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-xs font-black text-slate-200 mb-1.5">
            التخصصات والخدمات اللوجستية المعتمدة
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALTY_CHOICES.map((sp) => {
              const active = specialties.includes(sp);
              return (
                <button
                  key={sp}
                  type="button"
                  onClick={() => toggleSpecialty(sp)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                    active
                      ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {sp}
                </button>
              );
            })}
          </div>
        </div>

        {/* Covered Zones */}
        <div>
          <label className="block text-xs font-black text-slate-200 mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            مناطق التغطية المعتمدة في ملف الشركة (تعطي أفضلية في المزادات التنافسية)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ZONE_CHOICES.map((z) => {
              const active = zones.includes(z);
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => toggleZone(z)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                    active
                      ? 'bg-sky-600/25 border-sky-500/50 text-sky-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {active ? '✓ ' : ''}
                  {z}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            حفظ وتوثيق الملف الشخصي يرفع ثقة العملاء التجاريين ويعزز نقاط تقييمك في المزادات.
          </span>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتوثيق ملف الشركة</span>
          </button>
        </div>
      </form>
    </div>
  );
};
