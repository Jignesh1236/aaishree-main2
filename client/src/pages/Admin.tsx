import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut, FileText, History, User, Download, TrendingUp, DollarSign, Calendar, Filter, Edit, Printer, Trash2, KeyRound, BarChart3 } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { Report } from "@shared/schema";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import ReportDisplay from "@/components/ReportDisplay";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Admin() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [profitFilter, setProfitFilter] = useState<"all" | "profit" | "loss">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "profit" | "revenue">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Edit and monthly summary states
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Edit form states
  const [editDate, setEditDate] = useState("");
  const [editServices, setEditServices] = useState<any[]>([]);
  const [editExpenses, setEditExpenses] = useState<any[]>([]);
  const [editOnlinePayment, setEditOnlinePayment] = useState("0");

  // Change password states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Bulk delete states
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: allReports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  const { toast } = useToast();

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async (data: { id: number; report: any }) => {
      const response = await fetch(`/api/reports/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.report),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to update report');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setEditingReport(null);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/");
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  // Filtered and sorted reports
  const reports = useMemo(() => {
    let filtered = [...allReports];

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(r => new Date(r.date) <= new Date(dateTo));
    }

    // Profit/Loss filter
    if (profitFilter === "profit") {
      filtered = filtered.filter(r => parseFloat(r.netProfit) >= 0);
    } else if (profitFilter === "loss") {
      filtered = filtered.filter(r => parseFloat(r.netProfit) < 0);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const dateStr = new Date(r.date).toLocaleDateString('en-IN').toLowerCase();
        const servicesStr = r.services.map(s => s.name.toLowerCase()).join(' ');
        const expensesStr = r.expenses.map(e => e.name.toLowerCase()).join(' ');
        return dateStr.includes(query) || servicesStr.includes(query) || expensesStr.includes(query);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === "date") {
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === "profit") {
        compareValue = parseFloat(a.netProfit) - parseFloat(b.netProfit);
      } else if (sortBy === "revenue") {
        compareValue = parseFloat(a.totalServices) - parseFloat(b.totalServices);
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [allReports, dateFrom, dateTo, profitFilter, searchQuery, sortBy, sortOrder]);

  // Calculate analytics from filtered reports
  const analytics = useMemo(() => ({
    totalReports: reports.length,
    totalRevenue: reports.reduce((sum, r) => sum + parseFloat(r.totalServices), 0),
    totalExpenses: reports.reduce((sum, r) => sum + parseFloat(r.totalExpenses), 0),
    totalProfit: reports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0),
    averageProfit: reports.length > 0
      ? reports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0) / reports.length
      : 0,
  }), [reports]);

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
      filters: {
        dateFrom: dateFrom || 'All',
        dateTo: dateTo || 'All',
        profitFilter,
        searchQuery: searchQuery || 'None'
      },
      totalReports: analytics.totalReports,
      totalRevenue: analytics.totalRevenue,
      totalExpenses: analytics.totalExpenses,
      totalProfit: analytics.totalProfit,
      averageProfit: analytics.averageProfit,
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('ADSC Daily Reports', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 30);
    doc.text(`Total Reports: ${reports.length}`, 14, 36);
    doc.text(`Total Revenue: ${formatCurrency(analytics.totalRevenue)}`, 14, 42);
    doc.text(`Total Expenses: ${formatCurrency(analytics.totalExpenses)}`, 14, 48);
    doc.text(`Total Profit: ${formatCurrency(analytics.totalProfit)}`, 14, 54);

    const tableData = reports.map(report => [
      new Date(report.date).toLocaleDateString('en-IN'),
      formatCurrency(parseFloat(report.totalServices as string)),
      formatCurrency(parseFloat(report.totalExpenses as string)),
      formatCurrency(parseFloat(report.netProfit as string)),
    ]);

    autoTable(doc, {
      startY: 62,
      head: [['Date', 'Services', 'Expenses', 'Profit']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      margin: { top: 62 },
    });

    doc.save(`adsc-reports-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: "PDF Exported",
      description: `Successfully exported ${reports.length} reports to PDF.`,
    });
  };

  const toggleReportSelection = (reportId: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(reports.map(r => r.id)));
    }
  };

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest('DELETE', `/api/reports/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setSelectedReports(new Set());
      toast({
        title: "Reports Deleted",
        description: `Successfully deleted ${selectedReports.size} reports.`,
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete selected reports.",
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = () => {
    if (selectedReports.size === 0) return;
    deleteManyMutation.mutate(Array.from(selectedReports));
  };

  // Monthly summary calculation
  const monthlySummary = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthReports = allReports.filter(r => {
      const reportDate = new Date(r.date);
      return reportDate.getFullYear() === year && reportDate.getMonth() + 1 === month;
    });

    return {
      totalReports: monthReports.length,
      totalRevenue: monthReports.reduce((sum, r) => sum + parseFloat(r.totalServices), 0),
      totalExpenses: monthReports.reduce((sum, r) => sum + parseFloat(r.totalExpenses), 0),
      totalProfit: monthReports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0),
      totalOnlinePayment: monthReports.reduce((sum, r) => sum + parseFloat(r.onlinePayment || '0'), 0),
      reports: monthReports.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    };
  }, [allReports, selectedMonth]);

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setEditDate(report.date);
    setEditServices(report.services as any[]);
    setEditExpenses(report.expenses as any[]);
    setEditOnlinePayment(report.onlinePayment || '0');
  };

  const handlePrintMonthlySummary = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Monthly Summary - ${selectedMonth}</title>
            ${Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
              .map(el => el.outerHTML)
              .join('\n')}
          </head>
          <body>
            ${document.querySelector('.monthly-summary-print')?.outerHTML || ''}
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

  const handleUpdateService = (index: number, field: string, value: string) => {
    const updated = [...editServices];
    updated[index] = { ...updated[index], [field]: value };
    setEditServices(updated);
  };

  const handleUpdateExpense = (index: number, field: string, value: string) => {
    const updated = [...editExpenses];
    updated[index] = { ...updated[index], [field]: value };
    setEditExpenses(updated);
  };

  const handleAddService = () => {
    setEditServices([...editServices, { name: '', amount: 0 }]);
  };

  const handleAddExpense = () => {
    setEditExpenses([...editExpenses, { name: '', amount: 0 }]);
  };

  const handleRemoveService = (index: number) => {
    setEditServices(editServices.filter((_, i) => i !== index));
  };

  const handleRemoveExpense = (index: number) => {
    setEditExpenses(editExpenses.filter((_, i) => i !== index));
  };

  const handleSaveEdit = () => {
    if (!editingReport) return;

    const totalServices = editServices.reduce((sum, s) => sum + parseFloat(s.amount || '0'), 0);
    const totalExpenses = editExpenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);
    const netProfit = totalServices - totalExpenses;

    const updatedReport = {
      date: editDate,
      services: editServices,
      expenses: editExpenses,
      totalServices: totalServices.toString(),
      totalExpenses: totalExpenses.toString(),
      netProfit: netProfit.toString(),
      onlinePayment: editOnlinePayment,
    };

    updateReportMutation.mutate({ id: editingReport.id, report: updatedReport });
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setProfitFilter("all");
    setSearchQuery("");
    setSortBy("date");
    setSortOrder("desc");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/adsc-logo.png" alt="ADSC Logo" className="h-12 w-auto" />
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Aaishree Data Service Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="font-medium">{user?.username}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Change Password
              </Button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filters Section */}
        <Card className="mb-6 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Filter className="h-5 w-5 text-primary" />
                  Filters
                </CardTitle>
                <CardDescription className="mt-1">Filter and sort reports</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters} className="self-start sm:self-auto">
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-sm font-medium">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-sm font-medium">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit-filter" className="text-sm font-medium">Profit/Loss</Label>
                <Select value={profitFilter} onValueChange={(value: any) => setProfitFilter(value)}>
                  <SelectTrigger id="profit-filter" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="profit">Profit Only</SelectItem>
                    <SelectItem value="loss">Loss Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="search" className="text-sm font-medium">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by date, service, expense..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-by" className="text-sm font-medium">Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger id="sort-by" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="profit">Profit</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-order" className="text-sm font-medium">Sort Order</Label>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger id="sort-order" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t text-sm text-muted-foreground flex items-center gap-2">
              <span className="font-medium">Showing {reports.length}</span>
              <span>of</span>
              <span className="font-medium">{allReports.length}</span>
              <span>reports</span>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <Card className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{analytics.totalReports}</div>
              <p className="text-xs text-muted-foreground mt-1">Filtered results</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(analytics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">From filtered reports</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(analytics.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">From filtered reports</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-all hover:scale-[1.02] duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit</CardTitle>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${analytics.totalProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                <TrendingUp className={`h-4 w-4 ${analytics.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${analytics.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(analytics.totalProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: {formatCurrency(analytics.averageProfit)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <Card className="mb-6 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Export Reports</CardTitle>
            <CardDescription>Download filtered reports in various formats</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportToCSV} variant="outline" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
              <Button onClick={exportToJSON} variant="outline" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <Button onClick={exportSummaryReport} variant="outline" className="flex-1 sm:flex-none">
                <Download className="h-4 w-4 mr-2" />
                Export Summary
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <span className="font-medium">{reports.length}</span> reports available for export
            </p>
          </CardContent>
        </Card>

        {/* Filtered Reports List */}
        <Card className="mb-6 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filtered Reports</CardTitle>
            <CardDescription>Reports matching your filter criteria</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {reports.length > 0 ? (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 hover:shadow-sm transition-all gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {new Date(report.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {report.services.length} services • {report.expenses.length} expenses
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto">
                      <div className="text-right">
                        <p className={`font-semibold text-lg ${parseFloat(report.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(parseFloat(report.netProfit))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Revenue: {formatCurrency(parseFloat(report.totalServices))}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditReport(report)}
                        title="Edit Report"
                        className="flex-shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">No reports match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filter criteria</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] duration-200 cursor-pointer group" onClick={() => setLocation("/")}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Create Daily Report</CardTitle>
                  <CardDescription className="mt-1">Generate new daily business report</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Enter services and expenses to create a new daily report for your business.
              </p>
              <Link href="/">
                <Button className="w-full">
                  Go to Report Creation
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] duration-200 cursor-pointer group" onClick={() => setLocation("/history")}>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="h-7 w-7 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Report History</CardTitle>
                  <CardDescription className="mt-1">View and manage past reports</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Access historical reports, view details, print, and delete reports as needed.
              </p>
              <Link href="/history">
                <Button className="w-full" variant="outline">
                  View History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Summary Section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Summary
                </CardTitle>
                <CardDescription>View comprehensive monthly report summary</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="month-select" className="text-sm font-medium whitespace-nowrap">
                    Select Month:
                  </Label>
                  <Input
                    id="month-select"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Button onClick={handlePrintMonthlySummary} variant="outline" size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Summary
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="monthly-summary-print">
              <div className="mb-6 no-print">
                <h3 className="text-lg font-semibold mb-2">
                  Summary for {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
                </h3>
              </div>

              <div className="hidden print:block mb-6">
                <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
                  <img src="/adsc-logo.png" alt="ADSC Logo" className="h-16 w-auto mx-auto mb-2" />
                  <h1 className="text-2xl font-bold">Aaishree Data Service Center</h1>
                  <h2 className="text-xl font-semibold mt-2">
                    Monthly Summary - {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
                  </h2>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg print:bg-gray-100 print:border print:border-gray-800">
                  <p className="text-sm text-muted-foreground print:text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold print:text-black">{monthlySummary.totalReports}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg print:bg-gray-100 print:border print:border-gray-800">
                  <p className="text-sm text-green-600 print:text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600 print:text-black">{formatCurrency(monthlySummary.totalRevenue)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg print:bg-gray-100 print:border print:border-gray-800">
                  <p className="text-sm text-red-600 print:text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 print:text-black">{formatCurrency(monthlySummary.totalExpenses)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg print:bg-gray-100 print:border print:border-gray-800">
                  <p className="text-sm text-blue-600 print:text-gray-600">Net Profit</p>
                  <p className={`text-2xl font-bold print:text-black ${monthlySummary.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(monthlySummary.totalProfit)}
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 bg-green-50 rounded-lg print:bg-gray-100 print:border print:border-gray-800">
                <p className="text-sm text-green-600 print:text-gray-600">Total Online Payment</p>
                <p className="text-2xl font-bold text-green-600 print:text-black">{formatCurrency(monthlySummary.totalOnlinePayment)}</p>
              </div>

              {monthlySummary.reports.length > 0 ? (
                <div className="border rounded-lg overflow-hidden print:border-2 print:border-gray-800">
                  <table className="w-full text-sm">
                    <thead className="bg-muted print:bg-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold print:text-black print:border print:border-gray-800">Date</th>
                        <th className="text-right px-3 py-2 font-semibold print:text-black print:border print:border-gray-800">Revenue</th>
                        <th className="text-right px-3 py-2 font-semibold print:text-black print:border print:border-gray-800">Expenses</th>
                        <th className="text-right px-3 py-2 font-semibold print:text-black print:border print:border-gray-800">Online Payment</th>
                        <th className="text-right px-3 py-2 font-semibold print:text-black print:border print:border-gray-800">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.reports.map((report, index) => (
                        <tr key={report.id} className={index % 2 === 0 ? 'bg-background print:bg-white' : 'bg-muted/30 print:bg-gray-50'}>
                          <td className="px-3 py-2 print:text-black print:border print:border-gray-800">
                            {new Date(report.date).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-3 py-2 text-right print:text-black print:border print:border-gray-800">
                            {formatCurrency(parseFloat(report.totalServices))}
                          </td>
                          <td className="px-3 py-2 text-right print:text-black print:border print:border-gray-800">
                            {formatCurrency(parseFloat(report.totalExpenses))}
                          </td>
                          <td className="px-3 py-2 text-right print:text-black print:border print:border-gray-800">
                            {formatCurrency(parseFloat(report.onlinePayment || '0'))}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium print:border print:border-gray-800 ${parseFloat(report.netProfit) >= 0 ? 'text-green-600 print:text-black' : 'text-red-600 print:text-black'}`}>
                            {formatCurrency(parseFloat(report.netProfit))}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted font-bold print:bg-gray-300">
                        <td className="px-3 py-2 print:text-black print:border print:border-gray-800 font-bold">TOTAL</td>
                        <td className="px-3 py-2 text-right print:text-black print:border print:border-gray-800 font-bold">
                          {formatCurrency(monthlySummary.totalRevenue)}
                        </td>
                        <td className="px-3 py-2 text-right print:text-black print:border print:border-gray-800 font-bold">
                          {formatCurrency(monthlySummary.totalExpenses)}
                        </td>
                        <td className="px-3 py-2 text-right print:text-black print:border print:border-gray-800 font-bold">
                          {formatCurrency(monthlySummary.totalOnlinePayment)}
                        </td>
                        <td className={`px-3 py-2 text-right print:border print:border-gray-800 font-bold ${monthlySummary.totalProfit >= 0 ? 'text-green-600 print:text-black' : 'text-red-600 print:text-black'}`}>
                          {formatCurrency(monthlySummary.totalProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8 print:text-black">No reports found for this month</p>
              )}

              <div className="hidden print:block mt-8 pt-6 border-t border-gray-400">
                <div className="flex justify-end">
                  <div className="text-center">
                    <div className="border-t-2 border-gray-800 w-48 mb-2"></div>
                    <p className="text-sm font-semibold">Authorized Signature</p>
                    <p className="text-xs text-gray-600 mt-1">ADSC</p>
                  </div>
                </div>
              </div>

              <div className="hidden print:block mt-4 text-center text-gray-600 text-sm">
                <p>Generated on {new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
          </DialogHeader>
          {editingReport && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Services</Label>
                  <Button onClick={handleAddService} size="sm" variant="outline">
                    + Add Service
                  </Button>
                </div>
                {editServices.map((service, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Service name"
                        value={service.name}
                        onChange={(e) => handleUpdateService(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={service.amount}
                        onChange={(e) => handleUpdateService(index, 'amount', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveService(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Expenses</Label>
                  <Button onClick={handleAddExpense} size="sm" variant="outline">
                    + Add Expense
                  </Button>
                </div>
                {editExpenses.map((expense, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Expense name"
                        value={expense.name}
                        onChange={(e) => handleUpdateExpense(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={expense.amount}
                        onChange={(e) => handleUpdateExpense(index, 'amount', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExpense(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-online-payment">Online Payment</Label>
                <Input
                  id="edit-online-payment"
                  type="number"
                  value={editOnlinePayment}
                  onChange={(e) => setEditOnlinePayment(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="pt-4 flex gap-2 justify-end border-t">
                <Button variant="outline" onClick={() => setEditingReport(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateReportMutation.isPending}>
                  {updateReportMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}