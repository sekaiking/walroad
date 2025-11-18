"use client";

import { useState } from 'react';
import { FaTimes, FaLock, FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import type { CollectionData } from '@/lib/types';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { suiToMist } from '@/lib/suiContract';

interface PaymentModalProps {
	collection: CollectionData;
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

export function PaymentModal({ collection, isOpen, onClose, onSuccess }: PaymentModalProps) {
	const account = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
	const [errorMessage, setErrorMessage] = useState('');

	if (!isOpen) return null;

	const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
	const coverImageUrl = collection.coverImageBlobIds?.[0]
		? `${aggregatorUrl}/v1/blobs/${collection.coverImageBlobIds[0]}`
		: `https://placehold.co/400x300/1e1e2c/FFFFFF/png?text=${encodeURIComponent(collection.name)}`;

	const handlePurchase = async () => {
		if (!account) {
			setErrorMessage('Please connect your wallet first');
			return;
		}

		if (!collection.price || collection.price <= 0) {
			setErrorMessage('Invalid collection price');
			return;
		}

		setPaymentStatus('processing');
		setErrorMessage('');

		try {
			const packageId = process.env.NEXT_PUBLIC_COLLECTION_PACKAGE_ID;
			const platformConfigId = process.env.NEXT_PUBLIC_PLATFORM_CONFIG_ID;

			if (!packageId || !platformConfigId) {
				throw new Error('Platform configuration missing. Please contact support.');
			}

			const tx = new Transaction();
			tx.setSender(account.address);

			// Convert SUI price to MIST
			const priceInMist = suiToMist(collection.price);

			// Split coins for payment
			const [paymentCoin] = tx.splitCoins(tx.gas, [priceInMist]);

			// Call the appropriate purchase function based on encryption
			if (collection.isEncrypted && collection.accessPolicyId) {
				// Purchase encrypted collection
				tx.moveCall({
					target: `${packageId}::collection::purchase_access_encrypted`,
					arguments: [
						tx.object(collection.id),
						tx.object(collection.accessPolicyId),
						tx.object(platformConfigId),
						paymentCoin,
					],
				});
			} else {
				// Purchase non-encrypted collection
				tx.moveCall({
					target: `${packageId}::collection::purchase_access`,
					arguments: [
						tx.object(collection.id),
						tx.object(platformConfigId),
						paymentCoin,
					],
				});
			}

			// Execute the transaction
			const result = await signAndExecuteTransaction({
				transaction: tx,
			});

			console.log('Purchase transaction successful:', result.digest);

			setPaymentStatus('success');
			setTimeout(() => {
				onSuccess();
				handleClose();
			}, 800);
		} catch (error) {
			setPaymentStatus('error');
			setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	};

	const handleClose = () => {
		// Reset state when closing
		setPaymentStatus('idle');
		setErrorMessage('');
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
			<div className="bg-[#12141c] rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-800">
					<h2 className="text-xl font-bold text-white">Unlock Collection</h2>
					<button
						onClick={handleClose}
						disabled={paymentStatus === 'processing'}
						className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<FaTimes size={20} />
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{paymentStatus === 'idle' && (
						<>
							{/* Collection Info */}
							<div className="bg-gray-900/50 rounded-lg overflow-hidden">
								{/* Cover Image */}
								<img
									src={coverImageUrl}
									alt={collection.name}
									className="w-full aspect-[16/9] object-cover"
								/>

								{/* Collection Details */}
								<div className="p-4 space-y-2">
									<h3 className="text-white font-semibold text-lg">{collection.name}</h3>
									{collection.description && (
										<p className="text-sm text-gray-400 line-clamp-2">
											{collection.description}
										</p>
									)}
									<div className="flex items-center gap-2 text-xs text-gray-500">
										<span>{collection.files.length} files</span>
									</div>
								</div>
							</div>

							{/* What's Included */}
							<div className="space-y-2">
								<h4 className="text-sm font-semibold text-gray-300">What&apos;s included:</h4>
								<ul className="space-y-2">
									<li className="flex items-start gap-2 text-sm text-gray-400">
										<FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={14} />
										<span>Lifetime access to {collection.files.length} files</span>
									</li>
									<li className="flex items-start gap-2 text-sm text-gray-400">
										<FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={14} />
										<span>High-quality downloads</span>
									</li>
									<li className="flex items-start gap-2 text-sm text-gray-400">
										<FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" size={14} />
										<span>Support the creator</span>
									</li>
									{collection.isEncrypted && (
										<li className="flex items-start gap-2 text-sm text-gray-400">
											<FaLock className="text-blue-400 mt-0.5 flex-shrink-0" size={14} />
											<span>Encrypted content - your access only</span>
										</li>
									)}
								</ul>
							</div>

							{/* Price Breakdown */}
							<div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4 space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">Creator receives</span>
									<span className="text-white">{((collection.price ?? 0) * 0.975).toFixed(3)} SUI</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">Platform Fee (2.5%)</span>
									<span className="text-white">{((collection.price ?? 0) * 0.025).toFixed(3)} SUI</span>
								</div>
								<div className="border-t border-purple-700/30 pt-2 mt-2 flex justify-between">
									<span className="text-white font-semibold">Total</span>
									<span className="text-purple-400 font-bold text-lg">
										{collection.price?.toFixed(2) || '0.00'} SUI
									</span>
								</div>
							</div>

							{/* Purchase Button */}
							<button
								onClick={handlePurchase}
								className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
							>
								<FaLock size={16} />
								<span>Purchase Access</span>
							</button>

							<p className="text-xs text-center text-gray-500">
								By purchasing, you agree to our Terms of Service and Privacy Policy
							</p>
						</>
					)}

					{paymentStatus === 'processing' && (
						<div className="py-8 text-center space-y-4">
							<div className="flex justify-center">
								<FaSpinner className="text-purple-400 animate-spin" size={48} />
							</div>
							<div>
								<h3 className="text-white font-semibold text-lg mb-2">Processing Payment...</h3>
								<p className="text-gray-400 text-sm">
									Please confirm the transaction in your wallet
								</p>
							</div>
							<div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
								<p className="text-sm text-blue-300">
									Do not close this window. Your transaction is being confirmed on the Sui network.
								</p>
							</div>
						</div>
					)}

					{paymentStatus === 'success' && (
						<div className="py-12 text-center">
							<FaCheckCircle className="text-green-400 mx-auto mb-3" size={48} />
							<h3 className="text-white font-semibold text-lg">Success!</h3>
							<p className="text-gray-400 text-sm mt-2">Unlocking collection...</p>
						</div>
					)}

					{paymentStatus === 'error' && (
						<div className="py-8 text-center space-y-4">
							<div className="flex justify-center">
								<div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center">
									<FaExclamationCircle className="text-red-400" size={40} />
								</div>
							</div>
							<div>
								<h3 className="text-white font-semibold text-lg mb-2">Payment Failed</h3>
								<p className="text-gray-400 text-sm">{errorMessage}</p>
							</div>
							<div className="space-y-2">
								<button
									onClick={handlePurchase}
									className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200"
								>
									Try Again
								</button>
								<button
									onClick={handleClose}
									className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200"
								>
									Cancel
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
