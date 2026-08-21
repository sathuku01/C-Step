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

	userID, ok := getUserID(c)
	if !ok {
		return
	}

	result, err := h.service.Calculate(
		c.Request.Context(),
		userID,
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

	userID, ok := getUserID(c)
	if !ok {
		return
	}

	results, err := h.service.List(
		c.Request.Context(),
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, results)
}

func (h *AssessmentHandler) Get(c *gin.Context) {

	userID, ok := getUserID(c)
	if !ok {
		return
	}
	id := c.Param("id")

	result, err := h.service.Get(
		c.Request.Context(),
		id,
		userID,
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
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	results, err := h.service.List(
		c.Request.Context(),
		userID,
	)
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
		response["latest_assessment"] = results[0]
	}

	c.JSON(http.StatusOK, response)
}
func getUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "missing authenticated user",
		})
		return "", false
	}

	id, ok := userID.(string)
	if !ok || id == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "invalid authenticated user",
		})
		return "", false
	}

	return id, true
}
