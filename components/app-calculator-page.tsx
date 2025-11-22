'use client'

// Add this at the very top of your file, before any code
type CalculatedOutputType = {
  [year: number]: {
    months: {
      [month: number]: {
        value: number;
        debt: number;
        displayDebt?: number; // Add '?' if this property might be undefined
        equity: number;
        cashInvested: number;
        displayCashInvested?: number; // Add '?' if this property might be undefined
        totalCashInvested: number;
        interestPaid: number;
        rent: number;
        expenses: number;
        cashFlow: number;
        totalReturn: number;
        returnOnInvestedCash: number;
        dscr: number;
        isRehabPeriod?: boolean; // Optional property
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

// Add these type definitions at the top of the file
type RehabItem = {
  id: string;
  description: string;
  quantity: number;
  rentalPrice: number;
  airbnbPrice: number;
  price: number;
  extended: number;
  checked: boolean;
};

type RehabCategory = {
  [key in 'flooring' | 'kitchen' | 'bathrooms' | 'general' | 'infrastructure' | 'contingency']: RehabItem[];
};

// Add this type definition near the top of the file with other type definitions
type PropertyDetails = {
  address: string;
  squareFootage: string;
  bedrooms: string;
  bathrooms: string;
};

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronUp } from 'lucide-react'

// Import jsPDF and types
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { saveAs } from 'file-saver';

// Add the jsPDF type declaration
// This can be used for methods that need jsPDF type
import type { jsPDF as jsPDFType } from "jspdf";

// Add these imports for the tooltip
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

// Define tooltip components
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
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
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const roundToDollar = (value: number) => Math.round(value);

// Define the formatNumber function outside of the component
const formatNumber = (num: number) => {
  return Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Add logging utility at the top of the file
const log = (message: string, data?: unknown) => {
  console.log(`[Calculator]: ${message}`, data || '');
};

// Updated code using CalculatedOutputType
const findMaxTotalCashInvested = (output: CalculatedOutputType) => {
  let maxCash = 0;
  Object.keys(output).forEach(year => {
    Object.keys(output[parseInt(year)].months).forEach(month => {
      const totalCashInvested = output[parseInt(year)].months[parseInt(month)].totalCashInvested;
      if (totalCashInvested > maxCash) {
        maxCash = totalCashInvested;
      }
    });
  });
  return maxCash;
};

const findMinTotalCashInvested = (
  output: CalculatedOutputType, 
  type: string = 'buyAndHold',
  details: { holdingPeriod: string } = { holdingPeriod: '0' }
) => {
  log('Finding after refinance cash invested', { type, details });
  
  // For BRRRR, we want the total cash invested in the month after refinance
  if (type === 'brrrr') {
    const rehabDuration = parseInt(details.holdingPeriod) || 0;
    const refinanceMonth = rehabDuration + 1;
    const refinanceYear = Math.floor(refinanceMonth / 12) + 1;
    const monthInYear = refinanceMonth % 12 || 12;
    
    log('Refinance timing calculated:', { rehabDuration, refinanceMonth, refinanceYear, monthInYear });
    
    // Return the total cash invested for the refinance month
    return output[refinanceYear]?.months[monthInYear]?.totalCashInvested || 0;
  }
  
  // For other investment types, find the minimum across all months
  return Object.values(output).reduce((min, yearData) => {
    const yearMin = Object.values(yearData.months).reduce((monthMin, monthData) => {
      return Math.min(monthMin, monthData.totalCashInvested);
    }, Infinity);
    return Math.min(min, yearMin);
  }, Infinity);
};

// Update any other helper functions similarly

// Add or update this helper function
const calculateTotalCashFlow = (output: CalculatedOutputType) => {
  return Object.values(output).reduce((total, yearData) => {
    return total + Object.values(yearData.months).reduce((yearTotal, monthData) => {
      return yearTotal + (monthData.cashFlow || 0);
    }, 0);
  }, 0);
};

export function Page() {
  const [investmentType, setInvestmentType] = useState('buyAndHold');
  const [activeTab, setActiveTab] = useState('property');
  const [propertyDetails, setPropertyDetails] = useState({
    address: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: ''
  })
  const [dealDetails, setDealDetails] = useState({
    purchasePrice: '',
    rehabCost: '',
    holdingPeriod: '',
    closingCosts: '',
    afterRepairValue: ''
  })
  const [shortTermFinancing, setShortTermFinancing] = useState({
    interestRate: '10',
    lendersPoints: '1',
    purchaseLoaned: '80',
    rehabLoaned: '80'
  })
  const [financingDetails, setFinancingDetails] = useState({
    loanTerm: '30',
    interestRate: '7',
    lenderPoints: '0',
    loanToValue: '75'
  })
  const [rentalDetails, setRentalDetails] = useState({
    rentalType: 'longTerm',
    annualAppreciation: '2',
    annualInsurance: '1200',
    annualPropertyTax: '',
    monthlyRent: '',
    annualMaintenance: '7',
    annualCapex: '7',
    pmFee: '10',
    averageLeaseLength: '3',
    leaseUpFee: '',
    furnitureAndDecorations: '10000',
    personalUsage: '0',
    shortTermPmFee: '20',
    vacancyRate: '3'  // New field for Vacancy Rate
  })
  const [rehabStrategy, setRehabStrategy] = useState('rental')
  const [rehabDetails, setRehabDetails] = useState<RehabCategory>({
    flooring: [
      { id: 'lvpFlooring', description: 'LVP Flooring:', quantity: 0, rentalPrice: 6, airbnbPrice: 7, price: 6, extended: 0, checked: false },
      { id: 'carpeting', description: 'Carpeting:', quantity: 0, rentalPrice: 2.5, airbnbPrice: 3.5, price: 2.5, extended: 0, checked: false },
    ],
    kitchen: [
      { id: 'newKitchen', description: 'New Kitchen:', quantity: 0, rentalPrice: 7000, airbnbPrice: 12500, price: 7000, extended: 0, checked: false },
      { id: 'kitchenAppliances', description: 'Kitchen Appliances:', quantity: 0, rentalPrice: 3000, airbnbPrice: 3500, price: 3000, extended: 0, checked: false },
      { id: 'newCountertops', description: 'New Countertops:', quantity: 0, rentalPrice: 1500, airbnbPrice: 3500, price: 1500, extended: 0, checked: false },
      { id: 'paintCabinets', description: 'Paint Cabinets + Pulls:', quantity: 0, rentalPrice: 1200, airbnbPrice: 1200, price: 1200, extended: 0, checked: false },
    ],
    bathrooms: [
      { id: 'newBathroom', description: 'New Bathroom:', quantity: 0, rentalPrice: 5500, airbnbPrice: 7500, price: 5500, extended: 0, checked: false },
      { id: 'newVanity', description: 'New Vanity:', quantity: 0, rentalPrice: 400, airbnbPrice: 600, price: 400, extended: 0, checked: false },
      { id: 'newMirrorLight', description: 'New Mirror/Light:', quantity: 0, rentalPrice: 300, airbnbPrice: 300, price: 300, extended: 0, checked: false },
      { id: 'newToilet', description: 'New Toilet:', quantity: 0, rentalPrice: 450, airbnbPrice: 450, price: 450, extended: 0, checked: false },
    ],
    general: [
      { id: 'doorKnobs', description: 'Door Knobs:', quantity: 0, rentalPrice: 40, airbnbPrice: 60, price: 40, extended: 0, checked: false },
      { id: 'newInteriorDoors', description: 'New Interior Doors:', quantity: 0, rentalPrice: 275, airbnbPrice: 275, price: 275, extended: 0, checked: false },
      { id: 'newExteriorDoors', description: 'New Exterior Doors:', quantity: 0, rentalPrice: 500, airbnbPrice: 750, price: 500, extended: 0, checked: false },
      { id: 'newWindows', description: 'New Windows:', quantity: 0, rentalPrice: 450, airbnbPrice: 450, price: 450, extended: 0, checked: false },
      { id: 'windowBlinds', description: 'Window Blinds:', quantity: 0, rentalPrice: 35, airbnbPrice: 60, price: 35, extended: 0, checked: false },
      { id: 'drywall', description: 'Drywall:', quantity: 0, rentalPrice: 15.5, airbnbPrice: 17, price: 15.5, extended: 0, checked: false },
      { id: 'wallPrep', description: 'Interior Wall Prep and Prime:', quantity: 0, rentalPrice: 3, airbnbPrice: 3, price: 3, extended: 0, checked: false },
      { id: 'interiorPaint', description: 'Interior Paint:', quantity: 0, rentalPrice: 3, airbnbPrice: 3, price: 3, extended: 0, checked: false },
      { id: 'exteriorPaint', description: 'Exterior Paint:', quantity: 0, rentalPrice: 5500, airbnbPrice: 5500, price: 5500, extended: 0, checked: false },
      { id: 'newSidingFascia', description: 'New Siding + Fascia:', quantity: 0, rentalPrice: 15000, airbnbPrice: 20000, price: 15000, extended: 0, checked: false },
      { id: 'landscaping', description: 'Landscaping:', quantity: 0, rentalPrice: 1500, airbnbPrice: 2500, price: 1500, extended: 0, checked: false },
      { id: 'basementDryLock', description: 'Basement Dry Lock:', quantity: 0, rentalPrice: 2000, airbnbPrice: 2000, price: 2000, extended: 0, checked: false },
      { id: 'concretePorchWork', description: 'Concrete Porch Work:', quantity: 0, rentalPrice: 1500, airbnbPrice: 1500, price: 1500, extended: 0, checked: false },
      { id: 'smokeCoDetectors', description: 'Smoke/CO2 Detectors:', quantity: 0, rentalPrice: 50, airbnbPrice: 50, price: 50, extended: 0, checked: false },
    ],
    infrastructure: [
      { id: 'electrical', description: 'New Electrical (rewire):', quantity: 0, rentalPrice: 8000, airbnbPrice: 8000, price: 8000, extended: 0, checked: false },
      { id: 'newRoof', description: 'New Roof:', quantity: 0, rentalPrice: 10000, airbnbPrice: 10000, price: 10000, extended: 0, checked: false },
      { id: 'newAC', description: 'New AC:', quantity: 0, rentalPrice: 3500, airbnbPrice: 3500, price: 3500, extended: 0, checked: false },
      { id: 'newFurnace', description: 'New Furnace:', quantity: 0, rentalPrice: 3500, airbnbPrice: 3500, price: 3500, extended: 0, checked: false },
      { id: 'waterHeater', description: 'Water Heater:', quantity: 0, rentalPrice: 1500, airbnbPrice: 1500, price: 1500, extended: 0, checked: false },
    ],
    contingency: [
      { id: 'unexpectedPerFoot', description: 'Unexpected Per Foot:', quantity: 0, rentalPrice: 5, airbnbPrice: 5, price: 5, extended: 0, checked: false },
      { id: 'customItem1', description: '', quantity: 0, rentalPrice: 0, airbnbPrice: 0, price: 0, extended: 0, checked: false },
    ],
  })

  console.log('Initializing state variables')
  console.log('Setting up expanded years and sale inputs')
  console.log('Initializing expanded years state')


  console.log('Initializing sale inputs state')
  // Sale-related inputs and settings
  const [saleInputs, setSaleInputs] = useState({
    agentCommission: 6,
    closingCosts: 1, 
    timeOnMarket: 2,
    marginalTaxRate: 24  // Add default value of 24%
  })
// Use the type alias you just created
const [calculatedOutput, setCalculatedOutput] = useState<CalculatedOutputType>({});

  const [isCalculated, setIsCalculated] = useState(false);

  // Add this state at the top with other state declarations
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Move calculateTotalRehabCost up here
  const calculateTotalRehabCost = useCallback((state = rehabDetails) => {
    log('Calculating total rehab cost');
    return Object.values(state).reduce((total, category) => 
      total + category.reduce((categoryTotal, item) => 
        categoryTotal + (item.checked ? item.extended : 0), 0)
    , 0);
  }, [rehabDetails]);

  // Add this new helper function to calculate rehab duration
  const calculateRehabDuration = useCallback((rehabCost: number): number => {
    log('Calculating rehab duration for cost:', rehabCost);
    
    // For BRRRR and flip, ensure minimum of 1 month
    if (investmentType === 'brrrr' || investmentType === 'flip') {
      if (rehabCost <= 0) return 1;
      if (rehabCost <= 15000) return 1;
      if (rehabCost <= 30000) return 2;
      if (rehabCost <= 50000) return 3;
      if (rehabCost <= 75000) return 4;
      if (rehabCost <= 100000) return 5;
      return 6;
    }
    
    // For buy and hold, allow 0 months
    if (rehabCost <= 0) return 0;
    if (rehabCost <= 15000) return 1;
    if (rehabCost <= 30000) return 2;
    if (rehabCost <= 50000) return 3;
    if (rehabCost <= 75000) return 4;
    if (rehabCost <= 100000) return 5;
    return 6;
  }, [investmentType]);

  // Remove the separate useEffect for updateRehabDetails
  useEffect(() => {
    log('Initial setup');
    setActiveTab('property');
    
    // Update rehab details inline
    setRehabDetails(prevState => {
      const newState = { ...prevState };
      const isFlipAirbnb = rehabStrategy === 'flipAirbnb';

      const squareFootage = parseFloat(propertyDetails.squareFootage) || 0;
      const bathroomCount = Math.ceil(parseFloat(propertyDetails.bathrooms) || 0);
      const bedroomCount = Math.ceil(parseFloat(propertyDetails.bedrooms) || 0);
      const doorCount = bedroomCount + bathroomCount + 1;

      // Update all items
      Object.keys(newState).forEach(category => {
        newState[category as keyof typeof newState].forEach((item: RehabItem) => {
          // Set the price based on the strategy
          item.price = isFlipAirbnb ? item.airbnbPrice : item.rentalPrice;

          // Set quantities based on specific rules
          if (item.id === 'unexpectedPerFoot') {
            item.quantity = squareFootage;
          } else if (item.id.startsWith('customItem')) {
            // Keep the existing quantity for custom items
          } else if (['lvpFlooring', 'carpeting', 'drywall', 'wallPrep', 'interiorPaint', 'unexpectedPerFoot'].includes(item.id)) {
            item.quantity = squareFootage;
          } else if (['newBathroom', 'newVanity', 'newMirrorLight', 'newToilet'].includes(item.id)) {
            item.quantity = bathroomCount;
          } else if (['doorKnobs', 'newInteriorDoors'].includes(item.id)) {
            item.quantity = doorCount;
          } else if (item.id === 'newExteriorDoors') {
            item.quantity = 2;
          } else if (['newWindows', 'windowBlinds'].includes(item.id)) {
            item.quantity = 10;
          } else if (item.id === 'smokeCoDetectors') {
            item.quantity = bedroomCount + 2;
          } else if (category === 'kitchen' || ['newRoof', 'electrical', 'landscaping', 'basementDryLock', 'concretePorchWork', 
                                              'newAC', 'newFurnace', 'waterHeater', 'exteriorPaint', 'newSidingFascia'].includes(item.id)) {
            item.quantity = 1;
          }

          // Calculate extended price
          item.extended = item.checked ? item.price * item.quantity : 0;
        });
      });

      // Recalculate total rehab cost and update deal details
      const totalRehabCost = calculateTotalRehabCost(newState);
      setDealDetails(prevDealDetails => ({
        ...prevDealDetails,
        rehabCost: totalRehabCost.toFixed(2)
      }));

      return newState;
    });
  }, [propertyDetails, rehabStrategy, calculateTotalRehabCost]);

  const updateRehabDetails = useCallback((propertyDetails: PropertyDetails, strategy: string) => {
    console.log('Updating rehab details', { propertyDetails, strategy });
    
    setRehabDetails(prevState => {
      const newState = { ...prevState };
      const isFlipAirbnb = strategy === 'flipAirbnb';

      const squareFootage = parseFloat(propertyDetails.squareFootage) || 0;
      const bathroomCount = Math.ceil(parseFloat(propertyDetails.bathrooms) || 0);
      const bedroomCount = Math.ceil(parseFloat(propertyDetails.bedrooms) || 0);
      const doorCount = bedroomCount + bathroomCount + 1;

      // Update all items in a single pass
      (Object.keys(newState) as Array<keyof typeof newState>).forEach(category => {
        newState[category] = newState[category].map(item => {
          // Set the price based on the strategy
          const price = isFlipAirbnb ? item.airbnbPrice : item.rentalPrice;

          // Calculate quantity based on specific rules
          let quantity = item.quantity;
          if (item.id === 'unexpectedPerFoot' || 
              ['lvpFlooring', 'carpeting', 'drywall', 'wallPrep', 'interiorPaint'].includes(item.id)) {
            quantity = squareFootage;
          } else if (['newBathroom', 'newVanity', 'newMirrorLight', 'newToilet'].includes(item.id)) {
            quantity = bathroomCount;
          } else if (['doorKnobs', 'newInteriorDoors'].includes(item.id)) {
            quantity = doorCount;
          } else if (item.id === 'newExteriorDoors') {
            quantity = 2;
          } else if (['newWindows', 'windowBlinds'].includes(item.id)) {
            quantity = 10;
          } else if (item.id === 'smokeCoDetectors') {
            quantity = bedroomCount + 2;
          } else if (category === 'kitchen' || ['newRoof', 'electrical', 'landscaping', 'basementDryLock', 
                    'concretePorchWork', 'newAC', 'newFurnace', 'waterHeater', 'exteriorPaint', 
                    'newSidingFascia'].includes(item.id)) {
            quantity = 1;
          }

          return {
            ...item,
            price,
            quantity,
            extended: item.checked ? quantity * price : 0
          };
        });
      });

      // Recalculate total rehab cost
      const totalRehabCost = calculateTotalRehabCost(newState);
      setDealDetails(prevDealDetails => ({
        ...prevDealDetails,
        rehabCost: totalRehabCost.toFixed(2)
      }));

      return newState;
    });
  }, [calculateTotalRehabCost]);

  useEffect(() => {
    log('Component mounted');
    if (dealDetails.afterRepairValue) {
      updateAnnualPropertyTax(dealDetails.afterRepairValue);
    }
    if (rentalDetails.monthlyRent) {
      updateLeaseUpFee(rentalDetails.monthlyRent);
    }
  }, [dealDetails.afterRepairValue, rentalDetails.monthlyRent]);

  // First, modify this useEffect to only run on actual investment type changes
  useEffect(() => {
    // Only reset to property tab when investment type (flip/brrrr/buyAndHold) changes
    if (investmentType === 'flip' || investmentType === 'brrrr' || investmentType === 'buyAndHold') {
      setActiveTab('property');
    }
  }, [investmentType]);

  useEffect(() => {
    if (dealDetails.rehabCost === '') {
      const totalCost = calculateTotalRehabCost();
      const duration = calculateRehabDuration(totalCost);
      setDealDetails(prev => ({
        ...prev,
        rehabCost: totalCost.toString(),
        holdingPeriod: duration.toString()
      }));
    }
  }, [dealDetails.rehabCost, calculateTotalRehabCost, calculateRehabDuration]);

  const resetCalculationState = () => {
    log('Resetting calculation state');
    setCalculatedOutput({});
    setIsCalculated(false);
    setExpandedYears({});
  };

  const handleInvestmentTypeChange = (type: 'flip' | 'brrrr' | 'buyAndHold') => {
    log('Changing investment type:', { type });
    setIsTransitioning(true);
    setTimeout(() => {
      setInvestmentType(type);
      setActiveTab('property');
      setIsTransitioning(false);
      setIsCalculated(false);
      setCalculatedOutput({});
      setExpandedYears({});
    }, 150);
  };

  const handlePropertyDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    log('Property details changed', { name, value });
    
    resetCalculationState();
    
    setPropertyDetails(prevDetails => ({
      ...prevDetails,
      [name]: value
    }));

    // If square footage changes, update rehab details
    if (name === 'squareFootage' || name === 'bedrooms' || name === 'bathrooms') {
      updateRehabDetails({ ...propertyDetails, [name]: value }, rehabStrategy);
    }
  };

  const handleDealDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    log('Deal details changed:', { field: e.target.name, value: e.target.value });
    const newValue = e.target.value;
    
    setDealDetails(prevDetails => {
      const updatedDetails = { ...prevDetails, [e.target.name]: newValue };
      
      // Automatically calculate closing costs when purchase price changes
      if (e.target.name === 'purchasePrice') {
        const purchasePrice = parseFloat(newValue) || 0;
        const calculatedClosingCosts = (purchasePrice * 0.015).toFixed(2);
        updatedDetails.closingCosts = calculatedClosingCosts;
      }
      
      return updatedDetails;
    });
  };

  const handleShortTermFinancingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetCalculationState();
    setShortTermFinancing({ ...shortTermFinancing, [e.target.name]: e.target.value });
  };

  const handleFinancingDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetCalculationState();
    setFinancingDetails({ ...financingDetails, [e.target.name]: e.target.value });
  };

  const handleRentalDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    resetCalculationState();
    
    setRentalDetails(prevDetails => {
      const newDetails = { ...prevDetails, [name]: value };
      
      if (name === 'monthlyRent') {
        updateLeaseUpFee(value);
      }
      
      return newDetails;
    });
  };

  const handleRentalTypeChange = (value: string) => {
    log('Changing rental type:', value);
    
    setRentalDetails(prevDetails => {
      const bedroomCount = parseInt(propertyDetails.bedrooms) || 0;
      
      // Set default values for short/mid term rentals
      if (value === 'shortMidTerm') {
        return {
          ...prevDetails,
          rentalType: value,
          // Reset rental-specific fields
          monthlyRent: '',
          vacancyRate: '',
          leaseUpFee: '',
          averageLeaseLength: '',
          // Set default values for short term rentals
          furnitureAndDecorations: (bedroomCount * 5000).toString(),
          annualMaintenance: '7',
          annualCapex: '7',
          shortTermPmFee: '20',
          personalUsage: '0'
        };
      }
      
      // For other rental types, reset to empty values
      return {
        ...prevDetails,
        rentalType: value,
        monthlyRent: '',
        annualMaintenance: '',
        annualCapex: '',
        vacancyRate: '',
        pmFee: '',
        shortTermPmFee: '',
        leaseUpFee: '',
        averageLeaseLength: '',
        personalUsage: '',
        furnitureAndDecorations: ''
      };
    });
  };

  const handleRehabStrategyChange = (value: string) => {
    log('Changing rehab strategy to:', value);
    
    // Prevent any state updates that might trigger unwanted tab changes
    const currentTab = activeTab;
    
    setIsTransitioning(true);
    setRehabStrategy(value);
    
    // Force the tab to stay on rehab
    setActiveTab(currentTab);
    
    // Update rehab details with new strategy
    updateRehabDetails(propertyDetails, value);
    
    setTimeout(() => {
      setIsTransitioning(false);
      // Ensure we're still on the same tab after the transition
      setActiveTab(currentTab);
    }, 150);
  };

  const handleRehabDetailsChange = (category: string, itemId: string, field: string, value: string | number | boolean) => {
    log('Updating rehab details', { category, itemId, field, value });
    
    setRehabDetails(prevState => {
      const newState = { ...prevState };
      const itemIndex = newState[category as keyof typeof prevState].findIndex(item => item.id === itemId);
      
      if (itemIndex !== -1) {
        const item = { ...newState[category as keyof typeof prevState][itemIndex] };
        
        if (field === 'checked') {
          item.checked = value as boolean;
          item.extended = item.checked ? item.quantity * item.price : 0;
        } else if (field === 'quantity') {
          item.quantity = parseFloat(value as string) || 0;
          item.extended = item.checked ? item.quantity * item.price : 0;
        } else if (field === 'price') {
          item.price = parseFloat(value as string) || 0;
          item.extended = item.checked ? item.quantity * item.price : 0;
        } else if (field === 'description') {
          item.description = value as string;
        }
        
        newState[category as keyof typeof newState][itemIndex] = item;
      }
      
      // Calculate total rehab cost and duration
      const totalRehabCost = calculateTotalRehabCost(newState);
      const calculatedDuration = calculateRehabDuration(totalRehabCost);
      
      // Update deal details with both new values
      setDealDetails(prev => ({
        ...prev,
        rehabCost: totalRehabCost.toFixed(2),
        holdingPeriod: calculatedDuration.toString()
      }));
      
      return newState;
    });
  };

  const handleSaleInputsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetCalculationState();
    setSaleInputs({ ...saleInputs, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSave = async () => {
    log('Saving investment details...');
    
    if (!isCalculated) {
      calculateInvestment();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const doc = new jsPDF();
    let yPos = 40;
    
    // Define a type for the section content function
    type SectionContentFunction = () => void;

    // Update the addSection function signature
    const addSection = (title: string, content: SectionContentFunction) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(41, 128, 185);
      doc.rect(0, yPos - 15, 220, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(title, 10, yPos - 8);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      content();
    };
    
    // Title bar
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 220, 25, 'F');
    
    // Title (centered)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${investmentType.toUpperCase()} Investment Analysis`, 105, 15, { align: "center" });
    
    // Key Metrics Section
    doc.setFillColor(41, 128, 185);
    doc.rect(0, yPos - 15, 220, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("KEY METRICS", 10, yPos - 8);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    yPos += 10;
    
    if (investmentType === 'buyAndHold') {
      const roi = calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash;
      const totalReturn = calculatedOutput[1]?.yearlyTotals?.totalReturn;
      const cashRequired = findMaxTotalCashInvested(calculatedOutput);
      
      setTextColorForValue(doc, roi);
      doc.text(`Annual Return on Invested Cash: ${!roi || isNaN(roi) ? 'No Input' : roi === Infinity ? '∞' : roi.toFixed(2) + '%'}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, totalReturn);
      doc.text(`Total Return: ${formatPDFNumber(totalReturn)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, cashRequired);
      doc.text(`Cash Required: ${formatPDFNumber(cashRequired)}`, 10, yPos);
      yPos += 15;
    } else if (investmentType === 'brrrr') {
      const cashRequired = findMaxTotalCashInvested(calculatedOutput);
      const afterRefinance = findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails);
      const roi = calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash;
      const totalReturn = calculatedOutput[1]?.yearlyTotals?.totalReturn;
      const brrrPercentage = calculateBrrrPercentage();
      
      setTextColorForValue(doc, cashRequired);
      doc.text(`Cash Required: ${formatPDFNumber(cashRequired)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, afterRefinance);
      doc.text(`After Refinance Cash Invested: ${formatPDFNumber(afterRefinance)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, roi);
      doc.text(`Annual Return on Invested Cash: ${!roi || isNaN(roi) ? 'No Input' : roi === Infinity ? '∞' : roi.toFixed(2) + '%'}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, totalReturn);
      doc.text(`Total Return: ${formatPDFNumber(totalReturn)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, brrrPercentage);
      doc.text(`BRRRR Percentage: ${!brrrPercentage || isNaN(brrrPercentage) ? 'No Input' : brrrPercentage.toFixed(2) + '%'}`, 10, yPos);
      yPos += 15;
    } else if (investmentType === 'flip') {
      const cashRequired = findMaxTotalCashInvested(calculatedOutput);
      const profit = calculateProfit();
      const profitAfterTax = profit * (1 - Number(saleInputs.marginalTaxRate) / 100);
      
      console.log('Cash required:', cashRequired);
      console.log('Profit:', profit); 
      console.log('Profit after tax:', profitAfterTax);
      setTextColorForValue(doc, cashRequired);
      doc.text(`Cash Required: ${formatPDFNumber(cashRequired)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, profit);
      doc.text(`Profit: ${formatPDFNumber(profit)}`, 10, yPos);
      yPos += 7;
      
      setTextColorForValue(doc, profitAfterTax);
      doc.text(`Profit After Tax: ${formatPDFNumber(profitAfterTax)}`, 10, yPos);
      yPos += 15;
    }

    // Property Overview
    addSection("Property Overview", () => {
      yPos += 10;
      doc.text(`Address: ${propertyDetails.address}`, 10, yPos);
      doc.text(`Square Footage: ${propertyDetails.squareFootage}`, 120, yPos);
      yPos += 7;
      doc.text(`Bedrooms: ${propertyDetails.bedrooms}`, 10, yPos);
      doc.text(`Bathrooms: ${propertyDetails.bathrooms}`, 120, yPos);
      yPos += 15;
    });

    // Deal Structure
    addSection("Deal Structure", () => {
      yPos += 10;
      doc.text(`Purchase Price: $${formatNumber(parseFloat(dealDetails.purchasePrice))}`, 10, yPos);
      doc.text(`After Repair Value: $${formatNumber(parseFloat(dealDetails.afterRepairValue))}`, 120, yPos);
      yPos += 7;
      doc.text(`Rehab Cost: $${formatNumber(parseFloat(dealDetails.rehabCost))}`, 10, yPos);
      doc.text(`Rehab Duration: ${dealDetails.holdingPeriod} months`, 120, yPos);
      yPos += 15;
    });

    // Financing Details
    addSection("Financing", () => {
      yPos += 10;
      if (investmentType === 'brrrr' || investmentType === 'flip') {
        doc.text("Short Term Financing:", 10, yPos);
        yPos += 7;
        doc.text(`Interest Rate: ${shortTermFinancing.interestRate}%`, 15, yPos);
        doc.text(`Points: ${shortTermFinancing.lendersPoints}`, 120, yPos);
        yPos += 7;
        doc.text(`Purchase Loaned: ${shortTermFinancing.purchaseLoaned}%`, 15, yPos);
        doc.text(`Rehab Loaned: ${shortTermFinancing.rehabLoaned}%`, 120, yPos);
        yPos += 10;
      }
      
      if (investmentType !== 'flip') {
        doc.text("Long Term Financing:", 10, yPos);
        yPos += 7;
        doc.text(`Interest Rate: ${financingDetails.interestRate}%`, 15, yPos);
        doc.text(`Term: ${financingDetails.loanTerm} years`, 120, yPos);
        yPos += 7;
        doc.text(`LTV: ${financingDetails.loanToValue}%`, 15, yPos);
        doc.text(`Points: ${financingDetails.lenderPoints}`, 120, yPos);
      }
      yPos += 15;
    });

    // Rehab Details
    addSection("Rehab Details", () => {
      yPos += 10;
      Object.entries(rehabDetails).forEach(([category, items]) => {
        const selectedItems = items.filter(item => item.checked);
        if (selectedItems.length > 0) {
          doc.setFont("helvetica", "bold");
          doc.text(category.charAt(0).toUpperCase() + category.slice(1), 10, yPos);
          yPos += 7;
          
          doc.setFont("helvetica", "normal");
          selectedItems.forEach(item => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(`${item.description}: $${formatNumber(item.extended)}`, 15, yPos);
            yPos += 7;
          });
          yPos += 3;
        }
      });
    });

    // Annual Projections
    if (investmentType !== 'flip') {
      addSection("5 Year Projections", () => {
        yPos += 10;
        // Headers
        const headers = ['Year', 'Value', 'Equity', 'Cash Flow', 'ROI'];
        const colWidths = [30, 40, 40, 40, 30];
        headers.forEach((header, i) => {
          const x = 10 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.text(header, x, yPos);
        });
        yPos += 7;
        
        // Data rows
        for (let year = 1; year <= 5; year++) {
          const yearData = calculatedOutput[year];
          if (yearData) {
            const values = [
              year.toString(),
              `$${formatNumber(yearData.months[12].value)}`,
              `$${formatNumber(yearData.months[12].equity)}`,
              `$${formatNumber(yearData.yearlyTotals.cashFlow)}`,
              `${formatNumber(yearData.yearlyTotals.returnOnInvestedCash)}%`
            ];
            
            values.forEach((value, i) => {
              const x = 10 + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
              doc.text(value, x, yPos);
            });
            yPos += 7;
          }
        }
      });
    }

    // Save the PDF with dynamic filename
    const pdfBlob = doc.output('blob');
    const filename = propertyDetails.address 
      ? `${propertyDetails.address.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      : 'RE_Calculator.pdf';
    saveAs(pdfBlob, filename);
    
    log('PDF saved successfully', { filename });
  };

  // Fix the property name in calculateProfit function
  const calculateProfit = (): number => {
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue);
    const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
    const purchasePrice = parseFloat(dealDetails.purchasePrice);
    
    // Validate required inputs
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      log('Error: Purchase price is required and must be greater than 0', { purchasePrice });
      return 0;
    }
    
    if (isNaN(afterRepairValue) || afterRepairValue <= 0) {
      log('Error: After repair value is required and must be greater than 0', { afterRepairValue });
      return 0;
    }
    
    // Calculate profit for flips
    if (investmentType === 'flip') {
      const sellingCosts = afterRepairValue * ((parseFloat(String(saleInputs.agentCommission)) / 100) + 
        (parseFloat(String(saleInputs.closingCosts)) / 100));
      const holdingCosts = (purchasePrice * parseFloat(shortTermFinancing.interestRate) / 100 / 12) * 
        parseInt(dealDetails.holdingPeriod || '0');
      const totalCosts = purchasePrice + rehabCost + holdingCosts + sellingCosts;
      const profit = afterRepairValue - totalCosts;
      
      log('Flip profit calculation:', {
        afterRepairValue,
        purchasePrice,
        rehabCost,
        holdingCosts,
        sellingCosts,
        totalCosts,
        profit
      });
      
      return profit;
    }

    // For non-flip investments, continue with normal calculations
    // ... existing code ...
    return 0; // Default return for non-flip investments
  };

  // Add calculateBrrrPercentage function
  const calculateBrrrPercentage = (): number => {
    log('Calculating BRRRR percentage');
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue);
    
    // Validate inputs
    if (isNaN(afterRepairValue) || afterRepairValue <= 0) {
      log('Error: After repair value is required and must be greater than 0', { afterRepairValue });
      return 0;
    }
    
    const loanToValue = parseFloat(financingDetails.loanToValue) / 100 || 0;
    const afterRefinanceCashInvested = findMinTotalCashInvested(calculatedOutput, investmentType, dealDetails);
    
    const percentage = ((afterRepairValue * (1 - loanToValue)) - afterRefinanceCashInvested) / 
                    (afterRepairValue * (1 - loanToValue)) * 100;
    
    log('BRRRR percentage calculated:', { percentage });
    return percentage;
  };

  // Add getTabsForInvestmentType function
  const getTabsForInvestmentType = () => {
    switch (investmentType) {
      case 'buyAndHold':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Rental Details' },
          { value: 'longTerm', label: 'Long Term Financing' },
        ]
      case 'brrrr':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Rental Details' },
          { value: 'shortTerm', label: 'Short Term Financing' },
          { value: 'longTerm', label: 'Long Term Financing' },
        ]
      case 'flip':
        return [
          { value: 'property', label: 'Property Details' },
          { value: 'deal', label: 'Deal Details' },
          { value: 'rehab', label: 'Rehab Estimator' },
          { value: 'rental', label: 'Ongoing Expenses' },
          { value: 'shortTerm', label: 'Short Term Financing' },
          { value: 'sale', label: 'Sales Inputs' },
        ]
      default:
        return []
    }
  }

  // Add addCustomRehabItem function
  const addCustomRehabItem = (): void => {
    setRehabDetails(prevState => {
      const newState = {
        ...prevState,
        contingency: [
          ...prevState.contingency,
          { 
            id: `customItem${prevState.contingency.length}`, 
            description: '', 
            quantity: 1, 
            rentalPrice: 0, 
            airbnbPrice: 0, 
            price: 0, 
            extended: 0, 
            checked: true 
          }
        ]
      };
      
      // Immediately update rehab details
      updateRehabDetails(propertyDetails, rehabStrategy);
      
      return newState;
    });
  };

  // Ensure we have the previously removed functions
  const updateAnnualPropertyTax = (afterRepairValue: string) => {
    const taxValue = (parseFloat(afterRepairValue) * 0.01).toString(); // Convert to string
    setRentalDetails(prevDetails => ({
      ...prevDetails,
      annualPropertyTax: taxValue
    }));
  };

  // Add this interface near the top of your file with other interfaces
  interface ExpandedYearsState {
    [key: number]: boolean;
  }

  // Update the state declaration
  const [expandedYears, setExpandedYears] = useState<ExpandedYearsState>({});

  // Update the toggle function
  const toggleYearExpansion = (year: number) => {
    setExpandedYears((prevState) => ({
      ...prevState,
      [year]: !prevState[year]
    }));
  };

  const updateLeaseUpFee = (monthlyRent: string) => {
    const leaseUpFee = (parseFloat(monthlyRent) * 0.5).toFixed(2);
    setRentalDetails(prevDetails => ({
      ...prevDetails,
      leaseUpFee: leaseUpFee
    }));
  };

  // Helper function to format numbers for PDF with negative values
  const formatPDFNumber = (value: number, prefix: string = '$') => {
    if (isNaN(value)) return 'No Input';
    if (value === Infinity) return '∞';
    
    const isNegative = value < 0;
    const formattedValue = `${prefix}${formatNumber(Math.abs(value))}`;
    return isNegative ? `-${formattedValue}` : formattedValue;
  };

  // Helper function to set text color based on value for PDF
  const setTextColorForValue = (doc: jsPDFType, value: number) => {
    doc.setTextColor(value < 0 ? 255 : 0, 0, 0);
  };

  // Add this calculateInvestment function
  const calculateInvestment = () => {
    log('Starting investment calculation');
    
    // Reset the calculated output
    const newOutput: CalculatedOutputType = {};
    
    // Get basic variables
    const purchasePrice = parseFloat(dealDetails.purchasePrice);
    const afterRepairValue = parseFloat(dealDetails.afterRepairValue);
    const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
    const closingCosts = parseFloat(String(dealDetails.closingCosts || '0'));
    
    // Validation
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      log('Invalid purchase price', { purchasePrice });
      return;
    }
    
    // Ensure minimum rehab duration of 1 month for BRRRR and flip
    const rehabDuration = (investmentType === 'brrrr' || investmentType === 'flip') 
      ? Math.max(1, parseInt(dealDetails.holdingPeriod) || 0)
      : parseInt(dealDetails.holdingPeriod) || 0;
    
    log('Rehab duration set to:', { rehabDuration, investmentType });
    
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
    const shortTermLenderPoints = parseFloat(shortTermFinancing.lendersPoints) / 100;

    // Functions
    const calculateMortgagePayment = (principal: number, rate: number, termMonths: number) => {
      if (principal <= 0 || rate <= 0 || termMonths <= 0) return 0;
      return (principal * rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
    };

    const calculateExpenses = (year: number, month: number, monthlyRent: number, interestPaid: number, principalPaid: number, isRehabPeriod: boolean) => {
      const annualInsurance = parseFloat(rentalDetails.annualInsurance) || 0;
      const annualPropertyTax = parseFloat(rentalDetails.annualPropertyTax) || 0;
      
      // Basic expenses that apply to all properties
      let expenses = annualInsurance / 12 + annualPropertyTax / 12;
      
      // Add rental-specific expenses if not a flip or if it's a flip after rehab
      if (rentalDetails.rentalType !== 'noRental') {
        if (rentalDetails.rentalType === 'longTerm') {
          const annualMaintenance = parseFloat(rentalDetails.annualMaintenance) / 100 || 0;
          const vacancyRate = parseFloat(rentalDetails.vacancyRate) / 100 || 0;
          const annualCapex = parseFloat(rentalDetails.annualCapex) / 100 || 0;
          const pmFee = parseFloat(rentalDetails.pmFee) / 100 || 0;
          
          expenses += monthlyRent * (annualMaintenance + vacancyRate + annualCapex + pmFee);
        } else if (rentalDetails.rentalType === 'shortMidTerm') {
          const annualMaintenance = parseFloat(rentalDetails.annualMaintenance) / 100 || 0;
          const vacancyRate = parseFloat(rentalDetails.vacancyRate) / 100 || 0;
          const annualCapex = parseFloat(rentalDetails.annualCapex) / 100 || 0;
          const pmFee = parseFloat(rentalDetails.shortTermPmFee) / 100 || 0;
          
          expenses += monthlyRent * (annualMaintenance + vacancyRate + annualCapex + pmFee);
        }
      }

      // Add interest paid to expenses
      if (Math.abs(interestPaid) > 0) {
        expenses += Math.abs(interestPaid);
      }
      
      // Add principal paid to expenses (only if not in rehab period)
      if (!isRehabPeriod && Math.abs(principalPaid) > 0) {
        expenses += Math.abs(principalPaid);
      }
      
      log('Calculated expenses:', { 
        year, 
        month, 
        expenses, 
        isRehabPeriod,
        interestPaid,
        principalPaid
      });
      
      return isNaN(expenses) ? 0 : expenses;
    };

    const calculateRent = (year: number, month: number) => {
      if (rentalDetails.rentalType === 'noRental') {
        return 0;
      }
      
      const totalMonths = (year - 1) * 12 + month;
      
      // No rent during rehab period
      if (totalMonths <= rehabDuration) {
        log('No rent during rehab period', { totalMonths, rehabDuration });
        return 0;
      }

      const monthsSinceRehab = totalMonths - rehabDuration;
      const yearsElapsed = Math.floor(monthsSinceRehab / 12);
      
      // Use the monthly rent from rentalDetails
      const baseMonthlyRent = parseFloat(rentalDetails.monthlyRent) || 0;
      const calculatedRent = baseMonthlyRent * Math.pow(1 + (parseFloat(rentalDetails.annualAppreciation) / 100), yearsElapsed);
      
      log('Calculated rent:', { 
        year, 
        month, 
        calculatedRent, 
        baseMonthlyRent, 
        yearsElapsed
      });
      
      return calculatedRent;
    };

    // Prepare for tracking total cash invested
    let runningTotalCashInvested = 0;

    // Completely revamped value calculation logic with clear structure
    for (let year = 1; year <= 30; year++) {
      // Initialize the year object first
      newOutput[year] = {
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

      for (let month = 1; month <= 12; month++) {
        // Calculate overall month number (1-indexed)
        const totalMonths = (year - 1) * 12 + month;
        
        // Skip calculation for future years if it's a flip and we've passed the sale month
        if (investmentType === 'flip' && totalMonths > saleMonth && saleMonth > 0) {
          log('Skipping future month for flip after sale', { totalMonths, saleMonth });
          continue;
        }
        
        // Determine if we're in the rehab period
        const isRehabPeriod = totalMonths <= rehabDuration;
        
        log('Calculating month:', { 
          year, 
          month, 
          totalMonths, 
          isRehabPeriod, 
          investmentType 
        });
        
        // Initialize variables for this month
        let value = 0;
        let debt = 0;
        let monthlyPayment = 0;
        let interestPaid = 0;
        let principalPaid = 0;
        let cashInvested = 0;
        let equityGrowth = 0;
        
        // Get rent for this month
        let rent = calculateRent(year, month);
        
        // COMPLETELY REBUILT VALUE CALCULATION LOGIC
        // Unified approach across all investment types for consistency
        
        // First month - ALWAYS use purchase price regardless of investment type
        if (totalMonths === 1) {
          // FIRST MONTH - Always start with purchase price
          value = purchasePrice;
          
          log('Month 1 - Value set to purchase price:', { 
            value, 
            purchasePrice, 
            investmentType 
          });
          
          // Set up financing based on investment type
          if (investmentType === 'buyAndHold') {
            // Buy and Hold - Long-term financing from day 1
            debt = purchasePrice * loanToValue;
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            
            // Initial investment - down payment + closing costs
            cashInvested = (1 - loanToValue) * purchasePrice + 
                          longTermLenderPoints * (loanToValue * purchasePrice) +
                          closingCosts + 
                          rehabCost;
                          
            // First month equity growth is negative rehab cost
            equityGrowth = -rehabCost;
            
            log('Month 1 Buy and Hold setup:', {
              debt,
              monthlyPayment,
              interestPaid,
              principalPaid,
              cashInvested,
              equityGrowth
            });
          } 
          else if (investmentType === 'brrrr' || investmentType === 'flip') {
            // BRRRR and Flip - Short-term financing for purchase and rehab
            debt = purchaseLoaned * purchasePrice + rehabLoaned * rehabCost;
            interestPaid = debt * shortTermInterestRate;
            
            // Initial investment - down payment + points + closing costs
            cashInvested = (1 - purchaseLoaned) * purchasePrice + 
                          (1 - rehabLoaned) * rehabCost + 
                          shortTermLenderPoints * (purchaseLoaned * purchasePrice + rehabLoaned * rehabCost) +
                          closingCosts;
            
            // First month equity growth is negative rehab cost
            equityGrowth = -rehabCost;
            
            log(`Month 1 ${investmentType} setup:`, {
              debt,
              interestPaid,
              cashInvested,
              equityGrowth
            });
          }
        }
        // During rehab period (months 2 through rehabDuration)
        else if (isRehabPeriod) {
          // Calculate rehab progress as a percentage
          const rehabProgress = rehabDuration > 1 ? (totalMonths / rehabDuration) : 1;
          
          // During rehab, the value remains at purchase price
          value = purchasePrice;
          
          // First month equity growth is negative rehab cost (already handled in month 1)
          equityGrowth = 0;
            
          log('During rehab - value remains at purchase price:', {
            totalMonths,
            rehabDuration,
            rehabProgress,
            purchasePrice,
            value,
            equityGrowth
          });
          
          // Maintain the same debt structure during rehab
          if (investmentType === 'buyAndHold') {
            // Buy and Hold maintains long-term financing
            debt = debt !== 0 ? debt : purchasePrice * loanToValue;
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            debt -= principalPaid;
          } 
          else if (investmentType === 'brrrr' || investmentType === 'flip') {
            // BRRRR and Flip maintain short-term financing
            debt = purchaseLoaned * purchasePrice + rehabLoaned * rehabCost;
            interestPaid = debt * shortTermInterestRate;
          }
        }
        // First month after rehab completion
        else if (totalMonths === rehabDuration + 1) {
          // Value changes to ARV after rehab is complete
          value = afterRepairValue;
          equityGrowth = afterRepairValue - purchasePrice; // Growth from purchase price to ARV
          
          log('First month after rehab:', {
            totalMonths,
            rehabDuration,
            value,
            afterRepairValue,
            equityGrowth
          });
          
          if (investmentType === 'buyAndHold') {
            // Buy and Hold continues with existing long-term financing
            debt = debt !== 0 ? debt : purchasePrice * loanToValue;
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            debt -= principalPaid;
          } 
          else if (investmentType === 'brrrr') {
            // BRRRR refinances into long-term financing
            const oldDebt = debt;
            
            // Property value suddenly jumps to ARV after rehab
            // We've already set the value to ARV and calculated equityGrowth above
            
            // Refinance based on ARV
            debt = afterRepairValue * loanToValue;
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            
            // Cash flow from refinance (money pulled out minus points)
            const refinanceCashOut = (afterRepairValue * loanToValue) - oldDebt - (longTermLenderPoints * afterRepairValue * loanToValue);
            
            // Negative cashInvested means cash coming in
            cashInvested = -refinanceCashOut;
            
            log('BRRRR refinance:', {
              oldDebt,
              newDebt: debt,
              refinanceCashOut,
              cashInvested,
              value: afterRepairValue
            });
          } 
          else if (investmentType === 'flip') {
            // For flip, this is the sale month
            // Get previous month's debt to repay
            const prevMonthDebt = newOutput[year]?.months[month - 1]?.debt || 
                                (month === 1 ? newOutput[year - 1]?.months[12]?.debt : 0) || 
                                debt;
            
            // Calculate selling costs
            const sellingCosts = afterRepairValue * ((parseFloat(String(saleInputs.agentCommission)) / 100) + 
                                                  (parseFloat(String(saleInputs.closingCosts)) / 100));
            
            // Net proceeds from sale
            const netProceeds = afterRepairValue - sellingCosts - prevMonthDebt;
            
            // Cash coming in from sale (negative cashInvested)
            cashInvested = -netProceeds;
            
            // Reset debt since property is sold
            debt = 0;
            interestPaid = 0;
            
            // No more value or debt since property is sold
            value = 0;
            
            log('Flip sale month:', {
              prevMonthDebt,
              sellingCosts,
              netProceeds,
              cashInvested
            });
          }
        }
        // After rehab period - regular monthly appreciation
        else if (investmentType !== 'flip') {
          // Get previous month's value for appreciation calculation
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          const prevValue = newOutput[prevYear]?.months[prevMonth]?.value || afterRepairValue;
          
          // Apply monthly appreciation
          value = prevValue * (1 + monthlyAppreciation);
          equityGrowth = value - prevValue;
          
          log('Regular appreciation month:', {
            prevValue,
            monthlyAppreciation,
            value,
            equityGrowth
          });
          
          if (investmentType === 'buyAndHold' || investmentType === 'brrrr') {
            // Continue with debt service
            const prevMonth = month === 1 ? 12 : month - 1;
            const prevYear = month === 1 ? year - 1 : year;
            debt = newOutput[prevYear]?.months[prevMonth]?.debt || debt;
            
            monthlyPayment = calculateMortgagePayment(debt, longTermInterestRate, loanTermMonths);
            interestPaid = debt * longTermInterestRate;
            principalPaid = monthlyPayment - interestPaid;
            debt -= principalPaid;
            
            log('Debt service:', {
              debt,
              monthlyPayment,
              interestPaid,
              principalPaid
            });
          }
        }
        // After flip sale - all zeros
        else if (investmentType === 'flip' && totalMonths > rehabDuration + 1) {
          value = 0;
          debt = 0;
          interestPaid = 0;
          principalPaid = 0;
          cashInvested = 0;
          equityGrowth = 0;
          rent = 0;
          
          log('Post-flip sale month - all zeros');
        }
        
        // Calculate expenses based on the current state
        const expenses = calculateExpenses(year, month, rent, interestPaid, principalPaid, isRehabPeriod);
        
        // Calculate cash flow
        const cashFlow = rent - expenses;
        
        // Calculate equity and update the running total cash invested
        const equity = value - debt;
        runningTotalCashInvested += cashInvested;
        
        // Calculate DSCR
        const totalMortgagePayment = Math.abs(interestPaid) + Math.abs(principalPaid);
        const dscr = totalMortgagePayment > 0 ? rent / totalMortgagePayment : 0;
        
        // Store monthly values
        newOutput[year].months[month] = {
          value: roundToDollar(value),
          debt: roundToDollar(debt),
          displayDebt: roundToDollar(-debt),
          equity: roundToDollar(equity),
          equityGrowth: roundToDollar(equityGrowth),
          cashInvested: roundToDollar(cashInvested),
          displayCashInvested: roundToDollar(cashInvested),
          totalCashInvested: roundToDollar(runningTotalCashInvested),
          interestPaid: roundToDollar(-Math.abs(interestPaid)),
          rent: roundToDollar(rent),
          expenses: roundToDollar(-Math.abs(expenses)),
          cashFlow: roundToDollar(cashFlow),
          totalReturn: roundToDollar(cashFlow + equityGrowth),
          returnOnInvestedCash: runningTotalCashInvested > 0 ? ((cashFlow + equityGrowth) / runningTotalCashInvested) * 100 : 0,
          isRehabPeriod: isRehabPeriod,
          dscr: dscr
        };
        
        // Update yearly totals
        newOutput[year].yearlyTotals.interestPaid += interestPaid;
        newOutput[year].yearlyTotals.rent += rent;
        newOutput[year].yearlyTotals.expenses += expenses;
        newOutput[year].yearlyTotals.cashFlow += cashFlow;
        newOutput[year].yearlyTotals.equityGrowth += equityGrowth;
        newOutput[year].yearlyTotals.cashInvested += cashInvested;
        newOutput[year].yearlyTotals.totalCashInvested = runningTotalCashInvested;
      }
      
      // Finalize yearly totals and round values
      newOutput[year].yearlyTotals.totalReturn = roundToDollar(
        newOutput[year].yearlyTotals.cashFlow + newOutput[year].yearlyTotals.equityGrowth
      );
      
      // Calculate return on invested cash for the year
      newOutput[year].yearlyTotals.returnOnInvestedCash = 
        runningTotalCashInvested > 0 ?
        (newOutput[year].yearlyTotals.totalReturn / runningTotalCashInvested) * 100 : 0;
      
      // Set the yearly DSCR to the last month's DSCR (or 0 if not available)
      newOutput[year].yearlyTotals.dscr = newOutput[year].months[12]?.dscr || 0;
      
      // Round all yearly totals
      newOutput[year].yearlyTotals.interestPaid = roundToDollar(newOutput[year].yearlyTotals.interestPaid);
      newOutput[year].yearlyTotals.rent = roundToDollar(newOutput[year].yearlyTotals.rent);
      newOutput[year].yearlyTotals.expenses = roundToDollar(newOutput[year].yearlyTotals.expenses);
      newOutput[year].yearlyTotals.cashFlow = roundToDollar(newOutput[year].yearlyTotals.cashFlow);
      newOutput[year].yearlyTotals.equityGrowth = roundToDollar(newOutput[year].yearlyTotals.equityGrowth);
      newOutput[year].yearlyTotals.cashInvested = roundToDollar(newOutput[year].yearlyTotals.cashInvested);
    }

    log('Investment calculation completed', { 
      investmentType, 
      yearsCalculated: Object.keys(newOutput).length 
    });

    setCalculatedOutput(newOutput);
    setIsCalculated(true);
  };

  // Add send to OffLeash function
  const handleSendToOffLeash = () => {
    log('Sending data to OffLeash', {
      investmentType,
      dealDetails,
      propertyDetails
    });
    
    // Placeholder for actual implementation
    alert('This feature is coming soon!');
  };

  // Using the tabs provided by getTabsForInvestmentType
  const renderTabs = () => {
    const tabs = getTabsForInvestmentType();
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((tab: { value: string; label: string }) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            onClick={() => setActiveTab(tab.value)}
            className="flex-grow-0"
          >
            {tab.label}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 min-h-screen bg-background text-foreground transition-colors duration-300 max-w-7xl">
      {/* Update the header section */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-6 mb-8 gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Link 
            href="https://www.offleashconstruction.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <Image 
              src="/logo-menu.png"
              alt="Calculator Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">
            Real Estate Calculator
          </h1>
        </div>
      </div>

      {/* Replace the existing investment type card with this */}
      <Card className="mb-8 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
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

      {/* Update the tabs section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {renderTabs()}
        
        {/* Update tab content cards */}
        <TabsContent value="property">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Property Details
              </CardTitle>
              <CardDescription className="text-base">
                Enter the property specifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="address">Address</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Physical address of the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="address" name="address" value={propertyDetails.address} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
                
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="squareFootage">Square Footage</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>LIVABLE total area of the property in square feet</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input 
                      id="squareFootage" 
                      name="squareFootage" 
                      type="number" 
                      value={propertyDetails.squareFootage} 
                      onChange={handlePropertyDetailsChange} 
                    />
                  </div>
                </TooltipProvider>
                
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="bedrooms">Bedrooms</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of bedrooms in the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="bedrooms" name="bedrooms" type="number" value={propertyDetails.bedrooms} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
                
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="bathrooms">Bathrooms</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Number of bathrooms in the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="bathrooms" name="bathrooms" type="number" value={propertyDetails.bathrooms} onChange={handlePropertyDetailsChange} />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="deal">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Deal Details
              </CardTitle>
              <CardDescription className="text-base">
                Enter the financial details of the deal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="purchasePrice">Purchase Price</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Amount paid to acquire the property</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="purchasePrice" name="purchasePrice" type="number" value={dealDetails.purchasePrice} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="rehabCost">Rehab Cost</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated cost for all renovations and repairs</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="rehabCost"
                      name="rehabCost"
                      type="number" 
                      value={dealDetails.rehabCost}
                      onChange={handleDealDetailsChange}
                      placeholder={calculateTotalRehabCost().toFixed(2).toString()}
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="holdingPeriod">Rehab Duration (months)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Expected time in months to complete the rehab</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="holdingPeriod" name="holdingPeriod" type="number" value={dealDetails.holdingPeriod} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="closingCosts">Closing Costs</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Costs associated with closing the deal, like title insurance, fees, and taxes</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="closingCosts" name="closingCosts" type="number" value={dealDetails.closingCosts} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="afterRepairValue">After Repair Value</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated property value after all repairs and upgrades are completed</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="afterRepairValue" name="afterRepairValue" type="number" value={dealDetails.afterRepairValue} onChange={handleDealDetailsChange} />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rehab">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Rehab Estimator
              </CardTitle>
              <CardDescription className="text-base">
                Estimate the costs for various renovation items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Rehab Strategy</h3>
                <RadioGroup
                  onValueChange={handleRehabStrategyChange}
                  value={rehabStrategy}
                  className="flex space-x-4 mt-2"
                >
                  <TooltipProvider>
                    <div className="flex items-center space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="rental" id="rental" />
                            <Label htmlFor="rental">Rental Grade</Label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Basic, durable finishes suitable for long-term rentals. Focus on functionality and longevity over premium aesthetics.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>

                  <TooltipProvider>
                    <div className="flex items-center space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="flipAirbnb" id="flipAirbnb" />
                            <Label htmlFor="flipAirbnb">Flip/AirBNB Grade</Label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Premium finishes and materials for higher resale value or short-term rental appeal. Emphasizes aesthetics and modern design.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </RadioGroup>
              </div>
              {Object.entries(rehabDetails).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <h3 className="text-lg font-semibold capitalize mb-2">{category}</h3>
                  <Table className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price ($)</TableHead>
                        <TableHead>Extended Price ($)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id={item.id} 
                                checked={item.checked}
                                onCheckedChange={(checked) => 
                                  handleRehabDetailsChange(category, item.id, 'checked', checked)
                                }
                              />
                              {item.id.startsWith('customItem') ? (
                  <Input
                                  value={item.description}
                                  onChange={(e) => handleRehabDetailsChange(category, item.id, 'description', e.target.value)}
                                  placeholder="Enter custom item description"
                                  className="w-full"
                                />
                              ) : (
                                <label htmlFor={item.id}>{item.description}</label>
                              )}
                </div>
                          </TableCell>
                          <TableCell>
                  <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleRehabDetailsChange(category, item.id, 'quantity', e.target.value)}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => handleRehabDetailsChange(category, item.id, 'price', e.target.value)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>${item.checked ? item.extended.toFixed(2) : '0.00'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {category === 'contingency' && (
                    <Button onClick={addCustomRehabItem} className="mt-2">
                      Add Another Line
                    </Button>
                  )}
                </div>
              ))}
              <div className="text-right text-lg font-semibold">
                Total Rehab Cost: ${calculateTotalRehabCost().toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rental">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                {investmentType === 'flip' ? 'Ongoing Expenses' : 'Rental Details'}
              </CardTitle>
              <CardDescription className="text-base">
                {investmentType === 'flip' 
                  ? 'Enter the expected ongoing expenses for the property.' 
                  : 'Enter the expected rental income and expenses.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rentalType">Rental Type</Label>
                <Select onValueChange={handleRentalTypeChange} value={rentalDetails.rentalType}>
                  <SelectTrigger id="rentalType">
                    <SelectValue placeholder="Select rental type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="longTerm">Long Term Rental</SelectItem>
                    <SelectItem value="shortMidTerm">Short/Mid Term Rental</SelectItem>
                    <SelectItem value="noRental">No Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Common fields for all rental types */}
                <div className="space-y-2">
                  <Label htmlFor="annualAppreciation">Annual Appreciation (%)</Label>
                  <Input id="annualAppreciation" name="annualAppreciation" type="number" step="0.1" value={rentalDetails.annualAppreciation} onChange={handleRentalDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualInsurance">Annual Insurance</Label>
                  <Input id="annualInsurance" name="annualInsurance" type="number" value={rentalDetails.annualInsurance} onChange={handleRentalDetailsChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annualPropertyTax">Annual Property Tax</Label>
                  <Input id="annualPropertyTax" name="annualPropertyTax" type="number" value={rentalDetails.annualPropertyTax} onChange={handleRentalDetailsChange} />
                </div>

                {/* Fields for Long Term Rental */}
                {rentalDetails.rentalType === 'longTerm' && (
                  <>
                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="monthlyRent">Monthly Rent</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Expected monthly rental income from the property. Research comparable rentals in the area for an accurate estimate.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="monthlyRent" name="monthlyRent" type="number" value={rentalDetails.monthlyRent} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="annualMaintenance">Annual Maintenance (%)</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Percentage of monthly rent set aside for routine maintenance and repairs. Typically ranges from 5-10% of rental income.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="annualMaintenance" name="annualMaintenance" type="number" step="0.1" value={rentalDetails.annualMaintenance} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="annualCapex">Annual CAPEX (%)</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Capital Expenditure reserve for major replacements (roof, HVAC, etc.). Usually 5-10% of rental income.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="annualCapex" name="annualCapex" type="number" step="0.1" value={rentalDetails.annualCapex} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="pmFee">PM Fee/mo (%)</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Property Management fee as a percentage of monthly rent. Typically ranges from 8-12% for single-family homes.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="pmFee" name="pmFee" type="number" step="0.1" value={rentalDetails.pmFee} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="averageLeaseLength">Average Lease Length (Yrs)</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Expected duration of typical lease agreements. Standard residential leases are usually 1 year.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="averageLeaseLength" name="averageLeaseLength" type="number" step="0.1" value={rentalDetails.averageLeaseLength} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="leaseUpFee">Lease Up Fee ($)</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>One-time fee charged by property manager for finding new tenants. Often equal to 50% of one month of rent.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="leaseUpFee" name="leaseUpFee" type="number" value={rentalDetails.leaseUpFee} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>

                    <TooltipProvider>
                      <div className="space-y-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Expected percentage of time the property will be vacant annually. Conservative estimates range from 5-8%.</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input id="vacancyRate" name="vacancyRate" type="number" step="0.1" value={rentalDetails.vacancyRate} onChange={handleRentalDetailsChange} />
                      </div>
                    </TooltipProvider>
                  </>
                )}

                {/* Fields for Short/Mid Term Rental */}
                {rentalDetails.rentalType === 'shortMidTerm' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="furnitureAndDecorations">Furniture & Decorations ($)</Label>
                      <Input id="furnitureAndDecorations" name="furnitureAndDecorations" type="number" value={rentalDetails.furnitureAndDecorations} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRent">Monthly Rent</Label>
                      <Input id="monthlyRent" name="monthlyRent" type="number" value={rentalDetails.monthlyRent} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualMaintenance">Annual Maintenance (%)</Label>
                      <Input id="annualMaintenance" name="annualMaintenance" type="number" step="0.1" value={rentalDetails.annualMaintenance} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annualCapex">Annual CAPEX (%)</Label>
                      <Input id="annualCapex" name="annualCapex" type="number" step="0.1" value={rentalDetails.annualCapex} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortTermPmFee">PM Fee/mo (%)</Label>
                      <Input id="shortTermPmFee" name="shortTermPmFee" type="number" step="0.1" value={rentalDetails.shortTermPmFee} onChange={handleRentalDetailsChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="personalUsage">Personal Usage (%)</Label>
                      <Input id="personalUsage" name="personalUsage" type="number" step="0.1" value={rentalDetails.personalUsage} onChange={handleRentalDetailsChange} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shortTerm">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Short Term/Rehab Financing
              </CardTitle>
              <CardDescription className="text-base">
                Enter the details of your short term or rehab financing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="shortTermInterest">Short Term Finance Interest (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Annual interest rate for the short-term loan. Hard money loans typically range from 8-15% annually.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input 
                      id="shortTermInterest" 
                      name="interestRate" 
                      type="number" 
                      step="0.01" 
                      value={shortTermFinancing.interestRate} 
                      onChange={handleShortTermFinancingChange} 
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="lendersPoints">Lender Points</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upfront fee charged by the lender, where 1 point equals 1% of the loan amount. Hard money lenders typically charge 2-4 points.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input 
                      id="lendersPoints" 
                      name="lendersPoints" 
                      type="number" 
                      step="0.1" 
                      value={shortTermFinancing.lendersPoints} 
                      onChange={handleShortTermFinancingChange} 
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="purchaseLoaned">Amount of Purchase Loaned (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of the purchase price the lender will finance. Hard money lenders typically loan 65-75% of the purchase price.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input 
                      id="purchaseLoaned" 
                      name="purchaseLoaned" 
                      type="number" 
                      step="0.1" 
                      value={shortTermFinancing.purchaseLoaned} 
                      onChange={handleShortTermFinancingChange} 
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="rehabLoaned">Amount of Rehab Loaned (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of the renovation costs the lender will finance. Hard money lenders typically loan 80-100% of rehab costs, disbursed in draws.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input 
                      id="rehabLoaned" 
                      name="rehabLoaned" 
                      type="number" 
                      step="0.1" 
                      value={shortTermFinancing.rehabLoaned} 
                      onChange={handleShortTermFinancingChange} 
                    />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="longTerm">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Long Term Financing Details
              </CardTitle>
              <CardDescription className="text-base">
                Enter the details of your long term financing arrangement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="loanTerm">Loan Term (years)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Length of the mortgage loan, typically 15 or 30 years for residential properties.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="loanTerm" name="loanTerm" type="number" value={financingDetails.loanTerm} onChange={handleFinancingDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Annual interest rate for the long-term mortgage. Current market rates typically range from 6-8%.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="interestRate" name="interestRate" type="number" step="0.01" value={financingDetails.interestRate} onChange={handleFinancingDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="lenderPoints">Lender Points</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upfront fee charged by the lender, where 1 point equals 1% of the loan amount. Conventional loans typically range from 0-1 points.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="lenderPoints" name="lenderPoints" type="number" step="0.25" value={financingDetails.lenderPoints} onChange={handleFinancingDetailsChange} />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="loanToValue">Loan to Value (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of the property value being financed. Conventional loans typically range from 75-80%, while FHA loans can go up to 96.5%.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input id="loanToValue" name="loanToValue" type="number" step="0.1" value={financingDetails.loanToValue} onChange={handleFinancingDetailsChange} />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sale">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Sale Inputs
              </CardTitle>
              <CardDescription className="text-base">
                Enter the details related to the sale of the property.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="agentCommission">Agent Commission (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The percentage of the sale price paid to real estate agents. Typically ranges from 5-6%.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="agentCommission"
                      name="agentCommission"
                      type="number"
                      step="0.1"
                      value={saleInputs.agentCommission}
                      onChange={handleSaleInputsChange}
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="closingCosts">Closing Costs (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Additional costs when selling, such as title insurance, transfer taxes, and escrow fees. Usually 1-3% of sale price.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="closingCosts"
                      name="closingCosts"
                      type="number"
                      step="0.1"
                      value={saleInputs.closingCosts}
                      onChange={handleSaleInputsChange}
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="timeOnMarket">Time on Market (months)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Expected time to find a buyer and close the sale after rehab is complete.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="timeOnMarket"
                      name="timeOnMarket"
                      type="number"
                      value={saleInputs.timeOnMarket}
                      onChange={handleSaleInputsChange}
                    />
                  </div>
                </TooltipProvider>

                <TooltipProvider>
                  <div className="space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="marginalTaxRate">Marginal Tax Rate (%)</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your highest tax bracket rate. This affects the after-tax profit calculation.</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="marginalTaxRate"
                      name="marginalTaxRate"
                      type="number"
                      step="0.1"
                      value={saleInputs.marginalTaxRate}
                      onChange={handleSaleInputsChange}
                    />
                  </div>
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update the action buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={calculateInvestment} 
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
        >
          Calculate Investment
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleSave} 
                  className="w-full shadow-lg hover:shadow-xl transition-all" 
                  disabled={!isCalculated}
                >
                  Save PDF
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isCalculated ? "Save your calculation as PDF" : "Calculate investment first"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span className="w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={handleSendToOffLeash} 
                  className="w-full shadow-lg hover:shadow-xl transition-all" 
                  disabled={!isCalculated}
                >
                  Send to Off Leash
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isCalculated 
                  ? "This feature is coming soon. For now - email to info@offleashconstruction.com and we&apos;ll review with you!" 
                  : "Calculate investment first"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Update the results card */}
      <Card className="mt-8 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Investment Analysis
          </CardTitle>
          <CardDescription className="text-base">
            Detailed breakdown of your investment over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCalculated && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {investmentType === 'buyAndHold' && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Yr 1 Annual Return on Invested Cash
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? 'text-red-500' : ''}`}>
                                {calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash === Infinity 
                                  ? '∞' 
                                  : `${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash || 0))}%`}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total return (cash flow + equity growth) divided by total cash invested. Shows the efficiency of your invested capital.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Yr 1 Total Return
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? 'text-red-500' : ''}`}>
                                {calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.totalReturn || 0))}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sum of cash flow and equity growth for the first year. Represents total wealth creation from the investment.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Cash Required
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${findMaxTotalCashInvested(calculatedOutput) < 0 ? 'text-red-500' : ''}`}>
                                {findMaxTotalCashInvested(calculatedOutput) < 0 ? '-' : ''}${formatNumber(Math.abs(findMaxTotalCashInvested(calculatedOutput)))}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum amount of cash needed for the investment, including down payment, closing costs, and rehab costs.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}

                {investmentType === 'brrrr' && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Cash Required
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${findMaxTotalCashInvested(calculatedOutput) < 0 ? 'text-red-500' : ''}`}>
                                {findMaxTotalCashInvested(calculatedOutput) < 0 ? '-' : ''}${formatNumber(Math.abs(findMaxTotalCashInvested(calculatedOutput)))}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum amount of cash needed during the BRRRR process, typically during the rehab phase. Includes down payment, closing costs, and rehab costs.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                After Refinance Cash Invested
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails) < 0 ? 'text-red-500' : ''}`}>
                                {findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails) < 0 ? '-' : ''}${formatNumber(Math.abs(findMinTotalCashInvested(calculatedOutput, 'brrrr', dealDetails)))}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Amount of cash remaining invested after refinancing. Lower amounts indicate more successful cash-out refinancing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Yr 1 Annual Return on Invested Cash
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? 'text-red-500' : ''}`}>
                                {calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash === Infinity 
                                  ? '∞' 
                                  : `${calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.returnOnInvestedCash || 0))}%`}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>First year total return (cash flow + equity growth) divided by remaining cash invested after refinancing. Higher percentages indicate better capital efficiency.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Yr 1 Total Return
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? 'text-red-500' : ''}`}>
                                {calculatedOutput[1]?.yearlyTotals?.totalReturn < 0 ? '-' : ''}${formatNumber(Math.abs(calculatedOutput[1]?.yearlyTotals?.totalReturn || 0))}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sum of first year cash flow and equity growth after refinancing. Represents total wealth creation from the investment in year one.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                BRRR Percentage
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                {(() => {
                                  const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                                  const loanToValue = parseFloat(financingDetails.loanToValue) / 100 || 0;
                                  const afterRefinanceCashInvested = findMinTotalCashInvested(calculatedOutput, investmentType, dealDetails);
                                  
                                  const brrrPercentage = ((afterRepairValue * (1 - loanToValue)) - afterRefinanceCashInvested) / 
                                                   (afterRepairValue * (1 - loanToValue)) * 100;
                                  
                                  return `${formatNumber(Math.max(0, brrrPercentage))}%`;
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentage of equity recovered through refinancing. 100% means all initial capital was recovered, making it a no money down deal after refinancing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}

                {investmentType === 'flip' && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Cash Required
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${findMaxTotalCashInvested(calculatedOutput) < 0 ? 'text-red-500' : ''}`}>
                                {findMaxTotalCashInvested(calculatedOutput) < 0 ? '-' : ''}${formatNumber(Math.abs(findMaxTotalCashInvested(calculatedOutput)))}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Maximum cash needed during the flip, including down payment, closing costs, and rehab costs. This represents your total out-of-pocket investment.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Profit
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${(() => {
                                const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                                const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                                const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                                const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                                const agentCommission = saleInputs.agentCommission / 100 || 0;  // Percentage
                                const saleClosingCosts = saleInputs.closingCosts / 100 || 0;  // Percentage
                                const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
                                
                                console.log('Calculating profit:', { afterRepairValue, rehabCost, purchasePrice, initialClosingCosts, agentCommission, saleClosingCosts });
                                
                                const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                              (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                                totalCashFlow;
                                return profit < 0 ? 'text-red-500' : '';
                              })()}`}>
                                {(() => {
                                  const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                                  const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                                  const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                                  const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                                  const agentCommission = saleInputs.agentCommission / 100 || 0;  // Percentage
                                  const saleClosingCosts = saleInputs.closingCosts / 100 || 0;  // Percentage
                                  const totalCashFlow = calculateTotalCashFlow(calculatedOutput);

                                  console.log('Calculating profit components:', {
                                    initialClosingCosts,
                                    agentCommission,
                                    saleClosingCosts,
                                    totalCashFlow
                                  });
                                  
                                  const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                                (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                                  totalCashFlow;
                                  return `${profit < 0 ? '-' : ''}${formatNumber(Math.abs(profit))}`;
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total profit before taxes, calculated as: Sale price - Purchase price - Rehab costs - Closing costs - Agent commissions + Any rental income during the hold period.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base font-semibold text-primary tracking-tight">
                                Profit Net of Taxes
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className={`text-2xl font-bold ${(() => {
                                const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                                const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                                const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                                const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                                const agentCommission = saleInputs.agentCommission / 100 || 0;  // Percentage
                                const saleClosingCosts = saleInputs.closingCosts / 100 || 0;  // Percentage
                                const marginalTaxRate = saleInputs.marginalTaxRate / 100 || 0;
                                const totalCashFlow = calculateTotalCashFlow(calculatedOutput);
                                
                                console.log('Calculating profit with values:', {
                                  afterRepairValue,
                                  rehabCost, 
                                  purchasePrice,
                                  initialClosingCosts,
                                  agentCommission,
                                  saleClosingCosts,
                                  totalCashFlow
                                });

                                const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) - 
                                              (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                                totalCashFlow;
                                const profitAfterTax = profit * (1 - marginalTaxRate);
                                return profitAfterTax < 0 ? 'text-red-500' : '';
                              })()}`}>
                                {(() => {
                                  const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
                                  const rehabCost = parseFloat(dealDetails.rehabCost) || 0;
                                  const purchasePrice = parseFloat(dealDetails.purchasePrice) || 0;
                                  const initialClosingCosts = parseFloat(dealDetails.closingCosts) || 0;  // Dollar amount
                                  const agentCommission = saleInputs.agentCommission / 100 || 0;  // Percentage 
                                  const saleClosingCosts = saleInputs.closingCosts / 100 || 0;  // Percentage
                                  const marginalTaxRate = saleInputs.marginalTaxRate / 100 || 0;
                                  const totalCashFlow = calculateTotalCashFlow(calculatedOutput);

                                  console.log('Parsing input values:', {
                                    purchasePrice,
                                    initialClosingCosts,
                                    agentCommission,
                                    saleClosingCosts,
                                    marginalTaxRate,
                                    totalCashFlow
                                  });

                                  console.log('Calculating profit with values:', {
                                    afterRepairValue,
                                    rehabCost,
                                    purchasePrice,
                                    initialClosingCosts,
                                    agentCommission,
                                    saleClosingCosts,
                                    totalCashFlow
                                  });

                                  const profit = (afterRepairValue - rehabCost - purchasePrice - initialClosingCosts) -
                                                (afterRepairValue * (agentCommission + saleClosingCosts)) + 
                                                  totalCashFlow;
                                  const profitAfterTax = profit * (1 - marginalTaxRate);
                                  return `${profitAfterTax < 0 ? '-' : ''}$${formatNumber(Math.abs(profitAfterTax))}`;
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Final profit after accounting for taxes based on your specified marginal tax rate. Note: Consult a tax professional for specific tax implications as they may vary based on holding period and other factors.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table className={`transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Debt</TableHead>
                  <TableHead>Equity</TableHead>
                  <TableHead>Cash Invested</TableHead>
                  <TableHead>Total Cash Invested</TableHead>
                  <TableHead>Interest Paid</TableHead>
                  {investmentType !== 'flip' && (
                    <>
                      <TableHead>DSCR</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Expenses</TableHead>
                    </>
                  )}
                  <TableHead>Cash Flow</TableHead>
                  <TableHead>Equity Growth</TableHead>
                  <TableHead>Total Return</TableHead>
                  {investmentType !== 'flip' && (
                    <TableHead>Annual Return on Invested Cash</TableHead>
                  )}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(calculatedOutput).map(([year, data]) => (
                  <React.Fragment key={`year-${year}`}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleYearExpansion(parseInt(year))}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{year}</span>
                          {expandedYears[parseInt(year)] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </TableCell>
                      <TableCell>${formatNumber(data.months[12]?.value ?? 0)}</TableCell>
                      <TableCell className="text-red-500">${formatNumber(data.months[12]?.displayDebt ?? 0)}</TableCell>
                      <TableCell className={data.months[12]?.equity < 0 ? 'text-red-500' : ''}>${formatNumber(data.months[12]?.equity ?? 0)}</TableCell>
                      <TableCell className={data.yearlyTotals.cashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.cashInvested)}</TableCell>
                      <TableCell className={data.yearlyTotals.totalCashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.totalCashInvested)}</TableCell>
                      <TableCell className="text-red-500">${formatNumber(Math.abs(data.yearlyTotals.interestPaid))}</TableCell>
                      {investmentType !== 'flip' && (
                        <>
                          <TableCell>{formatNumber(data.yearlyTotals.dscr)}</TableCell>
                          <TableCell>${formatNumber(data.yearlyTotals.rent)}</TableCell>
                          <TableCell className="text-red-500">${formatNumber(Math.abs(data.yearlyTotals.expenses))}</TableCell>
                        </>
                      )}
                      <TableCell className={data.yearlyTotals.cashFlow < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.cashFlow)}</TableCell>
                      <TableCell className={data.yearlyTotals.equityGrowth < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.equityGrowth)}</TableCell>
                      <TableCell className={data.yearlyTotals.totalReturn < 0 ? 'text-red-500' : ''}>${formatNumber(data.yearlyTotals.totalReturn)}</TableCell>
                      {investmentType !== 'flip' && (
                        <TableCell className={data.yearlyTotals.returnOnInvestedCash < 0 ? 'text-red-500' : ''}>
                          {data.yearlyTotals.returnOnInvestedCash === Infinity ? '∞' : `${formatNumber(data.yearlyTotals.returnOnInvestedCash)}%`}
                        </TableCell>
                      )}
                    </TableRow>
                    {expandedYears[parseInt(year)] && (
                      <TableRow key={`year-${year}-expanded`}>
                        <TableCell colSpan={investmentType === 'flip' ? 11 : 14} className="p-0 bg-muted/40">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/60 hover:bg-muted/60">
                                <TableHead>Month</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead>Debt</TableHead>
                                <TableHead>Equity</TableHead>
                                <TableHead>Cash Invested</TableHead>
                                <TableHead>Total Cash Invested</TableHead>
                                <TableHead>Interest Paid</TableHead>
                                {investmentType !== 'flip' && (
                                  <>
                                    <TableHead>DSCR</TableHead>
                                    <TableHead>Rent</TableHead>
                                    <TableHead>Expenses</TableHead>
                                  </>
                                )}
                                <TableHead>Cash Flow</TableHead>
                                <TableHead>Equity Growth</TableHead>
                                <TableHead>Total Return</TableHead>
                                {investmentType !== 'flip' && (
                                  <TableHead>Return on Invested Cash</TableHead>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(data.months).map(([month, monthData]) => (
                                <TableRow key={`year-${year}-month-${month}`} className="bg-muted/40 hover:bg-muted/50">
                                  <TableCell>{month}</TableCell>
                                  <TableCell>${formatNumber(monthData.value ?? 0)}</TableCell>
                                  <TableCell className="text-red-500">${formatNumber(monthData.displayDebt ?? 0)}</TableCell>
                                  <TableCell className={monthData.equity < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.equity ?? 0)}</TableCell>
                                  <TableCell className={monthData.cashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.cashInvested ?? 0)}</TableCell>
                                  <TableCell className={monthData.totalCashInvested < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.totalCashInvested ?? 0)}</TableCell>
                                  <TableCell className={monthData.interestPaid < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.interestPaid ?? 0)}</TableCell>
                                  {investmentType !== 'flip' && (
                                    <>
                                      <TableCell>{formatNumber(monthData.dscr)}</TableCell>
                                      <TableCell>${formatNumber(monthData.rent)}</TableCell>
                                      <TableCell className={monthData.expenses < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.expenses)}</TableCell>
                                    </>
                                  )}
                                  <TableCell className={monthData.cashFlow < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.cashFlow)}</TableCell>
                                  <TableCell className={monthData.equityGrowth < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.equityGrowth)}</TableCell>
                                  <TableCell className={monthData.totalReturn < 0 ? 'text-red-500' : ''}>${formatNumber(monthData.totalReturn)}</TableCell>
                                  {investmentType !== 'flip' && (
                                    <TableCell className={monthData.returnOnInvestedCash < 0 ? 'text-red-500' : ''}>
                                      {monthData.returnOnInvestedCash === Infinity ? '∞' : `${formatNumber(monthData.returnOnInvestedCash)}%`}
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}