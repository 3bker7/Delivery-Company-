import {
  AppNotification,
  GameState,
  ResponsibleDepartment,
} from '../types/game';
import { formatClockTime } from './financeEngine';

/**
 * Adds a deduplicated notification to the state's notification center.
 * Prevents duplicate notifications on page reload or repeated simulation ticks.
 */
export function pushNotification(
  state: GameState,
  params: {
    dedupeKey: string;
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
  }
): GameState {
  // Check if a notification with this exact dedupeKey already exists
  if (state.notifications.some((n) => n.dedupeKey === params.dedupeKey)) {
    return state;
  }

  const timeLabel = formatClockTime(state.clock.minutesFromMidnight);
  const newNotif: AppNotification = {
    id: `NOTIF-${state.company.currentDay}-${state.notifications.length + 1}`,
    dedupeKey: params.dedupeKey,
    day: state.company.currentDay,
    timeLabel,
    totalMinutes: state.clock.totalElapsedMinutes,
    trackingNumber: params.trackingNumber,
    employeeId: params.employeeId,
    title: params.title,
    message: `${timeLabel} — ${params.message}`,
    causeReasonAr: params.causeReasonAr,
    department: params.department,
    outcomeLabel: params.outcomeLabel,
    actionRequiredLabel: params.actionRequiredLabel,
    targetSection: params.targetSection,
    severity: params.severity,
    read: false,
  };

  return {
    ...state,
    notifications: [newNotif, ...state.notifications],
  };
}

export function markNotificationRead(
  state: GameState,
  notificationId: string
): GameState {
  return {
    ...state,
    notifications: state.notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    ),
  };
}

export function markAllNotificationsRead(state: GameState): GameState {
  return {
    ...state,
    notifications: state.notifications.map((n) => ({ ...n, read: true })),
  };
}
