package api

import (
	"net/http"

	"c-step/internal/assessment"
	"errors"
	"github.com/gin-gonic/gin"
)

type AssessmentHandler struct {
	service *assessment.Service
}

func NewAssessmentHandler(
	service *assessment.Service,
) *AssessmentHandler {
	return &AssessmentHandler{
		service: service,
	}
}

func (h *AssessmentHandler) Calculate(c *gin.Context) {

	var input assessment.CreateAssessmentRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid assessment",
			"details": err.Error(),
		})
		return
	}

	result, err := h.service.Calculate(
		c.Request.Context(),
		input,
	)

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AssessmentHandler) List(c *gin.Context) {
	results, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, results)
}

func (h *AssessmentHandler) Get(c *gin.Context) {
	id := c.Param("id")

	result, err := h.service.Get(
		c.Request.Context(),
		id,
	)

	if err != nil {
		if errors.Is(err, assessment.ErrAssessmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "assessment not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, result)
}


func (h *AssessmentHandler) Dashboard(c *gin.Context) {
	results, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	var totalCO2e float64

	for _, assessment := range results {
		totalCO2e += assessment.TotalCO2eKg
	}

	response := gin.H{
		"total_assessments": len(results),
		"total_co2e_kg":     totalCO2e,
	}

	if len(results) > 0 {
		response["latest_assessment"] = results[len(results)-1]
	}

	c.JSON(http.StatusOK, response)
}