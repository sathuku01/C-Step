package blockchain

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
)

// ErrAlreadyAnchored is returned when a caller tries to anchor a report hash
// that has already been committed on-chain.
var ErrAlreadyAnchored = errors.New("blockchain: assessment already anchored")

// ErrNotAnchored is returned when status is requested for a hash that has not
// yet been committed.
var ErrNotAnchored = errors.New("blockchain: assessment not yet anchored")

// Anchorer is the interface the Service uses to interact with the chain.
// The real implementation is *Client; the interface makes the service testable
// without a live node.
type Anchorer interface {
	Anchor(ctx context.Context, req AnchorRequest) (*AnchorResult, error)
	IsAnchored(ctx context.Context, reportHash string) (bool, error)
	TokenIDForHash(ctx context.Context, reportHash string) (uint64, error)
}

// Service orchestrates blockchain anchoring for verified ESG assessments.
// It maintains an in-process cache of anchored results so that repeated
// Status queries don't hit the chain for every call during the same process
// lifetime.
type Service struct {
	client Anchorer

	mu      sync.RWMutex
	// cache maps reportHash -> AnchorResult for assessments anchored during
	// this process run.  On restart the service re-queries the chain.
	cache   map[string]*AnchorResult
}

// NewService constructs a blockchain Service backed by the given Anchorer.
func NewService(client Anchorer) *Service {
	return &Service{
		client: client,
		cache:  make(map[string]*AnchorResult),
	}
}

// Anchor submits the assessment's verified report hash to the EcoBidBadge
// smart contract as a Soulbound token.  It first checks whether the hash is
// already on-chain to avoid duplicate transactions.
func (s *Service) Anchor(ctx context.Context, req AnchorRequest) (*AnchorResult, error) {
	if req.ReportHash == "" {
		return nil, errors.New("blockchain: report hash must not be empty")
	}

	// Fast path: check the in-process cache first.
	s.mu.RLock()
	if cached, ok := s.cache[req.ReportHash]; ok {
		s.mu.RUnlock()
		return cached, ErrAlreadyAnchored
	}
	s.mu.RUnlock()

	// Check the chain (handles restarts / multiple backend replicas).
	already, err := s.client.IsAnchored(ctx, req.ReportHash)
	if err != nil {
		return nil, fmt.Errorf("blockchain: check anchor status: %w", err)
	}
	if already {
		return nil, ErrAlreadyAnchored
	}

	log.Printf(
		"[blockchain] anchoring assessment %s (tier=%s co2e=%.2fkg)",
		req.AssessmentID, req.Tier, req.CO2eKg,
	)

	result, err := s.client.Anchor(ctx, req)
	if err != nil {
		return nil, err
	}

	log.Printf(
		"[blockchain] anchored assessment %s: tx=%s token=%d block=%d",
		req.AssessmentID, result.TxHash, result.TokenID, result.BlockNumber,
	)

	// Populate the cache.
	s.mu.Lock()
	s.cache[req.ReportHash] = result
	s.mu.Unlock()

	return result, nil
}

// Status returns the on-chain anchor status for the given report hash.
// It checks the in-process cache first, then queries the contract.
func (s *Service) Status(ctx context.Context, reportHash string) (*BadgeStatus, error) {
	if reportHash == "" {
		return nil, errors.New("blockchain: report hash must not be empty")
	}

	// Check in-process cache.
	s.mu.RLock()
	if cached, ok := s.cache[reportHash]; ok {
		s.mu.RUnlock()
		at := cached.AnchoredAt
		return &BadgeStatus{
			Anchored:    true,
			TokenID:     cached.TokenID,
			TxHash:      cached.TxHash,
			BlockNumber: cached.BlockNumber,
			AnchoredAt:  &at,
		}, nil
	}
	s.mu.RUnlock()

	// Fall back to a live chain query.
	anchored, err := s.client.IsAnchored(ctx, reportHash)
	if err != nil {
		return nil, fmt.Errorf("blockchain: check anchor status: %w", err)
	}
	if !anchored {
		return &BadgeStatus{Anchored: false}, nil
	}

	tokenID, err := s.client.TokenIDForHash(ctx, reportHash)
	if err != nil {
		return nil, fmt.Errorf("blockchain: get token ID: %w", err)
	}

	return &BadgeStatus{
		Anchored: true,
		TokenID:  tokenID,
	}, nil
}
