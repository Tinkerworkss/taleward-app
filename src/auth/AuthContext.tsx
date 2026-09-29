import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { activeConnections, currentConnectionId, getConnection, listConnections, type Connection } from '../api/connections';

/**
 * Anmeldestatus über alle Server. „Angemeldet“ heißt: mindestens eine Verbindung mit gültigem Token.
 * Der Benutzer der aktuell geöffneten Verbindung steht in useAuth().user.
 */
interface AuthValue {
  connections: Connection[];
  active: Connection[];
  user: Connection['user'];
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => setTick((n) => n + 1);
    window.addEventListener('session-chronik:connections', update);
    return () => window.removeEventListener('session-chronik:connections', update);
  }, []);
  const active = activeConnections();
  return (
    <AuthContext.Provider value={{ connections: listConnections(), active, user: null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth außerhalb von AuthProvider');
  // Benutzer des gerade geöffneten Servers (gesetzt durch ConnectionScope)
  const id = currentConnectionId();
  return { ...ctx, user: (id && getConnection(id)?.user) || null };
}
