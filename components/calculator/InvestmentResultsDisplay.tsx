'use client'

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Download, Table } from 'lucide-react';
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { logger } from '@/lib/logger';
import { formatNumber, calculateTotalCashFlow } from '@/lib/calculationUtils';
import { 
  CalculatedOutputType,
  DealDetails,
  ExpandedYearsState,
  InvestmentType,
  PropertyDetails,
  RentalDetails
} from '@/lib/types';

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

export default function InvestmentResultsDisplay({
  calculatedOutput,
  expandedYears,
  toggleYearExpansion,
  investmentType,
  calculateProfit,
  calculateBrrrPercentage: _calculateBrrrPercentage, // eslint-disable-line @typescript-eslint/no-unused-vars
  dealDetails,
  rentalDetails,
  handleSendToOffLeash,
  handleExportPDF,
  handleExportExcel,
  isExporting
}: {
  calculatedOutput: CalculatedOutputType;
  expandedYears: ExpandedYearsState;
  toggleYearExpansion: (year: number) => void;
  investmentType: InvestmentType;
  calculateProfit: () => number;
  calculateBrrrPercentage: () => number;
  dealDetails: DealDetails;
  propertyDetails: PropertyDetails;
  rentalDetails: RentalDetails;
  handleSendToOffLeash: () => void;
  handleExportPDF: () => void;
  handleExportExcel: () => void;
  isExporting: boolean;
}) {
  logger.debug('Rendering InvestmentResultsDisplay', { investmentType, hasCalculatedOutput: Object.keys(calculatedOutput).length > 0 });

  const calculateCapRate = () => {
    if (!calculatedOutput[1]) return 0;
    const netOperatingIncome = (calculatedOutput[1].yearlyTotals.cashFlow + Math.abs(calculatedOutput[1].yearlyTotals.interestPaid));
    const propertyValue = parseFloat(dealDetails.afterRepairValue) || 0;
    return propertyValue > 0 ? (netOperatingIncome / propertyValue) * 100 : 0;
  };

  const calculateTotalInvestment = () => {
    if (investmentType === 'flip' || !calculatedOutput[1]) return 0;
    return calculatedOutput[1].yearlyTotals.totalCashInvested || 0;
  };

  const calculateBreakEvenPoint = () => {
    if (!calculatedOutput || Object.keys(calculatedOutput).length === 0) return 0;
    let cumulativeCashFlow = 0;
    let breakEvenPoint = 0;
    for (let year = 1; year <= Object.keys(calculatedOutput).length; year++) {
      if (!calculatedOutput[year]) continue;
      cumulativeCashFlow += calculatedOutput[year].yearlyTotals.cashFlow;
      if (cumulativeCashFlow > 0 && breakEvenPoint === 0) {
        breakEvenPoint = year;
      }
    }
    logger.debug('Calculated break-even point', { breakEvenPoint, cumulativeCashFlow });
    return breakEvenPoint;
  };

  const formatPercentage = (value: number) => {
    return value >= 0 ? `+${formatNumber(value)}%` : `${formatNumber(value)}%`;
  };

  const getValueColor = (value: number) => {
    return value < 0 ? 'text-red-500' : 'text-green-600';
  };

  const calculateFirstYearROI = () => {
    if (!calculatedOutput[1]) return 0;
    const totalReturn = calculatedOutput[1].yearlyTotals.cashFlow + calculatedOutput[1].yearlyTotals.equityGrowth;
    const investment = calculatedOutput[1].yearlyTotals.totalCashInvested;
    return investment > 0 ? (totalReturn / investment) * 100 : 0;
  };

  logger.info('Investment summary metrics', { 
    capRate: calculateCapRate(),
    firstYearROI: calculateFirstYearROI(),
    breakEvenPoint: calculateBreakEvenPoint(),
    totalInvestment: calculateTotalInvestment()
  });

  const profit = calculateProfit();
  const purchasePlusRehab = (parseFloat(dealDetails.purchasePrice) || 0) + (parseFloat(dealDetails.rehabCost) || 0);
  const roi = purchasePlusRehab > 0 ? (profit / purchasePlusRehab) * 100 : 0;
  const afterRepairValue = parseFloat(dealDetails.afterRepairValue) || 0;
  const profitMargin = afterRepairValue > 0 ? (profit / afterRepairValue) * 100 : 0;

  return (
    <div className="space-y-8">
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Investment Summary</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="download" 
                size="sm" 
                onClick={handleExportPDF}
                className="flex items-center gap-1 text-xs"
                disabled={isExporting}
                aria-busy={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button 
                variant="download" 
                size="sm" 
                onClick={handleExportExcel}
                className="flex items-center gap-1 text-xs"
                disabled={isExporting}
                aria-busy={isExporting}
              >
                <Table className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-sm text-gray-500">Estimated Profit</p>
              <p className={`text-lg font-bold ${getValueColor(profit)}`}>
                ${formatNumber(profit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ROI</p>
              <p className={`text-lg font-bold ${getValueColor(roi)}`}>
                {formatPercentage(roi)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Profit Margin</p>
              <p className={`text-lg font-bold ${getValueColor(profitMargin)}`}>
                {formatPercentage(profitMargin)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Project Duration</p>
              <p className="text-lg font-bold">
                {dealDetails.holdingPeriod} months
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(investmentType === 'buyAndHold' || investmentType === 'brrrr') && Object.keys(calculatedOutput).length > 0 && (
        <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
            <CardTitle className="flex items-center">
              <span>Total Performance ({Object.keys(calculatedOutput).length} Years)</span>
              <span className={`ml-auto text-lg ${getValueColor(calculateTotalCashFlow(calculatedOutput) + 
                Object.values(calculatedOutput).reduce((sum, year) => sum + year.yearlyTotals.equityGrowth, 0))}`}>
                ${formatNumber(calculateTotalCashFlow(calculatedOutput) + 
                Object.values(calculatedOutput).reduce((sum, year) => sum + year.yearlyTotals.equityGrowth, 0))}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              <div>
                <p className="text-sm text-gray-500">Total Cash Flow</p>
                <p className={`text-lg font-bold ${getValueColor(calculateTotalCashFlow(calculatedOutput))}`}>
                  ${formatNumber(calculateTotalCashFlow(calculatedOutput))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Equity Growth</p>
                <p className={`text-lg font-bold ${getValueColor(Object.values(calculatedOutput).reduce((sum, year) => 
                    sum + year.yearlyTotals.equityGrowth, 0))}`}>
                  ${formatNumber(Object.values(calculatedOutput).reduce((sum, year) => 
                    sum + year.yearlyTotals.equityGrowth, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Final Property Value</p>
                <p className="text-lg font-bold">
                  ${formatNumber(Object.values(calculatedOutput)[Object.keys(calculatedOutput).length - 1]?.months[12]?.value || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Return</p>
                <p className={`text-lg font-bold ${getValueColor(calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0))}`}>
                  ${formatNumber(calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Return on Investment</p>
                <p className={`text-lg font-bold ${getValueColor((calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0)) / calculatedOutput[1]?.yearlyTotals.totalCashInvested * 100)}`}>
                  {formatPercentage((calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0)) / calculatedOutput[1]?.yearlyTotals.totalCashInvested * 100)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Annualized ROI</p>
                <p className={`text-lg font-bold ${getValueColor(((calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0)) / calculatedOutput[1]?.yearlyTotals.totalCashInvested / Object.keys(calculatedOutput).length) * 100)}`}>
                  {formatPercentage(((calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0)) / calculatedOutput[1]?.yearlyTotals.totalCashInvested / Object.keys(calculatedOutput).length) * 100)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Initial Investment</p>
                <p className="text-lg font-bold">
                  ${formatNumber(calculateTotalInvestment())}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Investment Multiple</p>
                <p className="text-lg font-bold">
                  {formatNumber((calculateTotalCashFlow(calculatedOutput) + 
                    Object.values(calculatedOutput).reduce((sum, year) => 
                      sum + year.yearlyTotals.equityGrowth, 0) + calculateTotalInvestment()) / calculateTotalInvestment())}x
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(calculatedOutput).length > 0 && (
        <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white pb-2">
            <CardTitle>Annual Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.keys(calculatedOutput).map((yearStr) => {
                const year = parseInt(yearStr);
                const yearData = calculatedOutput[year];
                return (
                  <div key={year} className="border rounded-lg p-2 hover:border-primary transition-colors">
                    <div 
                      onClick={() => toggleYearExpansion(year)}
                      className="flex justify-between items-center cursor-pointer"
                    >
                      <span className="font-bold text-lg text-primary">Year {year}</span>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500 font-medium">Cash Flow</span>
                          <span className={`${yearData.yearlyTotals.cashFlow < 0 ? 'text-red-500' : 'text-green-600'} font-semibold`}>
                            ${formatNumber(yearData.yearlyTotals.cashFlow)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500 font-medium">Equity</span>
                          <span className={`${yearData.yearlyTotals.equityGrowth < 0 ? 'text-red-500' : 'text-green-600'} font-semibold`}>
                            ${formatNumber(yearData.yearlyTotals.equityGrowth)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-gray-500 font-medium">Return</span>
                          <span className={`${(yearData.yearlyTotals.cashFlow + yearData.yearlyTotals.equityGrowth) < 0 ? 'text-red-500' : 'text-green-600'} font-semibold`}>
                            ${formatNumber(yearData.yearlyTotals.cashFlow + yearData.yearlyTotals.equityGrowth)}
                          </span>
                        </div>
                        <span>
                          {expandedYears[year] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </div>
                    </div>

                    {expandedYears[year] && yearData && (
                      <div className="mt-2 space-y-4 text-sm">
                        <div className="space-y-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 mt-4 p-3 bg-gray-50 rounded-md">
                          <div>
                            <p className="font-bold text-gray-700">Cash Flow:</p>
                            <p className={`font-medium ${yearData.yearlyTotals.cashFlow < 0 ? 'text-red-500' : 'text-green-600'}`}>
                              ${formatNumber(yearData.yearlyTotals.cashFlow)}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-700">Interest Paid:</p>
                            <p className="font-medium text-red-500">
                              ${formatNumber(yearData.yearlyTotals.interestPaid)}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-700">Total Cash Invested:</p>
                            <p className="font-medium">
                              ${formatNumber(yearData.yearlyTotals.totalCashInvested)}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-gray-700">Equity Growth:</p>
                            <p className={`font-medium ${yearData.yearlyTotals.equityGrowth < 0 ? 'text-red-500' : 'text-green-600'}`}>
                              ${formatNumber(yearData.yearlyTotals.equityGrowth)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                          <div className="flex justify-between items-center">
                            <p className="font-bold text-gray-700">Total Expenses:</p>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium text-red-500 cursor-help">
                                    ${formatNumber(Math.abs(yearData.yearlyTotals.expenses))}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-3 max-w-sm space-y-1">
                                  <h5 className="font-semibold border-b pb-1 mb-1">Annual Expense Breakdown</h5>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    {(() => {
                                      const propertyTax = parseFloat(rentalDetails.annualPropertyTax);
                                      const insurance = parseFloat(rentalDetails.annualInsurance);
                                      const annualRent = yearData.yearlyTotals.rent;
                                      const maintenance = annualRent * (parseFloat(rentalDetails.annualMaintenance) / 100);
                                      const vacancy = annualRent * (parseFloat(rentalDetails.vacancyRate) / 100);
                                      const capex = annualRent * (parseFloat(rentalDetails.annualCapex) / 100);
                                      const pmFee = rentalDetails.rentalType === 'longTerm' 
                                        ? annualRent * (parseFloat(rentalDetails.pmFee) / 100)
                                        : annualRent * (parseFloat(rentalDetails.shortTermPmFee) / 100);
                                      const interestPaid = Math.abs(yearData.yearlyTotals.interestPaid);
                                      logger.debug('Annual expense breakdown', { 
                                        year, propertyTax, insurance, maintenance, vacancy, capex, pmFee, interestPaid, totalExpenses: Math.abs(yearData.yearlyTotals.expenses)
                                      });
                                      return (
                                        <>
                                          <div className="font-medium">Property Tax:</div>
                                          <div className="text-right">${formatNumber(propertyTax)}</div>
                                          <div className="font-medium">Insurance:</div>
                                          <div className="text-right">${formatNumber(insurance)}</div>
                                          <div className="font-medium">Maintenance:</div>
                                          <div className="text-right">${formatNumber(maintenance)}</div>
                                          <div className="font-medium">Vacancy:</div>
                                          <div className="text-right">${formatNumber(vacancy)}</div>
                                          <div className="font-medium">CapEx:</div>
                                          <div className="text-right">${formatNumber(capex)}</div>
                                          <div className="font-medium">Property Management:</div>
                                          <div className="text-right">${formatNumber(pmFee)}</div>
                                          <div className="font-medium">Mortgage Interest:</div>
                                          <div className="text-right">${formatNumber(interestPaid)}</div>
                                          <div className="font-medium border-t pt-1 mt-1">Total Expenses:</div>
                                          <div className="text-right border-t pt-1 mt-1 font-semibold">${formatNumber(Math.abs(yearData.yearlyTotals.expenses))}</div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Monthly Breakdown</h4>
                          <div className="rounded-md border overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="p-2 text-left">Month</th>
                                  <th className="p-2 text-right">Value</th>
                                  <th className="p-2 text-right">Debt</th>
                                  <th className="p-2 text-right">Equity</th>
                                  <th className="p-2 text-right">Rent</th>
                                  <th className="p-2 text-right">Expenses</th>
                                  <th className="p-2 text-right">Cash Flow</th>
                                  <th className="p-2 text-right">Equity Growth</th>
                                  <th className="p-2 text-right">Total Return</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(yearData.months).map(([month, monthData]) => (
                                  <tr key={`month-${month}`} className="border-b">
                                    <td className="p-2 text-left">{month}</td>
                                    <td className="p-2 text-right">${formatNumber(monthData.value)}</td>
                                    <td className="p-2 text-right text-red-500">${formatNumber(Math.abs(monthData.debt))}</td>
                                    <td className={`p-2 text-right ${monthData.equity < 0 ? 'text-red-500' : ''}`}>
                                      ${formatNumber(monthData.equity)}
                                    </td>
                                    <td className="p-2 text-right">${formatNumber(monthData.rent)}</td>
                                    <td className="p-2 text-right text-red-500">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="cursor-help">${formatNumber(Math.abs(monthData.expenses))}</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="p-3 max-w-sm space-y-1">
                                            <h5 className="font-semibold border-b pb-1 mb-1">Monthly Expense Breakdown</h5>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                              {(() => {
                                                const monthlyRent = monthData.rent;
                                                const propertyTax = parseFloat(rentalDetails.annualPropertyTax) / 12;
                                                const insurance = parseFloat(rentalDetails.annualInsurance) / 12;
                                                const maintenance = monthlyRent * (parseFloat(rentalDetails.annualMaintenance) / 100);
                                                const vacancy = monthlyRent * (parseFloat(rentalDetails.vacancyRate) / 100);
                                                const capex = monthlyRent * (parseFloat(rentalDetails.annualCapex) / 100);
                                                const pmFee = rentalDetails.rentalType === 'longTerm' 
                                                  ? monthlyRent * (parseFloat(rentalDetails.pmFee) / 100)
                                                  : monthlyRent * (parseFloat(rentalDetails.shortTermPmFee) / 100);
                                                const interestPaid = Math.abs(monthData.interestPaid);
                                                logger.debug('Monthly expense breakdown', { month, propertyTax, insurance, maintenance, vacancy, capex, pmFee, interestPaid, totalExpenses: Math.abs(monthData.expenses) });
                                                return (
                                                  <>
                                                    <div className="font-medium">Property Tax:</div>
                                                    <div className="text-right">${formatNumber(propertyTax)}</div>
                                                    <div className="font-medium">Insurance:</div>
                                                    <div className="text-right">${formatNumber(insurance)}</div>
                                                    <div className="font-medium">Maintenance:</div>
                                                    <div className="text-right">${formatNumber(maintenance)}</div>
                                                    <div className="font-medium">Vacancy:</div>
                                                    <div className="text-right">${formatNumber(vacancy)}</div>
                                                    <div className="font-medium">CapEx:</div>
                                                    <div className="text-right">${formatNumber(capex)}</div>
                                                    <div className="font-medium">Property Management:</div>
                                                    <div className="text-right">${formatNumber(pmFee)}</div>
                                                    <div className="font-medium">Mortgage Interest:</div>
                                                    <div className="text-right">${formatNumber(interestPaid)}</div>
                                                    <div className="font-medium border-t pt-1 mt-1">Total Expenses:</div>
                                                    <div className="text-right border-t pt-1 mt-1 font-semibold">${formatNumber(Math.abs(monthData.expenses))}</div>
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </td>
                                    <td className={`p-2 text-right ${monthData.cashFlow < 0 ? 'text-red-500' : ''}`}>
                                      ${formatNumber(monthData.cashFlow)}
                                    </td>
                                    <td className={`p-2 text-right ${monthData.equityGrowth < 0 ? 'text-red-500' : ''}`}>
                                      ${formatNumber(monthData.equityGrowth)}
                                    </td>
                                    <td className={`p-2 text-right ${monthData.totalReturn < 0 ? 'text-red-500' : ''}`}>
                                      ${formatNumber(monthData.totalReturn)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {parseFloat(dealDetails.rehabCost) >= 5000 && (
        <div className="mt-4 mb-8">
          <Button onClick={handleSendToOffLeash} variant="outline">
            Send to Off Leash Construction
          </Button>
        </div>
      )}
    </div>
  );
}




