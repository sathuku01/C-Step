import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Save,
  Sparkles,
  Zap,
  Fuel,
  Truck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import {
  createAssessment,
  calculateAssessment,
  type CreateAssessmentRequest,
  type EvidenceType,
  type AssessmentResult,
} from "../lib/api";
import { AssessmentInspector } from "./AssessmentInspector";

const EVIDENCE_OPTIONS: { value: EvidenceType; label: string; confidence: string }[] = [
  { value: "utility_bill", label: "Utility Bill", confidence: "High confidence" },
  { value: "meter", label: "Direct Meter Reading", confidence: "High confidence" },
  { value: "receipt", label: "Purchase Receipt / Fuel Slip", confidence: "High confidence" },
  {
    value: "business_record",
    label: "Internal Business Record / Ledger",
    confidence: "Medium confidence",
  },
  { value: "estimate", label: "Manual Estimate", confidence: "Low confidence" },
];

const PRESETS = [
  {
    name: "Urban Bakery / Cafe",
    sector: "hospitality",
    electricity: 1450,
    electricityEvidence: "utility_bill" as EvidenceType,
    fuel: 120,
    fuelEvidence: "receipt" as EvidenceType,
    transport: 280,
    transportEvidence: "business_record" as EvidenceType,
  },
  {
    name: "Regional Logistics Hub",
    sector: "logistics",
    electricity: 3200,
    electricityEvidence: "meter" as EvidenceType,
    fuel: 850,
    fuelEvidence: "receipt" as EvidenceType,
    transport: 4200,
    transportEvidence: "business_record" as EvidenceType,
  },
  {
    name: "Light Manufacturing Facility",
    sector: "manufacturing",
    electricity: 5800,
    electricityEvidence: "utility_bill" as EvidenceType,
    fuel: 450,
    fuelEvidence: "receipt" as EvidenceType,
    transport: 950,
    transportEvidence: "estimate" as EvidenceType,
  },
  {
    name: "Professional Services HQ",
    sector: "professional",
    electricity: 890,
    electricityEvidence: "utility_bill" as EvidenceType,
    fuel: 0,
    fuelEvidence: "estimate" as EvidenceType,
    transport: 150,
    transportEvidence: "business_record" as EvidenceType,
  },
];

interface AssessmentCreatorProps {
  onAssessmentCreated?: (result: AssessmentResult) => void;
}

export function AssessmentCreator({ onAssessmentCreated }: AssessmentCreatorProps) {
  const queryClient = useQueryClient();
  const [sector, setSector] = useState("general");
  const [electricityKwh, setElectricityKwh] = useState("1200");
  const [electricityEvidence, setElectricityEvidence] = useState<EvidenceType>("utility_bill");

  const [fuelLitres, setFuelLitres] = useState("180");
  const [fuelEvidence, setFuelEvidence] = useState<EvidenceType>("receipt");

  const [transportKm, setTransportKm] = useState("450");
  const [transportEvidence, setTransportEvidence] = useState<EvidenceType>("business_record");

  const [formError, setFormError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);
  const [resultMode, setResultMode] = useState<"created" | "calculated" | null>(null);

  const createMutation = useMutation({
    mutationFn: createAssessment,
    onSuccess: (data) => {
      setFormError(null);
      setLastResult(data);
      setResultMode("created");
      void queryClient.invalidateQueries({ queryKey: ["assessments"] });
      void queryClient.invalidateQueries({ queryKey: ["assessment-dashboard"] });
      if (onAssessmentCreated) onAssessmentCreated(data);
    },
    onError: (err: Error) => {
      setFormError(err.message || "Failed to create assessment");
    },
  });

  const calculateMutation = useMutation({
    mutationFn: calculateAssessment,
    onSuccess: (data) => {
      setFormError(null);
      setLastResult(data);
      setResultMode("calculated");
    },
    onError: (err: Error) => {
      setFormError(err.message || "Calculation failed");
    },
  });

  const buildPayload = (): CreateAssessmentRequest | null => {
    const elec = Number(electricityKwh || 0);
    const fuel = Number(fuelLitres || 0);
    const transport = Number(transportKm || 0);

    if (elec <= 0 && fuel <= 0 && transport <= 0) {
      setFormError(
        "At least one category must have a value greater than 0 (electricity, fuel, or transport) for badge evaluation.",
      );
      return null;
    }

    const payload: CreateAssessmentRequest = {
      sector: sector.trim() || "general",
    };

    if (elec > 0) {
      payload.electricity_kwh = elec;
      payload.electricity_evidence = electricityEvidence;
    }

    if (fuel > 0) {
      payload.fuel = {
        type: "diesel",
        litres: fuel,
        evidence: fuelEvidence,
      };
    }

    if (transport > 0) {
      payload.transport = {
        vehicle_type: "light_duty_truck",
        distance_km: transport,
        evidence: transportEvidence,
      };
    }

    return payload;
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const payload = buildPayload();
    if (payload) createMutation.mutate(payload);
  };

  const handleCalculate = () => {
    setFormError(null);
    const payload = buildPayload();
    if (payload) calculateMutation.mutate(payload);
  };

  const handleReset = () => {
    setSector("general");
    setElectricityKwh("");
    setFuelLitres("");
    setTransportKm("");
    setFormError(null);
    setLastResult(null);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setSector(preset.sector);
    setElectricityKwh(preset.electricity > 0 ? String(preset.electricity) : "");
    setElectricityEvidence(preset.electricityEvidence);
    setFuelLitres(preset.fuel > 0 ? String(preset.fuel) : "");
    setFuelEvidence(preset.fuelEvidence);
    setTransportKm(preset.transport > 0 ? String(preset.transport) : "");
    setTransportEvidence(preset.transportEvidence);
    setFormError(null);
  };

  const isBusy = createMutation.isPending || calculateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Preset Pickers */}
      <div className="card-surface p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-leaf" />
          <h4 className="font-mono text-xs uppercase tracking-[0.16em] text-ink-muted">
            Quick Activity Templates
          </h4>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs text-ink transition-colors hover:border-leaf/50 hover:bg-surface-2"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Creation Form */}
      <form onSubmit={handleCreate} className="card-surface space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-4">
          <div>
            <h3 className="font-serif text-xl text-ink">New Carbon Assessment</h3>
            <p className="text-xs text-ink-muted">
              Calculates Climatiq emissions & evaluates EcoBid badge tier against sector baseline
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        {/* Sector Selection */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Sector / Industry
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2.5 font-sans text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
            >
              <option value="general">general (5,000 kg baseline)</option>
              <option value="manufacturing">manufacturing</option>
              <option value="logistics">logistics</option>
              <option value="hospitality">hospitality</option>
              <option value="retail">retail</option>
              <option value="professional">professional</option>
              <option value="agriculture">agriculture</option>
              <option value="construction">construction</option>
            </select>
          </label>
          <p className="mt-1 text-[11px] text-ink-faint">
            Sector baseline is used to compute Gold (&le;70%), Silver (&le;100%), or Bronze EcoBid
            badges.
          </p>
        </div>

        {/* 1. Electricity */}
        <div className="rounded-xl border border-rule bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-leaf/10 text-leaf">
              <Zap className="h-4 w-4" />
            </span>
            <span className="font-medium text-sm text-ink">Electricity Consumption</span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-muted">
              Energy Usage (kWh)
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 1200"
                value={electricityKwh}
                onChange={(e) => setElectricityKwh(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>

            <label className="block text-xs text-ink-muted">
              Verification Evidence
              <select
                value={electricityEvidence}
                onChange={(e) => setElectricityEvidence(e.target.value as EvidenceType)}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
              >
                {EVIDENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.confidence})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* 2. Fuel (Diesel) */}
        <div className="rounded-xl border border-rule bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-500">
              <Fuel className="h-4 w-4" />
            </span>
            <span className="font-medium text-sm text-ink">Fuel (Diesel Only)</span>
            <span className="ml-auto font-mono text-[10px] uppercase text-ink-faint">
              type: diesel
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-muted">
              Diesel Volume (Litres)
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 250"
                value={fuelLitres}
                onChange={(e) => setFuelLitres(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>

            <label className="block text-xs text-ink-muted">
              Verification Evidence
              <select
                value={fuelEvidence}
                onChange={(e) => setFuelEvidence(e.target.value as EvidenceType)}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
              >
                {EVIDENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.confidence})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* 3. Transport (Light Duty Truck) */}
        <div className="rounded-xl border border-rule bg-surface p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal/10 text-teal">
              <Truck className="h-4 w-4" />
            </span>
            <span className="font-medium text-sm text-ink">Transport & Freight</span>
            <span className="ml-auto font-mono text-[10px] uppercase text-ink-faint">
              vehicle: light_duty_truck
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-ink-muted">
              Distance Traveled (km)
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 500"
                value={transportKm}
                onChange={(e) => setTransportKm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>

            <label className="block text-xs text-ink-muted">
              Verification Evidence
              <select
                value={transportEvidence}
                onChange={(e) => setTransportEvidence(e.target.value as EvidenceType)}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-leaf"
              >
                {EVIDENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} ({opt.confidence})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {formError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber/10 p-3.5 text-sm text-amber">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{formError}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={isBusy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-leaf px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending
              ? "Creating Assessment…"
              : "Create & Persist (POST /assessments)"}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={handleCalculate}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-rule bg-surface-2 px-5 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
          >
            <Calculator className="h-4 w-4 text-teal" />
            {calculateMutation.isPending
              ? "Calculating…"
              : "Preview Calculation (POST /assessments/calculate)"}
          </button>
        </div>
      </form>

      {/* Result Display */}
      {lastResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CheckCircle2 className="h-4 w-4 text-leaf" />
            <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-muted">
              {resultMode === "created" ? "Assessment Created & Persisted" : "Calculation Preview"}
            </span>
          </div>
          <AssessmentInspector assessment={lastResult} onClose={() => setLastResult(null)} />
        </div>
      )}
    </div>
  );
}
