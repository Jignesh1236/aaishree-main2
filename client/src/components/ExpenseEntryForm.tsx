import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, CreditCard } from "lucide-react";
import type { ExpenseItem } from "@shared/schema";

interface ExpenseEntryFormProps {
  expenses: ExpenseItem[];
  onExpensesChange: (expenses: ExpenseItem[]) => void;
}

export default function ExpenseEntryForm({ expenses, onExpensesChange }: ExpenseEntryFormProps) {
  const addExpense = () => {
    const newExpense: ExpenseItem = {
      id: crypto.randomUUID(),
      name: "",
      amount: 0,
    };
    onExpensesChange([...expenses, newExpense]);
  };

  const removeExpense = (id: string) => {
    onExpensesChange(expenses.filter(e => e.id !== id));
  };

  const updateExpense = (id: string, field: keyof ExpenseItem, value: string | number) => {
    onExpensesChange(
      expenses.map(e => e.id === id ? { ...e, [field]: value } : e)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-destructive" />
          </div>
          <Label className="text-lg font-semibold">Expenses</Label>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addExpense}
          className="gap-2"
          data-testid="button-add-expense"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="text-center py-8 px-4 border-2 border-dashed rounded-lg bg-muted/20">
            <p className="text-sm text-muted-foreground">
              No expenses added yet. Click "Add Expense" to start.
            </p>
          </div>
        ) : (
          expenses.map((expense, index) => (
            <div key={expense.id} className="flex gap-3 items-start p-4 rounded-lg border bg-card/50 hover-elevate">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor={`expense-name-${expense.id}`} className="text-sm font-medium">
                    Expense Name
                  </Label>
                  <Input
                    id={`expense-name-${expense.id}`}
                    type="text"
                    placeholder="e.g., Rent"
                    value={expense.name}
                    onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                    className="h-10"
                    data-testid={`input-expense-name-${index}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`expense-amount-${expense.id}`} className="text-sm font-medium">
                    Amount (₹)
                  </Label>
                  <Input
                    id={`expense-amount-${expense.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={expense.amount || ''}
                    onChange={(e) => updateExpense(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-10"
                    data-testid={`input-expense-amount-${index}`}
                  />
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeExpense(expense.id)}
                className="mt-8 hover:bg-destructive/10 hover:text-destructive"
                data-testid={`button-remove-expense-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
