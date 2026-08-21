/**
 * Backend bridge conforming to OpenAPI specification (C-Step API).
 *
 * Endpoints:
 * - GET /health
 * - POST /assessments
 * - GET /assessments
 * - POST /assessments/calculate
 * - GET /assessments/{id}
 * - GET /dashboard
 * - POST /emissions/estimate
 *
 * The local backend is optional: reads probe `GET {BASE}/health`.
 * If offline or unreachable, the UI gracefully falls back to mock/demo data.
 */
import {
  mockDashboard,
  mockDirectory,
  mockAssessments,
  mockAssessmentDashboard,
  type DashboardData,
  type DirectoryEntry,
} from "../data/mock";
import { estimate, type EstimateInput, type EstimateResult } from "./carbon";

export const API_BASE =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ??
  "http://192.168.89.149:8000/api/v1";

export type DataSource = "live" | "mock";

export interface Sourced<T> {
  data: T;
  source: DataSource;
}

export interface HealthResponse {
  status: string;
}

export type EvidenceType = "utility_bill" | "receipt" | "meter" | "business_record" | "estimate";

export interface FuelInput {
  type?: "diesel";
  litres?: number;
  evidence?: EvidenceType;
}

export interface TransportInput {
  vehicle_type?: "light_duty_truck";
  distance_km?: number;
  evidence?: EvidenceType;
}

export interface CreateAssessmentRequest {
  electricity_kwh?: number;
  electricity_evidence?: EvidenceType;
  sector?: string;
  fuel?: FuelInput | null;
  transport?: TransportInput | null;
}

export interface AssessmentBreakdownItem {
  category: "electricity" | "transport" | "fuel";
  co2e_kg: number;
  evidence: string;
  confidence: "high" | "medium" | "low" | "unverified";
}

export interface BadgeResult {
  tier: "gold" | "silver" | "bronze";
  ratio_to_baseline: number;
  baseline_co2e_kg: number;
  baseline_sector: string;
}

export interface AssessmentResult {
  id: string;
  total_co2e_kg: number;
  breakdown: AssessmentBreakdownItem[];
  badge?: BadgeResult | null;
}

export interface AssessmentDashboard {
  total_assessments: number;
  total_co2e_kg: number;
  latest_assessment?: AssessmentResult;
}

export interface EstimateParameters {
  energy?: number;
  energy_unit?: string;
  distance?: number;
  distance_unit?: string;
  volume?: number;
  volume_unit?: string;
  weight?: number;
  weight_unit?: string;
  money?: number;
  money_unit?: string;
  [key: string]: unknown;
}

export interface EstimateRequest {
  activity_id: string;
  data_version: string;
  region?: string;
  year?: number;
  parameters: EstimateParameters;
}

export interface EmissionFactor {
  name?: string;
  activity_id?: string;
  id?: string;
  access_type?: string;
  source?: string;
  source_dataset?: string;
  year?: number;
  region?: string;
  category?: string;
  source_lca_activity?: string;
  data_quality_flags?: string[];
}

export interface EstimateNotice {
  code?: string;
  message?: string;
}

export interface EstimateResponse {
  co2e: number;
  co2e_unit: string;
  calculation_method?: string;
  calculation_origin?: string;
  activity_data?: {
    activity_value?: number;
    activity_unit?: string;
  };
  emission_factor?: EmissionFactor;
  notices?: EstimateNotice[];
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

const TIMEOUT_MS = 3500;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });

    if (!res.ok) {
      let message = `${path} -> HTTP ${res.status}`;
      try {
        const body = (await res.json()) as ApiErrorResponse;
        if (body?.error) {
          message = body.details ? `${body.error}: ${body.details}` : body.error;
        }
      } catch {
        // use default status message
      }
      throw new Error(message);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Liveness probe against GET /health */
export async function checkHealth(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await request<HealthResponse>("/health");
    return res?.status === "ok" || res?.status !== undefined;
  } catch {
    return false;
  }
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

async function withFallback<T>(path: string, fallback: T, init?: RequestInit): Promise<Sourced<T>> {
  if (!(await checkHealth())) return { data: fallback, source: "mock" };
  try {
    return { data: await request<T>(path, init), source: "live" };
  } catch {
    return { data: fallback, source: "mock" };
  }
}

export const getDashboard = () => withFallback<DashboardData>("/dashboard", mockDashboard);

export const getDirectory = () => withFallback<DirectoryEntry[]>("/directory", mockDirectory);

export async function postEstimate(input: EstimateInput): Promise<EstimateResult> {
  const local = estimate(input);
  return { ...local, source: "mock" };
}

/** GET /dashboard aggregates */
export const getAssessmentDashboard = () =>
  withFallback<AssessmentDashboard>(
    "/dashboard",
    mockAssessmentDashboard as unknown as AssessmentDashboard,
  );

/** GET /assessments list */
export const getAssessments = () =>
  withFallback<AssessmentResult[]>(
    "/assessments",
    mockAssessments as unknown as AssessmentResult[],
  );

/** GET /assessments/{id} */
export async function getAssessmentById(id: string): Promise<AssessmentResult> {
  const isLive = await checkHealth();
  if (isLive) {
    return request<AssessmentResult>(`/assessments/${id}`);
  }
  // Offline mock fallback lookup
  const found = mockAssessments.find((a) => a.id === id);
  if (found) return found as unknown as AssessmentResult;
  throw new Error(`Assessment with ID "${id}" not found`);
}

/** POST /assessments */
export const createAssessment = (input: CreateAssessmentRequest) =>
  request<AssessmentResult>("/assessments", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** POST /assessments/calculate */
export const calculateAssessment = (input: CreateAssessmentRequest) =>
  request<AssessmentResult>("/assessments/calculate", {
    method: "POST",
    body: JSON.stringify(input),
  });

/** Mock Climatiq estimation calculation when backend is unreachable */
function mockClimatiqEstimate(req: EstimateRequest): EstimateResponse {
  let co2e = 0;
  const unit = "kg";
  let actVal = 1;
  let actUnit = "unit";

  if (req.parameters.energy !== undefined) {
    actVal = Number(req.parameters.energy);
    actUnit = String(req.parameters.energy_unit || "kWh");
    co2e = actVal * 0.207; // ~0.207 kg CO2e / kWh UK grid factor
  } else if (req.parameters.volume !== undefined) {
    actVal = Number(req.parameters.volume);
    actUnit = String(req.parameters.volume_unit || "l");
    co2e = actVal * 2.68; // ~2.68 kg CO2e / L diesel
  } else if (req.parameters.distance !== undefined) {
    actVal = Number(req.parameters.distance);
    actUnit = String(req.parameters.distance_unit || "km");
    co2e = actVal * 0.165; // ~0.165 kg CO2e / km freight truck
  } else if (req.parameters.money !== undefined) {
    actVal = Number(req.parameters.money);
    actUnit = String(req.parameters.money_unit || "usd");
    co2e = actVal * 0.32; // spend-based EEIO factor
  } else if (req.parameters.weight !== undefined) {
    actVal = Number(req.parameters.weight);
    actUnit = String(req.parameters.weight_unit || "kg");
    co2e = actVal * 1.45;
  } else {
    co2e = 125.4;
  }

  return {
    co2e: Math.round(co2e * 100) / 100,
    co2e_unit: unit,
    calculation_method: "ar6_gwp100",
    calculation_origin: "climatiq_proxy_simulated",
    activity_data: {
      activity_value: actVal,
      activity_unit: actUnit,
    },
    emission_factor: {
      name: req.activity_id.replace(/[-_]/g, " "),
      activity_id: req.activity_id,
      id: `ef_${req.activity_id.slice(0, 12)}`,
      access_type: "open_data",
      source: "GHG Protocol / Climatiq Database",
      source_dataset: "Government Emission Factors 2024",
      year: req.year || 2024,
      region: req.region || "GB",
      category: "Fuel / Electricity / Transport",
      source_lca_activity: "cradle-to-gate",
      data_quality_flags: ["tier_1_verified", "uncertainty_low"],
    },
    notices: [
      {
        code: "NOTE_REGIONAL_BASELINE",
        message: `Calculated using Climatiq standard factor dataset for ${req.region || "GB"}.`,
      },
    ],
  };
}

/** POST /emissions/estimate */
export async function estimateEmissions(input: EstimateRequest): Promise<EstimateResponse> {
  return request<EstimateResponse>("/emissions/estimate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /emissions/estimate with fallback */
export async function estimateEmissionsWithFallback(
  input: EstimateRequest,
): Promise<Sourced<EstimateResponse>> {
  const isLive = await checkHealth();
  if (isLive) {
    try {
      const data = await estimateEmissions(input);
      return { data, source: "live" };
    } catch {
      return { data: mockClimatiqEstimate(input), source: "mock" };
    }
  }
  return { data: mockClimatiqEstimate(input), source: "mock" };
}
