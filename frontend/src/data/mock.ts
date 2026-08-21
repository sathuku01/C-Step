export type TrustTier = "self" | "api" | "audited" | "gold" | "silver" | "bronze";

export const TIER_LABEL: Record<string, string> = {
  self: "Tier 1 · Self-reported",
  api: "Tier 2 · API-verified",
  audited: "Tier 3 · Independently audited",
  gold: "Gold Tier · Verified Leader",
  silver: "Silver Tier · Verified Advanced",
  bronze: "Bronze Tier · Verified Baseline",
};
