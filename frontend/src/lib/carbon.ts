/**
 * Sector metadata and formatting helpers for presentation.
 * All calculation logic runs on the Go API backend via POST /emissions/estimate.
 */

export type SectorKey =
  | "manufacturing"
  | "logistics"
  | "retail"
  | "hospitality"
  | "professional"
  | "agriculture"
  | "construction";

export interface Sector {
  key: SectorKey;
  label: string;
  perEmployee: number;
  energyFactor: number;
  peerScore: number;
}

export const SECTORS: Sector[] = [
  {
    key: "manufacturing",
    label: "Manufacturing",
    perEmployee: 6.4,
    energyFactor: 0.42,
    peerScore: 54,
  },
  {
    key: "logistics",
    label: "Logistics & transport",
    perEmployee: 9.1,
    energyFactor: 0.38,
    peerScore: 48,
  },
  {
    key: "retail",
    label: "Retail & e-commerce",
    perEmployee: 3.2,
    energyFactor: 0.35,
    peerScore: 61,
  },
  {
    key: "hospitality",
    label: "Hospitality & food",
    perEmployee: 4.8,
    energyFactor: 0.44,
    peerScore: 57,
  },
  {
    key: "professional",
    label: "Professional services",
    perEmployee: 1.9,
    energyFactor: 0.29,
    peerScore: 72,
  },
  {
    key: "agriculture",
    label: "Agriculture & agro-processing",
    perEmployee: 7.3,
    energyFactor: 0.4,
    peerScore: 51,
  },
  {
    key: "construction",
    label: "Construction",
    perEmployee: 5.6,
    energyFactor: 0.37,
    peerScore: 50,
  },
];

export const fmtTonnes = (t: number) =>
  `${t >= 100 ? Math.round(t).toLocaleString() : t.toFixed(1)} t`;

export const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;
