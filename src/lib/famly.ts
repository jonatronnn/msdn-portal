import "server-only";
import type { FamlyEmployee, toFamly } from "@/lib/famly-mapping";

// Famly's public GraphQL API (https://docs.famly.co). The token is created in
// Famly under Settings → Integrations → Manage API Tokens and needs permission
// to read and update employees, and to see sensitive staff information
// (needed for gender).

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
  phoneNumber { value formatted } address { street zip city } firstDay lastDay groupId siteId gender
  qualificationTypeAssignments { qualificationTypeId validFrom validTo qualificationType { name } }`;

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

export async function getFamlyEmployee(employeeId: string) {
  const data = await famly<{ employees: { list: { employees: FamlyEmployee[] } } }>(
    `query GetEmployee($ids: [EmployeeId!]) {
      employees { list(employeeIds: $ids, includeFuture: true, includePast: true) { employees { ${EMPLOYEE_FIELDS} } } }
    }`,
    { ids: [employeeId] },
  );
  return data.employees.list.employees[0] ?? null;
}

// Famly only lists rooms for given sites, so the token's sites are looked up first.
export async function listFamlyRooms() {
  const sites = await famly<{ sites: { list: { result: { siteId: string }[] } } }>(`query Sites { sites { list { result { siteId } } } }`);
  const siteIds = sites.sites.list.result.map((s) => s.siteId);
  if (!siteIds.length) return [];
  const data = await famly<{ groups: { list: { id: string; title: string; institutionId: string }[] } }>(
    `query ListRooms($siteIds: [InstitutionId!]) { groups { list(institutionIds: $siteIds) { id title institutionId } } }`,
    { siteIds },
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
          gender: details.gender,
        },
      ],
    },
  );
  return data.employees.create[0].id;
}

// Sends each detail with Famly's single-field updates, skipping blanks, so
// nothing the portal doesn't hold (app role, holiday allowance) is touched.
// Gender has no single-field update, so it goes last as a full update built
// from their current Famly record.
export async function updateFamlyEmployee(employeeId: string, details: FamlyDetails, roomId: string | null) {
  const one = <K extends string>(key: K, value: unknown) => (value ? [{ employeeId, [key]: value }] : null);
  await famly(
    `mutation UpdateEmployee(
      $names: [EmployeeUpdateName!], $emails: [EmployeeUpdateEmail!], $titles: [EmployeeUpdateTitle!],
      $birthDates: [EmployeeUpdateBirthDate!], $phones: [EmployeeUpdatePhone!], $addresses: [EmployeeUpdateAddress!],
      $days: [EmployeeUpdateRangeOpen!], $groups: [EmployeeUpdateGroupId!]
    ) {
      employees {
        update(names: $names, emails: $emails, titles: $titles, birthDates: $birthDates, phones: $phones,
          addresses: $addresses, firstAndOptionalLastDays: $days, groups: $groups) { id }
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
      groups: one("groupId", roomId),
    },
  );
  if (details.gender) await setFamlyGender(employeeId, details);
}

type FullEmployee = {
  name: { fullName: string };
  groupId: string;
  email: string | null;
  title: string | null;
  birthDate: string | null;
  gender: string | null;
  phoneNumber: { value: string } | null;
  address: { street: string; zip: string; city: string; state: string | null; country: string | null } | null;
  firstDay: string;
  lastDay: string | null;
  roleId: string | null;
  customEmployeeId: string | null;
  employeeWorkDayHours: number | null;
  employeeWorkDayMin: number | null;
  holidayAllowance: number | null;
};

async function setFamlyGender(employeeId: string, details: FamlyDetails) {
  const data = await famly<{ employees: { list: { employees: FullEmployee[] } } }>(
    `query FullEmployee($ids: [EmployeeId!]) {
      employees { list(employeeIds: $ids, includeFuture: true, includePast: true) { employees {
        name { fullName } groupId email title birthDate gender phoneNumber { value }
        address { street zip city state country } firstDay lastDay roleId customEmployeeId
        employeeWorkDayHours employeeWorkDayMin holidayAllowance
      } } }
    }`,
    { ids: [employeeId] },
  );
  const e = data.employees.list.employees[0];
  if (!e || e.gender === details.gender) return;
  // A full update replaces every field, so everything Famly holds is sent back
  // as it is, with the portal's details filling any Famly hides from the token.
  await famly(
    `mutation SetGender($employees: [EmployeeUpdate!]) { employees { update(employees: $employees) { id } } }`,
    {
      employees: [
        {
          employeeId,
          name: e.name.fullName,
          groupId: e.groupId,
          email: e.email ?? details.email,
          title: e.title ?? details.title,
          birthDate: e.birthDate ?? details.birthDate,
          phoneNumber: e.phoneNumber?.value ?? details.phoneNumber,
          address: e.address ?? details.address,
          firstDay: e.firstDay,
          lastDay: e.lastDay,
          roleId: e.roleId,
          customEmployeeId: e.customEmployeeId,
          employeeWorkDayHours: e.employeeWorkDayHours,
          employeeWorkDayMin: e.employeeWorkDayMin,
          holidayAllowance: e.holidayAllowance,
          gender: details.gender,
        },
      ],
    },
  );
}

// The qualification types (e.g. "Level 3") a site has set up in Famly.
export async function listFamlyQualificationTypes(siteId: string) {
  const data = await famly<{ qualificationTypes: { list: { qualificationTypeId: string; name: string }[] } }>(
    `query QualificationTypes($siteSetId: SiteSetId!) { qualificationTypes { list(siteSetId: $siteSetId) { qualificationTypeId name } } }`,
    { siteSetId: siteId },
  );
  return data.qualificationTypes.list;
}

// Gives them a qualification type from a date. Famly shortens or replaces any
// assignment it overlaps, so the latest one sent wins.
export async function assignFamlyQualification(employeeId: string, qualificationTypeId: string, validFrom: string) {
  await famly(
    `mutation AssignQualification($input: QualificationTypeAssignmentCreatePublicInput!) {
      qualificationTypeAssignments { create(input: $input) { qualificationTypeAssignmentId } }
    }`,
    { input: { employeeId, qualificationTypeId, validFrom } },
  );
}
