/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AuthGateScreen } from './components/AuthGateScreen';
import { BusinessDeveloperPanel } from './components/BusinessDeveloperPanel';
import { CompanyNameModal } from './components/CompanyNameModal';
import { CouriersPanel } from './components/CouriersPanel';
import { DayEndReportModal } from './components/DayEndReportModal';
import {
  DeveloperSettingsPanel,
  SandboxSimulationAction,
} from './components/DeveloperSettingsPanel';
import { EmployeesHRPanel } from './components/EmployeesHRPanel';
import {
  ImmersiveFullscreenBanner,
  MobileLandscapeOrientationGate,
  usePWAAndFullscreen,
} from './components/ImmersiveFullscreenGate';
import { IntroStoryOverlay } from './components/IntroStoryOverlay';
import { LedgerReportsPanel } from './components/LedgerReportsPanel';
import { MarketingPanel } from './components/MarketingPanel';
import { NotificationsPanel } from './components/NotificationsPanel';
import {
  CharacterPortrait,
  OfficeVisualScene,
} from './components/OfficeVisualScene';
import {
  Headquarters3DScene,
  InteractiveBuildingId,
} from './components/Headquarters3DScene';
import { ShipmentDetailDrawer } from './components/ShipmentDetailDrawer';
import { ShipmentsPanel } from './components/ShipmentsPanel';
import {
  PhoneAppId,
  SocialMediaPhoneModal,
} from './components/SocialMediaPhoneModal';
import { WarehousePanel } from './components/WarehousePanel';
import { ManagerAndSecretaryBubbles } from './components/ManagerAndSecretaryBubbles';
import { DebtsPanel } from './components/DebtsPanel';
import { MaintenancePanel } from './components/MaintenancePanel';
import { CompanyProfilePanel } from './components/CompanyProfilePanel';
import { TimedShipmentToasts } from './components/TimedShipmentToasts';
import {
  PlatformContractId,
  SmartDispatchPolicy,
  VehicleCatalogId,
} from './config/businessDeveloperConfig';
import {
  assignVehicleToCourier,
  dispatchPlatformOrderIndependent,
  dispatchPlatformOrdersBatched,
  generatePlatformOrdersForContract,
  injectPartnerCapitalExpansion,
  launchContractMarketingCampaign,
  purchaseOperationsUpgrade,
  purchaseOrLeaseFleetVehicle,
  runSmartAutoDispatch,
  sellOwnedVehicle,
  signPlatformContract,
  terminateLeasedVehicle,
  unassignVehicleFromCourier,
} from './engine/businessDeveloperEngine';
import {
  evaluateDecisionConditions,
  executeDecisionOption,
} from './engine/decisionEngine';
import {
  calculateFinancialMetrics,
  formatClockTime,
  formatEGP,
} from './engine/financeEngine';
import {
  evaluateOnboardingMasteryProgress,
  PAGE_SECRETARY_EXPLANATIONS,
  recordPageVisitAndGetSecretaryExplanation,
} from './engine/guideAndSecretaryEngine';
import {
  applyApprovedEmployeePenalty,
  conductEmployeeInvestigation,
  grantEmployeePerformanceBonus,
  hireHRCandidate,
  postHRJobAd,
  reassignEmployeeTasks,
  reviewLowPerformingEmployee,
  scheduleEmployeeSalaryRaise,
  startEmployeeTraining,
  terminateEmployeeAfterReview,
} from './engine/hrEngine';
import {
  computeRealTimeOfflineCatchUpMinutes,
  recordSyncMilestone,
} from './engine/levelAndTimeEngine';
import {
  launchMarketingCampaign,
  toggleMarketingCampaignDailyRepeat,
} from './engine/marketingEngine';
import { markAllNotificationsRead } from './engine/notificationEngine';
import {
  clearSavedGameStorage,
  loadGameFromStorage,
  saveGameToStorage,
} from './engine/saveSystem';
import {
  acceptShipmentRequest,
  completeShipmentDelivery,
  executeAdminShipmentAction,
  expandOrRentWarehouseCapacity,
  OPERATIONAL_LOCATION_LABELS_AR,
  refuelFleetVehicles,
  rejectShipmentRequest,
  repairFleetVehicle,
  repairWarehouseSortingMachines,
  returnFailedShipmentToMerchant,
  SHIPMENT_STATUS_LABELS_AR,
} from './engine/shipmentEngine';
import { advanceSimulationClock } from './engine/simulationEngine';
import {
  resolveSocialMediaComplaint,
  syncCompanyNameInSocialPosts,
} from './engine/socialMediaEngine';
import {
  playAchievementCelebrationSound,
  playSoundEffect,
} from './engine/soundEffects';
import {
  advanceToNextDay,
  canEndCurrentDay,
  createInitialGameState,
  finishCurrentDay,
  payCompanyDebtObligation,
  resetToDayOneKeepCompany,
  rollbackToPreviousDaysCheckpoint,
  updateCompanyProfileState,
} from './engine/storyEngine';
import {
  createInitialTutorialState,
  syncTutorialProgress,
} from './engine/tutorialEngine';
import {
  auth,
  createLocalManagerUser,
  DEFAULT_RELEASE_CONTROL,
  isVerifiedAdminUser,
  loadGlobalReleaseControl,
  loadOrCreatePlayerCloudProfile,
  loadSavedLocalManagerUser,
  PlayerCloudRecord,
  publishOrUpdateReleaseControl,
  ReleaseControlState,
  savePlayerGameProgressToCloud,
  signInWithGoogleAccount,
  signOutCurrentAccount,
  testFirestoreServerConnection,
  updateCompanyNameOnceInCloud,
  verifyOnlineAndSyncForNewDay,
} from './services/firebaseService';
import {
  AdminDelayActionType,
  EmployeeRole,
  GameState,
  SocialComplaintActionType,
} from './types/game';

type WorkspaceSection =
  | 'MAIN_CONTROL'
  | 'BUSINESS_DEVELOPER'
  | 'SHIPMENTS'
  | 'WAREHOUSE'
  | 'MARKETING'
  | 'COURIERS'
  | 'EMPLOYEES'
  | 'DEBTS'
  | 'MAINTENANCE'
  | 'COMPANY_PROFILE'
  | 'LEDGER'
  | 'NOTIFICATIONS'
  | 'DEVELOPER_SETTINGS';

type BootStage =
  | 'CHECKING_AUTH'
  | 'UNAUTHENTICATED'
  | 'LOADING_PROFILE'
  | 'READY'
  | 'ERROR';

export default function App() {
  const [bootStage, setBootStage] = useState<BootStage>('CHECKING_AUTH');
  const [bootError, setBootError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudRecord, setCloudRecord] = useState<PlayerCloudRecord | null>(null);
  const [releaseControl, setReleaseControl] = useState<ReleaseControlState>(
    DEFAULT_RELEASE_CONTROL
  );

  const [isStagingMode, setIsStagingMode] = useState<boolean>(false);

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState()
  );

  const [activeSection, setActiveSection] =
    useState<WorkspaceSection>('MAIN_CONTROL');
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(
    null
  );
  const [drawerTrackingNumber, setDrawerTrackingNumber] = useState<
    string | null
  >(null);
  const [socialPhoneOpen, setSocialPhoneOpen] = useState<boolean>(false);
  const [phoneInitialAppId, setPhoneInitialAppId] =
    useState<PhoneAppId>('HERFOK');
  const [tutorialModalOpen, setTutorialModalOpen] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    text: string;
    tone: 'success' | 'error' | 'info';
  } | null>(null);
  const [confirmNewGameOpen, setConfirmNewGameOpen] = useState(false);
  const [companyNameModalOpen, setCompanyNameModalOpen] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    'SYNCED' | 'SAVING' | 'ERROR'
  >('SYNCED');

  const [checkpointModalOpen, setCheckpointModalOpen] = useState(false);
  const [hudDetailsOpen, setHudDetailsOpen] = useState(false);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(false);
  const [pipelineDropdownOpen, setPipelineDropdownOpen] = useState(true);

  const {
    isFullscreen,
    isSmartLandscapeMode,
    isPortraitViewport,
    shouldShowPortraitOrientationGate,
    nativeLockStatus,
    landscapeWrapperClass,
    isStandalonePWA,
    isInstallable,
    isIOS,
    isOnline,
    requestNativeLandscapeOrientation,
    enterTrueFullscreen,
    exitTrueFullscreen,
    activateCleanLandscapeMode,
    disableCleanLandscapeMode,
    flipLandscapeDirection,
    triggerPWAInstall,
  } = usePWAAndFullscreen();

  const saveTimeoutRef = useRef<number | null>(null);
  const isInitialCloudLoadRef = useRef<boolean>(false);
  const cloudRecordRef = useRef<PlayerCloudRecord | null>(null);
  const lastCloudSavedDigestRef = useRef<string>('');
  const lastCloudSavedMinuteRef = useRef<number>(0);

  const isPublicUrlPreviewMode =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('mode') === 'public';

  const isAdmin = isVerifiedAdminUser(currentUser) && !isPublicUrlPreviewMode;

  const handleRequestFullscreenLandscape = useCallback(async () => {
    if (isFullscreen) {
      await exitTrueFullscreen();
    } else {
      await enterTrueFullscreen();
    }
  }, [isFullscreen, enterTrueFullscreen, exitTrueFullscreen]);

  // Load authenticated player's isolated cloud profile + release control state
  const hydrateAuthenticatedSession = useCallback(async (user: User) => {
    setBootStage('LOADING_PROFILE');
    setBootError(null);

    const onlineOk = await testFirestoreServerConnection(user);
    if (!onlineOk) {
      setBootStage('ERROR');
      setBootError(
        'تعذر الاتصال بخادم قاعدة البيانات السحابية. يرجى التحقق من اتصال الإنترنت ثم الضغط على «إعادة المحاولة الآن».'
      );
      return;
    }

    try {
      const localFallback = loadGameFromStorage(false);
      const [profile, relState] = await Promise.all([
        loadOrCreatePlayerCloudProfile(
          user,
          localFallback.success ? localFallback.state : null
        ),
        loadGlobalReleaseControl(),
      ]);

      isInitialCloudLoadRef.current = true;
      let syncedLiveState = syncCompanyNameInSocialPosts(
        profile.gameState,
        profile.companyName || profile.gameState.company.name
      );

      // Section 5: Real-Time Clock Catch-Up (1 game hour = 4 real-world hours)
      const lastRealMs =
        syncedLiveState.realTimeBridge?.lastRealTimestampMs ||
        Date.parse(syncedLiveState.lastSavedTimestamp || '') ||
        Date.now();
      const catchUp = computeRealTimeOfflineCatchUpMinutes(
        lastRealMs,
        Date.now()
      );
      if (
        catchUp.gameMinutesToAdvance >= 5 &&
        syncedLiveState.phase === 'OFFICE_PLAY'
      ) {
        syncedLiveState = advanceSimulationClock(
          syncedLiveState,
          catchUp.gameMinutesToAdvance,
          true
        );
      }
      syncedLiveState = {
        ...syncedLiveState,
        realTimeBridge: {
          mode:
            syncedLiveState.realTimeBridge?.mode || 'REALISTIC_1H_TO_4H',
          lastRealTimestampMs: Date.now(),
          totalOfflineGameMinutesApplied:
            (syncedLiveState.realTimeBridge?.totalOfflineGameMinutesApplied || 0) +
            catchUp.gameMinutesToAdvance,
        },
      };

      // Save Live state safely in the Public Live local storage slot
      saveGameToStorage(syncedLiveState, false);

      // Enforce strict separation: Verified Developer on Dev URL boots into isolated Staging Environment by default
      const bootInDeveloperStaging =
        isVerifiedAdminUser(user) &&
        !(
          typeof window !== 'undefined' &&
          new URLSearchParams(window.location.search).get('mode') === 'public'
        );

      const localStagingFallback = loadGameFromStorage(true);
      let initialStagingState: GameState | undefined =
        profile.stagingGameState ||
        (localStagingFallback.success ? localStagingFallback.state : undefined);

      if (bootInDeveloperStaging && !initialStagingState) {
        initialStagingState = JSON.parse(
          JSON.stringify(syncedLiveState)
        ) as GameState;
        initialStagingState.company.adminLevel = 3;
        initialStagingState.phase = 'OFFICE_PLAY';
      }

      if (initialStagingState) {
        initialStagingState.company.name =
          profile.companyName || syncedLiveState.company.name;
        initialStagingState.company.adminLevel = 3;
        saveGameToStorage(initialStagingState, true);
      }

      const nextRecord: PlayerCloudRecord = {
        ...profile,
        gameState: syncedLiveState,
        stagingGameState: initialStagingState,
      };

      cloudRecordRef.current = nextRecord;
      setCloudRecord(nextRecord);
      setReleaseControl(relState);

      if (bootInDeveloperStaging && initialStagingState) {
        setIsStagingMode(true);
        setGameState(initialStagingState);
      } else {
        setIsStagingMode(false);
        setGameState(syncedLiveState);
      }

      setCloudSyncStatus('SYNCED');
      setBootStage('READY');
    } catch (err) {
      setBootStage('ERROR');
      setBootError(
        err instanceof Error
          ? `فشل تحميل ملف الشركة السحابي: ${err.message}`
          : 'حدث خطأ غير متوقع أثناء استرجاع بيانات الحساب من الخادم.'
      );
    }
  }, []);

  // Listen to Firebase Auth session automatically on startup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const activeUser = user || loadSavedLocalManagerUser();
      setCurrentUser(activeUser);
      if (activeUser) {
        void hydrateAuthenticatedSession(activeUser);
      } else {
        cloudRecordRef.current = null;
        setCloudRecord(null);
        setBootStage('UNAUTHENTICATED');
      }
    });
    return () => unsubscribe();
  }, [hydrateAuthenticatedSession]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setBootError(null);
    try {
      const signedInUser = await signInWithGoogleAccount();
      setCurrentUser(signedInUser);
      await hydrateAuthenticatedSession(signedInUser);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'تعذر إتمام تسجيل الدخول عبر Google.';
      setBootError(
        msg.includes('popup-closed-by-user')
          ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام المصادقة. اضغط للمحاولة مرة أخرى أو استخدم الدخول المباشر.'
          : msg
      );
      if (bootStage !== 'ERROR') {
        setBootStage('UNAUTHENTICATED');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDirectLocalSignIn = async () => {
    setIsSigningIn(true);
    setBootError(null);
    try {
      const localUser = createLocalManagerUser();
      setCurrentUser(localUser);
      await hydrateAuthenticatedSession(localUser);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
      await signOutCurrentAccount();
      setCurrentUser(null);
      cloudRecordRef.current = null;
      setCloudRecord(null);
      setBootStage('UNAUTHENTICATED');
      setActiveSection('MAIN_CONTROL');
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تسجيل الخروج.',
        tone: 'error',
      });
    }
  };

  // Central Game Clock Timer Loop (ticks every 1 game minute smoothly in 12h AM/PM format, supports up to 12x super speed)
  useEffect(() => {
    if (bootStage !== 'READY' || gameState.clock.isPaused) {
      return;
    }
    const spd = gameState.clock.speedMultiplier || 1;
    const intervalMs =
      spd === 12
        ? 110
        : spd === 8
          ? 160
          : spd === 4
            ? 240
            : spd === 2
              ? 480
              : 1000;
    const stepMinutes = spd === 12 ? 3 : spd === 8 ? 2 : 1;

    const timer = window.setInterval(() => {
      setGameState((prev) => {
        if (prev.clock.isPaused) return prev;
        // If phase is OFFICE_PLAY, run full simulation tick; otherwise still advance the visible clock
        if (prev.phase === 'OFFICE_PLAY') {
          return syncTutorialProgress(
            advanceSimulationClock(prev, stepMinutes, false),
            activeSection,
            socialPhoneOpen
          );
        }
        return {
          ...prev,
          clock: {
            ...prev.clock,
            minutesFromMidnight:
              (prev.clock.minutesFromMidnight + stepMinutes) % 1440,
            totalElapsedMinutes: prev.clock.totalElapsedMinutes + stepMinutes,
          },
        };
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    bootStage,
    gameState.phase,
    gameState.clock.isPaused,
    gameState.clock.speedMultiplier,
    activeSection,
    socialPhoneOpen,
  ]);

  // Sync Tutorial Progress + First/Second Visit Secretary Page Explanations when active section or social phone changes
  useEffect(() => {
    if (bootStage !== 'READY') return;
    setGameState((prev) => {
      let next = syncTutorialProgress(prev, activeSection, socialPhoneOpen);
      const mappedPageId = socialPhoneOpen
        ? 'PHONE'
        : activeSection === 'MAIN_CONTROL'
          ? 'DASHBOARD'
          : activeSection === 'EMPLOYEES'
            ? 'HR'
            : activeSection;
      next = recordPageVisitAndGetSecretaryExplanation(
        next,
        mappedPageId,
        false
      );
      next = evaluateOnboardingMasteryProgress(next);
      return next;
    });
  }, [bootStage, activeSection, socialPhoneOpen]);

  // Automatic Cloud + Local Persistence without infinite cloudRecord re-trigger loops
  useEffect(() => {
    if (bootStage !== 'READY' || !currentUser || !cloudRecordRef.current) {
      return;
    }

    // Save to the appropriate isolated local storage key (Staging vs Live)
    saveGameToStorage(gameState, isStagingMode);

    if (isInitialCloudLoadRef.current) {
      isInitialCloudLoadRef.current = false;
      return;
    }

    // Build a structural digest of meaningful gameplay changes so regular 1-second clock ticks don't thrash cloud saves
    const meaningfulDigest = [
      isStagingMode ? 'STG' : 'LIVE',
      gameState.phase,
      gameState.company.currentDay,
      gameState.company.cashPiastres,
      gameState.company.reputation,
      gameState.company.level,
      gameState.ledger.length,
      gameState.employees.length,
      gameState.shipments.map((s) => `${s.trackingNumber}:${s.status}:${s.serviceFeePiastres}`).join(','),
      gameState.situations.filter((s) => s.resolved).length,
      (gameState.guideAndSecretary?.guideTasks || []).map((t) => `${t.id}:${t.status}`).join(','),
      (gameState.guideAndSecretary?.bubbleMessages || []).filter((m) => m.read || m.dismissed).length,
      (gameState.myEmployeesApp?.voiceRecords || []).filter((v) => v.status === 'RESOLVED').length,
      (gameState.businessDeveloper?.platformOrders || []).map((o) => `${o.id}:${o.status}`).join(','),
    ].join('|');

    const minutesSinceLastCloudSave = Math.abs(
      gameState.clock.totalElapsedMinutes - lastCloudSavedMinuteRef.current
    );

    if (
      meaningfulDigest === lastCloudSavedDigestRef.current &&
      minutesSinceLastCloudSave < 15
    ) {
      return;
    }

    lastCloudSavedDigestRef.current = meaningfulDigest;
    lastCloudSavedMinuteRef.current = gameState.clock.totalElapsedMinutes;

    setCloudSyncStatus('SAVING');
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      const activeRecord = cloudRecordRef.current;
      if (!activeRecord) return;
      try {
        const updatedRecord = await savePlayerGameProgressToCloud(
          currentUser,
          gameState,
          {
            isStagingMode,
            existingStagingState: activeRecord.stagingGameState,
            baseRecord: activeRecord,
          }
        );
        cloudRecordRef.current = updatedRecord;
        setCloudRecord(updatedRecord);
        setCloudSyncStatus('SYNCED');
      } catch {
        setCloudSyncStatus('ERROR');
      }
    }, 650);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [gameState, bootStage, currentUser, isStagingMode]);

  const handleToggleAdminStagingMode = (enableStaging: boolean) => {
    if (!isAdmin || !cloudRecordRef.current) return;
    if (enableStaging === isStagingMode) return;

    const currentRecord = cloudRecordRef.current;

    if (enableStaging) {
      // Preserve current Live state before switching to Staging
      const updatedWithLive: PlayerCloudRecord = {
        ...currentRecord,
        gameState: JSON.parse(JSON.stringify(gameState)),
      };
      const localStaging = loadGameFromStorage(true);
      const sandboxState: GameState = updatedWithLive.stagingGameState
        ? JSON.parse(JSON.stringify(updatedWithLive.stagingGameState))
        : localStaging.success && localStaging.state
          ? JSON.parse(JSON.stringify(localStaging.state))
          : JSON.parse(JSON.stringify(gameState));

      sandboxState.company.name = updatedWithLive.companyName;
      sandboxState.company.adminLevel = 3;
      updatedWithLive.stagingGameState = sandboxState;

      cloudRecordRef.current = updatedWithLive;
      setCloudRecord(updatedWithLive);
      isInitialCloudLoadRef.current = true;
      setIsStagingMode(true);
      setGameState(sandboxState);
      saveGameToStorage(sandboxState, true);
      setBannerMessage({
        text: '🟠 تم التبديل إلى بيئة المطور المعزولة (Staging). جميع التجارب والتحديثات هنا معزولة تماماً عن النسخة العامة (Live).',
        tone: 'info',
      });
    } else {
      // Preserve current Staging state before switching to Live
      const updatedWithStaging: PlayerCloudRecord = {
        ...currentRecord,
        stagingGameState: JSON.parse(JSON.stringify(gameState)),
      };
      const liveState: GameState = JSON.parse(
        JSON.stringify(updatedWithStaging.gameState)
      );
      liveState.company.name = updatedWithStaging.companyName;

      cloudRecordRef.current = updatedWithStaging;
      setCloudRecord(updatedWithStaging);
      isInitialCloudLoadRef.current = true;
      setIsStagingMode(false);
      setGameState(liveState);
      saveGameToStorage(liveState, false);
      setBannerMessage({
        text: '🟢 عدت الآن إلى النسخة العامة المعتمدة (Live) وملف شركتك الأساسي.',
        tone: 'success',
      });
    }
  };

  const handleResetStagingSandbox = () => {
    if (!isAdmin || !cloudRecordRef.current) return;
    const fresh = createInitialGameState();
    fresh.company.name = cloudRecordRef.current.companyName;
    fresh.company.adminLevel = 3;
    fresh.phase = 'OFFICE_PLAY';
    const nextRecord: PlayerCloudRecord = {
      ...cloudRecordRef.current,
      stagingGameState: fresh,
    };
    cloudRecordRef.current = nextRecord;
    setCloudRecord(nextRecord);
    setIsStagingMode(true);
    setGameState(fresh);
    saveGameToStorage(fresh, true);
    setBannerMessage({
      text: 'تمت إعادة ضبط بيئة المطور (Staging Sandbox) إلى اليوم الأول مع الحفاظ على النسخة العامة (Live) دون أي تغيير.',
      tone: 'info',
    });
  };

  const handleRunSandboxAction = (action: SandboxSimulationAction) => {
    if (!isAdmin || !cloudRecord) return;

    // Automatically ensure we are operating in isolated Staging Sandbox mode
    let baseState: GameState = isStagingMode
      ? JSON.parse(JSON.stringify(gameState))
      : cloudRecord.stagingGameState
        ? JSON.parse(JSON.stringify(cloudRecord.stagingGameState))
        : JSON.parse(JSON.stringify(gameState));

    baseState.company.name = cloudRecord.companyName;
    baseState.phase = 'OFFICE_PLAY';

    if (!isStagingMode) {
      setIsStagingMode(true);
    }

    try {
      let next = baseState;
      let noticeText = '';

      if (action === 'ADD_CASH_5K') {
        next = injectPartnerCapitalExpansion(next, 5000);
        noticeText =
          'تم ضخ +5,000.00 ج.م في الساند بوكس بقيد محاسبي متوازن بنجاح.';
      } else if (action === 'ADD_CASH_25K') {
        next = injectPartnerCapitalExpansion(next, 25000);
        noticeText =
          'تم ضخ +25,000.00 ج.م في الساند بوكس لتجربة عقود وكلني وزورو وشراء المركبات.';
      } else if (action === 'JUMP_TO_DAY_2') {
        if (next.company.currentDay < 2) {
          next = advanceToNextDay({ ...next, company: { ...next.company, currentDay: 1 } });
        } else {
          next = {
            ...next,
            company: { ...next.company, currentDay: 2 },
            clock: { ...next.clock, day: 2, minutesFromMidnight: 540, isPaused: false },
          };
        }
        next.phase = 'OFFICE_PLAY';
        noticeText =
          'تم نقل الساند بوكس إلى اليوم 2 (09:00 AM) لتجربة أنظمة المحاسبة والتسويق والموارد البشرية.';
      } else if (action === 'JUMP_TO_DAY_3') {
        while (next.company.currentDay < 3) {
          next = advanceToNextDay(next);
        }
        next.phase = 'OFFICE_PLAY';
        next.clock = { ...next.clock, day: 3, minutesFromMidnight: 540, isPaused: false };
        noticeText =
          'تم نقل الساند بوكس إلى اليوم 3 (09:00 AM) وفتح قسم تطوير الأعمال (وكلني & زورو).';
      } else if (action === 'JUMP_TO_DAY_8') {
        while (next.company.currentDay < 8) {
          next = advanceToNextDay(next);
        }
        next.phase = 'OFFICE_PLAY';
        next.clock = { ...next.clock, day: 8, minutesFromMidnight: 540, isPaused: false };
        noticeText =
          'تم نقل الساند بوكس إلى اليوم 8 (09:00 AM) لاختبار دورة صرف الرواتب وإيجارات المركبات كل 8 أيام.';
      } else if (action === 'ADVANCE_TIME_2H') {
        next = advanceSimulationClock(next, 120, true);
        noticeText = `تم تقديم ساعة الساند بوكس ساعتين (الساعة الآن ${formatClockTime(next.clock.minutesFromMidnight)}).`;
      } else if (action === 'AUTO_COMPLETE_TODAY') {
        const daySits = next.situations.filter(
          (s) => s.day === next.company.currentDay && !s.resolved
        );
        for (const sit of daySits) {
          const allowedOpt =
            sit.options.find(
              (o) => evaluateDecisionConditions(next, sit, o).allowed
            ) || sit.options[0];
          if (allowedOpt) {
            try {
              next = executeDecisionOption(next, sit.id, allowedOpt.id);
            } catch {
              // Mark resolved if insufficient funds
              next = {
                ...next,
                situations: next.situations.map((s) =>
                  s.id === sit.id
                    ? { ...s, resolved: true, outcomeSummary: 'تم الحسم آلياً في الساند بوكس' }
                    : s
                ),
              };
            }
          }
        }
        for (const sh of [...next.shipments]) {
          if (
            sh.status !== 'DELIVERED' &&
            sh.status !== 'REJECTED' &&
            sh.status !== 'RETURNED' &&
            sh.status !== 'CANCELLED_EXPIRED'
          ) {
            try {
              next = completeShipmentDelivery(next, sh.trackingNumber);
            } catch {
              // Ignore
            }
          }
        }
        noticeText =
          'تم إتمام جميع القرارات الإدارية وتسليم شحنات اليوم الحالي في الساند بوكس — يمكنك الآن الضغط على «إنهاء اليوم».';
      } else if (action === 'SPAWN_PLATFORM_ORDERS') {
        if (next.company.currentDay < 3) {
          while (next.company.currentDay < 3) {
            next = advanceToNextDay(next);
          }
          next.phase = 'OFFICE_PLAY';
        }
        if (next.company.cashPiastres < 2500000) {
          next = injectPartnerCapitalExpansion(next, 25000);
        }
        if (!next.businessDeveloper?.contracts.WAKKELNY.signed) {
          next = signPlatformContract(next, 'WAKKELNY');
        }
        if (!next.businessDeveloper?.contracts.ZORO.signed) {
          next = signPlatformContract(next, 'ZORO');
        }
        next = generatePlatformOrdersForContract(
          next,
          'WAKKELNY',
          next.company.currentDay
        );
        next = generatePlatformOrdersForContract(
          next,
          'ZORO',
          next.company.currentDay
        );
        noticeText =
          'تم تفعيل عقدي «وكلني» و«زورو» وتوليد أوردرات مباشرة في الساند بوكس!';
      } else if (action === 'MAX_FLEET_AND_REPUTATION') {
        next = {
          ...next,
          company: {
            ...next.company,
            reputation: 96,
            customerSatisfaction: 96,
          },
          fleetAndEquipment: {
            ...(next.fleetAndEquipment || {
              fuelLevelPercent: 100,
              sortingMachineHealth: 100,
              adminSystemHealth: 100,
              lastRefueledDay: next.company.currentDay,
              lastMachineMaintainedDay: next.company.currentDay,
              activeBreakdowns: [],
            }),
            fuelLevelPercent: 100,
            sortingMachineHealth: 100,
            adminSystemHealth: 100,
            activeBreakdowns: [],
          },
          vehicles: next.vehicles.map((v) => ({
            ...v,
            maintenanceHealth: 100,
            status: v.status === 'NEEDS_MAINTENANCE' ? 'AVAILABLE' : v.status,
          })),
        };
        noticeText =
          'تم رفع السمعة والرضا إلى 96% وتموين وصيانة الأسطول والماكينات إلى 100% في الساند بوكس.';
      } else if (action === 'CLONE_LIVE_TO_SANDBOX') {
        next = JSON.parse(JSON.stringify(cloudRecord.gameState));
        next.company.name = cloudRecord.companyName;
        next.phase = 'OFFICE_PLAY';
        noticeText =
          'تم نسخ تقدمك الفعلي الحالي من النسخة العامة (Live) إلى الساند بوكس لتجربة القرارات عليه بأمان.';
      } else if (action === 'RESET_SANDBOX_DAY_1') {
        next = createInitialGameState();
        next.company.name = cloudRecord.companyName;
        next.phase = 'OFFICE_PLAY';
        noticeText =
          'تم تصفير الساند بوكس إلى اليوم الأول (09:00 AM) لمحاكاة تجربة اللاعب الجديد عند فتح الرابط العام.';
      }

      setGameState(next);
      playSoundEffect('success', next.soundEnabled);
      setBannerMessage({
        text: `[ساند بوكس المطور] ${noticeText}`,
        tone: 'success',
      });
    } catch (err) {
      setBannerMessage({
        text:
          err instanceof Error
            ? err.message
            : 'تعذر تنفيذ إجراء المحاكاة في الساند بوكس.',
        tone: 'error',
      });
    }
  };

  const handleConfirmCompanyRenameOnce = async (newName: string) => {
    if (!currentUser || !cloudRecord) return;
    const result = await updateCompanyNameOnceInCloud(
      currentUser,
      cloudRecord,
      newName
    );
    isInitialCloudLoadRef.current = true;
    const syncedRenamedState = syncCompanyNameInSocialPosts(
      result.updatedState,
      result.companyName
    );
    setCloudRecord((prev) =>
      prev
        ? {
            ...prev,
            companyName: result.companyName,
            companyNameChangeUsed: true,
            gameState: syncedRenamedState,
          }
        : null
    );
    setGameState((prev) =>
      syncCompanyNameInSocialPosts(
        {
          ...prev,
          company: {
            ...prev.company,
            name: result.companyName,
          },
        },
        result.companyName
      )
    );
    playSoundEffect('success', gameState.soundEnabled);
    setBannerMessage({
      text: `تم اعتماد الاسم الجديد «${result.companyName}» وتثبيته نهائياً في السجل التجاري لحسابك.`,
      tone: 'success',
    });
  };

  if (bootStage !== 'READY') {
    return (
      <div
        dir="rtl"
        className={`${landscapeWrapperClass} overflow-hidden bg-slate-950 text-slate-100 safe-game-shell`}
      >
        {shouldShowPortraitOrientationGate && (
          <MobileLandscapeOrientationGate
            companyName={gameState.company.name}
            nativeLockStatus={nativeLockStatus}
            onRequestNativeLandscape={requestNativeLandscapeOrientation}
            onActivateBrowserLandscapeFallback={activateCleanLandscapeMode}
          />
        )}
        <AuthGateScreen
          status={bootStage}
          errorMessage={bootError}
          onGoogleSignIn={handleGoogleSignIn}
          onDirectLocalSignIn={handleDirectLocalSignIn}
          onRetryConnection={() => {
            if (currentUser) {
              void hydrateAuthenticatedSession(currentUser);
            } else {
              setBootStage('UNAUTHENTICATED');
            }
          }}
          onRequestFullscreenLandscape={handleRequestFullscreenLandscape}
          isInstallable={isInstallable}
          onInstallPWA={triggerPWAInstall}
          isSigningIn={isSigningIn}
          publicVersionLabel={releaseControl.publicVersion}
        />
      </div>
    );
  }

  const currentDay = gameState.company.currentDay;
  const clockLabel = formatClockTime(gameState.clock.minutesFromMidnight);

  const todaySituations = gameState.situations
    .filter((s) => s.day === currentDay)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const activeSituation =
    todaySituations.find((s) => s.id === selectedSituationId) ||
    todaySituations.find((s) => !s.resolved) ||
    todaySituations[0] ||
    null;

  const activeShipments = gameState.shipments.filter(
    (s) =>
      s.status !== 'DELIVERED' &&
      s.status !== 'REJECTED' &&
      s.status !== 'RETURNED' &&
      s.status !== 'CANCELLED_EXPIRED' &&
      s.status !== 'NEW_REQUEST'
  );

  const urgentShipment = gameState.shipments.find(
    (s) => s.requiresManagerIntervention || s.isDelayed
  );

  const deliveredTodayCount = gameState.shipments.filter(
    (s) => s.completedAtDay === currentDay && s.status === 'DELIVERED'
  ).length;

  const unreadNotificationsCount = gameState.notifications.filter(
    (n) => !n.read
  ).length;

  const unresolvedSocialComplaintsCount = (gameState.socialPosts || []).filter(
    (p) => p.sentiment === 'COMPLAINT' && !p.complaintResolved
  ).length;

  const currentDayTutorialSteps = (gameState.tutorial?.steps || []).filter(
    (st) => st.day === currentDay
  );
  const nextPendingTutorialStep = currentDayTutorialSteps.find(
    (st) => !st.completed
  );

  const metrics = calculateFinancialMetrics(gameState);
  const endDayStatus = canEndCurrentDay(gameState);
  const activeEmployeesCount = (gameState.employees || []).filter(
    (e) => e.status !== 'TERMINATED'
  ).length;

  const sectionLabelsAr: Record<WorkspaceSection, string> = {
    MAIN_CONTROL: 'غرفة العمليات',
    BUSINESS_DEVELOPER: 'تطوير الأعمال والعقود',
    SHIPMENTS: 'الشحنات',
    WAREHOUSE: 'المستودع',
    MARKETING: 'التسويق',
    COURIERS: 'المناديب والأسطول',
    EMPLOYEES: 'الموارد البشرية',
    DEBTS: 'الديون والالتزامات',
    MAINTENANCE: 'الصيانة الشاملة',
    COMPANY_PROFILE: 'ملف الشركة والثقة',
    LEDGER: 'الحسابات',
    NOTIFICATIONS: 'الإشعارات',
    DEVELOPER_SETTINGS: 'إعدادات المطور',
  };
  const onboardingMasteryPercent =
    gameState.onboardingMastery?.masteryPercentage ?? 10;
  const onboardingGraduated = Boolean(
    gameState.onboardingMastery?.mandatoryPhaseCompleted
  );
  const unpaidDebtsCount = (gameState.debts || []).filter(
    (d) => d.status !== 'PAID'
  ).length;
  const latestDayReport =
    gameState.dayReports.find((r) => r.day === currentDay) ||
    gameState.dayReports[gameState.dayReports.length - 1];

  const drawerShipment = drawerTrackingNumber
    ? gameState.shipments.find(
        (s) => s.trackingNumber === drawerTrackingNumber
      ) || null
    : null;

  const handleDecisionClick = (situationId: string, optionId: string) => {
    try {
      const next = executeDecisionOption(gameState, situationId, optionId);
      setGameState(syncTutorialProgress(next, activeSection, socialPhoneOpen));
      playSoundEffect('success', gameState.soundEnabled);
      const resolvedSit = next.situations.find((s) => s.id === situationId);
      if (resolvedSit?.outcomeSummary) {
        setBannerMessage({
          text: resolvedSit.outcomeSummary,
          tone: 'success',
        });
      }
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تنفيذ القرار.',
        tone: 'error',
      });
    }
  };

  const handleAcceptShipmentDirect = (trackingNumber: string) => {
    try {
      const next = acceptShipmentRequest(gameState, trackingNumber);
      setGameState(next);
      playSoundEffect('success', gameState.soundEnabled);
      setBannerMessage({
        text: `تم قبول الشحنة ${trackingNumber} وإحالتها إلى المستودع للاستلام والفرز.`,
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر قبول الشحنة.',
        tone: 'error',
      });
    }
  };

  const handleRejectShipmentDirect = (trackingNumber: string) => {
    try {
      const next = rejectShipmentRequest(
        gameState,
        trackingNumber,
        'اعتذار إداري عن قبول الطلب وفق أولويات السعة والسيولة'
      );
      setGameState(next);
      playSoundEffect('click', gameState.soundEnabled);
      setBannerMessage({
        text: `تم الاعتذار عن الشحنة ${trackingNumber} وإغلاق الطلب.`,
        tone: 'info',
      });
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر رفض الشحنة.',
        tone: 'error',
      });
    }
  };

  const handleExecuteAdminShipmentAction = (
    trackingNumber: string,
    actionType: AdminDelayActionType
  ) => {
    try {
      const next = executeAdminShipmentAction(
        gameState,
        trackingNumber,
        actionType
      );
      setGameState(next);
      playSoundEffect('success', gameState.soundEnabled);
      setBannerMessage({
        text: `تم تنفيذ الإجراء الإداري على الشحنة ${trackingNumber} بنجاح.`,
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء الإداري.',
        tone: 'error',
      });
    }
  };

  const handleReturnShipment = (trackingNumber: string) => {
    try {
      const next = returnFailedShipmentToMerchant(gameState, trackingNumber);
      setGameState(next);
      playSoundEffect('click', gameState.soundEnabled);
      setBannerMessage({
        text: `تم إرجاع الشحنة ${trackingNumber} للتاجر وإغلاق البوليصة كمرتجع.`,
        tone: 'info',
      });
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر إرجاع الشحنة.',
        tone: 'error',
      });
    }
  };

  const handleLaunchMarketingCampaign = (
    tierId: string,
    customBudgetEgp: number,
    enableDailyAutoRepeat?: boolean
  ) => {
    try {
      const next = launchMarketingCampaign(
        gameState,
        tierId,
        customBudgetEgp,
        Boolean(enableDailyAutoRepeat)
      );
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      if (customBudgetEgp >= 6000) {
        playAchievementCelebrationSound(gameState.soundEnabled);
      }
      setBannerMessage({
        text: `تم إطلاق الحملة التسويقية (${customBudgetEgp.toLocaleString('en-US')} ج.م) واستقطاب عملاء وطلبات شحن جديدة! راجع قسم الشحنات لقبول الطلبيات.`,
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر إطلاق الحملة التسويقية.',
        tone: 'error',
      });
    }
  };

  const handleToggleMarketingDailyRepeat = (campaignId: string) => {
    try {
      const next = toggleMarketingCampaignDailyRepeat(gameState, campaignId);
      setGameState(next);
      playSoundEffect('click', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم تحديث إعداد التكرار اليومي التلقائي للحملة التسويقية.',
        tone: 'info',
      });
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تعديل التكرار اليومي.',
        tone: 'error',
      });
    }
  };

  const handlePayDebtObligation = (
    debtId: string,
    customAmountPiastres?: number
  ) => {
    try {
      const next = payCompanyDebtObligation(
        gameState,
        debtId,
        customAmountPiastres
      );
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      const paidCount = (next.debts || []).filter(
        (d) => d.status === 'PAID'
      ).length;
      if (paidCount >= 3) {
        playAchievementCelebrationSound(gameState.soundEnabled);
      }
      setBannerMessage({
        text: `تم سداد الالتزام المالي بنجاح (${paidCount}/4 مسدد بالكامل).`,
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر سداد الالتزام المالي.',
        tone: 'error',
      });
    }
  };

  const handleSaveCompanyProfile = (patch: {
    companyName?: string;
    commercialSloganAr?: string;
    bioAr?: string;
    avatarIconId?: NonNullable<GameState['companyProfile']>['avatarIconId'];
    customAvatarDataUrl?: string;
    serviceSpecialtiesAr?: string[];
    coveredZonesAr?: string[];
  }) => {
    try {
      const next = updateCompanyProfileState(gameState, patch);
      setGameState(next);
      playAchievementCelebrationSound(gameState.soundEnabled);
      setBannerMessage({
        text: 'تم حفظ تحديثات الملف الشخصي للشركة ورفع مؤشر الثقة التجارية أمام العملاء!',
        tone: 'success',
      });
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تحديث الملف الشخصي.',
        tone: 'error',
      });
    }
  };

  const handleRecallPageExplanation = () => {
    const mappedPageId = socialPhoneOpen
      ? 'PHONE'
      : activeSection === 'MAIN_CONTROL'
        ? 'DASHBOARD'
        : activeSection === 'EMPLOYEES'
          ? 'HR'
          : activeSection;
    const next = recordPageVisitAndGetSecretaryExplanation(
      gameState,
      mappedPageId,
      true
    );
    setGameState(next);
    playSoundEffect('click', gameState.soundEnabled);
    const latestMsg = PAGE_SECRETARY_EXPLANATIONS[mappedPageId]?.bodyAr;
    if (latestMsg) {
      setBannerMessage({
        text: latestMsg,
        tone: 'info',
      });
    }
  };

  const handleExpandWarehouse = (
    option: 'RENT_EXTERNAL_SPACE' | 'UPGRADE_SHELVES'
  ) => {
    try {
      const next = expandOrRentWarehouseCapacity(gameState, option);
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم توسيع الطاقة الاستيعابية للمستودع (عدد الطرود والوزن والحجم) بنجاح.',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر توسيع المستودع.',
        tone: 'error',
      });
    }
  };

  const handlePostHRJobAd = (role: EmployeeRole, customAdCostEgp: number) => {
    try {
      const next = postHRJobAd(gameState, role, customAdCostEgp);
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم نشر إعلان التوظيف وتقدم 3 مرشحين جدد (مبتدئ / متوسط / خبير).',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر نشر إعلان التوظيف.',
        tone: 'error',
      });
    }
  };

  const handleHireCandidate = (jobAdId: string, candidateId: string) => {
    try {
      const next = hireHRCandidate(gameState, jobAdId, candidateId);
      setGameState(next);
      playSoundEffect('success', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم تعيين المرشح بنجاح وإضافته للطاقة التشغيلية للشركة (يُصرف راتبه في دورة الـ 8 أيام).',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تعيين المرشح.',
        tone: 'error',
      });
    }
  };

  const handleReviewEmployee = (employeeId: string) => {
    try {
      const next = reviewLowPerformingEmployee(gameState, employeeId);
      setGameState(next);
      playSoundEffect('click', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم توثيق مراجعة الأداء الحرج للموظف. يمكنك الآن تدريبه أو اتخاذ قرار إنهاء الخدمة.',
        tone: 'info',
      });
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر إجراء المراجعة.',
        tone: 'error',
      });
    }
  };

  const handleTerminateEmployee = (employeeId: string) => {
    try {
      const next = terminateEmployeeAfterReview(gameState, employeeId);
      setGameState(next);
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم إنهاء خدمة الموظف رسمياً مع الحفاظ على سجله التاريخي وتحديث الطاقة التشغيلية.',
        tone: 'info',
      });
    } catch (err) {
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر إنهاء الخدمة.',
        tone: 'error',
      });
    }
  };

  const handleResolveSocialComplaint = (
    postId: string,
    actionType: SocialComplaintActionType
  ) => {
    try {
      const next = resolveSocialMediaComplaint(gameState, postId, actionType);
      setGameState(next);
      playSoundEffect('success', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم تنفيذ قرار معالجة شكوى العميل على السوشيال ميديا وتحسين سمعة انجوبيا اكسبريس.',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر معالجة الشكوى.',
        tone: 'error',
      });
    }
  };

  const handleRefuelFleet = () => {
    try {
      const next = refuelFleetVehicles(gameState);
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم تموين وقود وبنزين أسطول المركبات بالكامل (100%) بتكلفة 120.00 ج.م.',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر تموين وقود الأسطول.',
        tone: 'error',
      });
    }
  };

  const handleMaintainSortingMachines = () => {
    try {
      const next = repairWarehouseSortingMachines(gameState);
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      setBannerMessage({
        text: 'تمت صيانة ماكينات الفرز والسيور بالمستودع (100%) بتكلفة 150.00 ج.م.',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر صيانة ماكينات الفرز.',
        tone: 'error',
      });
    }
  };

  const handleRepairVehicle = (vehicleId: string) => {
    try {
      const next = repairFleetVehicle(gameState, vehicleId);
      setGameState(next);
      playSoundEffect('cash', gameState.soundEnabled);
      setBannerMessage({
        text: 'تم إصلاح المركبة ورفع كفاءتها الفنية إلى 98% بنجاح.',
        tone: 'success',
      });
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text: err instanceof Error ? err.message : 'تعذر إصلاح المركبة.',
        tone: 'error',
      });
    }
  };

  const handleEndDay = () => {
    try {
      const next = finishCurrentDay(gameState);
      setGameState(next);
      playSoundEffect('dayEnd', gameState.soundEnabled);
      setBannerMessage(null);
    } catch (err) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text:
          err instanceof Error
            ? err.message
            : 'لا يمكن إنهاء اليوم قبل استكمال المهام.',
        tone: 'error',
      });
    }
  };

  const handleStartNextDay = async () => {
    const next = advanceToNextDay(gameState);
    const syncCheck = await verifyOnlineAndSyncForNewDay(
      currentUser,
      next,
      isStagingMode
    );
    if (!syncCheck.ok) {
      playSoundEffect('warn', gameState.soundEnabled);
      setBannerMessage({
        text:
          syncCheck.errorAr ||
          'يشترط توفر اتصال بالإنترنت للانتقال إلى اليوم الجديد وحفظ التقدم على حسابك.',
        tone: 'error',
      });
      return;
    }

    setGameState(next);
    setSelectedSituationId(null);
    setActiveSection('MAIN_CONTROL');
    playSoundEffect('success', gameState.soundEnabled);
    setBannerMessage({
      text: `بدأ اليوم ${next.company.currentDay} (الساعة 09:00) وتم حفظ نقطة استرجاع جديدة على حسابك.`,
      tone: 'info',
    });
  };

  const handleRollbackTenDays = () => {
    const restored = rollbackToPreviousDaysCheckpoint(gameState, 10);
    setGameState(restored);
    setSelectedSituationId(null);
    setDrawerTrackingNumber(null);
    setActiveSection('MAIN_CONTROL');
    setCheckpointModalOpen(false);
    playSoundEffect('success', gameState.soundEnabled);
    setBannerMessage({
      text: `تمت العودة بالزمن إلى اليوم ${restored.company.currentDay} واستعادة السيولة وجاهزية الأسطول بنجاح.`,
      tone: 'success',
    });
  };

  const handleConfirmResetNewGame = () => {
    clearSavedGameStorage();
    const fresh = resetToDayOneKeepCompany(gameState);
    if (cloudRecord) {
      fresh.company.name = cloudRecord.companyName;
    }
    setGameState(fresh);
    setSelectedSituationId(null);
    setDrawerTrackingNumber(null);
    setActiveSection('MAIN_CONTROL');
    setConfirmNewGameOpen(false);
    setCheckpointModalOpen(false);
    setBannerMessage({
      text: 'تم بدء دورة تشغيلية جديدة من اليوم الأول مع الاحتفاظ باسم شركتك المسجل.',
      tone: 'info',
    });
  };

  const handleSelectBuilding = (buildingId: InteractiveBuildingId) => {
    playSoundEffect('click', gameState.soundEnabled);
    setHudDetailsOpen(false);
    setSpeedDropdownOpen(false);
    switch (buildingId) {
      case 'WAREHOUSE':
        setActiveSection('WAREHOUSE');
        break;
      case 'OFFICE':
        setActiveSection('EMPLOYEES');
        break;
      case 'FLEET':
        setActiveSection('COURIERS');
        break;
      case 'DISPATCH':
        setActiveSection('SHIPMENTS');
        break;
      case 'MARKETING':
        setActiveSection('MARKETING');
        break;
      case 'FINANCE':
        setActiveSection('LEDGER');
        break;
      case 'BUSINESS_DEV':
        setActiveSection('BUSINESS_DEVELOPER');
        break;
      default:
        break;
    }
  };

  return (
    <div
      dir="rtl"
      className={`${landscapeWrapperClass} daylight-game-theme overflow-hidden bg-[#F4F1EA] text-[#182635] safe-game-shell flex flex-col select-none`}
    >
      {/* Section 25 Mobile Portrait Orientation Guidance Screen */}
      {shouldShowPortraitOrientationGate && (
        <MobileLandscapeOrientationGate
          companyName={gameState.company.name}
          nativeLockStatus={nativeLockStatus}
          onRequestNativeLandscape={requestNativeLandscapeOrientation}
          onActivateBrowserLandscapeFallback={activateCleanLandscapeMode}
        />
      )}

      {/* Slim Offline / Fullscreen Status Bar */}
      <ImmersiveFullscreenBanner
        isFullscreen={isFullscreen}
        isSmartLandscapeMode={isSmartLandscapeMode}
        isStandalonePWA={isStandalonePWA}
        isInstallable={isInstallable}
        isIOS={isIOS}
        isOnline={isOnline}
        onEnterFullscreen={enterTrueFullscreen}
        onActivateCleanLandscape={activateCleanLandscapeMode}
        onExitFullscreen={exitTrueFullscreen}
        onInstallPWA={triggerPWAInstall}
      />

      {/* Admin Environment Separation & Instant Switcher Bar */}
      {isAdmin && (
        <div
          className={`px-3 sm:px-4 py-1.5 border-b text-xs flex flex-wrap items-center justify-between gap-2 shrink-0 ${
            isStagingMode
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-0.5 rounded font-black text-[10px] shrink-0 ${
                isStagingMode
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isStagingMode ? 'بيئة المطور (Staging)' : 'النسخة العامة (Live)'}
            </span>
            <span className="truncate text-[11px]">
              {isStagingMode
                ? `مرشح الاختبار (${releaseControl.candidateVersion}): التعديلات هنا معزولة عن النسخة العامة.`
                : `الإصدار العام المعتمد (${releaseControl.publicVersion}): أنت تستعرض النسخة العامة للاعبين الآن.`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleToggleAdminStagingMode(!isStagingMode)}
              className="px-2.5 py-0.5 rounded-md font-bold text-[11px] border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 cursor-pointer transition-colors"
            >
              {isStagingMode
                ? '⇄ التبديل للنسخة العامة (Live)'
                : '⇄ التبديل لبيئة المطور (Staging)'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('DEVELOPER_SETTINGS');
                setHudDetailsOpen(false);
                setSpeedDropdownOpen(false);
              }}
              className="px-2.5 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-[#1D63B8] font-bold text-[11px] cursor-pointer"
            >
              لوحة المطور والنشر
            </button>
          </div>
        </div>
      )}

      {/* Daylight Tycoon HUD Bar (Mobile-First, Clean Contrast, Zero Overlap) */}
      <header className="relative z-40 bg-white/95 border-b border-slate-200 px-3 py-2 shrink-0 shadow-xs backdrop-blur-md">
        {/* Row 1: Brand/Level + Live Cash + Reputation + Quick Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand & Level */}
          <div className="flex items-center gap-2 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveSection('MAIN_CONTROL');
                setHudDetailsOpen(false);
                setSpeedDropdownOpen(false);
                playSoundEffect('click', gameState.soundEnabled);
              }}
              className="text-xs sm:text-sm font-extrabold text-[#182635] hover:text-[#1D63B8] transition-colors cursor-pointer truncate max-w-[125px] sm:max-w-[200px]"
              title="العودة إلى المقر الرئيسي 3D"
            >
              {gameState.company.name}
            </button>
            <span className="text-[11px] font-mono-num font-bold text-[#1D63B8] shrink-0">
              · م{gameState.company.level || 1}
            </span>
          </div>

          {/* Core Metrics: Cash & Reputation */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveSection('LEDGER');
                setHudDetailsOpen(false);
                setSpeedDropdownOpen(false);
                playSoundEffect('click', gameState.soundEnabled);
              }}
              className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="الخزينة والسيولة النقدية (اضغط لفتح الحسابات)"
            >
              <span className="text-slate-600 text-[11px] hidden sm:inline">السيولة:</span>
              <strong className="font-mono-num text-emerald-800 font-black text-xs sm:text-sm">
                {formatEGP(Math.max(0, gameState.company.cashPiastres))}
              </strong>
            </button>

            <button
              type="button"
              onClick={() => {
                setSocialPhoneOpen(true);
                setHudDetailsOpen(false);
                setSpeedDropdownOpen(false);
                playSoundEffect('click', gameState.soundEnabled);
              }}
              className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-400 text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="السمعة والهاتف الذكي"
            >
              <span className="text-slate-600 text-[11px] hidden sm:inline">السمعة:</span>
              <strong
                className={`font-mono-num font-black text-xs sm:text-sm ${
                  gameState.company.reputation >= 70
                    ? 'text-emerald-700'
                    : gameState.company.reputation >= 45
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                {gameState.company.reputation}%
              </strong>
            </button>
          </div>

          {/* Quick HUD Actions: Sound, Save, Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextSound = !gameState.soundEnabled;
                setGameState((prev) => ({ ...prev, soundEnabled: nextSound }));
              }}
              title={gameState.soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
              className="px-2 py-1 rounded-lg bg-[#F4F1EA] hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
            >
              {gameState.soundEnabled ? 'صوت' : 'صامت'}
            </button>
            <button
              type="button"
              onClick={() => {
                const savedNext = recordSyncMilestone(
                  gameState,
                  'PRE_EXIT_SAVE',
                  'حفظ يدوي آمن'
                );
                setGameState(savedNext);
                saveGameToStorage(savedNext, isStagingMode);
                if (currentUser && cloudRecordRef.current && isOnline) {
                  void savePlayerGameProgressToCloud(currentUser, savedNext, {
                    isStagingMode,
                    existingStagingState: cloudRecordRef.current.stagingGameState,
                    baseRecord: cloudRecordRef.current,
                  });
                }
                playSoundEffect('success', gameState.soundEnabled);
                setBannerMessage({
                  text: 'تم حفظ اللعبة بنجاح ✓',
                  tone: 'success',
                });
              }}
              className="px-2.5 py-1 rounded-lg bg-[#F4F1EA] hover:bg-slate-200 border border-slate-300 text-[#1D63B8] text-xs font-bold cursor-pointer whitespace-nowrap"
              title="حفظ التقدم"
            >
              حفظ
            </button>
            <button
              type="button"
              onClick={() => {
                setHudDetailsOpen((prev) => !prev);
                setSpeedDropdownOpen(false);
                playSoundEffect('click', gameState.soundEnabled);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                hudDetailsOpen
                  ? 'bg-[#1D63B8] text-white border-[#1D63B8]'
                  : 'bg-[#F4F1EA] hover:bg-slate-200 text-slate-800 border-slate-300'
              }`}
            >
              <span>الأقسام</span>
              <span>{hudDetailsOpen ? '▴' : '▾'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Clock & Simulation Speed Controls + End Day Button */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#F4F1EA] border border-slate-300 rounded-xl px-2.5 py-1 text-xs shrink-0">
            <span className="text-slate-700 text-[11px] font-bold">اليوم {currentDay}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span dir="ltr" className="font-mono-num text-[#1D63B8] font-black tracking-wide">
              {clockLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#F4F1EA] border border-slate-300 rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setGameState((prev) => ({
                  ...prev,
                  clock: { ...prev.clock, isPaused: !prev.clock.isPaused },
                }));
                playSoundEffect('click', gameState.soundEnabled);
              }}
              title={gameState.clock.isPaused ? 'استئناف' : 'إيقاف مؤقت'}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                gameState.clock.isPaused
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {gameState.clock.isPaused ? 'متابعة' : 'إيقاف'}
            </button>
            {([1, 2, 4, 8] as const).map((spd) => {
              const active = !gameState.clock.isPaused && gameState.clock.speedMultiplier === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    setGameState((prev) =>
                      evaluateOnboardingMasteryProgress({
                        ...prev,
                        phase: prev.phase === 'INTRO_STORY' ? 'OFFICE_PLAY' : prev.phase,
                        clock: { ...prev.clock, isPaused: false, speedMultiplier: spd },
                      })
                    );
                    playSoundEffect('click', gameState.soundEnabled);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono-num font-bold cursor-pointer transition-all ${
                    active
                      ? 'bg-[#1D63B8] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSpeedDropdownOpen((prev) => !prev);
                setHudDetailsOpen(false);
                playSoundEffect('click', gameState.soundEnabled);
              }}
              className="px-1.5 py-0.5 rounded-lg text-[10px] text-[#1D63B8] hover:underline font-bold cursor-pointer"
              title="خيارات تسريع وقفز التوقيت"
            >
              {speedDropdownOpen ? '▴' : '+وقت'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRecallPageExplanation}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1D63B8] text-[11px] font-bold cursor-pointer whitespace-nowrap"
              title="شرح الصفحة الحالية"
            >
              شرح القسم
            </button>

            <button
              type="button"
              onClick={handleEndDay}
              disabled={!endDayStatus.canEnd}
              title={
                endDayStatus.canEnd
                  ? 'إغلاق حسابات اليوم وإصدار التقرير الختامي'
                  : endDayStatus.blockingReasons.join(' | ')
              }
              className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                endDayStatus.canEnd
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
              }`}
            >
              إنهاء اليوم {currentDay}
            </button>
          </div>
        </div>

        {/* Dropdown 1: Time Speed & Clock Acceleration Dropdown (دروب ليست سرعة التوقيت) */}
        {speedDropdownOpen && (
          <div className="mt-1.5 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700">نظام تسريع وقفز الوقت:</span>
              <span
                dir="ltr"
                className="font-mono-num text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
              >
                {clockLabel}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                (نظام 12 ساعة AM / PM)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setGameState((prev) => ({
                    ...prev,
                    clock: { ...prev.clock, isPaused: !prev.clock.isPaused },
                  }));
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                  gameState.clock.isPaused
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100'
                }`}
              >
                {gameState.clock.isPaused ? '▶ تشغيل الوقت' : '⏸ إيقاف مؤقت (0x)'}
              </button>

              {(
                [
                  { spd: 1, label: '1x عادي' },
                  { spd: 2, label: '2x متوسط' },
                  { spd: 4, label: '4x سريع' },
                  { spd: 8, label: '8x فائق' },
                  { spd: 12, label: '⚡ 12x خارق' },
                ] as const
              ).map(({ spd, label }) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    setGameState((prev) =>
                      evaluateOnboardingMasteryProgress({
                        ...prev,
                        phase:
                          prev.phase === 'INTRO_STORY'
                            ? 'OFFICE_PLAY'
                            : prev.phase,
                        clock: {
                          ...prev.clock,
                          isPaused: false,
                          speedMultiplier: spd,
                        },
                      })
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg font-mono-num text-xs font-bold border cursor-pointer transition-colors ${
                    !gameState.clock.isPaused &&
                    gameState.clock.speedMultiplier === spd
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setGameState((prev) =>
                    syncTutorialProgress(
                      advanceSimulationClock(prev, 15, true),
                      activeSection,
                      socialPhoneOpen
                    )
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono-num text-xs font-bold cursor-pointer"
              >
                +15 دقيقة
              </button>

              <button
                type="button"
                onClick={() =>
                  setGameState((prev) =>
                    syncTutorialProgress(
                      advanceSimulationClock(prev, 30, true),
                      activeSection,
                      socialPhoneOpen
                    )
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono-num text-xs font-bold cursor-pointer"
              >
                +30 دقيقة
              </button>

              <button
                type="button"
                onClick={() =>
                  setGameState((prev) =>
                    syncTutorialProgress(
                      advanceSimulationClock(prev, 60, true),
                      activeSection,
                      socialPhoneOpen
                    )
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-mono-num text-xs font-bold cursor-pointer"
              >
                +1 ساعة
              </button>

              <button
                type="button"
                onClick={() =>
                  setGameState((prev) => ({
                    ...prev,
                    clock: {
                      ...prev.clock,
                      minutesFromMidnight: 540,
                      isPaused: false,
                    },
                  }))
                }
                className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold cursor-pointer"
              >
                🔄 ضبط 09:00 AM
              </button>

              <button
                type="button"
                onClick={() => setSpeedDropdownOpen(false)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer"
              >
                إغلاق ▴
              </button>
            </div>
          </div>
        )}

        {/* Dropdown 2: Master Collapsible Dashboard & Sections Dropdown (دروب ليست كامل اللوحة والتفاصيل) */}
        {hudDetailsOpen && (
          <div className="mt-1.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xl space-y-2.5 text-xs text-slate-800">
            {/* Row A: All Sections Navigation */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-slate-100">
              {(
                [
                  { id: 'MAIN_CONTROL', label: '🏢 غرفة العمليات' },
                  {
                    id: 'BUSINESS_DEVELOPER',
                    label: `🤝 تطوير الأعمال (${
                      currentDay >= 3
                        ? `${(gameState.businessDeveloper?.platformOrders || []).filter((o) => o.status === 'WAITING_DISPATCH').length} طلب`
                        : 'اليوم 3'
                    })`,
                  },
                  { id: 'SHIPMENTS', label: `📦 الشحنات (${activeShipments.length})` },
                  { id: 'WAREHOUSE', label: '🏭 المستودع والفرز' },
                  { id: 'COURIERS', label: '🛵 المناديب والأسطول' },
                  { id: 'EMPLOYEES', label: `👥 الموارد البشرية (${activeEmployeesCount})` },
                  { id: 'MARKETING', label: '📣 التسويق' },
                  { id: 'LEDGER', label: '💰 الحسابات' },
                  { id: 'NOTIFICATIONS', label: `🔔 الإشعارات (${unreadNotificationsCount})` },
                ] as { id: WorkspaceSection; label: string }[]
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setHudDetailsOpen(false);
                    playSoundEffect('click', gameState.soundEnabled);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap border ${
                    activeSection === item.id
                      ? 'bg-[#1D63B8] text-white border-[#1D63B8] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setSocialPhoneOpen(true);
                  setHudDetailsOpen(false);
                  playSoundEffect('click', gameState.soundEnabled);
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold cursor-pointer whitespace-nowrap border ${
                  unresolvedSocialComplaintsCount > 0
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                }`}
              >
                📱 السوشيال ميديا{' '}
                {unresolvedSocialComplaintsCount > 0
                  ? `(${unresolvedSocialComplaintsCount} شكوى)`
                  : `(${(gameState.socialPosts || []).length})`}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTutorialModalOpen(true);
                  setHudDetailsOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-bold cursor-pointer whitespace-nowrap"
              >
                📘 دليل المدير
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('DEVELOPER_SETTINGS');
                    setHudDetailsOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold cursor-pointer whitespace-nowrap"
                >
                  ⚙️ إعدادات المطور
                </button>
              )}
            </div>

            {/* Row B: Secondary Operational Telemetry & Account Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  وقود الأسطول:{' '}
                  <strong
                    className={`font-mono-num ${
                      (gameState.fleetAndEquipment?.fuelLevelPercent ?? 85) <= 20
                        ? 'text-rose-600 font-bold'
                        : 'text-amber-700 font-bold'
                    }`}
                  >
                    {gameState.fleetAndEquipment?.fuelLevelPercent ?? 85}%
                  </strong>
                </span>
                <span>·</span>
                <span>
                  ماكينات الفرز:{' '}
                  <strong
                    className={`font-mono-num ${
                      (gameState.fleetAndEquipment?.sortingMachineHealth ?? 88) <= 25
                        ? 'text-rose-600 font-bold'
                        : 'text-emerald-700 font-bold'
                    }`}
                  >
                    {gameState.fleetAndEquipment?.sortingMachineHealth ?? 88}%
                  </strong>
                </span>
                <span>·</span>
                <span>
                  السمعة:{' '}
                  <strong className="font-mono-num text-slate-900 font-bold">
                    {gameState.company.reputation}%
                  </strong>
                </span>
                <span>·</span>
                <span>
                  رضا العملاء:{' '}
                  <strong className="font-mono-num text-slate-900 font-bold">
                    {gameState.company.customerSatisfaction}%
                  </strong>
                </span>
                <span>·</span>
                <span className={isOnline ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {isOnline ? '● متصل سحابياً' : '○ أوفلاين محلي'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isPortraitViewport && (
                  <button
                    type="button"
                    onClick={flipLandscapeDirection}
                    className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 font-bold cursor-pointer"
                  >
                    🔄 عكس اتجاه الأفقي
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setHudDetailsOpen(false);
                    setCompanyNameModalOpen(true);
                  }}
                  className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-700 hover:text-amber-700 cursor-pointer"
                >
                  {cloudRecord?.companyNameChangeUsed ? 'اسم الشركة (مثبت)' : 'تغيير اسم الشركة'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHudDetailsOpen(false);
                    setCheckpointModalOpen(true);
                  }}
                  className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  استرجاع 10 أيام / اليوم 1
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  خروج
                </button>
                <button
                  type="button"
                  onClick={() => setHudDetailsOpen(false)}
                  className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-bold cursor-pointer"
                >
                  طي اللوحة ▴
                </button>
              </div>
            </div>

            {/* Optional Current Tutorial Step inside Dropdown */}
            {nextPendingTutorialStep && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-sky-800">
                <div>
                  <strong>توجيه اليوم {currentDay}:</strong> {nextPendingTutorialStep.titleAr} —{' '}
                  {nextPendingTutorialStep.instructionAr}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHudDetailsOpen(false);
                    setTutorialModalOpen(true);
                  }}
                  className="text-amber-700 font-bold underline shrink-0 cursor-pointer"
                >
                  التفاصيل
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Single Clear Urgent Problem Alert */}
      {urgentShipment && (
        <div className="px-3 sm:px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-rose-900">
            <strong className="text-rose-700 ml-1">تنبيه تشغيلي عاجل:</strong>
            الشحنة{' '}
            <strong className="font-mono-num text-rose-950">
              {urgentShipment.trackingNumber}
            </strong>{' '}
            ({urgentShipment.clientName}) —{' '}
            {urgentShipment.delayReason || 'تحتاج إلى مراجعة أو قرار إداري'}
          </div>
          <button
            type="button"
            onClick={() => setDrawerTrackingNumber(urgentShipment.trackingNumber)}
            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
          >
            فتح الشحنة والتدخل الإداري
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {bannerMessage && (
        <div
          className={`px-3 sm:px-6 py-2 text-xs flex items-center justify-between gap-4 border-b shrink-0 ${
            bannerMessage.tone === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : bannerMessage.tone === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <span>{bannerMessage.text}</span>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs font-bold underline cursor-pointer shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* 3. Main Responsive Portrait/Landscape Tycoon Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden max-w-full p-2.5 sm:p-4 pb-32 sm:pb-36">
        <div className="max-w-[1400px] mx-auto">
          {activeSection === 'MAIN_CONTROL' && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* Central 3D Tycoon Headquarters & Open-Cutaway Warehouse Campus */}
              <div className="w-full h-[56vh] sm:h-[64vh] min-h-[380px] rounded-2xl overflow-hidden border border-slate-300 shadow-md relative bg-[#DCEBF7]">
                <Headquarters3DScene
                  gameState={gameState}
                  onSelectBuilding={handleSelectBuilding}
                  onResetView={() => setActiveSection('MAIN_CONTROL')}
                />
              </div>

              {/* In-Campus Visitor & Executive Decision Card */}
              {activeSituation && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CharacterPortrait
                        avatarId={activeSituation.speakerAvatarId}
                        size="md"
                      />
                      <div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {activeSituation.title}
                        </h3>
                        <p className="text-xs text-[#1D63B8] font-bold">
                          {activeSituation.speakerName} · {activeSituation.speakerRole}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {todaySituations.map((sit, idx) => {
                        const isCurrent = activeSituation.id === sit.id;
                        return (
                          <button
                            key={sit.id}
                            type="button"
                            onClick={() => {
                              setSelectedSituationId(sit.id);
                              playSoundEffect('click', gameState.soundEnabled);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-[#1D63B8] text-white border-[#1D63B8]'
                                : sit.resolved
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-[#F4F1EA] text-slate-700 border-slate-300'
                            }`}
                          >
                            {idx + 1}. {sit.resolved ? '✓ تم' : 'قرار'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-[#F7F4EE] p-3 rounded-xl border border-slate-200">
                    «{activeSituation.dialogueText}»
                  </p>

                  {activeSituation.resolved ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                      <strong>تم اعتماد القرار:</strong> {activeSituation.outcomeSummary}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {activeSituation.options.map((opt) => {
                        const check = evaluateDecisionConditions(
                          gameState,
                          activeSituation,
                          opt
                        );
                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                              check.allowed
                                ? 'bg-[#F7F4EE] border-slate-200 hover:border-[#1D63B8]'
                                : 'bg-slate-50 border-slate-200 opacity-75'
                            }`}
                          >
                            <div>
                              <div className="text-xs font-extrabold text-slate-900">{opt.label}</div>
                              <p className="text-[11px] text-slate-600 mt-0.5">{opt.subtitle}</p>
                              <div className="text-[10px] text-amber-800 font-mono-num font-bold mt-1">
                                الأثر المتوقع: {opt.expectedFinancialImpactLabel}
                              </div>
                              {!check.allowed && check.reasonIfDenied && (
                                <div className="text-[10px] text-rose-700 font-bold mt-1">
                                  {check.reasonIfDenied}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDecisionClick(activeSituation.id, opt.id)}
                              disabled={!check.allowed}
                              className={`w-full py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                                check.allowed
                                  ? 'bg-[#1D63B8] hover:bg-blue-700 text-white shadow-xs'
                                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              اعتماد القرار
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Live Automated Logistics Strip */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPipelineDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-[#1D63B8]">
                      حركة الطرود والمناديب الجارية ({activeShipments.length} شحنات نشطة)
                    </h3>
                    <span className="text-xs text-[#1D63B8] font-bold">
                      {pipelineDropdownOpen ? '▴ إخفاء' : '▾ عرض'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('SHIPMENTS');
                      setHudDetailsOpen(false);
                      setSpeedDropdownOpen(false);
                    }}
                    className="text-xs text-[#1D63B8] hover:underline font-bold cursor-pointer"
                  >
                    سجل الشحنات الكامل ←
                  </button>
                </div>

                {pipelineDropdownOpen && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200">
                    {activeShipments.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-500">
                        لا توجد شحنات قيد التوصيل حالياً في ساحة المقر.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                        {activeShipments.map((sh) => (
                          <div
                            key={sh.trackingNumber}
                            onClick={() => setDrawerTrackingNumber(sh.trackingNumber)}
                            className="p-2.5 rounded-xl bg-[#F7F4EE] border border-slate-200 hover:border-[#1D63B8] transition-colors cursor-pointer flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="truncate">
                              <span className="font-mono-num font-bold text-[#1D63B8]">
                                {sh.trackingNumber}
                              </span>
                              <span aria-hidden="true" className="text-slate-400 mx-1">·</span>
                              <span className="text-slate-900 font-bold truncate">
                                {sh.clientName}
                              </span>
                              <div className="text-[10px] text-slate-600">
                                {OPERATIONAL_LOCATION_LABELS_AR[sh.operationalLocation]} · المتوقع:{' '}
                                <span dir="ltr" className="font-mono-num text-slate-800 font-semibold">
                                  {sh.expectedDeliveryTimeLabel}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold ${
                                sh.isDelayed
                                  ? 'text-rose-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {SHIPMENT_STATUS_LABELS_AR[sh.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection !== 'MAIN_CONTROL' && (
            <div className="mb-3.5 flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('MAIN_CONTROL');
                  setHudDetailsOpen(false);
                  setSpeedDropdownOpen(false);
                  playSoundEffect('click', gameState.soundEnabled);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#1D63B8] hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span>←</span>
                <span>العودة إلى المقر والمستودع 3D</span>
              </button>
              <div className="text-xs font-bold text-slate-700">
                مقر إنجوبيا إكسبريس · اليوم {currentDay}
              </div>
            </div>
          )}

          {activeSection === 'SHIPMENTS' && (
            <ShipmentsPanel
              state={gameState}
              onSelectShipment={(trk) => setDrawerTrackingNumber(trk)}
              onAcceptShipment={handleAcceptShipmentDirect}
              onRejectShipment={handleRejectShipmentDirect}
              onUpdateState={(nextState, msg) => {
                setGameState(nextState);
                if (msg) {
                  setBannerMessage({ text: msg, tone: 'info' });
                }
              }}
            />
          )}

          {activeSection === 'WAREHOUSE' && (
            <WarehousePanel
              state={gameState}
              onSelectShipment={(trk) => setDrawerTrackingNumber(trk)}
              onExpandWarehouse={handleExpandWarehouse}
              onMaintainSortingMachines={handleMaintainSortingMachines}
            />
          )}

          {activeSection === 'MARKETING' && (
            <MarketingPanel
              state={gameState}
              onLaunchCampaign={handleLaunchMarketingCampaign}
              onToggleDailyRepeat={handleToggleMarketingDailyRepeat}
              onSelectShipment={(trk) => setDrawerTrackingNumber(trk)}
            />
          )}

          {activeSection === 'DEBTS' && (
            <DebtsPanel
              state={gameState}
              onPayDebt={handlePayDebtObligation}
            />
          )}

          {activeSection === 'MAINTENANCE' && (
            <MaintenancePanel
              state={gameState}
              onRefuelFleet={handleRefuelFleet}
              onMaintainSortingMachines={handleMaintainSortingMachines}
              onMaintainAdminSystems={handleMaintainSortingMachines}
              onMaintainVehicle={handleRepairVehicle}
              onExpandWarehouse={handleExpandWarehouse}
            />
          )}

          {activeSection === 'COMPANY_PROFILE' && (
            <CompanyProfilePanel
              state={gameState}
              onSaveProfile={handleSaveCompanyProfile}
            />
          )}

          {activeSection === 'COURIERS' && (
            <CouriersPanel
              state={gameState}
              onSelectShipment={(trk) => setDrawerTrackingNumber(trk)}
              onRefuelFleet={handleRefuelFleet}
              onRepairVehicle={handleRepairVehicle}
            />
          )}

          {activeSection === 'EMPLOYEES' && (
            <EmployeesHRPanel
              state={gameState}
              onScheduleSalaryRaise={(empId, amount) => {
                try {
                  setGameState((prev) =>
                    scheduleEmployeeSalaryRaise(prev, empId, amount)
                  );
                  playSoundEffect('success', gameState.soundEnabled);
                } catch (err) {
                  setBannerMessage({
                    text: err instanceof Error ? err.message : 'تعذر تعديل الراتب',
                    tone: 'error',
                  });
                }
              }}
              onGrantBonus={(empId, amount, reason) => {
                try {
                  setGameState((prev) =>
                    grantEmployeePerformanceBonus(prev, empId, amount, reason)
                  );
                  playSoundEffect('cash', gameState.soundEnabled);
                } catch (err) {
                  setBannerMessage({
                    text: err instanceof Error ? err.message : 'تعذر صرف المكافأة',
                    tone: 'error',
                  });
                }
              }}
              onStartTraining={(empId) => {
                try {
                  setGameState((prev) => startEmployeeTraining(prev, empId));
                  playSoundEffect('click', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'بدأ تدريب الموظف — سترتفع كفاءته فور انتهاء مدة التدريب على ساعة اللعبة.',
                    tone: 'info',
                  });
                } catch (err) {
                  setBannerMessage({
                    text: err instanceof Error ? err.message : 'تعذر بدء التدريب',
                    tone: 'error',
                  });
                }
              }}
              onConductInvestigation={(empId) => {
                try {
                  setGameState((prev) =>
                    conductEmployeeInvestigation(prev, empId)
                  );
                  playSoundEffect('click', gameState.soundEnabled);
                } catch (err) {
                  setBannerMessage({
                    text: err instanceof Error ? err.message : 'تعذر إجراء التحقيق',
                    tone: 'error',
                  });
                }
              }}
              onApplyPenalty={(empId, reason) => {
                try {
                  setGameState((prev) =>
                    applyApprovedEmployeePenalty(prev, empId, reason)
                  );
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم توقيع الجزاء اللائحي المعتمد وخصمه من مستحقات الراتب.',
                    tone: 'info',
                  });
                } catch (err) {
                  setBannerMessage({
                    text: err instanceof Error ? err.message : 'تعذر توقيع الجزاء',
                    tone: 'error',
                  });
                }
              }}
              onReassignTasks={(empId) => {
                try {
                  setGameState((prev) => reassignEmployeeTasks(prev, empId));
                  playSoundEffect('success', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تمت إعادة توزيع المهام وتحسين كفاءة الفرز بالمستودع.',
                    tone: 'success',
                  });
                } catch (err) {
                  setBannerMessage({
                    text: err instanceof Error ? err.message : 'تعذر إعادة التوزيع',
                    tone: 'error',
                  });
                }
              }}
              onPostJobAd={handlePostHRJobAd}
              onHireCandidate={handleHireCandidate}
              onReviewEmployee={handleReviewEmployee}
              onTerminateEmployee={handleTerminateEmployee}
            />
          )}

          {activeSection === 'BUSINESS_DEVELOPER' && (
            <BusinessDeveloperPanel
              state={gameState}
              onSignContract={(platformId: PlatformContractId) => {
                try {
                  const next = signPlatformContract(gameState, platformId);
                  setGameState(next);
                  playSoundEffect('cash', gameState.soundEnabled);
                  setBannerMessage({
                    text: `تم توقيع العقد مع منصة «${platformId === 'WAKKELNY' ? 'وكلني' : 'زورو'}» وتفعيل تدفق الطلبات المباشرة بنجاح!`,
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر توقيع عقد المنصة.',
                    tone: 'error',
                  });
                }
              }}
              onGeneratePlatformOrders={(platformId: PlatformContractId) => {
                try {
                  const next = generatePlatformOrdersForContract(
                    gameState,
                    platformId,
                    gameState.company.currentDay
                  );
                  setGameState(next);
                  playSoundEffect('click', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم تحديث قائمة الطلبات المباشرة لليوم.',
                    tone: 'info',
                  });
                } catch (err) {
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر تحديث الطلبات.',
                    tone: 'error',
                  });
                }
              }}
              onDispatchIndependent={(orderId: string, courierId: string) => {
                try {
                  const next = dispatchPlatformOrderIndependent(
                    gameState,
                    orderId,
                    courierId
                  );
                  setGameState(next);
                  playSoundEffect('success', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم إطلاق رحلة التوصيل المستقلة مباشرة من الشريك إلى العميل!',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر توجيه الطلب.',
                    tone: 'error',
                  });
                }
              }}
              onDispatchBatch={(orderIds: string[], courierId: string) => {
                try {
                  const next = dispatchPlatformOrdersBatched(
                    gameState,
                    orderIds,
                    courierId
                  );
                  setGameState(next);
                  playSoundEffect('success', gameState.soundEnabled);
                  setBannerMessage({
                    text: `تم إطلاق خط التوصيل المجمع (${orderIds.length} طلبات في نفس الاتجاه) وتوفير الوقود!`,
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر تجميع الطلبات المختارة.',
                    tone: 'error',
                  });
                }
              }}
              onRunSmartAutoDispatch={(policy: SmartDispatchPolicy) => {
                try {
                  const next = runSmartAutoDispatch(gameState, policy);
                  setGameState(next);
                  playSoundEffect('success', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم تنفيذ التوزيع الذكي التلقائي للطلبات المتوافقة وتسجيل أسباب القرار!',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر تشغيل التوزيع الذكي.',
                    tone: 'error',
                  });
                }
              }}
              onBuyOrLeaseVehicle={(
                catalogId: VehicleCatalogId,
                mode: 'BUY' | 'LEASE'
              ) => {
                try {
                  const next = purchaseOrLeaseFleetVehicle(
                    gameState,
                    catalogId,
                    mode
                  );
                  setGameState(next);
                  playSoundEffect('cash', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      mode === 'BUY'
                        ? 'تم شراء المركبة الجديدة وضمها لأسطول الشركة المملوك (0 ج.م إيجار دوري)!'
                        : 'تم استئجار المركبة الجديدة (يُخصم إيجارها في دورة الـ 8 أيام فقط)!',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر شراء أو استئجار المركبة.',
                    tone: 'error',
                  });
                }
              }}
              onAssignVehicleToCourier={(
                vehicleId: string,
                courierId: string
              ) => {
                try {
                  const next = assignVehicleToCourier(
                    gameState,
                    vehicleId,
                    courierId
                  );
                  setGameState(next);
                  playSoundEffect('success', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم تخصيص المركبة للمندوب بنجاح (ارتباط أحادي 1:1).',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر تخصيص المركبة للمندوب.',
                    tone: 'error',
                  });
                }
              }}
              onUnassignVehicle={(vehicleId: string) => {
                try {
                  const next = unassignVehicleFromCourier(gameState, vehicleId);
                  setGameState(next);
                  playSoundEffect('click', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم فك ارتباط المركبة وأصبحت متاحة للتخصيص لمندوب آخر.',
                    tone: 'info',
                  });
                } catch (err) {
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر فك ارتباط المركبة.',
                    tone: 'error',
                  });
                }
              }}
              onSellOwnedVehicle={(vehicleId: string) => {
                try {
                  const next = sellOwnedVehicle(gameState, vehicleId);
                  setGameState(next);
                  playSoundEffect('cash', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم بيع المركبة المملوكة وإيداع قيمتها السوقية في الخزينة.',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر بيع المركبة.',
                    tone: 'error',
                  });
                }
              }}
              onTerminateLeaseVehicle={(vehicleId: string) => {
                try {
                  const next = terminateLeasedVehicle(gameState, vehicleId);
                  setGameState(next);
                  playSoundEffect('click', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم إنهاء عقد إيجار المركبة وإعادتها للمؤجر.',
                    tone: 'info',
                  });
                } catch (err) {
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر إنهاء إيجار المركبة.',
                    tone: 'error',
                  });
                }
              }}
              onRepairVehicle={(vehicleId: string) => {
                handleRepairVehicle(vehicleId);
              }}
              onPurchaseUpgrade={(upgradeId: string) => {
                try {
                  const next = purchaseOperationsUpgrade(gameState, upgradeId);
                  setGameState(next);
                  playSoundEffect('cash', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تمت ترقية مركز التشغيل وتطبيق تحسينات الأداء فوراً!',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر شراء الترقية.',
                    tone: 'error',
                  });
                }
              }}
              onLaunchContractCampaign={(campaignCatalogId: string) => {
                try {
                  const next = launchContractMarketingCampaign(
                    gameState,
                    campaignCatalogId
                  );
                  setGameState(next);
                  playSoundEffect('cash', gameState.soundEnabled);
                  setBannerMessage({
                    text: 'تم إطلاق حملة تسويق العقود وتحديث المتابعين وتدفق الطلبات!',
                    tone: 'success',
                  });
                } catch (err) {
                  playSoundEffect('warn', gameState.soundEnabled);
                  setBannerMessage({
                    text:
                      err instanceof Error
                        ? err.message
                        : 'تعذر إطلاق حملة تسويق العقود.',
                    tone: 'error',
                  });
                }
              }}
              onInjectPartnerCapital={(amountEgp: number) => {
                const next = injectPartnerCapitalExpansion(
                  gameState,
                  amountEgp
                );
                setGameState(next);
                playSoundEffect('cash', gameState.soundEnabled);
                setBannerMessage({
                  text: `تم إيداع استثمار رأسمالي توسعي من الشركاء بقيمة ${formatEGP(amountEgp * 100)} بدون أي ديون!`,
                  tone: 'success',
                });
              }}
              onUpdateState={(
                updater: (prev: GameState) => GameState,
                bannerMsg?: string
              ) => {
                setGameState((prev) => updater(prev));
                if (bannerMsg) {
                  playSoundEffect('success', gameState.soundEnabled);
                  setBannerMessage({
                    text: bannerMsg,
                    tone: 'success',
                  });
                }
              }}
            />
          )}

          {activeSection === 'LEDGER' && <LedgerReportsPanel state={gameState} />}

          {activeSection === 'NOTIFICATIONS' && (
            <NotificationsPanel
              notifications={gameState.notifications}
              onOpenShipment={(trk) => setDrawerTrackingNumber(trk)}
              onMarkAllRead={() =>
                setGameState((prev) => markAllNotificationsRead(prev))
              }
            />
          )}

          {activeSection === 'DEVELOPER_SETTINGS' && isAdmin && (
            <DeveloperSettingsPanel
              adminEmail={currentUser?.email || 'a7med3bker@gmail.com'}
              gameState={gameState}
              isStagingMode={isStagingMode}
              onToggleStagingMode={handleToggleAdminStagingMode}
              onResetStagingSandbox={handleResetStagingSandbox}
              onRunSandboxAction={handleRunSandboxAction}
              onOpenSection={(sec) => setActiveSection(sec)}
              releaseControl={releaseControl}
              onPublishRelease={async (nextRel) => {
                const saved = await publishOrUpdateReleaseControl(
                  currentUser,
                  nextRel
                );
                setReleaseControl(saved);
              }}
            />
          )}
        </div>
      </main>

      {/* Shipment Details, Accountant Estimate & Custody Slide-Over Drawer */}
      {drawerShipment && (
        <ShipmentDetailDrawer
          shipment={drawerShipment}
          state={gameState}
          onClose={() => setDrawerTrackingNumber(null)}
          onExecuteAdminAction={handleExecuteAdminShipmentAction}
          onReturnFailedShipment={handleReturnShipment}
          onAcceptShipment={handleAcceptShipmentDirect}
          onRejectShipment={handleRejectShipmentDirect}
        />
      )}

      {/* In-Game Smartphone Hub Modal (Herfok, My Employees, Ingobia Evaluation, Pricing, Auctions, Levels) */}
      {socialPhoneOpen && (
        <SocialMediaPhoneModal
          state={gameState}
          initialAppId={phoneInitialAppId}
          onClose={() => setSocialPhoneOpen(false)}
          onResolveComplaint={handleResolveSocialComplaint}
          onInspectShipment={(trk) => setDrawerTrackingNumber(trk)}
          onUpdateState={(nextState, msg) => {
            setGameState(nextState);
            if (msg) {
              setBannerMessage({ text: msg, tone: 'success' });
            }
          }}
          onAdvanceTimeMinutes={(mins, msg) => {
            setGameState((prev) =>
              syncTutorialProgress(
                advanceSimulationClock(prev, mins, true),
                activeSection,
                socialPhoneOpen
              )
            );
            if (msg) {
              setBannerMessage({ text: msg, tone: 'info' });
            }
          }}
          onOpenSection={(tab) => {
            if (tab === 'BUSINESS_DEV') setActiveSection('BUSINESS_DEVELOPER');
            else if (tab === 'HR') setActiveSection('EMPLOYEES');
            else if (tab === 'ACCOUNTING') setActiveSection('LEDGER');
            else setActiveSection(tab);
          }}
        />
      )}

      {/* Non-blocking Timed Interactive Shipment Toasts (2s NEW_ORDER, 4s AT_WAREHOUSE, 5s WITH_COURIER, 5s DELIVERED/REFUSED) */}
      <TimedShipmentToasts
        toasts={gameState.timedShipmentToasts || []}
        onSelectToast={(toastItem) => {
          if (toastItem.trackingNumber) {
            setDrawerTrackingNumber(toastItem.trackingNumber);
          }
          setActiveSection('SHIPMENTS');
        }}
        onDismissToast={(toastId) => {
          setGameState((prev) => ({
            ...prev,
            timedShipmentToasts: (prev.timedShipmentToasts || []).filter(
              (t) => t.id !== toastId
            ),
          }));
        }}
      />

      {/* Fixed Messenger-like Manager Guide & Dynamic Secretary Bubbles + In-Place Expandable Notification Banner */}
      <ManagerAndSecretaryBubbles
        state={gameState}
        onUpdateState={(updater) => {
          setGameState((prev) => updater(prev));
        }}
        onNavigateToSection={(targetSection) => {
          playSoundEffect('click', gameState.soundEnabled);
          if (targetSection === 'PHONE_MY_EMPLOYEES') {
            setPhoneInitialAppId('MY_EMPLOYEES');
            setSocialPhoneOpen(true);
          } else if (targetSection === 'PHONE_PRICING') {
            setPhoneInitialAppId('PRICING_GEO');
            setSocialPhoneOpen(true);
          } else if (targetSection === 'PHONE_HERFOK') {
            setPhoneInitialAppId('HERFOK');
            setSocialPhoneOpen(true);
          } else if (
            targetSection === 'BUSINESS_DEVELOPER' ||
            targetSection === 'EMPLOYEES' ||
            targetSection === 'LEDGER' ||
            targetSection === 'SHIPMENTS' ||
            targetSection === 'WAREHOUSE' ||
            targetSection === 'COURIERS' ||
            targetSection === 'MARKETING' ||
            targetSection === 'DEBTS' ||
            targetSection === 'MAINTENANCE' ||
            targetSection === 'COMPANY_PROFILE' ||
            targetSection === 'MAIN_CONTROL'
          ) {
            setActiveSection(targetSection);
          }
        }}
      />

      {/* Day 1 & Day 2 Interactive Tutorial Checklist Modal */}
      {tutorialModalOpen && gameState.tutorial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  دليل التوجيه التفاعلي لمدير انجوبيا اكسبريس (اليوم 1 واليوم 2)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تكتمل الخطوات تلقائياً أثناء ممارستك الفعلية لإدارة المكتب والمستودع والمناديب، مع حفظ التقدم وإمكانية التخطي أو الإعادة.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGameState((prev) => ({
                      ...prev,
                      tutorial: createInitialTutorialState(),
                    }));
                    playSoundEffect('click', gameState.soundEnabled);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold cursor-pointer"
                >
                  إعادة الشرح من البداية
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGameState((prev) => ({
                      ...prev,
                      tutorial: prev.tutorial
                        ? { ...prev.tutorial, dismissed: true }
                        : undefined,
                    }));
                    setTutorialModalOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  تخطي الشرح
                </button>
                <button
                  type="button"
                  onClick={() => setTutorialModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div>
                <h4 className="font-bold text-amber-700 mb-2">
                  خطوات اليوم الأول — التعرف على أساسيات الإدارة (8 خطوات):
                </h4>
                <div className="space-y-1.5">
                  {gameState.tutorial.steps
                    .filter((st) => st.day === 1)
                    .map((st) => (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                          st.completed
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-[#F7F4EE] border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold">
                            {st.order}. {st.titleAr}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {st.instructionAr}
                          </p>
                        </div>
                        <span className={`font-bold shrink-0 ${st.completed ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {st.completed ? '✓ مكتمل' : 'قيد التنفيذ'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#1D63B8] mb-2">
                  خطوات اليوم الثاني — التسويق والتوظيف والسوشيال ميديا (10 خطوات):
                </h4>
                <div className="space-y-1.5">
                  {gameState.tutorial.steps
                    .filter((st) => st.day === 2)
                    .map((st) => (
                      <div
                        key={st.id}
                        className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 ${
                          st.completed
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-[#F7F4EE] border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold">
                            {st.order}. {st.titleAr}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {st.instructionAr}
                          </p>
                        </div>
                        <span className={`font-bold shrink-0 ${st.completed ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {st.completed ? '✓ مكتمل' : 'قيد التنفيذ'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Company Name Customization Modal */}
      {companyNameModalOpen && cloudRecord && (
        <CompanyNameModal
          currentCompanyName={gameState.company.name}
          companyNameChangeUsed={cloudRecord.companyNameChangeUsed}
          onClose={() => setCompanyNameModalOpen(false)}
          onConfirmRenameOnce={handleConfirmCompanyRenameOnce}
        />
      )}

      {/* Concise Intro Operational Briefing Card */}
      {gameState.phase === 'INTRO_STORY' && (
        <IntroStoryOverlay
          currentStep={gameState.introStep}
          onNextStep={() => {
            playSoundEffect('click', gameState.soundEnabled);
            setGameState((prev) => ({
              ...prev,
              introStep: Math.min(2, prev.introStep + 1),
            }));
          }}
          onPrevStep={() => {
            playSoundEffect('click', gameState.soundEnabled);
            setGameState((prev) => ({
              ...prev,
              introStep: Math.max(0, prev.introStep - 1),
            }));
          }}
          onStartDayOne={() => {
            playSoundEffect('success', gameState.soundEnabled);
            setGameState((prev) => ({
              ...prev,
              phase: 'OFFICE_PLAY',
            }));
          }}
        />
      )}

      {/* End of Day Summary Report Modal */}
      {gameState.phase === 'DAY_END_REPORT' && latestDayReport && (
        <DayEndReportModal
          report={latestDayReport}
          isOnline={isOnline}
          sponsoredAdConfig={releaseControl.sponsoredAdGate}
          onStartNextDay={handleStartNextDay}
        />
      )}

      {/* Insolvency / Operational Crisis OR 10-Day Checkpoint Rollback Modal */}
      {(gameState.insolvencyCrisis?.active ||
        checkpointModalOpen ||
        confirmNewGameOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 safe-game-shell">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {gameState.insolvencyCrisis?.active
                  ? `⚠️ ${gameState.insolvencyCrisis.titleAr}`
                  : 'استرجاع آخر 10 أيام سابقة أو العودة لليوم الأول'}
              </h3>
              {!gameState.insolvencyCrisis?.active && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckpointModalOpen(false);
                    setConfirmNewGameOpen(false);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  إغلاق
                </button>
              )}
            </div>

            {gameState.insolvencyCrisis?.active ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs text-rose-900 leading-relaxed">
                <p>{gameState.insolvencyCrisis.descriptionAr}</p>
                {gameState.insolvencyCrisis.departedEmployeeNames &&
                  gameState.insolvencyCrisis.departedEmployeeNames.length > 0 && (
                    <div className="pt-1 font-semibold text-amber-800">
                      الموظفون المغادرون لعدم صرف الرواتب:{' '}
                      {gameState.insolvencyCrisis.departedEmployeeNames.join('، ')}
                    </div>
                  )}
                {gameState.insolvencyCrisis.brokenEquipmentLabels &&
                  gameState.insolvencyCrisis.brokenEquipmentLabels.length > 0 && (
                    <div className="pt-1 font-semibold text-rose-800">
                      الأعطال التشغيلية الحالية:{' '}
                      {gameState.insolvencyCrisis.brokenEquipmentLabels.join(' · ')}
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                نظراً لأن النظام المالي يمنع الديون أو الرصيد السالب، يمكنك في أي وقت عند تعثر السيولة أو تعطل المركبات وماكينات الفرز اختيار <strong>العودة لآخر 10 أيام سابقة</strong> لتصحيح قراراتك الإدارية، أو <strong>العودة لليوم الأول</strong> مع الاحتفاظ باسم شركتك المسجل.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              {!gameState.insolvencyCrisis?.active && (
                <button
                  type="button"
                  onClick={() => {
                    setCheckpointModalOpen(false);
                    setConfirmNewGameOpen(false);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  إلغاء والعودة للمكتب
                </button>
              )}

              <button
                type="button"
                onClick={handleRollbackTenDays}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer whitespace-nowrap shadow-xs"
              >
                ⏪ العودة لآخر 10 أيام سابقة (استرجاع نقطة الحفظ)
              </button>

              <button
                type="button"
                onClick={handleConfirmResetNewGame}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer whitespace-nowrap shadow-xs"
              >
                العودة لليوم الأول (دورة جديدة)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Tycoon Navigation Dock (Mobile-First 3D Tycoon Experience) */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-md safe-game-shell">
        <div className="max-w-md mx-auto flex items-center justify-around gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveSection('MAIN_CONTROL');
              setHudDetailsOpen(false);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeSection === 'MAIN_CONTROL'
                ? 'bg-[#1D63B8] text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-base sm:text-lg">🏢</span>
            <span className="text-[10px] font-bold mt-0.5">المقر 3D</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('SHIPMENTS');
              setHudDetailsOpen(false);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
              activeSection === 'SHIPMENTS'
                ? 'bg-[#1D63B8] text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-base sm:text-lg">📦</span>
            <span className="text-[10px] font-bold mt-0.5">الطرود</span>
            {activeShipments.length > 0 && (
              <span className="absolute -top-1 right-1 px-1 rounded-full bg-amber-500 text-white text-[9px] font-mono-num font-black">
                {activeShipments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('COURIERS');
              setHudDetailsOpen(false);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeSection === 'COURIERS'
                ? 'bg-[#1D63B8] text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-base sm:text-lg">🚚</span>
            <span className="text-[10px] font-bold mt-0.5">الأسطول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('EMPLOYEES');
              setHudDetailsOpen(false);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeSection === 'EMPLOYEES'
                ? 'bg-[#1D63B8] text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-base sm:text-lg">👥</span>
            <span className="text-[10px] font-bold mt-0.5">الموظفين</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSection('LEDGER');
              setHudDetailsOpen(false);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeSection === 'LEDGER'
                ? 'bg-[#1D63B8] text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-base sm:text-lg">💰</span>
            <span className="text-[10px] font-bold mt-0.5">الخزينة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSocialPhoneOpen(true);
              setHudDetailsOpen(false);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer relative"
          >
            <span className="text-base sm:text-lg">📱</span>
            <span className="text-[10px] font-bold mt-0.5">الهاتف</span>
            {unresolvedSocialComplaintsCount > 0 && (
              <span className="absolute -top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setHudDetailsOpen((prev) => !prev);
              setSpeedDropdownOpen(false);
              playSoundEffect('click', gameState.soundEnabled);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              hudDetailsOpen
                ? 'bg-[#1D63B8] text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="text-base sm:text-lg">⚙️</span>
            <span className="text-[10px] font-bold mt-0.5">المزيد</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
