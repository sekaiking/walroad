import { ProductMarketplace } from "@/ui/ProductMarketplace";
import { queryAllCollections } from "@/lib/suiContract";

// Disable caching for this page - blockchain data changes frequently
export const revalidate = 0; // Disable cache, always fetch fresh data
export const dynamic = 'force-dynamic'; // Force dynamic rendering

async function getAllProducts() {
	try {
		const products = await queryAllCollections();
		const filteredProducts = products.filter(p => p.visibility !== 'unlisted');
		console.log(filteredProducts)
		console.log('Loaded', filteredProducts.length, 'public products from blockchain');
		return filteredProducts;
	} catch (error) {
		console.error('Error loading products:', error);
		return [];
	}
}

export default async function ExplorePage() {
	const products = await getAllProducts();

	return (
		<div className="w-full max-w-7xl mx-auto p-4 sm:p-6 min-h-screen">
			<header className="mb-8">
				<h1 className="text-4xl font-bold text-white">The Marketplace</h1>
				<p className="text-gray-400 mt-2">Discover unique digital products from creators.</p>
			</header>

			<main>
				<ProductMarketplace products={products} />
			</main>
		</div>
	);
}
