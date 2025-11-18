# Walroad

Decentralized file collection marketplace built on Sui, Walrus, and Seal.

## Overview

Walroad contracts enable creators to publish and monetize file collections stored on Walrus with Seal encryption for privacy.

**Key Features:**

- Multi-file collections with metadata
- Flexible visibility (public, private, pay-to-see, unlisted)
- Seal encryption for premium and private content
- Creator tips (99% to creator, 1% platform fee)
- Purchase system (97.5% to creator, 2.5% platform fee)
- Access control via NFT tokens

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│    Collection   │────────▶│  Access Policy   │
│                 │         │  (Seal)          │
│ - Metadata      │         │                  │
│ - Files (blobs) │         │ - Authorized     │
│ - Visibility    │         │   users          │
│ - Price         │         │ - Owner          │
└─────────────────┘         └──────────────────┘
        │
        │ Purchase
        ▼
┌─────────────────┐
│  AccessToken    │
│  (NFT proof)    │
└─────────────────┘
```

## Contract Modules

### 1. Collection (`bunker_contracts::collection`)

Manages file collections, purchases, tips, and access tokens.

### 2. Access Policy (`bunker_contracts::access_policy`)

Controls Seal encryption decryption permissions.

## Visibility Types

| Type | Value | Description |
|------|-------|-------------|
| PUBLIC | 0 | Free for everyone |
| PRIVATE | 1 | Owner only |
| PAY_TO_SEE | 2 | Purchase required |
| UNLISTED | 3 | Public but not indexed |

## Front-End

This is a Next.js project.

Run the development server:

```bash
pnpm install
pnpm dev
```

## Quick Start

### Create a Public Collection

```move
bunker_contracts::collection::create_collection(
    b"My Dataset",              // name
    b"Machine learning data",   // description
    b"AI/ML",                   // category
    vector[b"ai", b"dataset"],  // tags
    vector[blob_id_1, blob_id_2], // Walrus blob IDs
    vector[b"file1.csv", b"file2.json"],
    vector[b"text/csv", b"application/json"],
    vector[1024, 2048],         // file sizes
    vector[false, false],       // encryption flags
    0,                          // VISIBILITY_PUBLIC
    0,                          // price (free)
    false,                      // not encrypted
    vector::empty(),            // no encryption key
    &mut ctx
);
```

### Create a Pay-to-See Collection

```move
bunker_contracts::collection::create_collection(
    b"Premium Dataset",
    b"Exclusive data",
    b"Finance",
    vector[b"finance", b"premium"],
    blob_ids,
    file_names,
    content_types,
    file_sizes,
    encryption_flags,
    2,                          // VISIBILITY_PAY_TO_SEE
    1_000_000_000,             // 1 SUI (in MIST)
    false,
    vector::empty(),
    &mut ctx
);
```

### Purchase Access

```move
bunker_contracts::collection::purchase_access(
    &mut collection,
    &platform_config,
    payment_coin,              // Coin<SUI>
    &mut ctx
);
// Buyer receives AccessToken NFT
```

### Tip Creator

```move
bunker_contracts::collection::tip_creator(
    &mut collection,
    &platform_config,
    tip_coin,                  // Coin<SUI>
    &mut ctx
);
```

## Fee Structure

| Operation | Creator | Platform |
|-----------|---------|----------|
| Purchase | 97.5% | 2.5% |
| Tip | 99% | 1% |

## File Storage

Files are stored on **Walrus** (decentralized storage):

1. Upload files to Walrus → get blob IDs
2. Create collection with blob IDs
3. Users download from Walrus using blob IDs

## Encryption Flow

For encrypted collections using Seal:

1. **Creator encrypts files** with Seal locally
2. **Upload encrypted blobs** to Walrus
3. **Create access policy** on-chain
4. **Create collection** linking to policy
5. **Buyer purchases** → access granted in policy
6. **Seal key servers** check policy → allow decryption
7. **Buyer downloads** encrypted files + decrypts with Seal

## Events

Contracts emit events for indexing:

- `CollectionCreated` - New collection published
- `AccessPurchased` - User bought access
- `TipReceived` - Creator tipped
- `CollectionUpdated` - Metadata changed
- `CollectionDeleted` - Collection removed
- `AccessGranted` - Seal access granted
- `AccessRevoked` - Seal access revoked

## Further Reading

- [Collection Contract API](./docs/collection-contract.md)
- [Access Policy API](./docs/access-policy-contract.md)
- [Deployment Guide](./docs/deployment.md)

## Links

- [Sui Documentation](https://docs.sui.io/)
- [Walrus Documentation](https://docs.walrus.site/)
- [Seal Documentation](https://seal-docs.wal.app/)
