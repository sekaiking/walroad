# Access Policy Contract API

Module: `bunker_contracts::access_policy`

## Overview

Controls Seal encryption decryption permissions for encrypted collections. Each encrypted collection has a corresponding access policy that Seal key servers query to determine who can decrypt.

## Data Structures

### CollectionAccessPolicy

Shared object managing decryption permissions.

```move
public struct CollectionAccessPolicy has key, store {
    id: UID,
    collection_id: Option<ID>,
    owner: address,
    authorized_users: Table<address, bool>,
    total_authorized: u64,
}
```

## Functions

### Policy Creation

#### create_policy

Create policy linked to a collection (called by collection module).

```move
public fun create_policy(
    collection_id: ID,
    owner: address,
    ctx: &mut TxContext
): CollectionAccessPolicy
```

**Returns:** CollectionAccessPolicy (not shared yet)

#### create_standalone_policy

Create standalone policy before collection exists.

```move
public fun create_standalone_policy(ctx: &mut TxContext)
```

**Use case:** Encrypt files before creating collection

**Returns:** Shared policy object

#### share_policy

Share a policy object.

```move
public fun share_policy(policy: CollectionAccessPolicy)
```

**Note:** Makes policy readable by Seal key servers

#### link_to_collection

Link standalone policy to a collection.

```move
public(package) fun link_to_collection(
    policy: &mut CollectionAccessPolicy,
    collection_id: ID
)
```

**Emits:** `PolicyLinkedToCollection`

**Visibility:** Package-only (called by collection module)

### Access Management

#### grant_access

Grant decryption access to a user.

```move
public(package) fun grant_access(
    policy: &mut CollectionAccessPolicy,
    user: address
)
```

**Emits:** `AccessGranted`

**Visibility:** Package-only (called by collection module on purchase)

#### grant_access_batch

Grant access to multiple users efficiently.

```move
public(package) fun grant_access_batch(
    policy: &mut CollectionAccessPolicy,
    users: vector<address>
)
```

**Emits:** `AccessGranted` for each user

**Use case:** Bulk airdrops or imports

#### revoke_access

Revoke decryption access (owner only).

```move
public fun revoke_access(
    policy: &mut CollectionAccessPolicy,
    user: address,
    ctx: &mut TxContext
)
```

**Emits:** `AccessRevoked`

**Use case:** Refunds, policy violations

#### revoke_access_batch

Revoke access from multiple users.

```move
public fun revoke_access_batch(
    policy: &mut CollectionAccessPolicy,
    users: vector<address>,
    ctx: &mut TxContext
)
```

**Emits:** `AccessRevoked` for each user

### Ownership

#### transfer_ownership

Transfer policy ownership to new address.

```move
public fun transfer_ownership(
    policy: &mut CollectionAccessPolicy,
    new_owner: address,
    ctx: &mut TxContext
)
```

**Emits:** `PolicyOwnershipTransferred`

**Note:** New owner gains revoke/ownership transfer rights

### Access Verification

#### can_decrypt

Check if user can decrypt (used by Seal key servers).

```move
public fun can_decrypt(
    policy: &CollectionAccessPolicy,
    requester: address
): bool
```

**Returns:** `true` if owner or authorized user

#### has_explicit_access

Check if user was explicitly granted access (excludes owner).

```move
public fun has_explicit_access(
    policy: &CollectionAccessPolicy,
    user: address
): bool
```

**Returns:** `true` if user purchased access

## Getter Functions

- `get_policy_id(policy: &CollectionAccessPolicy): ID`
- `get_collection_id(policy: &CollectionAccessPolicy): Option<ID>`
- `get_owner(policy: &CollectionAccessPolicy): address`
- `get_total_authorized(policy: &CollectionAccessPolicy): u64`
- `is_linked(policy: &CollectionAccessPolicy): bool` - Check if linked to collection

## Events

### AccessGranted

Emitted when a user gains decryption access.

```move
public struct AccessGranted has copy, drop {
    policy_id: ID,
    user: address,
    timestamp: u64,
}
```

### AccessRevoked

Emitted when access is removed.

```move
public struct AccessRevoked has copy, drop {
    policy_id: ID,
    user: address,
    timestamp: u64,
}
```

### PolicyOwnershipTransferred

Emitted when policy ownership changes.

```move
public struct PolicyOwnershipTransferred has copy, drop {
    policy_id: ID,
    old_owner: address,
    new_owner: address,
    timestamp: u64,
}
```

### PolicyLinkedToCollection

Emitted when standalone policy links to collection.

```move
public struct PolicyLinkedToCollection has copy, drop {
    policy_id: ID,
    collection_id: ID,
}
```

## Error Codes

- `ENotAuthorized = 0` - User not authorized
- `ENotOwner = 1` - Caller not policy owner
- `EAlreadyHasAccess = 2` - User already has access
- `ENoAccess = 3` - User doesn't have access to revoke

## Usage Examples

### Standard Flow (Automatic)

When using `collection::create_collection()` with encryption:

```move
// Policy created and linked automatically
collection::create_collection(
    // ... params
    is_encrypted: true,  // Policy auto-created
    // ...
);
```

### Pre-encryption Flow

Encrypt files before collection creation:

1. **Create standalone policy:**

```move
use bunker_contracts::access_policy;

access_policy::create_standalone_policy(&mut ctx);
// Get policy ID from events
```

2. **Encrypt files with Seal** using policy ID

3. **Upload encrypted files** to Walrus

4. **Create collection** with policy:

```move
collection::create_collection_with_policy(
    // ... params
    &mut policy,
    &mut ctx
);
```

### Revoke Access (Refund)

```move
use bunker_contracts::access_policy;

access_policy::revoke_access(
    &mut policy,
    buyer_address,
    &mut ctx
);
// User can no longer decrypt
```

### Bulk Revoke

```move
let banned_users = vector[@0x1, @0x2, @0x3];

access_policy::revoke_access_batch(
    &mut policy,
    banned_users,
    &mut ctx
);
```

### Transfer Policy Ownership

```move
// Transfer to new creator
access_policy::transfer_ownership(
    &mut policy,
    new_creator_address,
    &mut ctx
);
```

### Query Access (Off-chain)

```move
// Check if user can decrypt
let can_view = access_policy::can_decrypt(&policy, user_address);

// Check authorization count
let total = access_policy::get_total_authorized(&policy);

// Check if policy is linked
let linked = access_policy::is_linked(&policy);
```

## Integration with Seal

Seal key servers use `can_decrypt()` to verify permissions:

1. **User requests decryption** from Seal key server
2. **Key server queries** policy: `can_decrypt(policy, user)`
3. **If true** → provide decryption key
4. **If false** → deny access

## Best Practices

1. **Use automatic creation** for simple cases - just set `is_encrypted: true`

2. **Use standalone policy** when:
   - Files must be encrypted before collection exists
   - Reusing policy across multiple collections
   - Complex access control needed

3. **Revoke carefully** - users lose access immediately, may need refund

4. **Monitor events** - track `AccessGranted`/`AccessRevoked` for analytics

5. **Ownership transfer** - ensure new owner is trusted, irreversible operation
