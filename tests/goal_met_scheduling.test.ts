import { describe, it, expect } from "vitest";
import { calculateNextDayStart } from "../src/utils";

describe("Goal Met Scheduling Logic (calculateNextDayStart)", () => {
  it("should schedule for 6 AM tomorrow if goal met during the day", () => {
    // 2 PM India (14:00)
    const now = new Date("2026-01-31T14:00:00+05:30").getTime();
    const nextStart = calculateNextDayStart("Asia/Kolkata", now);

    const expected = new Date("2026-02-01T06:00:00+05:30").getTime();
    expect(nextStart).toBe(expected);
  });

  it("should schedule for 6 AM tomorrow if goal met late at night", () => {
    // 11 PM India (23:00)
    const now = new Date("2026-01-31T23:00:00+05:30").getTime();
    const nextStart = calculateNextDayStart("Asia/Kolkata", now);

    const expected = new Date("2026-02-01T06:00:00+05:30").getTime();
    expect(nextStart).toBe(expected);
  });

  it("should schedule for 6 AM tomorrow (relative to calendar day) if goal met during quiet hours (e.g. 2 AM)", () => {
    // 2 AM India (02:00) on Feb 1st
    // If user met goal at 2 AM, they met it for Feb 1st (technically).
    // So next reminder should be 6 AM Feb 2nd.
    const now = new Date("2026-02-01T02:00:00+05:30").getTime();
    const nextStart = calculateNextDayStart("Asia/Kolkata", now);

    const expected = new Date("2026-02-02T06:00:00+05:30").getTime();
    expect(nextStart).toBe(expected);
  });
});
