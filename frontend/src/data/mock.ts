import type { SectorKey } from "../lib/carbon";

export type TrustTier = "self" | "api" | "audited";

export interface Connection {
  id: string;
  name: string;
  kind: "accounting" | "bank" | "utility" | "ocr";
  status: "connected" | "available" | "syncing";
  lastSync?: string;
  records?: number;
}

export interface MonthPoint {
  month: string;
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface Recommendation {
  id: string;
  title: string;
  blurb: string;
  capex: number;
  annualSaving: number;
  tonnesSaved: number;
  paybackMonths: number;
  vendor: string;
  scope: 1 | 2 | 3;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  sector: SectorKey;
  sectorLabel: string;
  location: string;
  score: number;
  tonnes: number;
  tier: TrustTier;
  employees: number;
  verifiedSources: string[];
}

export interface DashboardData {
  company: {
    name: string;
    sector: SectorKey;
    sectorLabel: string;
    employees: number;
    location: string;
    tier: TrustTier;
  };
  score: number;
  previousScore: number;
  totalTonnes: number;
  peerTonnes: number;
  scope1: number;
  scope2: number;
  scope3: number;
  savingsPotential: number;
  series: MonthPoint[];
  connections: Connection[];
  recommendations: Recommendation[];
  anomalies: { id: string; label: string; detail: string; severity: "info" | "warn" }[];
  procurementMatches: {
    id: string;
    buyer: string;
    category: string;
    date: string;
    status: string;
  }[];
}

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const series: MonthPoint[] = MONTHS.map((month, i) => {
  const decay = 1 - i * 0.021;
  return {
    month,
    scope1: round(9.4 * decay + Math.sin(i / 2) * 0.5),
    scope2: round(14.8 * decay - i * 0.18),
    scope3: round(21.2 * decay + Math.cos(i / 3) * 0.8),
  };
});

function round(n: number) {
  return Math.round(n * 10) / 10;
}

const last = series[series.length - 1]!;
const annual = series.reduce(
  (acc, m) => {
    acc.s1 += m.scope1;
    acc.s2 += m.scope2;
    acc.s3 += m.scope3;
    return acc;
  },
  { s1: 0, s2: 0, s3: 0 },
);

export const mockDashboard: DashboardData = {
  company: {
    name: "Verdehaus Foods",
    sector: "hospitality",
    sectorLabel: "Hospitality & food",
    employees: 48,
    location: "Nairobi, KE",
    tier: "api",
  },
  score: 74,
  previousScore: 61,
  totalTonnes: round(annual.s1 + annual.s2 + annual.s3),
  peerTonnes: 288.4,
  scope1: round(annual.s1),
  scope2: round(annual.s2),
  scope3: round(annual.s3),
  savingsPotential: 41800,
  series,
  connections: [
    {
      id: "xero",
      name: "Xero",
      kind: "accounting",
      status: "connected",
      lastSync: "12 min ago",
      records: 2841,
    },
    {
      id: "bank",
      name: "Equity Bank (Plaid)",
      kind: "bank",
      status: "connected",
      lastSync: "1 h ago",
      records: 1130,
    },
    {
      id: "kplc",
      name: "Kenya Power API",
      kind: "utility",
      status: "syncing",
      lastSync: "syncing…",
      records: 12,
    },
    { id: "ocr", name: "Fuel invoices (OCR)", kind: "ocr", status: "available" },
  ],
  recommendations: [
    {
      id: "solar",
      title: "Rooftop solar, 60 kWp",
      blurb: "Scope 2 is your largest emitter. On-site generation covers 68% of daytime load.",
      capex: 74000,
      annualSaving: 23400,
      tonnesSaved: 41.2,
      paybackMonths: 38,
      vendor: "SolarNow Commercial",
      scope: 2,
    },
    {
      id: "fleet",
      title: "Electrify the 4-van delivery fleet",
      blurb: "Diesel spend is 19% of ledger fuel costs and rising faster than volume.",
      capex: 96000,
      annualSaving: 12900,
      tonnesSaved: 27.6,
      paybackMonths: 74,
      vendor: "Roam Motors",
      scope: 1,
    },
    {
      id: "cold",
      title: "Retrofit cold-room refrigerant to R-290",
      blurb: "Removes a high-GWP leak source flagged in your last two service invoices.",
      capex: 11500,
      annualSaving: 5500,
      tonnesSaved: 18.4,
      paybackMonths: 25,
      vendor: "ChillWorks EA",
      scope: 1,
    },
  ],
  anomalies: [
    {
      id: "a1",
      label: "Scope 3 freight below sector floor",
      detail:
        "Reported freight tonnage is 34% under the median for 48-person food producers. Awaiting ledger confirmation.",
      severity: "warn",
    },
    {
      id: "a2",
      label: "Utility feed verified",
      detail:
        "12 months of kWh pulled directly from the metering API — Tier 2 trust weight applied.",
      severity: "info",
    },
  ],
  procurementMatches: [
    {
      id: "p1",
      buyer: "Safari Group Hotels",
      category: "Catering & fresh produce",
      date: "2026-08-11",
      status: "Shortlisted",
    },
    {
      id: "p2",
      buyer: "Northbridge Retail",
      category: "Private-label packaged foods",
      date: "2026-07-29",
      status: "Viewed profile",
    },
    {
      id: "p3",
      buyer: "Meridian Facilities",
      category: "Staff canteen supply",
      date: "2026-07-04",
      status: "RFQ sent",
    },
  ],
};

export const mockDirectory: DirectoryEntry[] = [
  {
    id: "d1",
    name: "Verdehaus Foods",
    sector: "hospitality",
    sectorLabel: "Hospitality & food",
    location: "Nairobi, KE",
    score: 74,
    tonnes: 512,
    tier: "api",
    employees: 48,
    verifiedSources: ["Xero", "Utility API"],
  },
  {
    id: "d2",
    name: "Kiln & Co. Ceramics",
    sector: "manufacturing",
    sectorLabel: "Manufacturing",
    location: "Arusha, TZ",
    score: 88,
    tonnes: 190,
    tier: "audited",
    employees: 22,
    verifiedSources: ["QuickBooks", "Utility API", "Third-party audit"],
  },
  {
    id: "d3",
    name: "Tembo Logistics",
    sector: "logistics",
    sectorLabel: "Logistics & transport",
    location: "Mombasa, KE",
    score: 41,
    tonnes: 1840,
    tier: "api",
    employees: 96,
    verifiedSources: ["Fleet telematics"],
  },
  {
    id: "d4",
    name: "Nuru Textiles",
    sector: "manufacturing",
    sectorLabel: "Manufacturing",
    location: "Kampala, UG",
    score: 66,
    tonnes: 730,
    tier: "api",
    employees: 140,
    verifiedSources: ["Xero"],
  },
  {
    id: "d5",
    name: "Rift Valley Organics",
    sector: "agriculture",
    sectorLabel: "Agriculture & agro-processing",
    location: "Nakuru, KE",
    score: 81,
    tonnes: 402,
    tier: "audited",
    employees: 74,
    verifiedSources: ["Utility API", "Soil audit"],
  },
  {
    id: "d6",
    name: "Beacon & Rowe Advisory",
    sector: "professional",
    sectorLabel: "Professional services",
    location: "Kigali, RW",
    score: 92,
    tonnes: 46,
    tier: "api",
    employees: 31,
    verifiedSources: ["Xero", "Utility API"],
  },
  {
    id: "d7",
    name: "Coastline Build Group",
    sector: "construction",
    sectorLabel: "Construction",
    location: "Dar es Salaam, TZ",
    score: 53,
    tonnes: 1120,
    tier: "self",
    employees: 210,
    verifiedSources: [],
  },
  {
    id: "d8",
    name: "Maji Bottling",
    sector: "manufacturing",
    sectorLabel: "Manufacturing",
    location: "Eldoret, KE",
    score: 58,
    tonnes: 860,
    tier: "self",
    employees: 66,
    verifiedSources: [],
  },
  {
    id: "d9",
    name: "Hearth Hospitality",
    sector: "hospitality",
    sectorLabel: "Hospitality & food",
    location: "Zanzibar, TZ",
    score: 69,
    tonnes: 344,
    tier: "api",
    employees: 88,
    verifiedSources: ["QuickBooks"],
  },
];

export const TIER_LABEL: Record<TrustTier, string> = {
  self: "Tier 1 · Self-reported",
  api: "Tier 2 · API-verified",
  audited: "Tier 3 · Independently audited",
};

export interface MockAssessmentResult {
  id: string;
  total_co2e_kg: number;
  breakdown: Array<{
    category: "electricity" | "transport" | "fuel";
    co2e_kg: number;
    evidence: string;
    confidence: "high" | "medium" | "low" | "unverified";
  }>;
  badge?: {
    tier: "gold" | "silver" | "bronze";
    ratio_to_baseline: number;
    baseline_co2e_kg: number;
    baseline_sector: string;
  } | null;
}

export const mockAssessments: MockAssessmentResult[] = [
  {
    id: "3f2e1a9b-8c7d-4e5f-9a1b-2c3d4e5f6a7b",
    total_co2e_kg: 3250.45,
    breakdown: [
      {
        category: "electricity",
        co2e_kg: 1850.25,
        evidence: "utility_bill",
        confidence: "high",
      },
      {
        category: "transport",
        co2e_kg: 840.2,
        evidence: "business_record",
        confidence: "medium",
      },
      {
        category: "fuel",
        co2e_kg: 560.0,
        evidence: "receipt",
        confidence: "high",
      },
    ],
    badge: {
      tier: "gold",
      ratio_to_baseline: 0.65,
      baseline_co2e_kg: 5000,
      baseline_sector: "general",
    },
  },
  {
    id: "a8b7c6d5-e4f3-4a2b-8c1d-0e9f8a7b6c5d",
    total_co2e_kg: 4720.8,
    breakdown: [
      {
        category: "electricity",
        co2e_kg: 2400.0,
        evidence: "meter",
        confidence: "high",
      },
      {
        category: "transport",
        co2e_kg: 1320.8,
        evidence: "estimate",
        confidence: "low",
      },
      {
        category: "fuel",
        co2e_kg: 1000.0,
        evidence: "receipt",
        confidence: "high",
      },
    ],
    badge: {
      tier: "silver",
      ratio_to_baseline: 0.94,
      baseline_co2e_kg: 5000,
      baseline_sector: "general",
    },
  },
  {
    id: "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f",
    total_co2e_kg: 6840.1,
    breakdown: [
      {
        category: "electricity",
        co2e_kg: 3900.5,
        evidence: "utility_bill",
        confidence: "high",
      },
      {
        category: "transport",
        co2e_kg: 1740.6,
        evidence: "business_record",
        confidence: "medium",
      },
      {
        category: "fuel",
        co2e_kg: 1199.0,
        evidence: "estimate",
        confidence: "low",
      },
    ],
    badge: {
      tier: "bronze",
      ratio_to_baseline: 1.37,
      baseline_co2e_kg: 5000,
      baseline_sector: "general",
    },
  },
];

export const mockAssessmentDashboard = {
  total_assessments: 3,
  total_co2e_kg: 14811.35,
  latest_assessment: mockAssessments[0],
};
