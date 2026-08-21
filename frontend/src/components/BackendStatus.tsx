import { useQuery } from "@tanstack/react-query";
import { API_BASE, checkHealth } from "../lib/api";

export function useBackendStatus() {
  return useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

export function BackendStatus() {
  const { data: live, isPending } = useBackendStatus();
  const state = isPending ? "checking" : live ? "live" : "mock";

  const dot = state === "live" ? "bg-leaf" : state === "mock" ? "bg-amber" : "bg-ink-faint";
  const label = state === "live" ? "Live backend" : state === "mock" ? "Demo data" : "Checking…";

  return (
    <span
      title={
        state === "live"
          ? `Connected to ${API_BASE}`
          : `No backend at ${API_BASE} — showing bundled mock data`
      }
      className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
