package badge

import (
	"errors"
	"math"
	"testing"
)

func newTestStore() *StaticBaselineStore {
	s := NewStaticBaselineStore()
	s.Add(Baseline{Sector: "manufacturing", CO2eKg: 100, Version: "v1"})
	s.Add(Baseline{Sector: "general", CO2eKg: 200, Version: "v1"})
	return s
}

func TestEvaluate_TierAssignment(t *testing.T) {
	tests := []struct {
		name      string
		footprint float64
		wantTier  Tier
	}{
		{"well below baseline is Gold", 50, TierGold},
		{"exactly at Gold boundary (0.70)", 70, TierGold},
		{"just above Gold boundary is Silver", 70.01, TierSilver},
		{"exactly at baseline (1.00) is Silver", 100, TierSilver},
		{"just above baseline is Bronze", 100.01, TierBronze},
		{"well above baseline is Bronze", 500, TierBronze},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(newTestStore())
			result, err := svc.Evaluate(tt.footprint, "manufacturing")
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Tier != tt.wantTier {
				t.Errorf("footprint=%v: got tier %v, want %v (ratio=%v)",
					tt.footprint, result.Tier, tt.wantTier, result.RatioToBaseline)
			}
		})
	}
}

func TestEvaluate_ResultCarriesEvidence(t *testing.T) {
	svc := NewService(newTestStore())
	result, err := svc.Evaluate(50, "manufacturing")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.TotalCO2eKg != 50 {
		t.Errorf("got total co2e %v, want 50", result.TotalCO2eKg)
	}
	if result.BaselineCO2eKg != 100 {
		t.Errorf("got baseline co2e %v, want 100", result.BaselineCO2eKg)
	}
	if result.BaselineSector != "manufacturing" {
		t.Errorf("got baseline sector %q, want %q", result.BaselineSector, "manufacturing")
	}
	if result.BaselineVersion != "v1" {
		t.Errorf("got baseline version %q, want %q", result.BaselineVersion, "v1")
	}
	if wantRatio := 0.5; result.RatioToBaseline != wantRatio {
		t.Errorf("got ratio %v, want %v", result.RatioToBaseline, wantRatio)
	}
}

func TestEvaluate_UnknownSectorFallsBackToGeneral(t *testing.T) {
	svc := NewService(newTestStore())

	result, err := svc.Evaluate(150, "retail")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.BaselineCO2eKg != 200 {
		t.Errorf("got baseline co2e %v, want 200 (general fallback)", result.BaselineCO2eKg)
	}
}

func TestEvaluate_EmptySectorUsesGeneral(t *testing.T) {
	svc := NewService(newTestStore())

	result, err := svc.Evaluate(150, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.BaselineCO2eKg != 200 {
		t.Errorf("got baseline co2e %v, want 200 (general fallback)", result.BaselineCO2eKg)
	}
}

func TestEvaluate_NoBaselineAvailable(t *testing.T) {
	empty := NewStaticBaselineStore()
	svc := NewService(empty)

	_, err := svc.Evaluate(100, "agriculture")
	if !errors.Is(err, ErrBaselineNotFound) {
		t.Fatalf("got error %v, want ErrBaselineNotFound", err)
	}
}

func TestEvaluate_CaseAndWhitespaceInsensitiveLookup(t *testing.T) {
	svc := NewService(newTestStore())

	result, err := svc.Evaluate(50, "  Manufacturing  ")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.BaselineCO2eKg != 100 {
		t.Errorf("expected case/whitespace-insensitive match, got baseline co2e %v", result.BaselineCO2eKg)
	}
}

func TestEvaluate_InvalidFootprint(t *testing.T) {
	tests := []struct {
		name      string
		footprint float64
	}{
		{"zero footprint", 0},
		{"negative footprint", -10},
		{"NaN footprint", math.NaN()},
		{"positive infinity footprint", math.Inf(1)},
		{"negative infinity footprint", math.Inf(-1)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(newTestStore())
			_, err := svc.Evaluate(tt.footprint, "manufacturing")
			if !errors.Is(err, ErrInvalidFootprint) {
				t.Fatalf("got error %v, want ErrInvalidFootprint", err)
			}
		})
	}
}

func TestEvaluate_InvalidBaselineCO2e(t *testing.T) {
	tests := []struct {
		name string
		co2e float64
	}{
		{"zero baseline co2e", 0},
		{"negative baseline co2e", -50},
		{"NaN baseline co2e", math.NaN()},
		{"infinite baseline co2e", math.Inf(1)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := NewStaticBaselineStore()
			store.Add(Baseline{Sector: "manufacturing", CO2eKg: tt.co2e})
			svc := NewService(store)

			_, err := svc.Evaluate(50, "manufacturing")
			if !errors.Is(err, ErrInvalidBaseline) {
				t.Fatalf("got error %v, want ErrInvalidBaseline", err)
			}
		})
	}
}

func TestEvaluate_StrongPerformerCapsAtGold(t *testing.T) {
	// A carbon-negative or unusually efficient SME should never exceed the
	// top tier; there is no tier above Gold.
	svc := NewService(newTestStore())

	result, err := svc.Evaluate(0.001, "manufacturing")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Tier != TierGold {
		t.Errorf("got tier %v, want TierGold", result.Tier)
	}
}

func TestEvaluate_CustomThresholds(t *testing.T) {
	svc := NewService(newTestStore()).WithThresholds(Thresholds{
		Gold:   0.50,
		Silver: 0.90,
	})

	// ratio 0.60 -> not Gold (>0.50) but is Silver (<=0.90) under custom thresholds.
	result, err := svc.Evaluate(60, "manufacturing")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Tier != TierSilver {
		t.Errorf("got tier %v, want TierSilver under custom thresholds", result.Tier)
	}

	// ratio 0.95 -> above Silver cutoff (0.90) -> Bronze.
	result, err = svc.Evaluate(95, "manufacturing")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Tier != TierBronze {
		t.Errorf("got tier %v, want TierBronze under custom thresholds", result.Tier)
	}
}

func TestStaticBaselineStore_LookupNoDataRegistered(t *testing.T) {
	s := NewStaticBaselineStore()

	if _, err := s.Lookup("manufacturing"); !errors.Is(err, ErrBaselineNotFound) {
		t.Errorf("got error %v, want ErrBaselineNotFound", err)
	}
}
