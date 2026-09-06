import { describe, expect, it } from 'vitest';
import {
  InsufficientFundsError,
  InvalidWithdrawalError,
} from '../../src/domain/errors.js';
import { Money } from '../../src/domain/money.js';
import { Wallet } from '../../src/domain/wallet.js';

describe('Wallet', () => {
  it('reduces the balance after a successful withdrawal', () => {
    const wallet = new Wallet('wallet-001', Money.fromDecimalString('100.00'));

    const withdrawal = wallet.withdraw(Money.fromDecimalString('25.50'));

    expect(withdrawal.amount.toDecimalString()).toBe('25.50');
    expect(withdrawal.remainingBalance.toDecimalString()).toBe('74.50');
    expect(wallet.balance.toDecimalString()).toBe('74.50');
  });

  it('allows withdrawing the entire balance', () => {
    const wallet = new Wallet('wallet-001', Money.fromDecimalString('100.00'));

    wallet.withdraw(Money.fromDecimalString('100.00'));

    expect(wallet.balance.toDecimalString()).toBe('0.00');
  });

  it('rejects a withdrawal larger than the balance without mutating state', () => {
    const wallet = new Wallet('wallet-001', Money.fromDecimalString('100.00'));

    expect(() => wallet.withdraw(Money.fromDecimalString('100.01'))).toThrow(
      InsufficientFundsError,
    );
    expect(wallet.balance.toDecimalString()).toBe('100.00');
  });

  it('rejects a zero withdrawal', () => {
    const wallet = new Wallet('wallet-001', Money.fromDecimalString('100.00'));

    expect(() => wallet.withdraw(Money.fromDecimalString('0.00'))).toThrow(
      InvalidWithdrawalError,
    );
  });
});
