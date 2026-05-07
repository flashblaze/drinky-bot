import { describe, expect, it } from "vitest";
import {
  formatLoggedWaterMessage,
  formatReminderMessage,
  formatTodayStatsMessage,
} from "../src/utils";

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

  it("escapes decimal amounts for MarkdownV2", () => {
    expect(formatLoggedWaterMessage(1.5, 751.5, 2000)).toBe(
      "Logged 1\\.5 ml\nYou've drank *751\\.5 ml* today\\.\nYour goal is to drink *2000 ml* every day\\.",
    );
    expect(formatReminderMessage(751.5, 2000)).toBe(
      "Reminder\\! You've had *751\\.5 ml* today, goal is *2000 ml*\\.",
    );
  });
});
