package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"c-step/internal/assessment"
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
