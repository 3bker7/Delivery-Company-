import React, { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface FullscreenElementWithWebkit extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
}

interface DocumentWithWebkit extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
}

const SMART_LANDSCAPE_STORAGE_KEY = 'ingobia_smart_landscape_mode_v3';
const SMART_LANDSCAPE_FLIP_KEY = 'ingobia_smart_landscape_flip_v1';

export type NativeLockAttemptStatus =
  | 'IDLE'
  | 'LOCKED_NATIVE'
  | 'REJECTED_BY_BROWSER';

export function usePWAAndFullscreen() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalonePWA, setIsStandalonePWA] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Default to true on mobile so the game automatically opens in landscape
  const [isSmartLandscapeMode, setIsSmartLandscapeMode] = useState<boolean>(() => {
    try {
      const saved = window.localStorage.getItem(SMART_LANDSCAPE_STORAGE_KEY);
      if (saved === '0') return false;
      if (saved === '1') return true;
      return typeof window !== 'undefined' && window.innerWidth < 920;
    } catch {
      return true;
    }
  });

  const [isLandscapeFlipped, setIsLandscapeFlipped] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SMART_LANDSCAPE_FLIP_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [isPortraitViewport, setIsPortraitViewport] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.innerHeight > window.innerWidth
      : false
  );

  const [isMobilePortraitScreen, setIsMobilePortraitScreen] = useState<boolean>(
    () =>
      typeof window !== 'undefined'
        ? window.innerWidth < 920 && window.innerHeight > window.innerWidth
        : false
  );

  const [nativeLockStatus, setNativeLockStatus] =
    useState<NativeLockAttemptStatus>('IDLE');

  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const checkDisplayState = useCallback(() => {
    const doc = document as DocumentWithWebkit;
    const fsActive = Boolean(
      doc.fullscreenElement || doc.webkitFullscreenElement
    );
    setIsFullscreen(fsActive);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const portrait = h > w;

    setIsPortraitViewport(portrait);
    setIsMobilePortraitScreen(w < 920 && portrait);

    if (!portrait) {
      setNativeLockStatus('LOCKED_NATIVE');
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalonePWA(standalone);

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const exitTrueFullscreen = useCallback(async () => {
    try {
      const doc = document as DocumentWithWebkit;
      if (doc.fullscreenElement && doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore
    }
    checkDisplayState();
  }, [checkDisplayState]);

  /**
   * Hides the browser tab bar and URL address bar by entering True Fullscreen (`navigationUI: 'hide'`)
   * and locking native screen orientation to `'landscape'`, while also enabling `isSmartLandscapeMode`
   * so the game is always in full horizontal view without browser tabs.
   */
  const requestNativeLandscapeOrientation =
    useCallback(async (): Promise<boolean> => {
      const docEl = document.documentElement as FullscreenElementWithWebkit;
      const doc = document as DocumentWithWebkit;

      // 1. Request Fullscreen with navigationUI: 'hide' so the browser tab bar & address bar disappear
      try {
        if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen({ navigationUI: 'hide' });
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          }
        }
      } catch {
        // Ignore if blocked by iframe/browser policy
      }

      // 2. Lock native screen orientation to landscape (works in Chrome/Android once fullscreen is active)
      const orientationApi =
        typeof screen !== 'undefined' && screen.orientation
          ? (screen.orientation as ScreenOrientation & {
              lock?: (orientation: string) => Promise<void>;
            })
          : null;

      if (orientationApi && typeof orientationApi.lock === 'function') {
        try {
          await orientationApi.lock('landscape');
          setNativeLockStatus('LOCKED_NATIVE');
        } catch {
          // Fallback to CSS smart landscape below
        }
      }

      // 3. Ensure smart landscape is enabled so even if the phone stays physically upright, it renders horizontally
      setIsSmartLandscapeMode(true);
      try {
        window.localStorage.setItem(SMART_LANDSCAPE_STORAGE_KEY, '1');
      } catch {
        // Ignore
      }
      setNativeLockStatus('LOCKED_NATIVE');
      checkDisplayState();
      return true;
    }, [checkDisplayState]);

  const activateCleanLandscapeMode = useCallback(async () => {
    await requestNativeLandscapeOrientation();
  }, [requestNativeLandscapeOrientation]);

  const disableCleanLandscapeMode = useCallback(async () => {
    setIsSmartLandscapeMode(false);
    try {
      window.localStorage.setItem(SMART_LANDSCAPE_STORAGE_KEY, '0');
    } catch {
      // Ignore
    }
    try {
      const orientationApi =
        typeof screen !== 'undefined' && screen.orientation
          ? (screen.orientation as ScreenOrientation & { unlock?: () => void })
          : null;
      if (orientationApi && typeof orientationApi.unlock === 'function') {
        orientationApi.unlock();
      }
    } catch {
      // Ignore
    }
    await exitTrueFullscreen();
  }, [exitTrueFullscreen]);

  const flipLandscapeDirection = useCallback(() => {
    setIsLandscapeFlipped((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SMART_LANDSCAPE_FLIP_KEY, next ? '1' : '0');
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const enterTrueFullscreen = useCallback(async (): Promise<boolean> => {
    return requestNativeLandscapeOrientation();
  }, [requestNativeLandscapeOrientation]);

  useEffect(() => {
    checkDisplayState();

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalonePWA(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const orientationObj =
      typeof screen !== 'undefined' && screen.orientation
        ? screen.orientation
        : null;

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('resize', checkDisplayState);
    window.addEventListener('orientationchange', checkDisplayState);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('fullscreenchange', checkDisplayState);
    document.addEventListener('webkitfullscreenchange', checkDisplayState);
    if (
      orientationObj &&
      typeof orientationObj.addEventListener === 'function'
    ) {
      orientationObj.addEventListener('change', checkDisplayState);
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('resize', checkDisplayState);
      window.removeEventListener('orientationchange', checkDisplayState);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', checkDisplayState);
      document.removeEventListener('webkitfullscreenchange', checkDisplayState);
      if (
        orientationObj &&
        typeof orientationObj.removeEventListener === 'function'
      ) {
        orientationObj.removeEventListener('change', checkDisplayState);
      }
    };
  }, [
    checkDisplayState,
    isSmartLandscapeMode,
    requestNativeLandscapeOrientation,
  ]);

  const triggerPWAInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalonePWA(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  // Always render native upright layout without forced 90-degree CSS transforms
  const landscapeWrapperClass = 'w-full max-w-full h-[100dvh] overflow-hidden';

  // Do not block portrait orientation: the game is now mobile-first portrait!
  const shouldShowPortraitOrientationGate = false;

  return {
    isFullscreen,
    isStandalonePWA,
    isSmartLandscapeMode,
    isPortraitViewport,
    isMobilePortraitScreen,
    shouldShowPortraitOrientationGate,
    nativeLockStatus,
    isLandscapeFlipped,
    landscapeWrapperClass,
    isImmersive: isFullscreen || isStandalonePWA || isSmartLandscapeMode,
    isInstallable: Boolean(deferredPrompt),
    isIOS,
    isInIframe,
    isOnline,
    requestNativeLandscapeOrientation,
    enterTrueFullscreen,
    exitTrueFullscreen,
    activateCleanLandscapeMode,
    disableCleanLandscapeMode,
    flipLandscapeDirection,
    triggerPWAInstall,
  };
}

interface MobileLandscapeOrientationGateProps {
  companyName?: string;
  nativeLockStatus: NativeLockAttemptStatus;
  onRequestNativeLandscape: () => void;
  onActivateBrowserLandscapeFallback: () => void;
}

export const MobileLandscapeOrientationGate: React.FC<
  MobileLandscapeOrientationGateProps
> = ({
  companyName = 'انجوبيا اكسبريس — Ingobia Express',
  onRequestNativeLandscape,
}) => {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none safe-game-shell"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
          <svg
            className="w-11 h-11 text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="6" width="16" height="12" rx="2.5" />
            <path d="M8 12h8" />
            <path d="M13 9l3 3-3 3" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold">
            {companyName}
          </span>
          <h2 className="text-lg font-black text-white">
            تعمل اللعبة بالوضع الأفقي الكامل
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            اضغط على الزر أدناه لإخفاء علامة التبويب وشريط المتصفح وفتح اللعبة بالعرض الأفقي الكامل فوراً.
          </p>
        </div>

        <button
          type="button"
          onClick={onRequestNativeLandscape}
          className="w-full py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition cursor-pointer"
        >
          الوضع الأفقي وإخفاء علامة التبويب
        </button>
      </div>
    </div>
  );
};

interface ImmersiveFullscreenBannerProps {
  isFullscreen: boolean;
  isStandalonePWA: boolean;
  isSmartLandscapeMode?: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isOnline?: boolean;
  onEnterFullscreen: () => void;
  onExitFullscreen?: () => void;
  onActivateCleanLandscape?: () => void;
  onInstallPWA: () => void;
}

/**
 * Completely silent during gameplay — no black-bar notices or orientation banners cluttering the screen.
 */
export const ImmersiveFullscreenBanner: React.FC<
  ImmersiveFullscreenBannerProps
> = () => {
  return null;
};
