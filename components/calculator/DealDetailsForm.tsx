import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DealDetails } from "@/lib/types";
import { logger } from "@/lib/logger";

interface DealDetailsFormProps {
  dealDetails: DealDetails;
  handleDealDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  investmentType: string;
}

export default function DealDetailsForm({
  dealDetails,
  handleDealDetailsChange,
  investmentType
}: DealDetailsFormProps) {
  logger.debug('Rendering DealDetailsForm', { dealDetails, investmentType });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="purchasePrice">Purchase Price</Label>
          <Input
            id="purchasePrice"
            name="purchasePrice"
            value={dealDetails.purchasePrice}
            onChange={handleDealDetailsChange}
            placeholder="Enter purchase price"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="afterRepairValue">After Repair Value</Label>
          <Input
            id="afterRepairValue"
            name="afterRepairValue"
            value={dealDetails.afterRepairValue}
            onChange={handleDealDetailsChange}
            placeholder="Enter ARV"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rehabCost">Rehab Cost</Label>
          <Input
            id="rehabCost"
            name="rehabCost"
            value={dealDetails.rehabCost}
            onChange={handleDealDetailsChange}
            placeholder="Enter rehab cost"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="holdingPeriod">
            {investmentType === 'flip' || investmentType === 'brrrr' 
              ? 'Rehab Duration (months)' 
              : 'Holding Period (months)'}
          </Label>
          <Input
            id="holdingPeriod"
            name="holdingPeriod"
            value={dealDetails.holdingPeriod}
            onChange={handleDealDetailsChange}
            placeholder={investmentType === 'flip' || investmentType === 'brrrr' 
              ? 'Enter rehab duration in months' 
              : 'Enter holding period in months'}
          />
        </div>
      </CardContent>
    </Card>
  );
} 