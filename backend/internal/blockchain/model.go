package blockchain

import "time"

// AnchorRequest carries the data that the blockchain service needs to mint a
// Soulbound badge on-chain for a verified ESG assessment.
type AnchorRequest struct {
	// AssessmentID is the backend UUID for the assessment being anchored.
	AssessmentID string

	// RecipientAddress is the SME Ethereum wallet address that will receive
	// the Soulbound badge token.  When the caller does not supply one (e.g.
	// the SME has not yet linked a wallet), the platform-owned deployer
	// address is used as a custodial fallback.
	RecipientAddress string

	// ReportHash is the hex-encoded SHA-256 hash of the canonical JSON report
	// payload produced by the verification package.
	ReportHash string

	// CO2eKg is the total CO2e footprint in kilograms.
	CO2eKg float64

	// BaselineCO2eKg is the industry baseline footprint in kilograms.
	BaselineCO2eKg float64

	// Tier is the badge tier awarded: "gold", "silver", or "bronze".
	Tier string
}

// AnchorResult is returned by Service.Anchor after a successful on-chain
// transaction.
type AnchorResult struct {
	// TxHash is the hex-encoded Ethereum transaction hash of the mint call.
	TxHash string `json:"tx_hash"`

	// TokenID is the EcoBidBadge token ID assigned to this assessment.
	TokenID uint64 `json:"token_id"`

	// BlockNumber is the block in which the transaction was confirmed.
	BlockNumber uint64 `json:"block_number"`

	// AnchoredAt is the wall-clock time recorded when the transaction was
	// submitted (not block.timestamp, which is set by the chain).
	AnchoredAt time.Time `json:"anchored_at"`
}

// BadgeStatus is returned by Service.Status and represents the on-chain state
// of an anchored assessment.
type BadgeStatus struct {
	// Anchored is true if the report hash has been committed on-chain.
	Anchored bool `json:"anchored"`

	// TokenID is the on-chain token ID, 0 if not yet anchored.
	TokenID uint64 `json:"token_id,omitempty"`

	// TxHash is the transaction that created the token.
	TxHash string `json:"tx_hash,omitempty"`

	// BlockNumber is the block in which the token was created.
	BlockNumber uint64 `json:"block_number,omitempty"`

	// AnchoredAt is when the anchor transaction was submitted.
	AnchoredAt *time.Time `json:"anchored_at,omitempty"`

	// Tier is the badge tier stored in the AnchorResult; copied into the
	// status for API convenience.
	Tier string `json:"tier,omitempty"`
}
