/**
 * Backend bridge conforming to OpenAPI specification (C-Step API).
 *
 * Endpoints:
 * - GET /health
 * - POST /auth/register
 * - POST /auth/login
 * - GET /auth/me
 * - GET /directory
 * - POST /assessments
 * - GET /assessments
 * - POST /assessments/calculate
 * - GET /assessments/{id}
 * - GET /assessments/{id}/verify
 * - POST /assessments/{id}/anchor
 * - GET /assessments/{id}/blockchain-status
 * - GET /dashboard
 * - POST /emissions/estimate
 */

export const API_BASE =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8000/api/v1";

export const TOKEN_KEY = "cstep.token";

export interface HealthResponse {
  status: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
}

export interface LoginResponse {
  token: string;
  user: User;
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

export interface VerificationResult {
  level: string;
  verifiable: boolean;
  report_hash?: string;
  hashed_at?: string;
}

export interface AssessmentResult {
  id: string;
  total_co2e_kg: number;
  breakdown: AssessmentBreakdownItem[];
  badge?: BadgeResult | null;
  verification?: VerificationResult | null;
}

export interface AssessmentDashboard {
  total_assessments: number;
  total_co2e_kg: number;
  latest_assessment?: AssessmentResult;
}

export interface DirectoryEntry {
  id: string;
  name: string;
  sector: string;
  sectorLabel: string;
  location: string;
  score: number;
  tonnes: number;
  tier: string;
  employees: number;
  verifiedSources: string[];
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

export interface MicroEstimateResponse {
  total_tonnes: number;
  peer_tonnes: number;
  scope1: number;
  scope2: number;
  scope3: number;
  score: number;
  savings_potential: number;
  source: "live" | "mock";
  monthly_energy_spend: number;
  annual_energy_kwh: number;
}

export interface AnchorResult {
  tx_hash: string;
  token_id: number;
  block_number: number;
  anchored_at: string;
}

export interface BadgeStatus {
  anchored: boolean;
  token_id?: number;
  tx_hash?: string;
  block_number?: number;
  anchored_at?: string;
  tier?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export interface MicroEstimateInput {
  sector: string;
  employees: number;
  monthlyEnergySpend: number;
}

const TIMEOUT_MS = 10000;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { ...headers, ...(init?.headers ?? {}) },
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
      throw new ApiError(message, res.status);
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

export async function register(input: {
  email: string;
  password: string;
  name: string;
  company: string;
}): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>("/auth/me");
}

export async function getDirectory(): Promise<DirectoryEntry[]> {
  return request<DirectoryEntry[]>("/directory");
}

export async function getDashboard(): Promise<AssessmentDashboard> {
  return request<AssessmentDashboard>("/dashboard");
}

export async function getAssessmentDashboard(): Promise<AssessmentDashboard> {
  return request<AssessmentDashboard>("/dashboard");
}

export async function getAssessments(): Promise<AssessmentResult[]> {
  return request<AssessmentResult[]>("/assessments");
}

export async function getAssessmentById(id: string): Promise<AssessmentResult> {
  return request<AssessmentResult>(`/assessments/${id}`);
}

export async function createAssessment(input: CreateAssessmentRequest): Promise<AssessmentResult> {
  return request<AssessmentResult>("/assessments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function calculateAssessment(input: CreateAssessmentRequest): Promise<AssessmentResult> {
  return request<AssessmentResult>("/assessments/calculate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyAssessment(id: string): Promise<VerificationResult> {
  return request<VerificationResult>(`/assessments/${id}/verify`);
}

export async function anchorAssessment(
  id: string,
  recipientAddress?: string,
): Promise<AnchorResult> {
  return request<AnchorResult>(`/assessments/${id}/anchor`, {
    method: "POST",
    body: JSON.stringify({ recipient_address: recipientAddress || "" }),
  });
}

export async function getBlockchainStatus(id: string): Promise<BadgeStatus> {
  return request<BadgeStatus>(`/assessments/${id}/blockchain-status`);
}

export async function estimateEmissions(input: EstimateRequest): Promise<EstimateResponse> {
  return request<EstimateResponse>("/emissions/estimate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// export async function postEstimate(input: MicroEstimateInput): Promise<EstimateResponse> {
//   // Translate micro-calculator input to a real Climatiq factor estimate
//   const annualEnergyKwh = (input.monthlyEnergySpend || 0) * 12 * 2.5; // ~2.5 kWh per $
//   return estimateEmissions({
//     activity_id: "electricity-supply_grid-source_supplier_mix",
//     data_version: "^21",
//     region: "GB",
//     year: 2024,
//     parameters: {
//       energy: Math.max(10, annualEnergyKwh),
//       energy_unit: "kWh",
//     },
//   });
// }

export async function postEstimate(
  input: MicroEstimateInput,
): Promise<MicroEstimateResponse> {
  return request<MicroEstimateResponse>("/emissions/micro-estimate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}