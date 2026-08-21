# C-Step Architecture

## System Overview

C-Step (EcoBid Ledger) is a four-layer ESG verification platform for SMEs:

```
SME Frontend
    |
    | JSON REST (JWT-authenticated)
    v
Go Backend (Gin)
    |-- Climatiq API  (emissions calculation)
    |-- Badge Service (tier evaluation)
    |-- Verification  (SHA-256 hashing)
    |-- Blockchain    (on-chain anchoring)
    |-- SQLite        (assessment persistence)
```

## Request Flow

```
POST /assessments/calculate
         |
         v
  [Climatiq API] --> CO2e per category (electricity, fuel, transport)
         |
         v
  [Badge Service] --> Tier: Gold / Silver / Bronze
         |
         v
  [Verification] --> SHA-256 report hash (if evidence >= medium)
         |
         v
  [SQLite] --> Persist AssessmentResult
         |
         v
  200 OK { id, total_co2e_kg, badge, verification }


POST /assessments/:id/anchor
         |
         v
  Lookup assessment + validate verifiable=true
         |
         v
  [Blockchain.Anchor] --> mint() on EcoBidBadge contract
         |
         v
  200 OK { tx_hash, token_id, block_number, anchored_at }
```

## Package Structure (backend/)

```
cmd/api/main.go           -- Entry point, wiring
internal/
  api/                    -- HTTP handlers (Gin)
    handler.go            -- Assessment endpoints
    emissions_handler.go  -- Climatiq proxy endpoint
    blockchain_handler.go -- Anchor + status endpoints
  assessment/             -- Core domain: model, service, repository
  auth/                   -- JWT auth: register, login, middleware
  badge/                  -- Tier evaluation against baselines
  blockchain/             -- On-chain anchoring
    client.go             -- go-ethereum RPC client
    service.go            -- Anchor orchestration + caching
    mock_client.go        -- In-process mock (dev / test)
    model.go              -- AnchorRequest, AnchorResult, BadgeStatus
  emissions/
    climatiq/             -- Climatiq API client
    local/                -- (placeholder) local factor tables
  verification/           -- SHA-256 report hashing
  config/                 -- (placeholder) structured config loading
  reports/                -- (placeholder) PDF report generation
  recommendations/        -- (placeholder) AI recommendation engine
  server/                 -- (placeholder) server abstraction
```

## Blockchain Integration

### Live Mode

Set `ETHEREUM_RPC_URL` in `.env` to point to a real or test Ethereum node.
The `blockchain.Client` uses **go-ethereum** to:

1. Encode the `mint()` calldata from the ABI.
2. Sign and submit the transaction with the deployer wallet.
3. Poll for a receipt (configurable timeout, default 60 s).
4. Parse the `BadgeMinted` event to extract the assigned `tokenID`.

### Mock Mode (Default)

When `ETHEREUM_RPC_URL` is not set, `blockchain.MockClient` simulates
anchoring in-process with no real chain interaction. Token IDs increment
from 1, and tx hashes are deterministic mock strings. All API endpoints
behave identically from the caller''s perspective.

### Contract

`contracts/EcoBidBadge.sol` — Soulbound ERC-like registry.
One badge per report hash. `mint()` is owner-only and reverts on
duplicate hashes. See `contracts/README.md` for deployment instructions.
