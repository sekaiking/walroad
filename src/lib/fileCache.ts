/**
 * File Cache Utility for Bunker
 *
 * Caches decrypted files in IndexedDB to avoid repeated wallet signatures
 * and decryption delays. Cache entries expire after 24 hours.
 */

const DB_NAME = 'bunker-file-cache';
const DB_VERSION = 1;
const STORE_NAME = 'decrypted-files';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CacheEntry {
	collectionId: string;
	fileId: string;
	accessPolicyId: string;
	userAddress: string;
	blobData: Blob;
	contentType: string;
	fileName: string;
	timestamp: number;
	expiresAt: number;
	size: number;
}

interface CacheKey {
	collectionId: string;
	fileId: string;
	userAddress: string;
}

/**
 * Initialize the IndexedDB database
 */
async function initDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error('Failed to open IndexedDB:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// Create object store if it doesn't exist
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });

				// Create indexes for efficient lookups
				store.createIndex('collectionId', 'collectionId', { unique: false });
				store.createIndex('fileId', 'fileId', { unique: false });
				store.createIndex('expiresAt', 'expiresAt', { unique: false });
				store.createIndex('lookup', ['collectionId', 'fileId', 'userAddress'], { unique: false });
			}
		};
	});
}

/**
 * Get a cached file if it exists and hasn't expired
 */
export async function getCachedFile(
	collectionId: string,
	fileId: string,
	userAddress: string
): Promise<Blob | null> {
	try {
		const db = await initDB();
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('lookup');

		return new Promise((resolve, reject) => {
			const request = index.get([collectionId, fileId, userAddress]);

			request.onsuccess = () => {
				const entry = request.result as CacheEntry | undefined;

				if (!entry) {
					resolve(null);
					return;
				}

				// Check if expired
				if (entry.expiresAt < Date.now()) {
					// Delete expired entry
					deleteEntry(db, entry);
					resolve(null);
					return;
				}

				resolve(entry.blobData);
			};

			request.onerror = () => {
				console.error('Error reading from cache:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Failed to get cached file:', error);
		return null;
	}
}

/**
 * Store a decrypted file in the cache
 */
export async function setCachedFile(entry: Omit<CacheEntry, 'id'>): Promise<boolean> {
	try {
		const db = await initDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.add(entry);

			request.onsuccess = () => {
				resolve(true);
			};

			request.onerror = () => {
				console.error('Error caching file:', request.error);

				// Handle quota exceeded error
				if (request.error?.name === 'QuotaExceededError') {
					console.warn('Cache quota exceeded, clearing old entries');
					clearOldestEntries(db, 5).then(() => {
						// Retry after clearing space
						store.add(entry);
					});
				}

				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Failed to cache file:', error);
		return false;
	}
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
	try {
		const db = await initDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('expiresAt');

		const now = Date.now();
		let deletedCount = 0;

		return new Promise((resolve, reject) => {
			const request = index.openCursor(IDBKeyRange.upperBound(now));

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

				if (cursor) {
					cursor.delete();
					deletedCount++;
					cursor.continue();
				} else {
					if (deletedCount > 0) {
					}
					resolve(deletedCount);
				}
			};

			request.onerror = () => {
				console.error('Error clearing expired cache:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Failed to clear expired cache:', error);
		return 0;
	}
}

/**
 * Delete a specific cache entry
 */
async function deleteEntry(db: IDBDatabase, entry: CacheEntry & { id?: number }): Promise<void> {
	if (!entry.id) return;

	const transaction = db.transaction(STORE_NAME, 'readwrite');
	const store = transaction.objectStore(STORE_NAME);
	store.delete(entry.id);
}

/**
 * Clear oldest cache entries to free up space
 */
async function clearOldestEntries(db: IDBDatabase, count: number): Promise<void> {
	const transaction = db.transaction(STORE_NAME, 'readwrite');
	const store = transaction.objectStore(STORE_NAME);
	const index = store.index('timestamp');

	return new Promise((resolve, reject) => {
		const request = index.openCursor();
		let deleted = 0;

		request.onsuccess = (event) => {
			const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

			if (cursor && deleted < count) {
				cursor.delete();
				deleted++;
				cursor.continue();
			} else {
				resolve();
			}
		};

		request.onerror = () => {
			console.error('Error clearing oldest entries:', request.error);
			reject(request.error);
		};
	});
}

/**
 * Clear all cache entries for a specific collection
 */
export async function clearCollectionCache(collectionId: string): Promise<number> {
	try {
		const db = await initDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('collectionId');

		let deletedCount = 0;

		return new Promise((resolve, reject) => {
			const request = index.openCursor(IDBKeyRange.only(collectionId));

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

				if (cursor) {
					cursor.delete();
					deletedCount++;
					cursor.continue();
				} else {
					resolve(deletedCount);
				}
			};

			request.onerror = () => {
				console.error('Error clearing collection cache:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Failed to clear collection cache:', error);
		return 0;
	}
}

/**
 * Get total cache size in bytes
 */
export async function getCacheSize(): Promise<number> {
	try {
		const db = await initDB();
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.getAll();

			request.onsuccess = () => {
				const entries = request.result as CacheEntry[];
				const totalSize = entries.reduce((sum, entry) => sum + (entry.size || 0), 0);
				resolve(totalSize);
			};

			request.onerror = () => {
				console.error('Error calculating cache size:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Failed to get cache size:', error);
		return 0;
	}
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
	try {
		const db = await initDB();
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.clear();

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				console.error('Error clearing all cache:', request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('Failed to clear all cache:', error);
	}
}

/**
 * Check if IndexedDB is available (graceful fallback)
 */
export function isCacheAvailable(): boolean {
	return typeof indexedDB !== 'undefined';
}
