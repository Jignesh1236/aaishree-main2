import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, DollarSign } from "lucide-react";
import type { ServiceItem } from "@shared/schema";

interface ServiceEntryFormProps {
  services: ServiceItem[];
  onServicesChange: (services: ServiceItem[]) => void;
}

const DEFAULT_SERVICES = [
  "TYPING",
  "7/12 8-A",
  "1951 THI 7/12",
  "STAMP COMISSION",
  "PAN CARD",
  "AADHAR CARD",
  "LIGHT BILL",
  "AAYUSHMAN CARD",
  "PVC ORDER",
  "KHEDUT ARJI",
  "E CHALLAN",
  "PM KISHAN & KYC",
  "INDEX",
  "VARSAI",
  "ELECTION CARD",
  "PARIVAHAN",
  "PF",
  "ONLINE FORM",
  "MGVCL ARJI",
  "LAMINATION & PRINT",
  "VADHARO",
  "XEROX",
  "OTHER"
];

export default function ServiceEntryForm({ services, onServicesChange }: ServiceEntryFormProps) {
  const addService = () => {
    const newService: ServiceItem = {
      id: crypto.randomUUID(),
      name: "",
      amount: 0,
    };
    onServicesChange([...services, newService]);
  };

  const autoPopulateServices = () => {
    const newServices: ServiceItem[] = DEFAULT_SERVICES.map(name => ({
      id: crypto.randomUUID(),
      name,
      amount: 0,
    }));
    onServicesChange(newServices);
  };

  const removeService = (id: string) => {
    onServicesChange(services.filter((s: ServiceItem) => s.id !== id));
  };

  const updateService = (id: string, field: keyof ServiceItem, value: string | number) => {
    onServicesChange(
      services.map((s: ServiceItem) => s.id === id ? { ...s, [field]: value } : s)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <Label className="text-lg font-semibold">Services</Label>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && (
            <Button
              type="button"
              size="sm"
              onClick={autoPopulateServices}
              variant="default"
              className="gap-2"
            >
              Auto-Add All Services
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={addService}
            variant="outline"
            className="gap-2"
            data-testid="button-add-service"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {services.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">
              No services added yet. Click "Auto-Add All Services" to populate all services at once.
            </p>
          </div>
        ) : (
          services.map((service: ServiceItem, index: number) => (
            <div key={service.id} className="flex gap-3 items-start p-4 rounded-lg border bg-card/50 hover-elevate">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`service-name-${service.id}`} className="text-sm font-medium">
                    Service Name
                  </Label>
                  <Input
                    id={`service-name-${service.id}`}
                    type="text"
                    placeholder="e.g., Aadhaar Card"
                    value={service.name}
                    onChange={(e) => updateService(service.id, 'name', e.target.value)}
                    className="h-10"
                    data-testid={`input-service-name-${index}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`service-amount-${service.id}`} className="text-sm font-medium">
                    Amount (₹)
                  </Label>
                  <Input
                    id={`service-amount-${service.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={service.amount || ''}
                    onChange={(e) => updateService(service.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-10"
                    data-testid={`input-service-amount-${index}`}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeService(service.id)}
                className="mt-8 hover:bg-destructive/10 hover:text-destructive"
                data-testid={`button-remove-service-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}