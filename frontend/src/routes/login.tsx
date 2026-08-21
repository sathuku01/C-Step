import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthShell, fieldClass, labelClass, submitClass } from "../components/AuthShell";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — C-Step carbon accounting" },
      {
        name: "description",
        content:
          "Sign in to your C-Step workspace to track verified emissions, ROI-ranked reduction levers and your directory listing.",
      },
      { property: "og:title", content: "Sign in — C-Step carbon accounting" },
      {
        property: "og:description",
        content: "Access your SME carbon dashboard, verified trust tier and buyer-facing listing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { account, signIn } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const target = search.redirect?.startsWith("/") ? search.redirect : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account) navigate({ to: target, replace: true });
  }, [account, navigate, target]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      navigate({ to: target, replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your footprint, your ROI, your buyers — all in one place."
      subtitle="Pick up where you left off: live emissions, the reduction levers that pay back fastest, and the verification status buyers see."
      footer={
        <>
          New to C-Step?{" "}
          <Link to="/signup" className="text-leaf underline underline-offset-4">
            Create a workspace
          </Link>
        </>
      }
    >
      <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">Sign in</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        No backend running? Any valid email and a 6+ character password opens the demo workspace.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className={labelClass} htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.uk"
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rule bg-surface-2 px-3 py-2 text-sm text-alarm"
          >
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={submitClass}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
