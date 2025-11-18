# Collection Contract API

Module: `bunker_contracts::collection`

## Data Structures

### Collection

Shared object representing a file collection.

```move
public struct Collection has key, store {
    id: UID,
    owner: address,
    created_at: u64,
    name: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    tags: vector<vector<u8>>,
    files: vector<FileRef>,
    visibility: u8,
    price: u64,
    view_count: u64,
    purchase_count: u64,
    tip_count: u64,
    total_earnings: u64,
    total_tips: u64,
    is_encrypted: bool,
    encryption_key_hash: vector<u8>,
    access_policy_id: Option<ID>,
    is_deleted: bool,
}
```

### FileRef

Reference to a file stored on Walrus.

```move
public struct FileRef has store, copy, drop {
    blob_id: vector<u8>,        // Walrus blob ID
    name: vector<u8>,
    content_type: vector<u8>,
    size_bytes: u64,
    is_encrypted: bool,
}
```

### AccessToken

NFT proving purchase of collection access.

```move
public struct AccessToken has key, store {
    id: UID,
    collection_id: ID,
    owner: address,
    purchased_at: u64,
}
```

### PlatformConfig

Shared object managing platform fees.

```move
public struct PlatformConfig has key {
    id: UID,
    platform_address: address,
    purchase_fee_bps: u64,  // 250 = 2.5%
    tip_fee_bps: u64,       // 100 = 1%
}
```

## Functions

### Collection Management

#### create_collection

Create a new collection with automatic Seal policy creation.

```move
public entry fun create_collection(
    name: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    tags: vector<vector<u8>>,
    blob_ids: vector<vector<u8>>,
    file_names: vector<vector<u8>>,
    content_types: vector<vector<u8>>,
    file_sizes: vector<u64>,
    is_encrypted_flags: vector<bool>,
    visibility: u8,
    price: u64,
    is_encrypted: bool,
    encryption_key_hash: vector<u8>,
    ctx: &mut TxContext
)
```

**Emits:** `CollectionCreated`

#### create_collection_with_policy

Create collection with pre-existing Seal access policy.

```move
public entry fun create_collection_with_policy(
    // ... same params as create_collection
    policy: &mut access_policy::CollectionAccessPolicy,
    ctx: &mut TxContext
)
```

**Use case:** When files are encrypted before collection creation.

#### update_collection

Update collection metadata (owner only).

```move
public entry fun update_collection(
    collection: &mut Collection,
    name: vector<u8>,
    description: vector<u8>,
    category: vector<u8>,
    tags: vector<vector<u8>>,
    visibility: u8,
    price: u64,
    ctx: &mut TxContext
)
```

**Emits:** `CollectionUpdated`

#### delete_collection

Soft delete a collection (owner only).

```move
public entry fun delete_collection(
    collection: &mut Collection,
    ctx: &mut TxContext
)
```

**Emits:** `CollectionDeleted`

**Note:** Soft delete only - object remains but is marked as deleted.

### Purchases

#### purchase_access

Purchase access to a non-encrypted pay-to-see collection.

```move
public entry fun purchase_access(
    collection: &mut Collection,
    platform_config: &PlatformConfig,
    payment: Coin<SUI>,
    ctx: &mut TxContext
)
```

**Returns:** AccessToken NFT transferred to buyer

**Emits:** `AccessPurchased`

**Fees:** 97.5% to creator, 2.5% to platform

#### purchase_access_encrypted

Purchase access to an encrypted pay-to-see collection.

```move
public entry fun purchase_access_encrypted(
    collection: &mut Collection,
    policy: &mut access_policy::CollectionAccessPolicy,
    platform_config: &PlatformConfig,
    payment: Coin<SUI>,
    ctx: &mut TxContext
)
```

**Returns:** AccessToken NFT + Seal decryption access

**Emits:** `AccessPurchased`

### Tips

#### tip_creator

Send a tip to the collection creator.

```move
public entry fun tip_creator(
    collection: &mut Collection,
    platform_config: &PlatformConfig,
    payment: Coin<SUI>,
    ctx: &mut TxContext
)
```

**Emits:** `TipReceived`

**Fees:** 99% to creator, 1% to platform

### Analytics

#### increment_view_count

Track collection views.

```move
public entry fun increment_view_count(
    collection: &mut Collection,
    _ctx: &mut TxContext
)
```

**Emits:** `ViewIncremented`

### Platform Management

#### update_platform_address

Update platform fee recipient (platform owner only).

```move
public entry fun update_platform_address(
    config: &mut PlatformConfig,
    new_address: address,
    ctx: &mut TxContext
)
```

#### update_platform_fees

Update fee percentages (platform owner only).

```move
public entry fun update_platform_fees(
    config: &mut PlatformConfig,
    purchase_fee_bps: u64,
    tip_fee_bps: u64,
    ctx: &mut TxContext
)
```

**Note:** Fees in basis points (100 = 1%)

## Getter Functions

### Collection Metadata

- `get_id(collection: &Collection): ID`
- `get_name(collection: &Collection): vector<u8>`
- `get_description(collection: &Collection): vector<u8>`
- `get_category(collection: &Collection): vector<u8>`
- `get_tags(collection: &Collection): &vector<vector<u8>>`
- `get_owner(collection: &Collection): address`
- `get_visibility(collection: &Collection): u8`
- `get_price(collection: &Collection): u64`

### Files

- `get_files(collection: &Collection): &vector<FileRef>`
- `get_file_count(collection: &Collection): u64`
- `get_file_blob_id(file: &FileRef): vector<u8>`
- `get_file_name(file: &FileRef): vector<u8>`
- `get_file_content_type(file: &FileRef): vector<u8>`
- `get_file_size(file: &FileRef): u64`
- `is_file_encrypted(file: &FileRef): bool`

### Statistics

- `get_view_count(collection: &Collection): u64`
- `get_purchase_count(collection: &Collection): u64`
- `get_tip_count(collection: &Collection): u64`
- `get_total_earnings(collection: &Collection): u64`
- `get_total_tips(collection: &Collection): u64`
- `get_created_at(collection: &Collection): u64`

### Encryption

- `is_encrypted(collection: &Collection): bool`
- `get_encryption_key_hash(collection: &Collection): vector<u8>`
- `get_access_policy_id(collection: &Collection): Option<ID>`

### Status

- `is_deleted(collection: &Collection): bool`

### Access Verification

- `has_access(collection: &Collection, user: address, current_time: u64): bool`
- `can_decrypt(collection: &Collection, policy: &access_policy::CollectionAccessPolicy, user: address, current_time: u64): bool`

### Platform Config

- `get_platform_address(config: &PlatformConfig): address`
- `get_purchase_fee_bps(config: &PlatformConfig): u64`
- `get_tip_fee_bps(config: &PlatformConfig): u64`

### AccessToken

- `get_access_token_collection_id(token: &AccessToken): ID`
- `get_access_token_owner(token: &AccessToken): address`

## Events

### CollectionCreated

```move
public struct CollectionCreated has copy, drop {
    collection_id: ID,
    owner: address,
    name: vector<u8>,
    visibility: u8,
    file_count: u64,
    is_encrypted: bool,
}
```

### CollectionUpdated

```move
public struct CollectionUpdated has copy, drop {
    collection_id: ID,
    name: vector<u8>,
    description: vector<u8>,
    visibility: u8,
    price: u64,
}
```

### CollectionDeleted

```move
public struct CollectionDeleted has copy, drop {
    collection_id: ID,
    owner: address,
    timestamp: u64,
}
```

### AccessPurchased

```move
public struct AccessPurchased has copy, drop {
    collection_id: ID,
    buyer: address,
    price: u64,
    timestamp: u64,
}
```

### TipReceived

```move
public struct TipReceived has copy, drop {
    collection_id: ID,
    tipper: address,
    amount: u64,
    timestamp: u64,
}
```

### ViewIncremented

```move
public struct ViewIncremented has copy, drop {
    collection_id: ID,
    new_view_count: u64,
}
```

## Error Codes

- `EInvalidPrice = 1` - Invalid price or visibility type
- `EInsufficientPayment = 2` - Payment less than required
- `ENotOwner = 3` - Caller not collection owner
- `ECollectionDeleted = 6` - Collection has been deleted

## Usage Examples

### Create Free Public Collection

```move
use bunker_contracts::collection;

collection::create_collection(
    b"Public Dataset",
    b"Free for all",
    b"Education",
    vector[b"education", b"public"],
    vector[blob1, blob2],
    vector[b"data.csv", b"readme.txt"],
    vector[b"text/csv", b"text/plain"],
    vector[1024, 512],
    vector[false, false],
    0,  // VISIBILITY_PUBLIC
    0,  // free
    false,
    vector::empty(),
    &mut ctx
);
```

### Purchase Premium Collection

```move
use sui::coin;
use bunker_contracts::collection;

let payment = coin::split(&mut sui_coin, 1_000_000_000, &mut ctx); // 1 SUI

collection::purchase_access(
    &mut premium_collection,
    &platform_config,
    payment,
    &mut ctx
);
// AccessToken transferred to caller
```

### Tip 0.5 SUI

```move
let tip = coin::split(&mut sui_coin, 500_000_000, &mut ctx);

collection::tip_creator(
    &mut collection,
    &platform_config,
    tip,
    &mut ctx
);
```
