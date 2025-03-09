import { FEE } from './constants';
import type { VercelRequestQuery } from '@vercel/node';

export interface APIError {
  userMessage: string,
  errorCode: number,
  // Should only be used for debugging purposes.
  internalMessage?: string,
  retriable: boolean,
}

export interface TransactionAmount {
  toMerchant: bigint,
  fee: bigint
}

/**
 * Calculates the transaction amount in Lamports, including the fee and the amount to the merchant.
 *
 * @param transactionTotalInLamports - The total transaction amount in Lamports as a bigint.
 * @returns An object containing the fee amount and the amount to the merchant.
 */
export function calculateLamportTransactionAmount(transactionTotalInLamports: bigint): TransactionAmount {
  const feeAmount = BigInt(Math.round(Number(transactionTotalInLamports) * FEE));
  const toMerchantAmount = transactionTotalInLamports - feeAmount;
  return {
    fee: feeAmount,
    toMerchant: toMerchantAmount
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
 * Converts an amount in Brazilian Real (BRL) to Solana (SOL).
 *
 * This function fetches the current exchange rate from the CoinGecko API and uses it to convert the given amount in BRL to SOL.
 *
 * @param {number} amountInBrl - The amount in Brazilian Real to be converted.
 * @returns {Promise<number>} - A promise that resolves to the equivalent amount in Solana.
 *
 * @throws {Error} - Throws an error if the fetch request fails or if the response data is not in the expected format.
 */
export async function amountInBrlToSol(amountInBrl: number): Promise<number> {
  const solToBrl = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=brl').then((res) => res.json()).then((data) => data.solana.brl);
  const amountInSol = amountInBrl / solToBrl;
  return amountInSol;
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
    throw new Error("Invalid transactionId from request");
  }
}

export function validateTransactionUserVisibleId(userVisibleTransactionId: string) {
  if (!userVisibleTransactionId) {
    throw new Error("Invalid user visible transaction id");
  }
  if (!isValidTransactionUserVisibleId(userVisibleTransactionId)) {
    throw new Error("Invalid user visible transaction id");
  }
}

function isValidTransactionUserVisibleId(transactionUserVisibleId: string): boolean {
  return /^[A-Z]{TRANSACTION_REFERENCE_LENGTH}$/.test(transactionUserVisibleId);
}
