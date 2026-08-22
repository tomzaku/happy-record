import eslint from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import jestPlugin from 'eslint-plugin-jest';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  {
    ignores: [
      'prettier.config.js',
      '.eslintrc.js',
      'vite.config.js',
      'babel.config.js',
      'jest.config.js',
      'scripts/*.js',
    ],
  },
  {
    files: ['**/*.json'],
    ignores: ['**/*.json'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}'],
    ignores: ['web/e2e/**'], // Playwright specs — 'test'/'expect' there are its own globals, not Jest's.
    languageOptions: {
      globals: jestPlugin.environments.globals.globals,
    },
  },
  {
    files: ['**/*.{tsx,ts}'],
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      jest: jestPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'module',
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        // ES6 globals
        Promise: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        // Node globals
        console: 'readonly',
      },
    },
    rules: {
      ...tseslintPlugin.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'node/no-extraneous-import': 'off',
      'no-undef': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    files: ['**/*.js'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      jest: jestPlugin,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        // ES6 globals
        Promise: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        // Node globals
        console: 'readonly',
      },
    },
    rules: {
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'node/no-extraneous-import': 'off',
      'no-undef': 'warn',
    },
  },
];
