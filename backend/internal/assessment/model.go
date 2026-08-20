package assessment

const (
	EvidenceUtilityBill    = "utility_bill"
	EvidenceReceipt        = "receipt"
	EvidenceMeter          = "meter"
	EvidenceBusinessRecord = "business_record"
	EvidenceEstimate       = "estimate"
)

type CreateAssessmentRequest struct {
	ElectricityKWh float64         `json:"electricity_kwh"`
	ElectricityEvidence string     `json:"electricity_evidence"`
	Fuel           *FuelInput      `json:"fuel,omitempty"`
	Transport      *TransportInput `json:"transport,omitempty"`
}

type FuelInput struct {
	Type     string `json:"type"`
	Litres   float64 `json:"litres"`
	Evidence string  `json:"evidence"`
}

type TransportInput struct {
	VehicleType string  `json:"vehicle_type"`
	DistanceKm  float64 `json:"distance_km"`
	Evidence    string  `json:"evidence"`
}

type EmissionBreakdown struct {
	Category    string  `json:"category"`
	CO2eKg      float64 `json:"co2e_kg"`
	Evidence    string  `json:"evidence"`
	Confidence  string  `json:"confidence"`
}

type AssessmentResult struct {
	TotalCO2eKg float64             `json:"total_co2e_kg"`
	Breakdown   []EmissionBreakdown `json:"breakdown"`
}
