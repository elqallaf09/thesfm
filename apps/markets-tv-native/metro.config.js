import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultConfig } from 'expo/metro-config.js';
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const config = getDefaultConfig(projectRoot);
// Share pure channel/calendar contracts, while retaining the isolated TV runtime.
config.watchFolders = [path.resolve(projectRoot, '../..')];
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
export default config;
