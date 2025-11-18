"use client";

import { useEffect } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/ui/Navbar";

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';
import { clearExpiredCache } from '@/lib/fileCache';
import { ToastProvider } from '@/lib/toast';
import { Metadata } from 'next';

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});


const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl('testnet') },
	// devnet: { url: getFullnodeUrl('devnet') },
});

const queryClient = new QueryClient();

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Clear expired cache entries on app load
	useEffect(() => {
		clearExpiredCache();
	}, []);

	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<QueryClientProvider client={queryClient}>
					<SuiClientProvider networks={networkConfig}>
						<WalletProvider autoConnect>
							<ToastProvider>
								<Navbar />
								<main>{children}</main>
							</ToastProvider>
						</WalletProvider>
					</SuiClientProvider>
				</QueryClientProvider>
			</body>
		</html>
	);
}
