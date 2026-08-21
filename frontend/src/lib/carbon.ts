/**
 * Client-side estimation model. Used by the landing micro-calculator and as the
 * fallback whenever the local backend is unreachable.
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
  /** tonnes CO2e per employee per year (sector median) */
  perEmployee: number;
  /** kg CO2e per currency unit of monthly energy spend, annualised */
  energyFactor: number;
  /** peer median sustainability score */
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

export interface EstimateInput {
  sector: SectorKey;
  employees: number;
  monthlyEnergySpend: number;
}

export interface EstimateResult {
  /** tonnes CO2e per year */
  totalTonnes: number;
  scope1: number;
  scope2: number;
  scope3: number;
  /** 0-100 */
  score: number;
  peerScore: number;
  peerTonnes: number;
  intensityPerEmployee: number;
  /** estimated annual currency saving from the top reduction levers */
  savingsPotential: number;
  source: "live" | "mock";
}

export function estimate(input: EstimateInput): EstimateResult {
  const sector = SECTORS.find((s) => s.key === input.sector) ?? SECTORS[0]!;
  const employees = Math.max(1, input.employees || 1);
  const spend = Math.max(0, input.monthlyEnergySpend || 0);

  const scope2 = (spend * 12 * sector.energyFactor) / 1000;
  const scope1 = sector.perEmployee * employees * 0.28;
  const scope3 = sector.perEmployee * employees * 0.46;
  const totalTonnes = scope1 + scope2 + scope3;

  const peerTonnes = sector.perEmployee * employees;
  const ratio = totalTonnes / Math.max(0.001, peerTonnes);
  const score = Math.round(Math.max(5, Math.min(98, 100 - ratio * 45)));

  return {
    totalTonnes: round(totalTonnes, 1),
    scope1: round(scope1, 1),
    scope2: round(scope2, 1),
    scope3: round(scope3, 1),
    score,
    peerScore: sector.peerScore,
    peerTonnes: round(peerTonnes, 1),
    intensityPerEmployee: round(totalTonnes / employees, 2),
    savingsPotential: Math.round(spend * 12 * 0.22),
    source: "mock",
  };
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export const fmtTonnes = (t: number) =>
  `${t >= 100 ? Math.round(t).toLocaleString() : t.toFixed(1)} t`;

export const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;
