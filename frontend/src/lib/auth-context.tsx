"use client";

/**
 * AuthContext
 * ──────────────────────────────────────────────────────────────────────────
 * Single source of truth for authentication state across the entire app.
 *
 * On login  → stores token in BOTH localStorage (JS access) and a secure
 *             cookie (dv_token) so the Next.js Edge middleware can gate routes.
 * On logout → wipes both stores and redirects to /login.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Cookie helpers ────────────────────────────────────────────────────────

function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  // HttpOnly is not settable from JS — Secure only works over HTTPS.
  // For localhost dev we omit Secure; the middleware reads the cookie server-side.
  // Use 30 days so cookie always outlives the JWT (7 days) by a safe margin.
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
}

// ── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("auth_user");

      const isValidToken =
        storedToken &&
        storedToken.trim() &&
        storedToken !== "undefined" &&
        storedToken !== "null" &&
        storedToken.startsWith("ey"); // all JWTs start with 'ey'

      if (isValidToken) {
        setToken(storedToken!);
        // Always re-stamp the cookie on mount so it never expires before the JWT
        setCookie("dv_token", storedToken!, 30);
      } else {
        // No valid token found — clear everything but don't redirect here;
        // AuthGuard & middleware handle the redirect
        localStorage.removeItem("token");
        localStorage.removeItem("auth_user");
        deleteCookie("dv_token");
        setToken(null);
        setUser(null);
      }

      if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem("auth_user");
        }
      }
    } catch {
      // Corrupt storage — clear everything
      localStorage.removeItem("token");
      localStorage.removeItem("auth_user");
      deleteCookie("dv_token");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    // Persist to both localStorage and cookie
    localStorage.setItem("token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setCookie("dv_token", newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    deleteCookie("dv_token");
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}

// ── Guard component (client-side double-check) ────────────────────────────

/**
 * Wrap any page with <AuthGuard> for a client-side safety net on top of
 * the middleware. Shows a loading state while token is being rehydrated.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [token, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-canvas)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--primary-teal)] to-cyan-400 flex items-center justify-center shadow-lg animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[var(--text-muted)]">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return <>{children}</>;
}
