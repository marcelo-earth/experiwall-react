// ─── Init Response ──────────────────────────────────────────────

export interface InitResponse {
  user_seed: number;
  assignments: Record<string, string>;
  experiments?: Record<string, { variants: { key: string; weight: number }[] }>;
}

// ─── Flag Registration ─────────────────────────────────────────

export interface FlagRegistration {
  flag_key: string;
  variants: string[];
  assigned_variant: string;
  user_id?: string;
  alias_id?: string;
}

export interface FlagRegistrationResponse {
  variant: string;
}

// ─── Event Types ────────────────────────────────────────────────

export interface ExperiwallEvent {
  event_name: string;
  experiment_key?: string;
  variant_key?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
}

// ─── Provider Config ────────────────────────────────────────────

export interface ExperiwallConfig {
  apiKey: string;
  baseUrl?: string;
  userId?: string;
  aliasId?: string;
}
