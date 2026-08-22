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
import { TrustTierBadge } from "./TrustBadges";

export function AssessmentList() {
  const queryClient = useQueryClient();
  const {
    data: assessments,
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

  const filteredAssessments = useMemo(() => {
    const list = assessments ?? [];
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
  }, [assessments, tierFilter, searchQuery, sortBy]);

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
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      {/* Advanced Auditor Lookup details */}
      <details className="group rounded-xl border border-rule bg-surface p-4 transition-all hover:bg-surface-2">
        <summary className="flex cursor-pointer items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted outline-none select-none">
          <span>Advanced Auditor UUID Registry Tool</span>
          <span className="text-[10px] group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="mt-4 pt-4 border-t border-rule">
          <form onSubmit={handleLookup} className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-serif text-ink font-semibold">Query API Registry Directly</p>
              <p className="text-[11px] text-ink-muted">
                Execute GET /api/v1/assessments/:id directly against the Go backend database
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder="Paste assessment UUID..."
                className="w-64 rounded-lg border border-rule bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                type="submit"
                disabled={isLookingUp || !lookupId.trim()}
                className="rounded-lg bg-primary px-4 py-1.5 font-mono text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLookingUp ? "Fetching..." : "Fetch"}
              </button>
            </div>
          </form>
          {lookupError && (
            <p className="mt-2 flex items-center gap-1 font-mono text-xs text-alarm">
              <AlertCircle className="h-3.5 w-3.5" /> {lookupError}
            </p>
          )}
        </div>
      </details>

      {/* Main List Container */}
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-rule">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-2xl text-ink">Assessment History</h3>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-ink-muted">
                {assessments?.length ?? 0} total
              </span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Live audit trails pulled from backend repository
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-rule bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink hover:bg-surface-3 transition-colors"
              title="Refresh backend assessments list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by UUID or category..."
              className="w-full rounded-lg border border-rule bg-surface-2 py-1.5 pl-9 pr-3 text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-lg border border-rule bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
            >
              <option value="all">All Tiers</option>
              <option value="gold">Gold Tier</option>
              <option value="silver">Silver Tier</option>
              <option value="bronze">Bronze Tier</option>
            </select>

            <button
              onClick={() => setSortBy(sortBy === "co2e-desc" ? "co2e-asc" : "co2e-desc")}
              className="flex items-center gap-1.5 rounded-lg border border-rule bg-surface-2 px-3 py-1.5 font-mono text-xs text-ink hover:bg-surface-3 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === "co2e-desc" ? "Highest CO₂e" : "Lowest CO₂e"}
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="mt-6 space-y-3">
          {isPending ? (
            <div className="py-12 text-center font-mono text-xs text-ink-faint">
              Loading assessments from Go API...
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="py-12 text-center">
              <FileCode className="mx-auto h-8 w-8 text-ink-faint" />
              <p className="mt-2 font-mono text-xs text-ink-muted">No assessments found.</p>
            </div>
          ) : (
            filteredAssessments.map((item) => {
              const tier = item.badge?.tier ?? "bronze";
              const badgeColors =
                tier === "gold"
                  ? "bg-amber/10 text-amber border-amber/30"
                  : tier === "silver"
                    ? "bg-teal/10 text-teal border-teal/30"
                    : "bg-surface-3 text-ink-muted border-rule";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedAssessment(item)}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rule bg-surface-2 p-4 transition-all hover:border-leaf/50 hover:bg-surface-3 cursor-pointer"
                >
                  <div className="space-y-1.5 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-ink group-hover:text-leaf transition-colors">
                        {item.id}
                      </span>
                      <button
                        onClick={(e) => copyId(item.id, e)}
                        className="text-ink-faint hover:text-ink transition-colors p-0.5"
                        title="Copy Assessment ID"
                      >
                        {copiedId === item.id ? (
                          <Check className="h-3 w-3 text-leaf" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {item.breakdown.map((b, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-ink-muted"
                        >
                          {b.category === "electricity" && <Zap className="h-2.5 w-2.5 text-amber" />}
                          {b.category === "fuel" && <Fuel className="h-2.5 w-2.5 text-teal" />}
                          {b.category === "transport" && <Truck className="h-2.5 w-2.5 text-leaf" />}
                          {b.category}: {b.co2e_kg.toFixed(0)} kg
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Badge Pill */}
                    {item.badge?.tier && (
                      <TrustTierBadge tier={item.badge.tier} />
                    )}

                    {/* Total CO2e */}
                    <div className="text-right">
                      <div className="font-serif text-lg font-semibold text-ink tabular-nums">
                        {item.total_co2e_kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                      </div>
                      <div className="font-mono text-[10px] text-ink-faint">CO₂e total</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal / Inspector */}
      {selectedAssessment && (
        <AssessmentInspector
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
        />
      )}
    </div>
  );
}
