import { useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Plug,
  TrendingDown,
  FileSpreadsheet,
  Cpu,
  Layers,
  Award,
  ArrowRight,
  Shield,
  Activity,
} from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { ScopeBar, ScoreRing, TrendChart } from "../../components/viz";
import { AssessmentCreator } from "../../components/AssessmentCreator";
import { AssessmentList } from "../../components/AssessmentList";
import { ClimatiqEstimator } from "../../components/ClimatiqEstimator";
import { ApiReferenceCard } from "../../components/ApiReferenceCard";
import { getAssessmentDashboard, getDashboard, type AssessmentResult } from "../../lib/api";
import { TIER_LABEL } from "../../data/mock";
import { fmtMoney, fmtTonnes } from "../../lib/carbon";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Emissions dashboard — Verdant" },
      {
        name: "description",
        content:
          "Live sustainability score, scope 1-3 breakdown, C-Step carbon assessments, Climatiq estimation engine, and verified data connections for your business.",
      },
      { property: "og:title", content: "Emissions dashboard — Verdant" },
      {
        property: "og:description",
        content:
          "Carbon translated into cash flow: C-Step API assessments, Climatiq emission estimates, and verified ESG profiles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type TabType = "overview" | "assessments" | "climatiq" | "api";

function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { data, isPending } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });

  const backendDashboard = useQuery({
    queryKey: ["assessment-dashboard"],
    queryFn: getAssessmentDashboard,
    refetchInterval: 15_000,
  });

  if (isPending || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <p className="mx-auto max-w-6xl px-6 py-20 font-mono text-sm text-ink-faint">
          Loading your baseline…
        </p>
      </div>
    );
  }

  const d = data.data;
  const delta = d.score - d.previousScore;
  const vsPeers = Math.round((1 - d.totalTonnes / d.peerTonnes) * 100);

  const dashTotals = backendDashboard.data?.data;
  const latestAssessment: AssessmentResult | undefined = dashTotals?.latest_assessment;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Company Header */}
        <header className="page-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-ink">{d.company.name}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              {d.company.sectorLabel} · {d.company.employees} staff · {d.company.location}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-foreground">
              {TIER_LABEL[d.company.tier]}
            </span>
          </div>
        </header>

        {/* Backend OpenAPI KPI Highlight Strip */}
        <section
          className="page-rise mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          style={{ "--rise-delay": "0.06s" } as CSSProperties}
        >
          {/* Total Assessments (GET /dashboard) */}
          <div className="card-surface p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  C-Step API Assessments
                </span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-2 text-ink-faint">
                  GET /dashboard
                </span>
              </div>
              <p className="mt-2 font-serif text-3xl text-ink tabular-nums">
                {dashTotals?.total_assessments ?? 0}
                <span className="font-sans text-xs text-ink-muted ml-2">persisted</span>
              </p>
            </div>
            <button
              onClick={() => setActiveTab("assessments")}
              className="mt-3 flex items-center gap-1.5 text-xs text-leaf hover:underline font-mono"
            >
              Manage &amp; Create assessments <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Summed CO2e (GET /dashboard) */}
          <div className="card-surface p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  Summed Assessment CO₂e
                </span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-surface-2 text-ink-faint">
                  GET /dashboard
                </span>
              </div>
              <p className="mt-2 font-serif text-3xl text-ink tabular-nums">
                {(dashTotals?.total_co2e_kg ?? 0) >= 1000
                  ? `${((dashTotals?.total_co2e_kg ?? 0) / 1000).toFixed(2)} t`
                  : `${(dashTotals?.total_co2e_kg ?? 0).toFixed(2)} kg`}
              </p>
              <p className="mt-0.5 text-[11px] font-mono text-ink-faint">
                {(dashTotals?.total_co2e_kg ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 1,
                })}{" "}
                kg CO₂e aggregate
              </p>
            </div>
            <button
              onClick={() => setActiveTab("climatiq")}
              className="mt-3 flex items-center gap-1.5 text-xs text-teal hover:underline font-mono"
            >
              Direct Climatiq estimator <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Latest Assessment Badge Spotlight (GET /dashboard.latest_assessment) */}
          <div className="card-surface p-5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  Latest Assessment
                </span>
                {latestAssessment?.badge?.tier && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 font-mono text-[10px] uppercase tracking-[0.14em] ${
                      latestAssessment.badge.tier === "gold"
                        ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                        : latestAssessment.badge.tier === "silver"
                          ? "bg-slate-300/10 text-slate-300 border border-slate-300/30"
                          : "bg-amber-700/10 text-amber-700 border border-amber-700/30"
                    }`}
                  >
                    <Award className="h-2.5 w-2.5" />
                    {latestAssessment.badge.tier}
                  </span>
                )}
              </div>
              {latestAssessment ? (
                <div className="mt-2">
                  <p className="font-serif text-xl text-ink tabular-nums">
                    {latestAssessment.total_co2e_kg.toFixed(1)} kg CO₂e
                  </p>
                  <p className="text-[11px] text-ink-muted truncate font-mono mt-0.5">
                    {latestAssessment.id}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink-faint">No assessments created yet.</p>
              )}
            </div>
            <button
              onClick={() => setActiveTab("assessments")}
              className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink font-mono"
            >
              View in Assessment Manager <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </section>

        {/* Dashboard Section Navigation Tabs */}
        <div
          className="page-rise mt-8 border-b border-rule"
          style={{ "--rise-delay": "0.1s" } as CSSProperties}
        >
          <div className="flex flex-wrap gap-2 sm:gap-4 font-mono text-xs uppercase tracking-[0.14em]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 border-b-2 py-3 px-2 font-medium transition-colors ${
                activeTab === "overview"
                  ? "border-leaf text-ink"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <Layers className="h-4 w-4" />
              SME Overview &amp; Analytics
            </button>

            <button
              onClick={() => setActiveTab("assessments")}
              className={`flex items-center gap-2 border-b-2 py-3 px-2 font-medium transition-colors ${
                activeTab === "assessments"
                  ? "border-leaf text-ink"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Assessment Manager (C-Step API)
            </button>

            <button
              onClick={() => setActiveTab("climatiq")}
              className={`flex items-center gap-2 border-b-2 py-3 px-2 font-medium transition-colors ${
                activeTab === "climatiq"
                  ? "border-leaf text-ink"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <Cpu className="h-4 w-4" />
              Climatiq Raw Estimator
            </button>

            <button
              onClick={() => setActiveTab("api")}
              className={`flex items-center gap-2 border-b-2 py-3 px-2 font-medium transition-colors ${
                activeTab === "api"
                  ? "border-leaf text-ink"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <Activity className="h-4 w-4" />
              OpenAPI Specs &amp; Health
            </button>
          </div>
        </div>

        {/* Tab 1: SME Overview & Analytics */}
        {activeTab === "overview" && (
          <div className="mt-8 space-y-10">
            {/* Sustainability Score & Trends */}
            <section
              className="page-rise grid gap-5 lg:grid-cols-[300px_1fr]"
              style={{ "--rise-delay": "0.12s" } as CSSProperties}
            >
              <div className="card-surface flex items-center gap-5 p-6">
                <ScoreRing score={d.score} />
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                    Sustainability
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-leaf">
                    <TrendingDown className="h-4 w-4" aria-hidden />
                    {delta > 0 ? `+${delta}` : delta} vs last quarter
                  </p>
                  <p className="mt-3 text-sm text-ink-muted">
                    {vsPeers > 0 ? `${vsPeers}% below` : `${Math.abs(vsPeers)}% above`} sector peers
                  </p>
                </div>
              </div>

              <div className="card-surface p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-serif text-xl text-ink">
                    {fmtTonnes(d.totalTonnes)} CO₂e{" "}
                    <span className="font-sans text-sm text-ink-faint">trailing 12 months</span>
                  </h2>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                    {fmtMoney(d.savingsPotential)} / yr recoverable
                  </span>
                </div>
                <div className="mt-5">
                  <ScopeBar scope1={d.scope1} scope2={d.scope2} scope3={d.scope3} />
                </div>
                <div className="mt-6">
                  <TrendChart series={d.series} />
                </div>
              </div>
            </section>

            {/* Reduction Levers */}
            <section className="page-rise" style={{ "--rise-delay": "0.18s" } as CSSProperties}>
              <h2 className="font-serif text-2xl text-ink">Where the money is</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Reduction levers ranked by payback, matched to vetted local vendors.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {d.recommendations.map((r) => (
                  <article key={r.id} className="card-surface flex flex-col p-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal">
                      Scope {r.scope}
                    </span>
                    <h3 className="mt-2 font-serif text-lg leading-snug text-ink">{r.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">{r.blurb}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-rule pt-4 font-mono text-[11px] text-ink-muted tabular-nums">
                      <div>
                        <dt className="text-ink-faint">Capex</dt>
                        <dd className="text-ink">{fmtMoney(r.capex)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Saving / yr</dt>
                        <dd className="text-leaf">{fmtMoney(r.annualSaving)}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">Payback</dt>
                        <dd className="text-ink">{r.paybackMonths} mo</dd>
                      </div>
                      <div>
                        <dt className="text-ink-faint">CO₂e cut</dt>
                        <dd className="text-ink">{r.tonnesSaved} t</dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs text-ink-faint">Vendor · {r.vendor}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Connections & Trust */}
            <section
              className="page-rise grid gap-5 lg:grid-cols-2"
              style={{ "--rise-delay": "0.26s" } as CSSProperties}
            >
              <div className="card-surface p-6">
                <h2 className="font-serif text-xl text-ink">Data connections</h2>
                <ul className="mt-4 space-y-3">
                  {d.connections.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 border-b border-rule pb-3 last:border-0 last:pb-0"
                    >
                      <span className="flex items-center gap-2.5 text-sm text-ink">
                        <Plug className="h-4 w-4 text-ink-faint" aria-hidden />
                        {c.name}
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                          {c.kind}
                        </span>
                      </span>
                      <span
                        className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
                          c.status === "connected"
                            ? "text-leaf"
                            : c.status === "syncing"
                              ? "text-amber"
                              : "text-ink-faint"
                        }`}
                      >
                        {c.status === "available" ? "Connect" : `${c.status} · ${c.lastSync ?? ""}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-surface p-6">
                <h2 className="font-serif text-xl text-ink">Trust &amp; anomalies</h2>
                <ul className="mt-4 space-y-4">
                  {d.anomalies.map((a) => (
                    <li key={a.id} className="flex gap-3">
                      {a.severity === "warn" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
                      )}
                      <div>
                        <p className="text-sm text-ink">{a.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{a.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Procurement Matches */}
            <section className="page-rise" style={{ "--rise-delay": "0.34s" } as CSSProperties}>
              <h2 className="font-serif text-2xl text-ink">Procurement matches</h2>
              <div className="card-surface mt-4 divide-y divide-rule">
                {d.procurementMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"
                  >
                    <div>
                      <p className="text-sm text-ink">{m.buyer}</p>
                      <p className="text-xs text-ink-faint">{m.category}</p>
                    </div>
                    <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted tabular-nums">
                      <Info className="h-3.5 w-3.5 text-teal" aria-hidden />
                      {m.status} · {m.date}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Assessment Manager (C-Step API) */}
        {activeTab === "assessments" && (
          <div className="mt-8 space-y-10">
            <section>
              <div className="mb-4">
                <h2 className="font-serif text-2xl text-ink">Create New Assessment</h2>
                <p className="text-sm text-ink-muted">
                  Compute emissions via Climatiq and evaluate your EcoBid badge tier (POST
                  /assessments &amp; POST /assessments/calculate)
                </p>
              </div>
              <AssessmentCreator />
            </section>

            <section>
              <div className="mb-4">
                <h2 className="font-serif text-2xl text-ink">Stored Assessments Registry</h2>
                <p className="text-sm text-ink-muted">
                  Explore, search, filter and inspect stored assessments (GET /assessments &amp; GET
                  /assessments/&#123;id&#125;)
                </p>
              </div>
              <AssessmentList />
            </section>
          </div>
        )}

        {/* Tab 3: Climatiq Raw Estimator */}
        {activeTab === "climatiq" && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="font-serif text-2xl text-ink">Direct Climatiq Emissions Estimator</h2>
              <p className="text-sm text-ink-muted">
                Run direct activity-level emissions calculations against Climatiq's factor library
                (POST /emissions/estimate)
              </p>
            </div>
            <ClimatiqEstimator />
          </div>
        )}

        {/* Tab 4: OpenAPI Specs & Health */}
        {activeTab === "api" && (
          <div className="mt-8 space-y-8">
            <div>
              <h2 className="font-serif text-2xl text-ink">
                API Specification &amp; Service Status
              </h2>
              <p className="text-sm text-ink-muted">
                Reference documentation for all endpoints, data schemas, and liveness probe in
                openapi.yaml
              </p>
            </div>
            <ApiReferenceCard />
          </div>
        )}
      </main>
    </div>
  );
}
