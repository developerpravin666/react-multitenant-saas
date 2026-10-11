import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { setUnauthorizedHandler } from "../../services/apiClient";
import { authService } from "./auth.service";
import type { AdminLoginInput, AuthSession, LoginInput } from "./auth.types";

const sessionKey = "auth_session";
const tokenKey = "auth_token";
const tenantIdKey = "tenant_id";
let refreshInFlight: Promise<string | null> | null = null;

function readStoredSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(sessionKey);
    return stored ? (JSON.parse(stored) as AuthSession) : null;
  } catch {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(tenantIdKey);
    return null;
  }
}

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isProductOwner: boolean;
  login: (input: LoginInput) => Promise<void>;
  adminLogin: (input: AdminLoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession);

  const clearSession = useCallback(() => {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(tenantIdKey);
    setSession(null);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const nextSession = await authService.login(input);
    localStorage.setItem(tokenKey, nextSession.token);
    localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    localStorage.setItem(tenantIdKey, nextSession.tenantId ?? "");
    setSession(nextSession);
  }, []);

  const adminLogin = useCallback(async (input: AdminLoginInput) => {
    const nextSession = await authService.adminLogin(input);
    localStorage.setItem(tokenKey, nextSession.token);
    localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    if (nextSession.tenantId) {
      localStorage.setItem(tenantIdKey, nextSession.tenantId);
    }
    setSession(nextSession);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(
    () => setUnauthorizedHandler(async () => {
      const refreshToken = readStoredSession()?.refreshToken;
      const expiredAccessToken = localStorage.getItem(tokenKey);
      if (!refreshToken || !expiredAccessToken) {
        clearSession();
        return false;
      }
      if (!refreshInFlight) {
        refreshInFlight = authService.refresh(refreshToken, expiredAccessToken)
          .then((tokens) => {
            const current = readStoredSession();
            if (!current) return null;
            const next = { ...current, ...tokens };
            localStorage.setItem(tokenKey, next.token);
            localStorage.setItem(sessionKey, JSON.stringify(next));
            localStorage.setItem(tenantIdKey, next.tenantId ?? "");
            setSession(next);
            return next.token;
          })
          .catch(() => {
            clearSession();
            return null;
          })
          .finally(() => { refreshInFlight = null; });
      }
      const token = await refreshInFlight;
      return token !== null;
    }),
    [clearSession],
  );

  const isProductOwner = Boolean(session?.isProductOwner || session?.user?.isProductOwner);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
      isProductOwner,
      login,
      adminLogin,
      logout,
    }),
    [adminLogin, isProductOwner, login, logout, session],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}
