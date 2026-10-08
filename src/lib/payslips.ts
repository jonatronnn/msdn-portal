// Finds the employee a payslip PDF belongs to from its file name, which must
// contain the employee's payroll ID as a separate word, e.g.
// "Payslip_P0042_2026-09.pdf" or "P0042 September.pdf". Returns null unless
// exactly one employee matches.
export function matchPayrollId<T extends { payroll_id: string | null }>(fileName: string, employees: T[]) {
  const name = fileName.toLowerCase().replace(/\.pdf$/, "");
  const matches = employees.filter((e) => {
    const id = e.payroll_id?.trim().toLowerCase();
    if (!id) return false;
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(name);
  });
  return matches.length === 1 ? matches[0] : null;
}
