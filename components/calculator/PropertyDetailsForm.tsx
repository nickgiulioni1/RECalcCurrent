import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PropertyDetails } from "@/lib/types";
import { logger } from "@/lib/logger";

interface PropertyDetailsFormProps {
  propertyDetails: PropertyDetails;
  handlePropertyDetailsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PropertyDetailsForm({ 
  propertyDetails, 
  handlePropertyDetailsChange 
}: PropertyDetailsFormProps) {
  logger.debug('Rendering PropertyDetailsForm', { propertyDetails });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            name="address"
            value={propertyDetails.address}
            onChange={handlePropertyDetailsChange}
            placeholder="Enter property address"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="squareFootage">Square Footage</Label>
          <Input
            id="squareFootage"
            name="squareFootage"
            value={propertyDetails.squareFootage}
            onChange={handlePropertyDetailsChange}
            placeholder="Enter square footage"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            value={propertyDetails.bedrooms}
            onChange={handlePropertyDetailsChange}
            placeholder="Enter number of bedrooms"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            value={propertyDetails.bathrooms}
            onChange={handlePropertyDetailsChange}
            placeholder="Enter number of bathrooms"
          />
        </div>
      </CardContent>
    </Card>
  );
} 