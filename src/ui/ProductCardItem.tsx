import Link from 'next/link';
import { CollectionData, CollectionVisibility } from '@/lib/types';
import { FaCoins, FaEye, FaDatabase } from 'react-icons/fa';

const ProductBadge = ({ visibility }: { visibility: CollectionVisibility }) => {
	if (visibility !== 'pay-to-see') {
		return null;
	}
	return (
		<div className="absolute top-3 right-3 bg-yellow-900/60 backdrop-blur-sm text-yellow-300 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-yellow-500/30">
			<FaCoins />
			Premium
		</div>
	);
};

const truncateAddress = (address: string) => {
	if (!address) return '';
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

interface ProductCardItemProps {
	collection: CollectionData;
}

const PriceDisplay = ({ product }: { product: CollectionData }) => {
	if (product.visibility === 'pay-to-see' && product.price !== undefined && product.price !== null) {
		return <span className="text-xl font-bold text-yellow-400">{product.price} SUI</span>;
	}
	return <span className="text-xl font-bold text-green-400">Free</span>;
};


export function ProductCardItem({ collection: product }: ProductCardItemProps) {
	const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';
	const representativeThumbnail = product.coverImageBlobIds?.[0]
		? `${aggregatorUrl}/v1/blobs/${product.coverImageBlobIds[0]}`
		: `https://placehold.co/600x400/1e1e2c/FFFFFF/png?text=${encodeURIComponent(product.name)}`;


	return (
		<div className="bg-[#1e1e2c] rounded-xl overflow-hidden border border-gray-800 transition-all duration-300 hover:border-purple-500/80 hover:scale-[1.03] group flex flex-col">
			<Link href={`/product/${product.id}`} className="block flex-grow">
				<div className="relative aspect-video">
					<img
						src={representativeThumbnail}
						alt={product.name}
						className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
					<ProductBadge visibility={product.visibility} />
				</div>

				<div className="p-4">
					<h3 className="text-lg font-bold text-white truncate transition-colors group-hover:text-purple-400">
						{product.name}
					</h3>
					<p className="text-xs text-gray-500 mt-1">
						by {truncateAddress(product.owner)}
					</p>
					{product.description && (
						<p className="text-sm text-gray-400 mt-2 h-10 line-clamp-2">
							{product.description}
						</p>
					)}
				</div>
			</Link>

			<div className="mt-auto px-4 py-3 bg-[#12141c]/60 border-t border-gray-800 flex justify-between items-center">
				<PriceDisplay product={product} />
				<div className="flex items-center gap-4 text-sm">
				</div>
			</div>
		</div>
	);
}
