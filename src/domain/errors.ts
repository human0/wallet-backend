export class InvalidMoneyError extends Error {
  constructor(value: string) {
    super(`Invalid monetary value: ${value}`);
    this.name = 'InvalidMoneyError';
  }
}
