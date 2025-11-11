import { Card } from "@/components/ui/card";
import type { DailyReport, ReportSummary } from "@shared/schema";
import ReportHeader from "./ReportHeader";

interface ReportDisplayProps {
  report: DailyReport;
  summary: ReportSummary;
}

export default function ReportDisplay({ report, summary }: ReportDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const maxRows = Math.max(report.services.length, report.expenses.length);
  
  // Determine table size class based on row count
  const getTableSizeClass = () => {
    if (maxRows > 25) return 'very-compact-print';
    if (maxRows > 15) return 'compact-print';
    return '';
  };

  return (
    <div className="max-w-4xl mx-auto bg-background print:bg-white p-6 print:p-0 print-report-container">
      <ReportHeader date={report.date} />

      <div className="space-y-6 print:space-y-4">
        <div className="hidden print:block">
          <table className={`w-full border-2 border-gray-800 ${getTableSizeClass()}`}>
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-bold border-r-2 border-gray-800">Service Name</th>
                <th className="text-right px-4 py-3 font-bold border-r-2 border-gray-800 w-28">Amount</th>
                <th className="text-left px-4 py-3 font-bold border-r-2 border-gray-800">Expense Name</th>
                <th className="text-right px-4 py-3 font-bold w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, index) => {
                const service = report.services[index];
                const expense = report.expenses[index];
                return (
                  <tr key={index}>
                    <td className="px-4 py-2.5 border-r">{service?.name || ''}</td>
                    <td className="px-4 py-2.5 text-right border-r font-medium">{service ? formatCurrency(service.amount) : ''}</td>
                    <td className="px-4 py-2.5 border-r">{expense?.name || ''}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{expense ? formatCurrency(expense.amount) : ''}</td>
                  </tr>
                );
              })}
              <tr className="bg-gray-300 font-bold">
                <td className="px-4 py-3 font-bold uppercase tracking-wide">Total Services</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(summary.totalServices)}</td>
                <td className="px-4 py-3 font-bold uppercase tracking-wide">Total Expenses</td>
                <td className="px-4 py-3 text-right font-bold">{formatCurrency(summary.totalExpenses)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 p-5 bg-gray-200 border-2 border-gray-800 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold uppercase tracking-wide">Net Profit:</span>
              <span className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(summary.netProfit)}
              </span>
            </div>
          </div>
        </div>

        <div className="print:hidden space-y-6">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide mb-3 text-foreground print:text-black print:text-sm border-b-2 border-primary print:border-b print:border-gray-400 pb-2 print:pb-1 print:mb-2">
              Services Rendered
            </h2>
            {report.services.length > 0 ? (
              <div className="border rounded-md overflow-hidden print:rounded-none">
                <table className="w-full text-sm">
                  <thead className="bg-muted print:bg-white">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold print:text-black">Service Name</th>
                      <th className="text-right px-3 py-2 font-semibold print:text-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.services.map((service, index) => (
                      <tr
                        key={service.id}
                        className={index % 2 === 0 ? 'bg-background print:bg-white' : 'bg-muted/30 print:bg-white'}
                        data-testid={`row-service-${index}`}
                      >
                        <td className="px-3 py-2 print:text-black" data-testid={`text-service-name-${index}`}>
                          {service.name}
                        </td>
                        <td className="px-3 py-2 text-right font-medium print:text-black" data-testid={`text-service-amount-${index}`}>
                          {formatCurrency(service.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 print:bg-white total-row">
                      <td className="px-3 py-2 font-bold print:text-black">Total</td>
                      <td className="px-3 py-2 text-right font-bold print:text-black" data-testid="text-total-services">
                        {formatCurrency(summary.totalServices)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-3 print:text-black print:text-xs">No services recorded</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold uppercase tracking-wide mb-3 text-foreground print:text-black print:text-sm border-b-2 border-destructive print:border-b print:border-gray-400 pb-2 print:pb-1 print:mb-2">
              Expenses
            </h2>
            {report.expenses.length > 0 ? (
              <div className="border rounded-md overflow-hidden print:rounded-none">
                <table className="w-full text-sm">
                  <thead className="bg-muted print:bg-white">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold print:text-black">Expense Name</th>
                      <th className="text-right px-3 py-2 font-semibold print:text-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenses.map((expense, index) => (
                      <tr
                        key={expense.id}
                        className={index % 2 === 0 ? 'bg-background print:bg-white' : 'bg-muted/30 print:bg-white'}
                        data-testid={`row-expense-${index}`}
                      >
                        <td className="px-3 py-2 print:text-black" data-testid={`text-expense-name-${index}`}>
                          {expense.name}
                        </td>
                        <td className="px-3 py-2 text-right font-medium print:text-black" data-testid={`text-expense-amount-${index}`}>
                          {formatCurrency(expense.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 bg-muted/50 print:bg-white total-row">
                      <td className="px-3 py-2 font-bold print:text-black">Total</td>
                      <td className="px-3 py-2 text-right font-bold print:text-black" data-testid="text-total-expenses">
                        {formatCurrency(summary.totalExpenses)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-3 print:text-black print:text-xs">No expenses recorded</p>
            )}
          </div>
        </div>

        <Card className="p-4 border-2 print:shadow-none summary-box">
          <h2 className="text-xl font-bold mb-4 text-foreground print:text-black uppercase tracking-wide">Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b print:text-black print:border-gray-300 print:pb-1">
              <span className="font-medium print:text-sm">Total Services Revenue</span>
              <span className="font-semibold print:text-sm">{formatCurrency(summary.totalServices)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b print:text-black print:border-gray-300 print:pb-1">
              <span className="font-medium print:text-sm">Online Payment</span>
              <span className="font-semibold print:text-sm text-green-600 print:text-green-700">{formatCurrency(summary.onlinePayment)}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b print:text-black print:border-gray-300 print:pb-1">
              <span className="font-medium print:text-sm">Total Expenses</span>
              <span className="font-semibold print:text-sm">{formatCurrency(summary.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 print:pt-2 print:border-t print:border-gray-400">
              <span className="text-xl font-bold print:text-black print:text-base">Net Profit</span>
              <span
                className={`text-xl font-bold print:text-base ${summary.netProfit >= 0 ? 'text-green-600 print:text-green-700' : 'text-destructive print:text-red-700'}`}
                data-testid="text-net-profit"
              >
                {formatCurrency(summary.netProfit)}
              </span>
            </div>
          </div>
        </Card>

        <div className="mt-8 print:mt-12 pt-6 border-t border-gray-300">
          <div className="flex justify-end">
            <div className="text-center">
              <div className="border-t-2 border-gray-800 w-48 mb-2 print:mb-3"></div>
              <p className="text-sm font-semibold text-foreground print:text-black">Authorized Signature</p>
              <p className="text-xs text-muted-foreground print:text-gray-600 mt-1">ADSC</p>
            </div>
          </div>
        </div>

        <div className="hidden print:block print-footer border-t border-gray-400 text-center text-gray-600">
          <p>Generated on {new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <p className="mt-1">Aaishree Data Service Center - Daily Business Report</p>
        </div>
      </div>
    </div>
  );
}