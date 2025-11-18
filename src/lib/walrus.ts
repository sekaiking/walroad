// src/lib/walrus.ts
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { getFullnodeUrl } from '@mysten/sui/client';
import { walrus } from '@mysten/walrus';

/**
 * Get Walrus configuration from environment variables
 */
export const getWalrusConfig = () => {
	const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';
	const uploadRelayUrl = process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL;
	const uploadRelayTipMax = process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_TIP_MAX
		? parseInt(process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_TIP_MAX)
		: 1_000;

	return {
		network,
		publisherUrl: process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL,
		aggregatorUrl: process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL,
		uploadRelay: uploadRelayUrl
			? {
				host: uploadRelayUrl,
				sendTip: { max: uploadRelayTipMax },
			}
			: undefined,
	};
};

/**
 * Creates a Sui client extended with Walrus functionality
 * Configured based on environment variables
 */
export function createWalrusClient() {
	const config = getWalrusConfig();

	// Create base Sui client
	const baseClient = new SuiJsonRpcClient({
		url: getFullnodeUrl(config.network),
		network: config.network,
	});

	// Prepare Walrus options
	const walrusOptions: any = {};

	// Add upload relay if configured
	if (config.uploadRelay) {
		walrusOptions.uploadRelay = config.uploadRelay;
	}

	// Extend with Walrus functionality
	const client = baseClient.$extend(walrus(walrusOptions));

	return client;
}

// Export a singleton instance for use across the app
// Only initialize on client-side to avoid SSR issues with WASM
export const walrusClient = typeof window !== 'undefined' ? createWalrusClient() : null;
