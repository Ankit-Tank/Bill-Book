/**
 * Alerts Domain Types
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertKind =
  | 'overdue'
  | 'credit_limit_exceeded'
  | 'duplicate_bill'
  | 'unusual_amount'
  | 'repeat_late_payer';

export interface Alert {
  id: string;
  party_id: string | null;
  party_name?: string | null;
  kind: AlertKind | string;
  message: string;
  severity: AlertSeverity;
  dedupe_key: string;
  created_at: string;
  read_at: string | null;
}

export interface AlertFilter {
  unread_only?: boolean;
}

export interface AlertListResponse {
  alerts: Alert[];
  unread_count: number;
}

export interface MarkAlertReadResponse {
  id: string;
  read_at: string;
}

export interface RunAlertsResponse {
  triggered_count: number;
  evaluated_rules: number;
  timestamp: string;
}
