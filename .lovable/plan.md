## CeloTip Platform Rebuild Plan

### 1. Database Migration
- Add `profiles` table columns: `description`, `image_url`, `external_link`, `total_tips_received`, `boost_start`, `boost_end`
- Create `boosts` table for tracking boost purchases

### 2. Smart Contract Update (`contracts/CeloTip.sol`)
- Rewrite to focus on cUSD only
- Add `tip(address recipient, uint256 amount)` with 5% platform fee split
- Add `boost(uint256 amount)` for profile boost payments
- Add `setFee()` and `setPlatformWallet()` owner functions
- Remove batch tips and relayer pattern (direct user transactions now)

### 3. Frontend Pages
- **Home** → Featured 10 profiles (boosted first, then by tips received), profile cards with tip button
- **Profile Page** (`/profile/:address`) → Full profile view + tip CTA
- **Send** → Direct tip by wallet address
- **Ranks** → Leaderboard sorted by boost + tips
- **Settings** → Profile creation/editing (name, description, image, link)

### 4. Core Components
- `ProfileCard` — card for featured grid
- `TipModal` — amount selection (0.1/0.5/1 cUSD presets) + confirm
- `BoostButton` — pay 2 cUSD to boost for 24h

### 5. Contract Integration
- Use viem `writeContract` with MiniPay's `window.ethereum`
- cUSD approval flow before tipping
- Fee currency set to cUSD for gas

### 6. Navigation
- Keep 4-tab bottom nav: Home, Send, Ranks, Settings
