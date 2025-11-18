import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import type { CollectionData, CollectionVisibility } from '@/lib/types';

// Contract configuration
const PACKAGE_ID = process.env.NEXT_PUBLIC_COLLECTION_PACKAGE_ID;
const SUI_NETWORK_URL = process.env.NEXT_PUBLIC_SUI_NETWORK_URL || 'https://fullnode.testnet.sui.io:443';

if (!PACKAGE_ID) {
	throw new Error(
		'NEXT_PUBLIC_COLLECTION_PACKAGE_ID environment variable is not set. ' +
		'Please configure this in your .env.local file with your deployed contract package ID.'
	);
}

// Initialize Sui client
export const suiClient = new SuiClient({ url: SUI_NETWORK_URL });

// Visibility types matching Move contract
export const VISIBILITY = {
	PUBLIC: 0,
	PRIVATE: 1,
	PAY_TO_SEE: 2,
	UNLISTED: 3, // Public but not indexed
} as const;

export interface CollectionMetadata {
	name: string;
	description: string;
	category: string;
	tags: string[];
	coverImageBlobIds: string[];
	blobIds: string[];
	fileNames: string[];
	contentTypes: string[];
	fileSizes: number[];
	isEncryptedFlags: boolean[];
	visibility: number;
	price: number; // in MIST
	isEncrypted: boolean;
	encryptionKeyHash: string;
}

/**
 * Create a new collection on-chain (original function - for non-encrypted collections)
 */
export function createCollectionTransaction(metadata: CollectionMetadata): Transaction {
	const tx = new Transaction();

	// Convert strings to byte arrays for Move
	const nameBytes = Array.from(new TextEncoder().encode(metadata.name));
	const descriptionBytes = Array.from(new TextEncoder().encode(metadata.description));
	const categoryBytes = Array.from(new TextEncoder().encode(metadata.category));
	const tagsBytes = metadata.tags.map(tag => Array.from(new TextEncoder().encode(tag)));
	const coverImageBlobIdsBytes = metadata.coverImageBlobIds.map(id => Array.from(new TextEncoder().encode(id)));
	const blobIdsBytes = metadata.blobIds.map(id => Array.from(new TextEncoder().encode(id)));
	const fileNamesBytes = metadata.fileNames.map(name => Array.from(new TextEncoder().encode(name)));
	const contentTypesBytes = metadata.contentTypes.map(type => Array.from(new TextEncoder().encode(type)));
	const encryptionKeyHashBytes = Array.from(new TextEncoder().encode(metadata.encryptionKeyHash));

	tx.moveCall({
		target: `${PACKAGE_ID}::collection::create_collection`,
		arguments: [
			tx.pure.vector('u8', nameBytes),
			tx.pure.vector('u8', descriptionBytes),
			tx.pure.vector('u8', categoryBytes),
			tx.pure.vector('vector<u8>', tagsBytes),
			tx.pure.vector('vector<u8>', coverImageBlobIdsBytes),
			tx.pure.vector('vector<u8>', blobIdsBytes),
			tx.pure.vector('vector<u8>', fileNamesBytes),
			tx.pure.vector('vector<u8>', contentTypesBytes),
			tx.pure.vector('u64', metadata.fileSizes),
			tx.pure.vector('bool', metadata.isEncryptedFlags),
			tx.pure.u8(metadata.visibility),
			tx.pure.u64(metadata.price),
			tx.pure.bool(metadata.isEncrypted),
			tx.pure.vector('u8', encryptionKeyHashBytes),
		],
	});

	return tx;
}

/**
 * Create a collection with an existing access policy (Phase 2 for Seal encryption)
 * Used after files have been encrypted with Seal
 */
export function createCollectionWithPolicyTransaction(
	metadata: CollectionMetadata,
	policyId: string
): Transaction {
	const tx = new Transaction();

	// Convert strings to byte arrays for Move
	const nameBytes = Array.from(new TextEncoder().encode(metadata.name));
	const descriptionBytes = Array.from(new TextEncoder().encode(metadata.description));
	const categoryBytes = Array.from(new TextEncoder().encode(metadata.category));
	const tagsBytes = metadata.tags.map(tag => Array.from(new TextEncoder().encode(tag)));
	const coverImageBlobIdsBytes = metadata.coverImageBlobIds.map(id => Array.from(new TextEncoder().encode(id)));
	const blobIdsBytes = metadata.blobIds.map(id => Array.from(new TextEncoder().encode(id)));
	const fileNamesBytes = metadata.fileNames.map(name => Array.from(new TextEncoder().encode(name)));
	const contentTypesBytes = metadata.contentTypes.map(type => Array.from(new TextEncoder().encode(type)));
	const encryptionKeyHashBytes = Array.from(new TextEncoder().encode(metadata.encryptionKeyHash));

	tx.moveCall({
		target: `${PACKAGE_ID}::collection::create_collection_with_policy`,
		arguments: [
			tx.pure.vector('u8', nameBytes),
			tx.pure.vector('u8', descriptionBytes),
			tx.pure.vector('u8', categoryBytes),
			tx.pure.vector('vector<u8>', tagsBytes),
			tx.pure.vector('vector<u8>', coverImageBlobIdsBytes),
			tx.pure.vector('vector<u8>', blobIdsBytes),
			tx.pure.vector('vector<u8>', fileNamesBytes),
			tx.pure.vector('vector<u8>', contentTypesBytes),
			tx.pure.vector('u64', metadata.fileSizes),
			tx.pure.vector('bool', metadata.isEncryptedFlags),
			tx.pure.u8(metadata.visibility),
			tx.pure.u64(metadata.price),
			tx.pure.bool(metadata.isEncrypted),
			tx.pure.vector('u8', encryptionKeyHashBytes),
			tx.object(policyId), // Reference to the access policy
		],
	});

	return tx;
}

/**
 * Create a transaction to tip a creator
 */
export function createTipTransaction(
	collectionId: string,
	platformConfigId: string,
	amountSui: number,
	senderAddress: string
): Transaction {
	const tx = new Transaction();
	const amountMist = suiToMist(amountSui);

	// Get a coin object to split for the tip
	const [tipCoin] = tx.splitCoins(tx.gas, [amountMist]);

	tx.moveCall({
		target: `${PACKAGE_ID}::collection::tip_creator`,
		arguments: [
			tx.object(collectionId),
			tx.object(platformConfigId),
			tipCoin,
		],
	});

	return tx;
}

/**
 * Query all collections from the blockchain using events
 */
export async function queryAllCollections(): Promise<any[]> {
	try {
		// Query CollectionCreated events
		const events = await suiClient.queryEvents({
			query: {
				MoveEventType: `${PACKAGE_ID}::collection::CollectionCreated`,
			},
			limit: 50, // Get last 50 collections
		});

		// Extract collection IDs from events
		const collectionIds = events.data.map((event: any) => event.parsedJson.collection_id);

		// Fetch full collection data for each ID
		const rawCollections = await Promise.all(
			collectionIds.map((id: string) => getCollectionById(id))
		);

		// Parse and filter out null results, and then filter by visibility
		const collections = rawCollections
			.map(parseCollectionData)
			.filter(c => c !== null && c.visibility !== 'private' && c.visibility !== 'unlisted');

		return collections;
	} catch (error) {
		console.error('Error querying collections:', error);
		return [];
	}
}


/**
 * Query access tokens owned by a user
 */
export async function queryUserAccessTokens(ownerAddress: string): Promise<any[]> {
	try {
		const response = await suiClient.getOwnedObjects({
			owner: ownerAddress,
			filter: {
				StructType: `${PACKAGE_ID}::collection::AccessToken`,
			},
			options: {
				showContent: true,
			},
		});

		return response.data.map(item => item.data?.content) || [];
	} catch (error) {
		console.error('Error querying access tokens:', error);
		return [];
	}
}

/**
 * Get collection details by ID
 */
export async function getCollectionById(collectionId: string): Promise<any | null> {
	try {
		const response = await suiClient.getObject({
			id: collectionId,
			options: {
				showContent: true,
				showDisplay: true,
			},
		});

		// Return the full data object so we can access objectId
		if (!response.data) return null;

		return response.data;
	} catch (error) {
		console.error('Error getting collection:', error);
		return null;
	}
}

/**
 * Convert MIST to SUI (1 SUI = 1,000,000,000 MIST)
 */
export function mistToSui(mist: number): number {
	return mist / 1_000_000_000;
}

/**
 * Convert SUI to MIST
 */
export function suiToMist(sui: number): number {
	return Math.floor(sui * 1_000_000_000);
}

/**
 * Convert blockchain collection to app format
 */
export function parseCollectionData(blockchainData: any): CollectionData | null {
	if (!blockchainData) return null;

	const fields = blockchainData.content?.fields || blockchainData.fields;
	if (!fields) return null;

	// Convert byte arrays to strings
	const decoder = new TextDecoder();
	const name = Array.isArray(fields.name) ? decoder.decode(new Uint8Array(fields.name)) : fields.name;
	const description = Array.isArray(fields.description) ? decoder.decode(new Uint8Array(fields.description)) : fields.description;
	const category = Array.isArray(fields.category) ? decoder.decode(new Uint8Array(fields.category)) : fields.category || '';
	const tags = (fields.tags || []).map((tag: any) =>
		Array.isArray(tag) ? decoder.decode(new Uint8Array(tag)) : tag
	);
	const coverImageBlobIds = (fields.cover_image_blob_ids || []).map((id: any) =>
		Array.isArray(id) ? decoder.decode(new Uint8Array(id)) : id
	);

	// Parse files
	const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

	const files = (fields.files || []).map((fileRef: any, index: number) => {
		// File data is nested under 'fields' property
		const fileFields = fileRef.fields || fileRef;

		const blobId = Array.isArray(fileFields.blob_id)
			? decoder.decode(new Uint8Array(fileFields.blob_id))
			: fileFields.blob_id || '';
		const fileName = Array.isArray(fileFields.name)
			? decoder.decode(new Uint8Array(fileFields.name))
			: fileFields.name || 'Unknown';
		const contentType = Array.isArray(fileFields.content_type)
			? decoder.decode(new Uint8Array(fileFields.content_type))
			: fileFields.content_type || 'application/octet-stream';
		const sizeBytes = Number(fileFields.size_bytes || 0);

		// Determine file type
		let fileType = 'other';
		if (contentType && typeof contentType === 'string') {
			if (contentType.startsWith('image/')) fileType = 'image';
			else if (contentType.startsWith('video/')) fileType = 'video';
			else if (contentType === 'application/pdf') fileType = 'pdf';
		}

		// Construct Walrus URL from blob ID
		const walrusUrl = blobId ? `${aggregatorUrl}/v1/blobs/${blobId}` : '';

		return {
			id: `${blockchainData.objectId || blockchainData.id}-file-${index}`,
			name: fileName,
			type: fileType,
			contentType: contentType,
			url: walrusUrl,
			thumbnailUrl: walrusUrl, // Same URL for now, can optimize later
			blobId: blobId,
			size: sizeBytes,
			isEncrypted: fileFields.is_encrypted || false,
		};
	});

	// Map visibility
	const visibilityMap: Record<number, string> = {
		0: 'public',
		1: 'private',
		2: 'pay-to-see',
		3: 'unlisted',
	};

	// Extract the object ID - try multiple possible locations
	const objectId = blockchainData.objectId
		|| blockchainData.data?.objectId
		|| blockchainData.content?.objectId
		|| (typeof blockchainData.id === 'string' ? blockchainData.id : null);

	if (!objectId) {
		console.error('Could not extract object ID from collection data:', blockchainData);
		return null;
	}

	// Extract access policy ID
	// It's returned as a direct string from the blockchain
	const accessPolicyId = fields.access_policy_id || undefined;

	return {
		id: objectId,
		name,
		description,
		category,
		tags,
		coverImageBlobIds,
		owner: fields.owner,
		createdAt: Number(fields.created_at || 0),
		purchaseCount: Number(fields.purchase_count || 0),
		tipCount: Number(fields.tip_count || 0),
		visibility: visibilityMap[fields.visibility] as CollectionVisibility || 'public',
		price: fields.price ? mistToSui(fields.price) : undefined,
		totalEarnings: mistToSui(fields.total_earnings || 0),
		totalTips: mistToSui(fields.total_tips || 0),
		isEncrypted: fields.is_encrypted || false,
		encryptionKeyHash: Array.isArray(fields.encryption_key_hash) ? decoder.decode(new Uint8Array(fields.encryption_key_hash)) : fields.encryption_key_hash || undefined,
		accessPolicyId,
		isDeleted: fields.is_deleted || false,
		files,
	};
}


export function createStandaloneAccessPolicyTransaction(): Transaction {
	const tx = new Transaction();

	tx.moveCall({
		target: `${PACKAGE_ID}::access_policy::create_standalone_policy`,
		arguments: [],
	});

	return tx;
}

