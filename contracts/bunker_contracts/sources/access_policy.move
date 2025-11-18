// Access policy for Seal encryption - allows owner and AccessToken holders to decrypt
module bunker_contracts::access_policy {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::table::{Self, Table};
    use sui::event;
    use std::option::{Self, Option};

    // Error codes
    const ENotAuthorized: u64 = 0;
    const ENotOwner: u64 = 1;
    const EAlreadyHasAccess: u64 = 2;
    const ENoAccess: u64 = 3;

    /// Access policy object that Seal uses to determine decryption permissions
    /// Each collection has its own access policy instance
    public struct CollectionAccessPolicy has key, store {
        id: UID,
        collection_id: Option<ID>, // Optional to allow creating policy before collection
        owner: address,
        // Table of addresses that have purchased access
        authorized_users: Table<address, bool>,
        // Stats
        total_authorized: u64,
    }

    // ====== Events ======

    public struct AccessGranted has copy, drop {
        policy_id: ID,
        user: address,
        timestamp: u64,
    }

    public struct AccessRevoked has copy, drop {
        policy_id: ID,
        user: address,
        timestamp: u64,
    }

    public struct PolicyOwnershipTransferred has copy, drop {
        policy_id: ID,
        old_owner: address,
        new_owner: address,
        timestamp: u64,
    }

    public struct PolicyLinkedToCollection has copy, drop {
        policy_id: ID,
        collection_id: ID,
    }

    // ====== Policy Creation ======

    /// Create a new access policy for a collection
    /// This is called when creating a collection with encryption
    public fun create_policy(
        collection_id: ID,
        owner: address,
        ctx: &mut TxContext
    ): CollectionAccessPolicy {
        CollectionAccessPolicy {
            id: object::new(ctx),
            collection_id: option::some(collection_id),
            owner,
            authorized_users: table::new(ctx),
            total_authorized: 0,
        }
    }

    /// Create a standalone access policy (before collection exists)
    /// This allows encrypting files before uploading them
    public fun create_standalone_policy(ctx: &mut TxContext) {
        let policy = CollectionAccessPolicy {
            id: object::new(ctx),
            collection_id: option::none(),
            owner: ctx.sender(),
            authorized_users: table::new(ctx),
            total_authorized: 0,
        };
        transfer::public_share_object(policy);
    }

    /// Link a standalone policy to a collection
    /// Called by collection module when collection is created
    public(package) fun link_to_collection(
        policy: &mut CollectionAccessPolicy,
        collection_id: ID
    ) {
        policy.collection_id = option::some(collection_id);

        event::emit(PolicyLinkedToCollection {
            policy_id: object::id(policy),
            collection_id,
        });
    }

    /// Share the access policy so Seal key servers can read it
    public fun share_policy(policy: CollectionAccessPolicy) {
        transfer::public_share_object(policy);
    }

    // ====== Access Management ======

    /// Grant access to a user (called when they purchase AccessToken)
    /// This is called by the collection module
    public(package) fun grant_access(
        policy: &mut CollectionAccessPolicy,
        user: address
    ) {
        // Don't add duplicates
        if (!policy.authorized_users.contains(user)) {
            policy.authorized_users.add(user, true);
            policy.total_authorized = policy.total_authorized + 1;

            event::emit(AccessGranted {
                policy_id: object::id(policy),
                user,
                timestamp: 0, // Will be set by the blockchain
            });
        };
    }

    /// Grant access to multiple users at once (batch operation)
    /// Only callable by the policy owner or collection module
    public(package) fun grant_access_batch(
        policy: &mut CollectionAccessPolicy,
        users: vector<address>
    ) {
        let mut i = 0;
        let len = users.length();

        while (i < len) {
            let user = *users.borrow(i);
            if (!policy.authorized_users.contains(user)) {
                policy.authorized_users.add(user, true);
                policy.total_authorized = policy.total_authorized + 1;

                event::emit(AccessGranted {
                    policy_id: object::id(policy),
                    user,
                    timestamp: 0,
                });
            };
            i = i + 1;
        };
    }

    /// Revoke access from a user (owner only)
    /// Useful for refunds or policy violations
    public fun revoke_access(
        policy: &mut CollectionAccessPolicy,
        user: address,
        ctx: &mut TxContext
    ) {
        assert!(policy.owner == ctx.sender(), ENotOwner);
        assert!(policy.authorized_users.contains(user), ENoAccess);

        policy.authorized_users.remove(user);
        policy.total_authorized = policy.total_authorized - 1;

        event::emit(AccessRevoked {
            policy_id: object::id(policy),
            user,
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    /// Revoke access from multiple users at once (owner only)
    public fun revoke_access_batch(
        policy: &mut CollectionAccessPolicy,
        users: vector<address>,
        ctx: &mut TxContext
    ) {
        assert!(policy.owner == ctx.sender(), ENotOwner);

        let mut i = 0;
        let len = users.length();

        while (i < len) {
            let user = *users.borrow(i);
            if (policy.authorized_users.contains(user)) {
                policy.authorized_users.remove(user);
                policy.total_authorized = policy.total_authorized - 1;

                event::emit(AccessRevoked {
                    policy_id: object::id(policy),
                    user,
                    timestamp: ctx.epoch_timestamp_ms(),
                });
            };
            i = i + 1;
        };
    }

    /// Transfer ownership of the policy (current owner only)
    public fun transfer_ownership(
        policy: &mut CollectionAccessPolicy,
        new_owner: address,
        ctx: &mut TxContext
    ) {
        assert!(policy.owner == ctx.sender(), ENotOwner);

        let old_owner = policy.owner;
        policy.owner = new_owner;

        event::emit(PolicyOwnershipTransferred {
            policy_id: object::id(policy),
            old_owner,
            new_owner,
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    // ====== Access Verification ======

    /// Standard Seal approval function - REQUIRED by Seal key servers
    /// This is the function Seal calls to verify decryption access
    /// @param id - The encrypted blob ID (prefix must match policy namespace)
    /// @param policy - The access policy object
    /// @param ctx - Transaction context to get the requester address
    entry fun seal_approve(
        id: vector<u8>,
        policy: &CollectionAccessPolicy,
        ctx: &TxContext
    ) {
        let requester = ctx.sender();

        // Verify the ID has the correct namespace (policy ID prefix)
        let policy_id_bytes = object::id_to_bytes(&object::id(policy));
        assert!(is_prefix(policy_id_bytes, id), ENotAuthorized);

        // Verify the requester has access
        assert!(can_decrypt(policy, requester), ENotAuthorized);
    }

    /// Helper function to check if `prefix` is a prefix of `data`
    fun is_prefix(prefix: vector<u8>, data: vector<u8>): bool {
        let prefix_len = prefix.length();
        if (prefix_len > data.length()) {
            return false
        };

        let mut i = 0;
        while (i < prefix_len) {
            if (*prefix.borrow(i) != *data.borrow(i)) {
                return false
            };
            i = i + 1;
        };

        true
    }

    /// Verify decrypt access as an entry function for Seal PTB
    /// This is called in a transaction to prove the user has decryption rights
    /// Aborts if the sender doesn't have access
    public entry fun verify_decrypt_access(
        policy: &CollectionAccessPolicy,
        ctx: &TxContext
    ) {
        let requester = ctx.sender();
        assert!(can_decrypt(policy, requester), ENotAuthorized);
    }

    /// Check if an address can decrypt data encrypted with this policy
    /// This is called by Seal key servers during decryption
    ///
    /// Access is granted if:
    /// 1. User is the collection owner, OR
    /// 2. User has been granted access (purchased AccessToken)
    public fun can_decrypt(
        policy: &CollectionAccessPolicy,
        requester: address
    ): bool {
        // Owner can always decrypt
        if (requester == policy.owner) {
            return true
        };

        // Check if user has purchased access
        if (policy.authorized_users.contains(requester)) {
            return true
        };

        false
    }

    /// Check if a user has been explicitly granted access (not including owner)
    public fun has_explicit_access(
        policy: &CollectionAccessPolicy,
        user: address
    ): bool {
        policy.authorized_users.contains(user)
    }

    // ====== Getters ======

    public fun get_policy_id(policy: &CollectionAccessPolicy): ID {
        object::id(policy)
    }

    public fun get_collection_id(policy: &CollectionAccessPolicy): Option<ID> {
        policy.collection_id
    }

    public fun get_owner(policy: &CollectionAccessPolicy): address {
        policy.owner
    }

    public fun get_total_authorized(policy: &CollectionAccessPolicy): u64 {
        policy.total_authorized
    }

    /// Check if the policy is linked to a collection
    public fun is_linked(policy: &CollectionAccessPolicy): bool {
        option::is_some(&policy.collection_id)
    }
}
