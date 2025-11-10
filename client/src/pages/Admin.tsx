
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, FileText, History, User, Download, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Report } from "@shared/schema";
import { useState } from "react";

export default function Admin() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'pdf'>('csv');

  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/");
  };

  // Calculate analytics
  const analytics = {
    totalReports: reports.length,
    totalRevenue: reports.reduce((sum, r) => sum + parseFloat(r.totalServices), 0),
    totalExpenses: reports.reduce((sum, r) => sum + parseFloat(r.totalExpenses), 0),
    totalProfit: reports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0),
    averageProfit: reports.length > 0 
      ? reports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0) / reports.length 
      : 0,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Total Services', 'Total Expenses', 'Net Profit', 'Services', 'Expenses'];
    const rows = reports.map(report => [
      new Date(report.date).toLocaleDateString('en-IN'),
      report.totalServices,
      report.totalExpenses,
      report.netProfit,
      report.services.map(s => `${s.name}: ${s.amount}`).join('; '),
      report.expenses.map(e => `${e.name}: ${e.amount}`).join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adsc-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(reports, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adsc-reports-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const exportSummaryReport = () => {
    const summary = {
      generatedOn: new Date().toISOString(),
      totalReports: analytics.totalReports,
      totalRevenue: analytics.totalRevenue,
      totalExpenses: analytics.totalExpenses,
      totalProfit: analytics.totalProfit,
      averageProfit: analytics.averageProfit,
      dateRange: {
        from: reports.length > 0 ? new Date(Math.min(...reports.map(r => new Date(r.date).getTime()))).toISOString() : null,
        to: reports.length > 0 ? new Date(Math.max(...reports.map(r => new Date(r.date).getTime()))).toISOString() : null,
      },
      reports: reports.map(r => ({
        date: r.date,
        totalServices: r.totalServices,
        totalExpenses: r.totalExpenses,
        netProfit: r.netProfit,
      }))
    };

    const jsonContent = JSON.stringify(summary, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adsc-summary-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else if (exportFormat === 'json') {
      exportToJSON();
    } else {
      exportSummaryReport();
    }
  };

  // Get recent reports (last 7 days)
  const recentReports = reports
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Aaishree Data Service Center
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium">{user?.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Analytics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalReports}</div>
              <p className="text-xs text-muted-foreground">All time reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">From all services</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(analytics.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">All expenses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${analytics.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(analytics.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(analytics.averageProfit)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Export Reports</CardTitle>
            <CardDescription>Download all reports in various formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              <Button onClick={exportToJSON} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <Button onClick={exportSummaryReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Summary Report
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {reports.length} reports available for export
            </p>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>Last 7 reports overview</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReports.length > 0 ? (
              <div className="space-y-3">
                {recentReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(report.date).toLocaleDateString('en-IN', { 
                            weekday: 'short',
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.services.length} services, {report.expenses.length} expenses
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${parseFloat(report.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(parseFloat(report.netProfit))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Revenue: {formatCurrency(parseFloat(report.totalServices))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No reports available</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Create Daily Report</CardTitle>
                  <CardDescription>Generate new daily business report</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enter services and expenses to create a new daily report for your business.
              </p>
              <Link href="/">
                <Button className="w-full mt-4">
                  Go to Report Creation
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/history")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <History className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Report History</CardTitle>
                  <CardDescription>View and manage past reports</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access historical reports, view details, print, and delete reports as needed.
              </p>
              <Link href="/history">
                <Button className="w-full mt-4" variant="outline">
                  View History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Admin Features */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Admin Features</CardTitle>
            <CardDescription>Available actions with admin privileges</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Full access to create and edit reports</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Delete reports with admin authentication</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>View complete report history and analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Export reports in CSV, JSON, and summary formats</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Print and export reports</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
