package assessment

import "time"

const (
	EvidenceUtilityBill    = "utility_bill"
	EvidenceReceipt        = "receipt"
	EvidenceMeter          = "meter"
	EvidenceBusinessRecord = "business_record"
	EvidenceEstimate       = "estimate"
)

type CreateAssessmentRequest struct {
	ElectricityKWh      float64         `json:"electricity_kwh"`
	ElectricityEvidence string          `json:"electricity_evidence"`
	Sector              string          `json:"sector"`
	Fuel                *FuelInput      `json:"fuel,omitempty"`
	Transport           *TransportInput `json:"transport,omitempty"`
}

type FuelInput struct {
	Type     string  `json:"type"`
	Litres   float64 `json:"litres"`
	Evidence string  `json:"evidence"`
}

type TransportInput struct {
	VehicleType string  `json:"vehicle_type"`
	DistanceKm  float64 `json:"distance_km"`
	Evidence    string  `json:"evidence"`
}

type EmissionBreakdown struct {
	Category   string  `json:"category"`
	CO2eKg     float64 `json:"co2e_kg"`
	Evidence   string  `json:"evidence"`
	Confidence string  `json:"confidence"`
}

type AssessmentResult struct {
	ID           string              `json:"id"`
	UserID       string              `json:"user_id"`
	TotalCO2eKg  float64             `json:"total_co2e_kg"`
	Breakdown    []EmissionBreakdown `json:"breakdown"`
	Badge        *BadgeResult        `json:"badge,omitempty"`
	Verification *VerificationResult `json:"verification,omitempty"`
}

type BadgeResult struct {
	Tier            string  `json:"tier"`
	RatioToBaseline float64 `json:"ratio_to_baseline"`
	BaselineCO2eKg  float64 `json:"baseline_co2e_kg"`
	BaselineSector  string  `json:"baseline_sector"`
}

// VerificationResult is the trust verdict attached to an assessment: the
// overall confidence level behind its figures (the weakest of its line
// items' evidence), whether it's trustworthy enough to be blockchain
// anchored, and -- if so -- the content hash that would be anchored.
type VerificationResult struct {
	Level      string    `json:"level"`
	Verifiable bool      `json:"verifiable"`
	ReportHash string    `json:"report_hash,omitempty"`
	HashedAt   time.Time `json:"hashed_at,omitempty"`
}

// VerificationCheck is the outcome of re-verifying a stored assessment: it
// recomputes the report hash from the assessment's current stored data and
// reports whether it still matches the hash that was originally anchored.
// A mismatch means the stored record was altered after verification.
type VerificationCheck struct {
	AssessmentID   string `json:"assessment_id"`
	Level          string `json:"level"`
	Verifiable     bool   `json:"verifiable"`
	StoredHash     string `json:"stored_hash,omitempty"`
	RecomputedHash string `json:"recomputed_hash,omitempty"`
	Match          bool   `json:"match"`
}

// verifiableReport is the exact, minimal content that gets hashed for a
// given assessment. Keeping it separate from AssessmentResult means the
// hash is stable even if unrelated fields are added to AssessmentResult
// later, and lets Verify recompute an identical payload from stored data.
type verifiableReport struct {
	ID          string              `json:"id"`
	TotalCO2eKg float64             `json:"total_co2e_kg"`
	Breakdown   []EmissionBreakdown `json:"breakdown"`
	Badge       *BadgeResult        `json:"badge,omitempty"`
}
