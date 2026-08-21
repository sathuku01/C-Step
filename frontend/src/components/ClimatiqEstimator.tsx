import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Zap,
  Fuel,
  Truck,
  Plane,
  CreditCard,
  Play,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  Info,
} from "lucide-react";
import {
  estimateEmissions,
  API_BASE,
  type EstimateRequest,
  type EstimateResponse,
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

  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const estimateMutation = useMutation({
    mutationFn: (req: EstimateRequest) => estimateEmissions(req),
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
      params["energy"] = val;
      params["energy_unit"] = paramUnit;
    } else if (paramType === "volume") {
      params["volume"] = val;
      params["volume_unit"] = paramUnit;
    } else if (paramType === "distance") {
      params["distance"] = val;
      params["distance_unit"] = paramUnit;
    } else if (paramType === "money") {
      params["money"] = val;
      params["money_unit"] = paramUnit;
    } else if (paramType === "weight") {
      params["weight"] = val;
      params["weight_unit"] = paramUnit;
    }

    return {
      activity_id: activityId,
      data_version: dataVersion,
      region: region ? region.toUpperCase() : undefined,
      year: year ? Number(year) : undefined,
      parameters: params,
    };
  };

  const handleRunEstimate = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const payload = getPayload();
    estimateMutation.mutate(payload);
  };

  const loadPreset = (preset: (typeof PRESETS)[0]) => {
    setActivityId(preset.req.activity_id);
    setDataVersion(preset.req.data_version);
    setRegion(preset.req.region || "");
    setYear(String(preset.req.year || 2024));

    const params = preset.req.parameters;
    if ("energy" in params) {
      setParamType("energy");
      setParamValue(String(params["energy"]));
      setParamUnit(String(params["energy_unit"] || "kWh"));
    } else if ("volume" in params) {
      setParamType("volume");
      setParamValue(String(params["volume"]));
      setParamUnit(String(params["volume_unit"] || "l"));
    } else if ("distance" in params) {
      setParamType("distance");
      setParamValue(String(params["distance"]));
      setParamUnit(String(params["distance_unit"] || "km"));
    } else if ("money" in params) {
      setParamType("money");
      setParamValue(String(params["money"]));
      setParamUnit(String(params["money_unit"] || "usd"));
    }

    estimateMutation.mutate(preset.req);
  };

  const getCurlCommand = () => {
    const payload = getPayload();
    return `curl -X POST "${API_BASE}/emissions/estimate" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
  };

  const copyCurl = () => {
    void navigator.clipboard.writeText(getCurlCommand());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-teal uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> Climatiq API Proxy
              </span>
            </div>
            <h2 className="font-serif text-2xl text-ink">Micro Emission Estimator</h2>
            <p className="max-w-2xl text-xs text-ink-muted leading-relaxed">
              Execute live, factor-based emission estimates through the Go backend Climatiq proxy (POST /api/v1/emissions/estimate).
            </p>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="mt-6 border-t border-rule pt-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-faint mb-3">
            Quick-start activity presets
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PRESETS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <button
                  key={idx}
                  onClick={() => loadPreset(p)}
                  className="flex items-start gap-3 rounded-xl border border-rule bg-surface-2 p-3 text-left transition-all hover:border-leaf/50 hover:bg-surface-3 group"
                >
                  <span className="mt-0.5 rounded-lg bg-surface p-2 text-ink-muted group-hover:text-leaf transition-colors">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-ink-faint uppercase">{p.category}</div>
                    <div className="font-sans text-xs font-medium text-ink group-hover:text-leaf transition-colors truncate">
                      {p.title}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive Form & Results Split */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Request Form */}
        <div className="card-surface p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <h3 className="font-serif text-lg text-ink">Estimate Request Builder</h3>
            <span className="font-mono text-[10px] uppercase text-ink-faint">POST /emissions/estimate</span>
          </div>

          <form onSubmit={handleRunEstimate} className="space-y-4">
            <label className="block space-y-1">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                Activity ID
              </span>
              <input
                type="text"
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                placeholder="e.g. electricity-supply_grid-source_supplier_mix"
                className="w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
              />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Data Version
                </span>
                <input
                  type="text"
                  value={dataVersion}
                  onChange={(e) => setDataVersion(e.target.value)}
                  className="w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Region
                </span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="GB, US, etc."
                  className="w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf uppercase"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  Year
                </span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full rounded-lg border border-rule bg-surface-2 px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-2 focus:ring-leaf"
                />
              </label>
            </div>

            {/* Parameter Input */}
            <div className="rounded-xl border border-rule bg-surface-2 p-4 space-y-3">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint block">
                Activity Parameter
              </span>

              <div className="grid grid-cols-3 gap-2">
                <select
                  value={paramType}
                  onChange={(e) => setParamType(e.target.value as any)}
                  className="rounded-lg border border-rule bg-surface px-2 py-1.5 font-mono text-xs text-ink outline-none"
                >
                  <option value="energy">Energy</option>
                  <option value="volume">Volume</option>
                  <option value="distance">Distance</option>
                  <option value="money">Spend (Money)</option>
                  <option value="weight">Weight</option>
                </select>

                <input
                  type="number"
                  value={paramValue}
                  onChange={(e) => setParamValue(e.target.value)}
                  className="rounded-lg border border-rule bg-surface px-3 py-1.5 font-mono text-xs text-ink outline-none"
                />

                <input
                  type="text"
                  value={paramUnit}
                  onChange={(e) => setParamUnit(e.target.value)}
                  placeholder="Unit (kWh, l, km...)"
                  className="rounded-lg border border-rule bg-surface px-3 py-1.5 font-mono text-xs text-ink outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={estimateMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-leaf py-2.5 font-mono text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              {estimateMutation.isPending ? "Calculating estimate..." : "Execute Estimate Call"}
            </button>
          </form>

          {/* cURL Code Block */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span className="font-mono text-[10px] uppercase text-ink-faint">cURL Equivalent</span>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 font-mono text-[10px] text-ink-faint hover:text-ink transition-colors"
              >
                {copiedCurl ? <Check className="h-3 w-3 text-leaf" /> : <Copy className="h-3 w-3" />}
                {copiedCurl ? "Copied" : "Copy cURL"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-surface-3 p-3 font-mono text-[11px] text-ink-muted leading-relaxed">
              {getCurlCommand()}
            </pre>
          </div>
        </div>

        {/* Right: Response Output */}
        <div className="card-surface p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-serif text-lg text-ink">Estimate Result</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="flex items-center gap-1 font-mono text-[10px] uppercase text-ink-faint hover:text-ink transition-colors"
                >
                  <FileCode className="h-3 w-3" />
                  {showRawJson ? "Visual view" : "Raw JSON"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                  <AlertCircle className="h-4 w-4" /> Estimate Calculation Error
                </div>
                <p className="mt-1 font-mono text-xs">{errorMsg}</p>
              </div>
            )}

            {!result && !errorMsg && (
              <div className="py-16 text-center text-ink-faint font-mono text-xs">
                Select an activity preset or click &quot;Execute Estimate Call&quot; to calculate emissions.
              </div>
            )}

            {result && showRawJson && (
              <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl bg-surface-3 p-4 font-mono text-xs text-ink leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}

            {result && !showRawJson && (
              <div className="mt-4 space-y-6">
                {/* Highlight Big Number */}
                <div className="rounded-xl border border-leaf/30 bg-leaf/10 p-5 text-center">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-leaf font-semibold">
                    Calculated Carbon Footprint
                  </span>
                  <div className="mt-2 font-serif text-4xl font-bold text-ink tabular-nums">
                    {result.co2e.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    <span className="ml-2 font-sans text-xl text-leaf">{result.co2e_unit}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-ink-muted">
                    Equivalent to {(result.co2e / 1000).toFixed(3)} tonnes CO₂e
                  </div>
                </div>

                {/* Factor Details */}
                {result.emission_factor && (
                  <div className="rounded-xl border border-rule bg-surface-2 p-4 space-y-2">
                    <span className="font-mono text-[10px] uppercase text-ink-faint block">
                      Emission Factor Metadata
                    </span>
                    <div className="font-sans text-sm font-semibold text-ink">
                      {result.emission_factor.name}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rule font-mono text-xs text-ink-muted">
                      <div>Source: {result.emission_factor.source || "Climatiq"}</div>
                      <div>Region: {result.emission_factor.region || "Global"}</div>
                      <div>Year: {result.emission_factor.year || "2024"}</div>
                      <div>ID: {result.emission_factor.activity_id}</div>
                    </div>
                  </div>
                )}

                {/* Calculation Details */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <span className="text-ink-faint block">Method</span>
                    <span className="text-ink font-medium">{result.calculation_method || "climatiq_api"}</span>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <span className="text-ink-faint block">Origin</span>
                    <span className="text-ink font-medium">{result.calculation_origin || "backend_proxy"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
