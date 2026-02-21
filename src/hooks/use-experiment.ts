import { useEffect, useRef } from "react";
import { useExperiwall } from "./use-experiwall";
import { bucketLocally } from "../lib/bucketing";

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
export function useExperiment(
  flagKey: string,
  variants: string[]
): string | null {
  const {
    userSeed,
    assignments,
    experiments,
    isLoading,
    trackEvent,
    registerLocalFlag,
  } = useExperiwall();

  const exposureTrackedRef = useRef(false);
  const registeredRef = useRef(false);

  // Resolve variant
  let variant: string | null = null;

  if (assignments[flagKey]) {
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

  // Track $exposure once per mount
  useEffect(() => {
    if (variant && !exposureTrackedRef.current) {
      exposureTrackedRef.current = true;
      trackEvent({
        event_name: "$exposure",
        experiment_key: flagKey,
        variant_key: variant,
      });
    }
  }, [variant, flagKey, trackEvent]);

  return variant;
}
