import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, Eye, ArrowLeft, LogIn, Shield } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Report } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ReportDisplay from "@/components/ReportDisplay";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const logoUrl = "/adsc-logo.png";

export default function History() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/reports/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      toast({
        title: "Report Deleted",
        description: "Report has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete report",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
  };

  const handlePrintReport = () => {
    // Open print in new tab
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Report - ${selectedReport ? new Date(selectedReport.date).toLocaleDateString('en-IN') : ''}</title>
            ${Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
              .map(el => el.outerHTML)
              .join('\n')}
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
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <img src={logoUrl} alt="ADSC Logo" className="h-8 w-auto" />
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                  Reports History
                </h1>
                <p className="text-sm text-muted-foreground">
                  View and manage all saved reports
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 no-print">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        ) : !reports || reports.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="text-6xl">📋</div>
              <h3 className="text-xl font-semibold text-foreground">No Reports Yet</h3>
              <p className="text-muted-foreground">
                Create and save your first report to see it here
              </p>
              <Link href="/">
                <Button data-testid="button-create-first">Create Report</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reports.map((report, index) => (
              <Card key={report.id} className="p-6" data-testid={`card-report-${index}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground" data-testid={`text-report-date-${index}`}>
                        {formatDate(report.date)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Saved on {new Date(report.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Services</p>
                        <p className="font-semibold" data-testid={`text-total-services-${index}`}>
                          {formatCurrency(report.totalServices)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Expenses</p>
                        <p className="font-semibold" data-testid={`text-total-expenses-${index}`}>
                          {formatCurrency(report.totalExpenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net Profit</p>
                        <p
                          className={`font-semibold ${parseFloat(report.netProfit as string) >= 0 ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}
                          data-testid={`text-net-profit-${index}`}
                        >
                          {formatCurrency(report.netProfit)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewReport(report)}
                      data-testid={`button-view-${index}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {user ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-${index}`}
                            title="Delete Report (Admin Only)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Report</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this report? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteReportMutation.mutate(report.id)}
                              data-testid={`button-confirm-delete-${index}`}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Link href="/login">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Login Required to Delete"
                          data-testid={`button-login-to-delete-${index}`}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div>
              <div className="mb-4 no-print">
                <Button onClick={handlePrintReport} size="sm" data-testid="button-print-dialog">
                  <Eye className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
              </div>
              {/* Print-only section */}
              {selectedReport && (
                <div className="print-only print-report-container">
                  <ReportDisplay
                    report={{
                      date: selectedReport.date,
                      services: selectedReport.services as ServiceItem[],
                      expenses: selectedReport.expenses as ExpenseItem[],
                    }}
                    summary={{
                      totalServices: parseFloat(selectedReport.totalServices),
                      totalExpenses: parseFloat(selectedReport.totalExpenses),
                      netProfit: parseFloat(selectedReport.netProfit),
                      onlinePayment: parseFloat(selectedReport.onlinePayment || '0'),
                      cashPayment: 0,
                    }}
                  />
                </div>
              )}
              <ReportDisplay
                report={{
                  date: selectedReport.date,
                  services: selectedReport.services as any,
                  expenses: selectedReport.expenses as any,
                }}
                summary={{
                  totalServices: parseFloat(selectedReport.totalServices as string),
                  totalExpenses: parseFloat(selectedReport.totalExpenses as string),
                  netProfit: parseFloat(selectedReport.netProfit as string),
                  onlinePayment: parseFloat(selectedReport.onlinePayment as string || '0'),
                  cashPayment: 0,
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}