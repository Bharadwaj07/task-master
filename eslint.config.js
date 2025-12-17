const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'uploads/']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$' }],
      'no-console': 'off',
      'no-undef': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'multi-line'],
      'no-var': 'error',
      'prefer-const': 'error'
    }
  }
];
