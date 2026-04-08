// CeloTip Smart Contract Configuration
// NOTE: Update this after deploying the new contract
export const CELOTIP_CONTRACT_ADDRESS = "0x6b3A9c2b4b4BB24D5DFa59132499cb4Fd29C733e" as const;

// Platform wallet for fee collection
export const PLATFORM_WALLET = "0xc6340F29b11F450877741a2f61A04D31Cb44d9B1" as const;

// cUSD is the ONLY supported token
export const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// Platform fee: 5% (500 basis points)
export const PLATFORM_FEE_BPS = 500;

// Boost price in cUSD
export const BOOST_PRICE_CUSD = 2;

// Keep legacy token addresses for reference
export const TOKEN_ADDRESSES = {
  cUSD: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
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

// CeloTip Contract ABI (new version with fee split)
export const CELOTIP_ABI = [
  {
    inputs: [
      { name: "_cUSD", type: "address" },
      { name: "_platformWallet", type: "address" },
      { name: "_feeBps", type: "uint256" },
      { name: "_boostPrice", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    name: "tip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "boost",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "feeBps",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "boostPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformWallet",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "cUSD",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "fee", type: "uint256" },
    ],
    name: "Tipped",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Boosted",
    type: "event",
  },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ name: "", type: "address" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "_feeBps", type: "uint256" }],
    name: "setFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_wallet", type: "address" }],
    name: "setPlatformWallet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_price", type: "uint256" }],
    name: "setBoostPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
