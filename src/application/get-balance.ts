import { WalletNotFoundError } from './errors.js';
import type { WalletReader } from './ports.js';
import type { Wallet } from '../domain/wallet.js';

export class GetBalance {
  constructor(private readonly walletRepository: WalletReader) {}

  public execute(walletId: string): Wallet {
    const wallet = this.walletRepository.findById(walletId);

    if (!wallet) {
      throw new WalletNotFoundError(walletId);
    }

    return wallet;
  }
}
