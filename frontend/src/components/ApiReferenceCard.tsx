import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { checkHealth, API_BASE } from "../lib/api";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/health",
    title: "Liveness Check",
    description: "Returns health status of the C-Step API service.",
    curl: `curl -s "${API_BASE}/health"`,
    responseExample: `{\n  "status": "ok"\n}`,
  },
  {
    method: "POST",
    path: "/assessments",
    title: "Create Assessment",
    description:
      "Calculates emissions via Climatiq, evaluates EcoBid badge tier against sector baseline, persists & returns assessment.",
    curl: `curl -X POST "${API_BASE}/assessments" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sector": "general",
    "electricity_kwh": 1200,
    "electricity_evidence": "utility_bill",
    "fuel": { "type": "diesel", "litres": 150, "evidence": "receipt" },
    "transport": { "vehicle_type": "light_duty_truck", "distance_km": 400, "evidence": "business_record" }
  }'`,
    responseExample: `{\n  "id": "3f2e1a9b-8c7d-4e5f-9a1b-2c3d4e5f6a7b",\n  "total_co2e_kg": 745.2,\n  "breakdown": [...],\n  "badge": {\n    "tier": "gold",\n    "ratio_to_baseline": 0.65,\n    "baseline_co2e_kg": 5000,\n    "baseline_sector": "general"\n  }\n}`,
  },
  {
    method: "GET",
    path: "/assessments",
    title: "List Assessments",
    description: "Returns all stored assessments in the backend in-memory registry.",
    curl: `curl -s "${API_BASE}/assessments"`,
    responseExample: `[\n  {\n    "id": "3f2e1a9b-8c7d-4e5f-9a1b-2c3d4e5f6a7b",\n    "total_co2e_kg": 745.2,\n    "breakdown": [...],\n    "badge": { "tier": "gold", ... }\n  }\n]`,
  },
  {
    method: "POST",
    path: "/assessments/calculate",
    title: "Calculate Assessment (Alias)",
    description: "Performs calculation and badge evaluation without requiring alternative schemas.",
    curl: `curl -X POST "${API_BASE}/assessments/calculate" \\
  -H "Content-Type: application/json" \\
  -d '{ "electricity_kwh": 850, "electricity_evidence": "meter" }'`,
    responseExample: `{\n  "id": "uuid-here",\n  "total_co2e_kg": 175.95,\n  "breakdown": [...],\n  "badge": { "tier": "gold" }\n}`,
  },
  {
    method: "GET",
    path: "/assessments/{id}",
    title: "Get Assessment by ID",
    description: "Retrieves a specific assessment by its UUID. Returns 404 if not found.",
    curl: `curl -s "${API_BASE}/assessments/3f2e1a9b-8c7d-4e5f-9a1b-2c3d4e5f6a7b"`,
    responseExample: `{\n  "id": "3f2e1a9b-8c7d-4e5f-9a1b-2c3d4e5f6a7b",\n  "total_co2e_kg": 745.2,\n  "breakdown": [...]\n}`,
  },
  {
    method: "GET",
    path: "/dashboard",
    title: "Dashboard Aggregates",
    description: "Aggregated assessment count, total summed CO2e, and latest assessment object.",
    curl: `curl -s "${API_BASE}/dashboard"`,
    responseExample: `{\n  "total_assessments": 14,\n  "total_co2e_kg": 12840.5,\n  "latest_assessment": { ... }\n}`,
  },
  {
    method: "POST",
    path: "/emissions/estimate",
    title: "Climatiq Raw Estimate Proxy",
    description:
      "Direct proxy to Climatiq POST /data/v1/estimate using server-side CLIMATIQ_API_KEY.",
    curl: `curl -X POST "${API_BASE}/emissions/estimate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "activity_id": "electricity-supply_grid-source_supplier_mix",
    "data_version": "^21",
    "region": "GB",
    "parameters": { "energy": 1200, "energy_unit": "kWh" }
  }'`,
    responseExample: `{\n  "co2e": 248.4,\n  "co2e_unit": "kg",\n  "calculation_method": "ar6_gwp100",\n  "emission_factor": { ... }\n}`,
  },
];

export function ApiReferenceCard() {
  const { data: isLive, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 10_000,
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleExpand = (i: number) => {
    setExpandedIndex(expandedIndex === i ? null : i);
  };

  const copyCurl = (curl: string, i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(curl);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="card-surface p-6 space-y-6">
      {/* Health & Connection Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-teal" />
            <h3 className="font-serif text-xl text-ink">C-Step OpenAPI Specification</h3>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            All 7 backend routes defined in <code className="font-mono text-ink">openapi.yaml</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-rule bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink">
            {isPending ? (
              <>
                <Activity className="h-3.5 w-3.5 animate-pulse text-amber" />
                <span>Checking {API_BASE}…</span>
              </>
            ) : isLive ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-leaf" />
                <span className="text-leaf">Live Backend Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-amber" />
                <span className="text-amber">Local Demo / Standalone Mode</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Backend Specs Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-rule bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            API Base URL
          </p>
          <p className="mt-1 font-mono text-xs font-medium text-ink break-all">{API_BASE}</p>
          <p className="mt-1 text-[11px] text-ink-faint">Defined in OpenAPI servers config</p>
        </div>

        <div className="rounded-xl border border-rule bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            EcoBid Baselines
          </p>
          <p className="mt-1 font-serif text-lg text-ink">General: 5,000 kg CO₂e</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            Gold &le; 70% · Silver &le; 100% · Bronze &gt; 100%
          </p>
        </div>

        <div className="rounded-xl border border-rule bg-surface p-4 sm:col-span-2 lg:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Confidence Mapping
          </p>
          <p className="mt-1 font-mono text-xs text-ink">Bill/Meter &rarr; High</p>
          <p className="text-[11px] text-ink-faint">Ledger &rarr; Med · Estimate &rarr; Low</p>
        </div>
      </div>

      {/* Interactive Endpoint Explorer */}
      <div>
        <h4 className="font-serif text-lg text-ink">API Routes &amp; Contracts</h4>
        <p className="mt-0.5 text-xs text-ink-muted">
          Click any route to view curl command and contract payload
        </p>

        <div className="mt-4 divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
          {ENDPOINTS.map((ep, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <div key={ep.path + ep.method} className="transition-colors hover:bg-surface-2/40">
                <div
                  onClick={() => toggleExpand(i)}
                  className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        ep.method === "GET" ? "bg-teal/15 text-teal" : "bg-leaf/15 text-leaf"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink">{ep.path}</span>
                    <span className="text-xs text-ink-muted hidden sm:inline">— {ep.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => copyCurl(ep.curl, i, e)}
                      title="Copy cURL Command"
                      className="rounded border border-rule px-2.5 py-1 font-mono text-[11px] text-ink-faint hover:bg-surface hover:text-ink"
                    >
                      {copiedIndex === i ? (
                        <span className="flex items-center gap-1 text-leaf">
                          <Check className="h-3 w-3" /> Copied
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="h-3 w-3" /> cURL
                        </span>
                      )}
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-ink-faint" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-ink-faint" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-rule bg-surface-2/70 p-4 space-y-3">
                    <p className="text-xs text-ink-muted leading-relaxed">{ep.description}</p>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                        cURL Command
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-surface p-3 font-mono text-[11px] text-ink leading-relaxed">
                        {ep.curl}
                      </pre>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                        Example 200 Response
                      </p>
                      <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-surface p-3 font-mono text-[11px] text-ink-faint leading-relaxed">
                        {ep.responseExample}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
