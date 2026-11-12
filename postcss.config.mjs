import { fileURLToPath } from 'node:url';

const config = {
  plugins: {
    // The Next.js runtime is under src. Do not generate website utilities from
    // documentation, CI fixtures, patches or the independently built native apps.
    "@tailwindcss/postcss": { base: fileURLToPath(new URL('./src', import.meta.url)) },
  },
};

export default config;
