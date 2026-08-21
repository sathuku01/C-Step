import { useState } from "react";
import { Check, Copy, Shield, Sparkles, Award, Zap, Fuel, Truck, AlertCircle } from "lucide-react";
import type { AssessmentResult } from "../lib/api";

interface AssessmentInspectorProps {
  assessment: AssessmentResult;
  onClose?: () => void;
}

const CONFIDENCE_STYLES = {
  high: "bg-leaf/15 text-leaf border-leaf/30",
  medium: "bg-teal/15 text-teal border-teal/30",
  low: "bg-amber/15 text-amber border-amber/30",
  unverified: "bg-muted text-ink-muted border-rule",
};

const CATEGORY_ICONS = {
  electricity: Zap,
  fuel: Fuel,
  transport: Truck,
};

export function AssessmentInspector({ assessment, onClose }: AssessmentInspectorProps) {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const copyId = () => {
    void navigator.clipboard.writeText(assessment.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badgeTier = assessment.badge?.tier;
  const badgeColor =
    badgeTier === "gold"
      ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
      : badgeTier === "silver"
        ? "text-slate-300 bg-slate-300/10 border-slate-300/30"
        : "text-amber-700 bg-amber-700/10 border-amber-700/30";

  return (
    <div className="card-surface space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              Assessment Details
            </span>
            {assessment.badge && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] ${badgeColor}`}
              >
                <Award className="h-3 w-3" />
                {assessment.badge.tier} Tier
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <h3 className="font-mono text-xs text-ink-muted">{assessment.id}</h3>
            <button
              onClick={copyId}
              title="Copy Assessment UUID"
              className="inline-flex items-center gap-1 rounded border border-rule px-2 py-0.5 text-[11px] text-ink-faint hover:bg-surface-2 hover:text-ink"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-leaf" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy UUID
                </>
              )}
            </button>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full border border-rule px-3 py-1 text-xs text-ink-muted hover:bg-surface-2"
          >
            Close
          </button>
        )}
      </div>

      {/* Primary KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-rule bg-surface p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            Total Carbon Footprint
          </p>
          <p className="mt-2 font-serif text-3xl text-ink tabular-nums">
            {assessment.total_co2e_kg >= 1000
              ? `${(assessment.total_co2e_kg / 1000).toFixed(2)} t`
              : `${assessment.total_co2e_kg.toFixed(2)} kg`}
          </p>
          <p className="mt-1 text-xs text-ink-faint font-mono">
            {assessment.total_co2e_kg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
            CO₂e
          </p>
        </div>

        {assessment.badge && (
          <div className="rounded-xl border border-rule bg-surface p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              Sector Baseline Comparison
            </p>
            <p className="mt-2 font-serif text-3xl text-ink tabular-nums">
              {(assessment.badge.ratio_to_baseline * 100).toFixed(0)}%
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              vs {assessment.badge.baseline_sector} sector baseline (
              {assessment.badge.baseline_co2e_kg.toLocaleString()} kg)
            </p>
          </div>
        )}

        <div className="rounded-xl border border-rule bg-surface p-4 sm:col-span-2 lg:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            EcoBid Rating
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Shield className="h-6 w-6 text-leaf" />
            <div>
              <p className="font-serif text-lg capitalize text-ink">
                {assessment.badge?.tier ?? "Standard"} Tier
              </p>
              <p className="text-[11px] text-ink-faint">
                {assessment.badge?.ratio_to_baseline !== undefined &&
                assessment.badge.ratio_to_baseline <= 0.7
                  ? "Top 30% low emissions"
                  : assessment.badge?.ratio_to_baseline !== undefined &&
                      assessment.badge.ratio_to_baseline <= 1.0
                    ? "Better than baseline"
                    : "Standard footprint"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div>
        <h4 className="font-serif text-lg text-ink">Emissions Breakdown</h4>
        <p className="mt-0.5 text-xs text-ink-muted">
          Climatiq-computed greenhouse gas emissions by scope category
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-rule">
          <div className="divide-y divide-rule bg-surface">
            {assessment.breakdown.map((item) => {
              const Icon = CATEGORY_ICONS[item.category] || Sparkles;
              const pct =
                assessment.total_co2e_kg > 0
                  ? Math.round((item.co2e_kg / assessment.total_co2e_kg) * 100)
                  : 0;

              return (
                <div
                  key={item.category}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-2/60"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface-2 text-ink">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium capitalize text-ink">{item.category}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                        <span>Evidence: {item.evidence.replace(/_/g, " ")}</span>
                        <span>·</span>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase ${
                            CONFIDENCE_STYLES[item.confidence] || CONFIDENCE_STYLES.unverified
                          }`}
                        >
                          {item.confidence} confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-ink tabular-nums">
                      {item.co2e_kg.toFixed(2)} kg CO₂e
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full bg-leaf rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-ink-faint tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {assessment.breakdown.length === 0 && (
              <div className="p-4 text-center text-sm text-ink-faint">
                <AlertCircle className="mx-auto h-5 w-5 mb-1 text-amber" />
                No breakdown categories returned.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw JSON Debug Toggle */}
      <div className="border-t border-rule pt-4">
        <button
          onClick={() => setShowJson(!showJson)}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
        >
          {showJson ? "Hide Raw Response JSON ▲" : "View Raw Response JSON ▼"}
        </button>
        {showJson && (
          <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-[11px] text-ink leading-relaxed">
            {JSON.stringify(assessment, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
