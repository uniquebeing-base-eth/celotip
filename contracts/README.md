# CeloTip Smart Contract

Automated tipping smart contract for Farcaster on the Celo blockchain.

## Features

✅ **Automated Tipping**: Users approve tokens once, tips execute automatically
✅ **Revoke Anytime**: Users can revoke approvals at any time
✅ **Batch Operations**: Process multiple tips in one transaction to save gas
✅ **Pausable**: Owner can pause in emergencies
✅ **Secure**: Uses OpenZeppelin contracts, ReentrancyGuard, SafeERC20
✅ **Multi-Token**: Supports any ERC-20 token on Celo (CELO, cUSD, cEUR, cREAL)

## Installation

```bash
cd contracts
npm install
```

## Configuration

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Fill in your configuration:
- `DEPLOYER_PRIVATE_KEY`: Private key of the wallet deploying the contract
- `RELAYER_ADDRESS`: Address of the wallet that will execute tips (pays gas)
- `CELOSCAN_API_KEY`: API key from https://celoscan.io/myapikey (for verification)

## Deployment

### Test on Alfajores (Testnet)

```bash
# Get testnet CELO from https://faucet.celo.org
npm run deploy:alfajores
```

### Deploy to Mainnet

```bash
# Make sure deployer wallet has CELO for gas
npm run deploy:celo
```

## Contract Architecture

### Key Functions

**For Users:**
- `approve()` on token contract - Approve CeloTip to spend tokens
- `revokeApproval()` - Revoke approval (sets allowance to 0)
- `getUserAllowance()` - Check current allowance

**For Relayer:**
- `sendTip()` - Execute a single tip
- `sendBatchTips()` - Execute multiple tips in one transaction

**For Owner:**
- `pause()` / `unpause()` - Emergency controls
- `updateRelayer()` - Change relayer address
- `emergencyWithdraw()` - Emergency fund recovery

### Security Features

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **SafeERC20**: Safe token transfer operations
3. **Pausable**: Can pause in emergencies
4. **Ownable**: Admin functions restricted to owner
5. **Access Control**: Only relayer can execute tips
6. **Input Validation**: Checks for zero addresses and amounts

## User Flow

1. **Approve Tokens**
   ```solidity
   // User approves cUSD to CeloTip contract
   cUSD.approve(celoTipAddress, amount)
   ```

2. **Configure Tips**
   - User sets tip amounts in app Settings
   - Backend stores configuration in database

3. **Automatic Tipping**
   - User interacts on Farcaster (like, comment, etc.)
   - Webhook notifies backend
   - Backend calls `sendTip()` via relayer
   - Tokens transferred automatically

4. **Revoke Approval**
   ```solidity
   // Option 1: Via CeloTip contract
   celoTip.revokeApproval(tokenAddress)
   
   // Option 2: Via token contract
   cUSD.approve(celoTipAddress, 0)
   ```

## Gas Optimization

- Uses `SafeERC20` for efficient token operations
- Batch function processes multiple tips in one transaction
- Optimized storage layout
- Compiler optimization enabled (200 runs)

## Testing

```bash
# Compile contracts
npm run compile

# Run tests
npm run test
```

## Verification

After deployment, verify on Celoscan:

```bash
npx hardhat verify --network alfajores CONTRACT_ADDRESS "RELAYER_ADDRESS"
```

Or for mainnet:
```bash
npx hardhat verify --network celo CONTRACT_ADDRESS "RELAYER_ADDRESS"
```

## Supported Tokens

The contract supports any ERC-20 token on Celo:

- **CELO**: `0x471EcE3750Da237f93B8E339c536989b8978a438`
- **cUSD**: `0x765DE816845861e75A25fCA122bb6898B8B1282a`
- **cEUR**: `0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73`
- **cREAL**: `0xe8537a3d056DA446677B9E9d6c5dB704EaAb4787`

## Security Considerations

⚠️ **Before Mainnet:**
1. Complete security audit
2. Test thoroughly on Alfajores
3. Start with small amounts
4. Monitor for issues

⚠️ **Relayer Security:**
1. Store relayer private key securely (use AWS KMS, HashiCorp Vault, etc.)
2. Monitor relayer wallet balance
3. Set up alerts for unusual activity
4. Use a dedicated wallet, not your main wallet

⚠️ **User Safety:**
1. Users control their approvals
2. Users can revoke anytime
3. Contract never holds user funds
4. All transfers are logged on-chain

## License

MIT
