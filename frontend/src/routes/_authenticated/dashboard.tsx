import { useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Award,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  Layers,
  Shield,
} from "lucide-react";
import { SiteNav } from "../../components/SiteNav";
import { ScopeBar, ScoreRing } from "../../components/viz";
import { AssessmentCreator } from "../../components/AssessmentCreator";
import { AssessmentList } from "../../components/AssessmentList";
import { ClimatiqEstimator } from "../../components/ClimatiqEstimator";
import { ApiReferenceCard } from "../../components/ApiReferenceCard";
import {
  getDashboard,
  getMe,
  getAssessments,
  type AssessmentResult,
} from "../../lib/api";
import { TIER_LABEL } from "../../data/mock";
import { fmtTonnes } from "../../lib/carbon";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Emissions dashboard — Verdant" },
      {
        name: "description",
        content:
          "Live sustainability score, scope 1-3 breakdown, C-Step carbon assessments, and Climatiq estimation engine for your business.",
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

  const meQuery = useQuery({ queryKey: ["auth-me"], queryFn: getMe });
  const dashQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    refetchInterval: 10_000,
  });
  const assessmentsQuery = useQuery({
    queryKey: ["assessments"],
    queryFn: getAssessments,
    refetchInterval: 10_000,
  });

  const isLoading = meQuery.isPending || dashQuery.isPending;
  const isError = meQuery.isError || dashQuery.isError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <p className="mx-auto max-w-6xl px-6 py-20 font-mono text-sm text-ink-faint">
          Loading backend metrics…
        </p>
      </div>
    );
  }

  if (isError || !meQuery.data || !dashQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-500">
            <h2 className="font-serif text-xl">Unable to load dashboard data</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Failed to connect to the backend server. Please make sure the API service is running.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const user = meQuery.data;
  const dashData = dashQuery.data;
  const latest: AssessmentResult | undefined = dashData.latest_assessment;
  const assessments = assessmentsQuery.data ?? [];

  // Calculate scope totals from real assessments breakdown
  let s1Kg = 0, s2Kg = 0, s3Kg = 0;
  assessments.forEach((a) => {
    (a.breakdown || []).forEach((b) => {
      if (b.category === "electricity") s2Kg += b.co2e_kg;
      else if (b.category === "fuel") s1Kg += b.co2e_kg;
      else if (b.category === "transport") s3Kg += b.co2e_kg;
    });
  });

  const totalCO2eKg = dashData.total_co2e_kg || (s1Kg + s2Kg + s3Kg);
  const totalTonnes = totalCO2eKg / 1000.0;
  const s1Tonnes = s1Kg / 1000.0;
  const s2Tonnes = s2Kg / 1000.0;
  const s3Tonnes = s3Kg / 1000.0;

  let score = 40;
  let tierKey = "self";
  if (latest?.badge) {
    tierKey = latest.badge.tier;
    const ratio = latest.badge.ratio_to_baseline ?? 1.0;
    score = Math.max(0, Math.min(100, Math.round(100 - (ratio - 0.7) * 50)));
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Company Header */}
        <header className="page-rise flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight text-ink">{user.company}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-leaf font-semibold">
              Authenticated Account: {user.name} ({user.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-foreground">
              {TIER_LABEL[tierKey] || TIER_LABEL["self"]}
            </span>
          </div>
        </header>

        {/* Backend KPI Strip */}
        <section
          className="page-rise mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ "--rise-delay": "0.06s" } as CSSProperties}
        >
          <div className="card-surface p-5">
            <div className="flex items-center justify-between text-ink-faint">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Assessments</span>
              <FileSpreadsheet className="h-4 w-4 text-leaf" />
            </div>
            <p className="mt-3 font-serif text-3xl text-ink tabular-nums">
              {dashData.total_assessments}
            </p>
            <p className="mt-1 text-xs text-ink-muted">Recorded in SQLite database</p>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between text-ink-faint">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Total Footprint</span>
              <Activity className="h-4 w-4 text-teal" />
            </div>
            <p className="mt-3 font-serif text-3xl text-ink tabular-nums">
              {fmtTonnes(totalTonnes)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{totalCO2eKg.toFixed(1)} CO₂e kg calculated</p>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between text-ink-faint">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Sustainability Score</span>
              <Award className="h-4 w-4 text-amber" />
            </div>
            <p className="mt-3 font-serif text-3xl text-ink tabular-nums">{score} / 100</p>
            <p className="mt-1 text-xs text-ink-muted">
              {latest?.badge ? `${latest.badge.tier.toUpperCase()} Badge` : "No badge yet"}
            </p>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-center justify-between text-ink-faint">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Data Verification</span>
              <Shield className="h-4 w-4 text-leaf" />
            </div>
            <p className="mt-3 font-serif text-xl text-ink truncate">
              {latest?.verification?.verifiable ? "Verified" : "Self-Reported"}
            </p>
            <p className="mt-1 text-xs text-ink-muted font-mono truncate">
              {latest?.verification?.report_hash
                ? `Hash: ${latest.verification.report_hash.slice(0, 10)}…`
                : "No report hash"}
            </p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div
          className="page-rise mt-8 border-b border-rule"
          style={{ "--rise-delay": "0.12s" } as CSSProperties}
        >
          <nav className="-mb-px flex gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
            <button
              onClick={() => setActiveTab("overview")}
              className={`border-b-2 py-3 transition-colors ${
                activeTab === "overview"
                  ? "border-leaf text-ink font-semibold"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              Overview &amp; Baseline
            </button>
            <button
              onClick={() => setActiveTab("assessments")}
              className={`border-b-2 py-3 transition-colors flex items-center gap-2 ${
                activeTab === "assessments"
                  ? "border-leaf text-ink font-semibold"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Assessments ({dashData.total_assessments})
            </button>
            <button
              onClick={() => setActiveTab("climatiq")}
              className={`border-b-2 py-3 transition-colors flex items-center gap-2 ${
                activeTab === "climatiq"
                  ? "border-leaf text-ink font-semibold"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Climatiq Engine
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`border-b-2 py-3 transition-colors flex items-center gap-2 ${
                activeTab === "api"
                  ? "border-leaf text-ink font-semibold"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <Layers className="h-3.5 w-3.5" /> API Integration
            </button>
          </nav>
        </div>

        {/* Tab Contents */}
        {activeTab === "overview" && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
              <div className="card-surface p-6 flex flex-col items-center justify-center text-center">
                <ScoreRing score={score} size={140} />
                <h3 className="mt-4 font-serif text-xl text-ink">Sustainability Rating</h3>
                <p className="mt-1 text-sm text-ink-muted max-w-xs">
                  Derived from your latest carbon assessment baseline compared against industry benchmarks.
                </p>
              </div>

              <div className="card-surface p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl text-ink">Scope 1 - 3 Emissions Breakdown</h3>
                  <p className="mt-1 text-xs text-ink-muted">
                    Calculated from actual recorded assessment line items.
                  </p>
                  <div className="mt-6">
                    <ScopeBar scope1={s1Tonnes} scope2={s2Tonnes} scope3={s3Tonnes} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-rule">
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Scope 1 (Fuel)</p>
                    <p className="mt-1 font-mono text-base text-ink tabular-nums">{s1Tonnes.toFixed(2)} t</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Scope 2 (Electricity)</p>
                    <p className="mt-1 font-mono text-base text-ink tabular-nums">{s2Tonnes.toFixed(2)} t</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Scope 3 (Transport)</p>
                    <p className="mt-1 font-mono text-base text-ink tabular-nums">{s3Tonnes.toFixed(2)} t</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Latest Assessment Highlights */}
            {latest ? (
              <div className="card-surface p-6">
                <h3 className="font-serif text-xl text-ink flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-leaf" /> Latest Carbon Assessment ({latest.id})
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-surface-2 p-4">
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Total Footprint</p>
                    <p className="mt-1 font-serif text-2xl text-ink">{latest.total_co2e_kg.toFixed(1)} kg CO₂e</p>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-4">
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Awarded Badge Tier</p>
                    <p className="mt-1 font-serif text-2xl text-leaf uppercase">{latest.badge?.tier || "Bronze"}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Ratio to sector baseline: {latest.badge?.ratio_to_baseline.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-4">
                    <p className="font-mono text-[10px] uppercase text-ink-faint">Verification Level</p>
                    <p className="mt-1 font-serif text-2xl text-teal">{latest.verification?.level || "Unverified"}</p>
                    <p className="mt-0.5 text-xs text-ink-muted truncate">
                      Hash: {latest.verification?.report_hash || "None"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-surface p-8 text-center">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-ink-faint" />
                <h3 className="mt-3 font-serif text-xl text-ink">No assessments recorded yet</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Create your first carbon assessment in the Assessments tab to compute your verified baseline.
                </p>
                <button
                  onClick={() => setActiveTab("assessments")}
                  className="mt-4 rounded-full bg-leaf px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                  Create Assessment
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "assessments" && (
          <div className="mt-8 space-y-8">
            <AssessmentCreator />
            <AssessmentList />
          </div>
        )}

        {activeTab === "climatiq" && (
          <div className="mt-8">
            <ClimatiqEstimator />
          </div>
        )}

        {activeTab === "api" && (
          <div className="mt-8">
            <ApiReferenceCard />
          </div>
        )}
      </main>
    </div>
  );
}
