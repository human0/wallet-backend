import { InvalidMoneyError } from './errors.js';

const DECIMAL_MONEY_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;
const MINOR_UNITS_PER_UNIT = 100;

export class Money {
  private constructor(public readonly minorUnits: number) {}

  public static fromDecimalString(value: string): Money {
    const match = DECIMAL_MONEY_PATTERN.exec(value);

    if (!match) {
      throw new InvalidMoneyError(value);
    }

    const wholeUnits = Number(match[1]);
    const fractionalUnits = Number((match[2] ?? '').padEnd(2, '0'));
    const minorUnits = wholeUnits * MINOR_UNITS_PER_UNIT + fractionalUnits;

    if (!Number.isSafeInteger(minorUnits)) {
      throw new InvalidMoneyError(value);
    }

    return new Money(minorUnits);
  }

  public static fromMinorUnits(minorUnits: number): Money {
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
      throw new InvalidMoneyError(String(minorUnits));
    }

    return new Money(minorUnits);
  }

  public subtract(other: Money): Money {
    return Money.fromMinorUnits(this.minorUnits - other.minorUnits);
  }

  public toDecimalString(): string {
    const wholeUnits = Math.floor(this.minorUnits / MINOR_UNITS_PER_UNIT);
    const fractionalUnits = String(
      this.minorUnits % MINOR_UNITS_PER_UNIT,
    ).padStart(2, '0');

    return `${wholeUnits}.${fractionalUnits}`;
  }
}
