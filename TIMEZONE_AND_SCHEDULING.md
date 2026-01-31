# Timezone Awareness & Scheduling Logic

This document explains how Drinky Bot handles timezones and scheduling for water reminders and statistics.

## Overview

Drinky Bot is designed to work for users in any timezone. It respects the user's local time for:

1.  **Daily Statistics:** "Today" means the user's local calendar day (00:00 - 23:59).
2.  **Quiet Hours:** Reminders are paused between **12:00 AM** and **6:00 AM** local time.
3.  **Scheduling:** Next reminders are calculated based on local intervals and respected quiet hours.

### Core Logic

#### 1. Daily Statistics (`getStats`)

When a user asks for "today's stats" or when the bot checks if a daily goal is met, we need to sum up water logs for the current _local_ day.

**User Flow:**

1.  User triggers an action (e.g., `/stats` command or an alarm triggers).
2.  Bot retrieves the user's configured timezone (defaults to `UTC` if not set).
3.  Bot calculates the **Start of Day** and **Next Day Start** in that timezone.
4.  Database query fetches logs where `createdAt >= startOfDay` and `createdAt < nextDayStart`.

**Code Snippet (`src/utils.ts`):**

```typescript
export const getLocalStartOfDay = (timestamp: number, timezone: string): string => {
  // Convert UTC timestamp to User's Zoned Time
  const zonedDate = toZonedTime(timestamp, timezone);
  // Get start of that zoned day (00:00:00)
  const zonedStart = startOfDay(zonedDate);
  // Convert back to UTC for database comparison
  return fromZonedTime(zonedStart, timezone).toISOString();
};
```

#### 2. Reminder Scheduling (`calculateNextReminderTime`)

The bot schedules alarms using Cloudflare Durable Objects. The scheduling logic must ensure reminders happen at the correct interval but _never_ during quiet hours.

**Quiet Hours:** 00:00 (12 AM) to 06:00 (6 AM) Local Time.

**User Flow:**

1.  **Alarm Triggers:** The bot wakes up.
2.  **Check Goal:** If the daily goal is met, no further reminders are sent for today.
3.  **Send Reminder:** If goal is not met, a reminder is sent.
4.  **Schedule Next:** The bot calculates the next alarm time.

**Calculation Algorithm (`src/drinky-state-do.ts`):**

1.  **Determine "Start of Day":** Find 6:00 AM local time for the current day.
    - If 6:00 AM is in the future (e.g., it's currently 2 AM), schedule the first reminder for 6:00 AM today.
2.  **Calculate Intervals:**
    - Find how many minutes have passed since 6:00 AM.
    - Determine which "interval slot" we are currently in.
    - Add one interval to find the target time.
3.  **Check Quiet Hours:**
    - Convert the target UTC time to local time.
    - Check the hour component (`getHours`).
    - If hour < 6 (6 AM), it's quiet time (00:00 - 05:59).
4.  **Handle Quiet Time:**
    - If the target is in quiet hours, skip straight to **6:00 AM Tomorrow**.
5.  **Set Alarm:** Save the final calculated UTC timestamp to the Durable Object storage.

**Example Scenario (User in New York, Interval 60m):**

- **Current Time:** 10:30 PM (22:30).
- **Next Interval:** 11:30 PM (23:30).
- **Check:** 23:30 is NOT < 6.
- **Action:** Schedule reminder for 11:30 PM.
- **Next Interval (After that):** 12:30 AM (00:30).
- **Check:** 00:30 IS < 6.
- **Action:** Schedule next alarm for **6:00 AM Tomorrow**.
