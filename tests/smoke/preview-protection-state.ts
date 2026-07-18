import { tmpdir } from 'node:os';
import path from 'node:path';

const runScope = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
  : 'local';

export const previewProtectionStatePath = path.join(
  process.env.RUNNER_TEMP || tmpdir(),
  `sfm-preview-protection-${runScope}.json`,
);
