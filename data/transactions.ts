import { APIError, getTransactionUrl, initiateTransactionUrl, buildInitiateTransactionRequest } from '../common/util';
import { DateTime } from 'luxon';
import { InternalError } from '../common/errors';

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
