import { useState } from 'react';
import ServiceEntryForm from '../ServiceEntryForm';
import type { ServiceItem } from '@shared/schema';

export default function ServiceEntryFormExample() {
  const [services, setServices] = useState<ServiceItem[]>([
    { id: '1', name: 'Aadhaar Card', amount: 30 },
    { id: '2', name: 'PAN Card', amount: 100 },
  ]);

  return <ServiceEntryForm services={services} onServicesChange={setServices} />;
}
