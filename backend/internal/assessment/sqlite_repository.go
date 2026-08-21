package assessment

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
)

type SQLiteRepository struct {
	db *sql.DB
}

func NewSQLiteRepository(db *sql.DB) (*SQLiteRepository, error) {
	repo := &SQLiteRepository{db: db}

	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS assessments (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		total_co2e_kg REAL NOT NULL,
		data TEXT NOT NULL
	)
`)
	if err != nil {
		return nil, fmt.Errorf("create assessments table: %w", err)
	}

	return repo, nil
}

func (r *SQLiteRepository) Create(
	ctx context.Context,
	assessment *AssessmentResult,
) error {
	data, err := json.Marshal(assessment)
	if err != nil {
		return fmt.Errorf("marshal assessment: %w", err)
	}

	_, err = r.db.ExecContext(
		ctx,
		`INSERT INTO assessments (id, user_id, total_co2e_kg, data)
	 VALUES (?, ?, ?, ?)`,
		assessment.ID,
		assessment.UserID,
		assessment.TotalCO2eKg,
		data,
	)
	if err != nil {
		return fmt.Errorf("save assessment: %w", err)
	}

	return nil
}

func (r *SQLiteRepository) GetByID(
	ctx context.Context,
	id string,
	userID string,
) (*AssessmentResult, error) {
	var data string

	err := r.db.QueryRowContext(
		ctx,
		`SELECT data FROM assessments WHERE id = ? AND user_id = ?`,
		id,
		userID,
	).Scan(&data)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrAssessmentNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("get assessment: %w", err)
	}

	var result AssessmentResult

	if err := json.Unmarshal([]byte(data), &result); err != nil {
		return nil, fmt.Errorf("decode assessment: %w", err)
	}

	return &result, nil
}

func (r *SQLiteRepository) List(
	ctx context.Context,
	userID string,
) ([]*AssessmentResult, error) {
	rows, err := r.db.QueryContext(
		ctx,
		`SELECT data FROM assessments
 WHERE user_id = ?
 ORDER BY rowid DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list assessments: %w", err)
	}
	defer rows.Close()

	var results []*AssessmentResult

	for rows.Next() {
		var data string

		if err := rows.Scan(&data); err != nil {
			return nil, fmt.Errorf("scan assessment: %w", err)
		}

		var result AssessmentResult

		if err := json.Unmarshal([]byte(data), &result); err != nil {
			return nil, fmt.Errorf("decode assessment: %w", err)
		}

		results = append(results, &result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate assessments: %w", err)
	}

	return results, nil
}
