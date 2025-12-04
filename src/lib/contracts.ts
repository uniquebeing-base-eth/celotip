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
  }
] as const;
