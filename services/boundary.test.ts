import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (
        ['node_modules', 'services', 'coverage', 'dist', '.next', '.git'].includes(name) ||
        name.startsWith('.')
      ) {
        return [];
      }
      return walk(full);
    }
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

it('no module outside services/ imports the raw seed', () => {
  const root = join(__dirname, '..');
  const offenders = walk(root).filter((file) => readFileSync(file, 'utf8').includes('hotels.json'));
  expect(offenders).toEqual([]);
});
