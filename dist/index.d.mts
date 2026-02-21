import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';

interface InitResponse {
    user_seed: number;
    assignments: Record<string, string>;
}
interface FlagRegistration {
    flag_key: string;
    variants: string[];
    assigned_variant: string;
    user_id?: string;
    alias_id?: string;
}
interface FlagRegistrationResponse {
    variant: string;
}
interface ExperiwallEvent {
    event_name: string;
    experiment_key?: string;
    variant_key?: string;
    timestamp?: string;
    properties?: Record<string, unknown>;
}
interface ExperiwallConfig {
    apiKey: string;
    baseUrl?: string;
    userId?: string;
    aliasId?: string;
}

interface ExperiwallContextValue {
    userSeed: number | null;
    assignments: Record<string, string>;
    isLoading: boolean;
    error: Error | null;
    trackEvent: (event: ExperiwallEvent) => void;
    registerLocalFlag: (flagKey: string, variants: string[], assignedVariant: string) => void;
    providerConfig: ExperiwallConfig;
}
declare function ExperiwallProvider({ children, ...config }: ExperiwallConfig & {
    children: ReactNode;
}): react_jsx_runtime.JSX.Element;

/**
 * Access the Experiwall SDK context.
 * Must be used within an <ExperiwallProvider>.
 */
declare function useExperiwall(): ExperiwallContextValue;

/**
 * Get the assigned variant for an experiment flag.
 *
 * - Returns the variant string synchronously if the flag is known
 *   (either from /init or a previous call).
 * - Returns `null` only during the initial /init fetch.
 * - For unknown flags, buckets locally (sync) and registers with
 *   the server async.
 * - Automatically tracks a `$exposure` event once per mount.
 */
declare function useExperiment(flagKey: string, variants: string[]): string | null;

/**
 * Returns a `track` function for sending custom events.
 *
 * Usage:
 * ```tsx
 * const track = useTrack();
 * track('purchase', { revenue: 9.99 });
 * ```
 */
declare function useTrack(): (eventName: string, properties?: Record<string, unknown>) => void;

export { type ExperiwallConfig, type ExperiwallContextValue, type ExperiwallEvent, ExperiwallProvider, type FlagRegistration, type FlagRegistrationResponse, type InitResponse, useExperiment, useExperiwall, useTrack };
