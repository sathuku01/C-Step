package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"c-step/internal/emissions/climatiq"
)

type MicroEstimateHandler struct {
	climatiq *climatiq.Client
}

func NewMicroEstimateHandler(client *climatiq.Client) *MicroEstimateHandler {
	return &MicroEstimateHandler{
		climatiq: client,
	}
}

type MicroEstimateRequest struct {
	Sector             string  `json:"sector" binding:"required"`
	Employees          int     `json:"employees" binding:"required,min=1"`
	MonthlyEnergySpend float64 `json:"monthlyEnergySpend" binding:"required,gte=0"`
}

type MicroEstimateResponse struct {
	TotalTonnes      float64 `json:"total_tonnes"`
	PeerTonnes       float64 `json:"peer_tonnes"`
	Scope1           float64 `json:"scope1"`
	Scope2           float64 `json:"scope2"`
	Scope3           float64 `json:"scope3"`
	Score            int     `json:"score"`
	SavingsPotential float64 `json:"savings_potential"`
	Source           string  `json:"source"`

	MonthlyEnergySpend float64 `json:"monthly_energy_spend"`
	
	AnnualEnergyKWh    float64 `json:"annual_energy_kwh"`
}

const electricityCostPerKWhUSD = 0.20

func (h *MicroEstimateHandler) Estimate(c *gin.Context) {
	var input MicroEstimateRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid request body",
			"details": err.Error(),
		})
		return
	}

	if input.MonthlyEnergySpend < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "monthly_energy_spend must be non-negative",
		})
		return
	}

	annualSpend := input.MonthlyEnergySpend * 12

	annualKWh := annualSpend / electricityCostPerKWhUSD

	result, err := h.climatiq.Estimate(
		c.Request.Context(),
		climatiq.EstimateRequest{
			EmissionFactor: climatiq.EmissionFactorSelector{
				ActivityID:  "electricity-supply_grid-source_total_supplier_mix",
				DataVersion: "^21",
				Region:      "GB",
				Year:        2020,
			},
			Parameters: map[string]interface{}{
				"energy":      annualKWh,
				"energy_unit": "kWh",
			},
		},
	)

	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{
			"error": err.Error(),
		})
		return
	}

	totalKg := result.CO2e
	totalTonnes := totalKg / 1000

	// Temporary peer comparison until sector-specific peer data
	// is wired into the backend.
	peerTonnes := totalTonnes * 1.3

	score := 40

	if peerTonnes > 0 {
		score = int((1 - totalTonnes/peerTonnes) * 100)
	}

	if score < 0 {
		score = 0
	}

	if score > 100 {
		score = 100
	}

	savingsPotential := totalKg * 0.15 * 0.05

	c.JSON(http.StatusOK, MicroEstimateResponse{
		TotalTonnes:      totalTonnes,
		PeerTonnes:       peerTonnes,
		Scope1:           0,
		Scope2:           totalTonnes,
		Scope3:           0,
		Score:            score,
		SavingsPotential: savingsPotential,
		Source:           "live",

		MonthlyEnergySpend: input.MonthlyEnergySpend,
		AnnualEnergyKWh:    annualKWh,
	})
}
