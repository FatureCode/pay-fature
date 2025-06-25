import { InternalError } from '../common/errors';
import { Token, getTokenDecimals } from './tokens';

/**
 * Converts a `Token` enum value to its corresponding API identifier string.
 *
 * @param token - The token to convert.
 * @returns The API identifier string for the given token.
 * @throws {InternalError} If the token is not supported.
 */
function tokenToApiId(token: Token): string {
  switch (token) {
    case Token.USDC:
      return 'usd-coin';
    case Token.SOL:
      return 'solana';
    default:
      throw new InternalError(`Unsupported token: ${token}`, 400, true);
  }
}

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
export async function amountInTokenDecimals(amountInBrl: number, token: Token): Promise<number> {
  console.log(`Converting ${amountInBrl} BRL to ${token}`);
  if (amountInBrl <= 0) {
    throw new InternalError('Amount must be greater than zero', 400, true);
  }
  const apiId = tokenToApiId(token);
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${apiId}&vs_currencies=brl`;
  try {
    const tokenToBrl = await fetch(url)
      .then((res) => res.json())
      .then((data) => data[apiId].brl);
    console.log(`Exchange rate: 1 ${apiId} = ${tokenToBrl} BRL`);
    const amountInToken = amountInBrl / tokenToBrl;
    console.log(`Converted amount: ${amountInToken} ${apiId}`);
    // Convert to the smallest unit of the token (e.g., for USDC, this would be 6 decimals)
    const amountInTokenDecimals = Math.floor(amountInToken * 10 * getTokenDecimals(token));
    console.log(`Amount in token decimals: ${amountInTokenDecimals}`);
    return amountInTokenDecimals;
  }
  catch (error) {
    throw new InternalError('Error converting amount to Solana', 500, true, error.message);
  }
}
