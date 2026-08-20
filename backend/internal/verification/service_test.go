package verification

import (
	"errors"
	"testing"
	"time"
)

func TestParseLevel(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  Level
	}{
		{"high", "high", LevelHigh},
		{"medium", "medium", LevelMedium},
		{"low", "low", LevelLow},
		{"unverified", "unverified", LevelUnverified},
		{"empty string defaults to unverified", "", LevelUnverified},
		{"unrecognised string defaults to unverified", "totally_made_up", LevelUnverified},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ParseLevel(tt.input); got != tt.want {
				t.Errorf("ParseLevel(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestWeakestLevel(t *testing.T) {
	tests := []struct {
		name   string
		levels []Level
		want   Level
	}{
		{"single high", []Level{LevelHigh}, LevelHigh},
		{"all high", []Level{LevelHigh, LevelHigh, LevelHigh}, LevelHigh},
		{"high and medium picks medium", []Level{LevelHigh, LevelMedium}, LevelMedium},
		{"one low among highs drags to low", []Level{LevelHigh, LevelHigh, LevelLow}, LevelLow},
		{"any unverified wins regardless of others", []Level{LevelHigh, LevelMedium, LevelUnverified}, LevelUnverified},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := WeakestLevel(tt.levels)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("WeakestLevel(%v) = %v, want %v", tt.levels, got, tt.want)
			}
		})
	}
}

func TestWeakestLevel_EmptyInput(t *testing.T) {
	_, err := WeakestLevel(nil)
	if !errors.Is(err, ErrNoConfidences) {
		t.Fatalf("got error %v, want ErrNoConfidences", err)
	}
}

// fixedClock returns a Service whose "now" is pinned, so hash timestamps are
// deterministic in tests.
func fixedClock(t *testing.T, at time.Time) *Service {
	t.Helper()
	return &Service{now: func() time.Time { return at }}
}

func TestVerify_HighConfidenceIsVerifiableAndHashed(t *testing.T) {
	fixed := time.Date(2026, 8, 20, 12, 0, 0, 0, time.UTC)
	svc := fixedClock(t, fixed)

	record, err := svc.Verify([]Level{LevelHigh, LevelHigh}, samplePayload{TotalCO2eKg: 50, Tier: "gold"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.Level != LevelHigh {
		t.Errorf("got level %v, want %v", record.Level, LevelHigh)
	}
	if !record.Verifiable {
		t.Error("expected Verifiable to be true for all-high confidence")
	}
	if record.ReportHash == "" {
		t.Error("expected a non-empty report hash for a verifiable report")
	}
	if !record.HashedAt.Equal(fixed) {
		t.Errorf("got hashed-at %v, want %v", record.HashedAt, fixed)
	}
}

func TestVerify_MediumConfidenceMeetsThreshold(t *testing.T) {
	svc := NewService()

	record, err := svc.Verify([]Level{LevelMedium, LevelHigh}, samplePayload{TotalCO2eKg: 50, Tier: "silver"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !record.Verifiable {
		t.Error("expected medium confidence to meet the verifiable threshold")
	}
	if record.ReportHash == "" {
		t.Error("expected a report hash for a verifiable report")
	}
}

func TestVerify_LowConfidenceIsNotVerifiable(t *testing.T) {
	svc := NewService()

	record, err := svc.Verify([]Level{LevelHigh, LevelLow}, samplePayload{TotalCO2eKg: 50, Tier: "bronze"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.Level != LevelLow {
		t.Errorf("got level %v, want %v", record.Level, LevelLow)
	}
	if record.Verifiable {
		t.Error("expected low confidence to fall below the verifiable threshold")
	}
	if record.ReportHash != "" {
		t.Errorf("expected no report hash for a non-verifiable report, got %q", record.ReportHash)
	}
	if !record.HashedAt.IsZero() {
		t.Errorf("expected zero hashed-at for a non-verifiable report, got %v", record.HashedAt)
	}
}

func TestVerify_UnverifiedConfidenceIsNotVerifiable(t *testing.T) {
	svc := NewService()

	record, err := svc.Verify([]Level{LevelUnverified}, samplePayload{TotalCO2eKg: 50, Tier: "bronze"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if record.Verifiable {
		t.Error("expected unverified confidence to not be verifiable")
	}
}

func TestVerify_NoConfidencesReturnsError(t *testing.T) {
	svc := NewService()

	_, err := svc.Verify(nil, samplePayload{TotalCO2eKg: 50, Tier: "gold"})
	if !errors.Is(err, ErrNoConfidences) {
		t.Fatalf("got error %v, want ErrNoConfidences", err)
	}
}

func TestVerify_VerifiableButUnhashablePayloadReturnsError(t *testing.T) {
	svc := NewService()

	_, err := svc.Verify([]Level{LevelHigh}, make(chan int))
	if err == nil {
		t.Fatal("expected an error when the payload can't be hashed")
	}
}

func TestVerify_SamePayloadAndConfidenceProduceSameHash(t *testing.T) {
	svc := NewService()
	payload := samplePayload{TotalCO2eKg: 75, Tier: "silver"}

	r1, err := svc.Verify([]Level{LevelHigh, LevelMedium}, payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r2, err := svc.Verify([]Level{LevelHigh, LevelMedium}, payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if r1.ReportHash != r2.ReportHash {
		t.Errorf("expected identical hashes for identical (confidences, payload), got %q and %q", r1.ReportHash, r2.ReportHash)
	}
}
