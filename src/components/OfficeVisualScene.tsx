import React, { useState } from 'react';

interface CharacterPortraitProps {
  avatarId: 'mahmoud' | 'am_saber' | 'hag_saeed' | 'nourhan' | 'kareem';
  size?: 'sm' | 'md' | 'lg';
}

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  avatarId,
  size = 'md',
}) => {
  const dimensions =
    size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-20 h-20' : 'w-13 h-13';

  return (
    <div
      className={`${dimensions} rounded-lg overflow-hidden border border-slate-700 bg-slate-800 shrink-0 flex items-center justify-center`}
    >
      {avatarId === 'mahmoud' && (
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <rect width="80" height="80" fill="#1E293B" />
          <circle cx="40" cy="68" r="26" fill="#0F172A" />
          <path d="M32 52 L40 66 L48 52 Z" fill="#F8FAFC" />
          <path d="M39 55 L41 55 L42 66 L38 66 Z" fill="#D97706" />
          <circle cx="40" cy="30" r="15" fill="#E2B897" />
          <path d="M25 26 C25 14 55 14 55 26 C52 21 28 21 25 26 Z" fill="#1E293B" />
          {/* Glasses */}
          <rect x="29" y="27" width="9" height="6" rx="1.5" fill="none" stroke="#475569" strokeWidth="2" />
          <rect x="42" y="27" width="9" height="6" rx="1.5" fill="none" stroke="#475569" strokeWidth="2" />
          <line x1="38" y1="30" x2="42" y2="30" stroke="#475569" strokeWidth="2" />
          <path d="M34 38 Q40 41 46 38" stroke="#475569" strokeWidth="2" fill="none" />
        </svg>
      )}

      {avatarId === 'am_saber' && (
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <rect width="80" height="80" fill="#1E3A8A" />
          <circle cx="40" cy="68" r="26" fill="#D97706" />
          <rect x="28" y="54" width="24" height="6" fill="#FDE68A" opacity="0.8" />
          <circle cx="40" cy="31" r="15" fill="#C69067" />
          {/* Cap/Helmet */}
          <path d="M24 26 Q40 13 56 26 Z" fill="#0F172A" />
          <path d="M32 37 Q40 42 48 37" stroke="#E2E8F0" strokeWidth="3" fill="none" />
          <circle cx="34" cy="29" r="2" fill="#0F172A" />
          <circle cx="46" cy="29" r="2" fill="#0F172A" />
        </svg>
      )}

      {avatarId === 'hag_saeed' && (
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <rect width="80" height="80" fill="#312E81" />
          <circle cx="40" cy="70" r="27" fill="#334155" />
          <circle cx="40" cy="31" r="15" fill="#D4A373" />
          {/* White Beard & Mustache */}
          <path d="M26 33 Q40 52 54 33 Q52 46 40 47 Q28 46 26 33 Z" fill="#E2E8F0" />
          {/* Traditional Taqiyah */}
          <path d="M25 24 Q40 14 55 24 Z" fill="#F8FAFC" />
          <circle cx="34" cy="29" r="2" fill="#1E293B" />
          <circle cx="46" cy="29" r="2" fill="#1E293B" />
        </svg>
      )}

      {avatarId === 'nourhan' && (
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <rect width="80" height="80" fill="#064E3B" />
          <circle cx="40" cy="68" r="26" fill="#047857" />
          {/* Hijab frame */}
          <circle cx="40" cy="31" r="18" fill="#F59E0B" />
          <circle cx="40" cy="32" r="13" fill="#ECC5A8" />
          <circle cx="35" cy="30" r="1.8" fill="#1E293B" />
          <circle cx="45" cy="30" r="1.8" fill="#1E293B" />
          <path d="M36 37 Q40 40 44 37" stroke="#9A3412" strokeWidth="1.8" fill="none" />
        </svg>
      )}

      {avatarId === 'kareem' && (
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <rect width="80" height="80" fill="#0F172A" />
          <circle cx="40" cy="68" r="26" fill="#2563EB" />
          <circle cx="40" cy="30" r="15" fill="#DFB18B" />
          <path d="M25 25 Q40 12 55 25 Z" fill="#0F172A" />
          <rect x="30" y="27" width="8" height="5" fill="none" stroke="#0F172A" strokeWidth="1.8" />
          <rect x="42" y="27" width="8" height="5" fill="none" stroke="#0F172A" strokeWidth="1.8" />
          <path d="M35 38 Q40 41 45 38" stroke="#0F172A" strokeWidth="2" fill="none" />
        </svg>
      )}
    </div>
  );
};

interface OfficeVisualSceneProps {
  currentDay: number;
  activeShipmentsCount: number;
  deliveredTodayCount: number;
  activeSpeakerAvatar?: 'mahmoud' | 'am_saber' | 'hag_saeed' | 'nourhan' | 'kareem';
  activeSpeakerName?: string;
  onOpenShipments: () => void;
  onOpenLedger: () => void;
  onOpenFleet: () => void;
}

/**
 * Interactive, animated Egyptian shipping office scene ("انجوبيا اكسبريس")
 * featuring live moving courier dots on the Cairo GPS map, moving conveyor parcels,
 * animated monitor telemetry, and a compact collapsible hotspot dropdown.
 */
export const OfficeVisualScene: React.FC<OfficeVisualSceneProps> = ({
  currentDay,
  activeShipmentsCount,
  deliveredTodayCount,
  activeSpeakerAvatar,
  activeSpeakerName,
  onOpenShipments,
  onOpenLedger,
  onOpenFleet,
}) => {
  const [sceneDetailsOpen, setSceneDetailsOpen] = useState(false);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-900 select-none shadow-md">
      <svg
        viewBox="0 0 680 220"
        className="w-full h-auto max-h-[195px] sm:max-h-[215px] object-cover block"
        role="img"
        aria-label="مقر عمليات انجوبيا اكسبريس للشحن"
      >
        <defs>
          <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient id="windowSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="deskWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
          <path id="cairoRouteA" d="M55 26 L98 42 L62 66 L55 26" />
          <path id="cairoRouteB" d="M105 24 L68 52 L114 70 L105 24" />
        </defs>

        {/* Office Wall */}
        <rect width="680" height="220" fill="url(#wallGrad)" />

        {/* Cairo Window with Minaret, Bridge & Moving Traffic Lights */}
        <g transform="translate(30, 14)">
          <rect
            width="175"
            height="96"
            rx="4"
            fill="url(#windowSky)"
            stroke="#334155"
            strokeWidth="3.5"
          />
          {/* Sun / Sky Glow */}
          <circle cx="140" cy="24" r="11" fill="#FBBF24" opacity="0.35">
            <animate
              attributeName="r"
              values="10;13;10"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Cairo Buildings Silhouette */}
          <rect x="10" y="48" width="28" height="46" fill="#1E293B" />
          <rect x="42" y="34" width="34" height="60" fill="#1E293B" />
          <rect x="82" y="54" width="40" height="40" fill="#1E293B" />
          <rect x="128" y="40" width="32" height="54" fill="#1E293B" />
          {/* Moving Delivery Van across Window Bridge */}
          <g>
            <rect x="0" y="82" width="16" height="7" rx="1.5" fill="#F59E0B" />
            <circle cx="4" cy="90" r="2" fill="#0F172A" />
            <circle cx="12" cy="90" r="2" fill="#0F172A" />
            <animateTransform
              attributeName="transform"
              type="translate"
              from="-20 0"
              to="180 0"
              dur="6.5s"
              repeatCount="indefinite"
            />
          </g>
          {/* Window blinds */}
          <line x1="0" y1="24" x2="175" y2="24" stroke="#475569" strokeWidth="1.2" />
          <line x1="0" y1="48" x2="175" y2="48" stroke="#475569" strokeWidth="1.2" />
          <line x1="87" y1="0" x2="87" y2="96" stroke="#334155" strokeWidth="2.5" />
        </g>

        {/* Company Signboard on Wall */}
        <g transform="translate(235, 14)">
          <rect
            width="215"
            height="46"
            rx="6"
            fill="#0F172A"
            stroke="#D97706"
            strokeWidth="2"
          />
          <circle cx="18" cy="23" r="4" fill="#10B981">
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x="112"
            y="22"
            textAnchor="middle"
            fill="#F59E0B"
            fontSize="13"
            fontWeight="bold"
            fontFamily="Cairo, sans-serif"
          >
            انجوبيا اكسبريس — Ingobia
          </text>
          <text
            x="112"
            y="37"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="9"
            fontFamily="Cairo, sans-serif"
          >
            غرفة العمليات المركزية وحركة الأسطول المباشرة
          </text>
        </g>

        {/* Live GPS Operations Zone Map Board (Clickable for Fleet) */}
        <g
          transform="translate(480, 14)"
          className="cursor-pointer hover:opacity-95"
          onClick={onOpenFleet}
        >
          <rect
            width="170"
            height="94"
            rx="5"
            fill="#0F172A"
            stroke="#475569"
            strokeWidth="2.5"
          />
          {/* Nile river path */}
          <path
            d="M84 8 Q92 42 78 62 Q70 76 80 90"
            stroke="#0284C7"
            strokeWidth="4"
            fill="none"
          />
          {/* Route tracks */}
          <use
            href="#cairoRouteA"
            stroke="#F59E0B"
            strokeWidth="1.3"
            strokeDasharray="3 2"
            fill="none"
            opacity="0.65"
          />
          <use
            href="#cairoRouteB"
            stroke="#10B981"
            strokeWidth="1.3"
            strokeDasharray="3 2"
            fill="none"
            opacity="0.65"
          />
          {/* Route hubs */}
          <circle cx="55" cy="26" r="3.5" fill="#F59E0B" />
          <circle cx="98" cy="42" r="3.5" fill="#10B981" />
          <circle cx="62" cy="66" r="3.5" fill="#38BDF8" />
          <circle cx="114" cy="70" r="3.5" fill="#F43F5E" />

          {/* Live Moving Courier Dots on GPS Board */}
          <circle r="4" fill="#FBBF24">
            <animateMotion dur="4.5s" repeatCount="indefinite">
              <mpath href="#cairoRouteA" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#34D399">
            <animateMotion dur="5.5s" repeatCount="indefinite">
              <mpath href="#cairoRouteB" />
            </animateMotion>
          </circle>

          <text
            x="85"
            y="86"
            textAnchor="middle"
            fill="#CBD5E1"
            fontSize="9"
            fontFamily="Cairo, sans-serif"
          >
            تتبع المناديب والمركبات (اضغط للفتح)
          </text>
        </g>

        {/* Storage Shelving & Animated Conveyor Parcels on Left */}
        <g
          transform="translate(26, 120)"
          className="cursor-pointer"
          onClick={onOpenShipments}
        >
          {/* Shelf rack */}
          <rect x="0" y="0" width="150" height="84" rx="3" fill="#1E293B" stroke="#334155" strokeWidth="2" />
          <line x1="0" y1="42" x2="150" y2="42" stroke="#475569" strokeWidth="3" />

          {/* Top Shelf Parcel Boxes */}
          <rect x="10" y="8" width="34" height="29" rx="2" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
          <rect x="22" y="8" width="7" height="10" fill="#FDE68A" opacity="0.75" />

          <rect x="52" y="12" width="40" height="25" rx="2" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />
          <rect x="68" y="12" width="7" height="9" fill="#FDE68A" opacity="0.75" />

          {/* Moving Conveyor Parcel when Active Shipments > 0 */}
          {activeShipmentsCount > 0 ? (
            <g>
              <rect x="100" y="10" width="32" height="27" rx="2" fill="#F59E0B" stroke="#92400E" strokeWidth="1.5">
                <animate
                  attributeName="x"
                  values="98;108;98"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="14" y="49" width="44" height="29" rx="2" fill="#B45309" stroke="#78350F" strokeWidth="1.5" />
            </g>
          ) : (
            <rect x="14" y="49" width="44" height="29" rx="2" fill="#64748B" opacity="0.4" />
          )}
          <rect x="68" y="51" width="60" height="27" rx="2" fill="#92400E" stroke="#78350F" strokeWidth="1.5" />
        </g>

        {/* Main Reception & Operations Desk */}
        <g transform="translate(190, 138)">
          <rect x="0" y="0" width="465" height="12" rx="2" fill="#92400E" />
          <rect
            x="6"
            y="12"
            width="453"
            height="70"
            fill="url(#deskWood)"
            stroke="#451A03"
            strokeWidth="2"
          />
          {/* Front reception panel badge */}
          <rect
            x="150"
            y="24"
            width="165"
            height="32"
            rx="4"
            fill="#0F172A"
            stroke="#D97706"
            strokeWidth="1.5"
          />
          <text
            x="232"
            y="44"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="10.5"
            fontWeight="bold"
            fontFamily="Cairo, sans-serif"
          >
            مكتب المدير والتشغيل اليومي
          </text>
        </g>

        {/* Computer Monitor on Desk (Clickable for Financial Ledger) */}
        <g
          transform="translate(220, 82)"
          className="cursor-pointer"
          onClick={onOpenLedger}
        >
          <rect
            x="0"
            y="0"
            width="90"
            height="48"
            rx="4"
            fill="#0F172A"
            stroke="#64748B"
            strokeWidth="2.5"
          />
          <rect x="5" y="5" width="80" height="36" fill="#064E3B" />
          {/* Animated Ledger bars on monitor */}
          <rect x="11" y="11" width="44" height="4.5" fill="#34D399">
            <animate
              attributeName="width"
              values="36;56;36"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
          <rect x="11" y="19" width="62" height="4" fill="#10B981" opacity="0.8" />
          <rect x="11" y="27" width="48" height="4" fill="#F59E0B" opacity="0.85" />
          <rect x="37" y="48" width="16" height="6" fill="#475569" />
          <rect x="27" y="53" width="36" height="4" rx="1" fill="#334155" />
        </g>

        {/* Shipping Manifest Files & Waybills on Desk (Clickable for Shipments) */}
        <g
          transform="translate(342, 114)"
          className="cursor-pointer"
          onClick={onOpenShipments}
        >
          <rect x="0" y="6" width="56" height="18" rx="2" fill="#F8FAFC" stroke="#94A3B8" />
          <rect x="4" y="2" width="56" height="18" rx="2" fill="#FEF3C7" stroke="#D97706" />
          <line x1="12" y1="8" x2="48" y2="8" stroke="#92400E" strokeWidth="2" />
          <line x1="12" y1="14" x2="38" y2="14" stroke="#92400E" strokeWidth="1.5" />
        </g>

        {/* Landline Office Telephone */}
        <g transform="translate(425, 112)">
          <rect x="0" y="8" width="42" height="18" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <rect x="-3" y="3" width="48" height="7" rx="3.5" fill="#334155" />
          <circle cx="21" cy="17" r="4.5" fill="#F59E0B" />
        </g>
      </svg>

      {/* Compact Single-Row Office Status + Integrated Dropdown for Scene Actions */}
      <div className="px-3 py-1.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-bold text-amber-400 shrink-0">حركة المكتب:</span>
          <span className="truncate">
            {activeSpeakerName
              ? `أمام المكتب: ${activeSpeakerName}`
              : `تشغيل اليوم ${currentDay}`}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="font-mono-num text-emerald-300 shrink-0">
            قيد التوصيل: {activeShipmentsCount}
          </span>
          <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
          <span className="font-mono-num text-slate-400 hidden sm:inline shrink-0">
            تم تسليمه: {deliveredTodayCount}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSceneDetailsOpen((prev) => !prev)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-[11px] cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1"
        >
          <span>أدوات المكتب السريعة</span>
          <span>{sceneDetailsOpen ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* Collapsible Dropdown for Scene Hotspots */}
      {sceneDetailsOpen && (
        <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[11px] text-slate-300">
            تم تسليم <strong className="font-mono-num text-emerald-400">{deliveredTodayCount}</strong> شحنة اليوم · شحنات نشطة بالمسار: <strong className="font-mono-num text-amber-400">{activeShipmentsCount}</strong>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSceneDetailsOpen(false);
                onOpenShipments();
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              بوالص الشحن ({activeShipmentsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setSceneDetailsOpen(false);
                onOpenLedger();
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              شاشة الحسابات
            </button>
            <button
              type="button"
              onClick={() => {
                setSceneDetailsOpen(false);
                onOpenFleet();
              }}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              خريطة الأسطول والمناديب
            </button>
          </div>
        </div>
      )}

      {/* Active Speaker Floating Badge in Scene */}
      {activeSpeakerAvatar && activeSpeakerName && (
        <div className="absolute top-2.5 left-2.5 bg-slate-950/90 border border-slate-700/80 rounded-lg p-1.5 flex items-center gap-2 shadow-lg">
          <CharacterPortrait avatarId={activeSpeakerAvatar} size="sm" />
          <div className="text-right">
            <div className="text-[10px] text-amber-400 font-semibold">أمام المكتب الآن</div>
            <div className="text-xs font-bold text-white">{activeSpeakerName}</div>
          </div>
        </div>
      )}
    </div>
  );
};
