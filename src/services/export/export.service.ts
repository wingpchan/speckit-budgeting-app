import type { TransactionRecord, BudgetRecord } from '../../models/index';
import { formatPence } from '../../utils/pence';

function quoteField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(quoteField).join(',');
}

export function buildExportCsv(
  transactions: TransactionRecord[],
  budgetRecords: BudgetRecord[],
  options: { personBreakdown: boolean },
): string {
  const lines: string[] = [];

  // Section 1: Transactions
  lines.push(csvRow(['Date', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Person']));
  for (const tx of transactions) {
    lines.push(csvRow([
      tx.date,
      tx.description,
      formatPence(tx.amount),
      tx.transactionType,
      tx.category,
      tx.account,
      tx.personName,
    ]));
  }

  // Blank separator
  lines.push('');

  // Section 2: Budget Summary — latest record per category, sorted alphabetically
  lines.push(csvRow(['Category', 'Budget Amount', 'Effective Date', 'Reason']));

  const latestBudgetPerCategory = new Map<string, BudgetRecord>();
  for (const budget of budgetRecords) {
    const existing = latestBudgetPerCategory.get(budget.category);
    if (!existing || budget.setDate >= existing.setDate) {
      latestBudgetPerCategory.set(budget.category, budget);
    }
  }

  for (const [category, budget] of Array.from(latestBudgetPerCategory.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    lines.push(csvRow([category, formatPence(budget.amount), budget.setDate, budget.reason ?? '']));
  }

  // Section 3: Person Breakdown (optional)
  if (options.personBreakdown) {
    lines.push('');
    lines.push(csvRow(['Person', 'Category', 'Total Spend']));

    const personCategoryMap = new Map<string, Map<string, number>>();
    for (const tx of transactions) {
      if (!personCategoryMap.has(tx.personName)) {
        personCategoryMap.set(tx.personName, new Map());
      }
      const catMap = personCategoryMap.get(tx.personName)!;
      catMap.set(tx.category, (catMap.get(tx.category) ?? 0) + tx.amount);
    }

    for (const [person, catMap] of Array.from(personCategoryMap.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      for (const [category, total] of Array.from(catMap.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        lines.push(csvRow([person, category, formatPence(total)]));
      }
    }
  }

  return lines.join('\r\n') + '\r\n';
}
