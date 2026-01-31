import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, addDays } from "date-fns";

export const getLocalStartOfDay = (timestamp: number, timezone: string): string => {
  try {
    const zonedDate = toZonedTime(timestamp, timezone);
    const zonedStart = startOfDay(zonedDate);
    const utcStart = fromZonedTime(zonedStart, timezone);
    return utcStart.toISOString();
  } catch (error) {
    console.error("[getLocalStartOfDay] Error calculating local start of day", {
      error,
      timestamp,
      timezone,
    });
    // Fallback to UTC start of day
    return startOfDay(timestamp).toISOString();
  }
};

export const getLocalNextDay = (timestamp: number, timezone: string): string => {
  try {
    const zonedDate = toZonedTime(timestamp, timezone);
    const zonedNextDay = addDays(startOfDay(zonedDate), 1);
    const utcNextDay = fromZonedTime(zonedNextDay, timezone);
    return utcNextDay.toISOString();
  } catch (error) {
    console.error("[getLocalNextDay] Error calculating local next day", {
      error,
      timestamp,
      timezone,
    });
    // Fallback to UTC next day
    return addDays(startOfDay(timestamp), 1).toISOString();
  }
};

export const validateTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

/**
 * Escapes special characters for Telegram MarkdownV2 format.
 * All special characters must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * @param text - Text to escape
 * @returns Escaped text safe for MarkdownV2
 */
export const escapeMarkdown = (text: string): string => {
  // Escape all MarkdownV2 special characters
  // Characters that need escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // Note: Backslashes are handled separately since they're used for escaping
  return text
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&"); // Then escape other special chars
};
