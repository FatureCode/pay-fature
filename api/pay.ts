import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Connection, PublicKey, Transaction as Web3Transaction, SystemProgram, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import { convertErrorToApiError, amountToString, amountInBrlToSol, calculateLamportTransactionAmount, TransactionAmount } from '../common/util';
import { ActionGetResponse, ActionPostResponse } from '@solana/actions';
import { getTransaction, initiateTransaction, StorageTransaction, TransactionStatus,  } from '../data/transactions';
import { FEE_RECIPIENT_PUBKEY } from '../common/constants';
import { getUserVisibleIdParam } from '../common/util';

async function handleGetRequest(req: VercelRequest, res: VercelResponse) {
  // Placeholder values
  const title = 'Cafe do Artur';
  const icon = 'https://liberal.com.br/wp-content/uploads/2021/06/Arthur-Fortunato-treinando-para-o-mundial-de-tiro-56-1624x1080.jpg';
  const userVisibleId = getUserVisibleIdParam(req.query);
  const transaction: StorageTransaction | null = await getTransaction(userVisibleId);
  // TODO: deal with the case where the transaction is not found.
  if (!transaction) {
    throw new Error("Error with transaction");
  }
  const data: ActionGetResponse = {
    icon,
    title,
    description: `Make secure payments with Fature.`,
    label: `Pay ${amountToString(transaction.amount)}`,
  };
  res.json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return handleGetRequest(req, res);
  } else if (req.method === 'POST') {
    // Handle POST request
    const userVisibleTransactionId = getUserVisibleIdParam(req.query);
    const storageTransaction: StorageTransaction | null = await getTransaction(userVisibleTransactionId);
    if (!storageTransaction || storageTransaction.status !== TransactionStatus.Created) {
      throw new Error("Error with transaction");
    }
    let payerPubKey: string;
    try {
      payerPubKey = getPayerPubKey(req.body);
    } catch (error) {
      res.status(400).json(convertErrorToApiError(error, false, 400));
      return;
    }
    const { externalId, amount, recipientId } = storageTransaction;
    let amountInSol: number;
    try {
      amountInSol = await amountInBrlToSol(amount);
    } catch (error) {
      res.status(500).json(convertErrorToApiError(error, true, 500));
      return;
    }

    const totalLamportsToTransfer = BigInt(Math.floor(amountInSol * LAMPORTS_PER_SOL));
    const transactionAmount: TransactionAmount = calculateLamportTransactionAmount(totalLamportsToTransfer);
    await initiateTransaction(userVisibleTransactionId, payerPubKey, transactionAmount.fee);

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

    const transaction = new Web3Transaction();
    const connection = new Connection(clusterApiUrl("mainnet-beta"), 'confirmed');
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.add(transferInstruction);
    transaction.add(feeInstruction);
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
  } else {
    throw new Error('Unsupported method' + req.method);
  }
}

function getPayerPubKey(requestBody: any): string {
  try {
    const payerPubKey: string = requestBody.account as string;
    new PublicKey(payerPubKey)
    return payerPubKey;
  } catch (error) {
    throw new Error("Failed to parse payer account");
  }
}
