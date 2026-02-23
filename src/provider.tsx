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

const ANON_ID_KEY = "experiwall_anon_id";
const COOKIE_NAME = "ew_anon_id";

function getCookie(name: string): string | undefined {
  try {
    const match = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

function getOrCreateAnonId(): string {
  try {
    // Prefer the server-set cookie so client and server share one identity
    const fromCookie = getCookie(COOKIE_NAME);
    if (fromCookie) {
      localStorage.setItem(ANON_ID_KEY, fromCookie);
      return fromCookie;
    }

    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    // SSR or localStorage unavailable — ephemeral ID for this session
    return crypto.randomUUID();
  }
}

function getCacheKey(userId?: string, aliasId?: string, environment?: string): string {
  const identity = userId || aliasId || "anon";
  const env = environment || "production";
  return `experiwall_init_${identity}_${env}`;
}

export interface ExperiwallContextValue {
  userSeed: number | null;
  assignments: Record<string, string>;
  experiments: InitResponse["experiments"];
  overrides: Record<string, string>;
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
  // Auto-generate a persistent anonymous ID when no userId/aliasId is provided,
  // following the same pattern as Mixpanel, Amplitude, and PostHog.
  const [anonId] = useState(() =>
    !config.userId && !config.aliasId ? getOrCreateAnonId() : undefined
  );
  const effectiveAliasId = config.aliasId ?? anonId;

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
      const cacheKey = getCacheKey(config.userId, effectiveAliasId, config.environment);
      const cached = getCached<InitResponse>(cacheKey);
      if (cached) {
        setUserSeed(cached.user_seed);
        setAssignments(cached.assignments);
        setExperiments(cached.experiments);
        setIsLoading(false);
        return;
      }

      try {
        const environment = config.environment ?? "production";
        const data = await fetchInit(config.apiKey, {
          baseUrl: config.baseUrl,
          userId: config.userId,
          aliasId: effectiveAliasId,
          environment,
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
      aliasId: effectiveAliasId,
      environment: config.environment ?? "production",
    });
    batcher.start();
    batcherRef.current = batcher;

    // Flush when the page becomes hidden (tab switch, home screen, app kill).
    // This is the primary flush trigger — it fires reliably on both mobile
    // and desktop, unlike beforeunload which mobile browsers skip entirely.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        batcher.flush(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Desktop fallback — beforeunload fires on tab close / navigation
    // in desktop browsers where visibilitychange may not fire in time.
    const handleBeforeUnload = () => batcher.flush(true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      batcher.stop(); // stop() internally flushes with keepalive
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.apiKey, config.userId, effectiveAliasId, config.environment]);

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
          alias_id: effectiveAliasId,
        },
        { baseUrl: config.baseUrl, environment: config.environment ?? "production" }
      ).catch(() => {
        // Silent failure — local assignment is authoritative
      });
    },
    [config.apiKey, config.baseUrl, config.userId, effectiveAliasId, config.environment]
  );

  return (
    <ExperiwallContext.Provider
      value={{
        userSeed,
        assignments,
        experiments,
        overrides: config.overrides ?? {},
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
