/**
 * Client-side experiment bucketing.
 * MUST match the server-side selectExperimentVariant() algorithm exactly:
 * cumulative weights, `seed < cumulative`, equal distribution with
 * remainder on the last variant.
 */

/**
 * Deterministically bucket a user into a variant.
 * Uses the same cumulative-weight algorithm as the server.
 */
export function bucketLocally(
  variants: string[],
  userSeed: number
): string | null {
  if (variants.length === 0) return null;

  // Equal-weight distribution with remainder on last variant
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
