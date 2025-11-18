// src/lib/walrusService.ts



// Using HTTP API for Walrus uploads/downloads to avoid signer complexity
//
//

/**
 * Configuration for Walrus storage operations
 */
export const WALRUS_CONFIG = {
	// Default epochs (1 epoch ≈ 24 hours on testnet)
	DEFAULT_EPOCHS: 5,
	// Maximum file size in bytes (2GB)
	MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024,
	// Maximum collection size in bytes (10GB)
	MAX_COLLECTION_SIZE: 10 * 1024 * 1024 * 1024,
};

/**
 * Convert days to Walrus epochs
 * 1 epoch ≈ 24 hours on testnet
 */
export function daysToEpochs(days: number): number {
	if (days === 0) {
		// "Never" - use a large number of epochs (e.g., ~10 years)
		return 3650;
	}
	return Math.max(1, Math.ceil(days));
}

/**
 * Result of uploading a single file to Walrus
 */
export interface WalrusUploadResult {
	blobId: string;
	fileName: string;
	fileSize: number;
	contentType: string;
	success: boolean;
	error?: string;
}

/**
 * Progress callback for upload operations
 */
export type UploadProgressCallback = (progress: {
	currentFile: number;
	totalFiles: number;
	fileName: string;
	percentage: number;
}) => void;

/**
 * Upload a single file to Walrus using HTTP API or Upload Relay
 * @param file - The file to upload
 * @param epochs - Number of epochs to store the file
 * @param account - Connected wallet account (for mainnet payment)
 * @param deletable - Whether the blob should be deletable
 * @returns Upload result with blob ID
 */
export async function uploadFileToWalrus(
	file: File,
	epochs: number,
	deletable: boolean = true,
	ownerAddress?: string,
): Promise<WalrusUploadResult> {
	try {
		// Validate file size
		if (file.size > WALRUS_CONFIG.MAX_FILE_SIZE) {
			throw new Error(`File size exceeds maximum allowed size of 2GB`);
		}

		const publisherUrl = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';


		const url = new URL(`${publisherUrl}/v1/blobs`)
		url.searchParams.set("epochs", epochs.toString())
		url.searchParams.set("deletable", deletable.toString())
		if (ownerAddress) {
			url.searchParams.set("send_object_to", ownerAddress)
		}

		const response = await fetch(
			url,
			{
				method: 'PUT',
				body: file,
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Walrus upload failed: ${response.status} - ${errorText}`);
		}

		const result = await response.json();

		// Parse response (can be either newlyCreated or alreadyCertified)
		let blobId: string;

		if (result.newlyCreated) {
			blobId = result.newlyCreated.blobObject.blobId;
		} else if (result.alreadyCertified) {
			blobId = result.alreadyCertified.blobId;
		} else {
			throw new Error('Unexpected response format from Walrus');
		}


		return {
			blobId,
			fileName: file.name,
			fileSize: file.size,
			contentType: file.type || 'application/octet-stream',
			success: true,
		};
	} catch (error) {
		console.error('Error uploading file to Walrus:', error);
		return {
			blobId: '',
			fileName: file.name,
			fileSize: file.size,
			contentType: file.type || 'application/octet-stream',
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
		};
	}
}

/**
 * Upload multiple files to Walrus as a collection
 * @param files - Array of files to upload
 * @param epochs - Number of epochs to store the files
 * @param account - Connected wallet account
 * @param deletable - Whether blobs should be deletable
 * @param onProgress - Optional callback for progress updates
 * @returns Array of upload results
 */
export async function uploadCollectionToWalrus(
	files: File[],
	epochs: number,
	deletable: boolean = true,
	ownerAddress: string,
	onProgress?: UploadProgressCallback
): Promise<WalrusUploadResult[]> {
	// Validate total collection size
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	if (totalSize > WALRUS_CONFIG.MAX_COLLECTION_SIZE) {
		throw new Error(`Collection size exceeds maximum allowed size of 10GB`);
	}

	const results: WalrusUploadResult[] = [];

	// Upload files sequentially to track progress properly
	for (let i = 0; i < files.length; i++) {
		const file = files[i];

		// Report progress
		if (onProgress) {
			onProgress({
				currentFile: i + 1,
				totalFiles: files.length,
				fileName: file.name,
				percentage: Math.round(((i + 1) / files.length) * 100),
			});
		}

		// Upload the file
		const result = await uploadFileToWalrus(file, epochs, deletable, ownerAddress);
		results.push(result);

		// If upload failed, we could choose to continue or abort
		if (!result.success) {
			throw new Error(result.error)
		}

	}

	return results;
}

/**
 * Download a file from Walrus by blob ID using HTTP API
 * @param blobId - The blob ID to download
 * @returns File data as Uint8Array
 */
export async function downloadFileFromWalrus(blobId: string): Promise<Uint8Array> {
	try {
		// Get aggregator URL from environment
		const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

		// Download using HTTP GET request
		const response = await fetch(`${aggregatorUrl}/v1/${blobId}`);

		if (!response.ok) {
			throw new Error(`Walrus download failed: ${response.status}`);
		}

		// Convert response to Uint8Array
		const arrayBuffer = await response.arrayBuffer();
		return new Uint8Array(arrayBuffer);
	} catch (error) {
		console.error('Error downloading file from Walrus:', error);
		throw error;
	}
}

