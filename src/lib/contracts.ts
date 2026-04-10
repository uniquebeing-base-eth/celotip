// CeloTip Smart Contract Configuration
// Deployed contract: https://celoscan.io/address/0x6b3A9c2b4b4BB24D5DFa59132499cb4Fd29C733e
export const CELOTIP_CONTRACT_ADDRESS = "0x6b3A9c2b4b4BB24D5DFa59132499cb4Fd29C733e" as const;

// Platform wallet for fee collection
export const PLATFORM_WALLET = "0xc6340F29b11F450877741a2f61A04D31Cb44d9B1" as const;

// cUSD is the primary supported token
export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Platform fee: 5% (500 basis points)
export const PLATFORM_FEE_BPS = 500;

// Boost price in cUSD
export const BOOST_PRICE_CUSD = 2;

// Default tip amount
export const DEFAULT_TIP_AMOUNT = 0.1;

// Celo stable tokens
export const CELO_STABLES = {
  cUSD: { address: "0x765DE816845861e75A25fCA122bb6898B8B1282a", symbol: "cUSD", decimals: 18 },
  cEUR: { address: "0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73", symbol: "cEUR", decimals: 18 },
  cREAL: { address: "0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787", symbol: "cREAL", decimals: 18 },
} as const;

// Minimal ERC-20 ABI
export const ERC20_ABI = [
  {
    inputs: [{ name: "_spender", type: "address" }, { name: "_value", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    inputs: [{ name: "_owner", type: "address" }, { name: "_spender", type: "address" }],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// CeloTip Contract ABI — matches deployed contract (relayer-based sendTip)
export const CELOTIP_ABI = [
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenAddress", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "interactionType", type: "string" },
      { name: "castHash", type: "string" },
    ],
    name: "sendTip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address[]" },
      { name: "to", type: "address[]" },
      { name: "tokenAddress", type: "address[]" },
      { name: "amount", type: "uint256[]" },
      { name: "interactionType", type: "string[]" },
      { name: "castHash", type: "string[]" },
    ],
    name: "sendBatchTips",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "tokenAddress", type: "address" }],
    name: "revokeApproval",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "user", type: "address" },
      { name: "tokenAddress", type: "address" },
    ],
    name: "getUserAllowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "newRelayer", type: "address" }],
    name: "updateRelayer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "interactionType", type: "string" },
      { indexed: false, name: "castHash", type: "string" },
    ],
    name: "TipSent",
    type: "event",
  },
  { inputs: [], name: "relayer", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  {
    inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
