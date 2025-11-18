"use client";

import { useState, useMemo } from 'react';
import { FaSortAmountDown, FaSortAmountUp, FaSearch, FaTimes, FaThLarge } from 'react-icons/fa';
import { CollectionData, CollectionVisibility } from '@/lib/types';
import { ProductCardItem } from './ProductCardItem';

type SortKey = 'recent';

interface ProductMarketplaceProps {
	products: CollectionData[];
}

export function ProductMarketplace({ products }: ProductMarketplaceProps) {
	const [sortKey, setSortKey] = useState<SortKey>('recent');
	const [sortAsc, setSortAsc] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [filterVisibility, setFilterVisibility] = useState<CollectionVisibility | 'all' | 'free'>('all');

	const filteredAndSortedProducts = useMemo(() => {
		const filtered = products.filter(product => {
			const matchesSearch = searchQuery === '' ||
				product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				product.description?.toLowerCase().includes(searchQuery.toLowerCase());

			const isFree = filterVisibility === 'free' && product.visibility === 'public';
			const isPremium = filterVisibility === 'pay-to-see' && product.visibility === 'pay-to-see';
			const matchesVisibility = filterVisibility === 'all' || isFree || isPremium;

			return matchesSearch && matchesVisibility;
		});

		const sorted = [...filtered].sort((a, b) => {
			// Sort by creation time for 'recent'
			return a.createdAt - b.createdAt;
		});

		if (!sortAsc) {
			return sorted.reverse();
		}
		return sorted;
	}, [products, sortKey, sortAsc, searchQuery, filterVisibility]);

	const handleSort = (key: SortKey) => {
		if (key === sortKey) {
			setSortAsc(prev => !prev);
		} else {
			setSortKey(key);
			setSortAsc(false);
		}
	};

	return (
		<div className="w-full space-y-6">
			<div className="relative">
				<FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Search for products, datasets, art..."
					className="w-full bg-[#1e1e2c] text-white rounded-lg pl-12 pr-10 py-3 border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
				/>
				{searchQuery && (
					<button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
						<FaTimes />
					</button>
				)}
			</div>

			<div className="flex flex-col md:flex-row justify-between items-center gap-4 p-2 bg-[#1e1e2c]/50 rounded-lg border border-gray-800">
				<div className="flex gap-2 flex-wrap">
					<button onClick={() => setFilterVisibility('all')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${filterVisibility === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>All</button>
					<button onClick={() => setFilterVisibility('pay-to-see')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${filterVisibility === 'pay-to-see' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Premium</button>
					<button onClick={() => setFilterVisibility('free')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${filterVisibility === 'free' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Free</button>
				</div>
				<div className="flex items-center gap-4 text-sm text-gray-400">
					<span>Sort by:</span>
					<button onClick={() => handleSort('recent')} className={`flex items-center gap-1.5 ${sortKey === 'recent' ? 'text-purple-400' : 'hover:text-white'}`}>Newest {sortKey === 'recent' && (sortAsc ? <FaSortAmountUp /> : <FaSortAmountDown />)}</button>
				</div>
			</div>

			{filteredAndSortedProducts.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredAndSortedProducts.map((product) => (
						<ProductCardItem key={product.id} collection={product} />
					))}
				</div>
			) : (
				<div className="text-center py-20 bg-[#12141c] rounded-xl border border-dashed border-gray-800 flex flex-col items-center">
					<FaThLarge className="text-gray-600 mb-4" size={32} />
					<h3 className="text-xl font-semibold text-white">No Products Found</h3>
					<p className="text-gray-400 mt-1">Try clearing your filters or searching for something else.</p>
					<button onClick={() => { setSearchQuery(''); setFilterVisibility('all'); }} className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-semibold">
						Clear Filters
					</button>
				</div>
			)}
		</div>
	);
}
