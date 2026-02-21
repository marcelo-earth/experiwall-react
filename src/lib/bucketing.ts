/**
 * Client-side experiment bucketing.
 * MUST match the server-side selectExperimentVariant() algorithm exactly:
 * cumulative weights, `seed < cumulative`, equal distribution with
 * remainder on the last variant.
 */

/**
 * Deterministically bucket a user into a variant.
 * Uses the same cumulative-weight algorithm as the server.
 *
 * If `weights` are provided (from server init response), uses them directly.
 * Otherwise falls back to equal-weight distribution for backward compat.
 */
export function bucketLocally(
  variants: string[],
  userSeed: number,
  weights?: number[]
): string | null {
  if (variants.length === 0) return null;

  const count = variants.length;

  if (weights && weights.length === count) {
    // Use server-provided weights
    let cumulative = 0;
    for (let i = 0; i < count; i++) {
      cumulative += weights[i];
      if (userSeed < cumulative) {
        return variants[i];
      }
    }
    return null;
  }

  // Fallback: equal-weight distribution with remainder on last variant
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
