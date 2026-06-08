/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: ['@ianvs/prettier-plugin-sort-imports', 'prettier-plugin-tailwindcss'],
  importOrder: ['^(react|react-dom|next)(/.*)?$', '<THIRD_PARTY_MODULES>', '^@/(.*)$', '^[./]'],
};

export default config;
