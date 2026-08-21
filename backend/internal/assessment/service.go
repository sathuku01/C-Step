package assessment

import (
	"c-step/internal/badge"
	"c-step/internal/emissions/climatiq"
	"c-step/internal/verification"
	"context"
	"fmt"
	"github.com/google/uuid"
)

const (
	electricityActivityID = "electricity-supply_grid-source_total_supplier_mix"
	truckActivityID       = "commercial_vehicle-vehicle_type_truck_light-fuel_source_na-engine_size_na-vehicle_age_na-vehicle_weight_na"
)

type Service struct {
	climatiq     *climatiq.Client
	badge        *badge.Service
	verification *verification.Service
	repo         Repository
}

func NewService(
	client *climatiq.Client,
	badgeService *badge.Service,
	verificationService *verification.Service,
	repo Repository,
) *Service {
	return &Service{
		climatiq:     client,
		badge:        badgeService,
		verification: verificationService,
		repo:         repo,
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

	result := &AssessmentResult{UserID: userID}

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

	if verificationResult, ok, err := s.verify(result); err != nil {
		return nil, fmt.Errorf("verify assessment: %w", err)
	} else if ok {
		result.Verification = verificationResult
	}

	if err := s.repo.Create(ctx, result); err != nil {
		return nil, fmt.Errorf("save assessment: %w", err)
	}

	return result, nil
}

// verify aggregates the confidence behind each of result's breakdown items
// and, for reports trustworthy enough, hashes the report content. It
// returns ok=false (with no error) when there's nothing to verify at all --
// e.g. an assessment with an empty breakdown -- since that isn't a failure,
// just a report with no verifiable content.
func (s *Service) verify(result *AssessmentResult) (*VerificationResult, bool, error) {
	if len(result.Breakdown) == 0 {
		return nil, false, nil
	}

	confidences := make([]verification.Level, 0, len(result.Breakdown))
	for _, item := range result.Breakdown {
		confidences = append(confidences, verification.ParseLevel(item.Confidence))
	}

	report := verifiableReport{
		ID:          result.ID,
		TotalCO2eKg: result.TotalCO2eKg,
		Breakdown:   result.Breakdown,
		Badge:       result.Badge,
	}

	record, err := s.verification.Verify(confidences, report)
	if err != nil {
		return nil, false, err
	}

	return &VerificationResult{
		Level:      string(record.Level),
		Verifiable: record.Verifiable,
		ReportHash: record.ReportHash,
		HashedAt:   record.HashedAt,
	}, true, nil
}

// Verify re-checks a stored assessment's integrity: it recomputes the
// report hash from the assessment's current stored data and reports
// whether it still matches the hash that was originally computed. A
// mismatch means the stored record was altered after it was verified.
func (s *Service) Verify(ctx context.Context, id string, userID string) (*VerificationCheck, error) {
	result, err := s.repo.GetByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	verificationResult, ok, err := s.verify(result)
	if err != nil {
		return nil, fmt.Errorf("recompute verification: %w", err)
	}

	check := &VerificationCheck{
		AssessmentID: result.ID,
		Match:        true,
	}

	if !ok {
		return check, nil
	}

	check.Level = verificationResult.Level
	check.Verifiable = verificationResult.Verifiable
	check.RecomputedHash = verificationResult.ReportHash

	if result.Verification != nil {
		check.StoredHash = result.Verification.ReportHash
	}

	check.Match = check.StoredHash == check.RecomputedHash

	return check, nil
}

func (s *Service) List(ctx context.Context, userID string) ([]*AssessmentResult, error) {
	return s.repo.List(ctx, userID)
}

func (s *Service) Get(
	ctx context.Context,
	id string,
	userID string,
) (*AssessmentResult, error) {
	return s.repo.GetByID(ctx, id, userID)
}

func (s *Service) GetDirectory(ctx context.Context) ([]map[string]interface{}, error) {
	return s.repo.GetDirectory(ctx)
}
