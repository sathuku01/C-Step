package assessment

import (
	"context"
	"fmt"

	"c-step/internal/emissions/climatiq"
)

const (
	electricityActivityID = "electricity-supply_grid-source_total_supplier_mix"
	truckActivityID       = "commercial_vehicle-vehicle_type_truck_light-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na"
)

type Service struct {
	climatiq *climatiq.Client
}

func NewService(client *climatiq.Client) *Service {
	return &Service{
		climatiq: client,
	}
}

func (s *Service) Calculate(
	ctx context.Context,
	input CreateAssessmentRequest,
) (*AssessmentResult, error) {

	result := &AssessmentResult{}

	// --------------------------------
	// ELECTRICITY
	// --------------------------------

	if input.ElectricityKWh > 0 {

		electricity, err := s.climatiq.Estimate(
			ctx,
			climatiq.EstimateRequest{
				EmissionFactor: climatiq.EmissionFactorSelector{
					ActivityID:  electricityActivityID,
					DataVersion: "^21",
					Region:      "GB",
					Year:        2020,
				},
				Parameters: map[string]interface{}{
					"energy":      input.ElectricityKWh,
					"energy_unit": "kWh",
				},
			},
		)

		if err != nil {
			return nil, fmt.Errorf(
				"calculate electricity emissions: %w",
				err,
			)
		}

		result.Breakdown = append(
			result.Breakdown,
			EmissionBreakdown{
				Category: "electricity",
				CO2eKg:   electricity.CO2e,
			},
		)

		result.TotalCO2eKg += electricity.CO2e
	}

	// --------------------------------
	// TRANSPORT
	// --------------------------------

	if input.Transport != nil && input.Transport.DistanceKm > 0 {

		if input.Transport.VehicleType != "light_duty_truck" {
			return nil, fmt.Errorf(
				"unsupported vehicle type: %s",
				input.Transport.VehicleType,
			)
		}

		// Climatiq factor is kg/mile.
		// distanceMiles := input.Transport.DistanceKm * 0.621371

		transport, err := s.climatiq.Estimate(
			ctx,
			climatiq.EstimateRequest{
				EmissionFactor: climatiq.EmissionFactorSelector{
					ActivityID:  truckActivityID,
					DataVersion: "^21",
					Region:      "US",
					Year:        2026,
				},
				Parameters: map[string]interface{}{
					"distance":      input.Transport.DistanceKm,
					"distance_unit": "km",
				},
			},
		)

		if err != nil {
			return nil, fmt.Errorf(
				"calculate transport emissions: %w",
				err,
			)
		}

		result.Breakdown = append(
			result.Breakdown,
			EmissionBreakdown{
				Category: "transport",
				CO2eKg:   transport.CO2e,
			},
		)

		result.TotalCO2eKg += transport.CO2e
	}

	return result, nil
}
