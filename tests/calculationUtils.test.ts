import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import {
  calculateMortgagePayment,
  calculateRehabDuration,
  calculateTotalCashFlow,
  findMaxTotalCashInvested,
  findMinTotalCashInvested,
  formatNumber,
  formatPDFNumber,
  roundToDollar,
  validateCalculationInputs,
} from '../lib/calculationUtils';
import { CalculatedOutputType } from '../lib/types';

const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const silenceConsole = () => {
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
};

const restoreConsole = () => {
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
};

const createMonthData = (overrides: Partial<CalculatedOutputType[number]['months'][number]> = {}) => ({
  value: 0,
  debt: 0,
  equity: 0,
  cashInvested: 0,
  totalCashInvested: 0,
  interestPaid: 0,
  rent: 0,
  expenses: 0,
  cashFlow: 0,
  totalReturn: 0,
  returnOnInvestedCash: 0,
  dscr: 0,
  equityGrowth: 0,
  ...overrides,
});

const createYearlyTotals = (overrides: Partial<CalculatedOutputType[number]['yearlyTotals']> = {}) => ({
  interestPaid: 0,
  rent: 0,
  expenses: 0,
  cashFlow: 0,
  totalReturn: 0,
  cashInvested: 0,
  totalCashInvested: 0,
  returnOnInvestedCash: 0,
  dscr: 0,
  equityGrowth: 0,
  ...overrides,
});

beforeEach(silenceConsole);
afterEach(restoreConsole);

describe('calculationUtils formatting helpers', () => {
  test('roundToDollar rounds to the nearest whole number', () => {
    assert.equal(roundToDollar(123.6), 124);
    assert.equal(roundToDollar(123.4), 123);
  });

  test('formatNumber returns an absolute value with two decimals', () => {
    assert.equal(formatNumber(-1234.5), '1,234.50');
    assert.equal(formatNumber(50), '50.00');
  });

  test('formatPDFNumber formats with default and custom prefixes', () => {
    assert.equal(formatPDFNumber(1500), '$1,500');
    assert.equal(formatPDFNumber(2000, '€'), '€2,000');
  });
});

describe('cash investment helpers', () => {
  test('findMaxTotalCashInvested finds the highest monthly cash requirement', () => {
    const output: CalculatedOutputType = {
      1: {
        months: {
          1: createMonthData({ totalCashInvested: 5000 }),
          2: createMonthData({ totalCashInvested: 7500 }),
        },
        yearlyTotals: createYearlyTotals(),
      },
      2: {
        months: {
          1: createMonthData({ totalCashInvested: 2000 }),
        },
        yearlyTotals: createYearlyTotals(),
      },
    };

    assert.equal(findMaxTotalCashInvested(output), 7500);
  });

  test('findMinTotalCashInvested respects BRRRR refinance timing', () => {
    const output: CalculatedOutputType = {
      1: {
        months: {
          1: createMonthData({ totalCashInvested: 9000 }),
          2: createMonthData({ totalCashInvested: 4500 }),
          3: createMonthData({ totalCashInvested: 1200 }),
        },
        yearlyTotals: createYearlyTotals(),
      },
    };

    assert.equal(
      findMinTotalCashInvested(output, 'brrrr', { holdingPeriod: '2' }),
      1200,
    );
  });

  test('findMinTotalCashInvested finds the smallest non-zero cash amount for other strategies', () => {
    const output: CalculatedOutputType = {
      1: {
        months: {
          1: createMonthData({ totalCashInvested: 0 }),
          2: createMonthData({ totalCashInvested: 3000 }),
          3: createMonthData({ totalCashInvested: 1500 }),
        },
        yearlyTotals: createYearlyTotals(),
      },
    };

    assert.equal(findMinTotalCashInvested(output, 'buyAndHold'), 1500);
  });
});

describe('portfolio rollups', () => {
  test('calculateTotalCashFlow sums cash flow across years', () => {
    const output: CalculatedOutputType = {
      1: {
        months: { 1: createMonthData() },
        yearlyTotals: createYearlyTotals({ cashFlow: 1000 }),
      },
      2: {
        months: { 1: createMonthData() },
        yearlyTotals: createYearlyTotals({ cashFlow: -250 }),
      },
    };

    assert.equal(calculateTotalCashFlow(output), 750);
  });
});

describe('financial formulas', () => {
  test('calculateMortgagePayment returns expected amortized payment', () => {
    const payment = calculateMortgagePayment(200000, 0.05 / 12, 360);
    assert.ok(payment > 0);
    assert.equal(Math.round(payment * 100) / 100, 1073.64);
  });

  test('calculateRehabDuration enforces at least one month and rounds up', () => {
    assert.equal(calculateRehabDuration(0), 1);
    assert.equal(calculateRehabDuration(45000), 2);
  });
});

describe('validation helpers', () => {
  test('validateCalculationInputs passes valid numeric inputs', () => {
    assert.equal(
      validateCalculationInputs(
        { purchasePrice: 250000, afterRepairValue: 300000 },
        ['purchasePrice', 'afterRepairValue'],
      ),
      true,
    );
  });

  test('validateCalculationInputs fails on missing or invalid numbers', () => {
    assert.equal(
      validateCalculationInputs({ purchasePrice: NaN }, ['purchasePrice', 'afterRepairValue']),
      false,
    );
  });
});
