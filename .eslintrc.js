module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['backend/**', 'web/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};

