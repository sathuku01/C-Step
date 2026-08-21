package blockchain

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// tierIndex converts the badge tier string into the uint8 that the
// EcoBidBadge contract Tier enum expects (Bronze=0, Silver=1, Gold=2).
func tierIndex(tier string) (uint8, error) {
	switch strings.ToLower(tier) {
	case "bronze":
		return 0, nil
	case "silver":
		return 1, nil
	case "gold":
		return 2, nil
	default:
		return 0, fmt.Errorf("blockchain: unknown tier %q", tier)
	}
}

// hexToBytes32 converts a 64-char hex string (with or without 0x prefix) to a
// [32]byte suitable for passing to the contract.
func hexToBytes32(h string) ([32]byte, error) {
	h = strings.TrimPrefix(h, "0x")
	b, err := hex.DecodeString(h)
	if err != nil {
		return [32]byte{}, fmt.Errorf("blockchain: decode report hash: %w", err)
	}
	if len(b) != 32 {
		return [32]byte{}, fmt.Errorf(
			"blockchain: report hash must be 32 bytes, got %d", len(b))
	}
	var arr [32]byte
	copy(arr[:], b)
	return arr, nil
}

// EcoBidBadgeABI is the minimal ABI needed to call mint() and the view
// functions on the EcoBidBadge contract.
const EcoBidBadgeABI = `[
  {
    "type":"function","name":"mint",
    "inputs":[
      {"name":"recipient",    "type":"address"},
      {"name":"reportHash",   "type":"bytes32"},
      {"name":"assessmentID", "type":"string"},
      {"name":"co2eGrams",    "type":"uint256"},
      {"name":"baselineGrams","type":"uint256"},
      {"name":"tier",         "type":"uint8"}
    ],
    "outputs":[{"name":"tokenID","type":"uint256"}],
    "stateMutability":"nonpayable"
  },
  {
    "type":"function","name":"isAnchored",
    "inputs":[{"name":"reportHash","type":"bytes32"}],
    "outputs":[{"name":"","type":"bool"}],
    "stateMutability":"view"
  },
  {
    "type":"function","name":"tokenIDForHash",
    "inputs":[{"name":"reportHash","type":"bytes32"}],
    "outputs":[{"name":"","type":"uint256"}],
    "stateMutability":"view"
  },
  {
    "type":"function","name":"totalSupply",
    "inputs":[],
    "outputs":[{"name":"","type":"uint256"}],
    "stateMutability":"view"
  },
  {
    "type":"event","name":"BadgeMinted",
    "inputs":[
      {"indexed":true,  "name":"tokenID",      "type":"uint256"},
      {"indexed":true,  "name":"recipient",    "type":"address"},
      {"indexed":true,  "name":"reportHash",   "type":"bytes32"},
      {"indexed":false, "name":"assessmentID", "type":"string"},
      {"indexed":false, "name":"tier",         "type":"uint8"},
      {"indexed":false, "name":"co2eGrams",    "type":"uint256"},
      {"indexed":false, "name":"anchoredAt",   "type":"uint256"}
    ]
  }
]`

// Client wraps an ethclient connection and a bound contract instance to
// expose high-level Anchor and Status operations.
type Client struct {
	eth             *ethclient.Client
	contractAddress common.Address
	contractABI     abi.ABI
	privateKey      *ecdsa.PrivateKey
	deployerAddress common.Address
	chainID         *big.Int
	confirmTimeout  time.Duration
}

// ClientConfig holds all parameters needed to create a Client.
type ClientConfig struct {
	// RPCURL is the HTTP/WS endpoint of an Ethereum-compatible node,
	// e.g. "https://rpc.ankr.com/polygon_amoy" or "http://localhost:8545".
	RPCURL string

	// ContractAddress is the deployed EcoBidBadge contract address (0x-prefixed hex).
	ContractAddress string

	// DeployerPrivateKey is the hex-encoded ECDSA private key of the wallet
	// that owns (or is authorised to mint on) the EcoBidBadge contract.
	DeployerPrivateKey string

	// ChainID is the EIP-155 chain ID (1=mainnet, 80002=Amoy testnet, etc.).
	// Leave 0 to auto-detect from the node.
	ChainID int64

	// ConfirmTimeout is how long Anchor() waits for a transaction to be
	// included in a block before returning an error.  Defaults to 60 s.
	ConfirmTimeout time.Duration
}

// NewClient constructs and dials an Ethereum client for the EcoBidBadge
// contract.  It validates connectivity and key material before returning.
func NewClient(cfg ClientConfig) (*Client, error) {
	if cfg.RPCURL == "" {
		return nil, errors.New("blockchain: ETHEREUM_RPC_URL must be set")
	}
	if cfg.ContractAddress == "" {
		return nil, errors.New("blockchain: CONTRACT_ADDRESS must be set")
	}
	if cfg.DeployerPrivateKey == "" {
		return nil, errors.New("blockchain: DEPLOYER_PRIVATE_KEY must be set")
	}

	eth, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		return nil, fmt.Errorf("blockchain: dial %s: %w", cfg.RPCURL, err)
	}

	// Parse the private key.
	rawKey := strings.TrimPrefix(cfg.DeployerPrivateKey, "0x")
	pk, err := crypto.HexToECDSA(rawKey)
	if err != nil {
		return nil, fmt.Errorf("blockchain: parse private key: %w", err)
	}
	deployer := crypto.PubkeyToAddress(pk.PublicKey)

	// Resolve chain ID.
	chainID := big.NewInt(cfg.ChainID)
	if cfg.ChainID == 0 {
		chainID, err = eth.ChainID(context.Background())
		if err != nil {
			return nil, fmt.Errorf("blockchain: get chain ID: %w", err)
		}
	}

	// Parse the ABI once at startup.
	parsedABI, err := abi.JSON(strings.NewReader(EcoBidBadgeABI))
	if err != nil {
		return nil, fmt.Errorf("blockchain: parse ABI: %w", err)
	}

	timeout := cfg.ConfirmTimeout
	if timeout == 0 {
		timeout = 60 * time.Second
	}

	return &Client{
		eth:             eth,
		contractAddress: common.HexToAddress(cfg.ContractAddress),
		contractABI:     parsedABI,
		privateKey:      pk,
		deployerAddress: deployer,
		chainID:         chainID,
		confirmTimeout:  timeout,
	}, nil
}

// Close releases the underlying JSON-RPC connection.
func (c *Client) Close() {
	c.eth.Close()
}

// Anchor submits a mint() transaction to the EcoBidBadge contract and waits
// for it to be included in a block.  It returns the transaction hash, the
// assigned token ID, and the block number.
func (c *Client) Anchor(ctx context.Context, req AnchorRequest) (*AnchorResult, error) {
	reportHashArr, err := hexToBytes32(req.ReportHash)
	if err != nil {
		return nil, err
	}

	tierVal, err := tierIndex(req.Tier)
	if err != nil {
		return nil, err
	}

	recipient := c.deployerAddress // custodial fallback
	if req.RecipientAddress != "" {
		recipient = common.HexToAddress(req.RecipientAddress)
	}

	// Convert kg to grams (uint256, multiply by 1000).
	co2eGrams := new(big.Int).SetInt64(int64(req.CO2eKg * 1000))
	baselineGrams := new(big.Int).SetInt64(int64(req.BaselineCO2eKg * 1000))

	// Build the transactor.
	auth, err := bind.NewKeyedTransactorWithChainID(c.privateKey, c.chainID)
	if err != nil {
		return nil, fmt.Errorf("blockchain: build transactor: %w", err)
	}
	auth.Context = ctx

	// Fetch the nonce.
	nonce, err := c.eth.PendingNonceAt(ctx, c.deployerAddress)
	if err != nil {
		return nil, fmt.Errorf("blockchain: get nonce: %w", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))

	// Use a reasonable gas price.
	gasPrice, err := c.eth.SuggestGasPrice(ctx)
	if err != nil {
		return nil, fmt.Errorf("blockchain: suggest gas price: %w", err)
	}
	auth.GasPrice = gasPrice
	auth.GasLimit = uint64(300_000)

	// Encode the call data.
	data, err := c.contractABI.Pack(
		"mint",
		recipient,
		reportHashArr,
		req.AssessmentID,
		co2eGrams,
		baselineGrams,
		tierVal,
	)
	if err != nil {
		return nil, fmt.Errorf("blockchain: encode mint call: %w", err)
	}

	// Build and sign the raw transaction.
	to := c.contractAddress
	tx := types.NewTransaction(
		nonce,
		to,
		big.NewInt(0),
		auth.GasLimit,
		gasPrice,
		data,
	)
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(c.chainID), c.privateKey)
	if err != nil {
		return nil, fmt.Errorf("blockchain: sign transaction: %w", err)
	}

	// Submit.
	if err := c.eth.SendTransaction(ctx, signedTx); err != nil {
		return nil, fmt.Errorf("blockchain: send transaction: %w", err)
	}

	now := time.Now().UTC()

	// Wait for confirmation.
	receipt, err := c.waitMined(ctx, signedTx.Hash())
	if err != nil {
		return nil, err
	}

	if receipt.Status == types.ReceiptStatusFailed {
		return nil, fmt.Errorf(
			"blockchain: mint transaction reverted (tx %s)", signedTx.Hash().Hex())
	}

	// Extract the tokenID from the BadgeMinted event log.
	tokenID, err := c.extractTokenID(receipt)
	if err != nil {
		return nil, err
	}

	return &AnchorResult{
		TxHash:      signedTx.Hash().Hex(),
		TokenID:     tokenID,
		BlockNumber: receipt.BlockNumber.Uint64(),
		AnchoredAt:  now,
	}, nil
}

// IsAnchored queries the contract to check whether the given report hash has
// already been committed on-chain.
func (c *Client) IsAnchored(ctx context.Context, reportHash string) (bool, error) {
	hashArr, err := hexToBytes32(reportHash)
	if err != nil {
		return false, err
	}

	data, err := c.contractABI.Pack("isAnchored", hashArr)
	if err != nil {
		return false, fmt.Errorf("blockchain: encode isAnchored: %w", err)
	}

	msg := ethereum.CallMsg{To: &c.contractAddress, Data: data}
	result, err := c.eth.CallContract(ctx, msg, nil)
	if err != nil {
		return false, fmt.Errorf("blockchain: isAnchored call: %w", err)
	}

	var anchored bool
	if err := c.contractABI.UnpackIntoInterface(&anchored, "isAnchored", result); err != nil {
		return false, fmt.Errorf("blockchain: unpack isAnchored: %w", err)
	}
	return anchored, nil
}

// TokenIDForHash returns the on-chain token ID for the given report hash, or
// 0 if the hash has not been anchored yet.
func (c *Client) TokenIDForHash(ctx context.Context, reportHash string) (uint64, error) {
	hashArr, err := hexToBytes32(reportHash)
	if err != nil {
		return 0, err
	}

	data, err := c.contractABI.Pack("tokenIDForHash", hashArr)
	if err != nil {
		return 0, fmt.Errorf("blockchain: encode tokenIDForHash: %w", err)
	}

	msg := ethereum.CallMsg{To: &c.contractAddress, Data: data}
	result, err := c.eth.CallContract(ctx, msg, nil)
	if err != nil {
		return 0, fmt.Errorf("blockchain: tokenIDForHash call: %w", err)
	}

	var tokenID *big.Int
	if err := c.contractABI.UnpackIntoInterface(&tokenID, "tokenIDForHash", result); err != nil {
		return 0, fmt.Errorf("blockchain: unpack tokenIDForHash: %w", err)
	}
	return tokenID.Uint64(), nil
}

// waitMined polls for a transaction receipt until the context is cancelled or
// the configurable timeout elapses.
func (c *Client) waitMined(ctx context.Context, txHash common.Hash) (*types.Receipt, error) {
	deadline := time.Now().Add(c.confirmTimeout)
	for {
		receipt, err := c.eth.TransactionReceipt(ctx, txHash)
		if err == nil {
			return receipt, nil
		}
		if !errors.Is(err, ethereum.NotFound) {
			return nil, fmt.Errorf("blockchain: get receipt: %w", err)
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf(
				"blockchain: timed out waiting for tx %s after %s",
				txHash.Hex(), c.confirmTimeout)
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(2 * time.Second):
		}
	}
}

// extractTokenID parses the BadgeMinted event from a transaction receipt to
// extract the tokenID that the contract assigned.
func (c *Client) extractTokenID(receipt *types.Receipt) (uint64, error) {
	for _, log := range receipt.Logs {
		if log.Address != c.contractAddress {
			continue
		}
		// The first topic is the event signature hash.
		if len(log.Topics) < 2 {
			continue
		}
		// BadgeMinted: tokenID is the first indexed argument (Topics[1]).
		tokenID := new(big.Int).SetBytes(log.Topics[1].Bytes())
		return tokenID.Uint64(), nil
	}
	return 0, errors.New("blockchain: BadgeMinted event not found in receipt")
}
