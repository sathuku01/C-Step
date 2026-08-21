package main

import (
	"database/sql"
	"log"
	"os"
	"strconv"
	"time"

	"c-step/internal/api"
	"c-step/internal/assessment"
	"c-step/internal/auth"
	"c-step/internal/badge"
	"c-step/internal/blockchain"
	"c-step/internal/emissions/climatiq"
	"c-step/internal/verification"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "modernc.org/sqlite"
	"net/http"

	_ "modernc.org/sqlite"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	climatiqClient, err := climatiq.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "c-step.db"
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is not set")
	}

	// ─── Blockchain ────────────────────────────────────────────────────
	// When ETHEREUM_RPC_URL is not set we fall back to an in-process mock
	// client so the rest of the API remains fully functional during local
	// development without a running Ethereum node.
	var blockchainService *blockchain.Service
	rpcURL := os.Getenv("ETHEREUM_RPC_URL")
	if rpcURL != "" {
		chainID, _ := strconv.ParseInt(os.Getenv("BLOCKCHAIN_CHAIN_ID"), 10, 64)

		confirmTimeout := 60 * time.Second
		if s := os.Getenv("BLOCKCHAIN_CONFIRM_TIMEOUT_S"); s != "" {
			if n, err := strconv.Atoi(s); err == nil && n > 0 {
				confirmTimeout = time.Duration(n) * time.Second
			}
		}

		chainClient, err := blockchain.NewClient(blockchain.ClientConfig{
			RPCURL:             rpcURL,
			ContractAddress:    os.Getenv("CONTRACT_ADDRESS"),
			DeployerPrivateKey: os.Getenv("DEPLOYER_PRIVATE_KEY"),
			ChainID:            chainID,
			ConfirmTimeout:     confirmTimeout,
		})
		if err != nil {
			log.Fatalf("blockchain: %v", err)
		}
		defer chainClient.Close()

		blockchainService = blockchain.NewService(chainClient)
		log.Printf("Blockchain: live mode (chain ID %d, contract %s)",
			chainID, os.Getenv("CONTRACT_ADDRESS"))
	} else {
		blockchainService = blockchain.NewService(blockchain.NewMockClient())
		log.Println("Blockchain: mock mode (set ETHEREUM_RPC_URL to enable live chain)")
	}
	// ──────────────────────────────────────────────────────────────────

	router := gin.Default()

	router.Use(api.CORSMiddleware())

	emissionsHandler := api.NewEmissionsHandler(climatiqClient)

	baselineStore := badge.NewStaticBaselineStore()

	baselineStore.Add(badge.Baseline{
		Sector:  "general",
		CO2eKg:  5000,
		Version: "v1",
	})

	badgeService := badge.NewService(baselineStore)

	verificationService := verification.NewService()

	assessmentRepo, err := assessment.NewSQLiteRepository(db)
	if err != nil {
		log.Fatal(err)
	}

	assessmentService := assessment.NewService(
		climatiqClient,
		badgeService,
		verificationService,
		assessmentRepo,
	)

	assessmentHandler := api.NewAssessmentHandler(assessmentService)

	blockchainHandler := api.NewBlockchainHandler(assessmentService, blockchainService)

	authRepo, err := auth.NewSQLiteRepository(db)
	if err != nil {
		log.Fatal(err)
	}

	authService := auth.NewService(authRepo)
	authHandler := auth.NewHandler(authService)

	v1 := router.Group("/api/v1")
	{
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})

		v1.POST("/auth/register", authHandler.Register)
		v1.POST("/auth/login", authHandler.Login)

		// Everything below requires a valid Bearer token; the middleware
		// sets "user_id" in the context, which handlers read via getUserID.
		protected := v1.Group("/")
		protected.Use(auth.Middleware(jwtSecret))
		{
			protected.GET("/auth/me", authHandler.Me)

			protected.POST("/emissions/estimate", emissionsHandler.Estimate)

			protected.GET("/dashboard", assessmentHandler.Dashboard)

			protected.POST("/assessments", assessmentHandler.Calculate)
			protected.POST("/assessments/calculate", assessmentHandler.Calculate)
			protected.GET("/assessments", assessmentHandler.List)
			protected.GET("/assessments/:id", assessmentHandler.Get)
			protected.GET("/assessments/:id/verify", assessmentHandler.Verify)

			// Blockchain anchoring routes.
			protected.POST("/assessments/:id/anchor", blockchainHandler.Anchor)
			protected.GET("/assessments/:id/blockchain-status", blockchainHandler.BlockchainStatus)

			protected.POST("/emissions/estimate", emissionsHandler.Estimate)

			protected.GET("/dashboard", assessmentHandler.Dashboard)

			protected.POST("/assessments", assessmentHandler.Calculate)
			protected.POST("/assessments/calculate", assessmentHandler.Calculate)
			protected.GET("/assessments", assessmentHandler.List)
			protected.GET("/assessments/:id", assessmentHandler.Get)
			protected.GET("/assessments/:id/verify", assessmentHandler.Verify)
		}
	}

	log.Println("C-step API running on :8000")

	if err := router.Run(":8000"); err != nil {
		log.Fatal(err)
	}
}

