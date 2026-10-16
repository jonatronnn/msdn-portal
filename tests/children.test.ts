import { describe, expect, it } from "vitest";
import { checklistProgress } from "@/lib/children";

describe("checklistProgress", () => {
  it("counts ticked steps and picks the first unticked one in order", () => {
    const progress = checklistProgress([
      { title: "Deposit received", sort_order: 3, completed_at: null },
      { title: "Tour booked", sort_order: 1, completed_at: "2026-10-01T09:00:00Z" },
      { title: "Registration form received", sort_order: 2, completed_at: null },
    ]);
    expect(progress.done).toBe(1);
    expect(progress.total).toBe(3);
    expect(progress.next?.title).toBe("Registration form received");
  });

  it("has no next step when everything is ticked", () => {
    expect(checklistProgress([{ title: "Tour booked", sort_order: 1, completed_at: "2026-10-01T09:00:00Z" }])).toEqual({
      done: 1,
      total: 1,
      next: null,
    });
  });
});
