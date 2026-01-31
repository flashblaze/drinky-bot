import { describe, it, expect } from "vitest";
import { calculateNextReminderTime } from "../src/utils";

describe("Scheduling Logic (calculateNextReminderTime)", () => {
  it("should schedule normally during the day", () => {
    // 2 PM India (14:00) -> Next reminder at 3 PM (15:00)
    // 14:00 IST = 08:30 UTC
    // Start of day is 6 AM IST = 00:30 UTC
    const now = new Date("2026-01-31T14:00:00+05:30").getTime();
    const nextReminder = calculateNextReminderTime(60, "Asia/Kolkata", now);

    const expected = new Date("2026-01-31T15:00:00+05:30").getTime();
    expect(nextReminder).toBe(expected);
  });

  it("should align to the 6 AM grid", () => {
    // 10:30 PM India (22:30).
    // Start 6 AM.
    // 6 AM + 16 hrs = 22:00 (10 PM).
    // 6 AM + 17 hrs = 23:00 (11 PM).
    // Current time 22:30 is in the 22:00-23:00 interval.
    // Next reminder should be end of this interval: 23:00 (11 PM).
    const now = new Date("2026-01-31T22:30:00+05:30").getTime();
    const nextReminder = calculateNextReminderTime(60, "Asia/Kolkata", now);

    const expected = new Date("2026-01-31T23:00:00+05:30").getTime();
    expect(nextReminder).toBe(expected);
  });

  it("should skip quiet hours (Midnight - 6 AM)", () => {
    // 11:30 PM India (23:30).
    // Next interval: 00:30 AM (Tomorrow).
    // This is < 6 AM, so it's quiet time.
    // Should skip to 6 AM Tomorrow.
    const now = new Date("2026-01-31T23:30:00+05:30").getTime();
    const nextReminder = calculateNextReminderTime(60, "Asia/Kolkata", now);

    const expected = new Date("2026-02-01T06:00:00+05:30").getTime();
    expect(nextReminder).toBe(expected);
  });

  it("should schedule for 6 AM if waking up early (2 AM)", () => {
    // 2 AM NY. Before 6 AM start.
    // Should schedule for 6 AM Today.
    const now = new Date("2026-01-31T02:00:00-05:00").getTime();
    const nextReminder = calculateNextReminderTime(60, "America/New_York", now);

    const expected = new Date("2026-01-31T06:00:00-05:00").getTime();
    expect(nextReminder).toBe(expected);
  });

  it("should handle just after midnight correctly", () => {
    // 00:05 AM NY.
    // Start of "Today" (from user perspective) hasn't happened yet (starts at 6 AM).
    // Should schedule for 6 AM Today.
    const now = new Date("2026-01-31T00:05:00-05:00").getTime();
    const nextReminder = calculateNextReminderTime(60, "America/New_York", now);

    const expected = new Date("2026-01-31T06:00:00-05:00").getTime();
    expect(nextReminder).toBe(expected);
  });
});
