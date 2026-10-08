import Link from "next/link";
import { Card, Empty, PageHeader, Table, Td } from "@/components/ui";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { fullName } from "@/lib/staff";
import { MAX_FILE_MB } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { deletePayslip } from "./actions";
import { PayslipUpload } from "./upload";

export default async function PayslipsPage() {
  const session = await requireSession();
  const supabase = await createClient();

  if (session.role !== "admin") {
    const { data: payslips } = session.employeeId
      ? await supabase
          .from("payslips")
          .select("id, pay_date")
          .eq("employee_id", session.employeeId)
          .order("pay_date", { ascending: false })
      : { data: [] };
    return (
      <>
        <PageHeader title="My payslips" />
        <Card>
          {payslips?.length ? (
            <ul className="divide-y divide-stone-100 text-sm">
              {payslips.map((p) => (
                <li key={p.id} className="py-2">
                  <a href={`/files/payslips/${p.id}`} target="_blank" className="text-teal-800 hover:underline">
                    Payslip — {formatDate(p.pay_date)}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No payslips yet.</Empty>
          )}
        </Card>
      </>
    );
  }

  const { data: recent } = await supabase
    .from("payslips")
    .select("id, pay_date, file_name, employee_id, employees(first_name, last_name)")
    .order("uploaded_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader title="Payslips" />
      <Card title="Upload payslips">
        <p className="mb-4 text-sm text-stone-600">
          Export the payslip PDFs from QuickBooks payroll, then upload the whole batch here. Each one is matched to an
          employee by the payroll ID in its file name, and only that employee (and admins) can open it.
        </p>
        <PayslipUpload maxFileMb={MAX_FILE_MB} />
      </Card>
      <Card title="Recently uploaded">
        {recent?.length ? (
          <Table head={["Employee", "Pay date", "File", ""]}>
            {recent.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/staff/${p.employee_id}`} className="text-teal-800 hover:underline">
                    {p.employees && fullName(p.employees)}
                  </Link>
                </Td>
                <Td>{formatDate(p.pay_date)}</Td>
                <Td>
                  <a href={`/files/payslips/${p.id}`} target="_blank" className="hover:underline">
                    {p.file_name}
                  </a>
                </Td>
                <Td>
                  <form action={deletePayslip.bind(null, p.id)}>
                    <button className="text-sm text-red-700 hover:underline">Delete</button>
                  </form>
                </Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No payslips uploaded yet.</Empty>
        )}
      </Card>
    </>
  );
}
