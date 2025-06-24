export enum Token {
  USDC = 'USDC',
  SOL = 'SOL',
}

/**
 * Returns the SPL mint address for a given token.
 *
 * @param token - The token for which to retrieve the SPL mint address.
 * @returns The SPL mint address as a string.
 * @throws Will throw an error if the token is SOL or an unsupported token.
 */
export function getSPLMintAddress(token: Token): string {
  switch (token) {
    case Token.USDC:
      return 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint address
    case Token.SOL:
      throw new Error(`Unsupported token for SPL mint address: ${token}`);
    default:
      throw new Error(`Unsupported token: ${token}`);
  }
}

/**
 * Returns the number of decimal places for a given token.
 *
 * @param token - The token for which to retrieve the decimal precision.
 * @returns The number of decimals used by the specified token.
 * @throws Will throw an error if the token is unsupported.
 */
export function getTokenDecimals(token: Token): number {
  switch (token) {
    case Token.USDC:
      return 6; // USDC has 6 decimals
    case Token.SOL:
      return 9; // SOL has 9 decimals
    default:
      throw new Error(`Unsupported token: ${token}`);
  }
}