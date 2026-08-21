package assessment

import (
	"c-step/internal/badge"
	"c-step/internal/emissions/climatiq"
	"context"
	"fmt"
	"github.com/google/uuid"
)

const (
	electricityActivityID = "electricity-supply_grid-source_total_supplier_mix"
	truckActivityID       = "commercial_vehicle-vehicle_type_truck_light-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na"
)

type Service struct {
	climatiq *climatiq.Client
	badge    *badge.Service
	repo     Repository
}

func NewService(
	client *climatiq.Client,
	badgeService *badge.Service,
	repo Repository,
) *Service {
	return &Service{
		climatiq: client,
		badge:    badgeService,
		repo:     repo,
	}
}

func confidenceFromEvidence(evidence string) string {
	switch evidence {
	case EvidenceUtilityBill, EvidenceReceipt, EvidenceMeter:
		return "high"

	case EvidenceBusinessRecord:
		return "medium"

	case EvidenceEstimate:
		return "low"

	default:
		return "unverified"
	}
}

func (s *Service) Calculate(
	ctx context.Context,
	userID string,
	input CreateAssessmentRequest,
) (*AssessmentResult, error) {

	result := &AssessmentResult{}

	result.UserID = userID

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
				Category:   "electricity",
				CO2eKg:     electricity.CO2e,
				Evidence:   input.ElectricityEvidence,
				Confidence: confidenceFromEvidence(input.ElectricityEvidence),
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
				Category:   "transport",
				CO2eKg:     transport.CO2e,
				Evidence:   input.Transport.Evidence,
				Confidence: confidenceFromEvidence(input.Transport.Evidence),
			},
		)

		result.TotalCO2eKg += transport.CO2e
	}

	// --------------------------------
	// FUEL
	// --------------------------------

	if input.Fuel != nil && input.Fuel.Litres > 0 {

		var activityID string

		switch input.Fuel.Type {
		case "diesel":
			activityID = "fuel-type_diesel-fuel_use_na"

		default:
			return nil, fmt.Errorf(
				"unsupported fuel type: %s",
				input.Fuel.Type,
			)
		}

		fuel, err := s.climatiq.Estimate(
			ctx,
			climatiq.EstimateRequest{
				EmissionFactor: climatiq.EmissionFactorSelector{
					ActivityID:  activityID,
					DataVersion: "^21",
					Region:      "NL",
					Year:        2022,
				},
				Parameters: map[string]interface{}{
					"volume":      input.Fuel.Litres,
					"volume_unit": "l",
				},
			},
		)

		if err != nil {
			return nil, fmt.Errorf(
				"calculate fuel emissions: %w",
				err,
			)
		}

		result.Breakdown = append(
			result.Breakdown,
			EmissionBreakdown{
				Category:   "fuel",
				CO2eKg:     fuel.CO2e,
				Evidence:   input.Fuel.Evidence,
				Confidence: confidenceFromEvidence(input.Fuel.Evidence),
			},
		)

		result.TotalCO2eKg += fuel.CO2e
	}

	badgeResult, err := s.badge.Evaluate(
		result.TotalCO2eKg,
		input.Sector,
	)

	if err != nil {
		return nil, fmt.Errorf("evaluate badge: %w", err)
	}

	result.Badge = &BadgeResult{
		Tier:            string(badgeResult.Tier),
		RatioToBaseline: badgeResult.RatioToBaseline,
		BaselineCO2eKg:  badgeResult.BaselineCO2eKg,
		BaselineSector:  badgeResult.BaselineSector,
	}

	result.ID = uuid.NewString()

	if err := s.repo.Create(ctx, result); err != nil {
		return nil, fmt.Errorf("save assessment: %w", err)
	}

	return result, nil
}



func (s *Service) List(
	ctx context.Context,
	userID string,
) ([]*AssessmentResult, error) {
	return s.repo.List(ctx, userID)
}


func (s *Service) Get(
	ctx context.Context,
	id string,
	userID string,
) (*AssessmentResult, error) {
	return s.repo.GetByID(ctx, id, userID)
}