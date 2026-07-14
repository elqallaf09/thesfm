import path from 'node:path';

export const authStateDir = path.join(process.cwd(), 'playwright', '.auth');
export const userAuthStatePath = path.join(authStateDir, 'user.json');
export const adminAuthStatePath = path.join(authStateDir, 'admin.json');
