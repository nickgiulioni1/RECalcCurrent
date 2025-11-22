import { logger } from './logger';
import { CalculatedOutputType, DealDetails, FinancingDetails, RentalDetails, ShortTermFinancing, SaleInputs } from './types';
import { calculateMortgagePayment, validateCalculationInputs } from './calculationUtils';

/**
 * Calculates rental income for a specific year and month
 */
export const calculateRent = (
  year: number, 
  month: number, 
  rentalDetails: RentalDetails, 
  rehabDuration: number
): number => {
  logger.debug('Calculating rent', { year, month, rentalType: rentalDetails.rentalType });
  
  if (rentalDetails.rentalType === 'noRental') {
    logger.debug('No rental income - property not rented', { year, month });
    return 0;
  }

  const totalMonths = (year - 1) * 12 + month;
  
  if (totalMonths <= rehabDuration) {
    logger.debug('No rental income - property under rehab', { 
      year, 
      month, 
      totalMonths, 
      rehabDuration, 
      remainingRehabMonths: rehabDuration - totalMonths + 1
    });
    return 0;
  }

  const monthsSinceRehab = totalMonths - rehabDuration;
  const yearsElapsed = Math.floor(monthsSinceRehab / 12);
  
  // Use the monthly rent from rentalDetails
  const baseMonthlyRent = parseFloat(rentalDetails.monthlyRent) || 0;
  const annualAppreciationRate = parseFloat(rentalDetails.annualAppreciation) / 100;
  const appreciationFactor = Math.pow(1 + annualAppreciationRate, yearsElapsed);
  const calculatedRent = baseMonthlyRent * appreciationFactor;
  
  logger.debug('Calculated rent with appreciation', { 
    baseMonthlyRent, 
    annualAppreciationRate: (annualAppreciationRate * 100).toFixed(2) + '%',
    yearsElapsed,
    appreciationFactor,
    calculatedRent,
    monthsSinceRehab,
    formula: 'baseRent * (1 + annualRate)^yearsElapsed'
  });
  
  return calculatedRent;
};

/**
 * Calculates expenses for a property
 */
export const calculateExpenses = (
  year: number,
  month: number,
  monthlyRent: number,
  interestPaid: number,
  principalPaid: number,
  isRehabPeriod: boolean,
  rentalDetails: RentalDetails,
  investmentType: string
): number => {
  logger.debug('Calculating expenses', { year, month, isRehabPeriod });
  
  const annualAppreciation = parseFloat(rentalDetails.annualAppreciation) / 100 || 0;
  const annualInsurance = parseFloat(rentalDetails.annualInsurance) || 0;
  const annualPropertyTax = parseFloat(rentalDetails.annualPropertyTax) || 0;
  
  // Apply appreciation only from year 2 onwards
  const appreciationFactor = year > 1 ? Math.pow(1 + annualAppreciation, year - 1) : 1;
  
  let expenses = appreciationFactor * (annualInsurance / 12 + annualPropertyTax / 12);

  if (rentalDetails.rentalType === 'longTerm') {
    const annualMaintenance = parseFloat(rentalDetails.annualMaintenance) / 100 || 0;
    const vacancyRate = parseFloat(rentalDetails.vacancyRate) / 100 || 0;
    const annualCapex = parseFloat(rentalDetails.annualCapex) / 100 || 0;
    const pmFee = parseFloat(rentalDetails.pmFee) / 100 || 0;
    const leaseUpFee = parseFloat(rentalDetails.leaseUpFee) || 0;
    const averageLeaseLength = parseFloat(rentalDetails.averageLeaseLength) || 1;

    expenses += monthlyRent * (annualMaintenance + vacancyRate + annualCapex + pmFee) +
                leaseUpFee / (12 * averageLeaseLength);
  } else if (rentalDetails.rentalType === 'shortMidTerm') {
    const annualMaintenance = parseFloat(rentalDetails.annualMaintenance) / 100 || 0;
    const vacancyRate = parseFloat(rentalDetails.vacancyRate) / 100 || 0;
    const annualCapex = parseFloat(rentalDetails.annualCapex) / 100 || 0;
    const pmFee = parseFloat(rentalDetails.shortTermPmFee) / 100 || 0;
    const personalUsage = parseFloat(rentalDetails.personalUsage) / 100 || 0;

    expenses += monthlyRent * (annualMaintenance + vacancyRate + annualCapex + pmFee + personalUsage);
  }

  // Add interest paid to expenses during rehab period for BRRRR and Flip
  if (isRehabPeriod && (investmentType === 'brrrr' || investmentType === 'flip')) {
    expenses += Math.abs(interestPaid);
  }

  // Add the entire mortgage payment (interest + principal) to expenses only after rehab period
  if (!isRehabPeriod) {
    expenses += Math.abs(interestPaid) + Math.abs(principalPaid);
  }

  logger.debug('Calculated expenses', { expenses });
  return isNaN(expenses) ? 0 : expenses;
};

/**
 * Calculates profit for a flip investment
 */
export const calculateFlipProfit = (
  purchasePrice: number,
  afterRepairValue: number,
  rehabCost: number,
  holdingCosts: number,
  saleInputs: SaleInputs
): number => {
  const agentCommission = parseFloat(saleInputs.agentCommission) / 100;
  const saleClosingCosts = parseFloat(saleInputs.saleClosingCosts) / 100;
  
  const totalSalesCosts = afterRepairValue * (agentCommission + saleClosingCosts);
  const totalInvestment = purchasePrice + rehabCost + holdingCosts;
  
  const profit = afterRepairValue - totalInvestment - totalSalesCosts;
  const profitMargin = profit / totalInvestment * 100;
  const returnOnInvestment = profit / totalInvestment * 100;
  
  logger.info('Calculated flip profit details', { 
    purchasePrice, 
    afterRepairValue, 
    rehabCost, 
    holdingCosts,
    totalInvestment,
    agentCommission: (agentCommission * 100).toFixed(2) + '%',
    saleClosingCosts: (saleClosingCosts * 100).toFixed(2) + '%',
    totalSalesCosts,
    profit,
    profitMargin: profitMargin.toFixed(2) + '%',
    returnOnInvestment: returnOnInvestment.toFixed(2) + '%',
    formulaUsed: 'ARV - (Purchase + Rehab + Holding) - (ARV * (AgentFee + ClosingCosts))'
  });
  
  return profit;
};

/**
 * Calculates all real estate investment projections 
 */
export const calculateInvestmentOutput = (
  investmentType: string,
  dealDetails: DealDetails,
  shortTermFinancing: ShortTermFinancing,
  financingDetails: FinancingDetails,
  rentalDetails: RentalDetails,
  saleInputs: SaleInputs
): CalculatedOutputType => {
  logger.info('Calculating investment output', { 
    investmentType, 
    dealDetails,
    shortTermFinancing,
    financingDetails,
    rentalDetails,
    saleInputs
  });

  const output: CalculatedOutputType = {};
  const purchasePrice = parseFloat(dealDetails.purchasePrice);
  const afterRepairValue = parseFloat(dealDetails.afterRepairValue);
  const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
  
  // Validate key inputs
  const isValid = validateCalculationInputs(
    {
      purchasePrice,
      afterRepairValue,
      rehabCost,
      loanToValue: parseFloat(financingDetails.loanToValue) / 100,
      longTermInterestRate: parseFloat(financingDetails.interestRate) / 100 / 12,
      loanTermMonths: parseInt(financingDetails.loanTerm) * 12
    },
    ['purchasePrice', 'afterRepairValue']
  );
  
  if (!isValid) {
    logger.error('Invalid inputs for investment calculation, returning empty object', {
      purchasePrice,
      afterRepairValue,
      rehabCost
    });
    return {};
  }

  // Ensure minimum rehab duration of 1 month for BRRRR and flip
  const rehabDuration = (investmentType === 'brrrr' || investmentType === 'flip') 
    ? Math.max(1, parseInt(dealDetails.holdingPeriod) || 0)
    : parseInt(dealDetails.holdingPeriod) || 0;
  
  // Calculate monthly appreciation rate
  const annualAppreciation = parseFloat(rentalDetails.annualAppreciation) / 100 || 0;
  const monthlyAppreciation = Math.pow(1 + annualAppreciation, 1/12) - 1;
  
  // Calculate the month when the property will be sold for flips
  const saleMonth = investmentType === 'flip' ? rehabDuration + 1 : 0;
  
  // Long term financing details
  const loanToValue = parseFloat(financingDetails.loanToValue) / 100;
  const longTermInterestRate = parseFloat(financingDetails.interestRate) / 100 / 12; // monthly rate
  const loanTermMonths = parseInt(financingDetails.loanTerm) * 12;
  const longTermLenderPoints = parseFloat(financingDetails.lenderPoints) / 100;

  // Short term financing details
  const purchaseLoaned = parseFloat(shortTermFinancing.purchaseLoaned) / 100;
  const rehabLoaned = parseFloat(shortTermFinancing.rehabLoaned) / 100;
  const shortTermInterestRate = parseFloat(shortTermFinancing.interestRate) / 100 / 12; // monthly rate

  let runningTotalCashInvested = 0;

  for (let year = 1; year <= 30; year++) {
    // Initialize the year object first
    output[year] = {
      months: {},
      yearlyTotals: {
        interestPaid: 0,
        rent: 0,
        expenses: 0,
        cashFlow: 0,
        totalReturn: 0,
        cashInvested: 0,
        totalCashInvested: 0,
        returnOnInvestedCash: 0,
        dscr: 0,
        equityGrowth: 0
      }
    };

    // Calculate monthly values
    for (let month = 1; month <= 12; month++) {
      const totalMonths = (year - 1) * 12 + month;
      const isRehabPeriod = totalMonths <= rehabDuration;
      
      // Skip calculation for future years if it's a flip and we've passed the sale month
      if (investmentType === 'flip' && totalMonths > saleMonth) {
        continue;
      }

      let value = 0;
      let debt = 0;
      let equity = 0;
      let interestPaid = 0;
      let principalPaid = 0;
      let cashInvested = 0;
      let totalCashInvested = 0;
      let equityGrowth = 0;
      
      // Calculate specific values based on investment type
      if (investmentType === 'flip') {
        // Flip-specific calculations
        if (totalMonths < saleMonth) {
          // Set proper value based on rehab stage
          if (isRehabPeriod) {
            // During rehab, value is purchase price
            value = purchasePrice;
            logger.info('Flip - During rehab using purchase price', {
              totalMonths,
              rehabDuration,
              value: purchasePrice
            });
          } else if (totalMonths === rehabDuration + 1) {
            // Sale month - value jumps to ARV
            value = afterRepairValue;
            logger.info('Flip - Sale month using ARV', {
              totalMonths,
              rehabDuration,
              value: afterRepairValue
            });
          }
          
          // During rehab period, use short-term financing
          if (isRehabPeriod) {
            // First month: purchase and initial rehab
            if (totalMonths === 1) {
              // Calculate down payment
              const downPayment = purchasePrice * (1 - purchaseLoaned);
              // Calculate rehab payment
              const rehabPayment = rehabCost * (1 - rehabLoaned) / rehabDuration;
              cashInvested = downPayment + rehabPayment;
              
              // Calculate short-term financing
              debt = purchasePrice * purchaseLoaned + rehabCost * rehabLoaned / rehabDuration;
              interestPaid = -1 * debt * shortTermInterestRate;
            } else {
              // Subsequent rehab months: just the monthly rehab costs
              const rehabPayment = rehabCost * (1 - rehabLoaned) / rehabDuration;
              cashInvested = rehabPayment;
              
              // Update debt with additional rehab loan
              debt = output[year].months[month - 1]?.debt || 0;
              debt += rehabCost * rehabLoaned / rehabDuration;
              interestPaid = -1 * debt * shortTermInterestRate;
            }
          }
          
          // Calculate equity
          equity = value - debt;
          
          // Calculate equity growth for flip
          if (isRehabPeriod) {
            // No equity growth during rehab
            equityGrowth = 0;
            logger.debug('Flip - No equity growth during rehab', {
              totalMonths,
              rehabDuration
            });
          } else if (totalMonths === rehabDuration + 1) {
            // On sale month, equity growth is the jump from purchase price to ARV
            equityGrowth = afterRepairValue - purchasePrice;
            logger.info('Flip - Equity growth on sale', {
              totalMonths,
              purchasePrice,
              afterRepairValue,
              equityGrowth
            });
          }
        }
      } else if (investmentType === 'brrrr') {
        // BRRRR-specific calculations
        
        // Set proper value based on rehab stage
        if (isRehabPeriod) {
          // During rehab, value is purchase price
          value = purchasePrice;
          logger.info('BRRRR - During rehab using purchase price', {
            totalMonths,
            rehabDuration,
            value: purchasePrice
          });
        } else if (totalMonths === rehabDuration + 1) {
          // First month after rehab: jump to ARV
          value = afterRepairValue;
          logger.info('BRRRR - First month after rehab using ARV', {
            totalMonths,
            rehabDuration,
            value: afterRepairValue
          });
        } else {
          // After ARV, apply normal appreciation
          const monthsSinceARV = totalMonths - (rehabDuration + 1);
          value = afterRepairValue * Math.pow(1 + monthlyAppreciation, monthsSinceARV);
          logger.info('BRRRR - Normal appreciation after ARV', {
            totalMonths,
            rehabDuration,
            monthsSinceARV,
            value
          });
        }
        
        // Add detailed logging for refinance moment
        const isRefinanceMonth = totalMonths === rehabDuration + 1;
        
        if (isRefinanceMonth) {
          logger.info('REFINANCE OCCURRING', {
            totalMonths,
            rehabDuration,
            month,
            year,
            afterRepairValue,
            prevMonthValue: totalMonths > 1 ? afterRepairValue * Math.pow(1 + monthlyAppreciation, totalMonths - 2) : 0,
            currentValue: value
          });
        }

        // During rehab period, use short-term financing
        if (isRehabPeriod) {
          // First month: purchase and initial rehab
          if (totalMonths === 1) {
            // Calculate down payment
            const downPayment = purchasePrice * (1 - purchaseLoaned);
            // Calculate rehab payment
            const rehabPayment = rehabCost * (1 - rehabLoaned) / rehabDuration;
            cashInvested = downPayment + rehabPayment;
            
            logger.debug('BRRRR - First month financing', { 
              downPayment,
              rehabPayment,
              cashInvested,
              purchasePrice,
              purchaseLoaned,
              rehabCost,
              rehabLoaned,
              rehabDuration
            });
            
            // Calculate short-term financing
            debt = purchasePrice * purchaseLoaned + rehabCost * rehabLoaned / rehabDuration;
            interestPaid = -1 * debt * shortTermInterestRate;
          } else {
            // Subsequent rehab months: just the monthly rehab costs
            const rehabPayment = rehabCost * (1 - rehabLoaned) / rehabDuration;
            cashInvested = rehabPayment;
            
            // Update debt with additional rehab loan
            const prevDebt = output[totalMonths === 1 ? 1 : year].months[totalMonths === 1 ? 1 : month - 1]?.debt || 0;
            debt = prevDebt + rehabCost * rehabLoaned / rehabDuration;
            interestPaid = -1 * debt * shortTermInterestRate;
            
            logger.debug('BRRRR - Rehab month financing', { 
              month: totalMonths,
              rehabPayment,
              cashInvested, 
              prevDebt,
              additionalDebt: rehabCost * rehabLoaned / rehabDuration,
              newTotalDebt: debt,
              interestRate: shortTermInterestRate * 12 * 100, // annualized percentage
              interestPaid
            });
          }
        } else if (totalMonths === rehabDuration + 1) {
          // First month after rehab: refinance into long-term loan
          // Use previous month's debt
          const prevDebt = output[year].months[month - 1]?.debt || 0;
          
          // Calculate new long-term loan
          const newLoan = value * loanToValue;
          cashInvested = Math.max(0, prevDebt - newLoan);
          
          // Add the closing costs for refinance to cash invested
          const refinanceCost = newLoan * longTermLenderPoints;
          cashInvested += refinanceCost;
          
          debt = newLoan;
          interestPaid = -1 * debt * longTermInterestRate;
          
          logger.info('BRRRR - Refinance month', {
            month: totalMonths,
            prevDebt,
            propertyValue: value,
            loanToValue,
            newLoan,
            cashInvestedAfterRefinance: cashInvested,
            lenderPoints: longTermLenderPoints,
            refinanceCost,
            interestRate: longTermInterestRate * 12 * 100, // annualized percentage
            newMonthlyPayment: calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths),
            cashOut: Math.max(0, newLoan - prevDebt - refinanceCost)
          });
          
          // Calculate mortgage payment
          const mortgagePayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
          principalPaid = -(mortgagePayment - Math.abs(interestPaid));
        } else {
          // Months after refinance: normal mortgage payments
          const prevDebt = output[totalMonths === 1 ? 1 : year].months[totalMonths === 1 ? 1 : month - 1]?.debt || 0;
          
          interestPaid = -1 * prevDebt * longTermInterestRate;
          
          // Calculate mortgage payment
          const mortgagePayment = calculateMortgagePayment(prevDebt, longTermInterestRate, loanTermMonths - (totalMonths - rehabDuration - 1));
          principalPaid = -(mortgagePayment - Math.abs(interestPaid));
          
          if (totalMonths === rehabDuration + 2) {
            logger.debug('BRRRR - First normal payment month', {
              month: totalMonths,
              prevDebt,
              interestRate: longTermInterestRate * 12 * 100, // annualized percentage
              mortgagePayment,
              interestPaid,
              principalPaid
            });
          }
          
          debt = prevDebt - Math.abs(principalPaid);
        }
        
        // Calculate equity
        equity = value - debt;
        
        // Calculate equity growth (only for non-rehab periods)
        if (isRehabPeriod) {
          // No equity growth during rehab
          equityGrowth = 0;
        } else if (totalMonths === rehabDuration + 1) {
          // On refinance month, equity growth is the jump from purchase price to ARV
          equityGrowth = afterRepairValue - purchasePrice;
          logger.info('BRRRR - Equity growth on refinance', {
            purchasePrice,
            afterRepairValue,
            equityGrowth
          });
        } else {
          // Normal appreciation for other months
          const prevValue = totalMonths > 1 ? 
            (month > 1 ? output[year].months[month - 1]?.value : output[year - 1].months[12]?.value) || 0 : 
            0;
          equityGrowth = value - prevValue;
        }
      } else {
        // Buy and Hold calculations
        
        // Set proper value based on rehab stage
        if (totalMonths === 1) {
          // First month: purchase price
          value = purchasePrice;
          logger.info('Buy and Hold - First month using purchase price', {
            totalMonths,
            value: purchasePrice
          });
        } else if (rehabDuration > 0 && totalMonths <= rehabDuration) {
          // During rehab (if there is rehab), value is purchase price
          value = purchasePrice;
          logger.info('Buy and Hold - During rehab using purchase price', {
            totalMonths,
            rehabDuration,
            value: purchasePrice
          });
        } else if (rehabDuration > 0 && totalMonths === rehabDuration + 1) {
          // First month after rehab: jump to ARV
          value = afterRepairValue;
          logger.info('Buy and Hold - First month after rehab using ARV', {
            totalMonths,
            rehabDuration,
            value: afterRepairValue
          });
        } else {
          // After ARV, apply normal appreciation
          // If no rehab, start appreciation from month 2
          const baseValue = rehabDuration > 0 ? afterRepairValue : purchasePrice;
          const monthsSinceBase = rehabDuration > 0 
            ? totalMonths - (rehabDuration + 1) 
            : totalMonths - 1;
          
          value = baseValue * Math.pow(1 + monthlyAppreciation, monthsSinceBase);
          logger.info('Buy and Hold - Normal appreciation', {
            totalMonths,
            rehabDuration,
            monthsSinceBase,
            baseValue,
            value
          });
        }
        
        if (totalMonths === 1) {
          // First month: purchase
          const downPayment = purchasePrice * (1 - loanToValue);
          cashInvested = downPayment;
          
          debt = purchasePrice * loanToValue;
          
          // Calculate mortgage payment
          const mortgagePayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
          interestPaid = -1 * debt * longTermInterestRate;
          principalPaid = -(mortgagePayment - Math.abs(interestPaid));
        } else {
          // Subsequent months
          const prevDebt = month > 1 ? 
            output[year].months[month - 1]?.debt : 
            output[year - 1].months[12]?.debt;
          
          // Calculate mortgage payment
          const mortgagePayment = calculateMortgagePayment(prevDebt, longTermInterestRate, loanTermMonths - (totalMonths - 1));
          interestPaid = -1 * prevDebt * longTermInterestRate;
          principalPaid = -(mortgagePayment - Math.abs(interestPaid));
          
          // Debt is reduced by principal payment
          debt = prevDebt - Math.abs(principalPaid);
        }
        
        // Calculate equity
        equity = value - debt;
        
        // Calculate equity growth
        if (totalMonths === 1) {
          // First month has no growth
          equityGrowth = 0;
          logger.info('Buy and Hold - No equity growth in first month', {
            totalMonths
          });
        } else if (rehabDuration > 0 && totalMonths === rehabDuration + 1) {
          // On first month after rehab, equity growth is the jump from purchase price to ARV
          equityGrowth = afterRepairValue - purchasePrice;
          logger.info('Buy and Hold - Equity growth after rehab', {
            totalMonths,
            purchasePrice,
            afterRepairValue,
            equityGrowth
          });
        } else {
          // Normal appreciation for other months
          const prevValue = totalMonths > 1 ? 
            (month > 1 ? output[year].months[month - 1]?.value : output[year - 1].months[12]?.value) || 0 : 
            0;
          equityGrowth = value - prevValue;
          
          logger.debug('Buy and Hold - Normal equity growth', {
            totalMonths,
            prevValue,
            value,
            equityGrowth
          });
        }
      }
      
      // Calculate rent
      const rent = calculateRent(year, month, rentalDetails, rehabDuration);
      
      // Calculate expenses
      const expenses = calculateExpenses(
        year,
        month,
        rent,
        interestPaid,
        principalPaid,
        isRehabPeriod,
        rentalDetails,
        investmentType
      );
      
      // Calculate cash flow
      const cashFlow = rent - expenses;
      
      // Update running total of cash invested
      runningTotalCashInvested += cashInvested;
      totalCashInvested = runningTotalCashInvested;
      
      // Calculate total return (cash flow + equity growth)
      const totalReturn = cashFlow + equityGrowth;
      
      // Calculate return on invested cash
      const returnOnInvestedCash = totalCashInvested > 0 ? totalReturn / totalCashInvested * 12 : 0;
      
      // Calculate debt service coverage ratio
      const dscr = (Math.abs(interestPaid) + Math.abs(principalPaid)) > 0 
        ? rent / (Math.abs(interestPaid) + Math.abs(principalPaid)) 
        : 0;
      
      // Store monthly values
      output[year].months[month] = {
        value,
        debt,
        equity,
        cashInvested,
        totalCashInvested,
        interestPaid,
        rent,
        expenses,
        cashFlow,
        totalReturn,
        returnOnInvestedCash,
        dscr,
        isRehabPeriod,
        equityGrowth
      };
      
      // Update yearly totals
      output[year].yearlyTotals.interestPaid += interestPaid;
      output[year].yearlyTotals.rent += rent;
      output[year].yearlyTotals.expenses += expenses;
      output[year].yearlyTotals.cashFlow += cashFlow;
      output[year].yearlyTotals.totalReturn += totalReturn;
      output[year].yearlyTotals.cashInvested += cashInvested;
      output[year].yearlyTotals.totalCashInvested = totalCashInvested;
      output[year].yearlyTotals.equityGrowth += equityGrowth;
    }
    
    // Calculate yearly return on invested cash
    output[year].yearlyTotals.returnOnInvestedCash = 
      output[year].yearlyTotals.totalCashInvested > 0 
        ? output[year].yearlyTotals.totalReturn / output[year].yearlyTotals.totalCashInvested 
        : 0;
    
    // Calculate yearly DSCR
    const yearlyDebtService = Math.abs(output[year].yearlyTotals.interestPaid);
    output[year].yearlyTotals.dscr = 
      yearlyDebtService > 0 
        ? output[year].yearlyTotals.rent / yearlyDebtService 
        : 0;
  }
  
  logger.info('Completed investment calculation');
  
  // Log information about the output structure
  logger.debug('Investment calculation output structure:', {
    yearCount: Object.keys(output).length,
    firstYearMonthCount: output[1] ? Object.keys(output[1].months).length : 0,
    hasMonthlyData: output[1] && output[1].months[1] ? true : false,
    monthsInYear1: output[1] ? Object.keys(output[1].months).map(Number).sort((a, b) => a - b) : []
  });
  
  return output;
}; 