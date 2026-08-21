import { useMemo, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldCheck, Code2 } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { getDirectory } from "../lib/api";
import { TIER_LABEL, type TrustTier } from "../data/mock";
import { SECTORS, fmtTonnes } from "../lib/carbon";

export const Route = createFileRoute("/directory")({
  head: () => ({
    meta: [
      { title: "Green supplier directory — C-Step" },
      {
        name: "description",
        content:
          "Search verified SME suppliers by sustainability score, sector and data trust tier — the same index enterprise procurement systems query through our API.",
      },
      { property: "og:title", content: "Green supplier directory — C-Step" },
      {
        property: "og:description",
        content: "Verified SME suppliers ranked by sustainability score and data trust tier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Directory,
});

const TIERS: (TrustTier | "all")[] = ["all", "audited", "api", "self"];

function tierTone(tier: TrustTier) {
  return tier === "audited" ? "text-leaf" : tier === "api" ? "text-teal" : "text-ink-faint";
}

function Directory() {
  const { data, isPending } = useQuery({ queryKey: ["directory"], queryFn: getDirectory });
  const [q, setQ] = useState("");
  const [sector, setSector] = useState("all");
  const [tier, setTier] = useState<TrustTier | "all">("all");

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    return list
      .filter((e) => (sector === "all" ? true : e.sector === sector))
      .filter((e) => (tier === "all" ? true : e.tier === tier))
      .filter((e) =>
        q.trim()
          ? `${e.name} ${e.location} ${e.sectorLabel}`.toLowerCase().includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => b.score - a.score);
  }, [data, q, sector, tier]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="page-rise">
          <h1 className="font-serif text-3xl tracking-tight text-ink">Green supplier directory</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Only businesses with a passing data-provenance check are listed. The same index is
            served headlessly to enterprise procurement systems, so a high score reaches buyers
            without anyone visiting this page.
          </p>
        </header>

        <div
          className="page-rise mt-7 flex flex-wrap items-center gap-3"
          style={{ "--rise-delay": "0.1s" } as CSSProperties}
        >
          <label className="relative flex-1 min-w-56">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search suppliers, cities…"
              aria-label="Search suppliers"
              className="w-full rounded-full border border-rule bg-surface py-2.5 pl-9 pr-4 text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            aria-label="Filter by sector"
            className="rounded-full border border-rule bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
          >
            <option value="all">All sectors</option>
            {SECTORS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1 rounded-full border border-rule bg-surface p-1">
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  tier === t ? "bg-leaf text-primary-foreground" : "text-ink-faint hover:text-ink"
                }`}
              >
                {t === "all"
                  ? "All"
                  : t === "api"
                    ? "Verified"
                    : t === "self"
                      ? "Reported"
                      : "Audited"}
              </button>
            ))}
          </div>
        </div>

        {isPending ? (
          <p className="mt-10 font-mono text-sm text-ink-faint">Loading directory…</p>
        ) : (
          <section
            className="page-rise mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            style={{ "--rise-delay": "0.18s" } as CSSProperties}
          >
            {rows.map((e) => (
              <article key={e.id} className="card-surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-lg leading-tight text-ink">{e.name}</h2>
                    <p className="mt-1 text-xs text-ink-faint">
                      {e.sectorLabel} · {e.location} · {e.employees} staff
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 font-mono text-lg tabular-nums ${
                      e.score >= 75 ? "bg-accent text-accent-foreground" : "bg-surface-2 text-ink"
                    }`}
                  >
                    {e.score}
                  </span>
                </div>
                <p
                  className={`mt-4 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${tierTone(e.tier)}`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  {TIER_LABEL[e.tier]}
                </p>
                <p className="mt-2 text-sm text-ink-muted tabular-nums">
                  {fmtTonnes(e.tonnes)} CO₂e reported annually
                </p>
                {e.verifiedSources.length > 0 && (
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {e.verifiedSources.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-surface-2 px-2 py-1 text-[11px] text-ink-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </p>
                )}
                <Link
                  to="/profile/$supplierId"
                  params={{ supplierId: e.id }}
                  className="mt-4 inline-flex w-fit rounded-full border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted transition-colors hover:text-ink"
                >
                  Shareable profile
                </Link>
              </article>
            ))}
            {rows.length === 0 && (
              <p className="font-mono text-sm text-ink-faint">No suppliers match those filters.</p>
            )}
          </section>
        )}

        <section
          className="card-surface page-rise mt-12 p-6"
          style={{ "--rise-delay": "0.26s" } as CSSProperties}
        >
          <h2 className="flex items-center gap-2 font-serif text-xl text-ink">
            <Code2 className="h-5 w-5 text-teal" aria-hidden /> Procurement API
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Enterprise buyers query the same records inline from their own procurement software.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-[12px] leading-relaxed text-ink">
            {`GET /api/directory?sector=manufacturing&min_score=70
Authorization: Bearer <procurement_key>

{ "results": [ { "name": "Kiln & Co. Ceramics",
                 "score": 88, "tier": "audited" } ] }`}
          </pre>
        </section>
      </main>
    </div>
  );
}
