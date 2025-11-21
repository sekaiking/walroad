// import { NextRequest, NextResponse } from 'next/server';
// import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
// import { WalrusClient } from '@mysten/walrus';
// // import { getFundedKeypair } from '@/lib/get-funded-keypair';
//
// export const runtime = 'nodejs';
// export const dynamic = 'force-dynamic';
//
// const suiClient = new SuiClient({
// 	url: getFullnodeUrl('testnet'),
// });
//
// const walrusClient = new WalrusClient({
// 	network: 'testnet',
// 	suiClient,
// });
//
// // NOTE: In the future, for better UX, we need to handle upload in backend, but force user to pay using wallet.
// // for now, we will directly upload from frontend/walet.
// export async function PUT(req: NextRequest) {
// 	try {
// 		// TODO: get real wallet keypair
// 		const keypair = null as any;
//
// 		// --- Read raw binary body ---
// 		const arrayBuffer = await req.arrayBuffer();
// 		const blob = new Uint8Array(arrayBuffer);
//
// 		// --- Query params ---
// 		const { searchParams } = new URL(req.url);
// 		const epochs = parseInt(searchParams.get('epochs') ?? '3', 10);
// 		const sendObjectTo = searchParams.get('send_object_to');
// 		const deletable = searchParams.get('deletable') === 'true';
//
// 		// --- Cost estimation ---
// 		const { storageCost, writeCost } = await walrusClient.storageCost(blob.length, epochs);
//
// 		// --- Upload blob ---
// 		const { blobObject } = await walrusClient.writeBlob({
// 			blob,
// 			deletable,
// 			epochs,
// 			signer: keypair,
// 			owner: sendObjectTo ?? keypair.toSuiAddress(),
// 		});
//
// 		// --- Match the Rust aggregator response format ---
// 		return NextResponse.json({
// 			newlyCreated: {
// 				...blobObject,
// 				id: blobObject.id.id,
// 				storage: {
// 					...blobObject.storage,
// 					id: blobObject.storage.id.id,
// 				},
// 			},
// 			resourceOperation: {
// 				registerFromScratch: {
// 					encodedLength: blobObject.storage.storage_size,
// 					epochsAhead: epochs,
// 				},
// 			},
// 			cost: Number(storageCost + writeCost),
// 		});
// 	} catch (err: any) {
// 		console.error(err);
// 		return new NextResponse(`Error: ${err.message}`, { status: 500 });
// 	}
// }
