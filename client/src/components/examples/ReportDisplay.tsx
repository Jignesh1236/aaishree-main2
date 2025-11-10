import ReportDisplay from '../ReportDisplay';
import type { DailyReport } from '@shared/schema';

export default function ReportDisplayExample() {
  const report: DailyReport = {
    date: '2025-11-07',
    services: [
      { id: '1', name: 'Aadhaar Card', amount: 30 },
      { id: '2', name: 'PAN Card', amount: 100 },
      { id: '3', name: 'Passport Photo', amount: 50 },
    ],
    expenses: [
      { id: '1', name: 'Rent', amount: 2000 },
      { id: '2', name: 'Electricity', amount: 500 },
    ],
  };

  const summary = {
    totalServices: 180,
    totalExpenses: 2500,
    netProfit: -2320,
  };

  return <ReportDisplay report={report} summary={summary} />;
}
