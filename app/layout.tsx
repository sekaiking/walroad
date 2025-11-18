import { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = {
	title: "WalRoad: Decentralized Digital Marketplace",
	description: "WalRoad is a decentralized marketplace for digital creators, built on Sui for provable on-chain ownership, radically lower fees, and censorship-resistance.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
