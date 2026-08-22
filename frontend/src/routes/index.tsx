import { useState, type CSSProperties, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  CheckCircle,
  FileCheck,
  FileSpreadsheet,
  Link2,
  Search,
  Sparkles,
} from "lucide-react";import { SiteNav } from "../components/SiteNav";
import {
  postEstimate,
  createAssessment,
  type MicroEstimateResponse,
} from "../lib/api";
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

const PIPELINE_STEPS = [
  {
    step: "01",
    label: "Carbon Assessment",
    desc: "Calculate scope 1-3 footprint with Climatiq emission factors.",
    icon: FileSpreadsheet,
    color: "text-leaf bg-leaf/10 dark:bg-leaf/25",
  },
  {
    step: "02",
    label: "Evidence Upload",
    desc: "Attach bills and invoices directly to baseline entries.",
    icon: FileCheck,
    color: "text-lime bg-lime/10 dark:bg-lime/25",
  },
  {
    step: "03",
    label: "Verification Status",
    desc: "System and auditor review confirms data integrity.",
    icon: CheckCircle,
    color: "text-teal bg-teal/10 dark:bg-teal/25",
  },
  {
    step: "04",
    label: "Blockchain Anchor",
    desc: "Anchor immutable hashes to public testnet registries.",
    icon: Link2,
    color: "text-sky bg-sky/10 dark:bg-sky/25",
  },
  {
    step: "05",
    label: "Supplier ESG Profile",
    desc: "Earn Gold, Silver, or Bronze trust badges for procurement.",
    icon: Award,
    color: "text-amber bg-amber/10 dark:bg-amber/25",
  },
];

const VALUE_PROPS = [
  {
    title: "Measure Carbon",
    body: "Identify key emission clusters from utilities, fleet fuels, and logistics.",
  },
  {
    title: "Verify Instantly",
    body: "Submit document trail to upgrade your data confidence levels.",
  },
  {
    title: "Immutable Anchor",
    body: "Verify ledger integrity using cryptographic blockchain fingerprints.",
  },
  {
    title: "Discoverable Profile",
    body: "Get listed in our verified corporate marketplace to attract buyers.",
  },
];

function Landing() {
  const [sector, setSector] = useState<SectorKey>("hospitality");
  const [employees, setEmployees] = useState(24);
  const [spend, setSpend] = useState(3200);
  const [result, setResult] = useState<MicroEstimateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

 async function onSubmit(e: FormEvent) {
  e.preventDefault();
  setBusy(true);
  setError(null);

  try {
    // 1. Run the live backend calculation.
    const res = await postEstimate({
      sector,
      employees,
      monthlyEnergySpend: spend,
    });

    console.log("CALCULATION PAYLOAD:", {
  sector,
  employees,
  monthlyEnergySpend: spend,
});

    // 2. Persist the calculation as an assessment.
    await createAssessment({
      sector,
      electricity_kwh: res.annual_energy_kwh,
      electricity_evidence: "estimate",
    });

    // 3. Show the calculation result.
    setResult(res);
  } catch (err: unknown) {
    setError(
      err instanceof Error
        ? err.message
        : "Failed to calculate and save the assessment.",
    );
  } finally {
    setBusy(false);
  }
}

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Hero Section */}
        <section className="grid gap-12 pt-16 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="page-rise" style={{ "--rise-delay": "0s" } as CSSProperties}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold font-mono uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3 w-3" /> ESG Supplier Credentials
            </span>
            <h1 className="mt-6 font-serif text-5xl font-normal leading-[1.1] tracking-tight text-ink sm:text-6xl">
              Turn SME sustainability data into{" "}
              <span className="text-primary italic font-medium">trusted credentials</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
              C-Step bridges the gap between ambitious SMEs and corporate procurement policies, turning simple utility ledgers into independently verified, blockchain-anchored ESG ratings.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/95 hover:translate-y-[-1px]"
              >
                Access Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/directory"
                className="inline-flex items-center gap-2 rounded-lg border border-rule bg-surface px-6 py-3 text-sm font-semibold text-ink transition-all hover:bg-surface-2 hover:translate-y-[-1px]"
              >
                <Search className="h-4 w-4 text-ink-muted" /> Explore ESG Directory
              </Link>
            </div>
          </div>

          {/* Micro-calculator */}
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-rule bg-surface p-6 shadow-sm max-w-md w-full justify-self-center lg:justify-self-end page-rise transition-all hover:shadow-md"
            style={{ "--rise-delay": "0.08s" } as CSSProperties}
          >
            <div>
              <h2 className="font-serif text-xl text-ink">Emissions Estimator</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Run an instant lookup on the Climatiq calculation engine.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                Industry Sector
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value as SectorKey)}
                  className="mt-1.5 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2.5 font-sans text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  {SECTORS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  Personnel Count
                  <input
                    type="number"
                    min={1}
                    value={employees}
                    onChange={(e) => setEmployees(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </label>
                <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  Energy Spend ($/mo)
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={spend}
                    onChange={(e) => setSpend(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="mt-6 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/95 disabled:opacity-50"
            >
              {busy ? "Calculating & Saving..." : "Calculate & Save Assessment"}
            </button>

            {error && (
              <div className="mt-4 rounded-lg bg-alarm/10 p-3 text-xs text-alarm border border-alarm/20">
                {error}
              </div>
            )}

            {result && (
              <div className="mt-6 border-t border-rule pt-5 space-y-4 page-rise">
                <div className="rounded-lg bg-surface-2 p-4">
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
                    Emissions Factor baseline
                  </span>
                  <p className="mt-1 font-serif text-3xl font-medium tracking-tight text-ink tabular-nums">
  {fmtTonnes(result.total_tonnes)}
</p>

<p className="text-[11px] text-ink-muted mt-1 leading-normal">
  {result.total_tonnes.toFixed(2)} tonnes CO₂e annually ·
  {` ${result.annual_energy_kwh.toLocaleString()} kWh/year`}
</p>

<div className="mt-3 grid grid-cols-3 gap-2 text-center">
  <div className="rounded-md bg-surface p-2">
    <span className="block font-mono text-[9px] uppercase text-ink-faint">
      Scope 1
    </span>
    <span className="font-mono text-xs text-ink">
      {result.scope1.toFixed(2)} t
    </span>
  </div>

  <div className="rounded-md bg-surface p-2">
    <span className="block font-mono text-[9px] uppercase text-ink-faint">
      Scope 2
    </span>
    <span className="font-mono text-xs text-ink">
      {result.scope2.toFixed(2)} t
    </span>
  </div>

  <div className="rounded-md bg-surface p-2">
    <span className="block font-mono text-[9px] uppercase text-ink-faint">
      Scope 3
    </span>
    <span className="font-mono text-xs text-ink">
      {result.scope3.toFixed(2)} t
    </span>
  </div>
</div>
                </div>

                <Link
                  to="/dashboard"
                  className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 py-2.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-all"
                >
                  Create Verified Account <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </form>
        </section>

        {/* Visual Process Pipeline */}
        <section
          className="mt-24 page-rise"
          style={{ "--rise-delay": "0.16s" } as CSSProperties}
        >
          <div className="text-center max-w-xl mx-auto">
            <h2 className="font-serif text-3xl text-ink">The Trust Pipeline</h2>
            <p className="text-sm text-ink-muted mt-2">
              Our automated credential validation pipeline tracks carbon from source registry to directory exposure.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3 lg:grid-cols-5 relative">
            {PIPELINE_STEPS.map((s, idx) => (
              <div
                key={s.label}
                className="relative rounded-xl border border-rule bg-surface p-5 transition-all hover:border-primary/40 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-ink-faint">{s.step}</span>
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${s.color}`}>
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-base text-ink font-medium leading-tight">
                  {s.label}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Explain Grid: Measure, Verify, Anchor, Discover */}
        <section
          className="mt-24 border-t border-rule pt-20 page-rise"
          style={{ "--rise-delay": "0.24s" } as CSSProperties}
        >
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((v, i) => (
              <div key={v.title} className="space-y-3">
                <span className="font-mono text-[10px] text-primary bg-primary/5 border border-primary/10 rounded-full px-2 py-0.5 font-bold uppercase tracking-wider">
                  Phase {i + 1}
                </span>
                <h3 className="font-serif text-lg text-ink font-medium">{v.title}</h3>
                <p className="text-xs leading-relaxed text-ink-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
