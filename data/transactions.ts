import { APIError, getTransactionUrl, initiateTransactionUrl, buildInitiateTransactionRequest } from '../common/util';
import { DateTime } from 'luxon';
import { InternalError } from '../common/errors';
import { getSPLMintAddress, Token } from './tokens';
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction as Web3Transaction, Connection, clusterApiUrl, TransactionInstruction } from '@solana/web3.js';
import { getUserVisibleIdParam, TransactionAmounts, amountToString, calculateTransactionAmounts } from '../common/util';
import { FEE_RECIPIENT_PUBKEY } from '../common/constants';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  Account,
} from "@solana/spl-token";

interface GetStorageTransactionResponse {
  apiError?: APIError
  transaction?: StorageTransaction
}

interface InitiateTransactionResponse {
  apiError?: APIError
}

export interface StorageTransaction {
  userVisibleId: string,
  externalId: string,
  amount: number,
  recipientId: string,
  status: TransactionStatus,
  paymentToken: Token,
  creationTimestamp: DateTime,
  lastUpdatedTimestamp: DateTime,
}

export enum TransactionStatus {
  Created = "CREATED",
  Initiated = "INITIATED",
  Processing = "PROCESSING",
  Settled = "SETTLED",
  Canceled = "CANCELED",
  Failed = "FAILED"
}

/**
 * Retrieves a transaction from the storage backend using the provided external transaction ID.
 *
 * @param externalTransactionId - The ID of the external transaction to retrieve.
 * @returns A promise that resolves to a `StorageTransaction` object.
 * @throws {InternalError} If there is an error fetching the transaction, if the transaction is not found,
 *                         if the transaction has already been initiated, or if there is an API error.
 */
export const getTransaction = async (externalTransactionId: string): Promise<StorageTransaction> => {
  const url = getTransactionUrl(externalTransactionId);
  let backendResponse: GetStorageTransactionResponse;
  try {
    const fetchResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    backendResponse = await fetchResponse.json() as GetStorageTransactionResponse;
  } catch (error) {
    throw new InternalError("Error fetching transaction", 500, true, error.message);
  }
  if (backendResponse.apiError) {
    throw InternalError.fromAPIError(backendResponse.apiError);
  }
  const storageTransaction = backendResponse.transaction;
  if (!storageTransaction) {
    // This should never happen, but just in case. The API should return a error instead.
    throw new InternalError("Transaction not found", 404, false);
  }
  if (storageTransaction.status !== TransactionStatus.Created) {
    throw new InternalError("Transaction has already been initiated", 400, false);
  }
  return storageTransaction;
}

/**
 * Initiates a transaction for a given user.
 *
 * @param userVisibleId - The visible ID of the user initiating the transaction.
 * @param payerAccount - The account from which the payment will be made.
 * @param transactionFee - The fee associated with the transaction.
 * @returns A promise that resolves when the transaction is successfully initiated.
 * @throws {InternalError} If there is an error initiating the transaction or if the backend response contains an API error.
 */
export async function initiateTransaction(userVisibleId: string, payerAccount: string, transactionFee: bigint): Promise<void> {
  const url = initiateTransactionUrl();
  const requestBody = buildInitiateTransactionRequest(userVisibleId, payerAccount, transactionFee);
  let backendResponse: InitiateTransactionResponse;
  try {
    const fetchResponse = await fetch(url, {
      method: 'POST',
      body: requestBody,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    backendResponse = await fetchResponse.json() as InitiateTransactionResponse;
  } catch (error) {
    throw new InternalError("Error initiating transaction", 500, true, error.message);
  }
  if (backendResponse.apiError) {
    throw InternalError.fromAPIError(backendResponse.apiError);
  }
}

/**
 * Inserts transfer instructions into a given transaction for either SOL or SPL token payments.
 *
 * - For SOL payments, adds two transfer instructions: one to the recipient and one to the fee recipient.
 * - For SPL token payments, ensures associated token accounts exist for payer, recipient, and fee recipient,
 *   then adds corresponding SPL token transfer instructions.
 *
 * @param payerPubKey - The public key of the payer.
 * @param recipientPubKey - The public key of the recipient.
 * @param amounts - The transaction amounts, including principal, fee, and payment token type.
 * @param connection - The Solana connection object for network interactions.
 * @param transaction - The transaction object to which transfer instructions will be added.
 *
 * @remarks
 * For SPL token payments, associated token accounts are created or fetched as needed.
 * The function currently assumes the fee is paid in the same token as the principal.
 */
export async function insertTransferInstructions(
  payerPubKey: PublicKey,
  recipientPubKey: PublicKey,
  amounts: TransactionAmounts,
  connection: Connection,
  transaction: Web3Transaction,
  externalId: string,
) {
  let transferInstruction: TransactionInstruction;
  let feeInstruction: TransactionInstruction;
  if (amounts.paymentToken === Token.SOL) {
    transferInstruction = createSolTransferInstruction(payerPubKey, recipientPubKey, amounts.principal);
    feeInstruction = createSolTransferInstruction(payerPubKey, FEE_RECIPIENT_PUBKEY, amounts.fee);
  } else {
    // For SPL tokens, we need to get or create associated token accounts if they don't exist.
    const payerTokenAccount = await getTokenAddress(payerPubKey, connection, amounts.paymentToken);
    const recipientTokenAccount = await getTokenAddress(recipientPubKey, connection, amounts.paymentToken);
    transferInstruction = createSplTransferInstruction(
      payerTokenAccount,
      recipientTokenAccount,
      payerPubKey,
      amounts.principal,
    );
    // TODO: Handle fee transfer in SOL tokens.
    const feeTokenAccount = await getTokenAddress(new PublicKey(FEE_RECIPIENT_PUBKEY), connection, amounts.paymentToken);
    feeInstruction = createSplTransferInstruction(
      payerTokenAccount,
      feeTokenAccount,
      payerPubKey,
      amounts.fee,
    );
  }
  // Adding the transactionId to the keys array so that we can reference it when fetching the transaction status.
  feeInstruction.keys.push(
    { pubkey: new PublicKey(externalId), isSigner: false, isWritable: false },
  );
  transaction.add(
    transferInstruction, feeInstruction,
  );
}

/**
 * Retrieves or creates the associated token account for a given user and token.
 *
 * @param userPubKey - The public key of the user for whom the token account is being retrieved or created.
 * @param connection - The Solana connection object used to interact with the blockchain.
 * @param token - The token for which the associated account address is required.
 * @returns A promise that resolves to the associated token account.
 */
async function getTokenAddress(
  userPubKey: PublicKey,
  connection: Connection,
  token: Token
): Promise<Account> {
  return await getOrCreateAssociatedTokenAccount(
    connection,
    { publicKey: userPubKey, secretKey: null } as any,
    new PublicKey(getSPLMintAddress(token)),
    new PublicKey(userPubKey),
  );
}

/**
 * Creates a Solana Program Library (SPL) token transfer instruction.
 *
 * @param payerTokenAccount - The token account of the payer (sender).
 * @param recipientTokenAccount - The token account of the recipient.
 * @param payerPubKey - The public key of the payer (signer of the transaction).
 * @param amount - The amount to transfer, specified in the smallest unit of the token (e.g., lamports for SOL).
 * @returns The SPL token transfer instruction.
 */
function createSplTransferInstruction(
  payerTokenAccount: Account,
  recipientTokenAccount: Account,
  payerPubKey: PublicKey,
  // Amount in the smallest unit of the token (e.g., 1 SOL = 1_000_000_000 lamports)
  amount: bigint,
): TransactionInstruction {
  return createTransferInstruction(
    payerTokenAccount.address,
    recipientTokenAccount.address,
    payerPubKey,
    amount,
  );
}

/**
 * Creates a Solana transfer instruction to move SOL from one account to another.
 *
 * @param payerPubKey - The public key of the account sending SOL.
 * @param recipientPubKey - The public key of the account receiving SOL.
 * @param amount - The amount of lamports (smallest unit of SOL) to transfer.
 * @returns A `TransactionInstruction` representing the SOL transfer.
 */
function createSolTransferInstruction(
  payerPubKey: PublicKey,
  recipientPubKey: PublicKey,
  amount: bigint,
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payerPubKey,
    toPubkey: recipientPubKey,
    lamports: amount,
  });
}