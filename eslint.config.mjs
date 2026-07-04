import js from '@eslint/js';
import globals from 'globals';

/**
 * Root ESLint config — covers the CommonJS Node.js backend (server/, root scripts).
 * The React/TypeScript client has its own flat config at client/eslint.config.js.
 *
 * Ruleset is intentionally lenient today (existing code predates linting): style/hygiene
 * rules are warnings, only genuine-bug rules are errors so CI can gate on errors while the
 * warning backlog is burned down incrementally.
 */
export default [
  {
    ignores: [
      'node_modules/',
      'client/',
      'dist/',
      'build/',
      'paisa/',
      'coverage/',
      'drizzle/',
      'migrations/',
      '**/*.min.js',
    ],
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Genuine-bug rules — keep as errors.
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-cond-assign': 'error',

      // Hygiene — warn for now, tighten later.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': 'warn',
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-prototype-builtins': 'off',
      'no-console': 'off',
    },
  },
];
