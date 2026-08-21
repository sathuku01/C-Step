# C-Step — EcoBid Ledger

> **Zone01 Kisumu GreenTech Hackathon 2026**  
> AI + Blockchain track submission

C-Step is an accessible, digital ESG verification platform that helps SMEs measure, verify, and showcase their carbon footprint in minutes.  It bridges the gap between enterprise Scope 3 compliance demands and the limited capacity of small businesses to prove their green credentials.

---

## Problem

Enterprise buyers under EU CSDDD and global climate financing mandates are forcing suppliers to submit detailed ESG data.  SMEs lack the time, budget, and expertise to comply — and are being locked out of lucrative green supply chains as a result.

---

## Solution

EcoBid Ledger operates through four automated layers:

| Layer | Technology | What it does |
|---|---|---|
| **5-min proxy survey** | REST JSON API | Collects simple operational data (kWh, vehicle type, fuel litres) |
| **Emissions calculation** | Climatiq API | Converts inputs to kg CO₂e using region-specific IPCC factors |
| **Tiered badge system** | Go service | Awards Gold / Silver / Bronze based on ratio to industry baseline |
| **Blockchain anchoring** | Solidity + go-ethereum | SHA-256 report hash minted as a Soulbound Token on-chain |

---

## Quick Start

### Prerequisites

- Go ≥ 1.21
- SQLite (embedded via `modernc.org/sqlite`, no install needed)
- A [Climatiq](https://www.climatiq.io) API key

### 1. Clone & configure

```bash
git clone https://github.com/your-org/c-step.git
cd c-step/backend
cp .env.example .env
# Edit .env — set at minimum JWT_SECRET and CLIMATIQ_API_KEY
```

### 2. Run the backend

```bash
go run ./cmd/api
# API available at http://localhost:8080
```

### 3. Health check

```bash
curl http://localhost:8080/api/v1/health
# {"status":"ok"}
```

---

## API Endpoints

All endpoints (except `/health`, `/auth/register`, `/auth/login`) require a `Bearer` JWT token in the `Authorization` header.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new SME account |
| `POST` | `/api/v1/auth/login` | Login and receive a JWT |
| `GET`  | `/api/v1/auth/me` | Get authenticated user details |

### Assessments

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/assessments` | Run a new carbon footprint assessment |
| `GET`  | `/api/v1/assessments` | List all assessments for the user |
| `GET`  | `/api/v1/assessments/:id` | Get a single assessment |
| `GET`  | `/api/v1/assessments/:id/verify` | Re-verify assessment hash integrity |

### Blockchain

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/assessments/:id/anchor` | Mint a Soulbound Badge on-chain |
| `GET`  | `/api/v1/assessments/:id/blockchain-status` | Check on-chain anchor status |

### Emissions

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/emissions/estimate` | Raw Climatiq estimate proxy |

### Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/dashboard` | Summary stats (total CO₂e, assessment count) |

---

## Example Workflow

```bash
# 1. Register
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d ''{"email":"sme@example.com","password":"securepassword"}''

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d ''{"email":"sme@example.com","password":"securepassword"}'' | python -c "import sys,json; print(json.load(sys.stdin)[''token''])")

# 3. Run an assessment
ASSESSMENT=$(curl -s -X POST http://localhost:8080/api/v1/assessments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d ''{
    "electricity_kwh": 1200,
    "electricity_evidence": "utility_bill",
    "sector": "general",
    "fuel": {"type": "diesel", "litres": 80, "evidence": "receipt"}
  }'')

echo $ASSESSMENT | python -m json.tool

# 4. Anchor on blockchain (only if verifiable=true in the result)
ID=$(echo $ASSESSMENT | python -c "import sys,json; print(json.load(sys.stdin)[''id''])")
curl -X POST http://localhost:8080/api/v1/assessments/$ID/anchor \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d ''{}''

# 5. Check blockchain status
curl http://localhost:8080/api/v1/assessments/$ID/blockchain-status \
  -H "Authorization: Bearer $TOKEN"
```

---

## Badge Tiers

| Tier | Condition |
|---|---|
| 🥇 **Gold** | CO₂e ≤ 70% of industry baseline |
| 🥈 **Silver** | CO₂e ≤ 100% of industry baseline |
| 🥉 **Bronze** | Baseline completed, CO₂e > 100% of baseline |

Baselines are configurable per sector (`StaticBaselineStore`).  The default baseline is 5,000 kg CO₂e for the `general` sector.

---

## Verification & Blockchain

### How hashing works

1. After calculating emissions and awarding a badge, the service builds a **canonical JSON payload** containing `id`, `total_co2e_kg`, `breakdown`, and `badge`.
2. It computes `SHA-256(JSON bytes)` and stores the hex hash in the assessment record.
3. Assessments where all evidence is `low` or `unverified` are flagged `verifiable: false` and cannot be anchored — this prevents greenwashing of unsubstantiated claims.

### Smart contract

`contracts/EcoBidBadge.sol` is a Soulbound Token registry.  On-chain metadata per badge:

- `assessmentID` — backend UUID
- `reportHash` — SHA-256 hex as `bytes32`
- `co2eGrams` — footprint in grams (kg × 1000)
- `tier` — `Bronze` / `Silver` / `Gold`
- `anchoredAt` — `block.timestamp`

Badges are **non-transferable** — `transfer()` and `approve()` always revert.

### Mock vs live mode

| Variable | Mode |
|---|---|
| `ETHEREUM_RPC_URL` not set | **Mock mode** — in-process simulation |
| `ETHEREUM_RPC_URL` set | **Live mode** — real Ethereum/Polygon calls |

In mock mode, the API returns realistic `tx_hash`, `token_id`, and `block_number` values without touching any chain.  Ideal for development and CI.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Secret for signing JWTs |
| `CLIMATIQ_API_KEY` | **Yes** | Climatiq emissions API key |
| `DB_PATH` | No | SQLite file path (default: `c-step.db`) |
| `ETHEREUM_RPC_URL` | No | EVM node RPC URL (enables live blockchain) |
| `BLOCKCHAIN_CHAIN_ID` | No | EIP-155 chain ID (default: `80002` = Amoy) |
| `CONTRACT_ADDRESS` | No | Deployed `EcoBidBadge` contract address |
| `DEPLOYER_PRIVATE_KEY` | No | Hex private key of the minting wallet |
| `BLOCKCHAIN_CONFIRM_TIMEOUT_S` | No | Transaction confirmation timeout in seconds |

---

## Project Structure

```
c-step/
├── backend/
│   ├── cmd/api/main.go          # Entry point
│   ├── internal/
│   │   ├── api/                 # HTTP handlers
│   │   ├── assessment/          # Core domain logic
│   │   ├── auth/                # JWT authentication
│   │   ├── badge/               # Tier evaluation
│   │   ├── blockchain/          # On-chain anchoring
│   │   ├── emissions/climatiq/  # Climatiq API client
│   │   └── verification/        # SHA-256 hashing
│   ├── .env.example
│   ├── go.mod
│   └── Dockerfile
├── contracts/
│   ├── EcoBidBadge.sol          # Soulbound badge registry
│   └── README.md
├── docs/
│   ├── architecture.md
│   └── openapi.yaml
├── frontend/                    # (to be implemented)
└── docker-compose.yml
```

---

## Running Tests

```bash
cd backend
go test ./...
```

Key test suites:
- `internal/blockchain/service_test.go` — anchor + status logic with mock client
- `internal/badge/service_test.go` — tier evaluation
- `internal/verification/service_test.go` — hashing and evidence thresholds
- `internal/assessment/service_test.go` — end-to-end assessment flow

---

## Roadmap

| Feature | Status |
|---|---|
| 5-min proxy survey API | ✅ Done |
| Climatiq emissions calculation | ✅ Done |
| Tiered badge system | ✅ Done |
| SHA-256 report hashing | ✅ Done |
| Blockchain anchoring (Soulbound) | ✅ Done |
| Mock blockchain mode | ✅ Done |
| Frontend survey UI | 🔜 Planned |
| OCR bill scanning | 🔜 Planned |
| AI recommendation engine | 🔜 Planned |
| IoT / real-time data streams | 🔜 Planned |

---

## License

MIT — see [LICENSE](LICENSE) for details.

---
