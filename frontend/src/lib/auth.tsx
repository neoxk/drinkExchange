import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setCsrfToken } from "./api";
import type { User } from "./types";

interface Session {
  user: User;
  csrfToken: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Session>("/auth/me")
      .then(
        (s) => {
          setCsrfToken(s.csrfToken);
          setUser(s.user);
        },
        () => setUser(null),
      )
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const s = await api<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setCsrfToken(s.csrfToken);
    setUser(s.user);
    return s.user;
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setCsrfToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti znotraj AuthProvider");
  return ctx;
}
