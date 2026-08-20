package verification

import (
	"errors"
	"time"
)

// Level represents how strongly an emissions figure is backed by evidence,
// mirroring the confidence values assessment.confidenceFromEvidence
// produces per line item ("high", "medium", "low", "unverified").
type Level string

const (
	LevelHigh       Level = "high"
	LevelMedium     Level = "medium"
	LevelLow        Level = "low"
	LevelUnverified Level = "unverified"
)

var levelRank = map[Level]int{
	LevelUnverified: 0,
	LevelLow:        1,
	LevelMedium:     2,
	LevelHigh:       3,
}

// ParseLevel converts a raw confidence string into a Level. Anything
// unrecognised -- including an empty string -- is treated as unverified
// rather than rejected outright: missing evidence is itself meaningful
// information, not a data error.
func ParseLevel(s string) Level {
	switch Level(s) {
	case LevelHigh, LevelMedium, LevelLow, LevelUnverified:
		return Level(s)
	default:
		return LevelUnverified
	}
}

// ErrNoConfidences is returned when a report has no confidence values to
// aggregate at all (e.g. an assessment with an empty breakdown).
var ErrNoConfidences = errors.New("verification: at least one confidence value is required")

// WeakestLevel returns the lowest of the given levels. A report is only as
// trustworthy as its least-verified line item, so a single estimated figure
// pulls the whole report down to that level rather than being averaged away.
func WeakestLevel(levels []Level) (Level, error) {
	if len(levels) == 0 {
		return "", ErrNoConfidences
	}

	weakest := LevelHigh
	for _, l := range levels {
		if levelRank[l] < levelRank[weakest] {
			weakest = l
		}
	}

	return weakest, nil
}

// verifiableThreshold is the minimum overall confidence level a report must
// reach before it can be hash-anchored. Reports built entirely from
// low-confidence or unverified estimates can still be scored by badge, but
// aren't eligible for an immutable, on-chain verified stamp -- that's the
// mechanism that keeps the badge system from being used to greenwash
// unverified claims.
const verifiableThreshold = LevelMedium

// Record is the outcome of verifying a report: the overall confidence level
// behind its figures, whether it qualifies to be blockchain-anchored, and
// -- for reports that qualify -- its content hash and when it was hashed.
type Record struct {
	Level      Level     `json:"level"`
	Verifiable bool      `json:"verifiable"`
	ReportHash string    `json:"report_hash,omitempty"`
	HashedAt   time.Time `json:"hashed_at,omitempty"`
}

// Service turns per-line-item evidence confidence into an overall
// verification record for a report, hashing it when it's trustworthy
// enough to anchor.
type Service struct {
	now func() time.Time
}

// NewService constructs a verification Service.
func NewService() *Service {
	return &Service{now: time.Now}
}

// Verify aggregates the confidence levels behind a report's emissions
// figures into an overall Level. If that level meets verifiableThreshold,
// payload (the finalized report content -- e.g. the assessment result and
// badge tier together) is hashed into a content-addressed fingerprint ready
// for blockchain anchoring. Reports below the threshold get a Record with
// Verifiable set to false and no hash, rather than an error: failing to
// verify is a valid, expected outcome, not a failure of this call.
func (s *Service) Verify(confidences []Level, payload any) (Record, error) {
	level, err := WeakestLevel(confidences)
	if err != nil {
		return Record{}, err
	}

	record := Record{
		Level:      level,
		Verifiable: levelRank[level] >= levelRank[verifiableThreshold],
	}

	if !record.Verifiable {
		return record, nil
	}

	hash, err := HashPayload(payload)
	if err != nil {
		return Record{}, err
	}

	record.ReportHash = hash
	record.HashedAt = s.now()

	return record, nil
}
