package assessment

import (
	"context"
	"errors"
)

var ErrAssessmentNotFound = errors.New("assessment not found")

type Repository interface {
	Create(ctx context.Context, assessment *AssessmentResult) error
	GetByID(ctx context.Context, id string, userID string) (*AssessmentResult, error)
	List(ctx context.Context, userID string) ([]*AssessmentResult, error)
}
