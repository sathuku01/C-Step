package auth

type User struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Company  string `json:"company"`
	Password string `json:"-"`
}
