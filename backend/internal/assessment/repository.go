package assessment

import (
	"context"
	"errors"
	"sync"
)

var ErrAssessmentNotFound = errors.New("assessment not found")

type Repository interface {
	Create(ctx context.Context, assessment *AssessmentResult) error
	GetByID(ctx context.Context, id string) (*AssessmentResult, error)
	List(ctx context.Context) ([]*AssessmentResult, error)
}

type MemoryRepository struct {
	mu          sync.RWMutex
	assessments map[string]*AssessmentResult
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		assessments: make(map[string]*AssessmentResult),
	}
}

func (r *MemoryRepository) Create(
	ctx context.Context,
	assessment *AssessmentResult,
) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.assessments[assessment.ID] = assessment

	return nil
}

func (r *MemoryRepository) GetByID(
	ctx context.Context,
	id string,
) (*AssessmentResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	assessment, ok := r.assessments[id]
	if !ok {
		return nil, ErrAssessmentNotFound
	}

	return assessment, nil
}

func (r *MemoryRepository) List(
	ctx context.Context,
) ([]*AssessmentResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	results := make([]*AssessmentResult, 0, len(r.assessments))

	for _, assessment := range r.assessments {
		results = append(results, assessment)
	}

	return results, nil
}