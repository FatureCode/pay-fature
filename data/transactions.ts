import { APIError, getTransactionUrl, initiateTransactionUrl, buildInitiateTransactionRequest } from '../common/util';
import { DateTime } from 'luxon';

interface GetStorageTransactionResponse {
  apiError?: APIError,
  transaction?: StorageTransaction,
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

export const getTransaction = async (externalTransactionId: string): Promise<StorageTransaction> => {
  const url = getTransactionUrl(externalTransactionId);
  const fetchResponse = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const backendResponse = await fetchResponse.json() as GetStorageTransactionResponse;
  // TODO: Propage the error in the method response.
  if (!backendResponse.transaction) {
    throw new Error(backendResponse.apiError?.userMessage);
  }
  return backendResponse.transaction;
}

export async function initiateTransaction(userVisibleId: string, payerAccount: string, transactionFee: bigint): Promise<void> {
  const url = initiateTransactionUrl();
  const requestBody = buildInitiateTransactionRequest(userVisibleId, payerAccount, transactionFee);
  const res = await fetch(url, {
    method: 'POST',
    body: requestBody,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error("Error initiating transaction");
  }
}