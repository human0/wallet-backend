export class InvalidMoneyError extends Error {
  constructor(value: string) {
    super(`Invalid monetary value: ${value}`);
    this.name = 'InvalidMoneyError';
  }
}

export class InvalidWithdrawalError extends Error {
  constructor() {
    super('Withdrawal amount must be greater than zero');
    this.name = 'InvalidWithdrawalError';
  }
}

export class InsufficientFundsError extends Error {
  constructor() {
    super('Insufficient funds');
    this.name = 'InsufficientFundsError';
  }
}
