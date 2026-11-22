const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
// Dedicated port (matches reactNativeDevServerPort in android/gradle.properties).
const config = { server: { port: 8093 } };

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
