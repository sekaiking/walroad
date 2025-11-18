# Deployment Guide

Guide for building, testing, and deploying Bunker smart contracts.

## Prerequisites

- [Sui CLI](https://docs.sui.io/build/install) installed
- Sui wallet with testnet/mainnet SUI for gas fees
- Git

## Project Structure

```
contracts/bunker_contracts/
├── sources/
│   ├── collection.move       # Main collection contract
│   └── access_policy.move    # Seal encryption policy
├── tests/
│   └── bunker_contracts_tests.move
├── Move.toml                 # Package configuration
└── build/                    # Generated after build
```

## Build

### 1. Navigate to Contract Directory

```bash
cd contracts/bunker_contracts
```

### 2. Build Contracts

```bash
sui move build
```

**Expected output:**
```
INCLUDING DEPENDENCY Sui
INCLUDING DEPENDENCY MoveStdlib
BUILDING bunker_contracts
```

### 3. Verify Build

Check that build was successful:

```bash
ls -la build/bunker_contracts/
```

Should see compiled bytecode and source files.

## Test (Optional)

Run unit tests:

```bash
sui move test
```

## Deployment

### Testnet Deployment

#### 1. Configure Wallet for Testnet

```bash
sui client switch --env testnet
```

#### 2. Get Testnet SUI

```bash
sui client faucet
```

#### 3. Publish Contract

```bash
sui client publish --gas-budget 100000000
```

**Save the output!** You'll need:
- Package ID
- PlatformConfig object ID

#### 4. Verify Deployment

```bash
sui client object <PACKAGE_ID>
```

### Mainnet Deployment

#### 1. Switch to Mainnet

```bash
sui client switch --env mainnet
```

#### 2. Ensure Sufficient SUI

Check balance:
```bash
sui client gas
```

Need ~0.5 SUI for deployment + buffer.

#### 3. Final Build Verification

```bash
sui move build --skip-fetch-latest-git-deps
```

Review all warnings and ensure no errors.

#### 4. Publish to Mainnet

```bash
sui client publish --gas-budget 100000000
```

**⚠️ IMPORTANT:** Save the transaction digest and all object IDs immediately.

## Post-Deployment

### 1. Record Contract Addresses

From the publish output, save:

```bash
# Example output structure
PACKAGE_ID=0x...
PLATFORM_CONFIG_ID=0x...
```

Add to `.env.local`:

```bash
NEXT_PUBLIC_PACKAGE_ID=0x...
NEXT_PUBLIC_PLATFORM_CONFIG_ID=0x...
```

### 2. Verify Platform Config

The `init()` function creates a PlatformConfig with:
- Platform address: Your wallet address (deployer)
- Purchase fee: 250 bps (2.5%)
- Tip fee: 100 bps (1%)

Verify:

```bash
sui client object <PLATFORM_CONFIG_ID> --json
```

### 3. Update Frontend Configuration

Update `src/config/contracts.ts` (or equivalent):

```typescript
export const CONTRACTS = {
  PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID,
  PLATFORM_CONFIG_ID: process.env.NEXT_PUBLIC_PLATFORM_CONFIG_ID,
};
```

### 4. Test Basic Operations

Create a test collection:

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module collection \
  --function create_collection \
  --args \
    "Test Collection" \
    "Testing deployment" \
    "Test" \
    '["test"]' \
    '["<BLOB_ID>"]' \
    '["test.txt"]' \
    '["text/plain"]' \
    '[100]' \
    '[false]' \
    0 \
    0 \
    false \
    '[]' \
  --gas-budget 50000000
```

## Platform Management

### Update Platform Address

Transfer platform fees to new address:

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module collection \
  --function update_platform_address \
  --args <PLATFORM_CONFIG_ID> <NEW_ADDRESS> \
  --gas-budget 10000000
```

### Update Platform Fees

Change fee percentages (basis points):

```bash
sui client call \
  --package <PACKAGE_ID> \
  --module collection \
  --function update_platform_fees \
  --args <PLATFORM_CONFIG_ID> 250 100 \
  --gas-budget 10000000
```

**Note:** 100 = 1%, 250 = 2.5%, 1000 = 10%

## Upgrade Strategy

Sui contracts are **immutable** by default. For upgrades:

### Option 1: New Deployment

1. Deploy new package version
2. Migrate users gradually
3. Update frontend to use new package

### Option 2: Upgradeable Package

Add upgrade capability:

```toml
[package]
name = "bunker_contracts"
version = "1.0.0"
published-at = "<PACKAGE_ID>"
```

Then use `sui client upgrade` for future versions.

## Monitoring

### Track Events

Index contract events using:

- **Sui GraphQL** - `https://sui-<NETWORK>.mystenlabs.com/graphql`
- **Custom indexer** - Listen to event stream

Key events to index:
- `CollectionCreated`
- `AccessPurchased`
- `TipReceived`

### Monitor Platform Earnings

Query platform config object regularly:

```bash
sui client object <PLATFORM_CONFIG_ID>
```

Track fee accumulation in platform address wallet.

## Troubleshooting

### Build Fails

**Error:** `could not find dependency Sui`

**Solution:**
```bash
sui move build --skip-fetch-latest-git-deps
```

### Publish Fails: Insufficient Gas

**Solution:** Increase gas budget or get more SUI

```bash
# Testnet
sui client faucet

# Mainnet
# Purchase SUI from exchange
```

### Cannot Find Object

**Error:** `ObjectNotFound`

**Solution:** Verify object ID and ensure it's shared:

```bash
sui client object <OBJECT_ID>
```

### Events Not Appearing

**Solution:** Check transaction digest on explorer:

- Testnet: `https://suiexplorer.com/?network=testnet`
- Mainnet: `https://suiexplorer.com/`

## Security Checklist

Before mainnet deployment:

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Testnet deployment successful
- [ ] Test transactions executed
- [ ] Events emitting correctly
- [ ] Platform config verified
- [ ] Frontend integration tested
- [ ] Backup private keys secured
- [ ] Transaction digests saved
- [ ] Package ID documented

## Helpful Commands

### Check Active Environment

```bash
sui client active-env
```

### List Available Addresses

```bash
sui client addresses
```

### Switch Address

```bash
sui client switch --address <ADDRESS>
```

### Get Object Details

```bash
sui client object <OBJECT_ID> --json
```

### View Recent Transactions

```bash
sui client transactions --count 10
```

## Resources

- [Sui Move Book](https://move-book.com/)
- [Sui CLI Reference](https://docs.sui.io/references/cli)
- [Sui Explorer](https://suiexplorer.com/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
