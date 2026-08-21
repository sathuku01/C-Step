package main

import (
	"log"

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
	

	assessmentRepo := assessment.NewMemoryRepository()

assessmentService := assessment.NewService(
    climatiqClient,
    badgeService,
    assessmentRepo,
)

	assessmentHandler := api.NewAssessmentHandler(assessmentService)

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

		v1.POST("/assessments", assessmentHandler.Calculate)
		v1.GET("/assessments", assessmentHandler.List)
		v1.GET("/assessments/:id", assessmentHandler.Get)

	}

	log.Println("C-step API running on :8080")

	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
