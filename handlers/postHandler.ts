import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserVisibleIdParam, TransactionAmounts, amountToString, calculateTransactionAmounts } from '../common/util';
import { InternalError } from '../common/errors';
import { PublicKey, Transaction as Web3Transaction, Connection, clusterApiUrl} from '@solana/web3.js';
import type { StorageTransaction } from '../data/transactions';
import { getTransaction, initiateTransaction, insertTransferInstructions } from '../data/transactions';
import { ActionPostResponse } from '@solana/actions';

export async function handlePostRequest(req: VercelRequest, res: VercelResponse) {
  const userVisibleTransactionId = getUserVisibleIdParam(req.query);
  const payerPubKey: string = getPayerPubKey(req.body);
  // Fetching created transaction from storage.
  const storageTransaction: StorageTransaction = await getTransaction(userVisibleTransactionId);
  const { externalId, amount, recipientId } = storageTransaction;
  // Calculating the amount to transfer including the fee.
  const transactionAmount: TransactionAmounts = await calculateTransactionAmounts(amount, storageTransaction.paymentToken);
  // Marking the transaction as initiated
  await initiateTransaction(userVisibleTransactionId, payerPubKey, transactionAmount.fee);
  // Building the transaction with the transfer and fee instructions
  const transaction = new Web3Transaction();
  const connection = new Connection(clusterApiUrl("mainnet-beta"), 'confirmed');
  await insertTransferInstructions(
    new PublicKey(payerPubKey),
    new PublicKey(recipientId),
    transactionAmount,
    connection,
    transaction,
    externalId,
  )
  const latestBlockhash = await connection.getLatestBlockhash();
  transaction.recentBlockhash = latestBlockhash.blockhash;
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
