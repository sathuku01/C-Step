package verification

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
)

// ErrNilPayload is returned when HashPayload is asked to hash a nil value.
var ErrNilPayload = errors.New("verification: payload must not be nil")

// HashPayload returns the hex-encoded SHA-256 hash of the canonical JSON
// encoding of payload. The same payload always produces the same hash --
// that determinism is what lets a report be anchored on-chain once, and
// later re-verified by anyone who recomputes the hash from the same data
// and checks it matches what was anchored.
//
// encoding/json marshals struct fields in a fixed (declaration) order and
// sorts map keys, so this is safe to use with either struct or map payloads
// without extra canonicalisation.
func HashPayload(payload any) (string, error) {
	if payload == nil {
		return "", ErrNilPayload
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("verification: marshal payload: %w", err)
	}

	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]), nil
}
