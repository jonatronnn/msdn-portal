import { describe, expect, it } from "vitest";
import { fromFamly, toFamly, toInternationalPhone, type FamlyEmployee } from "@/lib/famly-mapping";

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
};

describe("fromFamly", () => {
  it("maps a Famly employee to a staff record", () => {
    expect(fromFamly(famly)).toEqual({
      first_name: "Ada",
      last_name: "May Lovelace",
      email: "ada@example.com",
      job_title: "Room leader",
      date_of_birth: "1990-12-10",
      mobile_phone: "07700 900123",
      address_line1: "1 Montagu Square",
      town: "London",
      postcode: "W1H 2LB",
      start_date: "2020-01-06",
      leave_date: null,
      famly_id: "f-1",
      famly_group_id: "g-1",
    });
  });

  it("copes with missing details", () => {
    const sparse = fromFamly({ ...famly, name: { firstName: "Bo", middleName: null, lastName: null }, email: null, phoneNumber: null, address: null, title: "" });
    expect(sparse).toMatchObject({ last_name: "", email: "", mobile_phone: null, address_line1: null, job_title: null });
  });
});

describe("toFamly", () => {
  const portal = {
    first_name: "Sam",
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
    });
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
