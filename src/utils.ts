import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfDay, addDays, addHours, getHours } from "date-fns";

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

export const calculateNextReminderTime = (
  intervalMinutes: number,
  timezone: string,
  now = Date.now(),
): number | null => {
  try {
    const START_HOUR = 6; // 6 AM Local

    // 1. Get Today's Start Time (6 AM Local Today)
    const zonedNow = toZonedTime(now, timezone);
    const zonedDayStart = startOfDay(zonedNow);
    const zonedTodayStart = addHours(zonedDayStart, START_HOUR);
    const todayStartUtc = fromZonedTime(zonedTodayStart, timezone).getTime();

    // If todayStart is in the future, schedule for then
    if (todayStartUtc > now) {
      return todayStartUtc;
    }

    // 2. Calculate intervals
    const msSinceStart = now - todayStartUtc;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Calculate which interval we're in
    const currentInterval = Math.floor(msSinceStart / intervalMs);

    // Calculate next interval time
    const nextReminderUtc = todayStartUtc + (currentInterval + 1) * intervalMs;

    // 3. Check if next reminder falls in quiet hours (00:00 - 06:00)
    const zonedNextReminder = toZonedTime(nextReminderUtc, timezone);
    const hour = getHours(zonedNextReminder);

    if (hour < START_HOUR) {
      // Schedule for Tomorrow 6 AM
      const zonedTomorrowStart = addDays(zonedTodayStart, 1);
      const tomorrowStartUtc = fromZonedTime(zonedTomorrowStart, timezone).getTime();
      return tomorrowStartUtc;
    }

    return nextReminderUtc;
  } catch (error) {
    console.error("[calculateNextReminderTime] Error:", error);
    return null;
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
