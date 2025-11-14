import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import type { Report } from "@shared/schema";

interface ReportComparisonProps {
  reports: Report[];
}

export default function ReportComparison({ reports }: ReportComparisonProps) {
  const [report1Id, setReport1Id] = useState<string>("");
  const [report2Id, setReport2Id] = useState<string>("");

  const report1 = reports.find(r => r.id === report1Id);
  const report2 = reports.find(r => r.id === report2Id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDifference = (val1: number, val2: number) => {
    const diff = val1 - val2;
    const percentChange = val2 !== 0 ? ((diff / val2) * 100).toFixed(1) : '0.0';
    return { diff, percentChange };
  };

  const ComparisonRow = ({ label, val1, val2 }: { label: string; val1: number; val2: number }) => {
    const { diff, percentChange } = calculateDifference(val1, val2);
    const isPositive = diff > 0;
    
    return (
      <div className="grid grid-cols-4 gap-4 py-3 border-b">
        <div className="font-medium">{label}</div>
        <div className="text-right">{formatCurrency(val2)}</div>
        <div className="text-right">{formatCurrency(val1)}</div>
        <div className={`text-right flex items-center justify-end gap-1 ${isPositive ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : diff < 0 ? <TrendingDown className="h-4 w-4" /> : null}
          <span className="font-medium">{isPositive ? '+' : ''}{formatCurrency(diff)}</span>
          <span className="text-xs">({percentChange}%)</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <GitCompare className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>Report Comparison</CardTitle>
            <CardDescription>Compare two reports side by side</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Report 1 (Baseline)</label>
            <Select value={report2Id} onValueChange={setReport2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select first report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {formatDate(report.date)} - {formatCurrency(parseFloat(report.netProfit))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Report 2 (Compare)</label>
            <Select value={report1Id} onValueChange={setReport1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select second report" />
              </SelectTrigger>
              <SelectContent>
                {reports.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {formatDate(report.date)} - {formatCurrency(parseFloat(report.netProfit))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {report1 && report2 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 pb-2 border-b-2 font-semibold">
              <div>Metric</div>
              <div className="text-right">{formatDate(report2.date)}</div>
              <div className="text-right">{formatDate(report1.date)}</div>
              <div className="text-right">Difference</div>
            </div>

            <ComparisonRow 
              label="Revenue" 
              val1={parseFloat(report1.totalServices)} 
              val2={parseFloat(report2.totalServices)} 
            />
            <ComparisonRow 
              label="Expenses" 
              val1={parseFloat(report1.totalExpenses)} 
              val2={parseFloat(report2.totalExpenses)} 
            />
            <ComparisonRow 
              label="Profit" 
              val1={parseFloat(report1.netProfit)} 
              val2={parseFloat(report2.netProfit)} 
            />
            <ComparisonRow 
              label="Online Payment" 
              val1={parseFloat(report1.onlinePayment)} 
              val2={parseFloat(report2.onlinePayment)} 
            />

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">
                {parseFloat(report1.netProfit) > parseFloat(report2.netProfit) 
                  ? `📈 Report 2 shows an improvement of ${formatCurrency(parseFloat(report1.netProfit) - parseFloat(report2.netProfit))} in profit compared to Report 1.`
                  : parseFloat(report1.netProfit) < parseFloat(report2.netProfit)
                  ? `📉 Report 2 shows a decrease of ${formatCurrency(parseFloat(report2.netProfit) - parseFloat(report1.netProfit))} in profit compared to Report 1.`
                  : `📊 Both reports have the same profit.`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Select two reports to compare</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
