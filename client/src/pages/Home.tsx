import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Calendar, Save, History, LogIn, Shield, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import ServiceEntryForm from "@/components/ServiceEntryForm";
import ExpenseEntryForm from "@/components/ExpenseEntryForm";
import ReportDisplay from "@/components/ReportDisplay";
import type { ServiceItem, ExpenseItem, DailyReport, ReportSummary, Report } from "@shared/schema";

const logoUrl = "/attached_assets/download_1762507279905.png";

export default function Home() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [onlinePayment, setOnlinePayment] = useState<string>('0');
  const [showReport, setShowReport] = useState(false);
  const [showOperatorDialog, setShowOperatorDialog] = useState(false);
  const [operatorName, setOperatorName] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: existingReports } = useQuery<Report[]>({
    queryKey: ['/api/reports/date', date],
    enabled: !!date,
  });

  const saveReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const res = await apiRequest('POST', '/api/reports', reportData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/date', date] });
      toast({
        title: "Report Saved",
        description: "Your daily report has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save report",
        variant: "destructive",
      });
    },
  });

  const calculateSummary = (): ReportSummary => {
    const totalServices = services.reduce((sum, s) => sum + s.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const onlinePaymentAmount = parseFloat(onlinePayment) || 0;
    const netProfit = totalServices - totalExpenses;
    return { totalServices, totalExpenses, netProfit, onlinePayment: onlinePaymentAmount, cashPayment: 0 };
  };

  const report: DailyReport = {
    date,
    services,
    expenses,
  };

  const summary = calculateSummary();

  const handlePrint = () => {
    setShowOperatorDialog(true);
  };

  const handleConfirmPrint = () => {
    if (!operatorName.trim()) {
      toast({
        title: "Operator Name Required",
        description: "Please enter the operator name for the signature.",
        variant: "destructive",
      });
      return;
    }

    // Store operator name temporarily in the DOM
    const reportContainer = document.querySelector('.print-report-container');
    if (reportContainer) {
      const operatorSignElement = reportContainer.querySelector('.operator-signature-name');
      if (operatorSignElement) {
        operatorSignElement.textContent = operatorName;
      }
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Report - ${new Date(date).toLocaleDateString('en-IN')}</title>
            ${Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).map(style => style.outerHTML).join('\n')}
          </head>
          <body>
            ${document.querySelector('.print-report-container')?.outerHTML || ''}
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }

    setShowOperatorDialog(false);
    setOperatorName('');
  };

  const handleGenerateReport = () => {
    // Validation
    if (!date) {
      toast({
        title: "Date Required",
        description: "Please select a date for the report.",
        variant: "destructive",
      });
      return;
    }

    if (services.length === 0 && expenses.length === 0 && onlinePayment === '0') {
      toast({
        title: "No Data",
        description: "Please add at least one service, expense, or online payment to generate a report.",
        variant: "destructive",
      });
      return;
    }

    const invalidServices = services.some(s => !s.name.trim());
    if (invalidServices) {
      toast({
        title: "Invalid Service Data",
        description: "All services must have a name.",
        variant: "destructive",
      });
      return;
    }

    const invalidExpenses = expenses.some(e => !e.name.trim() || e.amount <= 0);
    if (invalidExpenses) {
      toast({
        title: "Invalid Expense Data",
        description: "All expenses must have a name and a positive amount.",
        variant: "destructive",
      });
      return;
    }

    setShowReport(true);
    setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSaveReport = () => {
    const reportData = {
      date,
      services,
      expenses,
      totalServices: summary.totalServices.toString(),
      totalExpenses: summary.totalExpenses.toString(),
      netProfit: summary.netProfit.toString(),
      onlinePayment: onlinePayment,
    };
    saveReportMutation.mutate(reportData);
  };

  const loadExistingReport = (report: Report) => {
    setServices(report.services as ServiceItem[]);
    setExpenses(report.expenses as ExpenseItem[]);
    setOnlinePayment(report.onlinePayment || '0');
    setShowReport(true);
    toast({
      title: "Report Loaded",
      description: "Loaded existing report for this date.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="no-print border-b bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/adsc-logo.png" alt="ADSC Logo" className="h-14 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight" data-testid="text-app-title">
                  ADSC Daily Report Generator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create professional daily business reports
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/history">
                <Button variant="outline" className="gap-2" data-testid="button-history">
                  <History className="h-4 w-4" />
                  History
                </Button>
              </Link>
              {user ? (
                <Link href="/admin">
                  <Button variant="outline" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="outline" className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
              {showReport && (
                <>
                  <Button onClick={handleSaveReport} disabled={saveReportMutation.isPending} className="gap-2" data-testid="button-save">
                    <Save className="h-4 w-4" />
                    {saveReportMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={handlePrint} variant="outline" className="gap-2" data-testid="button-print">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="no-print space-y-5">
            <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Report Information</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-date" className="text-sm font-medium">
                    Report Date
                  </Label>
                  <Input
                    id="report-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                    data-testid="input-report-date"
                  />
                </div>

                {existingReports && existingReports.length > 0 && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm text-foreground mb-3 font-medium">
                      {existingReports.length} report{existingReports.length > 1 ? 's' : ''} exist{existingReports.length === 1 ? 's' : ''} for this date
                    </p>
                    <div className="space-y-2">
                      {existingReports.map((report, index) => (
                        <Button 
                          key={report.id}
                          variant="outline" 
                          size="sm" 
                          onClick={() => loadExistingReport(report)}
                          className="w-full"
                          data-testid={`button-load-existing-${index}`}
                        >
                          Load Report #{index + 1} (Created: {new Date(report.createdAt).toLocaleTimeString('en-IN')})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur">
              <ServiceEntryForm services={services} onServicesChange={setServices} />
            </Card>

            <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur">
              <ExpenseEntryForm expenses={expenses} onExpensesChange={setExpenses} />
            </Card>

            <Card className="p-6 shadow-lg border-0 bg-card/50 backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Online Payment</h2>
              </div>
              <div className="space-y-2">
                <Label htmlFor="online-payment" className="text-sm font-medium">
                  Online Payment Amount (₹)
                </Label>
                <Input
                  id="online-payment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={onlinePayment}
                  onChange={(e) => setOnlinePayment(e.target.value)}
                  placeholder="0.00"
                  className="h-11"
                  data-testid="input-online-payment"
                />
              </div>
            </Card>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleGenerateReport}
                size="lg"
                className="flex-1 h-12 text-base shadow-md"
                data-testid="button-generate-report"
              >
                Generate Report
              </Button>
              <Button
                onClick={() => {
                  setServices([]);
                  setExpenses([]);
                  setOnlinePayment('0');
                  setShowReport(false);
                }}
                variant="outline"
                size="lg"
                className="h-12"
                data-testid="button-clear-all"
              >
                Clear All
              </Button>
            </div>
          </div>

          <div ref={reportRef} className="lg:sticky lg:top-8 lg:self-start no-print">
            {showReport ? (
              <Card className="overflow-hidden shadow-lg border-0 bg-card/50 backdrop-blur">
                <ReportDisplay report={report} summary={summary} />
              </Card>
            ) : (
              <Card className="p-12 shadow-lg border-0 bg-card/50 backdrop-blur">
                <div className="text-center space-y-6">
                  <div className="h-24 w-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Printer className="h-12 w-12 text-primary/60" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-foreground">Report Preview</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      Fill in the details and click "Generate Report" to see the preview
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showReport && (
        <div className="print-only print-report-container">
          <ReportDisplay report={report} summary={summary} />
        </div>
      )}

      <Dialog open={showOperatorDialog} onOpenChange={setShowOperatorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operator Signature</DialogTitle>
            <DialogDescription>
              Enter the operator name that will appear on the printed report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="operator-name">Operator Name</Label>
            <Input
              id="operator-name"
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Enter operator name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmPrint();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOperatorDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}