"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ExperiwallConfig, ExperiwallEvent, InitResponse } from "./lib/types";
import { fetchInit, registerFlag } from "./lib/api-client";
import { EventBatcher } from "./lib/event-batcher";
import { getCached, setCache } from "./lib/cache";

function getCacheKey(userId?: string, aliasId?: string): string {
  const identity = userId || aliasId || "anon";
  return `experiwall_init_${identity}`;
}

export interface ExperiwallContextValue {
  userSeed: number | null;
  assignments: Record<string, string>;
  experiments: InitResponse["experiments"];
  isLoading: boolean;
  error: Error | null;
  trackEvent: (event: ExperiwallEvent) => void;
  registerLocalFlag: (
    flagKey: string,
    variants: string[],
    assignedVariant: string
  ) => void;
  providerConfig: ExperiwallConfig;
}

export const ExperiwallContext = createContext<ExperiwallContextValue | null>(
  null
);

export function ExperiwallProvider({
  children,
  ...config
}: ExperiwallConfig & { children: ReactNode }) {
  const [userSeed, setUserSeed] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [experiments, setExperiments] = useState<InitResponse["experiments"]>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const batcherRef = useRef<EventBatcher | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      // Check cache first (keyed by user identity)
      const cacheKey = getCacheKey(config.userId, config.aliasId);
      const cached = getCached<InitResponse>(cacheKey);
      if (cached) {
        setUserSeed(cached.user_seed);
        setAssignments(cached.assignments);
        setExperiments(cached.experiments);
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchInit(config.apiKey, {
          baseUrl: config.baseUrl,
          userId: config.userId,
          aliasId: config.aliasId,
        });
        if (!cancelled) {
          setUserSeed(data.user_seed);
          setAssignments(data.assignments);
          setExperiments(data.experiments);
          setCache(cacheKey, data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch init")
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    // Start event batcher
    const batcher = new EventBatcher({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      userId: config.userId,
      aliasId: config.aliasId,
    });
    batcher.start();
    batcherRef.current = batcher;

    // Flush with keepalive on page unload (don't stop — user may cancel navigation)
    const handleBeforeUnload = () => batcher.flush(true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      batcher.stop(); // stop() internally flushes with keepalive
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.apiKey, config.userId, config.aliasId]);

  const trackEvent = useCallback((event: ExperiwallEvent) => {
    batcherRef.current?.push(event);
  }, []);

  const registerLocalFlag = useCallback(
    (flagKey: string, variants: string[], assignedVariant: string) => {
      // Optimistically add to local assignments
      setAssignments((prev) => ({ ...prev, [flagKey]: assignedVariant }));

      // Async register with server (fire-and-forget)
      registerFlag(
        config.apiKey,
        {
          flag_key: flagKey,
          variants,
          assigned_variant: assignedVariant,
          user_id: config.userId,
          alias_id: config.aliasId,
        },
        { baseUrl: config.baseUrl }
      ).catch(() => {
        // Silent failure — local assignment is authoritative
      });
    },
    [config.apiKey, config.baseUrl, config.userId, config.aliasId]
  );

  return (
    <ExperiwallContext.Provider
      value={{
        userSeed,
        assignments,
        experiments,
        isLoading,
        error,
        trackEvent,
        registerLocalFlag,
        providerConfig: config,
      }}
    >
      {children}
    </ExperiwallContext.Provider>
  );
}
