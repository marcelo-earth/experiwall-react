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
  /**
   * Force specific variants for QA and testing.
   * Overridden flags skip exposure tracking, server registration,
   * and bucketing — no experiment data is contaminated.
   *
   * ```tsx
   * <ExperiwallProvider
   *   apiKey="..."
   *   overrides={{ "checkout-flow": "new-checkout" }}
   * >
   * ```
   */
  overrides?: Record<string, string>;
  /**
   * Tag events with an environment label so the dashboard can
   * segment dev traffic from production experiment results.
   * Defaults to `"production"` if omitted.
   *
   * ```tsx
   * <ExperiwallProvider
   *   apiKey="..."
   *   environment={process.env.NODE_ENV === "production" ? "production" : "development"}
   * >
   * ```
   */
  environment?: string;
}

// ─── Hook Options ───────────────────────────────────────────────

export interface UseExperimentOptions {
  /**
   * Force this hook to return a specific variant.
   * Takes precedence over provider-level overrides.
   * Skips exposure tracking and server registration.
   */
  force?: string;
}
