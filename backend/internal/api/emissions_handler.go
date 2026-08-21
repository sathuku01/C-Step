package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"c-step/internal/emissions/climatiq"
)

type EmissionsHandler struct {
	climatiq *climatiq.Client
}

func NewEmissionsHandler(client *climatiq.Client) *EmissionsHandler {
	return &EmissionsHandler{
		climatiq: client,
	}
}

type EstimateRequest struct {
	ActivityID  string                 `json:"activity_id" binding:"required"`
	DataVersion string                 `json:"data_version" binding:"required"`
	Region      string                 `json:"region"`
	Year        int                    `json:"year"`
	Parameters  map[string]interface{} `json:"parameters" binding:"required"`
}

func (h *EmissionsHandler) MicroEstimate(c *gin.Context) {
	var input MicroEstimateRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "micro estimate calculation not implemented yet",
	})
}
func (h *EmissionsHandler) Estimate(c *gin.Context) {
	var input EstimateRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	result, err := h.climatiq.Estimate(
		c.Request.Context(),
		climatiq.EstimateRequest{
			EmissionFactor: climatiq.EmissionFactorSelector{
				ActivityID:  input.ActivityID,
				DataVersion: input.DataVersion,
				Region:      input.Region,
				Year:        input.Year,
			},
			Parameters: input.Parameters,
		},
	)

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"co2e":               result.CO2e,
		"co2e_unit":          result.CO2eUnit,
		"calculation_method": result.CO2eCalculationMethod,
		"calculation_origin": result.CO2eCalculationOrigin,
		"activity_data":      result.ActivityData,
		"emission_factor":    result.EmissionFactor,
		"notices":            result.Notices,
	})
}
