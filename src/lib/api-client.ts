import type {
  InitResponse,
  FlagRegistration,
  FlagRegistrationResponse,
  ExperiwallEvent,
} from "./types";

const DEFAULT_BASE_URL = "https://experiwall.com";

export async function fetchInit(
  apiKey: string,
  options?: {
    baseUrl?: string;
    userId?: string;
    aliasId?: string;
  }
): Promise<InitResponse> {
  const base = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/init", base);

  if (options?.userId) url.searchParams.set("user_id", options.userId);
  if (options?.aliasId) url.searchParams.set("alias_id", options.aliasId);

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    throw new Error(`Experiwall API error: ${res.status}`);
  }

  return res.json();
}

export async function registerFlag(
  apiKey: string,
  registration: FlagRegistration,
  options?: { baseUrl?: string }
): Promise<FlagRegistrationResponse> {
  const base = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/flags", base);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registration),
  });

  if (!res.ok) {
    throw new Error(`Experiwall API error: ${res.status}`);
  }

  return res.json();
}

export async function sendEvents(
  apiKey: string,
  events: ExperiwallEvent[],
  options?: {
    baseUrl?: string;
    userId?: string;
    aliasId?: string;
    keepalive?: boolean;
  }
): Promise<void> {
  const base = options?.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/events", base);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      events,
      user_id: options?.userId,
      alias_id: options?.aliasId,
    }),
    keepalive: options?.keepalive,
  });

  if (!res.ok) {
    const err = new Error(`Experiwall API error: ${res.status}`) as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
}
