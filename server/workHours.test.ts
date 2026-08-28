import { describe, expect, it } from "vitest";
import { afterHoursWorkMessage, getAfterHoursWorkMessage, isOutsideWorkHours } from "./workHours";

describe("Pacific work-hours guard", () => {
  it("allows weekday work before 6 PM Pacific", () => {
    expect(isOutsideWorkHours(new Date("2026-08-28T00:59:00.000Z"))).toBe(false);
  });

  it("blocks weekday work at 6 PM Pacific", () => {
    expect(getAfterHoursWorkMessage(new Date("2026-08-28T01:00:00.000Z"))).toBe(afterHoursWorkMessage);
  });

  it("blocks Saturday and Sunday in Pacific time", () => {
    expect(isOutsideWorkHours(new Date("2026-08-29T17:00:00.000Z"))).toBe(true);
    expect(isOutsideWorkHours(new Date("2026-08-30T17:00:00.000Z"))).toBe(true);
  });
});
