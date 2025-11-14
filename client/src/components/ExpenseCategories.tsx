import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Tag } from "lucide-react";
import type { Report } from "@shared/schema";

interface ExpenseCategoriesProps {
  reports: Report[];
}

const CATEGORIES = {
  'Rent': ['rent', 'lease'],
  'Utilities': ['electricity', 'water', 'internet', 'phone', 'bill'],
  'Salaries': ['salary', 'wages', 'payment', 'staff'],
  'Supplies': ['supplies', 'materials', 'inventory', 'stock'],
  'Maintenance': ['maintenance', 'repair', 'fix'],
  'Transport': ['transport', 'fuel', 'vehicle', 'petrol'],
  'Other': []
};

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#6366f1'];

export default function ExpenseCategories({ reports }: ExpenseCategoriesProps) {
  const categorizedData = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    
    Object.keys(CATEGORIES).forEach(cat => {
      categoryTotals[cat] = 0;
    });

    reports.forEach(report => {
      report.expenses.forEach(expense => {
        const expenseName = expense.name.toLowerCase();
        let categorized = false;

        for (const [category, keywords] of Object.entries(CATEGORIES)) {
          if (keywords.length === 0) continue;
          
          if (keywords.some(keyword => expenseName.includes(keyword))) {
            categoryTotals[category] += expense.amount;
            categorized = true;
            break;
          }
        }

        if (!categorized) {
          categoryTotals['Other'] += expense.amount;
        }
      });
    });

    return Object.entries(categoryTotals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [reports]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalExpenses = categorizedData.reduce((sum, cat) => sum + cat.value, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Tag className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Expense Categories</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {categorizedData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>No expense data available</p>
          </div>
        ) : (
          <div className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categorizedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categorizedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {categorizedData.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(category.value)}</div>
                    <div className="text-xs text-muted-foreground">
                      {((category.value / totalExpenses) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Expenses</span>
                <span className="text-lg font-bold">{formatCurrency(totalExpenses)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
