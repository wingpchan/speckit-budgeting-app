interface BudgetStateIndicatorProps {
  state: 'over' | 'under' | 'exact';
  actual: number;
  budget: number;
}

function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function BudgetStateIndicator({ state, actual, budget }: BudgetStateIndicatorProps) {
  if (state === 'over') {
    const excess = actual - budget;
    return (
      <span className="text-red-600 font-medium text-sm">
        ↑ {formatPence(excess)} over
      </span>
    );
  }

  if (state === 'under') {
    const remaining = budget - actual;
    return (
      <span className="text-green-600 font-medium text-sm">
        ↓ {formatPence(remaining)} remaining
      </span>
    );
  }

  // exact
  return (
    <span className="text-gray-400 font-medium text-sm">
      On budget
    </span>
  );
}
