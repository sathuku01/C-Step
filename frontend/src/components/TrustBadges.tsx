import React from "react";
import { Award, ShieldCheck, Link2, AlertTriangle, FileCheck } from "lucide-react";

export type TrustTierType = "self" | "api" | "audited" | "gold" | "silver" | "bronze";

interface BadgeProps {
  className?: string;
  showTooltip?: boolean;
}

export function TrustTierBadge({
  tier,
  className = "",
}: {
  tier: TrustTierType | string;
  className?: string;
}) {
  const normalized = tier.toLowerCase();
  
  let styles = "bg-surface-2 border-rule text-ink-muted";
  let label = "Self-Reported";
  let tooltip = "Calculations provided by user without formal audit/verification steps.";

  if (normalized === "gold") {
    styles = "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400";
    label = "Gold Tier";
    tooltip = "Emissions are <= 70% of industry baseline with verified auditor logs.";
  } else if (normalized === "silver") {
    styles = "bg-slate-400/10 border-slate-400/30 text-slate-600 dark:text-slate-300";
    label = "Silver Tier";
    tooltip = "Emissions are <= 100% of industry baseline with verified auditor data.";
  } else if (normalized === "bronze") {
    styles = "bg-amber-800/10 border-amber-800/30 text-amber-950 dark:text-amber-600";
    label = "Bronze Tier";
    tooltip = "Emissions audited and verified, exceeding baseline threshold.";
  } else if (normalized === "audited") {
    styles = "bg-leaf/10 border-leaf/30 text-leaf";
    label = "Audited";
    tooltip = "Detailed ledger items confirmed by internal/external auditor evaluations.";
  } else if (normalized === "api") {
    styles = "bg-sky/10 border-sky/30 text-sky";
    label = "API Verified";
    tooltip = "Direct data synched automatically through ledger bank registries.";
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold font-mono tracking-wide ${styles} ${className}`}
      title={tooltip}
    >
      <Award className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}

export function TrustTierDescription({ tier }: { tier: string }) {
  const norm = tier.toLowerCase();
  if (norm === "gold") {
    return (
      <span className="text-xs text-ink-muted">
        <strong>Gold Status:</strong> Footprint is at least 30% below industry baseline with fully audited sources.
      </span>
    );
  }
  if (norm === "silver") {
    return (
      <span className="text-xs text-ink-muted">
        <strong>Silver Status:</strong> Footprint is within industry benchmark parameters with verified sources.
      </span>
    );
  }
  if (norm === "bronze") {
    return (
      <span className="text-xs text-ink-muted">
        <strong>Bronze Status:</strong> Audited sources completed and verified, exceeding industry average footprint.
      </span>
    );
  }
  return (
    <span className="text-xs text-ink-muted">
      <strong>Self-Reported:</strong> Baseline calculated using personal entries. No verification audit attached.
    </span>
  );
}

export function VerificationBadge({
  verifiable,
  level = "",
  className = "",
}: {
  verifiable: boolean;
  level?: string;
  className?: string;
}) {
  const isVerified = verifiable || level.toLowerCase() === "audited" || level.toLowerCase().includes("expert");
  
  if (isVerified) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border bg-leaf/10 border-leaf/25 text-leaf px-2.5 py-1 text-[11px] font-semibold font-mono tracking-wide ${className}`}
        title={`Verified ESG dataset. Confidence Level: ${level || 'expert'}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>VERIFIED</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border bg-amber-500/10 border-amber-500/25 text-amber px-2.5 py-1 text-[11px] font-semibold font-mono tracking-wide ${className}`}
      title="This dataset contains self-declared estimates. Submit invoice evidence for verification audits."
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>SELF-REPORTED</span>
    </div>
  );
}

export function BlockchainBadge({
  anchored,
  txHash,
  blockNumber,
  className = "",
}: {
  anchored: boolean;
  txHash?: string;
  blockNumber?: number;
  className?: string;
}) {
  if (anchored) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border bg-sky/10 border-sky/35 text-sky px-2.5 py-1 text-[11px] font-semibold font-mono tracking-wide ${className}`}
        title={`Immutable hash signature anchored on Polygon. Block: ${blockNumber || "Pending"}. Tx: ${txHash || ""}`}
      >
        <Link2 className="h-3.5 w-3.5" />
        <span>ANCHORED</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border bg-surface-2 border-rule text-ink-faint px-2.5 py-1 text-[11px] font-semibold font-mono tracking-wide ${className}`}
      title="Hash integrity validation available. Anchor to Polygon test registry in the inspector."
    >
      <Link2 className="h-3.5 w-3.5" />
      <span>OFF-CHAIN</span>
    </div>
  );
}
