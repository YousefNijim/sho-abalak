const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force singleton packages to always resolve from the app, preventing duplicates
const singletons = [
  'react',
  'react-native',
  'react-native/Libraries/Renderer/shims/ReactNative',
  '@react-navigation/native',
  '@react-navigation/bottom-tabs',
  'react-native-safe-area-context',
  'react-native-screens',
];

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => {
      return path.resolve(projectRoot, 'node_modules', name);
    },
  }
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletons.some((s) => moduleName === s || moduleName.startsWith(s + '/'))) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(projectRoot, 'index.js') },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
