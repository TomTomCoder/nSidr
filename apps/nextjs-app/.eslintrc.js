/**
 * Specific eslint rules for this app/package, extends the base rules
 * @see https://github.com/teableio/teable/blob/main/docs/about-linters.md
 */

// Workaround for https://github.com/eslint/eslint/issues/3458 (re-export of @rushstack/eslint-patch)
require('@teable/eslint-config-bases/patch/modern-module-resolution');

const { getDefaultIgnorePatterns } = require('@teable/eslint-config-bases/helpers');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: 'tsconfig.eslint.json',
  },
  ignorePatterns: [
    ...getDefaultIgnorePatterns(),
    '.next',
    '.out',
    'main',
    'tailwind.shadcnui.config.js',
    'public/streamsaver',
  ],
  extends: [
    '@teable/eslint-config-bases/typescript',
    '@teable/eslint-config-bases/sonar',
    '@teable/eslint-config-bases/regexp',
    '@teable/eslint-config-bases/jest',
    '@teable/eslint-config-bases/react',
    '@teable/eslint-config-bases/tailwind',
    '@teable/eslint-config-bases/rtl',
    // Add specific rules for nextjs
    'plugin:@next/next/core-web-vitals',
    // Apply prettier and disable incompatible rules
    '@teable/eslint-config-bases/prettier-plugin',
  ],
  rules: {
    '@typescript-eslint/naming-convention': 'off',
    // https://github.com/vercel/next.js/discussions/16832
    '@next/next/no-img-element': 'off',
    // For the sake of example
    // https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/HEAD/docs/rules/anchor-is-valid.md
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
  },
  overrides: [
    {
      files: ['src/pages/\\_*.{ts,tsx}'],
      rules: {
        'react/display-name': 'off',
      },
    },
    {
      files: ['**/*.{spec,test}.{ts,tsx}'],
      rules: {
        'react/display-name': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'jsx-a11y/click-events-have-key-events': 'off',
        'jsx-a11y/no-static-element-interactions': 'off',
      },
    },
    {
      // E2E test files and Playwright config depend on packages (@playwright/test,
      // @next/env, picocolors) installed at the workspace root. The import resolver
      // cannot walk up to the workspace root when running in a git worktree (no
      // local node_modules symlink), so disable import/no-unresolved for these
      // files. TypeScript itself validates all imports at compile time.
      files: ['e2e/**/*.{ts,tsx}', 'playwright.config.ts'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
    {
      // Workspace-package subpath imports (e.g. @teable/sdk/hooks/use-base,
      // @teable/ui-lib/shadcn/ui/button) are resolved via tsconfig paths and
      // pnpm workspace symlinks. eslint-import-resolver-typescript cannot
      // traverse pnpm's virtual store for these subpaths, producing false-positive
      // import/no-unresolved errors. TypeScript validates all imports at build
      // time, so this rule is redundant for src/ files.
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'import/no-unresolved': 'off',
      },
    },
  ],
};
