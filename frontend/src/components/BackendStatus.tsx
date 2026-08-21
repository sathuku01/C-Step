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
  const { data: connected, isPending } = useBackendStatus();

  const dot = isPending
    ? "bg-ink-faint"
    : connected
      ? "bg-leaf"
      : "bg-red-500 animate-pulse";

  const label = isPending
    ? "Checking…"
    : connected
      ? "Backend connected"
      : "Backend unavailable";

  return (
    <span
      title={
        isPending
          ? "Checking connection to API server…"
          : connected
            ? `Connected to ${API_BASE}`
            : `Unable to reach API server at ${API_BASE}`
      }
      className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}
