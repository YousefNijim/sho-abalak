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

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => {
      const appPath = path.resolve(projectRoot, 'node_modules', name);
      const rootPath = path.resolve(monorepoRoot, 'node_modules', name);
      try {
        require.resolve(appPath);
        return appPath;
      } catch {
        return rootPath;
      }
    },
  }
);

// Force singleton packages to always resolve from the app root, preventing
// duplicate instances when nested node_modules inside workspace packages
// (e.g. @shu/ui-components) contain stale versions from the old SDK.
const singletons = [
  'react',
  'react-dom',
  'react-native',
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-screens',
];
const singletonMap = Object.fromEntries(
  singletons.map((name) => [name, path.resolve(projectRoot, 'node_modules', name)])
);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonMap[moduleName]) {
    return { filePath: require.resolve(singletonMap[moduleName]), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Exclude RN debugger frontend (pure ESM with import.meta) from the web bundle.
const existingBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];
config.resolver.blockList = [
  ...existingBlockList,
  /node_modules[/\\]@react-native[/\\]debugger-frontend[/\\].*/,
];

module.exports = config;
