import React from 'react';
import { FaLock } from 'react-icons/fa';

interface PurchaseAccessButtonProps {
	collectionId: string;
	price: number;
}

export function PurchaseAccessButton({ collectionId, price }: PurchaseAccessButtonProps) {
	// This is a placeholder component. Actual implementation would involve
	// triggering a payment modal or transaction.
	return (
		<button
			className="w-full text-center font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
			onClick={() => alert(`Initiating purchase for collection ${collectionId} at ${price} SUI`)}
		>
			<FaLock /> Buy Now for {price.toFixed(2)} SUI
		</button>
	);
}