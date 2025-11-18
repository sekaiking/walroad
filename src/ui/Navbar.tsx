"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@mysten/dapp-kit';
import { FaBars, FaTimes } from 'react-icons/fa';

import Image from 'next/image';

const BrandLogo = () => (
	<Link href="/" className="flex items-center space-x-3">
		<Image src="/logo-2.png" alt="WalRoad Logo" width={32} height={32} />
		<span className="text-white font-bold text-2xl tracking-tight">WalRoad</span>
	</Link>
);

const Navbar = () => {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();

	const navLinks = [
		{ href: "/explore", text: "Explore" },
		{ href: "/dashboard", text: "Dashboard" },
	];

	return (
		<nav className="bg-[#12141c]/80 backdrop-blur-md border-b border-gray-800 sticky top-0 z-40">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-20">
					<div className="flex items-center">
						<div className="flex-shrink-0">
							<BrandLogo />
						</div>
						<div className="hidden md:flex md:items-center md:space-x-2 md:ml-10">
							{navLinks.map((link) => {
								const isActive = pathname === link.href;
								return (
									<Link
										key={link.href}
										href={link.href}
										className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
											? 'text-purple-400'
											: 'text-gray-400 hover:text-white'
											}`}
									>
										{link.text}
									</Link>
								);
							})}
						</div>
					</div>

					<div className="hidden md:flex items-center space-x-4">
						<Link
							href="/create"
							className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm py-2 px-4 rounded-lg transition-colors"
						>
							Create
						</Link>
						<ConnectButton />
					</div>

					<div className="md:hidden flex items-center">
						<button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700">
							{isOpen ? <FaTimes /> : <FaBars />}
						</button>
					</div>
				</div>
			</div>

			{isOpen && (
				<div className="md:hidden px-2 pt-2 pb-4 space-y-1 sm:px-3">
					{navLinks.map((link) => {
						const isActive = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								onClick={() => setIsOpen(false)}
								className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${isActive ? 'text-white bg-purple-600' : 'text-gray-300 hover:text-white hover:bg-gray-700'
									}`}
							>
								{link.text}
							</Link>
						);
					})}
					<Link
						href="/create"
						onClick={() => setIsOpen(false)}
						className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
					>
						Create
					</Link>
					<div className="border-t border-gray-700 my-2 pt-3">
						<div className="px-2">
							<ConnectButton />
						</div>
					</div>
				</div>
			)}
		</nav>
	);
};

export default Navbar;
