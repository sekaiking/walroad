"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useCurrentAccount, ConnectButton } from '@mysten/dapp-kit';
import { FaPlusCircle, FaSadTear, FaCoins, FaEye, FaShoppingBag, FaWallet } from 'react-icons/fa';
import { CollectionData } from '@/lib/types';
import { DashboardProductRow } from './DashboardProductRow';

export function CreatorDashboard({ allProducts }: { allProducts: CollectionData[] }) {
	const account = useCurrentAccount();

	const userProducts = useMemo(() => {
		if (!account) return [];
		return allProducts.filter(p => p.owner === account.address);
	}, [allProducts, account]);

	const stats = useMemo(() => {
		const totalRevenue = userProducts.reduce((sum, p) => sum + p.totalEarnings, 0);
		const totalSales = userProducts.reduce((sum, p) => sum + p.purchaseCount, 0);
		const totalProducts = userProducts.length;
		const availableBalance = totalRevenue;

		return { totalRevenue, availableBalance, totalSales, totalProducts };
	}, [userProducts]);

	if (!account) {
		return <div className="text-center bg-[#12141c] p-10 rounded-xl border border-gray-800"><h2 className="text-2xl font-bold text-white mb-3">Your Dashboard Awaits</h2><p className="text-gray-400 mb-6">Connect your wallet to manage your products and view your sales.</p><ConnectButton /></div>;
	}

	if (allProducts.length > 0 && userProducts.length === 0) {
		return <div className="text-center text-gray-400 p-12 bg-[#12141c]/50 rounded-xl border border-dashed border-gray-700"><FaSadTear className="text-5xl mx-auto mb-4 text-gray-600" /><h3 className="text-xl text-white font-semibold">You haven&apos;t created any products yet.</h3><p className="mb-6">Click below to start selling your digital goods!</p><Link href="/create" className="inline-flex items-center gap-2 bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"><FaPlusCircle /> Create First Product</Link></div>;
	}

	return (
		<div className="w-full space-y-6">
			{/* Stat Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
				<StatCard icon={FaWallet} label="Available Balance" value={`${stats.availableBalance.toFixed(2)} SUI`} color="green" isActionable={true} />
				<StatCard icon={FaCoins} label="Total Revenue" value={`${stats.totalRevenue.toFixed(2)} SUI`} color="yellow" />
				<StatCard icon={FaShoppingBag} label="Total Sales" value={stats.totalSales} color="blue" />
			</div>

			{/* Product Table */}
			<div className="bg-[#12141c] rounded-xl border border-gray-800">
				<div className="p-4 flex justify-between items-center border-b border-gray-800">
					<h3 className="text-lg font-semibold text-white">Your Products ({userProducts.length})</h3>
					<div className="flex gap-2">{/* Filter buttons go here */}</div>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm text-left">
						<thead className="bg-gray-900/50 text-xs text-gray-400 uppercase">
							<tr>
								<th scope="col" className="px-6 py-3">Product</th>
								<th scope="col" className="px-6 py-3">Status</th>
								<th scope="col" className="px-6 py-3 text-center">Price</th>
								<th scope="col" className="px-6 py-3 text-center">Sales</th>
								<th scope="col" className="px-6 py-3 text-right">Revenue</th>
								<th scope="col" className="px-6 py-3 text-center">Actions</th>
							</tr>
						</thead>
						<tbody>
							{userProducts.map(product => <DashboardProductRow key={product.id} product={product} />)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

// Sub-component for stat cards
const StatCard = ({ icon: Icon, label, value, color, isActionable }: any) => {
	const colors = {
		green: 'text-green-400', yellow: 'text-yellow-400', blue: 'text-blue-400', purple: 'text-purple-400',
	};
	return (
		<div className="bg-[#1a1c2b] p-4 rounded-xl border border-gray-800">
			<div className="flex items-center gap-3">
				<Icon className={colors[color as keyof typeof colors]} size={20} />
				<div>
					<p className="text-xs text-gray-400">{label}</p>
					<p className="text-xl font-bold text-white">{value}</p>
				</div>
			</div>
			{isActionable && <button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-1.5 px-3 rounded-md">Withdraw</button>}
		</div>
	);
};
