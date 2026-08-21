package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrUserNotFound = errors.New("user not found")
var ErrUserAlreadyExists = errors.New("user already exists")

type Repository interface {
	Create(ctx context.Context, user *User) error
	GetByEmail(ctx context.Context, email string) (*User, error)
	GetByID(ctx context.Context, id string) (*User, error)
}

type SQLiteRepository struct {
	db *sql.DB
}

func NewSQLiteRepository(db *sql.DB) (*SQLiteRepository, error) {
	repo := &SQLiteRepository{db: db}

	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			company TEXT NOT NULL,
			password TEXT NOT NULL
		)
	`)
	if err != nil {
		return nil, fmt.Errorf("create users table: %w", err)
	}

	return repo, nil
}

func (r *SQLiteRepository) Create(
	ctx context.Context,
	user *User,
) error {
	_, err := r.db.ExecContext(
		ctx,
		`INSERT INTO users (id, email, name, company, password)
		 VALUES (?, ?, ?, ?, ?)`,
		user.ID,
		user.Email,
		user.Name,
		user.Company,
		user.Password,
	)

	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}

	return nil
}

func (r *SQLiteRepository) GetByEmail(
	ctx context.Context,
	email string,
) (*User, error) {
	var user User

	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, email, name, company, password
		 FROM users
		 WHERE email = ?`,
		email,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Company,
		&user.Password,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}

	return &user, nil
}

func (r *SQLiteRepository) GetByID(
	ctx context.Context,
	id string,
) (*User, error) {
	var user User

	err := r.db.QueryRowContext(
		ctx,
		`SELECT id, email, name, company, password
		 FROM users
		 WHERE id = ?`,
		id,
	).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Company,
		&user.Password,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return &user, nil
}
