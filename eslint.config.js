export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      'packages/center/src-tauri/target/**',
      'packages/center/target/**',
      '**/target/**',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
