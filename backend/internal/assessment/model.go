package assessment

type CreateAssessmentRequest struct {
	ElectricityKWh float64         `json:"electricity_kwh"`
	Fuel           *FuelInput      `json:"fuel,omitempty"`
	Transport      *TransportInput `json:"transport,omitempty"`
}

type FuelInput struct {
	Type   string  `json:"type"`
	Litres float64 `json:"litres"`
}

type TransportInput struct {
	VehicleType string  `json:"vehicle_type"`
	DistanceKm  float64 `json:"distance_km"`
}

type EmissionBreakdown struct {
	Category string  `json:"category"`
	CO2eKg   float64 `json:"co2e_kg"`
}

type AssessmentResult struct {
	TotalCO2eKg float64             `json:"total_co2e_kg"`
	Breakdown   []EmissionBreakdown `json:"breakdown"`
}
