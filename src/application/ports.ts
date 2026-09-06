import type { Wallet } from '../domain/wallet.js';

export interface WalletReader {
  findById(walletId: string): Wallet | undefined;
}
