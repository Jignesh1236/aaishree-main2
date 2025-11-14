import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import type { Report } from "@shared/schema";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface EnhancedAnalyticsProps {
  reports: Report[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function EnhancedAnalytics({ reports }: EnhancedAnalyticsProps) {
  const analytics = useMemo(() => {
    const sorted = [...reports].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const last30Days = sorted.slice(-30);
    const last7Days = sorted.slice(-7);

    const totalRevenue = reports.reduce((sum, r) => sum + parseFloat(r.totalServices), 0);
    const totalExpenses = reports.reduce((sum, r) => sum + parseFloat(r.totalExpenses), 0);
    const totalProfit = reports.reduce((sum, r) => sum + parseFloat(r.netProfit), 0);
    const averageProfit = reports.length > 0 ? totalProfit / reports.length : 0;

    const profitableDays = reports.filter(r => parseFloat(r.netProfit) >= 0).length;
    const lossDays = reports.filter(r => parseFloat(r.netProfit) < 0).length;

    const trendData = last30Days.map(r => ({
      date: new Date(r.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      revenue: parseFloat(r.totalServices),
      expenses: parseFloat(r.totalExpenses),
      profit: parseFloat(r.netProfit),
    }));

    const expenseBreakdown: { [key: string]: number } = {};
    reports.forEach(report => {
      report.expenses.forEach(expense => {
        expenseBreakdown[expense.name] = (expenseBreakdown[expense.name] || 0) + expense.amount;
      });
    });

    const topExpenses = Object.entries(expenseBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const serviceBreakdown: { [key: string]: number } = {};
    reports.forEach(report => {
      report.services.forEach(service => {
        serviceBreakdown[service.name] = (serviceBreakdown[service.name] || 0) + service.amount;
      });
    });

    const topServices = Object.entries(serviceBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const weeklyData = last7Days.map(r => ({
      day: new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short' }),
      profit: parseFloat(r.netProfit),
    }));

    return {
      totalRevenue,
      totalExpenses,
      totalProfit,
      averageProfit,
      profitableDays,
      lossDays,
      trendData,
      topExpenses,
      topServices,
      weeklyData,
    };
  }, [reports]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No data available for analytics</p>
          <p className="text-sm text-muted-foreground mt-2">Create some reports to see insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {reports.length} reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Operating costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Profit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${analytics.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(analytics.totalProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Average Profit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.averageProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.profitableDays} profitable, {analytics.lossDays} loss
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Expenses Trend</CardTitle>
            <CardDescription>Last 30 days performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stackId="1" 
                  stroke="#4f46e5" 
                  fill="#4f46e5" 
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <CardDescription>Daily profit over last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Expenses</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.topExpenses}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.topExpenses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>Revenue by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topServices}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#4f46e5">
                  {analytics.topServices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Profit Analysis</CardTitle>
          <CardDescription>Last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="profit" fill="#10b981">
                {analytics.weeklyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
