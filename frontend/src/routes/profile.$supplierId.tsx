import { useMemo, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Share2, ShieldCheck } from "lucide-react";
import { SiteNav } from "../components/SiteNav";
import { getDirectory } from "../lib/api";
import { TIER_LABEL } from "../data/mock";
import { fmtTonnes } from "../lib/carbon";

export const Route = createFileRoute("/profile/$supplierId")({
  head: () => ({
    meta: [
      { title: "Shareable SME profile — C-Step" },
      {
        name: "description",
        content:
          "Public profile for verified SMEs including trust tier, sustainability score and key impact data.",
      },
      { property: "og:title", content: "Shareable SME profile — C-Step" },
      {
        property: "og:description",
        content:
          "Public supplier profile with sustainability score, trust badge and verified data sources.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupplierProfile,
});

function SupplierProfile() {
  const { supplierId } = Route.useParams();
  const { data, isPending } = useQuery({ queryKey: ["directory"], queryFn: getDirectory });
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const canCopy =
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function";
  const entry = useMemo(
    () => (data?.data ?? []).find((item) => item.id === supplierId),
    [data, supplierId],
  );

  async function handleShare() {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!shareUrl) return;

    if (canShare) {
      await navigator.share({
        title: entry ? `${entry.name} — C-Step profile` : "C-Step profile",
        text: "Check this SME sustainability profile.",
        url: shareUrl,
      });
      return;
    }

    if (!canCopy) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        {isPending ? (
          <p className="font-mono text-sm text-ink-faint">Loading profile…</p>
        ) : !entry ? (
          <section className="card-surface p-6">
            <h1 className="font-serif text-2xl text-ink">Profile not found</h1>
            <p className="mt-2 text-sm text-ink-muted">
              This supplier profile may have moved or no longer exists.
            </p>
            <Link
              to="/directory"
              className="mt-4 inline-flex rounded-full border border-rule px-4 py-2 text-sm text-ink hover:bg-surface-2"
            >
              Back to directory
            </Link>
          </section>
        ) : (
          <>
            <header className="page-rise flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                  Shareable SME profile
                </p>
                <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">{entry.name}</h1>
                <p className="mt-1 text-sm text-ink-muted">
                  {entry.sectorLabel} · {entry.location} · {entry.employees} staff
                </p>
              </div>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-full border border-rule bg-surface px-4 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
              >
                {canShare ? (
                  <Share2 className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
                {copied ? "Link copied" : "Share profile"}
              </button>
            </header>

            <section
              className="page-rise mt-6 grid gap-4 md:grid-cols-[1fr_auto]"
              style={{ "--rise-delay": "0.08s" } as CSSProperties}
            >
              <article className="card-surface p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
                  Sustainability score
                </p>
                <p className="mt-3 font-serif text-6xl text-ink tabular-nums">{entry.score}</p>
                <p className="mt-2 text-sm text-ink-muted">
                  {fmtTonnes(entry.tonnes)} CO₂e reported annually
                </p>
              </article>

              <article className="card-surface flex items-center gap-3 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-foreground">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    Trust badge
                  </p>
                  <p className="text-sm text-ink">{TIER_LABEL[entry.tier]}</p>
                </div>
              </article>
            </section>

            <section
              className="card-surface page-rise mt-6 p-6"
              style={{ "--rise-delay": "0.16s" } as CSSProperties}
            >
              <h2 className="font-serif text-xl text-ink">Verified data sources</h2>
              {entry.verifiedSources.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.verifiedSources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-muted"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  This supplier has not connected verified external sources yet.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
