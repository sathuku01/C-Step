package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidEmail       = errors.New("invalid email")
	ErrInvalidPassword    = errors.New("password must be at least 6 characters")
)

type Service struct {
	repository Repository
}

func NewService(repository Repository) *Service {
	return &Service{
		repository: repository,
	}
}

func (s *Service) Register(
	ctx context.Context,
	email string,
	password string,
	name string,
	company string,
) (*User, error) {

	email = strings.ToLower(strings.TrimSpace(email))
	name = strings.TrimSpace(name)
	company = strings.TrimSpace(company)

	if email == "" {
		return nil, ErrInvalidEmail
	}

	if name == "" {
		return nil, errors.New("name is required")
	}

	if company == "" {
		return nil, errors.New("company is required")
	}

	if len(password) < 6 {
		return nil, ErrInvalidPassword
	}

	// Don't allow duplicate accounts.
	_, err := s.repository.GetByEmail(ctx, email)
	if err == nil {
		return nil, ErrUserAlreadyExists
	}

	if !errors.Is(err, ErrUserNotFound) {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &User{
		ID:       uuid.NewString(),
		Email:    email,
		Name:     name,
		Company:  company,
		Password: string(hash),
	}

	if err := s.repository.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *Service) Login(
	ctx context.Context,
	email string,
	password string,
) (*User, error) {

	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.repository.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}

		return nil, err
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(password),
	); err != nil {
		return nil, ErrInvalidCredentials
	}

	return user, nil
}

func (s *Service) GetByID(
	ctx context.Context,
	id string,
) (*User, error) {
	return s.repository.GetByID(ctx, id)
}

func (s *Service) CreateToken(user *User, secret string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"name":  user.Name,
		"company": user.Company,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secret))
}
