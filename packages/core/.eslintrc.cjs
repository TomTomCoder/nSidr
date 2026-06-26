/**
 * Specific eslint rules for this workspace, learn how to compose
 * @link https://github.com/teableio/teable/tree/main/packages/eslint-config-bases
 */
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
    'src/formula/parser',
    'src/query/parser',
    // Committed compiled output (legacy build-into-src pattern). These .js/.d.ts files
    // are emitted alongside .ts sources by an earlier tsconfig and tracked in git so
    // downstream tooling resolves them — they MUST NOT be re-linted as TS source.
    'src/**/*.js',
    'src/**/*.d.ts',
  ],
  extends: [
    '@teable/eslint-config-bases/typescript',
    '@teable/eslint-config-bases/sonar',
    '@teable/eslint-config-bases/regexp',
    '@teable/eslint-config-bases/jest',
    // Apply prettier and disable incompatible rules
    '@teable/eslint-config-bases/prettier-plugin',
  ],
  rules: {
    // optional overrides per project
  },
  overrides: [
    // optional overrides per project file match
  ],
};
