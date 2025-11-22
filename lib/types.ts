export type CalculatedOutputType = {
  [year: number]: {
    months: {
      [month: number]: {
        value: number;
        debt: number;
        displayDebt?: number;
        equity: number;
        cashInvested: number;
        displayCashInvested?: number;
        totalCashInvested: number;
        interestPaid: number;
        rent: number;
        expenses: number;
        cashFlow: number;
        totalReturn: number;
        returnOnInvestedCash: number;
        dscr: number;
        isRehabPeriod?: boolean;
        equityGrowth: number;
      };
    };
    yearlyTotals: {
      interestPaid: number;
      rent: number;
      expenses: number;
      cashFlow: number;
      totalReturn: number;
      cashInvested: number;
      totalCashInvested: number;
      returnOnInvestedCash: number;
      dscr: number;
      equityGrowth: number;
    };
  };
};

export type RehabItem = {
  id: string;
  description: string;
  quantity: number;
  rentalPrice: number;
  airbnbPrice: number;
  price: number;
  extended: number;
  checked: boolean;
};

export type RehabCategory = {
  [key in 'flooring' | 'kitchen' | 'bathrooms' | 'general' | 'infrastructure' | 'contingency']: RehabItem[];
};

export type PropertyDetails = {
  address: string;
  squareFootage: string;
  bedrooms: string;
  bathrooms: string;
};

export type DealDetails = {
  purchasePrice: string;
  afterRepairValue: string;
  rehabCost: string;
  holdingPeriod: string;
};

export type ShortTermFinancing = {
  purchaseLoaned: string;
  rehabLoaned: string;
  interestRate: string;
  lendersPoints: string;
};

export type FinancingDetails = {
  loanToValue: string;
  interestRate: string;
  loanTerm: string;
  lenderPoints: string;
};

export type RentalDetails = {
  rentalType: string;
  monthlyRent: string;
  annualAppreciation: string;
  annualInsurance: string;
  annualPropertyTax: string;
  annualMaintenance: string;
  vacancyRate: string;
  annualCapex: string;
  pmFee: string;
  shortTermPmFee: string;
  personalUsage: string;
  leaseUpFee: string;
  averageLeaseLength: string;
};

export type SaleInputs = {
  agentCommission: string;
  saleClosingCosts: string;
};

export type UserDetails = {
  name: string;
  phone: string;
  email: string;
};

export type ExpandedYearsState = {
  [key: number]: boolean;
};

export type InvestmentType = 'flip' | 'brrrr' | 'buyAndHold'; 