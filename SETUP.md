# CeloTip Setup Guide

This guide explains how to set up the CeloTip smart contract and configure automatic tipping on Celo.

## Overview

CeloTip enables fully automatic tipping on Farcaster using:
- **Smart Contract**: Users approve a smart contract to spend tokens on their behalf
- **Backend Automation**: Edge functions monitor Farcaster interactions and execute tips
- **Neynar Integration**: Webhooks notify us of user interactions (likes, comments, recasts, etc.)

## Prerequisites

1. **Lovable Cloud Backend** - Already configured ✓
2. **Neynar API Key** - For Farcaster data and webhooks
3. **Smart Contract Deployment** - CeloTip contract on Celo network
4. **Relayer Wallet** - For executing transactions and paying gas fees

## Step 1: Deploy Smart Contract

You need to deploy a CeloTip smart contract on Celo that:
- Accepts token approvals from users
- Transfers tokens on behalf of users when called by the relayer
- Emits events for tracking

### Sample Smart Contract (Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CeloTip is Ownable {
    event TipSent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        string interactionType
    );

    function sendTip(
        address from,
        address to,
        address tokenAddress,
        uint256 amount,
        string memory interactionType
    ) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(from, to, amount), "Transfer failed");
        
        emit TipSent(from, to, tokenAddress, amount, interactionType);
    }
}
```

### Deploy Steps

1. Use Remix, Hardhat, or Foundry to deploy to Celo
2. Verify the contract on Celoscan
3. Update `src/lib/contracts.ts` with the deployed contract address

## Step 2: Configure Relayer Wallet

The relayer wallet pays gas fees and calls the smart contract.

1. Create a new wallet for the relayer
2. Fund it with CELO for gas fees
3. Set it as the owner of the CeloTip contract
4. Store the private key securely (consider using KMS or secure vault)

## Step 3: Set Up Neynar Webhooks

Configure Neynar to send webhooks when users interact with casts:

1. Go to https://neynar.com/dashboard
2. Create webhook subscriptions for:
   - `cast.created` (for comments and quotes)
   - `reaction.created` (for likes)
   - `reaction.deleted` (for unlikes)
   - `cast.recasted` (for recasts)
3. Point webhooks to: `https://your-project.supabase.co/functions/v1/farcaster-webhook`

## Step 4: Create Webhook Handler

Create an edge function to receive and process Neynar webhooks:

```typescript
// supabase/functions/farcaster-webhook/index.ts
// Receives webhooks from Neynar and calls process-tip
```

## Step 5: Update Edge Function

Update `supabase/functions/process-tip/index.ts` to:
1. Fetch wallet addresses from profiles
2. Call the smart contract via the relayer
3. Update transaction status with blockchain hash

## Step 6: Testing

1. **Test Token Approval**: Users should be able to approve tokens in Settings
2. **Test Manual Tip**: Call the process-tip function manually
3. **Test Webhook**: Trigger a Farcaster interaction and verify tip execution
4. **Monitor**: Check Celoscan for transactions and verify balances

## Security Considerations

- ✅ Smart contract should be audited before mainnet deployment
- ✅ Relayer private key must be stored securely
- ✅ Implement rate limiting to prevent abuse
- ✅ Add spending limits per user
- ✅ Monitor for suspicious activity

## Gas Fee Management

The relayer pays gas fees for all tips. Consider:
- Setting a minimum tip amount to cover gas
- Implementing a fee structure
- Monitoring relayer wallet balance
- Auto-topping up from a treasury

## Future Enhancements

- [ ] Support for multiple tokens
- [ ] Batch tipping to save gas
- [ ] Tip scheduling and queuing
- [ ] Analytics dashboard
- [ ] Tip leaderboards with real data

## Support

For issues or questions, check:
- CeloTip documentation
- Celo developer docs: https://docs.celo.org
- Neynar API docs: https://docs.neynar.com
