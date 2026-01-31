import { describe, it, expect } from "vitest";
import { getLocalStartOfDay, getLocalNextDay } from "../src/utils";

describe("Timezone Utils", () => {
  describe("getLocalStartOfDay", () => {
    it("should return correct start of day for UTC", () => {
      // 2026-01-31T12:00:00Z
      const timestamp = 1769860800000;
      const result = getLocalStartOfDay(timestamp, "UTC");
      expect(result).toBe("2026-01-31T00:00:00.000Z");
    });

    it("should return correct start of day for New York (EST)", () => {
      // 2026-01-31T12:00:00Z is 7:00 AM in New York
      const timestamp = 1769860800000;
      const result = getLocalStartOfDay(timestamp, "America/New_York");
      // New York Start of day is 00:00 EST -> 05:00 UTC
      expect(result).toBe("2026-01-31T05:00:00.000Z");
    });

    it("should return correct start of day for India (IST)", () => {
      // 2026-01-31T12:00:00Z is 5:30 PM in India
      const timestamp = 1769860800000;
      const result = getLocalStartOfDay(timestamp, "Asia/Kolkata");
      // India Start of day is 00:00 IST -> Previous Day 18:30 UTC
      expect(result).toBe("2026-01-30T18:30:00.000Z");
    });
  });

  describe("getLocalNextDay", () => {
    it("should return correct next day for UTC", () => {
      const timestamp = 1769860800000;
      const result = getLocalNextDay(timestamp, "UTC");
      expect(result).toBe("2026-02-01T00:00:00.000Z");
    });

    it("should return correct next day for New York", () => {
      const timestamp = 1769860800000;
      const result = getLocalNextDay(timestamp, "America/New_York");
      // Next day start in NY is Feb 1st 00:00 EST -> Feb 1st 05:00 UTC
      expect(result).toBe("2026-02-01T05:00:00.000Z");
    });
  });
});
