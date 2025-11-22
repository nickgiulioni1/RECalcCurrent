import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { logger } from '@/lib/logger';
import { PropertyDetails } from '@/lib/types';

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

interface RehabEstimatorFormProps {
  propertyDetails: PropertyDetails;
  onRehabCostChange: (cost: string) => void;
  onHoldingPeriodChange: (period: string) => void;
}

export default function RehabEstimatorForm({
  propertyDetails,
  onRehabCostChange,
  onHoldingPeriodChange
}: RehabEstimatorFormProps) {
  const [rehabStrategy, setRehabStrategy] = useState<string>('rental');
  const [rehabDetails, setRehabDetails] = useState<RehabCategory>(() => getDefaultRehabItems());
  const [manuallyModified, setManuallyModified] = useState<boolean>(false);
  const previousRehabStrategy = useRef<string>(rehabStrategy);
  
  // Calculate total rehab cost
  const calculateTotalRehabCost = useCallback((): number => {
    let total = 0;
    Object.values(rehabDetails).forEach(items => {
      items.forEach(item => {
        if (item.checked) {
          total += item.extended;
        }
      });
    });
    logger.debug('Calculated total rehab cost', { total });
    return total;
  }, [rehabDetails]);

  // Calculate rehab duration
  const calculateRehabDuration = useCallback((cost: number): number => {
    // Default to 1 month minimum
    let duration = 1;
    
    // Basic formula: 1 month for every $30,000 in rehab with a minimum of 1 month
    if (cost > 0) {
      duration = Math.max(1, Math.ceil(cost / 30000));
    }
    
    logger.debug('Calculated rehab duration', { cost, duration });
    return duration;
  }, []);

  // Update rehab details when property details change
  useEffect(() => {
    logger.debug('Updating rehab details based on property', { 
      squareFootage: propertyDetails.squareFootage,
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
      rehabStrategy
    });
    
    const strategyChanged = previousRehabStrategy.current !== rehabStrategy;

    // Always update when the strategy changes so prices swap between rental and flip/AirBNB grades
    if (!manuallyModified || strategyChanged) {
      setRehabDetails(prevState => {
        const newState = { ...prevState };
        const isFlipAirbnb = rehabStrategy === 'flipAirbnb';

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

        return newState;
      });
    }

    previousRehabStrategy.current = rehabStrategy;
  }, [propertyDetails, rehabStrategy, manuallyModified]);
  
  // Use a separate useEffect to update the parent components when rehab details change
  useEffect(() => {
    if (manuallyModified) {
      const totalCost = calculateTotalRehabCost();
      onRehabCostChange(totalCost.toFixed(2));
      
      const duration = calculateRehabDuration(totalCost);
      onHoldingPeriodChange(duration.toString());
      
      logger.debug('Updated parent components with rehab calculations', { 
        totalCost, 
        duration, 
        manuallyModified 
      });
    }
  }, [rehabDetails, manuallyModified, calculateTotalRehabCost, onRehabCostChange, onHoldingPeriodChange, calculateRehabDuration]);


  // Handle rehab strategy change
  const handleRehabStrategyChange = (value: string) => {
    logger.debug('Changing rehab strategy', { value });
    setRehabStrategy(value);
    setManuallyModified(true);
  };

  // Handle rehab details change
  const handleRehabDetailsChange = (category: string, itemId: string, field: string, value: string | number | boolean) => {
    logger.debug('Changing rehab detail', { category, itemId, field, value });
    setManuallyModified(true);
    
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
      
      // Return the new state without calling callbacks here - the useEffect will handle that
      return newState;
    });
  };

  // Add custom rehab item
  const addCustomRehabItem = () => {
    logger.debug('Adding custom rehab item');
    setManuallyModified(true);
    
    setRehabDetails(prevState => {
      const newState = { ...prevState };
      const customItems = newState.contingency;
      
      // Generate unique ID for the new custom item
      const newId = `customItem${Date.now()}`;
      
      // Add new custom item
      customItems.push({
        id: newId,
        description: 'Custom Item',
        quantity: 1,
        rentalPrice: 0,
        airbnbPrice: 0,
        price: 0,
        extended: 0,
        checked: true
      });
      
      return newState;
    });
  };

  logger.debug('Rendering RehabEstimatorForm', { 
    rehabStrategy, 
    totalRehabCost: calculateTotalRehabCost()
  });
  
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">
          Rehab Estimator
        </CardTitle>
        <CardDescription className="text-base">
          Estimate the costs for various renovation items. Calculated rehab cost: ${calculateTotalRehabCost().toFixed(2)}
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
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rental" id="rental" />
              <Label htmlFor="rental">Rental Grade</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="flipAirbnb" id="flipAirbnb" />
              <Label htmlFor="flipAirbnb">Flip/Airbnb Grade</Label>
            </div>
          </RadioGroup>
        </div>
        
        {Object.entries(rehabDetails).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold capitalize mb-2">{category}</h3>
            <Table>
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
                            handleRehabDetailsChange(category, item.id, 'checked', !!checked)
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
                Add Custom Item
              </Button>
            )}
          </div>
        ))}
        
        <div className="text-right text-lg font-semibold mt-4">
          Total Rehab Cost: ${calculateTotalRehabCost().toFixed(2)}
        </div>
      </CardContent>
    </Card>
  );
}

// Default rehab items
function getDefaultRehabItems(): RehabCategory {
  return {
    flooring: [
      {
        id: 'lvpFlooring',
        description: 'LVP Flooring (per sq ft)',
        quantity: 1000,
        rentalPrice: 4.50,
        airbnbPrice: 6.50,
        price: 4.50,
        extended: 0,
        checked: false
      },
      {
        id: 'carpeting',
        description: 'Carpeting (per sq ft)',
        quantity: 1000,
        rentalPrice: 3.00,
        airbnbPrice: 4.50,
        price: 3.00,
        extended: 0,
        checked: false
      },
      {
        id: 'tileBathroomFloor',
        description: 'Tile for Bathroom Floor',
        quantity: 1,
        rentalPrice: 800,
        airbnbPrice: 1200,
        price: 800,
        extended: 0,
        checked: false
      }
    ],
    kitchen: [
      {
        id: 'kitchenCabinets',
        description: 'Kitchen Cabinets',
        quantity: 1,
        rentalPrice: 5000,
        airbnbPrice: 8000,
        price: 5000,
        extended: 0,
        checked: false
      },
      {
        id: 'kitchenCountertops',
        description: 'Kitchen Countertops',
        quantity: 1,
        rentalPrice: 3000,
        airbnbPrice: 5000,
        price: 3000,
        extended: 0,
        checked: false
      },
      {
        id: 'kitchenAppliances',
        description: 'Kitchen Appliance Package',
        quantity: 1,
        rentalPrice: 2500,
        airbnbPrice: 4000,
        price: 2500,
        extended: 0,
        checked: false
      },
      {
        id: 'kitchenSink',
        description: 'Kitchen Sink & Faucet',
        quantity: 1,
        rentalPrice: 400,
        airbnbPrice: 700,
        price: 400,
        extended: 0,
        checked: false
      }
    ],
    bathrooms: [
      {
        id: 'newBathroom',
        description: 'Full Bathroom Renovation',
        quantity: 1,
        rentalPrice: 4500,
        airbnbPrice: 7500,
        price: 4500,
        extended: 0,
        checked: false
      },
      {
        id: 'newVanity',
        description: 'New Vanity with Sink',
        quantity: 1,
        rentalPrice: 600,
        airbnbPrice: 1200,
        price: 600,
        extended: 0,
        checked: false
      },
      {
        id: 'newToilet',
        description: 'New Toilet',
        quantity: 1,
        rentalPrice: 300,
        airbnbPrice: 500,
        price: 300,
        extended: 0,
        checked: false
      },
      {
        id: 'newMirrorLight',
        description: 'Bathroom Mirror & Light',
        quantity: 1,
        rentalPrice: 200,
        airbnbPrice: 400,
        price: 200,
        extended: 0,
        checked: false
      }
    ],
    general: [
      {
        id: 'interiorPaint',
        description: 'Interior Paint (per sq ft)',
        quantity: 1000,
        rentalPrice: 1.50,
        airbnbPrice: 2.50,
        price: 1.50,
        extended: 0,
        checked: false
      },
      {
        id: 'drywall',
        description: 'Drywall Repair (per sq ft)',
        quantity: 1000,
        rentalPrice: 0.50,
        airbnbPrice: 0.80,
        price: 0.50,
        extended: 0,
        checked: false
      },
      {
        id: 'wallPrep',
        description: 'Wall Prep & Patching (per sq ft)',
        quantity: 1000,
        rentalPrice: 0.30,
        airbnbPrice: 0.50,
        price: 0.30,
        extended: 0,
        checked: false
      },
      {
        id: 'newInteriorDoors',
        description: 'New Interior Doors',
        quantity: 6,
        rentalPrice: 250,
        airbnbPrice: 350,
        price: 250,
        extended: 0,
        checked: false
      },
      {
        id: 'doorKnobs',
        description: 'Door Knobs and Hardware',
        quantity: 6,
        rentalPrice: 35,
        airbnbPrice: 65,
        price: 35,
        extended: 0,
        checked: false
      },
      {
        id: 'newExteriorDoors',
        description: 'New Exterior Doors',
        quantity: 2,
        rentalPrice: 500,
        airbnbPrice: 800,
        price: 500,
        extended: 0,
        checked: false
      },
      {
        id: 'newWindows',
        description: 'New Windows (10 units)',
        quantity: 10,
        rentalPrice: 450,
        airbnbPrice: 650,
        price: 450,
        extended: 0,
        checked: false
      },
      {
        id: 'windowBlinds',
        description: 'Window Blinds',
        quantity: 10,
        rentalPrice: 50,
        airbnbPrice: 80,
        price: 50,
        extended: 0,
        checked: false
      },
      {
        id: 'smokeCoDetectors',
        description: 'Smoke/CO Detectors',
        quantity: 4,
        rentalPrice: 35,
        airbnbPrice: 35,
        price: 35,
        extended: 0,
        checked: false
      }
    ],
    infrastructure: [
      {
        id: 'exteriorPaint',
        description: 'Exterior Paint',
        quantity: 1,
        rentalPrice: 4000,
        airbnbPrice: 6000,
        price: 4000,
        extended: 0,
        checked: false
      },
      {
        id: 'newRoof',
        description: 'New Roof',
        quantity: 1,
        rentalPrice: 8000,
        airbnbPrice: 10000,
        price: 8000,
        extended: 0,
        checked: false
      },
      {
        id: 'newSidingFascia',
        description: 'New Siding/Fascia',
        quantity: 1,
        rentalPrice: 3500,
        airbnbPrice: 5000,
        price: 3500,
        extended: 0,
        checked: false
      },
      {
        id: 'electrical',
        description: 'Electrical Update',
        quantity: 1,
        rentalPrice: 4000,
        airbnbPrice: 6000,
        price: 4000,
        extended: 0,
        checked: false
      },
      {
        id: 'plumbing',
        description: 'Plumbing Update',
        quantity: 1,
        rentalPrice: 3500,
        airbnbPrice: 5000,
        price: 3500,
        extended: 0,
        checked: false
      },
      {
        id: 'waterHeater',
        description: 'Water Heater',
        quantity: 1,
        rentalPrice: 1200,
        airbnbPrice: 1800,
        price: 1200,
        extended: 0,
        checked: false
      },
      {
        id: 'newAC',
        description: 'New AC Unit',
        quantity: 1,
        rentalPrice: 5000,
        airbnbPrice: 6500,
        price: 5000,
        extended: 0,
        checked: false
      },
      {
        id: 'newFurnace',
        description: 'New Furnace',
        quantity: 1,
        rentalPrice: 4500,
        airbnbPrice: 5500,
        price: 4500,
        extended: 0,
        checked: false
      },
      {
        id: 'landscaping',
        description: 'Landscaping',
        quantity: 1,
        rentalPrice: 2000,
        airbnbPrice: 3500,
        price: 2000,
        extended: 0,
        checked: false
      },
      {
        id: 'concretePorchWork',
        description: 'Concrete/Porch Work',
        quantity: 1,
        rentalPrice: 2500,
        airbnbPrice: 4000,
        price: 2500,
        extended: 0,
        checked: false
      },
      {
        id: 'basementDryLock',
        description: 'Basement Waterproofing',
        quantity: 1,
        rentalPrice: 3000,
        airbnbPrice: 4000,
        price: 3000,
        extended: 0,
        checked: false
      }
    ],
    contingency: [
      {
        id: 'unexpectedPerFoot',
        description: 'Contingency (per sq ft)',
        quantity: 1000,
        rentalPrice: 2.00,
        airbnbPrice: 3.00,
        price: 2.00,
        extended: 0,
        checked: false
      },
      {
        id: 'customItem1',
        description: 'Custom Item 1',
        quantity: 1,
        rentalPrice: 0,
        airbnbPrice: 0,
        price: 0,
        extended: 0,
        checked: false
      }
    ]
  };
} 