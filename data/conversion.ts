import { InternalError } from '../common/errors';

/**
 * Converts an amount in Brazilian Real (BRL) to Solana (SOL).
 *
 * This function fetches the current exchange rate from the CoinGecko API and uses
 * it to convert the given amount in BRL to SOL.
 *
 * @param {number} amountInBrl - The amount in Brazilian Real to be converted.
 * @returns {Promise<number>} - A promise that resolves to the equivalent amount
 * in Solana.
 *
 * @throws {InternalError} - Throws an error if the fetch request fails or if the
 * response data is not in the expected format.
 */
export async function amountInBrlToSol(amountInBrl: number): Promise<number> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price' +
      '?ids=solana&vs_currencies=brl';
    const solToBrl = await fetch(url)
      .then((res) => res.json())
      .then((data) => data.solana.brl);
    const amountInSol = amountInBrl / solToBrl;
    return amountInSol;
  }
  catch (error) {
    throw new InternalError('Error converting amount to Solana', 500, true, error.message);
  }
}
