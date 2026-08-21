import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { request, TOKEN_KEY, register, type LoginResponse } from "./api";

export interface Account {
  id: string;
  email: string;
  name: string;
  company: string;
  source: "live";
}

interface AuthValue {
  account: Account | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<Account>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    company: string;
  }) => Promise<Account>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  // Restore session on startup
  useEffect(() => {
    async function restore() {
      if (typeof window === "undefined") {
        setReady(true);
        return;
      }
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setReady(true);
        return;
      }
      try {
        const user = await request<{ id: string; email: string; name: string; company: string }>("/auth/me");
        setAccount({
          id: user.id,
          email: user.email,
          name: user.name,
          company: user.company,
          source: "live",
        });
      } catch (err) {
        // Clear token since it's invalid
        window.localStorage.removeItem(TOKEN_KEY);
        setAccount(null);
      } finally {
        setReady(true);
      }
    }
    void restore();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.includes("@")) throw new Error("Enter a valid work email.");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    const res = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    window.localStorage.setItem(TOKEN_KEY, res.token);
    const next: Account = {
      id: res.user.id,
      email: res.user.email,
      name: res.user.name,
      company: res.user.company,
      source: "live",
    };
    setAccount(next);
    return next;
  }, []);

  const signUp = useCallback(async (input: {
    email: string;
    password: string;
    name: string;
    company: string;
  }) => {
    if (!input.name.trim()) throw new Error("Tell us your name.");
    if (!input.company.trim()) throw new Error("Add your company name.");
    if (!input.email.includes("@")) throw new Error("Enter a valid work email.");
    if (input.password.length < 6) throw new Error("Password must be at least 6 characters.");

    const res = await register({
      email: input.email.trim(),
      password: input.password,
      name: input.name.trim(),
      company: input.company.trim(),
    });

    window.localStorage.setItem(TOKEN_KEY, res.token);
    const next: Account = {
      id: res.user.id,
      email: res.user.email,
      name: res.user.name,
      company: res.user.company,
      source: "live",
    };
    setAccount(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    setAccount(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ account, ready, signIn, signUp, signOut }),
    [account, ready, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(TOKEN_KEY) !== null;
}
