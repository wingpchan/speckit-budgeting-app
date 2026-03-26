interface BudgetHealthBarProps {
  totalActual: number;
  totalBudget: number;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function BudgetHealthBar({ totalActual, totalBudget }: BudgetHealthBarProps) {
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalActual / totalBudget) * 100)) : 0;
  const isOver = totalActual > totalBudget;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Overall spend</span>
        <span>
          Actual: {formatPence(totalActual)} / Budget: {formatPence(totalBudget)}{' '}
          <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-500'}>
            ({pct}% used)
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
