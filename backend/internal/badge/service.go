package badge

import (
	"errors"
	"math"
	"strings"
)

// generalSector is the fallback baseline used when no sector-specific
// baseline is registered yet, or when the caller doesn't know the SME's
// sector (the current proxy survey doesn't collect it).
const generalSector = "general"

// Thresholds define the ratio cut-offs, relative to the baseline, that
// separate each tier:
//
//	ratio = TotalCO2eKg / Baseline.CO2eKg
//
// ratio <= Gold   -> gold
// ratio <= Silver -> silver
// otherwise       -> bronze (verified baseline completion only)
type Thresholds struct {
	Gold   float64
	Silver float64
}

// DefaultThresholds are the tier cut-offs used when none are supplied:
// Gold requires being at least 30% below baseline; Silver requires being
// at or below baseline.
var DefaultThresholds = Thresholds{
	Gold:   0.70,
	Silver: 1.00,
}

var (
	ErrInvalidFootprint = errors.New("badge: total co2e must be a positive, finite value")
	ErrInvalidBaseline  = errors.New("badge: baseline co2e must be a positive, finite value")
	ErrBaselineNotFound = errors.New("badge: no baseline found for sector, and no fallback available")
)

// BaselineStore resolves the applicable industry baseline for a sector.
type BaselineStore interface {
	Lookup(sector string) (Baseline, error)
}

// StaticBaselineStore is a simple in-memory BaselineStore. An empty or
// unrecognised sector falls back to the "general" baseline, if one has
// been registered.
type StaticBaselineStore struct {
	baselines map[string]Baseline
}

// NewStaticBaselineStore returns an empty StaticBaselineStore.
func NewStaticBaselineStore() *StaticBaselineStore {
	return &StaticBaselineStore{baselines: make(map[string]Baseline)}
}

// Add registers (or overwrites) a baseline entry.
func (s *StaticBaselineStore) Add(b Baseline) {
	s.baselines[normalizeSector(b.Sector)] = b
}

// Lookup implements BaselineStore.
func (s *StaticBaselineStore) Lookup(sector string) (Baseline, error) {
	key := normalizeSector(sector)
	if key == "" {
		key = generalSector
	}

	if b, ok := s.baselines[key]; ok {
		return b, nil
	}
	if b, ok := s.baselines[generalSector]; ok {
		return b, nil
	}

	return Baseline{}, ErrBaselineNotFound
}

func normalizeSector(sector string) string {
	return strings.ToLower(strings.TrimSpace(sector))
}

// Service awards EcoBid badges by comparing an SME's verified carbon
// footprint against the relevant industry baseline.
type Service struct {
	baselines  BaselineStore
	thresholds Thresholds
}

// NewService constructs a badge Service using the given baseline store and
// the default tier thresholds.
func NewService(baselines BaselineStore) *Service {
	return &Service{
		baselines:  baselines,
		thresholds: DefaultThresholds,
	}
}

// WithThresholds overrides the default tier thresholds on the service.
func (s *Service) WithThresholds(t Thresholds) *Service {
	s.thresholds = t
	return s
}

// Evaluate awards a badge tier for the given total footprint and sector.
// sector may be empty, in which case the "general" baseline is used.
func (s *Service) Evaluate(totalCO2eKg float64, sector string) (Result, error) {
	if err := validateFootprint(totalCO2eKg); err != nil {
		return Result{}, err
	}

	baseline, err := s.baselines.Lookup(sector)
	if err != nil {
		return Result{}, err
	}
	if err := validateBaseline(baseline.CO2eKg); err != nil {
		return Result{}, err
	}

	thresholds := s.thresholds
	if thresholds == (Thresholds{}) {
		thresholds = DefaultThresholds
	}

	ratio := totalCO2eKg / baseline.CO2eKg

	tier := TierBronze
	switch {
	case ratio <= thresholds.Gold:
		tier = TierGold
	case ratio <= thresholds.Silver:
		tier = TierSilver
	}

	return Result{
		Tier:            tier,
		TotalCO2eKg:     totalCO2eKg,
		BaselineSector:  baseline.Sector,
		BaselineCO2eKg:  baseline.CO2eKg,
		BaselineVersion: baseline.Version,
		RatioToBaseline: ratio,
	}, nil
}

func validateFootprint(f float64) error {
	if math.IsNaN(f) || math.IsInf(f, 0) || f <= 0 {
		return ErrInvalidFootprint
	}
	return nil
}

func validateBaseline(co2e float64) error {
	if math.IsNaN(co2e) || math.IsInf(co2e, 0) || co2e <= 0 {
		return ErrInvalidBaseline
	}
	return nil
}
