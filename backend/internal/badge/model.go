package badge

// Tier represents the tier of an EcoBid verification badge.
type Tier string

const (
	TierGold   Tier = "gold"
	TierSilver Tier = "silver"
	TierBronze Tier = "bronze"
)

// Baseline is the industry emissions baseline an assessment's footprint is
// compared against, expressed in kg CO2e for the same reporting period as
// the assessment (e.g. per month).
type Baseline struct {
	Sector  string  `json:"sector"`
	CO2eKg  float64 `json:"co2e_kg"`
	Version string  `json:"version"`
}

// Result is the outcome of a badge evaluation. It carries the tier plus the
// evidence behind it, so it can be hashed and blockchain-anchored without
// needing to be re-derived later.
type Result struct {
	Tier            Tier    `json:"tier"`
	TotalCO2eKg     float64 `json:"total_co2e_kg"`
	BaselineSector  string  `json:"baseline_sector"`
	BaselineCO2eKg  float64 `json:"baseline_co2e_kg"`
	BaselineVersion string  `json:"baseline_version"`
	RatioToBaseline float64 `json:"ratio_to_baseline"`
}
