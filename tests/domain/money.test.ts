import { describe, expect, it } from 'vitest';
import { InvalidMoneyError } from '../../src/domain/errors.js';
import { Money } from '../../src/domain/money.js';

describe('Money', () => {
  it.each([
    ['0', 0, '0.00'],
    ['1', 100, '1.00'],
    ['1.2', 120, '1.20'],
    ['1.20', 120, '1.20'],
    ['1000.99', 100099, '1000.99'],
  ])('parses %s as %s minor units', (value, minorUnits, formatted) => {
    const money = Money.fromDecimalString(value);

    expect(money.minorUnits).toBe(minorUnits);
    expect(money.toDecimalString()).toBe(formatted);
  });

  it.each(['', ' ', '-1.00', '+1.00', '1.234', '1e2', '1,000.00', 'NaN'])(
    'rejects invalid amount %s',
    (value) => {
      expect(() => Money.fromDecimalString(value)).toThrow(InvalidMoneyError);
    },
  );

  it('subtracts without floating-point arithmetic', () => {
    const result = Money.fromDecimalString('10.00').subtract(
      Money.fromDecimalString('0.10'),
    );

    expect(result.toDecimalString()).toBe('9.90');
  });
});
