"use client";

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignPersonalMessage, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import { FaDownload, FaLock, FaSpinner, FaFileArchive, FaMusic, FaFilePdf, FaVideo, FaImage, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { CollectionData } from '@/lib/types';
import { decryptFile } from '@/lib/sealService';
import { suiClient, createTipTransaction, queryUserAccessTokens } from '@/lib/suiContract';
import { getCachedFile, setCachedFile, isCacheAvailable } from '@/lib/fileCache';
import { SessionKey } from '@mysten/seal';
import { useToast } from '@/lib/toast';
import { PaymentModal } from './PaymentModal'; // Assuming payment modal is used
import { truncateAddress } from '@/lib/utils';
import { FaCoins } from 'react-icons/fa';
import { Input } from './Input';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import { PurchaseAccessButton } from './PurchaseAccessButton';

// A clear, reusable style for the main call-to-action button
const ctaButtonStyle = "w-full text-center font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2";

export function ProductDisplay({ product }: { product: CollectionData }) {
	const account = useCurrentAccount();
	const { mutate: signPersonalMessage } = useSignPersonalMessage();
	const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	const toast = useToast();

	const [hasAccess, setHasAccess] = useState(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});
	const [isDecrypting, setIsDecrypting] = useState(false);
	const [decryptError, setDecryptError] = useState('');
	const [tipAmount, setTipAmount] = useState('1');
	const [isTipping, setIsTipping] = useState(false);
	const [isAccessLoading, setIsAccessLoading] = useState(true);

	const isOwner = account?.address === product.owner;
	const isPaidProduct = product.visibility === 'pay-to-see' || product.visibility === 'unlisted';
	const canAccessContent = isOwner || !isPaidProduct || hasAccess;
	const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

	// Setup keen-slider for multiple cover images
	const [currentSlide, setCurrentSlide] = useState(0);
	const [loaded, setLoaded] = useState(false);
	const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
		loop: true,
		slides: {
			perView: 1,
			spacing: 0,
		},
		initial: 0,
		slideChanged(slider) {
			setCurrentSlide(slider.track.details.rel);
		},
		created() {
			setLoaded(true);
		},
	});

	const coverImageUrls = product.coverImageBlobIds && product.coverImageBlobIds.length > 0
		? product.coverImageBlobIds.map(blobId => `${aggregatorUrl}/v1/blobs/${blobId}`)
		: [`https://placehold.co/800x600/1e1e2c/FFFFFF/png?text=${encodeURIComponent(product.name)}`];

	// Check if user has purchased access
	useEffect(() => {
		const checkAccess = async () => {
			if (!account || !isPaidProduct || isOwner) {
				setIsAccessLoading(false);
				return;
			}

			try {
				const accessTokens = await queryUserAccessTokens(account.address);
				const hasToken = accessTokens.some((token: any) => {
					const fields = token?.fields;
					return fields?.collection_id === product.id;
				});
				setHasAccess(hasToken);
			} catch (error) {
				console.error('Error checking access:', error);
			} finally {
				setIsAccessLoading(false);
			}
		};

		checkAccess();
	}, [account, product.id, isPaidProduct, isOwner]);

	const handleTipCreator = () => {
		if (!account) {
			toast.error('Please connect your wallet to tip.');
			return;
		}
		if (parseFloat(tipAmount) <= 0) {
			toast.error('Tip amount must be greater than 0.');
			return;
		}

		setIsTipping(true);

		try {
			const platformConfigId = process.env.NEXT_PUBLIC_PLATFORM_CONFIG_ID;
			if (!platformConfigId) {
				throw new Error('Platform config ID not set.');
			}

			const tx = createTipTransaction(
				product.id,
				platformConfigId,
				parseFloat(tipAmount),
				account.address
			);

			signAndExecuteTransaction(
				{
					transaction: tx,
				},
				{
					onSuccess: () => {
						toast.success(`Successfully tipped ${tipAmount} SUI to ${truncateAddress(product.owner)}!`);
						setTipAmount('1'); // Reset tip amount
						setIsTipping(false);
					},
					onError: (error) => {
						toast.error(`Failed to send tip: ${error.message}`);
						setIsTipping(false);
					},
				}
			);
		} catch (error) {
			console.error('Error creating tip transaction:', error);
			toast.error(`Failed to prepare tip: ${(error as Error).message}`);
			setIsTipping(false);
		}
	};

	// Re-using your robust decryption logic within the new UI flow
	const handleDecryptFiles = useCallback(async () => {
		if (!account || !product.isEncrypted || isDecrypting) return;

		setIsDecrypting(true);
		setDecryptError('');
		toast.info("Preparing to decrypt... Please check your wallet for a signature request.");

		try {
			// This logic is adapted directly from your original `autoDecryptFiles` function
			const cacheAvailable = isCacheAvailable();
			let filesToDecrypt = product.files.filter(f => f.isEncrypted && f.url);

			// First, try loading from cache to speed things up
			const newUrlsFromCache: Record<string, string> = {};
			if (cacheAvailable) {
				const uncachedFiles = [];
				for (const file of filesToDecrypt) {
					const cachedBlob = await getCachedFile(product.id, file.id, account.address);
					if (cachedBlob) {
						newUrlsFromCache[file.id] = URL.createObjectURL(cachedBlob);
					} else {
						uncachedFiles.push(file);
					}
				}
				if (Object.keys(newUrlsFromCache).length > 0) {
					setDecryptedUrls(prev => ({ ...prev, ...newUrlsFromCache }));
				}
				filesToDecrypt = uncachedFiles;
			}

			if (filesToDecrypt.length === 0) {
				toast.success("Files loaded from cache!");
				setIsDecrypting(false);
				return;
			}

			const packageId = process.env.NEXT_PUBLIC_COLLECTION_PACKAGE_ID || '';
			const policyId = product.accessPolicyId;
			if (!packageId || !policyId) throw new Error("Product is missing required configuration for decryption.");

			const sessionKey = await SessionKey.create({ address: account.address, packageId, ttlMin: 15, suiClient });

			const personalMessage = sessionKey.getPersonalMessage();
							signPersonalMessage({ message: personalMessage }, {
								onSuccess: async ({ signature }: { signature: any }) => {
									try {
										await sessionKey.setPersonalMessageSignature(signature);
										toast.info("Approving access on-chain...");
				
										const tx = new Transaction();
										tx.setSender(account.address);
										tx.moveCall({ target: `${packageId}::access_policy::seal_approve`, arguments: [tx.pure.vector('u8', Array.from(fromHex(policyId))), tx.object(policyId)] });
										const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
										toast.success("On-chain access approved!");
	
						toast.info(`Processing ${filesToDecrypt.length} file(s)...`);
						const newlyDecryptedUrls: Record<string, string> = {};
						for (const file of filesToDecrypt) {
							const response = await fetch(file.url!);
							const encryptedBlob = await response.blob();
							const decryptedBlob = await decryptFile(encryptedBlob, sessionKey, txBytes, file.type);
							const blobUrl = URL.createObjectURL(decryptedBlob);
							newlyDecryptedUrls[file.id] = blobUrl;
	
							if (cacheAvailable) {
								await setCachedFile({ collectionId: product.id, fileId: file.id, accessPolicyId: policyId, userAddress: account.address, blobData: decryptedBlob, contentType: file.contentType || file.type, fileName: file.name, timestamp: Date.now(), expiresAt: Date.now() + (24 * 60 * 60 * 1000), size: decryptedBlob.size })
							}
						}
						setDecryptedUrls(prev => ({ ...prev, ...newlyDecryptedUrls }));
						toast.success("Decryption complete! Your files are ready.");
					} catch (error) {
						const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during decryption.";
						setDecryptError(errorMessage);
						toast.error(errorMessage);
					} finally {
						setIsDecrypting(false);
					}
				},
				onError: (err: any) => {
					toast.error(`Wallet signature failed: ${err.message}`);
					setIsDecrypting(false); // Ensure decryption state is reset on error
				}
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during decryption.";
			setDecryptError(errorMessage);
			toast.error(errorMessage);
			setIsDecrypting(false);
		}
	}, [account, product, isDecrypting, signPersonalMessage, toast]);

	const handlePurchaseSuccess = () => {
		setHasAccess(true);
		setIsPaymentModalOpen(false);
		toast.success("Purchase successful! You now have access to the files.");
	};

	// Main Call-to-Action button logic
	const CtaButton = () => {
		if (canAccessContent) {
			if (product.isEncrypted) {
				const allDecrypted = product.files.filter(f => f.isEncrypted).every(f => !!decryptedUrls[f.id]);
				if (allDecrypted) return <div className={`${ctaButtonStyle} bg-green-600`}><FaCheckCircle /> All Files Ready</div>;
				return <button onClick={handleDecryptFiles} disabled={isDecrypting} className={`${ctaButtonStyle} bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600`}><div className="flex items-center justify-center gap-2">{isDecrypting ? <><FaSpinner className="animate-spin" /> Decrypting...</> : <><FaLock /> Access & Decrypt Files</>}</div></button>;
			}
			return null;
		}
		if (isPaidProduct) {
			return <button onClick={() => setIsPaymentModalOpen(true)} className={`${ctaButtonStyle} bg-purple-600 hover:bg-purple-700`}>Buy Now for {product.price?.toFixed(2) || '0.00'} SUI</button>;
		}
		return <button className={`${ctaButtonStyle} bg-gray-600 cursor-not-allowed`}><FaLock /> Private</button>;
	};

	useEffect(() => {
		return () => { Object.values(decryptedUrls).forEach(URL.revokeObjectURL) };
	}, [decryptedUrls]);

	return (
		<>
			<PaymentModal collection={product} isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onSuccess={handlePurchaseSuccess} />
			<div className="w-full bg-[#12141c] p-6 sm:p-8 rounded-xl border border-gray-800 grid grid-cols-1 lg:grid-cols-5 gap-8">
				{/* Left side: Cover Image Slider */}
				<div className="lg:col-span-3">
					<div className="relative group">
						<div ref={sliderRef} className="keen-slider rounded-lg overflow-hidden shadow-lg shadow-black/30">
							{coverImageUrls.map((url, index) => (
								<div key={index} className="keen-slider__slide">
									<img src={url} alt={`${product.name} - Image ${index + 1}`} className="w-full aspect-[4/3] object-cover" />
								</div>
							))}
						</div>

						{/* Navigation Arrows - only show if more than 1 image */}
						{loaded && instanceRef.current && coverImageUrls.length > 1 && (
							<>
								<button
									onClick={(e) => {
										e.stopPropagation();
										instanceRef.current?.prev();
									}}
									className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
									aria-label="Previous image"
								>
									<FaChevronLeft className="w-5 h-5" />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										instanceRef.current?.next();
									}}
									className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-sm"
									aria-label="Next image"
								>
									<FaChevronRight className="w-5 h-5" />
								</button>
							</>
						)}

						{/* Image Counter - only show if more than 1 image */}
						{coverImageUrls.length > 1 && (
							<div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium">
								{currentSlide + 1} / {coverImageUrls.length}
							</div>
						)}

						{/* Dot Indicators - only show if more than 1 image */}
						{loaded && instanceRef.current && coverImageUrls.length > 1 && (
							<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
								{coverImageUrls.map((_, idx) => (
									<button
										key={idx}
										onClick={() => instanceRef.current?.moveToIdx(idx)}
										className={`w-2 h-2 rounded-full transition-all duration-200 ${
											currentSlide === idx
												? 'bg-white w-6'
												: 'bg-white/50 hover:bg-white/75'
										}`}
										aria-label={`Go to image ${idx + 1}`}
									/>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Right side: Product Details & CTA */}
				<div className="lg:col-span-2 flex flex-col space-y-4">
					<div>
						<h1 className="text-3xl font-bold text-white">{product.name}</h1>
						<p className="text-sm text-gray-400 mt-2">by <span className="font-mono">{product.owner.slice(0, 6)}...{product.owner.slice(-4)}</span></p>
					</div>
					{product.description && <p className="text-gray-300 text-sm flex-grow">{product.description}</p>}

					<div className="border-t border-gray-700 pt-4 space-y-4">
						<div className="flex justify-between items-center">
							<span className="text-lg font-medium text-gray-300">Price</span>
							<span className="text-2xl font-bold text-yellow-400">{isPaidProduct ? `${product.price?.toFixed(2) || '0.00'} SUI` : 'Free'}</span>
						</div>
						<CtaButton />
						{isOwner && <p className="text-center text-xs text-green-400 font-semibold bg-green-900/20 py-2 rounded-md">You are the owner of this product.</p>}
					</div>
					<div className="text-xs text-gray-500 text-center"></div>
				</div>

				<div className="lg:col-span-5 border-t border-gray-700 pt-6 mt-6">
					<h2 className="text-xl font-semibold text-white mb-4">What&apos;s Included ({product.files.length})</h2>
					<ul className="space-y-3">
						{product.files.map(file => <FileListItem key={file.id} file={file} decryptedUrl={decryptedUrls[file.id]} isEncrypted={product.isEncrypted} />)}
					</ul>
					{decryptError && <p className="text-red-400 text-sm mt-4 text-center">Error: {decryptError}</p>}
				</div>

				{!isOwner && canAccessContent && (
					<section className="lg:col-span-5 mt-4 bg-gradient-to-r from-gray-900 to-[#1a1d26] p-6 sm:p-8 rounded-xl border border-gray-800/60 shadow-inner relative overflow-hidden group">

						{/* Decorative background glow */}
						<div className="absolute top-0 right-0 w-64 h-64 bg-purple-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

						<div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

							{/* Text Section */}
							<div className="space-y-1 max-w-md">
								<h2 className="text-xl font-bold text-white flex items-center gap-2">
									<FaCoins className="text-yellow-400" />
									Support the Creator
								</h2>
								<p className="text-sm text-gray-400">
									If you enjoy this content, consider sending a tip directly to the creator's wallet.
								</p>
							</div>

							<div className="flex flex-col items-end gap-3 w-full sm:w-auto">

								<div className="flex flex-col sm:flex-row gap-3 w-full">

									<div className="flex gap-2 h-full mt-auto">
										{[1, 5, 10].map((amt) => (
											<button
												key={amt}
												onClick={() => setTipAmount(amt.toString())}
												className="text-xs h-8 font-medium bg-gray-800 hover:bg-purple-900/30 hover:text-purple-300 border border-gray-700 text-gray-300 py-1.5 px-3 rounded-md transition-all"
											>
												{amt} SUI
											</button>
										))}
									</div>

									{/* Input & Action */}
									<div className="flex items-end gap-2 w-full sm:w-auto">
										<Input
											label="Amount (SUI)"
											placeholder="Amount"
											id="tipAmount"
											type="number"
											value={tipAmount}
											onChange={(e: any) => setTipAmount(e.target.value)}
											min="0.01"
											step="0.01"
											className="w-32 h-8 bg-gray-800 hover:bg-purple-900/30 hover:text-purple-300 border border-gray-700 text-gray-300 px-3 rounded-md transition-all"
										/>
										<button
											onClick={handleTipCreator}
											disabled={isTipping || !account || parseFloat(tipAmount) <= 0}
											className="h-8 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 rounded-lg shadow-lg shadow-purple-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
										>
											{isTipping ? <FaSpinner className="animate-spin" /> : "Send Tip"}
										</button>
									</div>
								</div>

								{/* Wallet Warning */}
								{!account && (
									<p className="text-xs text-amber-400 bg-amber-900/10 px-2 py-1 rounded border border-amber-900/30">
										Please connect wallet to tip.
									</p>
								)}
							</div>
						</div>
					</section>
				)}
			</div>
		</>
	);
}

// Sub-component for rendering each file in the list
const FileListItem = ({ file, decryptedUrl, isEncrypted }: { file: CollectionData['files'][number], decryptedUrl?: string, isEncrypted: boolean }) => {
	const getFileIcon = (contentType: string = "") => {
		if (contentType.startsWith('image')) return <FaImage className="text-purple-400" />;
		if (contentType.startsWith('video')) return <FaVideo className="text-blue-400" />;
		if (contentType.startsWith('audio')) return <FaMusic className="text-green-400" />;
		if (contentType === 'application/pdf') return <FaFilePdf className="text-red-400" />;
		return <FaFileArchive className="text-yellow-400" />;
	};
	const isReadyForDownload = !isEncrypted || !!decryptedUrl;

	return (
		<li className="flex justify-between items-center bg-[#1e1e2c]/60 p-3 rounded-lg border border-gray-700">
			<div className="flex items-center gap-3 overflow-hidden">
				{getFileIcon(file.contentType)}
				<span className="font-medium text-white truncate">{file.name.replace('.enc', '')}</span>
				<span className="text-sm text-gray-500 flex-shrink-0">({((file as any).size / 1024 / 1024).toFixed(2)} MB)</span>
			</div>
			{isReadyForDownload ?
				<a href={decryptedUrl || file.url} download={file.name.replace('.enc', '')} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700 transition-colors flex-shrink-0"><FaDownload />Download</a> :
				<div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 flex-shrink-0"><FaLock /> Encrypted</div>
			}
		</li>
	);
};

const FaCheckCircle = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
