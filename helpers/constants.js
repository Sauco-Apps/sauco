'use strict';

/**
 * @namespace constants
 * @memberof module:helpers
 * @property {number} activeDelegates - The default number of delegates.
 * @property {number} addressLength - The default address length.
 * @property {number} blockHeaderLength - The default block header length.
 * @property {number} blockReceiptTimeOut
 * @property {number} confirmationLength
 * @property {Date} epochTime
 * @property {object} fees - The default values for fees.
 * @property {number} fees.send
 * @property {number} fees.vote
 * @property {number} fees.secondsignature
 * @property {number} fees.delegate
 * @property {number} fees.multisignature
 * @property {number} fees.dapp
 * @property {number} feeStart
 * @property {number} feeStartVolume
 * @property {number} fixedPoint
 * @property {number} maxAddressesLength
 * @property {number} maxAmount
 * @property {number} maxConfirmations
 * @property {number} maxPayloadLength
 * @property {number} maxPeers
 * @property {number} maxRequests
 * @property {number} maxSharedTxs
 * @property {number} maxSignaturesLength
 * @property {number} maxTxsPerBlock
 * @property {number} minBroadhashConsensus
 * @property {string[]} nethashes - Mainnet and Testnet.
 * @property {number} numberLength
 * @property {number} requestLength
 * @property {object} rewards
 * @property {number[]} rewards.milestones - Initial 5, and decreasing until 1.
 * @property {number} rewards.offset - Start rewards at block (n).
 * @property {number} rewards.distance - Distance between each milestone
 * @property {number} signatureLength
 * @property {number} totalAmount
 * @property {number} unconfirmedTransactionTimeOut - 1080 blocks
 */
module.exports = {
	currentVersion: '7.0.0',
	minVersion: [
		{ height: 1, ver: '^6.7.0'},
		{ height: 2, ver: '^6.8.0'}
	],
	activeDelegates: 101,
	addressLength: 208,
	blockHeaderLength: 248,
	blockSlotWindow: 5, // window in which a slot could be accepted
	blockTime: 27000,
	blockReceiptTimeOut: 27 * 2, // 2 blocks
	confirmationLength: 77,
	epochTime: new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0)),
	fees: [
		{
			height: 1,
			fees: {
				send: 10000000,		// 0.1
				vote: 100000000,	// 1
				secondsignature: 500000000,	// 5
				delegate: 6000000000,	// 60
				multisignature: 500000000, // 5
				dapp: 2500000000	//25
			}
		},
		{
			height: 2,
			fees: {
				send: 1000000,		// 0.01
				vote: 100000000,	// 1
				secondsignature: 10000000,	// 0.1
				delegate: 6000000000,	// 60
				multisignature: 50000000, // 0.5
				dapp: 2500000000	//25
			}
		},
		{
			height: 3,
			fees: {
				send: 100000,		// 0.001
				vote: 100000000,	// 1
				secondsignature: 10000000,	// 0.1
				delegate: 3000000000,	// 30
				multisignature: 50000000, // 0.5
				dapp: 2000000000	//25
			}
		}
	],
	fixedPoint: Math.pow(10, 8),
	maxAddressesLength: 208 * 128,
	maxAmount: 100000000,
	maxConfirmations: 77 * 100,
	maxPayloadLength: 1024 * 1024,
	maxPeers: 100,
	maxRequests: 10000 * 12,
	maxSharedTxs: 100,
	maxSignaturesLength: 196 * 256,
	maxTxsPerBlock: 25,
	minBroadhashConsensus: 51,
	nethashes: [
		// Mainnet
		'fe561132f28c3d6da8690c42fd4be8c5bcdad7b5a74d7f4e13355c7aef1e75ad',
		// Testnet
		'1bce8da0d6e616482de1ebf920ef3875e166332affdd70f9a8a689babce54420'
	],
	numberLength: 100000000,
	requestLength: 104,
	teamAccounts: [
		// Mainnet
		'3160fdb9e0049c8ccb47e37421e6df20cc274e0c47edbe0b8004c8cc02585a0a',
		// Testnet
		'e3d2571579cf7fd03e388442a514e349a604f9d3d42ade2aa2767194f5fe3802'
	],	
	rewards: [
		{ height: 1,        reward: 0 },
		{ height: 2,        reward: 100000000 },
		{ height: 3,        reward: 0 },
		{ height: 64000,     reward: 250000000 },
		{ height: 288000,    reward: 200000000 },
		{ height: 1168001,  reward: 150000000 }
	],
	signatureLength: 196,
	totalAmount: 1000000000000000,
	unconfirmedTransactionTimeOut: 10800 // 1080 blocks
};
