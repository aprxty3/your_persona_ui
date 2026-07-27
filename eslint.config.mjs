import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// FE-15: next lint (this file replaces) is deprecated and gone in Next 16 —
// migrated to plain ESLint CLI. FlatCompat translates the still-only-legacy-
// shaped `next/core-web-vitals` preset into flat config; same ruleset as
// before, just a different config format.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  // `next lint` always excluded build output; flat config doesn't do this by
  // default (only node_modules is implicit) — without this, `eslint .` lints
  // .next/standalone's bundled/minified output too.
  { ignores: ['.next/**'] },
];

export default eslintConfig;
