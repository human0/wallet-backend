import { WalletNotFoundError } from './errors.js';
import {
  type Clock,
  type EventIdGenerator,
  type TransactionRunner,
  type WalletRepository,
  type WithdrawalEventRepository,
} from './ports.js';
import type { Money } from '../domain/money.js';
import type { WithdrawalResult } from '../domain/wallet.js';

export class WithdrawFunds {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly eventRepository: WithdrawalEventRepository,
    private readonly transactionRunner: TransactionRunner,
    private readonly eventIdGenerator: EventIdGenerator,
    private readonly clock: Clock,
  ) {}

  public execute(walletId: string, amount: Money): WithdrawalResult {
    return this.transactionRunner.run(() => {
      const wallet = this.walletRepository.findById(walletId);

      if (!wallet) {
        throw new WalletNotFoundError(walletId);
      }

      const result = wallet.withdraw(amount);

      this.walletRepository.save(wallet);
      this.eventRepository.append({
        id: this.eventIdGenerator(),
        walletId,
        amountMinor: amount.minorUnits,
        currency: 'ZAR',
        occurredAt: this.clock(),
      });

      return result;
    });
  }
}
