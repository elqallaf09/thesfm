import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultConfig } from 'expo/metro-config.js';

export default getDefaultConfig(path.dirname(fileURLToPath(import.meta.url)));
