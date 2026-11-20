import { createContext, useContext, useState, type ReactNode } from 'react';

type Auth = { user: { id: string } | null; session: { access_token: string } | null; isGuest: boolean };
const ownerA: Auth = { user: { id: 'owner-a' }, session: { access_token: 'synthetic-a1' }, isGuest: false };
const AuthContext = createContext<Auth>(ownerA);
export function useAuth() { return useContext(AuthContext); }
export function SyntheticAuth({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth>(ownerA);
  return <AuthContext.Provider value={auth}>
    <h1>Synthetic portfolio history QA — no live accounts</h1>
    <button onClick={() => setAuth({ user: { id: 'owner-b' }, session: { access_token: 'synthetic-b1' }, isGuest: false })}>Switch to B</button>
    <button onClick={() => setAuth({ ...ownerA, session: { access_token: 'synthetic-a2' } })}>Rotate A credential</button>
    <button onClick={() => setAuth({ user: null, session: null, isGuest: true })}>Sign out</button>
    {children}
  </AuthContext.Provider>;
}
