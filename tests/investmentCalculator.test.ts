import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import {
  calculateExpenses,
  calculateFlipProfit,
  calculateInvestmentOutput,
  calculateRent,
} from '../lib/investmentCalculator';
import { DealDetails, FinancingDetails, RentalDetails, SaleInputs, ShortTermFinancing } from '../lib/types';

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

beforeEach(silenceConsole);
afterEach(restoreConsole);

describe('calculateRent', () => {
  const rentalDetails: RentalDetails = {
    rentalType: 'longTerm',
    monthlyRent: '2000',
    annualAppreciation: '3',
    annualInsurance: '0',
    annualPropertyTax: '0',
    annualMaintenance: '0',
    vacancyRate: '0',
    annualCapex: '0',
    pmFee: '0',
    shortTermPmFee: '0',
    personalUsage: '0',
    leaseUpFee: '0',
    averageLeaseLength: '1',
  };

  test('returns zero when rental type is disabled', () => {
    assert.equal(
      calculateRent(1, 1, { ...rentalDetails, rentalType: 'noRental' }, 0),
      0,
    );
  });

  test('does not generate rent during rehab months', () => {
    assert.equal(calculateRent(1, 2, rentalDetails, 4), 0);
  });

  test('applies annual appreciation after rehab ends', () => {
    const rent = calculateRent(2, 1, rentalDetails, 0);
    assert.equal(Math.round(rent), 2060);
  });
});

describe('calculateExpenses', () => {
  test('calculates long-term expenses with lease-up fees and mortgage', () => {
    const rentalDetails: RentalDetails = {
      rentalType: 'longTerm',
      monthlyRent: '2000',
      annualAppreciation: '0',
      annualInsurance: '1200',
      annualPropertyTax: '2400',
      annualMaintenance: '5',
      vacancyRate: '5',
      annualCapex: '3',
      pmFee: '10',
      shortTermPmFee: '0',
      personalUsage: '0',
      leaseUpFee: '1200',
      averageLeaseLength: '2',
    };

    const expenses = calculateExpenses(
      1,
      1,
      2000,
      100,
      200,
      false,
      rentalDetails,
      'buyAndHold',
    );

    assert.equal(Math.round(expenses), 1110);
  });

  test('includes interest during rehab for short-term rentals', () => {
    const rentalDetails: RentalDetails = {
      rentalType: 'shortMidTerm',
      monthlyRent: '1500',
      annualAppreciation: '0',
      annualInsurance: '1200',
      annualPropertyTax: '1800',
      annualMaintenance: '5',
      vacancyRate: '5',
      annualCapex: '2',
      pmFee: '0',
      shortTermPmFee: '20',
      personalUsage: '10',
      leaseUpFee: '0',
      averageLeaseLength: '1',
    };

    const expenses = calculateExpenses(
      1,
      1,
      1500,
      80,
      50,
      true,
      rentalDetails,
      'flip',
    );

    assert.equal(Math.round(expenses), 960);
  });
});

describe('calculateFlipProfit', () => {
  test('returns profit after sales costs and holding costs', () => {
    const profit = calculateFlipProfit(250000, 320000, 40000, 15000, {
      agentCommission: '6',
      saleClosingCosts: '2',
    });

    assert.equal(profit, -10600);
  });
});

describe('calculateInvestmentOutput', () => {
  test('returns an empty object when inputs are invalid', () => {
    const dealDetails: DealDetails = {
      purchasePrice: '',
      afterRepairValue: '',
      rehabCost: '',
      holdingPeriod: '0',
    };

    const shortTermFinancing: ShortTermFinancing = {
      purchaseLoaned: '80',
      rehabLoaned: '100',
      interestRate: '10',
      lendersPoints: '2',
    };

    const financingDetails: FinancingDetails = {
      loanToValue: '75',
      interestRate: '7',
      loanTerm: '30',
      lenderPoints: '1',
    };

    const rentalDetails: RentalDetails = {
      rentalType: 'noRental',
      monthlyRent: '0',
      annualAppreciation: '0',
      annualInsurance: '0',
      annualPropertyTax: '0',
      annualMaintenance: '0',
      vacancyRate: '0',
      annualCapex: '0',
      pmFee: '0',
      shortTermPmFee: '0',
      personalUsage: '0',
      leaseUpFee: '0',
      averageLeaseLength: '1',
    };

    const saleInputs: SaleInputs = {
      agentCommission: '6',
      saleClosingCosts: '2',
    };

    assert.deepEqual(
      calculateInvestmentOutput('buyAndHold', dealDetails, shortTermFinancing, financingDetails, rentalDetails, saleInputs),
      {},
    );
  });
});
