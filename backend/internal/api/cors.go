package api

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := getAllowedOrigins()

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		if isOriginAllowed(origin, allowedOrigins) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set(
			"Access-Control-Allow-Headers",
			"Origin, Content-Type, Accept, Authorization",
		)
		c.Writer.Header().Set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, PATCH, DELETE, OPTIONS",
		)

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func getAllowedOrigins() []string {
	envOrigins := os.Getenv("ALLOWED_ORIGINS")
	if envOrigins != "" {
		return strings.Split(envOrigins, ",")
	}

	return []string{
		"https://situoc-step.netlify.app",
		"http://localhost:5173",
		"http://localhost:3000",
		"http://localhost:8080",
		"http://localhost:8081",
		"http://127.0.0.1:5173",
		"http://127.0.0.1:3000",
		"http://127.0.0.1:8080",
		"http://127.0.0.1:8081",
	}
}

func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if strings.TrimSpace(allowed) == origin {
			return true
		}
	}
	return false
}
