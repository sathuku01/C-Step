package main

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
	"os"

	"c-step/internal/auth"
	"c-step/internal/badge"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"net/http"

	"c-step/internal/api"
	"c-step/internal/assessment"
	"c-step/internal/emissions/climatiq"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	climatiqClient, err := climatiq.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	router := gin.Default()

	emissionsHandler := api.NewEmissionsHandler(climatiqClient)
	// assessmentService := assessment.NewService(climatiqClient)
	baselineStore := badge.NewStaticBaselineStore()

	baselineStore.Add(badge.Baseline{
		Sector:  "general",
		CO2eKg:  5000,
		Version: "v1",
	})

	badgeService := badge.NewService(baselineStore)

	db, err := sql.Open("sqlite", "cstep.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	assessmentRepo, err := assessment.NewSQLiteRepository(db)
	if err != nil {
		log.Fatal(err)
	}

	assessmentService := assessment.NewService(
		climatiqClient,
		badgeService,
		assessmentRepo,
	)

	assessmentHandler := api.NewAssessmentHandler(assessmentService)

	authRepo, err := auth.NewSQLiteRepository(db)
	if err != nil {
		log.Fatal(err)
	}

	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService)

	v1 := router.Group("/api/v1")
	{
		v1.POST(
			"/emissions/estimate",
			emissionsHandler.Estimate,
		)

		v1.POST(
			"/assessments/calculate",
			assessmentHandler.Calculate,
		)

		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})

		// v1.GET(
		// 	"/dashboard",
		// 	assessmentHandler.Dashboard,
		// )

		// v1.GET("/assessments", assessmentHandler.List)
		// v1.GET("/assessments/:id", assessmentHandler.Get)

		v1.POST("/auth/register", authHandler.Register)
		v1.POST("/auth/login", authHandler.Login)

		// v1.GET(
		// 	"/auth/me",
		// 	auth.Middleware(os.Getenv("JWT_SECRET")),
		// 	authHandler.Me,
		// )

		protected := v1.Group("")
		protected.Use(auth.Middleware(os.Getenv("JWT_SECRET")))

		protected.GET("/auth/me", authHandler.Me)

		protected.POST("/assessments", assessmentHandler.Calculate)
		protected.GET("/assessments", assessmentHandler.List)
		protected.GET("/assessments/:id", assessmentHandler.Get)
		// protected.GET("/dashboard", dashboardHandler.Get)

	}

	log.Println("C-step API running on :8080")

	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
