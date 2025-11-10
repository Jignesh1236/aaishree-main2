import { useState } from 'react';
import ExpenseEntryForm from '../ExpenseEntryForm';
import type { ExpenseItem } from '@shared/schema';

export default function ExpenseEntryFormExample() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: '1', name: 'Rent', amount: 5000 },
    { id: '2', name: 'Electricity', amount: 800 },
  ]);

  return <ExpenseEntryForm expenses={expenses} onExpensesChange={setExpenses} />;
}
