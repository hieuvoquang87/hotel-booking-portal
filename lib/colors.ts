/**
 * Deterministic colour utilities for the UI layer.
 *
 * These are pure functions — no side effects, no external dependencies.
 * Used by HotelCard to replace flat-gray photo placeholders with
 * stable per-hotel gradient backgrounds.
 */

/** Hash a string to a stable integer (djb2 variant). */
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Map a hotel id to a hue angle (0–359), stable across sessions. */
export function hotelIdToHue(id: string): number {
  return hashString(id) % 360;
}

/** Build a two-stop CSS gradient for a hotel placeholder photo. */
export function hotelPlaceholderGradient(id: string): string {
  const hue = hotelIdToHue(id);
  return `linear-gradient(135deg, hsl(${hue}, 35%, 82%), hsl(${hue}, 45%, 68%))`;
}
