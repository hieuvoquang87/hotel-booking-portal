// Map raw seed amenity tokens to human-readable card pills.

const SPECIAL: Record<string, string> = {
  free_wifi: 'Wi-Fi',
  wifi: 'Wi-Fi',
};

export function humanizeAmenity(raw: string): string {
  if (SPECIAL[raw]) return SPECIAL[raw];
  const words = raw
    .replace(/^free[_-]/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
