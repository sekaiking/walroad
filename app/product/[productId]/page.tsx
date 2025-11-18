import { notFound } from 'next/navigation';
import { ProductDisplay } from "@/ui/ProductDisplay";
import { getCollectionById, parseCollectionData } from "@/lib/suiContract";

// Renamed function to align with marketplace terminology
async function getProduct(id: string) {
	try {
		const blockchainData = await getCollectionById(id);
		if (!blockchainData) return null;

		// Assuming parseCollectionData is updated to handle your new data model (e.g., cover images)
		const productData = parseCollectionData(blockchainData);
		return productData;
	} catch (error) {
		console.error('Error fetching product:', error);
		return null;
	}
}

// Renamed the parameter to be more semantic
export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
	const { productId } = await params;
	const productData = await getProduct(productId);
	console.log(productData)

	if (!productData) {
		notFound();
	}

	return (
		// A cleaner, centered layout container
		<div className="w-full max-w-6xl mx-auto p-4 sm:p-6 min-h-[calc(100vh-80px)] flex items-center justify-center">
			<ProductDisplay product={productData} />
		</div>
	);
}
