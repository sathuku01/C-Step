package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

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

	assessmentService := assessment.NewService(climatiqClient)

	assessmentHandler := api.NewAssessmentHandler(
		assessmentService,
	)

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
	}

	log.Println("C-step API running on :8080")

	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
