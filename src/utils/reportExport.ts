/**
 * Shared Blob-download CSV export for the Reports tab — same pattern as
 * exportExpensesCSV/exportExpensesJSON in src/services/storage.ts, just
 * generalized to arbitrary headers/rows since each report shapes its own
 * columns.
 */
export function exportReportCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (cell: string | number) => {
    if (typeof cell === 'number') return cell.toString();
    return `"${cell.replace(/"/g, '""')}"`;
  };

  const csvContent = [headers.join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
