import { describe, expect, it } from "vitest";
import { changesFromFamly, currentQualification, fromFamly, toFamly, toFamlyGender, toInternationalPhone, type FamlyEmployee } from "@/lib/famly-mapping";
import { formatDateNumeric } from "@/lib/dates";

const today = "2026-11-27";
const level = (name: string, validFrom: string, validTo: string | null = null) => ({
  qualificationTypeId: `q-${name}`,
  validFrom,
  validTo,
  qualificationType: { name },
});

const famly: FamlyEmployee = {
  id: "f-1",
  name: { firstName: "Ada", middleName: "May", lastName: "Lovelace" },
  email: "Ada@Example.com",
  title: "Room leader",
  birthDate: "1990-12-10",
  phoneNumber: { value: "+447700900123", formatted: "07700 900123" },
  address: { street: "1 Montagu Square", zip: "w1h 2lb", city: "London" },
  firstDay: "2020-01-06",
  lastDay: null,
  groupId: "g-1",
  siteId: "s-1",
  gender: "DIVERSE",
  qualificationTypeAssignments: [level("Level 2", "2018-01-01", "2021-05-31"), level("level 3", "2021-06-01")],
};

describe("fromFamly", () => {
  it("maps a Famly employee to a staff record", () => {
    expect(fromFamly(famly, today)).toEqual({
      first_name: "Ada",
      middle_name: "May",
      last_name: "Lovelace",
      email: "ada@example.com",
      job_title: "Room leader",
      date_of_birth: "1990-12-10",
      mobile_phone: "07700 900123",
      address_line1: "1 Montagu Square",
      town: "London",
      postcode: "W1H 2LB",
      start_date: "2020-01-06",
      leave_date: null,
      gender: "Non-binary",
      qualification_level: "Level 3",
      qualification_date: "2021-06-01",
      famly_id: "f-1",
      famly_group_id: "g-1",
    });
  });

  it("copes with missing details", () => {
    const sparse = fromFamly(
      { ...famly, name: { firstName: "Bo", middleName: null, lastName: null }, email: null, phoneNumber: null, address: null, title: "", gender: null, qualificationTypeAssignments: [] },
      today,
    );
    expect(sparse).toMatchObject({ middle_name: null, last_name: "", email: "", mobile_phone: null, address_line1: null, job_title: null, gender: null, qualification_level: null });
  });

  it("skips Famly qualification types that aren't portal levels", () => {
    expect(fromFamly({ ...famly, qualificationTypeAssignments: [level("Apprentice", "2025-01-01")] }, today)).toMatchObject({
      qualification_level: null,
      qualification_date: null,
    });
  });
});

describe("changesFromFamly", () => {
  it("leaves out blanks so they don't wipe the portal", () => {
    const changes = changesFromFamly({ ...famly, email: null, gender: null, phoneNumber: null }, today);
    expect(changes).not.toHaveProperty("email");
    expect(changes).not.toHaveProperty("gender");
    expect(changes).not.toHaveProperty("mobile_phone");
    expect(changes).not.toHaveProperty("famly_id");
    expect(changes).toMatchObject({ first_name: "Ada", famly_group_id: "g-1" });
  });
});

describe("currentQualification", () => {
  const assignments = [level("Level 2", "2018-01-01", "2021-05-31"), level("Level 3", "2027-01-01")];
  it("picks the one covering today", () => {
    expect(currentQualification(assignments, "2020-03-01")?.qualificationType.name).toBe("Level 2");
  });
  it("falls back to the latest", () => {
    expect(currentQualification(assignments, today)?.qualificationType.name).toBe("Level 3");
    expect(currentQualification([], today)).toBeNull();
  });
});

describe("toFamly", () => {
  const portal = {
    first_name: "Sam",
    middle_name: null as string | null,
    last_name: "Starter",
    email: "sam@example.com",
    job_title: "Nursery practitioner",
    date_of_birth: "1998-04-02",
    mobile_phone: "07700 900123",
    address_line1: "Flat 2",
    address_line2: "1 Montagu Square",
    town: "London",
    postcode: "W1H 2LB",
    start_date: "2026-11-24",
    leave_date: null,
    gender: "Female" as string | null,
  };

  it("builds the Famly details", () => {
    expect(toFamly(portal)).toEqual({
      name: "Sam Starter",
      email: "sam@example.com",
      title: "Nursery practitioner",
      birthDate: "1998-04-02",
      phoneNumber: "+447700900123",
      address: { street: "Flat 2, 1 Montagu Square", zip: "W1H 2LB", city: "London" },
      firstDay: "2026-11-24",
      lastDay: null,
      gender: "FEMALE",
    });
  });

  it("joins a middle name into the full name", () => {
    expect(toFamly({ ...portal, middle_name: "Jo" }).name).toBe("Sam Jo Starter");
  });

  it("leaves out an incomplete address", () => {
    expect(toFamly({ ...portal, postcode: null }).address).toBeNull();
  });
});

describe("toInternationalPhone", () => {
  it("converts UK numbers", () => {
    expect(toInternationalPhone("07700 900123")).toBe("+447700900123");
    expect(toInternationalPhone("020 7946 0000")).toBe("+442079460000");
    expect(toInternationalPhone("+44 7700 900123")).toBe("+447700900123");
    expect(toInternationalPhone("447700900123")).toBe("+447700900123");
  });

  it("leaves anything else as typed", () => {
    expect(toInternationalPhone("ext 42")).toBe("ext 42");
  });
});

describe("toFamlyGender", () => {
  it("maps portal genders to Famly's", () => {
    expect(toFamlyGender("Male")).toBe("MALE");
    expect(toFamlyGender("Non-binary")).toBe("DIVERSE");
    expect(toFamlyGender(null)).toBeNull();
  });
});

describe("formatDateNumeric", () => {
  it("shows DD/MM/YYYY", () => {
    expect(formatDateNumeric("1990-03-05")).toBe("05/03/1990");
    expect(formatDateNumeric(null)).toBe("");
  });
});
