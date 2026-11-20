import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import config from '../../../postcss.config.mjs';

describe('website Tailwind source scope', () => {
  it('scans the complete Next.js source tree rather than other monorepo apps', () => {
    expect(config.plugins['@tailwindcss/postcss'].base).toBe(fileURLToPath(new URL('../../../src', import.meta.url)));
  });
  it('uses an absolute source path independent of the build working directory', () => {
    expect(path.isAbsolute(config.plugins['@tailwindcss/postcss'].base)).toBe(true);
  });
});
