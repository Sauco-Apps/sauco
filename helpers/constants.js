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
	currentVersion: '6.7.0',
	minVersion: [
		{ height: 1, ver: '^6.6.2'}
	],
	activeDelegates: 101,
	addressLength: 208,
	blockHeaderLength: 248,
	blockSlotWindow: 5, // window in which a slot could be accepted	
	blockTime: 27000,
	blockReceiptTimeOut: 27*2, // 2 blocks
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
				delegate: 3000000000,	// 60
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
		'942b858319e5169e76b1410446fa389fd2d2bc2da264b038726efb3bdab3d481',
		// Testnet
		'1bce8da0d6e616482de1ebf920ef3875e166332affdd70f9a8a689babce54420'
	],
	numberLength: 100000000,
	requestLength: 104,
	rewards: [
		{ height: 1,        reward: 0},
		{ height: 10,       reward: 100000000},
		{ height: 11,       reward: 30000000},
		{ height: 12,       reward: 20000000},
		{ height: 13,       reward: 0},
        { height: 16000,    reward: 100000000}
	],
	signatureLength: 196,
	totalAmount: 5000000000000000,
	unconfirmedTransactionTimeOut: 10800 // 1080 blocks
};
