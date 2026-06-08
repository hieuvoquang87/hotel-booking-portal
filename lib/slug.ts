export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildSlugLookup(values: string[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const value of values) {
    lookup.set(slugify(value), value);
  }
  return lookup;
}
