import { InsufficientFundsError, InvalidWithdrawalError } from './errors.js';
import { Money } from './money.js';

export type WithdrawalResult = {
  amount: Money;
  remainingBalance: Money;
};

export class Wallet {
  private currentBalance: Money;

  constructor(
    public readonly id: string,
    balance: Money,
  ) {
    this.currentBalance = balance;
  }

  public get balance(): Money {
    return this.currentBalance;
  }

  public withdraw(amount: Money): WithdrawalResult {
    if (amount.minorUnits <= 0) {
      throw new InvalidWithdrawalError();
    }

    if (amount.minorUnits > this.currentBalance.minorUnits) {
      throw new InsufficientFundsError();
    }

    const remainingBalance = this.currentBalance.subtract(amount);
    this.currentBalance = remainingBalance;

    return { amount, remainingBalance };
  }
}
