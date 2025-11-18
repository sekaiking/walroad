"use client";

import { useState, useEffect } from 'react';
import { CollectionData } from '@/lib/types';
import { FaDownload, FaTimes, FaExpand, FaCompress, FaFileAlt, FaFilePdf, FaFileArchive, FaFile, FaSpinner } from 'react-icons/fa';
import { downloadFileFromWalrus } from '@/lib/walrusService';

// File type from CollectionData
type CollectionFile = CollectionData['files'][number];

interface FilePreviewModalProps {
	file: CollectionFile | null;
	onClose: () => void;
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [fileUrl, setFileUrl] = useState<string>('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string>('');


	useEffect(() => {
		if (!file) {
			setFileUrl('');
			return;
		}

		let revokedUrl: string | null = null;

		const load = async () => {
			if (file.blobId) {
				setIsLoading(true);
				setError('');

				try {
					const bytes = await downloadFileFromWalrus(file.blobId);
					const blob = new Blob([new Uint8Array(bytes)], {
						type: file.name.endsWith('.mp4')
							? 'video/mp4'
							: 'application/octet-stream',
					});
					const url = URL.createObjectURL(blob);
					revokedUrl = url;
					setFileUrl(url);
				} catch (err) {
					console.error('Error loading file from Walrus:', err);
					setError('Failed to load file from Walrus');

					// fallback
					if (file.url) setFileUrl(file.url);
				} finally {
					setIsLoading(false);
				}
			} else if (file.url) {
				setFileUrl(file.url);
			}
		};

		load();

		return () => {
			if (revokedUrl) URL.revokeObjectURL(revokedUrl);
		};
	}, [file]);

	if (!file) return null;

	const handleDownload = async () => {
		if (!fileUrl) {
			alert('File not loaded yet');
			return;
		}

		// Download the file
		const link = document.createElement('a');
		link.href = fileUrl;
		link.download = file.name;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const getFileIcon = () => {
		switch (file.type) {
			case 'pdf':
				return <FaFilePdf className="text-red-400" size={48} />;
			case 'other':
				if (file.name.endsWith('.zip') || file.name.endsWith('.rar')) {
					return <FaFileArchive className="text-yellow-400" size={48} />;
				}
				if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
					return <FaFileAlt className="text-blue-400" size={48} />;
				}
				return <FaFile className="text-gray-400" size={48} />;
			default:
				return <FaFile className="text-gray-400" size={48} />;
		}
	};

	const renderContent = () => {
		// Show loading state
		if (isLoading) {
			return (
				<div className="flex flex-col items-center justify-center h-[60vh]">
					<FaSpinner className="text-purple-400 animate-spin" size={48} />
					<p className="text-gray-400 mt-4">Loading file from Walrus...</p>
				</div>
			);
		}

		// Show error state
		if (error && !fileUrl) {
			return (
				<div className="flex flex-col items-center justify-center h-[60vh]">
					<p className="text-red-400 mb-4">{error}</p>
					<button
						onClick={onClose}
						className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
					>
						Close
					</button>
				</div>
			);
		}

		// Show file content
		switch (file.type) {
			case 'image':
				return (
					<div className="flex items-center justify-center h-full">
						<img
							src={fileUrl}
							alt={file.name}
							className={`${isFullscreen ? 'w-full h-full object-contain' : 'max-h-[70vh] max-w-full'} object-contain rounded-lg`}
						/>
					</div>
				);
			case 'video':
				return (
					<div className="flex items-center justify-center h-full">
						<video
							src={fileUrl}
							controls
							autoPlay
							className={`${isFullscreen ? 'w-full h-full' : 'max-h-[70vh] max-w-full'} rounded-lg`}
						/>
					</div>
				);
			case 'pdf':
				return (
					<div className="w-full h-[80vh] bg-gray-900 rounded-lg overflow-hidden">
						<iframe
							src={fileUrl}
							className="w-full h-full"
							title={file.name}
						/>
					</div>
				);
			default:
				return (
					<div className="flex flex-col items-center justify-center text-white bg-[#12141c] border border-gray-800 p-12 rounded-xl h-[60vh]">
						{getFileIcon()}
						<h3 className="text-xl font-semibold mt-6 mb-2">{file.name}</h3>
						<p className="text-gray-400 mb-2">Preview not available for this file type</p>
						<p className="text-sm text-gray-500 mb-8">Click download to view this file</p>
						<button
							onClick={handleDownload}
							className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors"
						>
							<FaDownload />
							<span>Download File</span>
						</button>
					</div>
				);
		}
	};

	return (
		<div
			className={`fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 ${isFullscreen ? 'p-0' : 'p-4'
				}`}
			onClick={onClose}
		>
			<div
				className={`relative ${isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl'
					}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
					<div className="text-white">
						<h3 className="font-semibold text-lg truncate max-w-md">{file.name}</h3>
						<p className="text-sm text-gray-400">
							{file.type.toUpperCase()}
							{file.blobId && ` • ${file.blobId.slice(0, 8)}...`}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{/* Fullscreen Toggle (only for images and videos) */}
						{(file.type === 'image' || file.type === 'video') && (
							<button
								onClick={() => setIsFullscreen(!isFullscreen)}
								className="text-white bg-black/50 hover:bg-black/70 rounded-lg p-3 transition-colors"
								title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
							>
								{isFullscreen ? <FaCompress size={18} /> : <FaExpand size={18} />}
							</button>
						)}
						{/* Download Button */}
						<button
							onClick={handleDownload}
							className="text-white bg-black/50 hover:bg-black/70 rounded-lg p-3 transition-colors"
							title="Download file"
						>
							<FaDownload size={18} />
						</button>
						{/* Close Button */}
						<button
							onClick={onClose}
							className="text-white bg-black/50 hover:bg-black/70 rounded-lg p-3 transition-colors"
							title="Close"
						>
							<FaTimes size={18} />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className={`${isFullscreen ? 'h-full' : 'mt-20'}`}>
					{renderContent()}
				</div>

				{/* Footer Info (only when not fullscreen) */}
				{!isFullscreen && file.type !== 'pdf' && (
					<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
						<div className="flex items-center justify-between text-white text-sm">
							<div className="flex items-center gap-4">
								{file.isEncrypted && (
									<span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
										🔒 Encrypted
									</span>
								)}
							</div>
							<button
								onClick={handleDownload}
								className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
							>
								<FaDownload size={14} />
								<span>Download</span>
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
