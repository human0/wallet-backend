import { describe, expect, it } from 'vitest';
import { WalletNotFoundError } from '../../src/application/errors.js';
import {
  type WithdrawalEvent,
  type WalletRepository,
  type WithdrawalEventRepository,
  type TransactionRunner,
} from '../../src/application/ports.js';
import { WithdrawFunds } from '../../src/application/withdraw-funds.js';
import { InsufficientFundsError } from '../../src/domain/errors.js';
import { Money } from '../../src/domain/money.js';
import { Wallet } from '../../src/domain/wallet.js';

class InMemoryWalletRepository implements WalletRepository {
  public readonly wallets = new Map<string, Wallet>();

  findById(walletId: string): Wallet | undefined {
    return this.wallets.get(walletId);
  }

  save(wallet: Wallet): void {
    this.wallets.set(wallet.id, wallet);
  }
}

class InMemoryEventRepository implements WithdrawalEventRepository {
  public readonly events: WithdrawalEvent[] = [];

  append(event: WithdrawalEvent): void {
    this.events.push(event);
  }
}

class ImmediateTransactionRunner implements TransactionRunner {
  run<T>(operation: () => T): T {
    return operation();
  }
}

const createUseCase = () => {
  const walletRepository = new InMemoryWalletRepository();
  const eventRepository = new InMemoryEventRepository();
  const useCase = new WithdrawFunds(
    walletRepository,
    eventRepository,
    new ImmediateTransactionRunner(),
    () => 'event-001',
    () => new Date('2026-09-06T12:00:00.000Z'),
  );

  return { walletRepository, eventRepository, useCase };
};

describe('WithdrawFunds', () => {
  it('withdraws funds and creates one event in the transaction', () => {
    const { walletRepository, eventRepository, useCase } = createUseCase();
    walletRepository.wallets.set(
      'wallet-001',
      new Wallet('wallet-001', Money.fromDecimalString('1000.00')),
    );

    const result = useCase.execute(
      'wallet-001',
      Money.fromDecimalString('250.00'),
    );

    expect(result.remainingBalance.toDecimalString()).toBe('750.00');
    expect(eventRepository.events).toEqual([
      {
        id: 'event-001',
        walletId: 'wallet-001',
        amountMinor: 25000,
        currency: 'ZAR',
        occurredAt: new Date('2026-09-06T12:00:00.000Z'),
      },
    ]);
  });

  it('does not create an event when funds are insufficient', () => {
    const { walletRepository, eventRepository, useCase } = createUseCase();
    walletRepository.wallets.set(
      'wallet-001',
      new Wallet('wallet-001', Money.fromDecimalString('100.00')),
    );

    expect(() =>
      useCase.execute('wallet-001', Money.fromDecimalString('100.01')),
    ).toThrow(InsufficientFundsError);
    expect(eventRepository.events).toHaveLength(0);
  });

  it('rejects an unknown wallet', () => {
    const { eventRepository, useCase } = createUseCase();

    expect(() =>
      useCase.execute('missing-wallet', Money.fromDecimalString('10.00')),
    ).toThrow(WalletNotFoundError);
    expect(eventRepository.events).toHaveLength(0);
  });
});
