/**
 * Server-side helpers for Experiwall.
 *
 * Use this module in Next.js server components, Route Handlers,
 * or any server runtime to resolve experiments during SSR —
 * the variant is in the initial HTML with zero loading state.
 *
 * ```ts
 * import { fetchExperiments } from "@experiwall/react/server";
 *
 * // In a server component:
 * const { assignments } = await fetchExperiments({
 *   apiKey: "ew_pub_...",
 *   aliasId: cookies().get("ew_anon_id")?.value,
 * });
 * const variant = assignments["my-experiment"] ?? "control";
 * ```
 */

const DEFAULT_BASE_URL = "https://www.experiwall.com";

export interface ServerConfig {
  apiKey: string;
  baseUrl?: string;
  userId?: string;
  aliasId?: string;
  environment?: string;
}

export interface ExperimentsResponse {
  user_seed: number;
  assignments: Record<string, string>;
  experiments?: Record<string, { variants: { key: string; weight: number }[] }>;
}

/**
 * Fetch experiment assignments from the Experiwall API.
 *
 * Call this from server components to resolve variants at SSR time.
 * Pass a `userId` or `aliasId` to identify the visitor (e.g. from a cookie).
 * If neither is provided, a random ID is generated automatically so the
 * call always succeeds (useful on first visit before a cookie is set).
 */
export async function fetchExperiments(
  config: ServerConfig
): Promise<ExperimentsResponse> {
  const base = config.baseUrl ?? DEFAULT_BASE_URL;
  const url = new URL("/api/sdk/init", base);

  const aliasId = config.aliasId ?? (!config.userId ? crypto.randomUUID() : undefined);

  if (config.userId) url.searchParams.set("user_id", config.userId);
  if (aliasId) url.searchParams.set("alias_id", aliasId);
  if (config.environment) url.searchParams.set("environment", config.environment);

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": config.apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Experiwall API error: ${res.status}`);
  }

  return res.json();
}
