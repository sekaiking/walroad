"use client";

import dynamic from "next/dynamic";

export const dynamicParams = false;

// Dynamically import the form component with no SSR to avoid WASM loading issues
const CreateProductForm = dynamic(
	() => import("@/ui/CreateProductForm").then(mod => ({ default: mod.CreateProductForm })),
	{ ssr: false }
);

export default function UploadPage() {
	return (
		<div className="w-full max-w-4xl mx-auto p-4 sm:p-6 min-h-screen">
			<header className="text-center my-8">
				<h1 className="text-4xl font-bold text-white">Create a New Product</h1>
				<p className="text-gray-400 mt-2">Fill out the details below to list your digital product on the marketplace.</p>
			</header>
			<main>
				<CreateProductForm />
			</main>
		</div>
	);
}

