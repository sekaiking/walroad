import { SealClient, SessionKey } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { fromHex, toHex } from '@mysten/sui/utils';

// Testnet key server object IDs (these need to be configured per environment)
const TESTNET_KEY_SERVERS = [
	{ objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 },
	{ objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', weight: 1 },
	{ objectId: '0x6068c0acb197dddbacd4746a9de7f025b2ed5a5b6c1b1ab44dade4426d141da2', weight: 1 },
];

// FIX: Replace with actual key server IDs https://seal-docs.wal.app/Pricing/#mainnet
const MAINNET_KEY_SERVERS = [
	{ objectId: '0x...', weight: 1 },
];

/**
 * Initialize Seal client for encryption/decryption
 * Note: This requires valid key server object IDs to be configured
 */
export function createSealClient(network: 'testnet' | 'mainnet' = 'testnet'): SealClient {
	const suiClient = new SuiClient({
		url: getFullnodeUrl(network)
	});

	const serverConfigs = network === 'mainnet' ? MAINNET_KEY_SERVERS : TESTNET_KEY_SERVERS;

	const client = new SealClient({
		suiClient,
		serverConfigs,
		verifyKeyServers: false,
	});

	return client;
}

/**
 * Encrypt file data using Seal
 * @param data - File data as Uint8Array
 * @param packageId - Smart contract package ID
 * @param accessPolicyId - On-chain access policy object ID
 * @param threshold - Number of key servers required for decryption (default: 2)
 * @returns Encrypted data as Uint8Array
 */
export async function encryptWithSeal(
	data: Uint8Array,
	packageId: string,
	accessPolicyId: string,
	threshold: number = 2
): Promise<Uint8Array> {
	const client = createSealClient();

	// Use the access policy ID directly as the encryption ID
	// No nonce needed - all files for this policy share the same ID
	const accessPolicyBytes = fromHex(accessPolicyId);
	const id = toHex(accessPolicyBytes); // Same as accessPolicyId

	const { encryptedObject } = await client.encrypt({
		threshold,
		packageId,
		id,
		data,
	});

	return encryptedObject;
}

/**
 * Decrypt file data using Seal with wallet session
 * @param encryptedData - Encrypted data as Uint8Array
 * @param sessionKey - User's session key derived from wallet
 * @param txBytes - Transaction bytes for verification
 * @returns Decrypted data as Uint8Array
 */
export async function decryptWithSeal(
	encryptedData: Uint8Array,
	sessionKey: SessionKey,
	txBytes: Uint8Array
): Promise<Uint8Array> {
	const client = createSealClient();

	const decryptedData = await client.decrypt({
		data: encryptedData,
		sessionKey,
		txBytes,
	});

	return decryptedData;
}


/**
 * Decrypt a file downloaded from Walrus
 * @param encryptedBlob - Encrypted blob from Walrus
 * @param sessionKey - User's session key
 * @param txBytes - Transaction bytes
 * @param originalContentType - Original file content type
 * @returns Decrypted file as Blob
 */
export async function decryptFile(
	encryptedBlob: Blob,
	sessionKey: SessionKey,
	txBytes: Uint8Array,
	originalContentType: string = 'application/octet-stream'
): Promise<Blob> {
	// Read blob as Uint8Array
	const arrayBuffer = await encryptedBlob.arrayBuffer();
	const encryptedData = new Uint8Array(arrayBuffer);

	// Decrypt with Seal
	const decryptedData = new Uint8Array(await decryptWithSeal(encryptedData, sessionKey, txBytes));

	// Return as Blob with original content type
	return new Blob([decryptedData], { type: originalContentType });
}

