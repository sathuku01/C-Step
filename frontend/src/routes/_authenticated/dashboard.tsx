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
  Building,
  ShieldCheck,
  AlertTriangle,
  Link2,
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
  getBlockchainStatus,
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

  const latest: AssessmentResult | undefined = dashQuery.data?.latest_assessment;

  const blockchainQuery = useQuery({
    queryKey: ["latest-blockchain-status", latest?.id],
    queryFn: () => getBlockchainStatus(latest!.id),
    enabled: !!latest?.id,
    refetchInterval: 10_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <SiteNav />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-sm text-ink-faint animate-pulse">
            Establishing connection to Go API metrics...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !meQuery.data || !dashQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-xl border border-alarm/20 bg-alarm/5 p-6 text-alarm space-y-2">
            <h2 className="font-serif text-xl">Command Center offline</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Unable to locate the active Go backend service APIs. Ensure the ledger backend is operating on localhost:8000 and try refreshing.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const user = meQuery.data;
  const dashData = dashQuery.data;
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

  const isVerified = latest?.verification?.verifiable ?? false;
  const blockchainData = blockchainQuery.data;
  const isAnchored = blockchainData?.anchored ?? false;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Company Header */}
        <header className="page-rise flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="font-serif text-4xl tracking-tight text-ink font-normal">{user.company}</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              Supplier Sector: <span className="text-primary font-semibold">{latest?.badge?.baseline_sector || "general"}</span> · Auditor: {user.name} ({user.email})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${
              isVerified ? "bg-leaf/10 border-leaf/20 text-leaf" : "bg-amber/10 border-amber/20 text-amber"
            }`}>
              {isVerified ? "✓ Verified Footprint" : "⚠️ Self-Reported"}
            </span>
          </div>
        </header>

        {/* ESG TRUST STATUS & DOMINANT METRIC ROW */}
        <section className="grid gap-6 mt-8 lg:grid-cols-12 page-rise" style={{ "--rise-delay": "0.06s" } as CSSProperties}>
          
          {/* ESG Trust Status component */}
          <div className="lg:col-span-7 rounded-2xl border border-rule bg-surface p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                ESG Governance &amp; Certification
              </span>
              <h2 className="mt-3 font-serif text-2xl font-normal text-ink">
                ESG Trust Profile
              </h2>
              
              <div className="mt-6 space-y-4">
                {/* Badge tier details */}
                <div className="flex items-start gap-4">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                    tierKey === "gold"
                      ? "bg-amber/10 text-amber border border-amber/20"
                      : tierKey === "silver"
                        ? "bg-slate-300/10 text-slate-400 border border-slate-300/20"
                        : "bg-amber-900/10 text-amber-700 border border-amber-900/20"
                  }`}>
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold capitalize text-ink">
                      {tierKey} ESG Status
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {latest?.badge
                        ? `${(latest.badge.ratio_to_baseline * 100).toFixed(0)}% of industry sector baseline (${latest.badge.baseline_co2e_kg} kg baseline)`
                        : "No active threshold validation. Submit calculations for badge mapping."}
                    </p>
                  </div>
                </div>

                {/* Audit and Verification */}
                <div className="flex items-start gap-4 pt-1">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                    isVerified ? "bg-leaf/10 text-leaf border border-leaf/20" : "bg-surface-2 text-ink-faint border border-rule"
                  }`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Evidence &amp; Auditor Verification
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {isVerified
                        ? `Auditor evaluated (Tier: ${latest?.verification?.level}). Immutable file hash secure: ${latest?.verification?.report_hash?.slice(0, 12)}...`
                        : "Unverified document trail. Upload invoices and bills to confirm data integrity."}
                    </p>
                  </div>
                </div>

                {/* Blockchain Anchored */}
                <div className="flex items-start gap-4 pt-1">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg ${
                    isAnchored ? "bg-sky/10 text-sky border border-sky/20" : "bg-surface-2 text-ink-faint border border-rule"
                  }`}>
                    <Link2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Blockchain Registry Anchor
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {isAnchored
                        ? `Secured on Polygon Amoy. Transaction: ${blockchainData?.tx_hash?.slice(0, 12)}... Block: ${blockchainData?.block_number}`
                        : latest?.id
                          ? "Anchor available. Anchoring registers the fingerprint digest permanently."
                          : "Upload and verify assessment to initialize key registries."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-rule mt-6 pt-4 flex items-center justify-between text-xs">
              <span className="text-ink-muted">Overall Tier Level:</span>
              <span className="font-semibold text-primary uppercase font-mono tracking-wider">
                {latest ? `${tierKey} Tier` : "Awaiting baseline"}
              </span>
            </div>
          </div>

          {/* VISUALLY DOMINANT: Total footprint emissions */}
          <div className="lg:col-span-5 rounded-2xl bg-primary text-primary-foreground p-6 shadow-md flex flex-col justify-between relative overflow-hidden group">
            <div>
              <div className="flex items-center justify-between text-primary-foreground/75 font-mono text-[10px] uppercase tracking-[0.16em]">
                <span>Validated CO₂e Footprint</span>
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div className="mt-8">
                <p className="text-5xl font-serif font-normal tracking-tight tabular-nums">
                  {fmtTonnes(totalTonnes)}
                </p>
                <p className="text-xs text-primary-foreground/80 font-mono mt-2 uppercase tracking-[0.05em]">
                  {totalCO2eKg.toLocaleString()} Kilograms
                </p>
              </div>
            </div>

            <p className="text-xs text-primary-foreground/75 leading-normal mt-6 border-t border-primary-foreground/20 pt-4">
              Real-time carbon estimation aggregated across active ledger records and API sync payloads.
            </p>
          </div>
        </section>

        {/* METRICS & SUB-CARDS GRID */}
        <section className="grid gap-4 mt-6 sm:grid-cols-2 lg:grid-cols-5 page-rise" style={{ "--rise-delay": "0.1s" } as CSSProperties}>
          
          <div className="rounded-xl border border-rule bg-surface-2 p-4 transition-all hover:bg-surface hover:shadow-sm">
            <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ink-muted">
              Scope 1 (Fuels)
            </span>
            <p className="mt-2 font-serif text-2xl text-ink tabular-nums">{s1Tonnes.toFixed(2)} t</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">Direct carbon source</p>
          </div>

          <div className="rounded-xl border border-rule bg-surface-2 p-4 transition-all hover:bg-surface hover:shadow-sm">
            <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ink-muted">
              Scope 2 (Grid)
            </span>
            <p className="mt-2 font-serif text-2xl text-ink tabular-nums">{s2Tonnes.toFixed(2)} t</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">Electricity/Heat imports</p>
          </div>

          <div className="rounded-xl border border-rule bg-surface-2 p-4 transition-all hover:bg-surface hover:shadow-sm">
            <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ink-muted">
              Scope 3 (Logistics)
            </span>
            <p className="mt-2 font-serif text-2xl text-ink tabular-nums">{s3Tonnes.toFixed(2)} t</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">Indirect value chain</p>
          </div>

          <div className="rounded-xl border border-rule bg-surface-2 p-4 transition-all hover:bg-surface hover:shadow-sm">
            <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ink-muted">
              Assessments
            </span>
            <p className="mt-2 font-serif text-2xl text-ink tabular-nums">{dashData.total_assessments}</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">Recorded in database</p>
          </div>

          <div className="rounded-xl border border-rule bg-surface-2 p-4 transition-all hover:bg-surface hover:shadow-sm">
            <span className="text-[10px] font-semibold font-mono uppercase tracking-[0.12em] text-ink-muted">
              EcoBid Score
            </span>
            <p className="mt-2 font-serif text-2xl text-ink tabular-nums">{score}/100</p>
            <p className="mt-0.5 text-[10px] text-ink-faint">Performance index</p>
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
