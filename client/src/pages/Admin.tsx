
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, FileText, History, User, Download, TrendingUp, DollarSign, Calendar, Filter } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Report } from "@shared/schema";
import { useState, useMemo } from "react";

export default function Admin() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  
  // Filter states
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [profitFilter, setProfitFilter] = useState<"all" | "profit" | "loss">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "profit" | "revenue">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: allReports = [] } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation("/");
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

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setProfitFilter("all");
    setSearchQuery("");
    setSortBy("date");
    setSortOrder("desc");
  };

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
        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
                <CardDescription>Filter and sort reports</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">Date From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="date-to">Date To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit-filter">Profit/Loss</Label>
                <Select value={profitFilter} onValueChange={(value: any) => setProfitFilter(value)}>
                  <SelectTrigger id="profit-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reports</SelectItem>
                    <SelectItem value="profit">Profit Only</SelectItem>
                    <SelectItem value="loss">Loss Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by date, service, expense..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-by">Sort By</Label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger id="sort-by">
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
                <Label htmlFor="sort-order">Sort Order</Label>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger id="sort-order">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {reports.length} of {allReports.length} reports
            </div>
          </CardContent>
        </Card>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalReports}</div>
              <p className="text-xs text-muted-foreground">Filtered results</p>
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
              <p className="text-xs text-muted-foreground">From filtered reports</p>
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
              <p className="text-xs text-muted-foreground">From filtered reports</p>
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
            <CardDescription>Download filtered reports in various formats</CardDescription>
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

        {/* Filtered Reports List */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtered Reports</CardTitle>
            <CardDescription>Reports matching your filter criteria</CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
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
              <p className="text-center text-muted-foreground py-8">No reports match your filters</p>
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
      </div>
    </div>
  );
}
