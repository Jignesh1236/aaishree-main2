import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { Report } from "@shared/schema";

interface AnalyticsChartsProps {
  reports: Report[];
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function AnalyticsCharts({ reports }: AnalyticsChartsProps) {
  const chartData = useMemo(() => {
    const sorted = [...reports].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sorted.map(report => ({
      date: new Date(report.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      revenue: parseFloat(report.totalServices as string),
      expenses: parseFloat(report.totalExpenses as string),
      profit: parseFloat(report.netProfit as string),
    }));
  }, [reports]);

  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { revenue: number; expenses: number; profit: number; count: number }>();

    reports.forEach(report => {
      const monthKey = new Date(report.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
      const existing = monthlyMap.get(monthKey) || { revenue: 0, expenses: 0, profit: 0, count: 0 };

      monthlyMap.set(monthKey, {
        revenue: existing.revenue + parseFloat(report.totalServices as string),
        expenses: existing.expenses + parseFloat(report.totalExpenses as string),
        profit: existing.profit + parseFloat(report.netProfit as string),
        count: existing.count + 1,
      });
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.profit,
        avgProfit: data.profit / data.count,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  }, [reports]);

  const expensesBreakdown = useMemo(() => {
    const expenseMap = new Map<string, number>();

    reports.forEach(report => {
      (report.expenses as any[]).forEach(expense => {
        const current = expenseMap.get(expense.name) || 0;
        expenseMap.set(expense.name, current + parseFloat(expense.amount.toString()));
      });
    });

    return Array.from(expenseMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [reports]);

  const servicesBreakdown = useMemo(() => {
    const serviceMap = new Map<string, number>();

    reports.forEach(report => {
      (report.services as any[]).forEach(service => {
        const current = serviceMap.get(service.name) || 0;
        serviceMap.set(service.name, current + parseFloat(service.amount.toString()));
      });
    });

    return Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [reports]);

  const profitMargin = useMemo(() => {
    const totalRevenue = reports.reduce((sum, r) => sum + parseFloat(r.totalServices as string), 0);
    const totalProfit = reports.reduce((sum, r) => sum + parseFloat(r.netProfit as string), 0);
    return totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : '0';
  }, [reports]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No data available for charts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses Trend</CardTitle>
            <CardDescription>Daily performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <CardDescription>Net profit over time (Margin: {profitMargin}%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                profit: { label: "Profit", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
            <CardDescription>Monthly revenue, expenses and profit</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
                expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
                profit: { label: "Profit", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="#10b981" />
                <Bar dataKey="expenses" fill="#ef4444" />
                <Bar dataKey="profit" fill="#3b82f6" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Expenses by Category</CardTitle>
            <CardDescription>Expense breakdown by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "Amount", color: "hsl(var(--chart-4))" },
              }}
              className="h-[300px]"
            >
              <PieChart>
                <Pie
                  data={expensesBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
            <CardDescription>Revenue breakdown by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "Amount", color: "hsl(var(--chart-5))" },
              }}
              className="h-[300px]"
            >
              <BarChart data={servicesBreakdown} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis dataKey="name" type="category" width={120} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services vs Expenses Distribution</CardTitle>
            <CardDescription>Overall revenue and expense distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                services: { label: "Services", color: "hsl(var(--chart-1))" },
                expenses: { label: "Expenses", color: "hsl(var(--chart-2))" },
              }}
              className="h-[300px]"
            >
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Total Services",
                      value: reports.reduce((sum, r) => sum + parseFloat(r.totalServices as string), 0),
                    },
                    {
                      name: "Total Expenses",
                      value: reports.reduce((sum, r) => sum + parseFloat(r.totalExpenses as string), 0),
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
