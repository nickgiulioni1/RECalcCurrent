import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FinancingDetails, ShortTermFinancing } from "@/lib/types";
import { logger } from "@/lib/logger";

interface FinancingDetailsFormProps {
  financingDetails: FinancingDetails;
  shortTermFinancing: ShortTermFinancing;
  handleFinancingDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleShortTermFinancingChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  investmentType: string;
  isShortTerm?: boolean;
}

export default function FinancingDetailsForm({
  financingDetails,
  shortTermFinancing,
  handleFinancingDetailsChange,
  handleShortTermFinancingChange,
  investmentType,
  isShortTerm = false
}: FinancingDetailsFormProps) {
  logger.debug('Rendering FinancingDetailsForm', { financingDetails, shortTermFinancing, investmentType, isShortTerm });
  
  return (
    <>
      {(isShortTerm && (investmentType === 'brrrr' || investmentType === 'flip')) && (
        <Card>
          <CardHeader>
            <CardTitle>Short Term Financing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="purchaseLoaned">Purchase % Loaned</Label>
              <Input
                id="purchaseLoaned"
                name="purchaseLoaned"
                value={shortTermFinancing.purchaseLoaned}
                onChange={handleShortTermFinancingChange}
                placeholder="Enter % of purchase loaned"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rehabLoaned">Rehab % Loaned</Label>
              <Input
                id="rehabLoaned"
                name="rehabLoaned"
                value={shortTermFinancing.rehabLoaned}
                onChange={handleShortTermFinancingChange}
                placeholder="Enter % of rehab loaned"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                name="interestRate"
                value={shortTermFinancing.interestRate}
                onChange={handleShortTermFinancingChange}
                placeholder="Enter interest rate"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lendersPoints">Lender Points (%)</Label>
              <Input
                id="lendersPoints"
                name="lendersPoints"
                value={shortTermFinancing.lendersPoints}
                onChange={handleShortTermFinancingChange}
                placeholder="Enter lenders points"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {(!isShortTerm && (investmentType === 'buyAndHold' || investmentType === 'brrrr')) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {investmentType === 'brrrr' 
                ? 'Long Term Financing (After Refinance)' 
                : 'Financing Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="loanToValue">Loan to Value (%)</Label>
              <Input
                id="loanToValue"
                name="loanToValue"
                value={financingDetails.loanToValue}
                onChange={handleFinancingDetailsChange}
                placeholder="Enter loan to value %"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                name="interestRate"
                value={financingDetails.interestRate}
                onChange={handleFinancingDetailsChange}
                placeholder="Enter interest rate"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="loanTerm">Loan Term (years)</Label>
              <Input
                id="loanTerm"
                name="loanTerm"
                value={financingDetails.loanTerm}
                onChange={handleFinancingDetailsChange}
                placeholder="Enter loan term in years"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lenderPoints">Lender Points (%)</Label>
              <Input
                id="lenderPoints"
                name="lenderPoints"
                value={financingDetails.lenderPoints}
                onChange={handleFinancingDetailsChange}
                placeholder="Enter lender points"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
} 