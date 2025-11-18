import { CreatorDashboard } from "@/ui/CreatorDashboard";
import { queryAllCollections } from "@/lib/suiContract";

async function getAllProducts() {
	try {
		const products = await queryAllCollections();
		return products;
	} catch (error) {
		console.error('Error loading products:', error);
		return [];
	}
}

export default async function DashboardPage() {
	const allProducts = await getAllProducts();

	return (
		<div className="w-full max-w-7xl mx-auto p-4 sm:p-6 min-h-screen">
			<header className="mb-8">
				<h1 className="text-4xl font-bold text-white">Creator Dashboard</h1>
				<p className="text-gray-400 mt-2">Manage your products and track your sales performance.</p>
			</header>

			<main>
				<CreatorDashboard allProducts={allProducts} />
			</main>
		</div>
	);
}
