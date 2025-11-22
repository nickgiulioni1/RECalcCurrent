import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RentalDetails } from "@/lib/types";
import { logger } from "@/lib/logger";

interface RentalDetailsFormProps {
  rentalDetails: RentalDetails;
  handleRentalDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRentalTypeChange: (value: string) => void;
  investmentType: string;
}

export default function RentalDetailsForm({
  rentalDetails,
  handleRentalDetailsChange,
  handleRentalTypeChange,
  investmentType
}: RentalDetailsFormProps) {
  logger.debug('Rendering RentalDetailsForm', { rentalDetails, investmentType });
  
  if (investmentType === 'flip') {
    return null; // No rental details needed for flips
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rental Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label className="block mb-2">Rental Type</Label>
          <RadioGroup 
            value={rentalDetails.rentalType} 
            onValueChange={handleRentalTypeChange}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="longTerm" id="longTerm" />
              <Label htmlFor="longTerm">Long Term</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shortMidTerm" id="shortMidTerm" />
              <Label htmlFor="shortMidTerm">Short/Mid Term</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="noRental" id="noRental" />
              <Label htmlFor="noRental">No Rental</Label>
            </div>
          </RadioGroup>
        </div>
        
        {rentalDetails.rentalType !== 'noRental' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="monthlyRent">Monthly Rent</Label>
                <Input
                  id="monthlyRent"
                  name="monthlyRent"
                  value={rentalDetails.monthlyRent}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter monthly rent"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="annualAppreciation">Annual Appreciation (%)</Label>
                <Input
                  id="annualAppreciation"
                  name="annualAppreciation"
                  value={rentalDetails.annualAppreciation}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter annual appreciation %"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="annualInsurance">Annual Insurance</Label>
                <Input
                  id="annualInsurance"
                  name="annualInsurance"
                  value={rentalDetails.annualInsurance}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter annual insurance cost"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="annualPropertyTax">Annual Property Tax</Label>
                <Input
                  id="annualPropertyTax"
                  name="annualPropertyTax"
                  value={rentalDetails.annualPropertyTax}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter annual property tax"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="annualMaintenance">Annual Maintenance (%)</Label>
                <Input
                  id="annualMaintenance"
                  name="annualMaintenance"
                  value={rentalDetails.annualMaintenance}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter annual maintenance %"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vacancyRate">Vacancy Rate (%)</Label>
                <Input
                  id="vacancyRate"
                  name="vacancyRate"
                  value={rentalDetails.vacancyRate}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter vacancy rate %"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="grid gap-2">
                <Label htmlFor="annualCapex">Annual CapEx (%)</Label>
                <Input
                  id="annualCapex"
                  name="annualCapex"
                  value={rentalDetails.annualCapex}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter annual CapEx %"
                />
              </div>
              
              {rentalDetails.rentalType === 'longTerm' && (
                <div className="grid gap-2">
                  <Label htmlFor="pmFee">Property Management Fee (%)</Label>
                  <Input
                    id="pmFee"
                    name="pmFee"
                    value={rentalDetails.pmFee}
                    onChange={handleRentalDetailsChange}
                    placeholder="Enter PM fee %"
                  />
                </div>
              )}
              
              {rentalDetails.rentalType === 'shortMidTerm' && (
                <div className="grid gap-2">
                  <Label htmlFor="shortTermPmFee">Short Term PM Fee (%)</Label>
                  <Input
                    id="shortTermPmFee"
                    name="shortTermPmFee"
                    value={rentalDetails.shortTermPmFee}
                    onChange={handleRentalDetailsChange}
                    placeholder="Enter short term PM fee %"
                  />
                </div>
              )}
            </div>
            
            {rentalDetails.rentalType === 'longTerm' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="leaseUpFee">Lease Up Fee</Label>
                  <Input
                    id="leaseUpFee"
                    name="leaseUpFee"
                    value={rentalDetails.leaseUpFee}
                    onChange={handleRentalDetailsChange}
                    placeholder="Enter lease up fee"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="averageLeaseLength">Average Lease Length (years)</Label>
                  <Input
                    id="averageLeaseLength"
                    name="averageLeaseLength"
                    value={rentalDetails.averageLeaseLength}
                    onChange={handleRentalDetailsChange}
                    placeholder="Enter average lease length"
                  />
                </div>
              </div>
            )}
            
            {rentalDetails.rentalType === 'shortMidTerm' && (
              <div className="grid gap-2">
                <Label htmlFor="personalUsage">Personal Usage (%)</Label>
                <Input
                  id="personalUsage"
                  name="personalUsage"
                  value={rentalDetails.personalUsage}
                  onChange={handleRentalDetailsChange}
                  placeholder="Enter personal usage %"
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
} 