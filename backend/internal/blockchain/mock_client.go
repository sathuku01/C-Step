package blockchain

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// MockClient is an in-memory implementation of Anchorer for use in tests and
// in development mode (when ETHEREUM_RPC_URL is not set).
//
// It simulates successful anchoring by assigning incrementing token IDs and
// storing results in a map.  It does not touch any real blockchain.
type MockClient struct {
	mu      sync.Mutex
	records map[string]*AnchorResult // reportHash -> result
	nextID  uint64
}

// NewMockClient returns a MockClient ready for use.
func NewMockClient() *MockClient {
	return &MockClient{
		records: make(map[string]*AnchorResult),
		nextID:  1,
	}
}

// Anchor simulates an on-chain mint by storing the result in memory.
func (m *MockClient) Anchor(_ context.Context, req AnchorRequest) (*AnchorResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.records[req.ReportHash]; exists {
		return nil, fmt.Errorf("mock: hash %s already anchored", req.ReportHash)
	}

	id := m.nextID
	m.nextID++

	result := &AnchorResult{
		TxHash:      fmt.Sprintf("0xmock%064d", id),
		TokenID:     id,
		BlockNumber: 1000000 + id,
		AnchoredAt:  time.Now().UTC(),
	}
	m.records[req.ReportHash] = result
	return result, nil
}

// IsAnchored checks whether the hash has been "minted" in the mock.
func (m *MockClient) IsAnchored(_ context.Context, reportHash string) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	_, ok := m.records[reportHash]
	return ok, nil
}

// TokenIDForHash returns the token ID assigned during mock anchoring, or 0.
func (m *MockClient) TokenIDForHash(_ context.Context, reportHash string) (uint64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.records[reportHash]; ok {
		return r.TokenID, nil
	}
	return 0, nil
}
