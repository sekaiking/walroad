"use client";

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { FaImages, FaUpload, FaTimes, FaCheckCircle, FaExclamationCircle, FaLock, FaGlobe, FaCoins, FaLink, FaImage, FaExclamationTriangle, } from 'react-icons/fa';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { uploadCollectionToWalrus, daysToEpochs, } from '@/lib/walrusService';
import { encryptWithSeal } from '@/lib/sealService';
import { createCollectionWithPolicyTransaction, createCollectionTransaction, VISIBILITY, suiToMist, createStandaloneAccessPolicyTransaction, CollectionMetadata } from '@/lib/suiContract';
import type { CollectionVisibility } from '@/lib/types';
import { walrusClient } from '@/lib/walrus';
import { useToast } from '@/lib/toast';

const EXPIRY_OPTIONS = [
	{ value: 7, label: '7 Days' },
	{ value: 30, label: '30 Days' },
	{ value: 180, label: '180 Days' },
];

type UploadStep = 'config' | 'uploading' | 'success' | 'error';

// A consistent style for all form inputs.
const formInputStyle = "w-full bg-[#2a2d3e] text-white rounded-lg px-4 py-2 border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors";

export function CreateProductForm() {
	const currentAccount = useCurrentAccount();
	const { mutateAsync: signAndExecuteTransaction, } = useSignAndExecuteTransaction();
	const toast = useToast();

	// Product Details
	const [productName, setProductName] = useState('');
	const [description, setDescription] = useState('');
	const [visibility, setVisibility] = useState<CollectionVisibility>('public');
	const [price, setPrice] = useState('1.0');
	const [expiry, setExpiry] = useState(30);

	const [coverImages, setCoverImages] = useState<File[]>([]);
	const [coverImagePreviews, setCoverImagePreviews] = useState<string[]>([]);
	const [productFiles, setProductFiles] = useState<File[]>([]);
	const [productFilePreviews, setProductFilePreviews] = useState<string[]>([]);

	const [uploadStep, setUploadStep] = useState<UploadStep>('config');
	const [uploadProgress, setUploadProgress] = useState(0);
	const [currentAction, setCurrentAction] = useState('');
	const [errorMessage, setErrorMessage] = useState('');

	const onCoverDrop = useCallback((acceptedFiles: File[]) => {
		setCoverImages(prev => [...prev, ...acceptedFiles]);
		const newPreviews = acceptedFiles.map(file => URL.createObjectURL(file));
		setCoverImagePreviews(prev => [...prev, ...newPreviews]);
	}, []);

	const { getRootProps: getCoverRootProps, getInputProps: getCoverInputProps, isDragActive: isCoverDragActive } = useDropzone({
		onDrop: onCoverDrop,
		accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
		multiple: true,
	});

	const onProductFilesDrop = useCallback((acceptedFiles: File[]) => {
		setProductFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
		const newPreviews = acceptedFiles.map(file => (file.type.startsWith('image/') ? URL.createObjectURL(file) : '/file-icon.svg'));
		setProductFilePreviews(prev => [...prev, ...newPreviews]);
	}, []);

	const { getRootProps: getFilesRootProps, getInputProps: getFilesInputProps, isDragActive: isFilesDragActive } = useDropzone({ onDrop: onProductFilesDrop });

	useEffect(() => {
		return () => {
			coverImagePreviews.forEach(URL.revokeObjectURL);
			productFilePreviews.forEach(url => { if (url !== '/file-icon.svg') URL.revokeObjectURL(url) });
		};
	}, [coverImagePreviews, productFilePreviews]);

	const removeCoverImage = (index: number) => {
		setCoverImages(prev => prev.filter((_, i) => i !== index));
		setCoverImagePreviews(prev => {
			URL.revokeObjectURL(prev[index]);
			return prev.filter((_, i) => i !== index);
		});
	};

	const removeProductFile = (index: number) => {
		setProductFiles(prev => prev.filter((_, i) => i !== index));
		setProductFilePreviews(prev => {
			const toRevoke = prev[index];
			if (toRevoke && toRevoke !== '/file-icon.svg') URL.revokeObjectURL(toRevoke);
			return prev.filter((_, i) => i !== index);
		});
	};

	const handlePublishProduct = async () => {
		if (!productName.trim()) return toast.warning('Please enter a product name');
		if (coverImages.length === 0) return toast.warning('Please upload at least one cover image');
		if (productFiles.length === 0) return toast.warning('Please add at least one product file');
		if (!currentAccount) return toast.warning('Please connect your wallet first');

		setUploadStep('uploading');
		setUploadProgress(0);
		setErrorMessage('');

		try {
			const isPaid = visibility === 'pay-to-see' || visibility === 'unlisted';
			const shouldEncrypt = isPaid || visibility === 'private';
			const epochs = daysToEpochs(expiry);
			const packageId = process.env.NEXT_PUBLIC_COLLECTION_PACKAGE_ID || '';
			let accessPolicyId = '';

			setCurrentAction('Optimizing cover images...');
			setUploadProgress(5);
			const optimizedCoverImages = await Promise.all(
				coverImages.map(file => optimizeImage(file))
			);

			setCurrentAction('Uploading cover images...');
			setUploadProgress(10);
			const coverUploadResults = await uploadCollectionToWalrus(optimizedCoverImages, epochs, true, currentAccount.address);
			const coverImageBlobIds = coverUploadResults.map(r => r.blobId);

			let filesToUpload = productFiles;
			if (shouldEncrypt) {
				setCurrentAction('Creating access policy...');
				setUploadProgress(15);
				const policyTx = createStandaloneAccessPolicyTransaction();
				const policyResult = await signAndExecuteTransaction({ transaction: policyTx });
				const { effects } = await walrusClient!.waitForTransaction({ digest: policyResult.digest, options: { showEffects: true } });

				// Find the created CollectionAccessPolicy object (not just any shared object)
				const policyObject = effects?.created?.find((obj: any) => {
					const objectType = obj.owner?.Shared?.initial_shared_version !== undefined;
					const isPolicy = obj.reference?.objectId && objectType;
					return isPolicy;
				});

				if (!policyObject?.reference?.objectId) {
					throw new Error('Failed to create access policy. No policy object found in transaction.');
				}

				accessPolicyId = policyObject.reference.objectId;
				console.log('Created access policy:', accessPolicyId);

				setCurrentAction('Encrypting product files...');
				setUploadProgress(30);
				filesToUpload = await Promise.all(productFiles.map(async file => {
					const encryptedBlob = await encryptWithSeal(new Uint8Array(await file.arrayBuffer()), packageId, accessPolicyId);
					return new File([encryptedBlob as any], `${file.name}.enc`, { type: 'application/octet-stream' });
				}));
			}

			setCurrentAction('Uploading product files...');
			setUploadProgress(50);
			const productFileResults = await uploadCollectionToWalrus(filesToUpload, epochs, true, currentAccount.address, p => setUploadProgress(50 + (p.percentage * 0.45)));

			setCurrentAction('Publishing to the blockchain...');
			setUploadProgress(95);
			const metadata: CollectionMetadata = {
				name: productName,
				description: description || '',
				category: '', // Add a default empty string for now
				tags: [], // Add a default empty array for now
				coverImageBlobIds,
				blobIds: productFileResults.map(r => r.blobId),
				fileNames: productFiles.map(f => f.name),
				contentTypes: productFiles.map(f => f.type),
				fileSizes: productFiles.map(f => f.size),
				isEncryptedFlags: productFiles.map(() => shouldEncrypt), // All product files will have the same encryption flag
				visibility: { 'public': VISIBILITY.PUBLIC, 'private': VISIBILITY.PRIVATE, 'pay-to-see': VISIBILITY.PAY_TO_SEE, 'unlisted': VISIBILITY.UNLISTED }[visibility],
				price: isPaid ? suiToMist(parseFloat(price)) : 0,
				isEncrypted: shouldEncrypt,
				encryptionKeyHash: shouldEncrypt ? accessPolicyId.substring(0, 32) : '',
			};
			const tx = shouldEncrypt ? createCollectionWithPolicyTransaction(metadata, accessPolicyId) : createCollectionTransaction(metadata);
			await signAndExecuteTransaction({ transaction: tx }, { onSuccess: () => { setUploadProgress(100); setUploadStep('success'); }, onError: (err) => { throw err; } });

		} catch (error) {
			setUploadStep('error');
			setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
		}
	};

	const resetForm = () => { /* ... reset logic ... */ };
	if (uploadStep === 'uploading') return <UploadingState progress={uploadProgress} action={currentAction} />;
	if (uploadStep === 'success') return <SuccessState productName={productName} onReset={resetForm} />;
	if (uploadStep === 'error') return <ErrorState message={errorMessage} onTryAgain={() => setUploadStep('config')} />;

	return (
		<div className="bg-[#12141c] p-6 sm:p-8 rounded-xl border border-gray-800 shadow-lg w-full">
			<div className="space-y-8">
				<FormSection title="Product Details">
					<Input label="Product Name *" id="productName" value={productName} onChange={(e: any) => setProductName(e.target.value)} placeholder="e.g., Ultimate Icon Pack" />
					<Textarea label="Description" id="description" value={description} onChange={(e: any) => setDescription(e.target.value)} placeholder="Describe what makes your product special..." />
				</FormSection>

				<FormSection title="Cover Images *">
					<div {...getCoverRootProps()} className={`relative flex justify-center items-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isCoverDragActive ? 'border-purple-500' : 'border-gray-600 hover:border-gray-500'}`}>
						<input {...getCoverInputProps()} />
						<DropzonePlaceholder icon={FaImage} text="Drop your cover images here, or click to select." />
					</div>
					{coverImagePreviews.length > 0 && (
						<div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
							{coverImagePreviews.map((preview, i) => (
								<div key={i} className="relative group aspect-square">
									<img src={preview} alt={`Cover preview ${i + 1}`} className="w-full h-full object-cover rounded-md" />
									<button onClick={() => removeCoverImage(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<FaTimes size={12} />
									</button>
								</div>
							))}
						</div>
					)}
				</FormSection>

				<FormSection title="Product Files *">
					<div {...getFilesRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isFilesDragActive ? 'border-purple-500' : 'border-gray-600 hover:border-gray-500'}`}>
						<input {...getFilesInputProps()} />
						<DropzonePlaceholder icon={FaImages} text="Drop the files you're selling here." />
					</div>
					{productFiles.length > 0 && (
						<div className="mt-4"><h3 className="text-white text-sm font-semibold mb-2">Uploaded Files ({productFiles.length})</h3><ul className="space-y-2">{productFiles.map((file, i) => <li key={i} className="flex items-center justify-between bg-gray-900/50 p-2 rounded-md text-sm"><span className="truncate">{file.name}</span><button onClick={() => removeProductFile(i)} className="ml-2 text-gray-500 hover:text-red-400"><FaTimes /></button></li>)}</ul></div>
					)}
				</FormSection>

				<FormSection title="Pricing & Access">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<VisibilityOption icon={FaGlobe} label="Free" description="Publicly available to everyone." visibilityType="public" current={visibility} set={setVisibility} />
						<VisibilityOption icon={FaCoins} label="Public (Paid)" description="Visible in the marketplace, requires payment." visibilityType="pay-to-see" current={visibility} set={setVisibility} />
						<VisibilityOption icon={FaLink} label="Unlisted (Paid)" description="Requires payment via a direct link." visibilityType="unlisted" current={visibility} set={setVisibility} />
						<VisibilityOption icon={FaLock} label="Private" description="Only you can see and access this file." visibilityType="private" current={visibility} set={setVisibility} />
					</div>
					{(visibility === 'pay-to-see' || visibility === 'unlisted') && (
						<div className="mt-4"><Input label="Price (SUI) *" type="number" id="price" value={price} onChange={(e: any) => setPrice(e.target.value)} min="0.1" step="0.1" /></div>
					)}
					<div className="mt-4"><label className="block text-sm font-medium text-gray-300 mb-2">Storage Duration</label><div className="flex flex-wrap gap-2">{EXPIRY_OPTIONS.map(opt => <button key={opt.value} onClick={() => setExpiry(opt.value)} className={`px-3 py-1.5 text-sm rounded-md ${expiry === opt.value ? 'bg-purple-600 text-white font-semibold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{opt.label}</button>)}</div></div>
					<InfoNotice visibility={visibility} price={price} />
				</FormSection>
			</div>
			<div className="mt-8 border-t border-gray-700 pt-6">
				<button onClick={handlePublishProduct} disabled={!currentAccount || productFiles.length === 0 || !productName.trim() || coverImages.length === 0} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"><FaUpload /> Publish Product</button>
				{!currentAccount && <p className="text-center text-sm text-yellow-400 mt-4">Please connect your wallet to publish.</p>}
			</div>
		</div>
	);
}

// Reusable Components for Form Structure & States
const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
	<div><h2 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 mb-4">{title}</h2><div className="space-y-4">{children}</div></div>
);

const Input = ({ label, ...props }: any) => (
	<div><label htmlFor={props.id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label><input {...props} className={formInputStyle} /></div>
);
const Textarea = ({ label, ...props }: any) => (
	<div><label htmlFor={props.id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label><textarea {...props} className={formInputStyle} /></div>
);
const DropzonePlaceholder = ({ icon: Icon, text }: any) => (
	<div className="text-center text-gray-400"><Icon className="mx-auto text-3xl text-gray-500 mb-2" /><p className="text-sm">{text}</p></div>
);

const InfoNotice = ({ visibility, price }: { visibility: CollectionVisibility, price: string }) => {
	const isPaid = visibility === 'pay-to-see' || visibility === 'unlisted';
	const isEncrypted = isPaid || visibility === 'private';

	let encryptionMessage;
	if (isPaid) encryptionMessage = "Files will be encrypted with Seal. Users who purchase will automatically gain access.";
	else if (visibility === 'private') encryptionMessage = "Files will be encrypted with Seal. Only you will be able to decrypt them with your wallet.";
	else encryptionMessage = "Files will not be encrypted and are publicly accessible to anyone with the link.";

	return (
		<div className="mt-4 space-y-3">
			<div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg flex items-start gap-2.5">
				<FaLock className="text-blue-400 mt-0.5 flex-shrink-0" size={14} />
				<p className="text-sm text-blue-300">{encryptionMessage}</p>
			</div>
			{isEncrypted && (
				<div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-2.5">
					<FaExclamationTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={14} />
					<p className="text-sm text-yellow-300">
						Product metadata (name, description, cover image) is always public on the blockchain. Only the product files are encrypted.
					</p>
				</div>
			)}
			{isPaid && (
				<div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-2.5">
					<FaCoins className="text-yellow-400 mt-0.5 flex-shrink-0" size={14} />
					<p className="text-sm text-yellow-300">A 2.5% platform fee will be applied to the {price || '0'} SUI sale price.</p>
				</div>
			)}
		</div>
	)
}

const VisibilityOption = ({ icon: Icon, label, description, visibilityType, current, set }: any) => (
	<button type="button" onClick={() => set(visibilityType)} className={`flex items-start text-left gap-3 p-3 rounded-lg border-2 transition-all h-full ${current === visibilityType ? 'border-purple-500 bg-purple-900/30' : 'border-gray-700 bg-gray-900/30 hover:border-gray-600'}`}>
		<Icon className={`mt-1 flex-shrink-0 text-lg ${current === visibilityType ? 'text-purple-400' : 'text-gray-400'}`} />
		<div>
			<h3 className={`font-semibold text-sm mb-1 ${current === visibilityType ? 'text-white' : 'text-gray-300'}`}>{label}</h3>
			<p className="text-xs text-gray-500">{description}</p>
		</div>
	</button>
);

// Sub-components for different states and UI elements
const UploadingState = ({ progress, action }: { progress: number, action: string }) => (
	<div className="text-center p-8 bg-[#12141c] rounded-xl border border-gray-800">
		<h2 className="text-xl font-bold text-white mb-2">Publishing Your Product...</h2>
		<p className="text-sm text-gray-400 mb-4">{action}</p>
		<div className="w-full bg-gray-700 rounded-full h-2.5">
			<div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
		</div>
		<p className="text-lg font-semibold mt-2">{Math.round(progress)}%</p>
	</div>
);

const SuccessState = ({ productName, onReset }: { productName: string, onReset: () => void }) => (
	<div className="text-center p-8 bg-[#12141c] rounded-xl border border-green-700">
		<FaCheckCircle className="mx-auto text-5xl text-green-400 mb-4" />
		<h2 className="text-2xl font-bold text-white mb-2">Product Published!</h2>
		<p className="text-gray-400 mb-6">Your product &quot;{productName}&quot; has been successfully published.</p>
		<div className="flex gap-4">
			<button onClick={onReset} className="flex-1 bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Create Another Product</button>
			<Link href="/dashboard" className="flex-1 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 text-center">View Dashboard</Link>
		</div>
	</div>
);

const ErrorState = ({ message, onTryAgain }: { message: string, onTryAgain: () => void }) => (
	<div className="text-center p-8 bg-[#12141c] rounded-xl border border-red-700">
		<FaExclamationCircle className="mx-auto text-5xl text-red-400 mb-4" />
		<h2 className="text-2xl font-bold text-white mb-2">Publish Failed</h2>
		<p className="text-red-300 bg-red-900/30 p-3 rounded-md text-sm mb-6">{message}</p>
		<button onClick={onTryAgain} className="w-full bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">Try Again</button>
	</div>
);

// Helper function to optimize images
const optimizeImage = async (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (event: any) => {
			const img = new Image();
			img.src = event.target.result;
			img.onload = () => {
				const canvas = document.createElement('canvas');
				let width = img.width;
				let height = img.height;

				if (width > maxWidth) {
					height = Math.round((height * maxWidth) / width);
					width = maxWidth;
				}

				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext('2d');
				ctx?.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (blob) {
							const optimizedFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
							resolve(optimizedFile);
						} else {
							resolve(file); // Fallback to original file if blob creation fails
						}
					},
					file.type,
					quality
				);
			};
		};
		reader.readAsDataURL(file);
	});
};

