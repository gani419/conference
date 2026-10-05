module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-redux$': '<rootDir>/node_modules/react-redux/dist/cjs/index.js',
  },
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|react-native-css-interop|nativewind|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-reanimated)/',
  ],
};
