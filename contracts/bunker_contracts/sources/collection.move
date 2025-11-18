module bunker_contracts::collection {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::transfer;
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use std::vector;
    use std::option::{Self, Option};
    use bunker_contracts::access_policy;

    // Error codes
    const EInvalidPrice: u64 = 1;
    const EInsufficientPayment: u64 = 2;
    const ENotOwner: u64 = 3;
    const EAlreadyPurchased: u64 = 4;
    const EInvalidVisibility: u64 = 5;
    const ECollectionDeleted: u64 = 6;

    // Collection visibility types
    const VISIBILITY_PUBLIC: u8 = 0;
    const VISIBILITY_PRIVATE: u8 = 1;
    const VISIBILITY_PAY_TO_SEE: u8 = 2;
    const VISIBILITY_UNLISTED: u8 = 3; // Public but not indexed

    // Platform fee configuration (stored as shared object)
    public struct PlatformConfig has key {
        id: UID,
        platform_address: address,
        purchase_fee_bps: u64, // Basis points (250 = 2.5%)
        tip_fee_bps: u64, // Basis points (100 = 1%)
    }

    // File reference stored in collection
    public struct FileRef has store, copy, drop {
        blob_id: vector<u8>,
        name: vector<u8>,
        content_type: vector<u8>,
        size_bytes: u64,
        is_encrypted: bool,
    }

    // Main collection object
    public struct Collection has key, store {
        id: UID,
        owner: address,
        created_at: u64,

        name: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        cover_image_blob_ids: vector<vector<u8>>,

        files: vector<FileRef>,
        visibility: u8,
        price: u64, // in MIST (1 SUI = 1B MIST)

        purchase_count: u64,
        tip_count: u64,
        total_earnings: u64,
        total_tips: u64,

        is_encrypted: bool,
        encryption_key_hash: vector<u8>,

        access_policy_id: Option<ID>, // Seal access policy ID for decryption

        is_deleted: bool, // Soft delete flag
    }

    // Access token given after purchase
    public struct AccessToken has key, store {
        id: UID,
        collection_id: ID,
        owner: address,
        purchased_at: u64,
    }

    // ====== Events ======

    public struct CollectionCreated has copy, drop {
        collection_id: ID,
        owner: address,
        name: vector<u8>,
        visibility: u8,
        file_count: u64,
        is_encrypted: bool,
    }

    public struct CollectionUpdated has copy, drop {
        collection_id: ID,
        name: vector<u8>,
        description: vector<u8>,
        visibility: u8,
        price: u64,
    }

    public struct CollectionDeleted has copy, drop {
        collection_id: ID,
        owner: address,
        timestamp: u64,
    }

    public struct AccessPurchased has copy, drop {
        collection_id: ID,
        buyer: address,
        price: u64,
        timestamp: u64,
    }

    	public struct TipReceived has copy, drop {
    		collection_id: ID,
    		tipper: address,
    		amount: u64,
    		timestamp: u64,
    	}
    
        // ====== Init Function ======
    /// Initialize the module with platform configuration
    /// This should be called once during deployment
    fun init(ctx: &mut TxContext) {
        let platform_config = PlatformConfig {
            id: object::new(ctx),
            platform_address: tx_context::sender(ctx),
            purchase_fee_bps: 250, // 2.5%
            tip_fee_bps: 100, // 1%
        };
        transfer::share_object(platform_config);
    }

    // ====== Collection Creation ======

    /// Create a new collection with automatic policy creation
    public entry fun create_collection(
        name: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        cover_image_blob_ids: vector<vector<u8>>,
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
    ) {
        let file_count = vector::length(&blob_ids);
        let mut files = vector::empty<FileRef>();
        let mut i = 0;

        while (i < file_count) {
            let file_ref = FileRef {
                blob_id: *vector::borrow(&blob_ids, i),
                name: *vector::borrow(&file_names, i),
                content_type: *vector::borrow(&content_types, i),
                size_bytes: *vector::borrow(&file_sizes, i),
                is_encrypted: *vector::borrow(&is_encrypted_flags, i),
            };
            vector::push_back(&mut files, file_ref);
            i = i + 1;
        };

        let mut collection = Collection {
            id: object::new(ctx),
            name,
            description,
            category,
            tags,
            cover_image_blob_ids,
            owner: tx_context::sender(ctx),
            files,
            visibility,
            price,
            purchase_count: 0,
            tip_count: 0,
            total_earnings: 0,
            total_tips: 0,
            is_encrypted,
            encryption_key_hash,
            access_policy_id: option::none(),
            created_at: tx_context::epoch_timestamp_ms(ctx),
            is_deleted: false,
        };

        let collection_id = object::id(&collection);

        // Create Seal access policy for encrypted collections
        if (is_encrypted) {
            let policy = access_policy::create_policy(
                collection_id,
                tx_context::sender(ctx),
                ctx
            );
            let policy_id = object::id(&policy);
            collection.access_policy_id = option::some(policy_id);
            access_policy::share_policy(policy);
        };

        event::emit(CollectionCreated {
            collection_id,
            owner: tx_context::sender(ctx),
            name: collection.name,
            visibility,
            file_count,
            is_encrypted,
        });

        // Make collection a shared object so anyone can read metadata
        transfer::share_object(collection);
    }

    /// Create a new collection with an existing access policy (for Seal encryption)
    /// This allows files to be encrypted with Seal before creating the collection
    public entry fun create_collection_with_policy(
        name: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        cover_image_blob_ids: vector<vector<u8>>,
        blob_ids: vector<vector<u8>>,
        file_names: vector<vector<u8>>,
        content_types: vector<vector<u8>>,
        file_sizes: vector<u64>,
        is_encrypted_flags: vector<bool>,
        visibility: u8,
        price: u64,
        is_encrypted: bool,
        encryption_key_hash: vector<u8>,
        policy: &mut access_policy::CollectionAccessPolicy,
        ctx: &mut TxContext
    ) {
        let file_count = vector::length(&blob_ids);
        let mut files = vector::empty<FileRef>();
        let mut i = 0;

        while (i < file_count) {
            let file_ref = FileRef {
                blob_id: *vector::borrow(&blob_ids, i),
                name: *vector::borrow(&file_names, i),
                content_type: *vector::borrow(&content_types, i),
                size_bytes: *vector::borrow(&file_sizes, i),
                is_encrypted: *vector::borrow(&is_encrypted_flags, i),
            };
            vector::push_back(&mut files, file_ref);
            i = i + 1;
        };

        let collection = Collection {
            id: object::new(ctx),
            name,
            description,
            category,
            tags,
            cover_image_blob_ids,
            owner: tx_context::sender(ctx),
            files,
            visibility,
            price,
            purchase_count: 0,
            tip_count: 0,
            total_earnings: 0,
            total_tips: 0,
            is_encrypted,
            encryption_key_hash,
            access_policy_id: option::some(object::id(policy)),
            created_at: tx_context::epoch_timestamp_ms(ctx),
            is_deleted: false,
        };

        let collection_id = object::id(&collection);

        // Link the policy to this collection
        access_policy::link_to_collection(policy, collection_id);

        event::emit(CollectionCreated {
            collection_id,
            owner: tx_context::sender(ctx),
            name: collection.name,
            visibility,
            file_count,
            is_encrypted,
        });

        // Make collection a shared object so anyone can read metadata
        transfer::share_object(collection);
    }

    // ====== Collection Updates ======

    /// Update collection metadata (owner only)
    public entry fun update_collection(
        collection: &mut Collection,
        name: vector<u8>,
        description: vector<u8>,
        category: vector<u8>,
        tags: vector<vector<u8>>,
        visibility: u8,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(collection.owner == tx_context::sender(ctx), ENotOwner);
        assert!(!collection.is_deleted, ECollectionDeleted);

        collection.name = name;
        collection.description = description;
        collection.category = category;
        collection.tags = tags;
        collection.visibility = visibility;
        collection.price = price;

        event::emit(CollectionUpdated {
            collection_id: object::id(collection),
            name,
            description,
            visibility,
            price,
        });
    }

    /// Delete collection (soft delete - owner only)
    /// This doesn't actually destroy the object, just marks it as deleted
    public entry fun delete_collection(
        collection: &mut Collection,
        ctx: &mut TxContext
    ) {
        assert!(collection.owner == tx_context::sender(ctx), ENotOwner);
        assert!(!collection.is_deleted, ECollectionDeleted);

        collection.is_deleted = true;

        event::emit(CollectionDeleted {
            collection_id: object::id(collection),
            owner: collection.owner,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

    // ====== Purchase Access ======

    /// Purchase access to a pay-to-see collection (non-encrypted)
    public entry fun purchase_access(
        collection: &mut Collection,
        platform_config: &PlatformConfig,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(!collection.is_deleted, ECollectionDeleted);
        assert!(collection.visibility == VISIBILITY_PAY_TO_SEE, EInvalidPrice);
        assert!(!collection.is_encrypted, EInvalidPrice);

        let payment_value = coin::value(&payment);
        assert!(payment_value >= collection.price, EInsufficientPayment);

        // Calculate platform fee
        let platform_fee = (collection.price * platform_config.purchase_fee_bps) / 10000;
        let creator_amount = collection.price - platform_fee;

        // Split payment
        let mut payment_coin = payment;
        let creator_payment = coin::split(&mut payment_coin, creator_amount, ctx);
        let platform_payment = coin::split(&mut payment_coin, platform_fee, ctx);

        // Send to creator
        transfer::public_transfer(creator_payment, collection.owner);

        // Send platform fee
        transfer::public_transfer(platform_payment, platform_config.platform_address);

        // Return any excess
        if (coin::value(&payment_coin) > 0) {
            transfer::public_transfer(payment_coin, tx_context::sender(ctx));
        } else {
            coin::destroy_zero(payment_coin);
        };

        // Update stats
        collection.total_earnings = collection.total_earnings + collection.price;
        collection.purchase_count = collection.purchase_count + 1;

        // Create access token
        let access_token = AccessToken {
            id: object::new(ctx),
            collection_id: object::id(collection),
            owner: tx_context::sender(ctx),
            purchased_at: tx_context::epoch_timestamp_ms(ctx),
        };

        event::emit(AccessPurchased {
            collection_id: object::id(collection),
            buyer: tx_context::sender(ctx),
            price: collection.price,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });

        transfer::transfer(access_token, tx_context::sender(ctx));
    }

    /// Purchase access to an encrypted pay-to-see collection
    public entry fun purchase_access_encrypted(
        collection: &mut Collection,
        policy: &mut access_policy::CollectionAccessPolicy,
        platform_config: &PlatformConfig,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(!collection.is_deleted, ECollectionDeleted);
        assert!(collection.visibility == VISIBILITY_PAY_TO_SEE, EInvalidPrice);
        assert!(collection.is_encrypted, EInvalidPrice);

        let payment_value = coin::value(&payment);
        assert!(payment_value >= collection.price, EInsufficientPayment);

        // Calculate platform fee
        let platform_fee = (collection.price * platform_config.purchase_fee_bps) / 10000;
        let creator_amount = collection.price - platform_fee;

        // Split payment
        let mut payment_coin = payment;
        let creator_payment = coin::split(&mut payment_coin, creator_amount, ctx);
        let platform_payment = coin::split(&mut payment_coin, platform_fee, ctx);

        // Send to creator
        transfer::public_transfer(creator_payment, collection.owner);

        // Send platform fee
        transfer::public_transfer(platform_payment, platform_config.platform_address);

        // Return any excess
        if (coin::value(&payment_coin) > 0) {
            transfer::public_transfer(payment_coin, tx_context::sender(ctx));
        } else {
            coin::destroy_zero(payment_coin);
        };

        // Update stats
        collection.total_earnings = collection.total_earnings + collection.price;
        collection.purchase_count = collection.purchase_count + 1;

        // Grant decryption access in the access policy
        access_policy::grant_access(policy, tx_context::sender(ctx));

        // Create access token
        let access_token = AccessToken {
            id: object::new(ctx),
            collection_id: object::id(collection),
            owner: tx_context::sender(ctx),
            purchased_at: tx_context::epoch_timestamp_ms(ctx),
        };

        event::emit(AccessPurchased {
            collection_id: object::id(collection),
            buyer: tx_context::sender(ctx),
            price: collection.price,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });

        transfer::transfer(access_token, tx_context::sender(ctx));
    }

    // ====== Tips ======

    /// Tip a creator
    public entry fun tip_creator(
        collection: &mut Collection,
        platform_config: &PlatformConfig,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(!collection.is_deleted, ECollectionDeleted);

        let tip_amount = coin::value(&payment);

        // Calculate platform fee (1% for tips)
        let platform_fee = (tip_amount * platform_config.tip_fee_bps) / 10000;
        let creator_amount = tip_amount - platform_fee;

        // Split payment
        let mut payment_coin = payment;
        let creator_payment = coin::split(&mut payment_coin, creator_amount, ctx);
        let platform_payment = coin::split(&mut payment_coin, platform_fee, ctx);

        // Send to creator
        transfer::public_transfer(creator_payment, collection.owner);

        // Send platform fee
        transfer::public_transfer(platform_payment, platform_config.platform_address);

        // Destroy the empty coin
        coin::destroy_zero(payment_coin);

        // Update stats
        collection.total_tips = collection.total_tips + tip_amount;
        collection.tip_count = collection.tip_count + 1;

        event::emit(TipReceived {
            collection_id: object::id(collection),
            tipper: tx_context::sender(ctx),
            amount: tip_amount,
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });
    }

		// ====== Platform Config Management ======
    
		/// Update platform address (only current platform owner)    
		public entry fun update_platform_address(
        config: &mut PlatformConfig,
        new_address: address,
        ctx: &mut TxContext
    ) {
        assert!(config.platform_address == tx_context::sender(ctx), ENotOwner);
        config.platform_address = new_address;
    }

    /// Update platform fees (only platform owner)
    public entry fun update_platform_fees(
        config: &mut PlatformConfig,
        purchase_fee_bps: u64,
        tip_fee_bps: u64,
        ctx: &mut TxContext
    ) {
        assert!(config.platform_address == tx_context::sender(ctx), ENotOwner);
        config.purchase_fee_bps = purchase_fee_bps;
        config.tip_fee_bps = tip_fee_bps;
    }

    // ====== Getters ======

    // AccessToken getters (used by access_policy module)
    public fun get_access_token_collection_id(token: &AccessToken): ID {
        token.collection_id
    }

    public fun get_access_token_owner(token: &AccessToken): address {
        token.owner
    }

    // Collection metadata getters
    public fun get_id(collection: &Collection): ID {
        object::id(collection)
    }

    public fun get_name(collection: &Collection): vector<u8> {
        collection.name
    }

    public fun get_description(collection: &Collection): vector<u8> {
        collection.description
    }

    public fun get_category(collection: &Collection): vector<u8> {
        collection.category
    }

    public fun get_tags(collection: &Collection): &vector<vector<u8>> {
        &collection.tags
    }

    public fun get_owner(collection: &Collection): address {
        collection.owner
    }

    public fun get_visibility(collection: &Collection): u8 {
        collection.visibility
    }

    public fun get_price(collection: &Collection): u64 {
        collection.price
    }

    public fun get_files(collection: &Collection): &vector<FileRef> {
        &collection.files
    }

    public fun get_file_count(collection: &Collection): u64 {
        vector::length(&collection.files)
    }

    // Stats getters
    public fun get_purchase_count(collection: &Collection): u64 {
        collection.purchase_count
    }

    public fun get_tip_count(collection: &Collection): u64 {
        collection.tip_count
    }

    public fun get_total_earnings(collection: &Collection): u64 {
        collection.total_earnings
    }

    public fun get_total_tips(collection: &Collection): u64 {
        collection.total_tips
    }

    public fun get_created_at(collection: &Collection): u64 {
        collection.created_at
    }

    // Encryption getters
    public fun is_encrypted(collection: &Collection): bool {
        collection.is_encrypted
    }

    public fun get_encryption_key_hash(collection: &Collection): vector<u8> {
        collection.encryption_key_hash
    }

    public fun get_access_policy_id(collection: &Collection): Option<ID> {
        collection.access_policy_id
    }

    // Status getters
    public fun is_deleted(collection: &Collection): bool {
        collection.is_deleted
    }

    // FileRef getters
    public fun get_file_blob_id(file: &FileRef): vector<u8> {
        file.blob_id
    }

    public fun get_file_name(file: &FileRef): vector<u8> {
        file.name
    }

    public fun get_file_content_type(file: &FileRef): vector<u8> {
        file.content_type
    }

    public fun get_file_size(file: &FileRef): u64 {
        file.size_bytes
    }

    public fun is_file_encrypted(file: &FileRef): bool {
        file.is_encrypted
    }

    // Platform config getters
    public fun get_platform_address(config: &PlatformConfig): address {
        config.platform_address
    }

    public fun get_purchase_fee_bps(config: &PlatformConfig): u64 {
        config.purchase_fee_bps
    }

    public fun get_tip_fee_bps(config: &PlatformConfig): u64 {
        config.tip_fee_bps
    }

    // ====== Access Verification ======

    /// Check if user has access to collection
    /// Note: For pay-to-see, this only checks non-purchase conditions
    /// Actual purchase verification requires checking AccessToken ownership off-chain
    public fun has_access(
        collection: &Collection,
        user: address,
        _current_time: u64
    ): bool {
        // Deleted collections are not accessible
        if (collection.is_deleted) {
            return false
        };

        // Owner always has access
        if (collection.owner == user) {
            return true
        };

        // Public and unlisted collections are accessible to everyone
        if (collection.visibility == VISIBILITY_PUBLIC || collection.visibility == VISIBILITY_UNLISTED) {
            return true
        };

        // Private collections only accessible by owner
        if (collection.visibility == VISIBILITY_PRIVATE) {
            return false
        };

        // Pay-to-see requires access token (checked off-chain by querying user's AccessTokens)
        false
    }

    /// Verify if a user can decrypt encrypted content
    /// This combines collection access with encryption policy check
    public fun can_decrypt(
        collection: &Collection,
        policy: &access_policy::CollectionAccessPolicy,
        user: address,
        current_time: u64
    ): bool {
        if (!collection.is_encrypted) {
            return has_access(collection, user, current_time)
        };

        // For encrypted content, check both collection access and policy access
        has_access(collection, user, current_time) &&
        access_policy::can_decrypt(policy, user)
    }
}
