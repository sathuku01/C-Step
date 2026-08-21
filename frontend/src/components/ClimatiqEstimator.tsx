import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Zap,
  Fuel,
  Truck,
  Plane,
  CreditCard,
  Server,
  Play,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  Info,
} from "lucide-react";
import {
  estimateEmissionsWithFallback,
  API_BASE,
  type EstimateRequest,
  type EstimateResponse,
  type Sourced,
} from "../lib/api";

const PRESETS: {
  title: string;
  category: string;
  icon: typeof Zap;
  req: EstimateRequest;
}[] = [
  {
    title: "UK Grid Electricity",
    category: "Electricity",
    icon: Zap,
    req: {
      activity_id: "electricity-supply_grid-source_supplier_mix",
      data_version: "^21",
      region: "GB",
      year: 2024,
      parameters: { energy: 1200, energy_unit: "kWh" },
    },
  },
  {
    title: "US Electricity Grid",
    category: "Electricity",
    icon: Zap,
    req: {
      activity_id: "electricity-supply_grid-source_supplier_mix",
      data_version: "^21",
      region: "US",
      year: 2024,
      parameters: { energy: 2500, energy_unit: "kWh" },
    },
  },
  {
    title: "Stationary Diesel Fuel",
    category: "Fuel",
    icon: Fuel,
    req: {
      activity_id: "fuel-type_diesel-fuel_use_stationary_combustion",
      data_version: "^21",
      region: "GB",
      year: 2024,
      parameters: { volume: 350, volume_unit: "l" },
    },
  },
  {
    title: "Light Commercial Van Freight",
    category: "Transport",
    icon: Truck,
    req: {
      activity_id: "freight_vehicle-vehicle_type_van-fuel_source_diesel",
      data_version: "^21",
      region: "GB",
      year: 2024,
      parameters: { distance: 650, distance_unit: "km" },
    },
  },
  {
    title: "Short-Haul Passenger Flight",
    category: "Travel",
    icon: Plane,
    req: {
      activity_id:
        "passenger_flight-route_type_domestic-aircraft_type_na-distance_short_haul_lt_3700km",
      data_version: "^21",
      region: "GLOBAL",
      year: 2024,
      parameters: { distance: 1200, distance_unit: "km" },
    },
  },
  {
    title: "Professional Services Spend",
    category: "Spend-based",
    icon: CreditCard,
    req: {
      activity_id: "commercial_services-type_professional_services",
      data_version: "^21",
      region: "US",
      year: 2024,
      parameters: { money: 5000, money_unit: "usd" },
    },
  },
];

export function ClimatiqEstimator() {
  const [activityId, setActivityId] = useState(PRESETS[0]!.req.activity_id);
  const [dataVersion, setDataVersion] = useState(PRESETS[0]!.req.data_version);
  const [region, setRegion] = useState(PRESETS[0]!.req.region || "GB");
  const [year, setYear] = useState<string>(String(PRESETS[0]!.req.year || 2024));

  // Parameter Builder
  const [paramType, setParamType] = useState<"energy" | "volume" | "distance" | "money" | "weight">(
    "energy",
  );
  const [paramValue, setParamValue] = useState("1200");
  const [paramUnit, setParamUnit] = useState("kWh");

  const [result, setResult] = useState<Sourced<EstimateResponse> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const estimateMutation = useMutation({
    mutationFn: (req: EstimateRequest) => estimateEmissionsWithFallback(req),
    onSuccess: (data) => {
      setErrorMsg(null);
      setResult(data);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to calculate estimate");
    },
  });

  const getPayload = (): EstimateRequest => {
    const val = Number(paramValue || 0);
    const params: Record<string, unknown> = {};

    if (paramType === "energy") {
      params.energy = val;
      params.energy_unit = paramUnit;
    } else if (paramType === "volume") {
      params.volume = val;
      params.volume_unit = paramUnit;
    } else if (paramType === "distance") {
      params.distance = val;
      params.distance_unit = paramUnit;
    } else if (paramType === "money") {
      params.money = val;
      params.money_unit = paramUnit;
    } else if (paramType === "weight") {
      params.weight = val;
      params.weight_unit = paramUnit;
    }

    return {
      activity_id: activityId.trim(),
      data_version: dataVersion.trim() || "^21",
      region: region.trim() || undefined,
      year: year ? Number(year) : undefined,
      parameters: params,
    };
  };

  const handleRun = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!activityId.trim()) {
      setErrorMsg("Activity ID is required.");
      return;
    }
    const payload = getPayload();
    estimateMutation.mutate(payload);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setActivityId(preset.req.activity_id);
    setDataVersion(preset.req.data_version);
    setRegion(preset.req.region || "GB");
    setYear(preset.req.year ? String(preset.req.year) : "2024");

    const p = preset.req.parameters;
    if (p.energy !== undefined) {
      setParamType("energy");
      setParamValue(String(p.energy));
      setParamUnit(String(p.energy_unit || "kWh"));
    } else if (p.volume !== undefined) {
      setParamType("volume");
      setParamValue(String(p.volume));
      setParamUnit(String(p.volume_unit || "l"));
    } else if (p.distance !== undefined) {
      setParamType("distance");
      setParamValue(String(p.distance));
      setParamUnit(String(p.distance_unit || "km"));
    } else if (p.money !== undefined) {
      setParamType("money");
      setParamValue(String(p.money));
      setParamUnit(String(p.money_unit || "usd"));
    } else if (p.weight !== undefined) {
      setParamType("weight");
      setParamValue(String(p.weight));
      setParamUnit(String(p.weight_unit || "kg"));
    }
    setErrorMsg(null);
  };

  const currentPayload = getPayload();
  const curlCommand = `curl -X POST "${API_BASE}/emissions/estimate" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(currentPayload, null, 2)}'`;

  const copyCurl = () => {
    void navigator.clipboard.writeText(curlCommand);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Presets */}
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal/15 text-teal">
                <Sparkles className="h-4 w-4" />
              </span>
              <h3 className="font-serif text-xl text-ink">Climatiq Raw Estimate Proxy</h3>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Direct proxy to Climatiq calculation engine via{" "}
              <code className="font-mono text-ink">POST /emissions/estimate</code>
            </p>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal">
            OpenAPI Endpoint
          </span>
        </div>

        {/* Preset Cards */}
        <div className="mt-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Verified Activity Factor Presets
          </p>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const isActive = activityId === p.req.activity_id;
              return (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all hover:border-leaf/50 hover:bg-surface-2 ${
                    isActive ? "border-leaf bg-surface-2 shadow-sm" : "border-rule bg-surface"
                  }`}
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{p.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-faint">{p.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Request Form */}
      <form onSubmit={handleRun} className="card-surface space-y-5 p-6">
        <h4 className="font-serif text-lg text-ink">Estimate Parameters</h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-ink-muted">
            Activity ID (Climatiq Factor ID)
            <input
              type="text"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              placeholder="e.g. electricity-supply_grid-source_supplier_mix"
              required
              className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>

          <label className="block text-xs text-ink-muted">
            Data Version
            <input
              type="text"
              value={dataVersion}
              onChange={(e) => setDataVersion(e.target.value)}
              placeholder="^21"
              required
              className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-ink-muted">
            Region Code
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. GB, US, DE, GLOBAL"
              className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>

          <label className="block text-xs text-ink-muted">
            Year (Optional)
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2024"
              className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
            />
          </label>
        </div>

        {/* Dynamic Parameter Selector */}
        <div className="rounded-xl border border-rule bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            Activity Parameters Object
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-xs text-ink-muted">
              Parameter Type
              <select
                value={paramType}
                onChange={(e) => {
                  const t = e.target.value as typeof paramType;
                  setParamType(t);
                  if (t === "energy") setParamUnit("kWh");
                  if (t === "volume") setParamUnit("l");
                  if (t === "distance") setParamUnit("km");
                  if (t === "money") setParamUnit("usd");
                  if (t === "weight") setParamUnit("kg");
                }}
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
              >
                <option value="energy">energy</option>
                <option value="volume">volume</option>
                <option value="distance">distance</option>
                <option value="money">money</option>
                <option value="weight">weight</option>
              </select>
            </label>

            <label className="block text-xs text-ink-muted">
              Value
              <input
                type="number"
                step="any"
                min="0"
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder="100"
                required
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>

            <label className="block text-xs text-ink-muted">
              Unit
              <input
                type="text"
                value={paramUnit}
                onChange={(e) => setParamUnit(e.target.value)}
                placeholder="e.g. kWh, l, km, usd"
                required
                className="mt-1 w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber/30 bg-amber/10 p-3 text-xs text-amber">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="submit"
            disabled={estimateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-leaf px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {estimateMutation.isPending ? "Estimating…" : "Run Estimate (POST /emissions/estimate)"}
          </button>

          <button
            type="button"
            onClick={copyCurl}
            className="inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted hover:bg-surface-2"
          >
            {copiedCurl ? <Check className="h-3 w-3 text-leaf" /> : <Copy className="h-3 w-3" />}
            {copiedCurl ? "cURL Copied" : "Copy cURL"}
          </button>
        </div>
      </form>

      {/* Estimate Results Card */}
      {result && (
        <div className="card-surface space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-4">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                Estimate Output
              </span>
              <h4 className="font-serif text-2xl text-ink">Calculation Result</h4>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                result.source === "live"
                  ? "bg-leaf/15 text-leaf border border-leaf/30"
                  : "bg-amber/15 text-amber border border-amber/30"
              }`}
            >
              {result.source === "live" ? "Climatiq Live API" : "Simulated Local Factor"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-rule bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                Estimated GHG Emissions
              </p>
              <p className="mt-2 font-serif text-3xl text-leaf tabular-nums">
                {result.data.co2e.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                <span className="ml-1.5 font-sans text-base text-ink-muted">
                  {result.data.co2e_unit || "kg"} CO₂e
                </span>
              </p>
              <p className="mt-1 text-[11px] text-ink-faint font-mono">
                Method: {result.data.calculation_method || "IPCC AR6 / GWP100"}
              </p>
            </div>

            {result.data.activity_data && (
              <div className="rounded-xl border border-rule bg-surface p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  Normalized Activity Data
                </p>
                <p className="mt-2 font-serif text-2xl text-ink tabular-nums">
                  {result.data.activity_data.activity_value?.toLocaleString() ?? paramValue}{" "}
                  <span className="font-sans text-sm text-ink-muted">
                    {result.data.activity_data.activity_unit || paramUnit}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-ink-faint font-mono">
                  Origin: {result.data.calculation_origin || "Climatiq Engine"}
                </p>
              </div>
            )}

            {result.data.emission_factor && (
              <div className="rounded-xl border border-rule bg-surface p-4 sm:col-span-2 lg:col-span-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
                  Emission Factor Dataset
                </p>
                <p className="mt-1.5 text-xs font-medium text-ink truncate">
                  {result.data.emission_factor.name || activityId}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-faint truncate">
                  {result.data.emission_factor.source_dataset || "Government Standard Factors"} (
                  {result.data.emission_factor.region || region},{" "}
                  {result.data.emission_factor.year || year})
                </p>
              </div>
            )}
          </div>

          {/* Quality flags & Notices */}
          {result.data.notices && result.data.notices.length > 0 && (
            <div className="rounded-xl border border-rule bg-surface p-4 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-teal" /> Calculation Notices
              </p>
              {result.data.notices.map((n, i) => (
                <p key={i} className="text-xs text-ink-muted">
                  <span className="font-mono text-ink-faint">[{n.code || "NOTICE"}]:</span>{" "}
                  {n.message}
                </p>
              ))}
            </div>
          )}

          {/* Raw JSON viewer */}
          <div className="border-t border-rule pt-4">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint hover:text-ink"
            >
              {showRawJson ? "Hide Raw Response JSON ▲" : "View Raw Response JSON ▼"}
            </button>
            {showRawJson && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-[11px] text-ink leading-relaxed">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
