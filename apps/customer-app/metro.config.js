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

// Help Metro find packages that pnpm hoists into .pnpm deep paths
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) => {
      // First try the app's own node_modules, then the monorepo root
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

module.exports = config;
