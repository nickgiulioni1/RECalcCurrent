'use client'

import { useCallback, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { logger } from '@/lib/logger';
import { 
  CalculatedOutputType, 
  DealDetails, 
  ExpandedYearsState,
  FinancingDetails, 
  InvestmentType,
  PropertyDetails, 
  RentalDetails, 
  SaleInputs, 
  ShortTermFinancing, 
  UserDetails 
} from '@/lib/types';
import { formatNumber, findMaxTotalCashInvested, findMinTotalCashInvested, calculateTotalCashFlow } from '@/lib/calculationUtils';
import { calculateInvestmentOutput, calculateFlipProfit } from '@/lib/investmentCalculator';

// Import form components
import PropertyDetailsForm from './PropertyDetailsForm';
import DealDetailsForm from './DealDetailsForm';
import FinancingDetailsForm from './FinancingDetailsForm';
import RentalDetailsForm from './RentalDetailsForm';
import SaleDetailsForm from './SaleDetailsForm';
import RehabEstimatorForm from './RehabEstimatorForm';
import InvestmentResultsDisplay from './InvestmentResultsDisplay';

// Import tooltip components for enhanced UI
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Heavy export libraries are dynamically imported inside handlers to reduce bundle size

// Define tooltip components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={`z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className}`}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;



export default function CalculatorPage() {
  const [investmentType, setInvestmentType] = useState<InvestmentType>('buyAndHold');
  const [activeTab, setActiveTab] = useState('property');
  
  // Property and deal details state
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>({
    address: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: ''
  });
  
  const [dealDetails, setDealDetails] = useState<DealDetails>({
    purchasePrice: '',
    afterRepairValue: '',
    rehabCost: '',
    holdingPeriod: '3'
  });
  
  // Financing details state
  const [shortTermFinancing, setShortTermFinancing] = useState<ShortTermFinancing>({
    purchaseLoaned: '85',
    rehabLoaned: '100',
    interestRate: '10',
    lendersPoints: '2'
  });
  
  const [financingDetails, setFinancingDetails] = useState<FinancingDetails>({
    loanToValue: '75',
    interestRate: '7',
    loanTerm: '30',
    lenderPoints: '1'
  });
  
  // Rental details state
  const [rentalDetails, setRentalDetails] = useState<RentalDetails>({
    rentalType: 'longTerm',
    monthlyRent: '3000',
    annualAppreciation: '3',
    annualInsurance: '1500',
    annualPropertyTax: '3000',
    annualMaintenance: '5',
    vacancyRate: '5',
    annualCapex: '5',
    pmFee: '10',
    shortTermPmFee: '25',
    personalUsage: '0',
    leaseUpFee: '1500',
    averageLeaseLength: '2'
  });
  
  // Sale inputs state (for flip calculations)
  const [saleInputs, setSaleInputs] = useState<SaleInputs>({
    agentCommission: '6',
    saleClosingCosts: '2'
  });
  
  // User details state
  const [userDetails] = useState<UserDetails>({
    name: '',
    phone: '',
    email: ''
  });
  
  // Calculation results state
  const [calculatedOutput, setCalculatedOutput] = useState<CalculatedOutputType>({});
  const [expandedYears, setExpandedYears] = useState<ExpandedYearsState>({});
  const [isCalculated, setIsCalculated] = useState(false);
  
  // Add isExporting state
  const [isExporting, setIsExporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors(prev => (prev.length ? [] : prev));
  }, []);
  
  // Get tabs based on investment type
  const tabsForInvestmentType = useMemo(() => {
    logger.debug('Getting tabs for investment type', { investmentType });
    switch (investmentType) {
      case 'buyAndHold':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Rental Details' },
          { value: 'longTerm', label: 'Long Term Financing' }
        ];
      case 'brrrr':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Rental Details' },
          { value: 'shortTerm', label: 'Short Term Financing' },
          { value: 'longTerm', label: 'Long Term Financing' }
        ];
      case 'flip':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'shortTerm', label: 'Short Term Financing' },
          { value: 'sale', label: 'Sales Inputs' }
        ];
      default:
        return [];
    }
  }, [investmentType]);
  
  // Handle investment type change
  const handleInvestmentTypeChange = (type: InvestmentType) => {
    clearValidationErrors();
    logger.info('Changing investment type', { type });
    setInvestmentType(type);
    setActiveTab('property'); // Reset to property tab when changing investment type
    
    // Reset the holding period based on investment type
    if (type === 'flip' || type === 'brrrr') {
      setDealDetails(prev => ({
        ...prev,
        holdingPeriod: '3'
      }));
    } else {
      setDealDetails(prev => ({
        ...prev,
        holdingPeriod: '0'
      }));
    }
  };
  
  // Handle property details change
  const handlePropertyDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearValidationErrors();
    logger.debug('Property details change', { name: e.target.name, value: e.target.value });
    setPropertyDetails(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  // Handle deal details change
  const handleDealDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearValidationErrors();
    logger.debug('Deal details change', { name: e.target.name, value: e.target.value });
    setDealDetails(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // If changing after repair value, update property tax
    if (e.target.name === 'afterRepairValue') {
      updateAnnualPropertyTax(e.target.value);
    }
  };
  
  // Handle short term financing change
  const handleShortTermFinancingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearValidationErrors();
    logger.debug('Short term financing change', { name: e.target.name, value: e.target.value });
    setShortTermFinancing(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  // Handle financing details change
  const handleFinancingDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearValidationErrors();
    logger.debug('Financing details change', { name: e.target.name, value: e.target.value });
    setFinancingDetails(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  // Handle rental details change
  const handleRentalDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearValidationErrors();
    logger.debug('Rental details change', { name: e.target.name, value: e.target.value });
    setRentalDetails(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Update lease up fee if monthly rent changes
    if (e.target.name === 'monthlyRent') {
      updateLeaseUpFee(e.target.value);
    }
  };
  
  // Handle rental type change
  const handleRentalTypeChange = (value: string) => {
    clearValidationErrors();
    logger.debug('Rental type change', { value });
    setRentalDetails(prev => ({
      ...prev,
      rentalType: value
    }));
  };
  
  // Handle sale inputs change
  const handleSaleInputsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearValidationErrors();
    logger.debug('Sale inputs change', { name: e.target.name, value: e.target.value });
    setSaleInputs(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  
  // Update annual property tax based on ARV
  const updateAnnualPropertyTax = (afterRepairValue: string) => {
    const arv = parseFloat(afterRepairValue) || 0;
    const estimatedPropertyTax = (arv * 0.01).toFixed(0);
    logger.debug('Updating property tax based on ARV', { arv, estimatedPropertyTax });
    setRentalDetails(prev => ({ ...prev, annualPropertyTax: estimatedPropertyTax }));
  };
  
  // Update lease up fee based on monthly rent
  const updateLeaseUpFee = (monthlyRent: string) => {
    const rent = parseFloat(monthlyRent) || 0;
    const estimatedLeaseUpFee = (rent * 0.5).toFixed(0);
    logger.debug('Updating lease up fee based on monthly rent', { rent, estimatedLeaseUpFee });
    setRentalDetails(prev => ({ ...prev, leaseUpFee: estimatedLeaseUpFee }));
  };
  
  // Toggle year expansion in results
  const toggleYearExpansion = (year: number) => {
    logger.debug('Toggling year expansion', { year, isCurrentlyExpanded: expandedYears[year] });
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };
  
  // Validate core numeric inputs before calculations/exports
  const validateInputs = useCallback(() => {
    const errors: string[] = [];
    const numericFields = [
      { label: 'Purchase price', value: dealDetails.purchasePrice, min: 1 },
      { label: 'After repair value', value: dealDetails.afterRepairValue, min: 1 },
      { label: 'Rehab cost', value: dealDetails.rehabCost, min: 0 },
    ];
    
    numericFields.forEach(field => {
      const parsed = parseFloat(field.value);
      if (isNaN(parsed) || parsed < field.min) {
        errors.push(`${field.label} must be ${field.min > 0 ? 'at least ' + field.min : '0 or greater'}.`);
      }
    });

    if (investmentType !== 'flip') {
      const rent = parseFloat(rentalDetails.monthlyRent);
      if (isNaN(rent) || rent <= 0) {
        errors.push('Monthly rent must be greater than 0 for rental strategies.');
      }
    }

    const longTermRate = parseFloat(financingDetails.interestRate);
    if (isNaN(longTermRate) || longTermRate <= 0) {
      errors.push('Long-term interest rate must be greater than 0.');
    }

    if (investmentType !== 'buyAndHold') {
      const shortTermRate = parseFloat(shortTermFinancing.interestRate);
      if (isNaN(shortTermRate) || shortTermRate <= 0) {
        errors.push('Short-term interest rate must be greater than 0.');
      }
    }

    if (investmentType === 'flip' || investmentType === 'brrrr') {
      const holding = parseFloat(dealDetails.holdingPeriod);
      if (isNaN(holding) || holding <= 0) {
        errors.push('Holding period must be greater than 0 months.');
      }
    }

    return errors;
  }, [dealDetails.afterRepairValue, dealDetails.holdingPeriod, dealDetails.purchasePrice, dealDetails.rehabCost, financingDetails.interestRate, investmentType, rentalDetails.monthlyRent, shortTermFinancing.interestRate]);
  
  // Calculate BRRRR percentage
  const calculateBrrrPercentage = () => {
    if (investmentType !== 'brrrr' || !calculatedOutput || Object.keys(calculatedOutput).length === 0) {
      return 0;
    }
    
    const purchasePrice = parseFloat(dealDetails.purchasePrice);
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue);
    
    // Validate inputs
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      console.log('Error: Purchase price is required and must be greater than 0', { purchasePrice });
      return 0;
    }
    
    if (isNaN(afterRepairValue) || afterRepairValue <= 0) {
      console.log('Error: After repair value is required and must be greater than 0', { afterRepairValue });
      return 0;
    }
    
    const maxCash = findMaxTotalCashInvested(calculatedOutput);
    const minCash = findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails);
    
    if (maxCash <= 0) return 0;
    
    const percentage = 100 * (1 - minCash / maxCash);
    logger.debug('Calculated BRRRR percentage', { maxCash, minCash, percentage });
    return percentage;
  };
  
  // Calculate the investment
  const calculateInvestment = () => {
    logger.info('Calculating investment...', { 
      investmentType, 
      propertyDetails, 
      dealDetails, 
      shortTermFinancing, 
      financingDetails, 
      rentalDetails, 
      saleInputs 
    });

    const errors = validateInputs();
    if (errors.length) {
      setValidationErrors(errors);
      setIsCalculated(false);
      return;
    }
    setValidationErrors([]);
    
    // Clear previous calculations
    setCalculatedOutput({});
    
    // Reset expanded years
    setExpandedYears({});

    // Perform new calculations
    const output = calculateInvestmentOutput(
      investmentType,
      dealDetails,
      shortTermFinancing,
      financingDetails,
      rentalDetails,
      saleInputs
    );
    
    // Debug output structure
    logger.debug('Calculation output structure', {
      yearCount: Object.keys(output).length,
      firstYearMonthCount: output[1] ? Object.keys(output[1].months).length : 0,
      hasMonthlyData: output[1] && output[1].months[1] ? true : false,
      sampleMonthData: output[1] && output[1].months[1] ? {
        value: output[1].months[1].value,
        debt: output[1].months[1].debt,
        cashFlow: output[1].months[1].cashFlow,
        totalReturn: output[1].months[1].totalReturn
      } : null
    });
    
    // Set the calculated output
    setCalculatedOutput(output);

    // Automatically expand year 1 to show monthly data
    setExpandedYears(prev => ({
      ...prev,
      1: true
    }));

    // Set isCalculated to true
    setIsCalculated(true);
  };
  
  // Send details to construction company
  const handleSendToOffLeash = () => {
    logger.info('Sending details to Off Leash Construction');
    const subject = encodeURIComponent(`${propertyDetails.address} - Estimated Rehab: $${formatNumber(parseFloat(dealDetails.rehabCost))}`);
    const body = encodeURIComponent(`Name: ${userDetails.name}
Phone: ${userDetails.phone}
Email: ${userDetails.email}

Investment Details:
Address: ${propertyDetails.address}
Estimated Rehab: $${formatNumber(parseFloat(dealDetails.rehabCost))}
Purchase Price: $${formatNumber(parseFloat(dealDetails.purchasePrice))}
After Repair Value: $${formatNumber(parseFloat(dealDetails.afterRepairValue))}`);

    // Create and trigger mailto link
    const mailtoLink = `mailto:info@offleashconstruction.com?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };
  
  // Calculate profit for flip
  const calculateProfit = () => {
    if (investmentType !== 'flip' || !isCalculated) {
      return 0;
    }
    
    const purchasePrice = parseFloat(dealDetails.purchasePrice);
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue);
    const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
    
    // Validate inputs
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      console.log('Error: Purchase price is required and must be greater than 0', { purchasePrice });
      return 0;
    }
    
    if (isNaN(afterRepairValue) || afterRepairValue <= 0) {
      console.log('Error: After repair value is required and must be greater than 0', { afterRepairValue });
      return 0;
    }
    
    const holdingCosts = -1 * (calculatedOutput[1]?.yearlyTotals?.interestPaid || 0);
    const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
    
    return calculateFlipProfit(
      purchasePrice,
      afterRepairValue,
      rehabCost,
      holdingCosts,
      saleInputs
    ) + totalCashFlow;
  };


  // Export to PDF function
  const handleExportPDF = async () => {
    const errors = validateInputs();
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }

    if (!isCalculated) {
      setValidationErrors(['Please calculate the investment before exporting.']);
      return;
    }

    try {
      logger.info('Starting PDF export process');
      setIsExporting(true);
      
      // Dynamically import PDF libraries
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      // Create a new jsPDF instance
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });
      
      logger.debug('Created PDF document structure');
      
      // Set font to a readable size
      doc.setFontSize(10);
      
      // Add property details
      doc.setFontSize(18);
      doc.text('Real Estate Investment Analysis', 40, 40);
      doc.setFontSize(12);
      
      const propertyAddress = propertyDetails.address || 'Property Analysis';
      doc.text(`Property: ${propertyAddress}`, 40, 70);
      
      logger.debug('Adding property and deal details to PDF');
      
      // Add property details
      const detailsData = [
        ['Purchase Price', `$${formatNumber(parseFloat(dealDetails.purchasePrice))}`],
        ['Property Type', 'Residential'],
        ['Bedrooms', propertyDetails.bedrooms],
        ['Bathrooms', propertyDetails.bathrooms],
        ['Square Feet', propertyDetails.squareFootage],
      ];
      
      doc.setFontSize(14);
      doc.text('Property Details', 40, 100);
      doc.setFontSize(10);
      
      autoTable(doc, {
        startY: 110,
        head: [['Detail', 'Value']],
        body: detailsData,
        theme: 'striped',
        margin: { left: 40 },
        styles: { fontSize: 9 }
      });
      
      // Add deal structure
      const dealData = [
        ['Purchase Price', `$${formatNumber(parseFloat(dealDetails.purchasePrice))}`],
        ['After Repair Value', `$${formatNumber(parseFloat(dealDetails.afterRepairValue))}`],
        ['Rehab Cost', `$${formatNumber(parseFloat(dealDetails.rehabCost))}`],
        ['Holding Period', `${dealDetails.holdingPeriod} months`],
      ];
      
      // Track the last table position manually
      let lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 110; 
      
      autoTable(doc, {
        startY: lastTableY + 20,
        head: [['Deal Structure', 'Value']],
        body: dealData,
        theme: 'striped',
        margin: { left: 40 },
        styles: { fontSize: 9 }
      });
      
      // Update last table position
      lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || lastTableY + 100;
      
      // Add rental details if applicable
      if (investmentType === 'buyAndHold' || investmentType === 'brrrr') {
        // Add rental details
        const rentalData = [
          ['Monthly Rent', `$${formatNumber(parseFloat(rentalDetails.monthlyRent))}`],
          ['Rental Type', rentalDetails.rentalType === 'longTerm' ? 'Long Term' : 'Short Term'],
          ['Vacancy Rate', `${rentalDetails.vacancyRate}%`],
          ['Property Management Fee', `${rentalDetails.rentalType === 'longTerm' ? rentalDetails.pmFee : rentalDetails.shortTermPmFee}%`],
          ['Property Tax', `$${formatNumber(parseFloat(rentalDetails.annualPropertyTax))}/year`],
          ['Insurance', `$${formatNumber(parseFloat(rentalDetails.annualInsurance))}/year`],
          ['Maintenance', `${rentalDetails.annualMaintenance}% of rent`],
          ['Capital Expenditures', `${rentalDetails.annualCapex}% of rent`],
        ];
        
        autoTable(doc, {
          startY: lastTableY + 20,
          head: [['Rental Details', 'Value']],
          body: rentalData,
          theme: 'striped',
          margin: { left: 40 },
          styles: { fontSize: 9 }
        });
        
        // Update last table position
        lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || lastTableY + 100;
      }
      
      // Add investment summary
      logger.debug('Adding investment summary to PDF');
      
      // Create summary data from calculatedOutput
      if (Object.keys(calculatedOutput).length > 0) {
        const firstYearData = calculatedOutput[1];
        const cashFlow = firstYearData?.yearlyTotals.cashFlow || 0;
        const totalInvestment = firstYearData?.yearlyTotals.totalCashInvested || 0;
        const cashOnCash = totalInvestment > 0 ? (cashFlow / totalInvestment) * 100 : 0;
        
        // Calculate Cap Rate
        const capRate = (() => {
          if (!firstYearData) return 0;
          const netOperatingIncome = firstYearData.yearlyTotals.cashFlow + Math.abs(firstYearData.yearlyTotals.interestPaid);
          const propertyValue = parseFloat(dealDetails.afterRepairValue) || 0;
          return propertyValue > 0 ? (netOperatingIncome / propertyValue) * 100 : 0;
        })();
        
        // Calculate 5-Year ROI
        const fiveYearROI = (() => {
          let totalReturn = 0;
          for (let year = 1; year <= 5; year++) {
            if (calculatedOutput[year]) {
              totalReturn += calculatedOutput[year].yearlyTotals.cashFlow + calculatedOutput[year].yearlyTotals.equityGrowth;
            }
          }
          return totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;
        })();
        
        // Create summary data for investment metrics
        const summaryData: Array<[string, string]> = [];
        
        summaryData.push(
          ['Initial Investment', `$${formatNumber(totalInvestment)}`],
          ['Cash Flow (First Year)', `$${formatNumber(cashFlow)}`],
          ['Cash on Cash Return', `${formatNumber(cashOnCash)}%`],
          ['Cap Rate', `${formatNumber(capRate)}%`],
          ['5-Year ROI', `${formatNumber(fiveYearROI)}%`],
        );
        
        doc.setFontSize(14);
        doc.text('Investment Summary', 40, lastTableY + 40);
        doc.setFontSize(10);
        
        autoTable(doc, {
          startY: lastTableY + 50,
          head: [['Metric', 'Value']],
          body: summaryData,
          theme: 'striped',
          margin: { left: 40 },
          styles: { fontSize: 9 }
        });
        
        // Update last table position
        lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || lastTableY + 100;
      }
      
      // Add yearly projections table
      if (Object.keys(calculatedOutput).length > 0) {
        logger.debug('Adding yearly projections to PDF');
        
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Yearly Projections', 40, 40);
        doc.setFontSize(10);
        
        const yearlyHeaders = ['Year', 'Value', 'Equity', 'Cash Flow', 'ROI'];
        const yearlyData = Object.entries(calculatedOutput).map(([year, data]) => [
          year,
          `$${formatNumber(data.months[12]?.value || 0)}`,
          `$${formatNumber(data.months[12]?.equity || 0)}`,
          `$${formatNumber(data.yearlyTotals.cashFlow)}`,
          `${formatNumber(data.yearlyTotals.returnOnInvestedCash * 100)}%`
        ]);
        
        autoTable(doc, {
          startY: 50,
          head: [yearlyHeaders],
          body: yearlyData,
          theme: 'striped',
          margin: { left: 40 },
          styles: { fontSize: 9 }
        });
        
        lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 150;
        
        // Add expense breakdown section
        doc.setFontSize(14);
        doc.text('Annual Expense Breakdown', 40, lastTableY + 40);
        doc.setFontSize(10);
        
        // Get first year data
        const firstYearData = calculatedOutput[1];
        const annualRent = firstYearData?.yearlyTotals.rent || 0;
        
        // Calculate individual expense items
        const propertyTax = parseFloat(rentalDetails.annualPropertyTax);
        const insurance = parseFloat(rentalDetails.annualInsurance);
        const maintenance = annualRent * (parseFloat(rentalDetails.annualMaintenance) / 100);
        const vacancy = annualRent * (parseFloat(rentalDetails.vacancyRate) / 100);
        const capex = annualRent * (parseFloat(rentalDetails.annualCapex) / 100);
        const pmFee = rentalDetails.rentalType === 'longTerm' 
          ? annualRent * (parseFloat(rentalDetails.pmFee) / 100)
          : annualRent * (parseFloat(rentalDetails.shortTermPmFee) / 100);
        const interestPaid = Math.abs(firstYearData?.yearlyTotals.interestPaid || 0);
        
        logger.debug('Adding expense breakdown to PDF', {
          propertyTax,
          insurance,
          maintenance,
          vacancy,
          capex,
          pmFee,
          interestPaid
        });
        
        const expenseData = [
          ['Property Tax', `$${formatNumber(propertyTax)}`],
          ['Insurance', `$${formatNumber(insurance)}`],
          ['Maintenance', `$${formatNumber(maintenance)}`],
          ['Vacancy', `$${formatNumber(vacancy)}`],
          ['Capital Expenditures', `$${formatNumber(capex)}`],
          ['Property Management', `$${formatNumber(pmFee)}`],
          ['Mortgage Interest', `$${formatNumber(interestPaid)}`],
          ['Total Expenses', `$${formatNumber(Math.abs(firstYearData?.yearlyTotals.expenses || 0))}`]
        ];
        
        autoTable(doc, {
          startY: lastTableY + 50,
          head: [['Expense Category', 'Annual Amount']],
          body: expenseData,
          theme: 'striped',
          margin: { left: 40 },
          styles: { fontSize: 9 }
        });
      }
      
      // Save the PDF
      const fileName = propertyDetails.address 
        ? `${propertyDetails.address.replace(/[^a-zA-Z0-9]/g, '_')}_analysis.pdf`
        : 'property_analysis.pdf';
      
      logger.info('Saving PDF export', { fileName });
      doc.save(fileName);
      
      // Replace toast with alert
      alert("PDF Export Complete: Your investment analysis has been exported to PDF.");
    } catch (error) {
      logger.error('Error generating PDF file', { error });
      // Replace toast with alert
      alert("Export Failed: There was a problem exporting to PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  
  // Export to Excel function
  const handleExportExcel = async () => {
    const errors = validateInputs();
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }

    if (!isCalculated) {
      setValidationErrors(['Please calculate the investment before exporting.']);
      return;
    }

    try {
      logger.info('Starting Excel export process');
      setIsExporting(true);
      
      // Dynamically import Excel libraries
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      logger.debug('Creating Summary sheet for Excel export');
      
      // Define arrays with explicit types 
      const summaryData: (string | number)[][] = [
        ['Investment Analysis Summary'],
        [],
        ['Property Details'],
        ['Address', propertyDetails.address],
        ['Bedrooms', propertyDetails.bedrooms],
        ['Bathrooms', propertyDetails.bathrooms],
        ['Square Feet', propertyDetails.squareFootage],
        [],
        ['Deal Structure'],
        ['Purchase Price', `$${formatNumber(parseFloat(dealDetails.purchasePrice))}`],
        ['After Repair Value', `$${formatNumber(parseFloat(dealDetails.afterRepairValue))}`],
        ['Rehab Cost', `$${formatNumber(parseFloat(dealDetails.rehabCost))}`],
        ['Holding Period', `${dealDetails.holdingPeriod} months`],
        []
      ];
      
      // Add rental details if applicable
      if (investmentType === 'buyAndHold' || investmentType === 'brrrr') {
        summaryData.push(
          ['Rental Details'],
          ['Monthly Rent', `$${formatNumber(parseFloat(rentalDetails.monthlyRent))}`],
          ['Rental Type', rentalDetails.rentalType === 'longTerm' ? 'Long Term' : 'Short Term'],
          ['Vacancy Rate', `${rentalDetails.vacancyRate}%`],
          ['Property Management Fee', `${rentalDetails.rentalType === 'longTerm' ? rentalDetails.pmFee : rentalDetails.shortTermPmFee}%`],
          ['Property Tax', `$${formatNumber(parseFloat(rentalDetails.annualPropertyTax))}/year`],
          ['Insurance', `$${formatNumber(parseFloat(rentalDetails.annualInsurance))}/year`],
          ['Maintenance', `${rentalDetails.annualMaintenance}% of rent`],
          ['Capital Expenditures', `${rentalDetails.annualCapex}% of rent`]
        );
        summaryData.push([]);
      }
      
      // Add investment metrics
      if (Object.keys(calculatedOutput).length > 0) {
        const firstYearData = calculatedOutput[1];
        const cashFlow = firstYearData?.yearlyTotals.cashFlow || 0;
        const totalInvestment = firstYearData?.yearlyTotals.totalCashInvested || 0;
        const cashOnCash = totalInvestment > 0 ? (cashFlow / totalInvestment) * 100 : 0;
        
        // Calculate Cap Rate
        const capRate = (() => {
          if (!firstYearData) return 0;
          const netOperatingIncome = firstYearData.yearlyTotals.cashFlow + Math.abs(firstYearData.yearlyTotals.interestPaid);
          const propertyValue = parseFloat(dealDetails.afterRepairValue) || 0;
          return propertyValue > 0 ? (netOperatingIncome / propertyValue) * 100 : 0;
        })();
        
        // Calculate 5-Year ROI
        const fiveYearROI = (() => {
          let totalReturn = 0;
          for (let year = 1; year <= 5; year++) {
            if (calculatedOutput[year]) {
              totalReturn += calculatedOutput[year].yearlyTotals.cashFlow + calculatedOutput[year].yearlyTotals.equityGrowth;
            }
          }
          return totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;
        })();
        
        summaryData.push(
          ['Investment Summary'],
          ['Initial Investment', `$${formatNumber(totalInvestment)}`],
          ['Cash Flow (First Year)', `$${formatNumber(cashFlow)}`],
          ['Cash on Cash Return', `${formatNumber(cashOnCash)}%`],
          ['Cap Rate', `${formatNumber(capRate)}%`],
          ['5-Year ROI', `${formatNumber(fiveYearROI)}%`]
        );
      }
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary');
      
      // Add annual projections sheet
      if (Object.keys(calculatedOutput).length > 0) {
        logger.debug('Creating Annual Projections sheet for Excel export');
        
        const yearlyHeaders = ['Year', 'Property Value', 'Equity', 'Cash Flow', 'ROI'];
        const yearlyData = Object.entries(calculatedOutput).map(([year, data]) => [
          year,
          `$${formatNumber(data.months[12]?.value || 0)}`,
          `$${formatNumber(data.months[12]?.equity || 0)}`,
          `$${formatNumber(data.yearlyTotals.cashFlow)}`,
          `${formatNumber(data.yearlyTotals.returnOnInvestedCash * 100)}%`
        ]);
        
        // Combine headers and data
        const yearlyWsData = [yearlyHeaders, ...yearlyData];
        const yearlyWs = XLSX.utils.aoa_to_sheet(yearlyWsData);
        XLSX.utils.book_append_sheet(workbook, yearlyWs, 'Annual Projections');
        
        // Create expense breakdown sheet
        logger.debug('Creating Expense Breakdown sheet for Excel export');
        
        // Create monthly expense breakdown data
        const monthlyExpenseHeaders = [
          'Year', 'Month', 'Property Tax', 'Insurance', 'Maintenance', 
          'Vacancy', 'CapEx', 'Property Management', 'Mortgage Interest', 'Total Expenses'
        ];
        
        // Define arrays with explicit types
        const monthlyExpenseData: (string | number)[][] = [];
        
        // Populate data for each month and year
        Object.entries(calculatedOutput).forEach(([year, yearData]) => {
          Object.entries(yearData.months).forEach(([month, monthData]) => {
            // Skip if month data is invalid
            if (!monthData) return;
            
            const monthlyRent = monthData.rent;
            
            // Monthly equivalents of annual expenses
            const propertyTax = parseFloat(rentalDetails.annualPropertyTax) / 12;
            const insurance = parseFloat(rentalDetails.annualInsurance) / 12;
            
            // Percentage-based expenses calculated from monthly rent
            const maintenance = monthlyRent * (parseFloat(rentalDetails.annualMaintenance) / 100);
            const vacancy = monthlyRent * (parseFloat(rentalDetails.vacancyRate) / 100);
            const capex = monthlyRent * (parseFloat(rentalDetails.annualCapex) / 100);
            
            // Property management fee depends on rental type
            const pmFee = rentalDetails.rentalType === 'longTerm' 
              ? monthlyRent * (parseFloat(rentalDetails.pmFee) / 100)
              : monthlyRent * (parseFloat(rentalDetails.shortTermPmFee) / 100);
            
            // Interest is already calculated and stored
            const interestPaid = Math.abs(monthData.interestPaid);
            const totalExpenses = Math.abs(monthData.expenses);
            
            monthlyExpenseData.push([
              year, 
              month, 
              `$${formatNumber(propertyTax)}`,
              `$${formatNumber(insurance)}`,
              `$${formatNumber(maintenance)}`,
              `$${formatNumber(vacancy)}`,
              `$${formatNumber(capex)}`,
              `$${formatNumber(pmFee)}`,
              `$${formatNumber(interestPaid)}`,
              `$${formatNumber(totalExpenses)}`
            ]);
          });
        });
        
        // Create annual expense breakdown data
        const annualExpenseHeaders = [
          'Year', 'Property Tax', 'Insurance', 'Maintenance', 
          'Vacancy', 'CapEx', 'Property Management', 'Mortgage Interest', 'Total Expenses'
        ];
        
        const annualExpenseData: (string | number)[][] = [];
        
        // Populate data for each year
        Object.entries(calculatedOutput).forEach(([year, yearData]) => {
          const annualRent = yearData.yearlyTotals.rent;
          
          // Annual expenses
          const propertyTax = parseFloat(rentalDetails.annualPropertyTax);
          const insurance = parseFloat(rentalDetails.annualInsurance);
          
          // Percentage-based expenses calculated from annual rent
          const maintenance = annualRent * (parseFloat(rentalDetails.annualMaintenance) / 100);
          const vacancy = annualRent * (parseFloat(rentalDetails.vacancyRate) / 100);
          const capex = annualRent * (parseFloat(rentalDetails.annualCapex) / 100);
          
          // Property management fee depends on rental type
          const pmFee = rentalDetails.rentalType === 'longTerm' 
            ? annualRent * (parseFloat(rentalDetails.pmFee) / 100)
            : annualRent * (parseFloat(rentalDetails.shortTermPmFee) / 100);
          
          // Interest is already calculated and stored
          const interestPaid = Math.abs(yearData.yearlyTotals.interestPaid);
          const totalExpenses = Math.abs(yearData.yearlyTotals.expenses);
          
          annualExpenseData.push([
            year,
            `$${formatNumber(propertyTax)}`,
            `$${formatNumber(insurance)}`,
            `$${formatNumber(maintenance)}`,
            `$${formatNumber(vacancy)}`,
            `$${formatNumber(capex)}`,
            `$${formatNumber(pmFee)}`,
            `$${formatNumber(interestPaid)}`,
            `$${formatNumber(totalExpenses)}`
          ]);
        });
        
        // Combine headers and data
        const monthlyExpenseWsData = [monthlyExpenseHeaders, ...monthlyExpenseData];
        const monthlyExpenseWs = XLSX.utils.aoa_to_sheet(monthlyExpenseWsData);
        XLSX.utils.book_append_sheet(workbook, monthlyExpenseWs, 'Monthly Expenses');
        
        const annualExpenseWsData = [annualExpenseHeaders, ...annualExpenseData];
        const annualExpenseWs = XLSX.utils.aoa_to_sheet(annualExpenseWsData);
        XLSX.utils.book_append_sheet(workbook, annualExpenseWs, 'Annual Expenses');
        
        // If long-term investment, add detailed monthly cash flow
        if (investmentType === 'buyAndHold' || investmentType === 'brrrr') {
          const monthlyCashflowHeaders = [
            'Year', 'Month', 'Property Value', 'Debt', 'Equity', 'Rent', 
            'Expenses', 'Cash Flow', 'Equity Growth', 'Total Return'
          ];
          
          const monthlyCashflowData: (string | number)[][] = [];
          
          // Populate data for each month and year
          Object.entries(calculatedOutput).forEach(([year, yearData]) => {
            Object.entries(yearData.months).forEach(([month, monthData]) => {
              // Skip if month data is invalid
              if (!monthData) return;
              
              monthlyCashflowData.push([
                year,
                month,
                `$${formatNumber(monthData.value)}`,
                `$${formatNumber(Math.abs(monthData.debt))}`,
                `$${formatNumber(monthData.equity)}`,
                `$${formatNumber(monthData.rent)}`,
                `$${formatNumber(Math.abs(monthData.expenses))}`,
                `$${formatNumber(monthData.cashFlow)}`,
                `$${formatNumber(monthData.equityGrowth)}`,
                `$${formatNumber(monthData.totalReturn)}`
              ]);
            });
          });
          
          // Combine headers and data
          const monthlyCashflowWsData = [monthlyCashflowHeaders, ...monthlyCashflowData];
          const monthlyCashflowWs = XLSX.utils.aoa_to_sheet(monthlyCashflowWsData);
          XLSX.utils.book_append_sheet(workbook, monthlyCashflowWs, 'Monthly Cashflow');
        }
      }
      
      // Save the Excel file
      const fileName = propertyDetails.address 
        ? `${propertyDetails.address.replace(/[^a-zA-Z0-9]/g, '_')}_analysis.xlsx`
        : 'property_analysis.xlsx';
      
      logger.info('Saving Excel export', { fileName });
      
      // Convert workbook to binary and create blob
      const excelData = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
      const buffer = new ArrayBuffer(excelData.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < excelData.length; i++) {
        view[i] = excelData.charCodeAt(i) & 0xFF;
      }
      
      // Create blob and save file
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      saveAs(blob, fileName);
      
      alert("Excel Export Complete: Your investment analysis has been exported to Excel.");
    } catch (error) {
      logger.error('Error generating Excel file', { error });
      alert("Export Failed: There was a problem exporting to Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen bg-background text-foreground transition-colors duration-300 max-w-7xl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-6 mb-8 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Real Estate Calculator
          </h1>
        </div>
      </div>

      {/* Investment Type Selection */}
      <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            Investment Type
          </CardTitle>
          <CardDescription className="text-base">
            Select your investment strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        investmentType === 'buyAndHold'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary'
                      }`}
                      onClick={() => handleInvestmentTypeChange('buyAndHold')}
                    >
                      <Label className="cursor-pointer font-semibold">Buy and Hold</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Long-term rental property investment strategy
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Traditional rental property investment for long-term wealth building</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        investmentType === 'brrrr'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary'
                      }`}
                      onClick={() => handleInvestmentTypeChange('brrrr')}
                    >
                      <Label className="cursor-pointer font-semibold">BRRRR</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Buy, Rehab, Rent, Refinance, Repeat
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Strategy to recycle capital through renovation and refinancing</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <TooltipProvider>
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        investmentType === 'flip'
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary'
                      }`}
                      onClick={() => handleInvestmentTypeChange('flip')}
                    >
                      <Label className="cursor-pointer font-semibold">Flip</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Buy, Renovate, and Sell for profit
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Short-term strategy to generate profit through property renovation and sale</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
      </CardContent>
    </Card>

      {validationErrors.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold mb-2">Please fix the following before continuing:</p>
          <ul className="list-disc space-y-1 pl-5">
            {validationErrors.map((error, index) => (
              <li key={`${error}-${index}`}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-2 bg-muted/20 p-2">
          {tabsForInvestmentType.map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              className={`
                flex-shrink-0 h-10 px-4 
                bg-white hover:bg-gray-50
                shadow-sm hover:shadow-md
                border border-gray-200
                rounded-md
                transition-all duration-200
                data-[state=active]:bg-primary 
                data-[state=active]:text-primary-foreground
                data-[state=active]:shadow-md
              `}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Tab Content */}
        <TabsContent value="property" className="p-0 pt-2">
          <PropertyDetailsForm 
            propertyDetails={propertyDetails}
            handlePropertyDetailsChange={handlePropertyDetailsChange}
          />
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => setActiveTab('deal')}
              className="ml-auto"
            >
              Next: Deal Details
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="deal" className="p-0 pt-2">
          <DealDetailsForm 
            dealDetails={dealDetails}
            handleDealDetailsChange={handleDealDetailsChange}
            investmentType={investmentType}
          />
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('property')}
            >
              Back
            </Button>
            <Button 
              onClick={() => {
                // Next tab is rehab for all investment types
                setActiveTab('rehab');
              }}
            >
              Next
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="rehab" className="p-0 pt-2">
          <RehabEstimatorForm
            propertyDetails={propertyDetails}
            onRehabCostChange={(cost) => {
              // Only update if the cost is different
              if (cost !== dealDetails.rehabCost) {
                logger.debug('Updating rehab cost from rehab tab', { 
                  oldCost: dealDetails.rehabCost, 
                  newCost: cost 
                });
                setDealDetails(prev => ({
                  ...prev,
                  rehabCost: cost
                }));
              }
            }}
            onHoldingPeriodChange={(period) => {
              // Only update if the period is different
              if (period !== dealDetails.holdingPeriod) {
                logger.debug('Updating holding period from rehab tab', { 
                  oldPeriod: dealDetails.holdingPeriod, 
                  newPeriod: period 
                });
                setDealDetails(prev => ({
                  ...prev,
                  holdingPeriod: period
                }));
              }
            }}
          />
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('deal')}
            >
              Back
            </Button>
            <Button 
              onClick={() => {
                // All investment types go to rental next
                setActiveTab('rental');
              }}
            >
              Next
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="rental" className="p-0 pt-2">
          <RentalDetailsForm
            rentalDetails={rentalDetails}
            handleRentalDetailsChange={handleRentalDetailsChange}
            handleRentalTypeChange={handleRentalTypeChange}
            investmentType={investmentType}
          />
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('rehab')}
            >
              Back
            </Button>
            <Button 
              onClick={() => {
                // Next tab depends on investment type
                if (investmentType === 'brrrr') {
                  setActiveTab('shortTerm');
                } else {
                  setActiveTab('longTerm');
                }
              }}
            >
              Next
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="shortTerm" className="p-0 pt-2">
          <FinancingDetailsForm 
            financingDetails={financingDetails}
            shortTermFinancing={shortTermFinancing}
            handleFinancingDetailsChange={handleFinancingDetailsChange}
            handleShortTermFinancingChange={handleShortTermFinancingChange}
            investmentType={investmentType}
            isShortTerm={true}
          />
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                if (investmentType === 'flip') {
                  setActiveTab('deal');
                } else {
                  setActiveTab('rental');
                }
              }}
            >
              Back
            </Button>
            <Button 
              onClick={() => {
                if (investmentType === 'flip') {
                  setActiveTab('sale');
                } else {
                  setActiveTab('longTerm');
                }
              }}
            >
              Next
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="longTerm" className="p-0 pt-2">
          <FinancingDetailsForm 
            financingDetails={financingDetails}
            shortTermFinancing={shortTermFinancing}
            handleFinancingDetailsChange={handleFinancingDetailsChange}
            handleShortTermFinancingChange={handleShortTermFinancingChange}
            investmentType={investmentType}
            isShortTerm={false}
          />
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                if (investmentType === 'brrrr') {
                  setActiveTab('shortTerm');
                } else {
                  setActiveTab('rental');
                }
              }}
            >
              Back
            </Button>
            <Button onClick={calculateInvestment}>
              Calculate Investment
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="sale" className="p-0 pt-2">
          <SaleDetailsForm
            saleInputs={saleInputs}
            handleSaleInputsChange={handleSaleInputsChange}
            investmentType={investmentType}
          />
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('shortTerm')}
            >
              Back
            </Button>
            <Button onClick={calculateInvestment}>
              Calculate Investment
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Investment Results Display - Always visible below tabs */}
      {isCalculated && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <InvestmentResultsDisplay
            calculatedOutput={calculatedOutput}
            expandedYears={expandedYears}
            toggleYearExpansion={toggleYearExpansion}
            investmentType={investmentType}
            calculateProfit={calculateProfit}
            calculateBrrrPercentage={calculateBrrrPercentage}
            dealDetails={dealDetails}
            propertyDetails={propertyDetails}
            rentalDetails={rentalDetails}
            handleSendToOffLeash={handleSendToOffLeash}
            handleExportPDF={handleExportPDF}
            handleExportExcel={handleExportExcel}
            isExporting={isExporting}
          />
        </div>
      )}
    </div>
  );
} 
