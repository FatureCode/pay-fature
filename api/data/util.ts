export interface APIError {
  userMessage: string,
  errorCode: number,
  // Should only be used for debugging purposes.
  internalMessage?: string,
  retriable: boolean,
}

const BASE_PATH = "https://pay.fature.xyz/api/";
const GET_STORAGE_TRANSACTION_PATH = "get-storage-transaction";
const INITIATE_TRANSACTION_PATH = "initiate-transaction";
const GET_TRANSACTION_URL = BASE_PATH + GET_STORAGE_TRANSACTION_PATH;
const INITIATE_TRANSACTION_URL = BASE_PATH + INITIATE_TRANSACTION_PATH;

export function getTransactionUrl(userVisibleId: string): string {
  return GET_TRANSACTION_URL + `?transactionId=${userVisibleId}`;
}

export function initiateTransactionUrl(): string {
  return INITIATE_TRANSACTION_URL;
}

export function buildInitiateTransactionRequest(
  userVisibleId: string,
  payerAccount: string,
  transactionFee: bigint
): string {
  return JSON.stringify({ userVisibleId, payerAccount, transactionFee });
}