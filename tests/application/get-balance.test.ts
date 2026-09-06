import { describe, expect, it } from 'vitest';
import { WalletNotFoundError } from '../../src/application/errors.js';
import type { WalletReader } from '../../src/application/ports.js';
import { GetBalance } from '../../src/application/get-balance.js';
import { Money } from '../../src/domain/money.js';
import { Wallet } from '../../src/domain/wallet.js';

class InMemoryWalletReader implements WalletReader {
  public readonly wallets = new Map<string, Wallet>();

  findById(walletId: string): Wallet | undefined {
    return this.wallets.get(walletId);
  }
}

describe('GetBalance', () => {
  it('returns the wallet when it exists', () => {
    const repository = new InMemoryWalletReader();
    repository.wallets.set(
      'wallet-001',
      new Wallet('wallet-001', Money.fromDecimalString('1000.00')),
    );
    const useCase = new GetBalance(repository);

    const wallet = useCase.execute('wallet-001');

    expect(wallet.balance.toDecimalString()).toBe('1000.00');
  });

  it('throws when the wallet does not exist', () => {
    const repository = new InMemoryWalletReader();
    const useCase = new GetBalance(repository);

    expect(() => useCase.execute('missing-wallet')).toThrow(
      WalletNotFoundError,
    );
  });
});
