package blockchain_test

import (
	"context"
	"errors"
	"testing"

	"c-step/internal/blockchain"
)

func newService() *blockchain.Service {
	return blockchain.NewService(blockchain.NewMockClient())
}

func TestAnchor_Success(t *testing.T) {
	svc := newService()

	req := blockchain.AnchorRequest{
		AssessmentID: "test-assessment-1",
		ReportHash:   "a" + "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde",
		CO2eKg:       1234.5,
		BaselineCO2eKg: 5000,
		Tier:         "silver",
	}

	// Pad the hash to exactly 64 hex chars.
	req.ReportHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

	result, err := svc.Anchor(context.Background(), req)
	if err != nil {
		t.Fatalf("Anchor() unexpected error: %v", err)
	}
	if result.TokenID == 0 {
		t.Error("Anchor() returned token ID 0, want > 0")
	}
	if result.TxHash == "" {
		t.Error("Anchor() returned empty TxHash")
	}
}

func TestAnchor_AlreadyAnchored(t *testing.T) {
	svc := newService()

	req := blockchain.AnchorRequest{
		AssessmentID: "test-assessment-2",
		ReportHash:   "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		CO2eKg:       100,
		BaselineCO2eKg: 5000,
		Tier:         "gold",
	}

	if _, err := svc.Anchor(context.Background(), req); err != nil {
		t.Fatalf("first Anchor() unexpected error: %v", err)
	}

	_, err := svc.Anchor(context.Background(), req)
	if !errors.Is(err, blockchain.ErrAlreadyAnchored) {
		t.Fatalf("second Anchor() got %v, want ErrAlreadyAnchored", err)
	}
}

func TestAnchor_EmptyHash(t *testing.T) {
	svc := newService()

	req := blockchain.AnchorRequest{
		AssessmentID: "test-assessment-3",
		ReportHash:   "",
		CO2eKg:       100,
		Tier:         "bronze",
	}

	_, err := svc.Anchor(context.Background(), req)
	if err == nil {
		t.Fatal("Anchor() with empty hash: expected error, got nil")
	}
}

func TestStatus_NotAnchored(t *testing.T) {
	svc := newService()
	hash := "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

	status, err := svc.Status(context.Background(), hash)
	if err != nil {
		t.Fatalf("Status() unexpected error: %v", err)
	}
	if status.Anchored {
		t.Error("Status() for un-anchored hash returned Anchored=true")
	}
}

func TestStatus_AfterAnchor(t *testing.T) {
	svc := newService()

	hash := "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
	req := blockchain.AnchorRequest{
		AssessmentID: "test-assessment-4",
		ReportHash:   hash,
		CO2eKg:       300,
		BaselineCO2eKg: 5000,
		Tier:         "bronze",
	}

	anchored, err := svc.Anchor(context.Background(), req)
	if err != nil {
		t.Fatalf("Anchor() unexpected error: %v", err)
	}

	status, err := svc.Status(context.Background(), hash)
	if err != nil {
		t.Fatalf("Status() unexpected error: %v", err)
	}
	if !status.Anchored {
		t.Error("Status() returned Anchored=false after successful Anchor()")
	}
	if status.TokenID != anchored.TokenID {
		t.Errorf("Status() TokenID=%d, want %d", status.TokenID, anchored.TokenID)
	}
}
