import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthShell, fieldClass, labelClass, submitClass } from "../components/AuthShell";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your workspace — C-Step" },
      {
        name: "description",
        content:
          "Set up a C-Step workspace for your SME: baseline emissions, automated data ingestion and a verified listing for enterprise buyers.",
      },
      { property: "og:title", content: "Create your workspace — C-Step" },
      {
        property: "og:description",
        content: "Start measuring, verifying and reducing your SME carbon footprint in minutes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { account, signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account) navigate({ to: "/dashboard", replace: true });
  }, [account, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signUp({ email: email.trim(), password, name, company });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create your workspace.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="From a 30-second estimate to an audited, buyer-visible score."
      subtitle="Create a workspace to keep your baseline, connect your ledger for verified numbers, and unlock the reduction levers ranked by payback."
      footer={
        <>
          Already have a workspace?{" "}
          <Link to="/login" className="text-leaf underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <h2 className="mt-2 font-serif text-2xl tracking-tight text-ink">Create your workspace</h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        With no backend running this creates a local demo workspace — nothing leaves your browser.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
              className={fieldClass}
              autoComplete="name"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="company">
              Company
            </label>
            <input
              id="company"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Harbour Roastery"
              className={fieldClass}
              autoComplete="organization"
            />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.co.uk"
            className={fieldClass}
            autoComplete="email"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className={fieldClass}
            autoComplete="new-password"
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
          {busy ? "Setting up…" : "Create workspace"}
        </button>
      </form>
    </AuthShell>
  );
}
