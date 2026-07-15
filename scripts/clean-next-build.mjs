import { rmSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const buildDirectory = path.resolve(projectRoot, '.next');

if (path.dirname(buildDirectory) !== projectRoot || path.basename(buildDirectory) !== '.next') {
  throw new Error('Refusing to clean an unexpected build directory.');
}

rmSync(buildDirectory, {
  force: true,
  maxRetries: 5,
  recursive: true,
  retryDelay: 100,
});
