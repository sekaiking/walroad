import Link from 'next/link';
import Image from 'next/image';
import { queryAllCollections } from '@/lib/suiContract';
import { ProductCardItem } from '@/ui/ProductCardItem';
import { FaPlusCircle, FaStore, FaShieldAlt, FaWallet, FaGlobe } from 'react-icons/fa';

async function getFeaturedProducts() {
	try {
		const allCollections = await queryAllCollections();

		const allProducts = allCollections
			.filter(c => c.visibility === 'public' || c.visibility === 'pay-to-see')
			.sort((a, b) => b.viewCount - a.viewCount)
			.slice(0, 3);

		return allProducts;
	} catch (error) {
		console.error('Error loading featured products:', error);
		return [];
	}
}

export default async function HomePage() {
	const featuredProducts = await getFeaturedProducts();

	return (
		<div className="w-full max-w-6xl mx-auto p-4 sm:p-6 min-h-screen">
			<section className="text-center py-20 mb-16 relative">
				<div
					className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-blue-900/30 rounded-b-full blur-3xl"
					style={{ top: '-5rem', zIndex: -1 }}
				/>
				<div
					className="absolute -z-1 inset-10 bg-gradient-to-b from-violet-900/30 to-transparent blur-3xl rounded-full"
				/>
				<Image
					src="/logo-2.png"
					alt="WalRoad Glowing Cube Logo"
					width={128}
					height={128}
					className="mx-auto mb-8"
				/>
				<h1
					className="text-5xl md:text-6xl font-bold text-white mb-4"
					style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}
				>
					Your Product, Your Rules.
				</h1>
				<p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
					Sell any digital creation directly to your audience. Get paid instantly with crypto, and build a business you truly own.
				</p>
				<div className="flex gap-4 justify-center flex-wrap">
					<Link
						href="/create"
						className="bg-purple-600 flex items-center hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50"
					>
						<FaPlusCircle className="mr-2" />
						Start Selling
					</Link>
					<Link
						href="/explore"
						className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-colors inline-flex items-center"
					>
						<FaStore className="mr-2" />
						Explore Products
					</Link>
				</div>
			</section>

			<section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
				<div className="bg-[#12141c] p-6 rounded-xl border border-gray-800 transition-all duration-300 hover:border-purple-500/50 hover:scale-105">
					<div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
						<FaShieldAlt className="text-purple-400" size={24} />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">Own Your Assets</h3>
					<p className="text-gray-400 text-sm">
						Your products are on-chain objects, controlled only by your wallet.
					</p>
				</div>

				<div className="bg-[#12141c] p-6 rounded-xl border border-gray-800 transition-all duration-300 hover:border-green-500/50 hover:scale-105">
					<div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
						<FaWallet className="text-green-400" size={24} />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">Own Your Revenue</h3>
					<p className="text-gray-400 text-sm">
						Receive payments instantly and directly, with a transparent 2.5% protocol fee.
					</p>
				</div>

				<div className="bg-[#12141c] p-6 rounded-xl border border-gray-800 transition-all duration-300 hover:border-blue-500/50 hover:scale-105">
					<div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
						<FaGlobe className="text-blue-400" size={24} />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">Own Your Platform</h3>
					<p className="text-gray-400 text-sm">
						Your storefront is censorship-resistant. No one can take it down.
					</p>
				</div>

				<div className="bg-[#12141c] p-6 rounded-xl border border-gray-800 transition-all duration-300 hover:border-red-500/50 hover:scale-105">
					<div className="w-12 h-12 bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
						<FaGlobe className="text-red-400" size={24} />
					</div>
					<h3 className="text-lg font-semibold text-white mb-2">Decentralized Stack</h3>
					<p className="text-gray-400 text-sm">
						Built on Sui, Walrus, and Seal for a truly decentralized experience.
					</p>
				</div>
			</section>

			<section>
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-2xl font-bold text-white">Featured Products</h2>
					<Link href="/explore" className="text-purple-400 hover:text-purple-300 text-sm font-semibold">
						View all →
					</Link>
				</div>
				{featuredProducts.length > 0 ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{featuredProducts.map((product) => (
							<ProductCardItem key={product.id} collection={product} />
						))}
					</div>
				) : (
					<div className="text-center py-16 bg-[#12141c]/50 rounded-xl border border-dashed border-gray-800">
						<p className="text-gray-400">No products have been listed yet. Be the first creator!</p>
						<Link
							href="/create"
							className="inline-block mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
						>
							Create Your First Product
						</Link>
					</div>
				)}
			</section>
		</div>
	);
}
