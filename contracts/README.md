# EcoBidBadge Smart Contract

## Overview

`EcoBidBadge.sol` is a **Soulbound Token** (non-transferable NFT) registry that permanently anchors verified ESG carbon-footprint reports on an EVM-compatible blockchain.

Each time an SME completes a carbon assessment with sufficient evidence quality (medium confidence or above), the C-Step backend:

1. Generates a canonical SHA-256 hash of the verified JSON report.
2. Calls `mint()` on this contract, committing the hash on-chain.
3. Returns a `token_id`, `tx_hash`, and `block_number` to the API consumer.

Because the token is **Soulbound**, it cannot be transferred or sold — it stays bound to the SME's address as a tamper-proof credential.

---

## Contract Details

| Property | Value |
|---|---|
| Language | Solidity `^0.8.24` |
| Pattern | Soulbound Token (EIP-5192 inspired) |
| Minting authority | Contract `owner` (C-Step backend wallet) |
| Chain target | EVM-compatible (tested on Polygon Amoy testnet) |

---

## Key Functions

### `mint()` — Owner only

```solidity
function mint(
    address recipient,
    bytes32 reportHash,
    string  calldata assessmentID,
    uint256 co2eGrams,
    uint256 baselineGrams,
    Tier    tier
) external onlyOwner returns (uint256 tokenID)
```

Mints a new Soulbound badge for a verified assessment. Reverts if the `reportHash` has already been minted (preventing double-anchoring / greenwashing).

`Tier` enum: `Bronze = 0`, `Silver = 1`, `Gold = 2`.

CO₂e values are passed in **grams** (kg × 1000) to avoid floating-point.

---

### View Functions

| Function | Returns |
|---|---|
| `getRecord(tokenID)` | Full `BadgeRecord` struct for the token |
| `getRecordByHash(reportHash)` | Full `BadgeRecord` looked up by hash |
| `tokenIDForHash(reportHash)` | Token ID for a hash, or `0` if not minted |
| `isAnchored(reportHash)` | `true` if the hash has been committed |
| `tokensOf(holder)` | Array of token IDs held by an address |
| `totalSupply()` | Total number of badges minted |

---

## Events

### `BadgeMinted`

```solidity
event BadgeMinted(
    uint256 indexed tokenID,
    address indexed recipient,
    bytes32 indexed reportHash,
    string  assessmentID,
    Tier    tier,
    uint256 co2eGrams,
    uint256 anchoredAt
);
```

Emitted on every successful `mint()`. Index the three `indexed` fields in a subgraph or event listener for efficient lookups.

---

## Deployment

### Prerequisites

- Node.js ≥ 18 + npm (for Hardhat)
- A funded wallet private key (test wallet for devnet)
- RPC endpoint (e.g. Polygon Amoy via Ankr or Infura)

### Quick start with Hardhat

```bash
# From the repo root
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Compile
npx hardhat compile

# Deploy to Amoy testnet
npx hardhat run scripts/deploy.js --network amoy
```

Copy the deployed address into `backend/.env` as `CONTRACT_ADDRESS`.

### Manual (Remix IDE)

1. Open https://remix.ethereum.org
2. Paste `contracts/EcoBidBadge.sol`
3. Compile with Solidity `0.8.24`
4. Deploy via MetaMask to the desired network
5. Copy the contract address to `backend/.env`

---

## Security Notes

- Only the deployer wallet can call `mint()`. Keep `DEPLOYER_PRIVATE_KEY` secret.
- Each `reportHash` can only be minted **once**. Attempting to re-mint the same hash reverts with `AlreadyMinted`.
- Tokens are Soulbound: `transfer()` and `approve()` always revert.
- Consider a multi-sig or role-based access control upgrade for mainnet.
