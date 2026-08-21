package api

import (
	"errors"
	"net/http"

	"c-step/internal/assessment"
	"c-step/internal/blockchain"

	"github.com/gin-gonic/gin"
)

// BlockchainHandler exposes the blockchain anchoring endpoints.
type BlockchainHandler struct {
	assessments *assessment.Service
	blockchain  *blockchain.Service
}

// NewBlockchainHandler creates a BlockchainHandler that bridges assessment
// data with the blockchain anchoring service.
func NewBlockchainHandler(
	assessments *assessment.Service,
	bc *blockchain.Service,
) *BlockchainHandler {
	return &BlockchainHandler{
		assessments: assessments,
		blockchain:  bc,
	}
}

// Anchor godoc
//
//	@Summary      Anchor an assessment on-chain
//	@Description  Submits a verified assessment hash to the EcoBidBadge smart
//	              contract as a Soulbound token. The assessment must have been
//	              verified (verifiable=true) before anchoring is possible.
//	@Tags         blockchain
//	@Param        id   path  string  true  "Assessment UUID"
//	@Success      200  {object}  blockchain.AnchorResult
//	@Failure      400  {object}  map[string]string
//	@Failure      404  {object}  map[string]string
//	@Failure      409  {object}  map[string]string  "already anchored"
//	@Failure      500  {object}  map[string]string
//	@Router       /assessments/{id}/anchor [post]
func (h *BlockchainHandler) Anchor(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")

	result, err := h.assessments.Get(c.Request.Context(), id, userID)
	if err != nil {
		if errors.Is(err, assessment.ErrAssessmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Only verified assessments may be anchored.
	if result.Verification == nil || !result.Verification.Verifiable {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "assessment is not verifiable; only assessments with " +
				"medium or higher evidence confidence can be anchored on-chain",
		})
		return
	}

	if result.Verification.ReportHash == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "assessment has no report hash; re-run the assessment to generate one",
		})
		return
	}

	// Resolve the recipient address from the request body (optional).
	var body struct {
		RecipientAddress string `json:"recipient_address"`
	}
	// Best-effort body parse; missing or invalid body just means we use
	// the custodial deployer address as the recipient.
	_ = c.ShouldBindJSON(&body)

	badgeTier := ""
	if result.Badge != nil {
		badgeTier = result.Badge.Tier
	}
	baselineCO2e := 0.0
	if result.Badge != nil {
		baselineCO2e = result.Badge.BaselineCO2eKg
	}

	req := blockchain.AnchorRequest{
		AssessmentID:     result.ID,
		RecipientAddress: body.RecipientAddress,
		ReportHash:       result.Verification.ReportHash,
		CO2eKg:           result.TotalCO2eKg,
		BaselineCO2eKg:   baselineCO2e,
		Tier:             badgeTier,
	}

	anchorResult, err := h.blockchain.Anchor(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, blockchain.ErrAlreadyAnchored) {
			c.JSON(http.StatusConflict, gin.H{
				"error": "this assessment has already been anchored on-chain",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, anchorResult)
}

// BlockchainStatus godoc
//
//	@Summary      Get on-chain anchor status for an assessment
//	@Description  Returns whether the assessment report hash has been committed
//	              to the EcoBidBadge smart contract, along with the token ID and
//	              transaction details if it has.
//	@Tags         blockchain
//	@Param        id   path  string  true  "Assessment UUID"
//	@Success      200  {object}  blockchain.BadgeStatus
//	@Failure      404  {object}  map[string]string
//	@Failure      500  {object}  map[string]string
//	@Router       /assessments/{id}/blockchain-status [get]
func (h *BlockchainHandler) BlockchainStatus(c *gin.Context) {
	userID, ok := getUserID(c)
	if !ok {
		return
	}

	id := c.Param("id")

	result, err := h.assessments.Get(c.Request.Context(), id, userID)
	if err != nil {
		if errors.Is(err, assessment.ErrAssessmentNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.Verification == nil || result.Verification.ReportHash == "" {
		c.JSON(http.StatusOK, blockchain.BadgeStatus{Anchored: false})
		return
	}

	status, err := h.blockchain.Status(c.Request.Context(), result.Verification.ReportHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.Badge != nil {
		status.Tier = result.Badge.Tier
	}

	c.JSON(http.StatusOK, status)
}
