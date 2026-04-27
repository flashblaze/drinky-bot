import { describe, expect, it } from "vitest";
import { formatLoggedWaterMessage, formatTodayStatsMessage } from "../src/utils";

describe("message formatting helpers", () => {
  it("formats today's stats for MarkdownV2", () => {
    expect(formatTodayStatsMessage(750, 2000)).toBe(
      "You've drank *750 ml* today\\.\nYour goal is to drink *2000 ml* every day\\.",
    );
  });

  it("formats a water log confirmation with stats", () => {
    expect(formatLoggedWaterMessage(250, 750, 2000)).toBe(
      "Logged 250 ml\nYou've drank *750 ml* today\\.\nYour goal is to drink *2000 ml* every day\\.",
    );
  });
});
