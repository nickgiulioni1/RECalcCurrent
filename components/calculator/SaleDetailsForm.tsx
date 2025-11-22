import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaleInputs } from "@/lib/types";
import { logger } from "@/lib/logger";

interface SaleDetailsFormProps {
  saleInputs: SaleInputs;
  handleSaleInputsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  investmentType: string;
}

export default function SaleDetailsForm({
  saleInputs,
  handleSaleInputsChange,
  investmentType
}: SaleDetailsFormProps) {
  logger.debug('Rendering SaleDetailsForm', { saleInputs, investmentType });
  
  // Only show for flip investments
  if (investmentType !== 'flip') {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sale Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="agentCommission">Agent Commission (%)</Label>
          <Input
            id="agentCommission"
            name="agentCommission"
            value={saleInputs.agentCommission}
            onChange={handleSaleInputsChange}
            placeholder="Enter agent commission %"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="saleClosingCosts">Closing Costs (%)</Label>
          <Input
            id="saleClosingCosts"
            name="saleClosingCosts"
            value={saleInputs.saleClosingCosts}
            onChange={handleSaleInputsChange}
            placeholder="Enter closing costs %"
          />
        </div>
      </CardContent>
    </Card>
  );
} 