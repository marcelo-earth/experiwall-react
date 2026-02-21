"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ExperiwallProvider: () => ExperiwallProvider,
  useExperiment: () => useExperiment,
  useExperiwall: () => useExperiwall,
  useTrack: () => useTrack
});
module.exports = __toCommonJS(index_exports);

// src/provider.tsx
var import_react = require("react");

// src/lib/api-client.ts
var DEFAULT_BASE_URL = "https://experiwall.com";
async function fetchInit(apiKey, options) {
  const base = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/init", base);
  if (options?.userId) url.searchParams.set("user_id", options.userId);
  if (options?.aliasId) url.searchParams.set("alias_id", options.aliasId);
  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey }
  });
  if (!res.ok) {
    throw new Error(`Experiwall API error: ${res.status}`);
  }
  return res.json();
}
async function registerFlag(apiKey, registration, options) {
  const base = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/flags", base);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(registration)
  });
  if (!res.ok) {
    throw new Error(`Experiwall API error: ${res.status}`);
  }
  return res.json();
}
async function sendEvents(apiKey, events, options) {
  const base = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/events", base);
  await fetch(url.toString(), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      events,
      user_id: options?.userId,
      alias_id: options?.aliasId
    })
  });
}

// src/lib/event-batcher.ts
var FLUSH_INTERVAL_MS = 3e4;
var EventBatcher = class {
  constructor(opts) {
    this.queue = [];
    this.timer = null;
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl;
    this.userId = opts.userId;
    this.aliasId = opts.aliasId;
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
  push(event) {
    this.queue.push({
      ...event,
      timestamp: event.timestamp ?? (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try {
      await sendEvents(this.apiKey, batch, {
        baseUrl: this.baseUrl,
        userId: this.userId,
        aliasId: this.aliasId
      });
    } catch {
      this.queue.unshift(...batch);
    }
  }
};

// src/lib/cache.ts
var TTL_MS = 5 * 60 * 1e3;
function getCached(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}
function setCache(key, data) {
  try {
    const entry = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
  }
}

// src/provider.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function getCacheKey(userId, aliasId) {
  const identity = userId || aliasId || "anon";
  return `experiwall_init_${identity}`;
}
var ExperiwallContext = (0, import_react.createContext)(
  null
);
function ExperiwallProvider({
  children,
  ...config
}) {
  const [userSeed, setUserSeed] = (0, import_react.useState)(null);
  const [assignments, setAssignments] = (0, import_react.useState)({});
  const [isLoading, setIsLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const batcherRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const cacheKey = getCacheKey(config.userId, config.aliasId);
      const cached = getCached(cacheKey);
      if (cached) {
        setUserSeed(cached.user_seed);
        setAssignments(cached.assignments);
        setIsLoading(false);
        return;
      }
      try {
        const data = await fetchInit(config.apiKey, {
          baseUrl: config.baseUrl,
          userId: config.userId,
          aliasId: config.aliasId
        });
        if (!cancelled) {
          setUserSeed(data.user_seed);
          setAssignments(data.assignments);
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
    const batcher = new EventBatcher({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      userId: config.userId,
      aliasId: config.aliasId
    });
    batcher.start();
    batcherRef.current = batcher;
    return () => {
      cancelled = true;
      batcher.stop();
    };
  }, [config.apiKey, config.userId, config.aliasId]);
  const trackEvent = (0, import_react.useCallback)((event) => {
    batcherRef.current?.push(event);
  }, []);
  const registerLocalFlag = (0, import_react.useCallback)(
    (flagKey, variants, assignedVariant) => {
      setAssignments((prev) => ({ ...prev, [flagKey]: assignedVariant }));
      registerFlag(
        config.apiKey,
        {
          flag_key: flagKey,
          variants,
          assigned_variant: assignedVariant,
          user_id: config.userId,
          alias_id: config.aliasId
        },
        { baseUrl: config.baseUrl }
      ).catch(() => {
      });
    },
    [config.apiKey, config.baseUrl, config.userId, config.aliasId]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ExperiwallContext.Provider,
    {
      value: {
        userSeed,
        assignments,
        isLoading,
        error,
        trackEvent,
        registerLocalFlag,
        providerConfig: config
      },
      children
    }
  );
}

// src/hooks/use-experiwall.ts
var import_react2 = require("react");
function useExperiwall() {
  const ctx = (0, import_react2.useContext)(ExperiwallContext);
  if (!ctx) {
    throw new Error("useExperiwall must be used within <ExperiwallProvider>");
  }
  return ctx;
}

// src/hooks/use-experiment.ts
var import_react3 = require("react");

// src/lib/bucketing.ts
function bucketLocally(variants, userSeed) {
  if (variants.length === 0) return null;
  const count = variants.length;
  const baseWeight = Math.floor(100 / count);
  let cumulative = 0;
  for (let i = 0; i < count; i++) {
    const weight = i === count - 1 ? 100 - baseWeight * (count - 1) : baseWeight;
    cumulative += weight;
    if (userSeed < cumulative) {
      return variants[i];
    }
  }
  return null;
}

// src/hooks/use-experiment.ts
function useExperiment(flagKey, variants) {
  const {
    userSeed,
    assignments,
    isLoading,
    trackEvent,
    registerLocalFlag
  } = useExperiwall();
  const exposureTrackedRef = (0, import_react3.useRef)(false);
  const registeredRef = (0, import_react3.useRef)(false);
  let variant = null;
  if (assignments[flagKey]) {
    variant = assignments[flagKey];
  } else if (userSeed !== null) {
    variant = bucketLocally(variants, userSeed);
    if (variant && !registeredRef.current) {
      registeredRef.current = true;
      registerLocalFlag(flagKey, variants, variant);
    }
  }
  (0, import_react3.useEffect)(() => {
    if (variant && !exposureTrackedRef.current) {
      exposureTrackedRef.current = true;
      trackEvent({
        event_name: "$exposure",
        experiment_key: flagKey,
        variant_key: variant
      });
    }
  }, [variant, flagKey, trackEvent]);
  return variant;
}

// src/hooks/use-track.ts
var import_react4 = require("react");
function useTrack() {
  const { trackEvent } = useExperiwall();
  return (0, import_react4.useCallback)(
    (eventName, properties) => {
      trackEvent({
        event_name: eventName,
        properties
      });
    },
    [trackEvent]
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExperiwallProvider,
  useExperiment,
  useExperiwall,
  useTrack
});
