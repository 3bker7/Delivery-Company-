import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  setLogLevel,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  migrateSaveIfNeeded,
  saveGameToStorage,
  validateSavedGameState,
} from '../engine/saveSystem';
import { createInitialGameState } from '../engine/storyEngine';
import { GameState } from '../types/game';

// Silence internal @firebase/firestore connection/token retry logs when operating in offline/local-mirror mode
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const LOCAL_PLAYER_RECORD_PREFIX = 'ingobia_express_player_record_v2_';
const LOCAL_RELEASE_CONTROL_KEY = 'ingobia_express_release_control_v2';
const LOCAL_SESSION_USER_KEY = 'ingobia_express_local_user_v2';

let cloudSyncAvailable = true;
let authTokenCheckedForUid: string | null = null;

function isCloudOrTokenError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('token-service-api') ||
    msg.includes('Fetching auth token failed') ||
    msg.includes('the client is offline') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('unavailable') ||
    msg.includes('network-request-failed') ||
    msg.includes('internal-error')
  );
}

async function ensureCloudReadyForUser(user?: User | null): Promise<boolean> {
  if (!cloudSyncAvailable) {
    return false;
  }
  if (!user) {
    return cloudSyncAvailable;
  }
  // Local fallback user object (does not use remote Firebase Auth token endpoint)
  if (typeof user.getIdToken !== 'function' || user.uid.startsWith('local-')) {
    return false;
  }
  if (authTokenCheckedForUid === user.uid) {
    return cloudSyncAvailable;
  }
  try {
    await user.getIdToken();
    authTokenCheckedForUid = user.uid;
    return true;
  } catch {
    cloudSyncAvailable = false;
    return false;
  }
}

export function createLocalManagerUser(): User {
  const fallback = {
    uid: 'local-manager-ingobia',
    displayName: 'مدير التشغيل التنفيذي',
    email: 'manager@ingobia.local',
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [
      {
        providerId: 'local',
        uid: 'local-manager-ingobia',
        displayName: 'مدير التشغيل التنفيذي',
        email: 'manager@ingobia.local',
        phoneNumber: null,
        photoURL: null,
      },
    ],
  } as unknown as User;

  try {
    window.localStorage.setItem(
      LOCAL_SESSION_USER_KEY,
      JSON.stringify({
        uid: fallback.uid,
        displayName: fallback.displayName,
        email: fallback.email,
      })
    );
  } catch {
    // Ignore storage quota errors
  }

  return fallback;
}

export function loadSavedLocalManagerUser(): User | null {
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_USER_KEY);
    if (!raw) return null;
    return createLocalManagerUser();
  } catch {
    return null;
  }
}

export function clearSavedLocalManagerUser(): void {
  try {
    window.localStorage.removeItem(LOCAL_SESSION_USER_KEY);
  } catch {
    // Ignore
  }
}

function loadLocalPlayerRecordMirror(uid: string): PlayerCloudRecord | null {
  try {
    const raw = window.localStorage.getItem(`${LOCAL_PLAYER_RECORD_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerCloudRecord;
    if (!parsed || typeof parsed !== 'object' || !parsed.gameState) {
      return null;
    }
    const migrated = migrateSaveIfNeeded(parsed.gameState);
    const validState = validateSavedGameState(migrated)
      ? migrated
      : createInitialGameState();

    validState.company.name =
      typeof parsed.companyName === 'string' &&
      parsed.companyName !== 'شركة النيل السريع للشحن'
        ? parsed.companyName
        : 'انجوبيا اكسبريس — Ingobia Express';

    let stagingState: GameState | undefined;
    if (parsed.stagingGameState) {
      const migStaging = migrateSaveIfNeeded(parsed.stagingGameState);
      if (validateSavedGameState(migStaging)) {
        stagingState = migStaging;
      }
    }

    return {
      uid,
      displayName: parsed.displayName || 'مدير الشركة',
      companyName: validState.company.name,
      companyNameChangeUsed: Boolean(parsed.companyNameChangeUsed),
      saveVersion: validState.saveVersion,
      currentDay: validState.company.currentDay,
      cashPiastres: validState.company.cashPiastres,
      gameState: validState,
      stagingGameState: stagingState,
    };
  } catch {
    return null;
  }
}

function saveLocalPlayerRecordMirror(record: PlayerCloudRecord): void {
  try {
    window.localStorage.setItem(
      `${LOCAL_PLAYER_RECORD_PREFIX}${record.uid}`,
      JSON.stringify(record)
    );
  } catch {
    // Ignore quota errors
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: boolean | string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  if (isCloudOrTokenError(error)) {
    cloudSyncAvailable = false;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreServerConnection(
  user?: User | null
): Promise<boolean> {
  const canUseCloud = await ensureCloudReadyForUser(user ?? auth.currentUser);
  if (!canUseCloud) {
    // Gracefully operate in local-first persistence mode when cloud token API is disabled or offline
    return true;
  }
  try {
    await getDocFromServer(doc(db, 'release_control', 'global'));
    return true;
  } catch (error) {
    if (isCloudOrTokenError(error)) {
      cloudSyncAvailable = false;
    }
    return true;
  }
}

export function isVerifiedAdminUser(user: User | null): boolean {
  if (!user) return false;
  return (
    user.emailVerified === true &&
    user.email?.toLowerCase() === 'a7med3bker@gmail.com'
  );
}

/**
 * Strips undefined keys recursively so Firestore native maps never reject undefined properties.
 */
export function sanitizeForFirestoreMap<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export interface PlayerCloudRecord {
  uid: string;
  displayName: string;
  companyName: string;
  companyNameChangeUsed: boolean;
  saveVersion: number;
  currentDay: number;
  cashPiastres: number;
  gameState: GameState;
  stagingGameState?: GameState;
}

/**
 * Validates company name length (3-60 chars) and forbids empty or invalid control characters.
 */
export function validateCompanyNameInput(rawName: string): {
  valid: boolean;
  sanitized: string;
  error?: string;
} {
  const trimmed = rawName.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 3) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'يجب ألا يقل اسم الشركة عن 3 أحرف.',
    };
  }
  if (trimmed.length > 60) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'يجب ألا يتجاوز اسم الشركة 60 حرفاً.',
    };
  }
  if (/[<>\\/{}[\]$%^~`|]/.test(trimmed)) {
    return {
      valid: false,
      sanitized: trimmed,
      error: 'اسم الشركة يحتوي على رموز غير مسموح بها.',
    };
  }
  return { valid: true, sanitized: trimmed };
}

export async function signInWithGoogleAccount(): Promise<User> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    clearSavedLocalManagerUser();
    return credential.user;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('token-service-api') ||
      msg.includes('operation-not-allowed') ||
      msg.includes('unauthorized-domain') ||
      msg.includes('auth-domain-config-required')
    ) {
      cloudSyncAvailable = false;
      return createLocalManagerUser();
    }
    throw error;
  }
}

export async function signOutCurrentAccount(): Promise<void> {
  clearSavedLocalManagerUser();
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors if token service is disabled
  }
}

function createOrRestoreLocalProfile(
  user: User,
  localFallbackState?: GameState | null
): PlayerCloudRecord {
  const existingMirror = loadLocalPlayerRecordMirror(user.uid);
  if (existingMirror) {
    return existingMirror;
  }

  const initialGameState =
    localFallbackState && validateSavedGameState(localFallbackState)
      ? sanitizeForFirestoreMap(localFallbackState)
      : sanitizeForFirestoreMap(createInitialGameState());

  if (initialGameState.company.name === 'شركة النيل السريع للشحن') {
    initialGameState.company.name = 'انجوبيا اكسبريس — Ingobia Express';
  }

  const record: PlayerCloudRecord = {
    uid: user.uid,
    displayName: (user.displayName || 'مدير التشغيل').slice(0, 100),
    companyName: initialGameState.company.name.slice(0, 60),
    companyNameChangeUsed: false,
    saveVersion: initialGameState.saveVersion,
    currentDay: initialGameState.company.currentDay,
    cashPiastres: initialGameState.company.cashPiastres,
    gameState: initialGameState,
  };

  saveLocalPlayerRecordMirror(record);
  saveGameToStorage(record.gameState);
  return record;
}

/**
 * Loads the authenticated player's cloud record from `/players/{uid}`.
 * Seamlessly falls back to the local record mirror if Firestore or Token Service API is unavailable.
 */
export async function loadOrCreatePlayerCloudProfile(
  user: User,
  localFallbackState?: GameState | null
): Promise<PlayerCloudRecord> {
  const canUseCloud = await ensureCloudReadyForUser(user);
  if (!canUseCloud) {
    return createOrRestoreLocalProfile(user, localFallbackState);
  }

  const playerRef = doc(db, 'players', user.uid);

  let snap;
  try {
    snap = await getDoc(playerRef);
  } catch (err) {
    cloudSyncAvailable = false;
    return createOrRestoreLocalProfile(user, localFallbackState);
  }

  if (snap.exists()) {
    const data = snap.data();
    const migrated = migrateSaveIfNeeded(data.gameState);
    const validState = validateSavedGameState(migrated)
      ? migrated
      : createInitialGameState();

    validState.company.name =
      typeof data.companyName === 'string' &&
      data.companyName !== 'شركة النيل السريع للشحن'
        ? data.companyName
        : 'انجوبيا اكسبريس — Ingobia Express';

    let stagingState: GameState | undefined;
    if (data.stagingGameState) {
      const migStaging = migrateSaveIfNeeded(data.stagingGameState);
      if (validateSavedGameState(migStaging)) {
        stagingState = migStaging;
      }
    }

    const loadedRecord: PlayerCloudRecord = {
      uid: user.uid,
      displayName: data.displayName || user.displayName || 'مدير الشركة',
      companyName: validState.company.name,
      companyNameChangeUsed: Boolean(data.companyNameChangeUsed),
      saveVersion: validState.saveVersion,
      currentDay: validState.company.currentDay,
      cashPiastres: validState.company.cashPiastres,
      gameState: validState,
      stagingGameState: stagingState,
    };

    saveLocalPlayerRecordMirror(loadedRecord);
    return loadedRecord;
  }

  // First login for this Google account
  const initialGameState =
    localFallbackState && validateSavedGameState(localFallbackState)
      ? sanitizeForFirestoreMap(localFallbackState)
      : sanitizeForFirestoreMap(createInitialGameState());

  const safeDisplayName = (user.displayName || 'مدير التشغيل').slice(0, 100);
  const safeCompanyName = initialGameState.company.name.slice(0, 60);
  const safeEmail = (user.email || 'verified@user').slice(0, 160);

  const newRecord: PlayerCloudRecord = {
    uid: user.uid,
    displayName: safeDisplayName,
    companyName: safeCompanyName,
    companyNameChangeUsed: false,
    saveVersion: initialGameState.saveVersion,
    currentDay: initialGameState.company.currentDay,
    cashPiastres: initialGameState.company.cashPiastres,
    gameState: initialGameState,
  };

  saveLocalPlayerRecordMirror(newRecord);

  const batch = writeBatch(db);
  batch.set(playerRef, {
    uid: user.uid,
    displayName: safeDisplayName,
    companyName: safeCompanyName,
    companyNameChangeUsed: false,
    saveVersion: initialGameState.saveVersion,
    currentDay: initialGameState.company.currentDay,
    cashPiastres: initialGameState.company.cashPiastres,
    gameState: initialGameState,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const privateRef = doc(db, 'players', user.uid, 'private', 'info');
  batch.set(privateRef, {
    uid: user.uid,
    email: safeEmail,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch {
    cloudSyncAvailable = false;
  }

  return newRecord;
}

/**
 * Saves the player's current game state (or admin staging game state) to `/players/{uid}`
 * and always updates the local mirror so zero progress is ever lost.
 */
export async function savePlayerGameProgressToCloud(
  user: User,
  gameState: GameState,
  options?: {
    isStagingMode?: boolean;
    existingStagingState?: GameState;
    baseRecord?: PlayerCloudRecord | null;
  }
): Promise<PlayerCloudRecord> {
  const sanitizedState = sanitizeForFirestoreMap(gameState);

  // Use passed baseRecord if available to avoid expensive localStorage JSON.parse + migrateSaveIfNeeded on every save
  const existingLocal =
    options?.baseRecord ?? loadLocalPlayerRecordMirror(user.uid);
  const nextLocalRecord: PlayerCloudRecord = existingLocal
    ? options?.isStagingMode
      ? {
          ...existingLocal,
          stagingGameState: sanitizedState,
        }
      : {
          ...existingLocal,
          saveVersion: sanitizedState.saveVersion,
          currentDay: sanitizedState.company.currentDay,
          cashPiastres: sanitizedState.company.cashPiastres,
          gameState: sanitizedState,
          stagingGameState: options?.existingStagingState
            ? sanitizeForFirestoreMap(options.existingStagingState)
            : existingLocal.stagingGameState,
        }
    : {
        uid: user.uid,
        displayName: (user.displayName || 'مدير التشغيل').slice(0, 100),
        companyName: sanitizedState.company.name,
        companyNameChangeUsed: false,
        saveVersion: sanitizedState.saveVersion,
        currentDay: sanitizedState.company.currentDay,
        cashPiastres: sanitizedState.company.cashPiastres,
        gameState: sanitizedState,
      };
  saveLocalPlayerRecordMirror(nextLocalRecord);

  const canUseCloud = await ensureCloudReadyForUser(user);
  if (!canUseCloud) {
    return nextLocalRecord;
  }

  const playerRef = doc(db, 'players', user.uid);

  const updatePayload: Record<string, unknown> = {
    displayName: (user.displayName || 'مدير التشغيل').slice(0, 100),
    updatedAt: serverTimestamp(),
  };

  if (options?.isStagingMode) {
    updatePayload.stagingGameState = sanitizedState;
  } else {
    updatePayload.saveVersion = sanitizedState.saveVersion;
    updatePayload.currentDay = sanitizedState.company.currentDay;
    updatePayload.cashPiastres = sanitizedState.company.cashPiastres;
    updatePayload.gameState = sanitizedState;
    if (options?.existingStagingState) {
      updatePayload.stagingGameState = sanitizeForFirestoreMap(
        options.existingStagingState
      );
    }
  }

  try {
    await updateDoc(playerRef, updatePayload);
  } catch {
    cloudSyncAvailable = false;
  }

  return nextLocalRecord;
}

/**
 * Executes the One-Time Company Name Change in Firestore and in the local mirror.
 */
export async function updateCompanyNameOnceInCloud(
  user: User,
  currentRecord: PlayerCloudRecord,
  newCompanyName: string
): Promise<{ updatedState: GameState; companyName: string }> {
  if (currentRecord.companyNameChangeUsed) {
    throw new Error(
      'تم استهلاك فرصة تغيير اسم الشركة المسموحة لحسابك مسبقاً ولا يمكن تغييره مرة أخرى.'
    );
  }

  const validation = validateCompanyNameInput(newCompanyName);
  if (!validation.valid) {
    throw new Error(validation.error || 'اسم الشركة غير صالح.');
  }

  if (validation.sanitized === currentRecord.companyName) {
    throw new Error('الاسم الجديد مطابق لاسم الشركة الحالي.');
  }

  const updatedGameState: GameState = sanitizeForFirestoreMap({
    ...currentRecord.gameState,
    company: {
      ...currentRecord.gameState.company,
      name: validation.sanitized,
    },
  });

  const updatedRecord: PlayerCloudRecord = {
    ...currentRecord,
    companyName: validation.sanitized,
    companyNameChangeUsed: true,
    gameState: updatedGameState,
  };
  saveLocalPlayerRecordMirror(updatedRecord);
  saveGameToStorage(updatedGameState);

  const canUseCloud = await ensureCloudReadyForUser(user);
  if (canUseCloud) {
    const playerRef = doc(db, 'players', user.uid);
    try {
      await updateDoc(playerRef, {
        companyName: validation.sanitized,
        companyNameChangeUsed: true,
        gameState: updatedGameState,
        updatedAt: serverTimestamp(),
      });
    } catch {
      cloudSyncAvailable = false;
    }
  }

  return {
    updatedState: updatedGameState,
    companyName: validation.sanitized,
  };
}

export const PERMANENT_DEV_URL =
  'https://ais-dev-gksxbk6pnvwzccvm7wel6z-193553168543.europe-west3.run.app';
export const PERMANENT_PUBLIC_URL =
  'https://ais-pre-gksxbk6pnvwzccvm7wel6z-193553168543.europe-west3.run.app';

export interface SponsoredAdGateConfig {
  enabled: boolean;
  countdownSeconds: number;
  sponsorTitleAr: string;
  adMessageAr: string;
}

export interface ReleaseHistoryItem {
  version: string;
  summary: string;
  approvedByEmail: string;
  publishedAtIso: string;
}

export interface ReleaseControlState {
  publicVersion: string;
  publicSummary: string;
  candidateVersion: string;
  candidateSummary: string;
  approvedByEmail: string;
  history: ReleaseHistoryItem[];
  sponsoredAdGate?: SponsoredAdGateConfig;
}

export const DEFAULT_RELEASE_CONTROL: ReleaseControlState = {
  publicVersion: '3.2.0-public',
  publicSummary:
    'الإصدار العام المعتمد (انجوبيا اكسبريس): استضافة أوفلاين على جهاز اللاعب + اشتراط الإنترنت لليوم الجديد + منع الديون والأرقام السالبة + نظام الوقود وصيانة الماكينات والعودة لآخر 10 أيام.',
  candidateVersion: '4.0.0-rc1',
  candidateSummary:
    'نسخة المرشح للاختبار في بيئة المطور (Staging RC 4.0): دليل المدير والسكرتير الديناميكي، محاكاة مناطق وكلني، تطبيق موظفيني، نظام توثيق المرتجعات والعقود، مع عزل كامل عن النسخة العامة.',
  approvedByEmail: 'a7med3bker@gmail.com',
  sponsoredAdGate: {
    enabled: true,
    countdownSeconds: 5,
    sponsorTitleAr: 'رعاية شركاء اللوجستيات والطاقة — انجوبيا اكسبريس',
    adMessageAr:
      'شاهد هذا العرض الترويجي القصير (5 ثوانٍ) لدعم استمرارية خوادم الحفظ السحابي والانتقال إلى يوم العمل الجديد.',
  },
  history: [
    {
      version: '3.2.0-public',
      summary:
        'تحديث شامل: منع الديون والرصيد السالب، نظام البنزين وصيانة ماكينات الفرز، استرجاع آخر 10 أيام عند التعثر، والاستضافة المحلية مع حفظ اليوم الجديد عبر الإنترنت.',
      approvedByEmail: 'a7med3bker@gmail.com',
      publishedAtIso: '2026-10-23T19:30:00.000Z',
    },
    {
      version: '3.0.0-public',
      summary:
        'إطلاق التحديث الشامل للعبة انجوبيا اكسبريس (التسويق، الموارد البشرية، المحاسبة، المستودع، والسوشيال ميديا).',
      approvedByEmail: 'a7med3bker@gmail.com',
      publishedAtIso: '2026-10-23T10:00:00.000Z',
    },
  ],
};

export async function loadGlobalReleaseControl(): Promise<ReleaseControlState> {
  if (!cloudSyncAvailable) {
    try {
      const localRaw = window.localStorage.getItem(LOCAL_RELEASE_CONTROL_KEY);
      if (localRaw) {
        const parsed = JSON.parse(localRaw) as ReleaseControlState;
        return {
          ...DEFAULT_RELEASE_CONTROL,
          ...parsed,
          sponsoredAdGate:
            parsed.sponsoredAdGate || DEFAULT_RELEASE_CONTROL.sponsoredAdGate,
        };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_RELEASE_CONTROL;
  }

  const ref = doc(db, 'release_control', 'global');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return DEFAULT_RELEASE_CONTROL;
    }
    const data = snap.data();
    return {
      publicVersion: data.publicVersion || DEFAULT_RELEASE_CONTROL.publicVersion,
      publicSummary: data.publicSummary || DEFAULT_RELEASE_CONTROL.publicSummary,
      candidateVersion:
        data.candidateVersion || DEFAULT_RELEASE_CONTROL.candidateVersion,
      candidateSummary:
        data.candidateSummary || DEFAULT_RELEASE_CONTROL.candidateSummary,
      approvedByEmail:
        data.approvedByEmail || DEFAULT_RELEASE_CONTROL.approvedByEmail,
      sponsoredAdGate:
        (data.sponsoredAdGate as SponsoredAdGateConfig) ||
        DEFAULT_RELEASE_CONTROL.sponsoredAdGate,
      history: Array.isArray(data.history)
        ? (data.history as ReleaseHistoryItem[])
        : DEFAULT_RELEASE_CONTROL.history,
    };
  } catch {
    cloudSyncAvailable = false;
    return DEFAULT_RELEASE_CONTROL;
  }
}

/**
 * Promotes the candidate release (or rolls back to a prior version) in `/release_control/global`.
 * Strictly restricted to the verified admin (`a7med3bker@gmail.com`) both in code and in `firestore.rules`.
 */
export async function publishOrUpdateReleaseControl(
  user: User | null,
  nextRelease: ReleaseControlState
): Promise<ReleaseControlState> {
  if (!isVerifiedAdminUser(user)) {
    throw new Error(
      'غير مصرح: هذا الإجراء مقتصر حصرياً على حساب المسؤول الموثق (a7med3bker@gmail.com).'
    );
  }

  const boundedHistory = nextRelease.history.slice(0, 20);
  const resultState: ReleaseControlState = {
    ...nextRelease,
    sponsoredAdGate:
      nextRelease.sponsoredAdGate || DEFAULT_RELEASE_CONTROL.sponsoredAdGate,
    history: boundedHistory,
  };

  try {
    window.localStorage.setItem(
      LOCAL_RELEASE_CONTROL_KEY,
      JSON.stringify(resultState)
    );
  } catch {
    // Ignore
  }

  const canUseCloud = await ensureCloudReadyForUser(user);
  if (!canUseCloud) {
    return resultState;
  }

  const ref = doc(db, 'release_control', 'global');
  const payload = {
    publicVersion: nextRelease.publicVersion.slice(0, 32),
    publicSummary: nextRelease.publicSummary.slice(0, 600),
    candidateVersion: nextRelease.candidateVersion.slice(0, 32),
    candidateSummary: nextRelease.candidateSummary.slice(0, 600),
    approvedByEmail: (user?.email || 'a7med3bker@gmail.com').slice(0, 160),
    sponsoredAdGate: sanitizeForFirestoreMap(
      nextRelease.sponsoredAdGate || DEFAULT_RELEASE_CONTROL.sponsoredAdGate
    ),
    history: sanitizeForFirestoreMap(boundedHistory),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch {
    cloudSyncAvailable = false;
  }

  return resultState;
}

/**
 * Verifies active internet connectivity before allowing transition to a New Day
 * and syncs the completed day's progress to the player's account.
 */
export async function verifyOnlineAndSyncForNewDay(
  user: User | null,
  nextGameState: GameState,
  isStagingMode = false
): Promise<{ ok: boolean; errorAr?: string }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      errorAr:
        'لا يوجد اتصال بالإنترنت حالياً! يمكنك اللعب وإدارة شركتك أوفلاين على جهازك طوال اليوم، ولكن يشترط توفر اتصال بالإنترنت للانتقال إلى اليوم الجديد وحفظ التقدم على حسابك.',
    };
  }

  saveGameToStorage(nextGameState);
  if (user) {
    try {
      await savePlayerGameProgressToCloud(user, nextGameState, {
        isStagingMode,
      });
    } catch {
      // Local mirror is already updated inside savePlayerGameProgressToCloud
    }
  }
  return { ok: true };
}

