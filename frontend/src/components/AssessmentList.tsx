import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  RefreshCw,
  Award,
  Zap,
  Fuel,
  Truck,
  ArrowUpDown,
  Check,
  Copy,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { getAssessments, getAssessmentById, type AssessmentResult } from "../lib/api";
import { AssessmentInspector } from "./AssessmentInspector";

export function AssessmentList() {
  const queryClient = useQueryClient();
  const {
    data: sourcedAssessments,
    isPending,
    isRefetching,
  } = useQuery({
    queryKey: ["assessments"],
    queryFn: getAssessments,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"co2e-desc" | "co2e-asc">("co2e-desc");

  // Direct UUID Lookup
  const [lookupId, setLookupId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Selected assessment for inspection
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const source = sourcedAssessments?.source ?? "mock";

  const filteredAssessments = useMemo(() => {
    const list = sourcedAssessments?.data ?? [];
    return list
      .filter((item) => {
        if (tierFilter !== "all" && item.badge?.tier !== tierFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesId = item.id.toLowerCase().includes(q);
          const matchesCategory = item.breakdown.some((b) => b.category.toLowerCase().includes(q));
          if (!matchesId && !matchesCategory) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "co2e-desc") return b.total_co2e_kg - a.total_co2e_kg;
        return a.total_co2e_kg - b.total_co2e_kg;
      });
  }, [sourcedAssessments?.data, tierFilter, searchQuery, sortBy]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = lookupId.trim();
    if (!id) return;
    setLookupError(null);
    setIsLookingUp(true);
    try {
      const res = await getAssessmentById(id);
      setSelectedAssessment(res);
      setLookupId("");
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : `Could not find assessment ${id}`);
    } finally {
      setIsLookingUp(false);
    }
  };

  const copyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["assessments"] });
    void queryClient.invalidateQueries({ queryKey: ["assessment-dashboard"] });
  };

  return (
    <div className="space-y-6">
      {/* Direct UUID Lookup Bar */}
      <div className="card-surface p-5">
        <form onSubmit={handleLookup}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-serif text-lg text-ink">Fetch Assessment by ID</h4>
              <p className="text-xs text-ink-muted">
                Direct lookup via{" "}
                <code className="font-mono text-ink">GET /assessments/&#123;id&#125;</code>
              </p>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
              Source: {source === "live" ? "Live Backend" : "Demo Data"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Enter UUID (e.g. 3f2e1a9b-8c7d-4e5f-9a1b-2c3d4e5f6a7b)"
                className="w-full rounded-lg border border-rule bg-surface-2 py-2 pl-9 pr-4 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </div>
            <button
              type="submit"
              disabled={isLookingUp || !lookupId.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-xs font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              <FileCode className="h-3.5 w-3.5" />
              {isLookingUp ? "Looking up…" : "Lookup (GET /{id})"}
            </button>
          </div>

          {lookupError && (
            <p className="mt-2 text-xs text-amber flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {lookupError}
            </p>
          )}
        </form>
      </div>

      {/* Selected Assessment Modal / Inspector */}
      {selectedAssessment && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-leaf">
              Inspecting Assessment
            </span>
            <button
              onClick={() => setSelectedAssessment(null)}
              className="text-xs text-ink-muted hover:text-ink font-mono"
            >
              Clear selection ×
            </button>
          </div>
          <AssessmentInspector
            assessment={selectedAssessment}
            onClose={() => setSelectedAssessment(null)}
          />
        </div>
      )}

      {/* Assessments List Section */}
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl text-ink">Stored Assessments</h3>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-ink">
                {filteredAssessments.length}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              List of all stored assessments from{" "}
              <code className="font-mono text-ink">GET /assessments</code>
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by UUID or category…"
                className="w-full rounded-full border border-rule bg-surface-2 py-1.5 pl-8 pr-3 text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </div>

            <div className="flex gap-1 rounded-full border border-rule bg-surface p-1">
              {(["all", "gold", "silver", "bronze"] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                    tierFilter === tier
                      ? "bg-leaf text-primary-foreground font-medium"
                      : "text-ink-faint hover:text-ink"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSortBy(sortBy === "co2e-desc" ? "co2e-asc" : "co2e-desc")}
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted hover:text-ink"
          >
            <ArrowUpDown className="h-3 w-3" />
            Sort: {sortBy === "co2e-desc" ? "Highest CO₂e" : "Lowest CO₂e"}
          </button>
        </div>

        {/* Assessment Items Grid */}
        <div className="mt-4 space-y-3">
          {isPending ? (
            <p className="py-8 text-center font-mono text-xs text-ink-faint">
              Loading assessments from backend…
            </p>
          ) : filteredAssessments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-rule py-10 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-ink-faint" />
              <p className="mt-2 text-sm text-ink-muted">No assessments found.</p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Use the "Create Assessment" form to generate a new carbon assessment.
              </p>
            </div>
          ) : (
            filteredAssessments.map((item) => {
              const isSelected = selectedAssessment?.id === item.id;
              const badgeTier = item.badge?.tier;
              const badgeClass =
                badgeTier === "gold"
                  ? "bg-amber-400/10 text-amber-400 border-amber-400/30"
                  : badgeTier === "silver"
                    ? "bg-slate-300/10 text-slate-300 border-slate-300/30"
                    : "bg-amber-700/10 text-amber-700 border-amber-700/30";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAssessment(item)}
                  className={`group flex cursor-pointer flex-wrap items-center justify-between gap-4 rounded-xl border p-4 transition-all hover:border-leaf/50 hover:bg-surface-2 ${
                    isSelected ? "border-leaf bg-surface-2/90 shadow-sm" : "border-rule bg-surface"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-xs font-medium text-ink">
                        {item.id}
                      </span>
                      <button
                        onClick={(e) => copyId(item.id, e)}
                        title="Copy ID"
                        className="rounded p-1 text-ink-faint hover:bg-surface hover:text-ink"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3 w-3 text-leaf" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      {item.badge && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 font-mono text-[9px] uppercase tracking-[0.14em] ${badgeClass}`}
                        >
                          <Award className="h-2.5 w-2.5" />
                          {item.badge.tier}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-ink-muted">
                      {item.breakdown.map((b) => (
                        <span key={b.category} className="flex items-center gap-1">
                          {b.category === "electricity" && <Zap className="h-3 w-3 text-leaf" />}
                          {b.category === "fuel" && <Fuel className="h-3 w-3 text-amber" />}
                          {b.category === "transport" && <Truck className="h-3 w-3 text-teal" />}
                          <span className="capitalize">{b.category}:</span>
                          <span className="text-ink tabular-nums">{b.co2e_kg.toFixed(1)} kg</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-serif text-lg font-medium text-ink tabular-nums">
                        {item.total_co2e_kg >= 1000
                          ? `${(item.total_co2e_kg / 1000).toFixed(2)} t`
                          : `${item.total_co2e_kg.toFixed(2)} kg`}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                        CO₂e Total
                      </p>
                    </div>
                    <span className="rounded-full border border-rule px-3 py-1 text-xs text-ink-muted transition-colors group-hover:border-leaf group-hover:text-leaf">
                      Inspect →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
