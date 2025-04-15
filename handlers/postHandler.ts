import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserVisibleIdParam, TransactionAmount, amountToString, calculateLamportTransactionAmount } from '../common/util';
import { InternalError } from '../common/errors';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction as Web3Transaction, Connection, clusterApiUrl} from '@solana/web3.js';
import type { StorageTransaction } from '../data/transactions';
import { getTransaction, initiateTransaction } from '../data/transactions';
import { amountInBrlToSol } from '../data/conversion';
import { FEE_RECIPIENT_PUBKEY } from '../common/constants';
import { ActionPostResponse } from '@solana/actions';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
} from "@solana/spl-token";

export async function handlePostRequest(req: VercelRequest, res: VercelResponse) {
  const userVisibleTransactionId = getUserVisibleIdParam(req.query);
  const payerPubKey: string = getPayerPubKey(req.body);
  // Fetching created transaction from storage.
  const storageTransaction: StorageTransaction = await getTransaction(userVisibleTransactionId);
  const { externalId, amount, recipientId } = storageTransaction;
  // Calculating the amount to transfer including the fee.
  const amountInSol: number = await amountInBrlToSol(amount);
  const totalLamportsToTransfer = BigInt(Math.floor(amountInSol * LAMPORTS_PER_SOL));
  const transactionAmount: TransactionAmount = calculateLamportTransactionAmount(totalLamportsToTransfer);
  // Marking the transaction as initiated
  await initiateTransaction(userVisibleTransactionId, payerPubKey, transactionAmount.fee);
  // Creating the transfer instructions
  const feeInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(payerPubKey),
    toPubkey: FEE_RECIPIENT_PUBKEY,
    lamports: transactionAmount.fee
  });
  // Adding the transactionId to the keys array so that we can reference it when fetching the transaction status.
  feeInstruction.keys.push({ pubkey: new PublicKey(externalId), isSigner: false, isWritable: false });
  const transferInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(payerPubKey),
    toPubkey: new PublicKey(recipientId),
    lamports: transactionAmount.toMerchant
  });
  // Building the transaction with the transfer and fee instructions
  const transaction = new Web3Transaction();
  const connection = new Connection(clusterApiUrl("mainnet-beta"), 'confirmed');
  if (recipientId === FEE_RECIPIENT_PUBKEY.toBase58()) {
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
			connection,
			{ publicKey: payerPubKey, secretKey: null } as any,
			new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
			new PublicKey(payerPubKey),
		);
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
			connection,
			{ publicKey: payerPubKey, secretKey: null } as any,
			new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
			FEE_RECIPIENT_PUBKEY,
		);
    const splTransfer = createTransferInstruction(
      fromTokenAccount.address,
      toTokenAccount.address,
      new PublicKey(payerPubKey),
      1,
    )
		transaction.add(splTransfer);
  }
  const latestBlockhash = await connection.getLatestBlockhash();
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.add(transferInstruction);
  transaction.add(feeInstruction);
  // Setting the payer (customer scanning the qr code) as the fee payer
  transaction.feePayer = new PublicKey(payerPubKey);
  const serializedTransaction = transaction.serialize({
    verifySignatures: false,
    requireAllSignatures: false,
  });
  const base64Transaction = Buffer.from(serializedTransaction).toString('base64');
  const message = `Payment of ${amountToString(amount)} completed.`;
  const payload: ActionPostResponse = {
    type: 'transaction',
    transaction: base64Transaction,
    message,
  }
  res.json(payload);
}

/**
 * Extracts and validates the payer's public key from the request body.
 * @param requestBody - The request body object containing the account information
 * @returns The validated payer's public key as a string
 * @throws {InternalError} If the public key is invalid with status code 400
 */
function getPayerPubKey(requestBody: any): string {
  try {
    const payerPubKey: string = requestBody.account as string;
    // Validate the public key
    new PublicKey(payerPubKey);
    return payerPubKey;
  } catch (error) {
    throw new InternalError("Invalid account public key", 400, false);
  }
}
