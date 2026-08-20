package verification

import (
	"errors"
	"testing"
)

type samplePayload struct {
	TotalCO2eKg float64 `json:"total_co2e_kg"`
	Tier        string  `json:"tier"`
}

func TestHashPayload_DeterministicForSameInput(t *testing.T) {
	p := samplePayload{TotalCO2eKg: 123.45, Tier: "gold"}

	h1, err := HashPayload(p)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	h2, err := HashPayload(p)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if h1 != h2 {
		t.Errorf("expected identical hashes for identical payloads, got %q and %q", h1, h2)
	}
	if len(h1) != 64 { // hex-encoded SHA-256 is 64 chars
		t.Errorf("expected a 64-character hex hash, got %d chars: %q", len(h1), h1)
	}
}

func TestHashPayload_DifferentInputsProduceDifferentHashes(t *testing.T) {
	h1, err := HashPayload(samplePayload{TotalCO2eKg: 100, Tier: "gold"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	h2, err := HashPayload(samplePayload{TotalCO2eKg: 100, Tier: "silver"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if h1 == h2 {
		t.Errorf("expected different hashes for different payloads, both were %q", h1)
	}
}

func TestHashPayload_MapKeyOrderDoesNotAffectHash(t *testing.T) {
	m1 := map[string]any{"a": 1, "b": 2, "c": 3}
	m2 := map[string]any{"c": 3, "a": 1, "b": 2}

	h1, err := HashPayload(m1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	h2, err := HashPayload(m2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if h1 != h2 {
		t.Errorf("expected map insertion order to be irrelevant, got %q and %q", h1, h2)
	}
}

func TestHashPayload_NilPayload(t *testing.T) {
	_, err := HashPayload(nil)
	if !errors.Is(err, ErrNilPayload) {
		t.Fatalf("got error %v, want ErrNilPayload", err)
	}
}

func TestHashPayload_UnmarshalablePayload(t *testing.T) {
	_, err := HashPayload(make(chan int))
	if err == nil {
		t.Fatal("expected an error for an unmarshalable payload, got nil")
	}
	if errors.Is(err, ErrNilPayload) {
		t.Fatal("expected a marshal error, not ErrNilPayload")
	}
}
