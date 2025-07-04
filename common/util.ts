import { FEE } from '../common/constants';
import type { VercelRequestQuery } from '@vercel/node';
import { Token, getTokenDecimals} from '../data/tokens';
import { amountInTokenDecimals } from '../data/conversion';

export interface APIError {
  userMessage: string,
  errorCode: number,
  // Should only be used for debugging purposes.
  internalMessage?: string,
  retriable: boolean,
}

export interface TransactionAmounts {
  // In Lamports if token is SOL, otherwise in the smallest unit of the SPL token.
  principal: bigint,
  // In Lamports if token is SOL, otherwise in the smallest unit of the SPL token.
  fee: bigint,
  paymentToken: Token,
}

export async function calculateTransactionAmounts(amountInBrl: number, token: Token): Promise<TransactionAmounts> {
  if (amountInBrl <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  // Need to convert the amount to the smallest unit of the token.
  const transactionTotalInTokenDecimals =  await amountInTokenDecimals(amountInBrl, token);
  console.log(`Transaction total in token decimals: ${transactionTotalInTokenDecimals}`);
  const feeInDecimal = Math.floor(transactionTotalInTokenDecimals * FEE);
  const principalInDecimal = transactionTotalInTokenDecimals - feeInDecimal;
  console.log(`Transaction total in token decimals: ${principalInDecimal} (principal) + ${feeInDecimal} (fee) = ${transactionTotalInTokenDecimals}`);
  return {
    fee: BigInt(feeInDecimal),
    principal: BigInt(principalInDecimal),
    paymentToken: token,
  }
}

/**
 * Converts a given error into an APIError object.
 *
 * @param error - The error to be converted. Can be of any type.
 * @param retriable - A boolean indicating if the error is retriable.
 * @param errorCode - The error code associated with the error.
 * @returns An APIError object containing the user message, error code, internal message, and retriable status.
 * @throws Will throw the original error if it is not an instance of Error.
 */
export function convertErrorToApiError(error: any, retriable: boolean, errorCode: number): APIError {
  console.log(error);
  if (error instanceof Error) {
    return {
      userMessage: error.message,
      errorCode,
      retriable,
    }
  }
  throw error;
}

/**
 * Converts a numeric amount to a string formatted as Brazilian Real currency.
 *
 * @param amount - The numeric amount to be converted.
 * @returns A string representing the amount in Brazilian Real currency format (e.g., "R$100.00").
 */
export function amountToString(amount: number): string {
  return `R$${amount}`;
}

/**
 * Retrieves and validates the user-visible transaction ID from the request query.
 *
 * @param query - The request query object containing the transaction ID.
 * @returns The validated user-visible transaction ID as a string.
 * @throws Will throw an error if the transaction ID is invalid.
 */
export function getUserVisibleIdParam(query: VercelRequestQuery): string {
  try {
    const userVisibleTransactionId = query.transactionId as string;
    validateTransactionUserVisibleId(userVisibleTransactionId);
    return userVisibleTransactionId;
  } catch (error) {
    throw new Error(`Invalid transactionId from request: ${error}`);
  }
}

const BASE_PATH = "https://p.fature.xyz/api/";
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
  // Convert the bigint to a string to avoid serialization issues.
  const feeString = transactionFee.toString();
  return JSON.stringify({ userVisibleId, payerAccount, transactionFee: feeString });
}

export function validateTransactionUserVisibleId(userVisibleTransactionId: string) {
  if (!userVisibleTransactionId) {
    throw new Error("Missing user visible transaction id");
  }
  if (!isValidTransactionUserVisibleId(userVisibleTransactionId)) {
    throw new Error("Invalid user visible transaction id");
  }
}

function isValidTransactionUserVisibleId(transactionUserVisibleId: string): boolean {
  return /^[A-Z]{8}$/.test(transactionUserVisibleId);
}
