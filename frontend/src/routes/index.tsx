import { useState, type CSSProperties, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Gauge, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { postEstimate, type EstimateResponse } from "../lib/api";
import { SECTORS, fmtTonnes, type SectorKey } from "../lib/carbon";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "C-Step — Carbon accounting built for SMEs" },
      {
        name: "description",
        content:
          "Estimate your carbon footprint in 30 seconds, connect your accounting data for verified numbers, and get listed in a trusted green supplier directory.",
      },
      { property: "og:title", content: "C-Step — Carbon accounting built for SMEs" },
      {
        property: "og:description",
        content:
          "Estimate your footprint in 30 seconds, verify it from your ledger, and turn sustainability into new business.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    icon: Gauge,
    title: "Estimate in 30 seconds",
    body: "Three inputs give you a sector-calibrated baseline and a peer comparison — before you make an account.",
  },
  {
    icon: PlugZap,
    title: "Connect, don't type",
    body: "Link accounting, bank and utility feeds. Ledger lines map to emission factors automatically; drop PDFs for OCR.",
  },
  {
    icon: ShieldCheck,
    title: "Verified, not claimed",
    body: "Trust tiers and anomaly detection keep self-reported guesses out of the public directory.",
  },
  {
    icon: Building2,
    title: "Get found by buyers",
    body: "Your verified score is exposed through the directory and a procurement API that enterprises query directly.",
  },
];

function Landing() {
  const [sector, setSector] = useState<SectorKey>("hospitality");
  const [employees, setEmployees] = useState(24);
  const [spend, setSpend] = useState(3200);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await postEstimate({ sector, employees, monthlyEnergySpend: spend });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to query backend emissions factor API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="grid gap-10 pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <div className="page-rise" style={{ "--rise-delay": "0s" } as CSSProperties}>
            <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              <Sparkles className="h-3.5 w-3.5 text-leaf" aria-hidden /> For small &amp; medium
              enterprises
            </span>
            <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
              Know your carbon.
              <br />
              <span className="text-leaf">Win the contract.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted">
              C-Step turns the data you already have — your ledger, your bank feed, your utility
              bills — into an audited emissions baseline, a live sustainability score, and a profile
              enterprise buyers can actually trust.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                className="glow-leaf inline-flex items-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Open the dashboard <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/directory"
                className="inline-flex items-center gap-2 rounded-full border border-rule px-5 py-2.5 text-sm text-ink transition-colors hover:bg-surface-2"
              >
                Browse the green directory
              </Link>
            </div>
          </div>

          {/* Micro-calculator — value before signup */}
          <form
            onSubmit={onSubmit}
            className="card-surface page-rise p-6"
            style={{ "--rise-delay": "0.12s" } as CSSProperties}
          >
            <h2 className="font-serif text-xl text-ink">Micro-calculator</h2>
            <p className="mt-1 text-sm text-ink-muted">Three inputs. Powered by Climatiq API.</p>

            <label className="mt-5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Sector
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as SectorKey)}
                className="mt-2 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2.5 font-sans text-sm normal-case tracking-normal text-ink outline-none focus:ring-2 focus:ring-leaf"
              >
                {SECTORS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                Employees
                <input
                  type="number"
                  min={1}
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2.5 font-mono text-sm tracking-normal text-ink tabular-nums outline-none focus:ring-2 focus:ring-leaf"
                />
              </label>
              <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                Energy $ / month
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={spend}
                  onChange={(e) => setSpend(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2.5 font-mono text-sm tracking-normal text-ink tabular-nums outline-none focus:ring-2 focus:ring-leaf"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {busy ? "Querying backend…" : "Estimate my footprint"}
            </button>

            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-500">
                {error}
              </div>
            )}

            {result && (
              <div className="page-rise mt-6 border-t border-rule pt-5">
                <div className="flex items-center gap-5">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                      Backend Estimated Footprint
                    </p>
                    <p className="font-serif text-3xl text-ink tabular-nums">
                      {fmtTonnes(result.co2e / 1000.0)} ({result.co2e.toFixed(1)} {result.co2e_unit})
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Factor: {result.emission_factor?.name || "Grid Electricity Mix"}
                    </p>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  className="mt-4 flex items-center justify-center gap-2 rounded-full bg-leaf px-5 py-2.5 text-sm font-medium text-primary-foreground"
                >
                  Unlock full verified report <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  Computed live by Go backend / Climatiq API
                </p>
              </div>
            )}
          </form>
        </section>

        <section
          className="page-rise mt-20 grid gap-5 sm:grid-cols-2"
          style={{ "--rise-delay": "0.24s" } as CSSProperties}
        >
          {STEPS.map((s, i) => (
            <article key={s.title} className="card-surface p-6">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                <s.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <h3 className="mt-4 font-serif text-lg text-ink">
                <span className="mr-2 font-mono text-xs text-leaf tabular-nums">0{i + 1}</span>
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
