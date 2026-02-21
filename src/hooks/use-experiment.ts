import { useEffect, useRef } from "react";
import { useExperiwall } from "./use-experiwall";
import { bucketLocally } from "../lib/bucketing";
import type { UseExperimentOptions } from "../lib/types";

/**
 * Get the assigned variant for an experiment flag.
 *
 * - Returns the variant string synchronously if the flag is known
 *   (either from /init or a previous call).
 * - Returns `null` only during the initial /init fetch.
 * - For unknown flags, buckets locally (sync) and registers with
 *   the server async.
 * - Automatically tracks a `$exposure` event once per mount.
 *
 * Forced variants (via `options.force` or provider-level `overrides`)
 * bypass exposure tracking, server registration, and bucketing
 * entirely — no experiment data is contaminated.
 */
export function useExperiment(
  flagKey: string,
  variants: string[],
  options?: UseExperimentOptions
): string | null {
  const {
    userSeed,
    assignments,
    experiments,
    overrides,
    trackEvent,
    registerLocalFlag,
  } = useExperiwall();

  const exposureTrackedRef = useRef(false);
  const registeredRef = useRef(false);

  // Per-hook force takes precedence, then provider-level overrides.
  const forced = options?.force ?? overrides[flagKey];
  const isOverridden = forced !== undefined;

  // ─── Resolve variant ─────────────────────────────────────────
  let variant: string | null = null;

  if (isOverridden) {
    // Overridden — return directly, skip all side effects below
    variant = forced;
  } else if (assignments[flagKey]) {
    // Known flag — use server assignment
    variant = assignments[flagKey];
  } else if (userSeed !== null) {
    // Unknown flag — bucket locally using server weights if available
    const expData = experiments?.[flagKey];
    const weights = expData?.variants.map((v) => v.weight);
    variant = bucketLocally(variants, userSeed, weights);

    // Register with server (once)
    if (variant && !registeredRef.current) {
      registeredRef.current = true;
      registerLocalFlag(flagKey, variants, variant);
    }
  }
  // If userSeed is null, we're still loading — variant stays null

  // Track $exposure once per mount (skipped for overrides)
  useEffect(() => {
    if (isOverridden) return;
    if (variant && !exposureTrackedRef.current) {
      exposureTrackedRef.current = true;
      trackEvent({
        event_name: "$exposure",
        experiment_key: flagKey,
        variant_key: variant,
      });
    }
  }, [variant, flagKey, trackEvent, isOverridden]);

  return variant;
}
