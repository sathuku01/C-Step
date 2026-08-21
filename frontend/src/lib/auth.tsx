/**
 * Session layer.
 *
 * Mirrors the data layer: every auth call first probes the local backend
 * (`POST /auth/login`, `POST /auth/signup`). If the backend is unreachable the
 * app falls back to a demo session so the whole flow stays walkable offline.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { API_BASE, checkHealth, type DataSource } from "./api";

export interface Account {
  id: string;
  email: string;
  name: string;
  company: string;
  source: DataSource;
}

const STORAGE_KEY = "verdant.session";

function readStored(): Account | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

function demoAccount(email: string, name?: string, company?: string): Account {
  const handle = email.split("@")[0] ?? "founder";
  const domain = email.split("@")[1]?.split(".")[0] ?? "company";
  const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    id: `demo_${handle}`,
    email,
    name: name?.trim() || title(handle.replace(/[._-]+/g, " ")),
    company: company?.trim() || title(domain),
    source: "mock",
  };
}

async function tryBackend(path: string, body: unknown): Promise<Account | null> {
  if (!(await checkHealth())) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as Partial<Account>;
    return {
      id: data.id ?? "live",
      email: data.email ?? String((body as { email?: string }).email ?? ""),
      name: data.name ?? "",
      company: data.company ?? "",
      source: "live",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

  useEffect(() => {
    setAccount(readStored());
    setReady(true);
  }, []);

  const persist = useCallback((next: Account | null) => {
    setAccount(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage disabled — session stays in memory */
    }
  }, []);

  const signIn = useCallback<AuthValue["signIn"]>(
    async (email, password) => {
      if (!email.includes("@")) throw new Error("Enter a valid work email.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      const live = await tryBackend("/auth/login", { email, password });
      const next = live ?? demoAccount(email);
      persist(next);
      return next;
    },
    [persist],
  );

  const signUp = useCallback<AuthValue["signUp"]>(
  async ({ email, password, name, company }) => {
    if (!name.trim()) {
      throw new Error("Tell us your name.");
    }

    if (!company.trim()) {
      throw new Error("Add your company name.");
    }

    if (!email.includes("@")) {
      throw new Error("Enter a valid work email.");
    }

    if (password.length < 6) {
      throw new Error(
        "Password must be at least 6 characters.",
      );
    }

    const response = await signup(
      email.trim(),
      password,
    );

    window.localStorage.setItem(
      TOKEN_KEY,
      response.token,
    );

    const account: Account = {
      id: response.user.id,
      email: response.user.email,
      name: name.trim(),
      company: company.trim(),
    };

    persist(account);

    return account;
  },
  [persist],
);

  const signOut = useCallback(() => persist(null), [persist]);

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
  return readStored() !== null;
}
