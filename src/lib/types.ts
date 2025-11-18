// Type definitions for Bunker collections

// Visibility types for collections
export type CollectionVisibility = 'public' | 'private' | 'pay-to-see' | 'unlisted';

// The single source of truth for a Collection's structure
export interface CollectionData {
	id: string;
	name: string;
	description?: string;
	category?: string;
	tags?: string[];
	coverImageBlobIds: string[];
	owner: string;
	createdAt: number;
	purchaseCount: number;
	tipCount: number;

	// Visibility and monetization
	visibility: CollectionVisibility;
	price?: number; // Price in SUI for pay-to-see collections
	totalEarnings: number; // Total SUI earned from tips + access fees
	totalTips: number;
	isEncrypted: boolean; // Whether files are encrypted
	encryptionKeyHash?: string; // Hash of the encrypted key for accessing files
	accessPolicyId?: string; // Seal access policy object ID for encrypted collections
	isDeleted: boolean; // Soft delete flag from contract

	files: {
		id: string;
		name: string;
		type: 'image' | 'video' | 'pdf' | 'other';
		contentType: string;
		url: string; // Walrus blob URL
		thumbnailUrl: string;
		blobId?: string; // Walrus blob ID for the actual file
		size: number;
		isEncrypted: boolean;
	}[];
}
