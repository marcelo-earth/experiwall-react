import { useCallback } from "react";
import { useExperiwall } from "./use-experiwall";

/**
 * Returns a `track` function for sending custom events.
 *
 * Usage:
 * ```tsx
 * const track = useTrack();
 * track('purchase', { revenue: 9.99 });
 * ```
 */
export function useTrack() {
  const { trackEvent } = useExperiwall();

  return useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      trackEvent({
        event_name: eventName,
        properties,
      });
    },
    [trackEvent]
  );
}
