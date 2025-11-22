import { logger } from './logger';
import { CalculatedOutputType } from './types';

/**
 * Rounds a number to the nearest dollar
 */
export const roundToDollar = (value: number): number => {
  const rounded = Math.round(value);
  logger.debug('Rounded to dollar', { value, rounded });
  return rounded;
};

/**
 * Formats a number with 2 decimal places
 */
export const formatNumber = (num: number): string => {
  const formatted = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  logger.debug('Formatted number', { num, formatted });
  return formatted;
};

/**
 * Formats a number for PDF display, with a prefix (default: $)
 */
export const formatPDFNumber = (value: number, prefix: string = '$'): string => {
  const formattedValue = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  logger.debug('Formatted PDF number', { value, formattedValue });
  return `${prefix}${formattedValue}`;
};

/**
 * Finds the maximum total cash invested across all months
 */
export const findMaxTotalCashInvested = (output: CalculatedOutputType): number => {
  let maxCash = 0;
  Object.keys(output).forEach(year => {
    Object.keys(output[parseInt(year)].months).forEach(month => {
      const totalCashInvested = output[parseInt(year)].months[parseInt(month)].totalCashInvested;
      if (totalCashInvested > maxCash) {
        maxCash = totalCashInvested;
      }
    });
  });
  logger.debug('Found max total cash invested', { maxCash });
  return maxCash;
};

/**
 * Finds the minimum total cash invested after refinance (for BRRRR)
 */
export const findMinTotalCashInvested = (
  output: CalculatedOutputType, 
  type: string = 'buyAndHold',
  details: { holdingPeriod: string } = { holdingPeriod: '0' }
): number => {
  logger.debug('Finding after refinance cash invested', { type, details });
  
  // For BRRRR, we want the total cash invested in the month after refinance
  if (type === 'brrrr') {
    const rehabDuration = parseInt(details.holdingPeriod) || 0;
    const refinanceMonth = rehabDuration + 1;
    const refinanceYear = Math.floor(refinanceMonth / 12) + 1;
    const monthInYear = refinanceMonth % 12 || 12;
    
    logger.debug('Refinance timing calculated:', { rehabDuration, refinanceMonth, refinanceYear, monthInYear });
    
    // Return the total cash invested for the refinance month
    return output[refinanceYear]?.months[monthInYear]?.totalCashInvested || 0;
  }
  
  // For other investment types, find the minimum non-zero total cash invested
  let minCash = Infinity;
  Object.keys(output).forEach(year => {
    Object.keys(output[parseInt(year)].months).forEach(month => {
      const totalCashInvested = output[parseInt(year)].months[parseInt(month)].totalCashInvested;
      if (totalCashInvested > 0 && totalCashInvested < minCash) {
        minCash = totalCashInvested;
      }
    });
  });
  
  logger.debug('Found min total cash invested', { minCash });
  return minCash === Infinity ? 0 : minCash;
};

/**
 * Calculates the total cash flow across all months
 */
export const calculateTotalCashFlow = (output: CalculatedOutputType): number => {
  let totalCashFlow = 0;
  Object.keys(output).forEach(year => {
    totalCashFlow += output[parseInt(year)].yearlyTotals.cashFlow;
  });
  logger.debug('Calculated total cash flow', { totalCashFlow });
  return totalCashFlow;
};

/**
 * Calculates a mortgage payment
 */
export const calculateMortgagePayment = (principal: number, rate: number, termMonths: number): number => {
  const numerator = principal * rate * Math.pow(1 + rate, termMonths);
  const denominator = Math.pow(1 + rate, termMonths) - 1;
  const payment = numerator / denominator;
  
  logger.debug('Calculated mortgage payment details', { 
    principal, 
    rate: rate * 12 * 100, // Show annualized rate in percentage
    termMonths, 
    termYears: termMonths / 12,
    numerator,
    denominator,
    payment,
    monthlyInterest: principal * rate,
    formula: "P*r*(1+r)^n/((1+r)^n-1)"
  });
  
  return payment;
};

/**
 * Calculates the duration of a rehab project based on its cost
 */
export const calculateRehabDuration = (rehabCost: number): number => {
  // Default to 1 month minimum
  let duration = 1;
  
  // Basic formula: 1 month for every $30,000 in rehab with a minimum of 1 month
  if (rehabCost > 0) {
    duration = Math.max(1, Math.ceil(rehabCost / 30000));
  }
  
  logger.debug('Calculated rehab duration', { 
    rehabCost, 
    duration, 
    formulaApplied: 'Math.max(1, Math.ceil(rehabCost / 30000))',
    monthsPerThirtyK: 'One month per $30,000 spent on rehab',
    rawCalculation: rehabCost / 30000,
    roundedUp: Math.ceil(rehabCost / 30000)
  });
  
  return duration;
};

/**
 * Validates numerical inputs for calculations to prevent errors
 */
export const validateCalculationInputs = (inputs: Record<string, any>, requiredFields: string[] = []): boolean => {
  let isValid = true;
  const issues: string[] = [];
  
  // Check if all required fields are present and are valid numbers
  requiredFields.forEach(field => {
    if (!(field in inputs)) {
      issues.push(`Missing required field: ${field}`);
      isValid = false;
      return;
    }
    
    const value = inputs[field];
    if (typeof value !== 'number' || isNaN(value)) {
      issues.push(`Invalid value for ${field}: ${value} (must be a number)`);
      isValid = false;
    }
  });
  
  // Check all fields for valid numbers
  Object.entries(inputs).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      issues.push(`Null or undefined value for ${key}`);
      isValid = false;
      return;
    }
    
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      issues.push(`Invalid numerical value for ${key}: ${value}`);
      isValid = false;
    }
  });
  
  logger.debug('Validated calculation inputs', { 
    isValid, 
    issues,
    inputs
  });
  
  return isValid;
}; 