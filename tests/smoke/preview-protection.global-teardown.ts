import { promises as fs } from 'node:fs';
import { previewProtectionStatePath } from './preview-protection-state';

export default async function previewProtectionTeardown() {
  await fs.rm(previewProtectionStatePath, { force: true });
}
