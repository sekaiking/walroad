import Link from 'next/link';
import { CollectionData } from '@/lib/types';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';

export function DashboardProductRow({ product }: { product: CollectionData }) {
	const representativeThumbnail = product.files[0]?.thumbnailUrl || `https://placehold.co/100x100/1e1e2c/FFFFFF/png?text=${product.name[0]}`;

	const price = product.price ?? 0;
	const salesCount = price > 0 ? Math.floor(product.totalEarnings / price) : 0;

	return (
		<tr className="border-b border-gray-800 hover:bg-gray-900/50">
			{/* Product Info */}
			<td className="px-6 py-4">
				<div className="flex items-center gap-3">
					<img src={representativeThumbnail} alt={product.name} className="w-12 h-12 rounded-md object-cover flex-shrink-0" />
					<div className="font-medium text-white truncate max-w-xs">
						{product.name}
					</div>
				</div>
			</td>

			{/* Status */}
			<td className="px-6 py-4">
				{product.isDeleted ? (
					<span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-900/50 text-red-400">
						Deleted
					</span>
				) : (
					<span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-900/50 text-green-400">
						Active
					</span>
				)}
			</td>

			{/* Price */}
			<td className="px-6 py-4 text-center font-medium text-gray-300">
				{price > 0 ? `${price.toFixed(2)} SUI` : 'Free'}
			</td>

			{/* Sales */}
			<td className="px-6 py-4 text-center font-semibold text-white">
				{salesCount}
			</td>

			{/* Revenue */}
			<td className="px-6 py-4 text-right font-bold text-green-400">
				{product.totalEarnings.toFixed(2)} SUI
			</td>

			{/* Actions */}
			<td className="px-6 py-4">
				<div className="flex justify-center items-center gap-2">
					<Link href={`/product/${product.id}`} className="p-2 text-gray-400 hover:text-blue-400" title="View"><FaEye /></Link>
					<button className="p-2 text-gray-400 hover:text-purple-400" title="Edit"><FaEdit /></button>
					<button className="p-2 text-gray-400 hover:text-red-500" title="Delete"><FaTrash /></button>
				</div>
			</td>
		</tr>
	);
}
