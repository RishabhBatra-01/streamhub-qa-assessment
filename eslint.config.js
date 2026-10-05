import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import playwright from 'eslint-plugin-playwright';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist', 'node_modules', 'reports', 'test-results', 'playwright-report', '.features-gen'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['app/src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended],
    plugins: { 'react-refresh': reactRefresh },
    rules: { 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Assertions live in "Then" step definitions, which the plugin cannot see as tests.
      'playwright/no-standalone-expect': 'off',
    },
  },
);
