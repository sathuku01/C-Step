package assessment

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
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

func (r *SQLiteRepository) GetDirectory(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id, u.company, a.data
		FROM users u
		LEFT JOIN assessments a ON a.id = (
			SELECT id FROM assessments WHERE user_id = u.id ORDER BY rowid DESC LIMIT 1
		)
	`)
	if err != nil {
		return nil, fmt.Errorf("query directory: %w", err)
	}
	defer rows.Close()

	var entries []map[string]interface{}
	for rows.Next() {
		var userID, companyName string
		var rawData sql.NullString

		if err := rows.Scan(&userID, &companyName, &rawData); err != nil {
			return nil, fmt.Errorf("scan directory row: %w", err)
		}

		score := 40
		var tonnes float64 = 0
		tier := "self"
		sector := "general"
		sectorLabel := "General Sector"
		var verifiedSources []string

		if rawData.Valid && rawData.String != "" {
			var result AssessmentResult
			if err := json.Unmarshal([]byte(rawData.String), &result); err == nil {
				tonnes = result.TotalCO2eKg / 1000.0
				if result.Badge != nil {
					tier = result.Badge.Tier
					sector = result.Badge.BaselineSector
					ratio := result.Badge.RatioToBaseline
					switch tier {
					case "gold":
						score = int(math.Round(100.0 - ratio*30.0))
						if score < 85 {
							score = 88
						}
					case "silver":
						score = int(math.Round(100.0 - ratio*30.0))
						if score < 70 || score >= 85 {
							score = 78
						}
					case "bronze":
						score = int(math.Round(100.0 - ratio*30.0))
						if score < 50 || score >= 70 {
							score = 60
						}
					}
					if score > 100 {
						score = 100
					}
					if score < 0 {
						score = 0
					}
				}
				if result.Verification != nil && result.Verification.Verifiable {
					verifiedSources = []string{"Utility API", "Climatiq Verified"}
					if tier == "self" {
						tier = "api"
					}
				}
			}
		}

		if sector == "general" {
			sectorLabel = "General business"
		} else {
			sectorLabel = strings.Title(sector)
		}

		entry := map[string]interface{}{
			"id":              userID,
			"name":            companyName,
			"sector":          sector,
			"sectorLabel":     sectorLabel,
			"location":        "Nairobi, KE",
			"score":           score,
			"tonnes":          tonnes,
			"tier":            tier,
			"employees":       10,
			"verifiedSources": verifiedSources,
		}
		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate directory rows: %w", err)
	}

	return entries, nil
}
