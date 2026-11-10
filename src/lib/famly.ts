import "server-only";
import type { FamlyEmployee, toFamly } from "@/lib/famly-mapping";

// Famly's public GraphQL API (https://docs.famly.co). The token is created in
// Famly under Settings → Integrations → Manage API Tokens and needs permission
// to read and update employees.

export function famlyConnected() {
  return Boolean(process.env.FAMLY_API_TOKEN);
}

async function famly<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(process.env.FAMLY_API_URL ?? "https://famlyapi.famly.co/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Famly-Accesstoken": process.env.FAMLY_API_TOKEN ?? "" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length || !body?.data) {
    console.error("Famly API error", res.status, JSON.stringify(body?.errors ?? body));
    throw new Error("Famly didn't accept the request.");
  }
  return body.data as T;
}

const EMPLOYEE_FIELDS = `id name { firstName middleName lastName } email title birthDate
  phoneNumber { value formatted } address { street zip city } firstDay lastDay groupId`;

// Current and future employees (not leavers), following Famly's paging.
export async function listFamlyEmployees() {
  const employees: FamlyEmployee[] = [];
  let next: string | null = null;
  do {
    const data: { employees: { list: { employees: FamlyEmployee[]; next: string | null } } } = await famly(
      `query ListEmployees($next: EmployeeCursor) {
        employees { list(includeFuture: true, next: $next) { employees { ${EMPLOYEE_FIELDS} } next } }
      }`,
      { next },
    );
    employees.push(...data.employees.list.employees);
    next = data.employees.list.next;
  } while (next);
  return employees;
}

export async function listFamlyRooms() {
  const data = await famly<{ groups: { list: { id: string; title: string; institutionId: string }[] } }>(
    `query ListRooms { groups { list { id title institutionId } } }`,
  );
  return data.groups.list;
}

type FamlyDetails = ReturnType<typeof toFamly>;

export async function createFamlyEmployee(details: FamlyDetails, room: { id: string; institutionId: string }) {
  const data = await famly<{ employees: { create: { id: string }[] } }>(
    `mutation CreateEmployee($employees: [EmployeeInput!]!) { employees { create(employees: $employees) { id } } }`,
    {
      employees: [
        {
          name: details.name,
          institutionId: room.institutionId,
          groupId: room.id,
          email: details.email,
          title: details.title,
          birthDate: details.birthDate,
          phoneNumber: details.phoneNumber,
          address: details.address,
          firstDay: details.firstDay,
          lastDay: details.lastDay,
        },
      ],
    },
  );
  return data.employees.create[0].id;
}

// Sends each detail with Famly's single-field updates, skipping blanks, so
// nothing the portal doesn't hold (app role, holiday allowance) is touched.
export async function updateFamlyEmployee(employeeId: string, details: FamlyDetails) {
  const one = <K extends string>(key: K, value: unknown) => (value ? [{ employeeId, [key]: value }] : null);
  await famly(
    `mutation UpdateEmployee(
      $names: [EmployeeUpdateName!], $emails: [EmployeeUpdateEmail!], $titles: [EmployeeUpdateTitle!],
      $birthDates: [EmployeeUpdateBirthDate!], $phones: [EmployeeUpdatePhone!], $addresses: [EmployeeUpdateAddress!],
      $days: [EmployeeUpdateRangeOpen!]
    ) {
      employees {
        update(names: $names, emails: $emails, titles: $titles, birthDates: $birthDates, phones: $phones,
          addresses: $addresses, firstAndOptionalLastDays: $days) { id }
      }
    }`,
    {
      names: one("name", details.name),
      emails: one("email", details.email),
      titles: one("title", details.title),
      birthDates: one("birthDate", details.birthDate),
      phones: one("phone", details.phoneNumber),
      addresses: one("address", details.address),
      days: details.firstDay ? [{ employeeId, rangeOpen: { from: details.firstDay, to: details.lastDay } }] : null,
    },
  );
}
