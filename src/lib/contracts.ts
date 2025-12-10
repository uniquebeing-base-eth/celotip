// CeloTip Smart Contract Configuration
export const CELOTIP_CONTRACT_ADDRESS = "0x6b3A9c2b4b4BB24D5DFa59132499cb4Fd29C733e" as const;


// Relayer wallet address (executes tips on behalf of users)
export const RELAYER_ADDRESS = "0xc6340F29b11F450877741a2f61A04D31Cb44d9B1" as const;


// Standard ERC-20 token addresses on Celo
export const TOKEN_ADDRESSES = {
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438", // Native CELO (wrapped)
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo Dollar
  cEUR: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", // Celo Euro
  cREAL: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", // Celo Real
} as const;


// Minimum ERC-20 ABI for approve and allowance
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function"
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function"
  }
] as const;

// CeloTip Contract ABI
export const CELOTIP_ABI = [
  {
    inputs: [{ name: "_relayer", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor"
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "OwnableInvalidOwner",
    type: "error"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "OwnableUnauthorizedAccount",
    type: "error"
  },
  { inputs: [], name: "EnforcedPause", type: "error" },
  { inputs: [], name: "ExpectedPause", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { inputs: [], name: "InsufficientAllowance", type: "error" },
  { inputs: [], name: "InvalidAddress", type: "error" },
  { inputs: [], name: "InvalidAmount", type: "error" },
  { inputs: [], name: "SelfTipNotAllowed", type: "error" },
  { inputs: [], name: "UnauthorizedRelayer", type: "error" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "previousOwner", type: "address" },
      { indexed: true, name: "newOwner", type: "address" }
    ],
    name: "OwnershipTransferred",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "account", type: "address" }],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "oldRelayer", type: "address" },
      { indexed: true, name: "newRelayer", type: "address" }
    ],
    name: "RelayerUpdated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenAddress", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "interactionType", type: "string" },
      { indexed: false, name: "castHash", type: "string" }
    ],
    name: "TipSent",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "tokenAddress", type: "address" }
    ],
    name: "TokensRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "account", type: "address" }],
    name: "Unpaused",
    type: "event"
  },
  {
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "tokenAddress", type: "address" }
    ],
    name: "getUserAllowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "relayer",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "tokenAddress", type: "address" }],
    name: "revokeApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "froms", type: "address[]" },
      { name: "tos", type: "address[]" },
      { name: "tokenAddresses", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "interactionTypes", type: "string[]" },
      { name: "castHashes", type: "string[]" }
    ],
    name: "sendBatchTips",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenAddress", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interactionType", type: "string" },
      { name: "castHash", type: "string" }
    ],
    name: "sendTip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ name: "newRelayer", type: "address" }],
    name: "updateRelayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;
