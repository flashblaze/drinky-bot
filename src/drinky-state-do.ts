import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import migrations from "../drizzle/migrations";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { userTable, waterLogTable } from "./db/schema";
import { relations } from "./db/relations";
import { and, desc, eq, gte, lt, sum } from "drizzle-orm";
import { Bot } from "grammy";
import {
  getLocalStartOfDay,
  getLocalNextDay,
  validateTimezone,
  calculateNextReminderTime,
} from "./utils";

export class DrinkyState extends DurableObject {
  storage: DurableObjectStorage;
  db: DrizzleSqliteDODatabase<any>;
  env: Cloudflare.Env;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.env = env;
    this.db = drizzle(this.storage, { logger: false, relations });
    // Make sure all migrations complete before accepting queries.
    // Otherwise you will need to run `this.migrate()` in any function
    // that accesses the Drizzle database `this.db`.

    void ctx.blockConcurrencyWhile(async () => {
      await migrate(this.db, migrations);
    });
  }

  // Development Commands

  async deleteUser() {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    await this.db.delete(waterLogTable).where(eq(waterLogTable.userId, currentUser.id));
    return this.db.delete(userTable).where(eq(userTable.id, currentUser.id)).returning().get();
  }

  async insert(user: typeof userTable.$inferInsert) {
    return this.db.insert(userTable).values(user).returning().get();
  }

  async getNextAlarm() {
    const alarm = await this.storage.getAlarm();
    if (!alarm) {
      return null;
    }

    const currentUser = await this.selectCurrentUser();
    const timeZone = currentUser?.reminderTimezone || "UTC";

    return new Date(alarm).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  }

  async insertWaterLog(quantity: number) {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    return this.db
      .insert(waterLogTable)
      .values({
        amount: quantity,
        userId: currentUser.id,
      })
      .returning()
      .get();
  }

  async getStats(timestamp: number) {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    const timezone = currentUser.reminderTimezone || "UTC";
    if (!validateTimezone(timezone)) {
      console.warn("[getStats] Invalid timezone, falling back to UTC", { timezone });
    }

    const dayStart = getLocalStartOfDay(timestamp, timezone || "UTC");
    const nextDayStart = getLocalNextDay(timestamp, timezone || "UTC");

    console.log(
      "[getStats] Calculating stats with timezone",
      JSON.stringify(
        {
          timezone,
          requestedTimestamp: new Date(timestamp).toISOString(),
          dayStart,
          nextDayStart,
          userId: currentUser.id,
        },
        null,
        2,
      ),
    );

    const stats = this.db
      .select({
        totalAmount: sum(waterLogTable.amount),
      })
      .from(waterLogTable)
      .where(
        and(
          eq(waterLogTable.userId, currentUser.id),
          gte(waterLogTable.createdAt, dayStart),
          lt(waterLogTable.createdAt, nextDayStart),
        ),
      )
      .orderBy(desc(waterLogTable.createdAt))
      .get();
    return stats;
  }

  async selectCurrentUser() {
    return this.db.select().from(userTable).get();
  }

  async updateGoal(goal: number) {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    return this.db
      .update(userTable)
      .set({ goal })
      .where(eq(userTable.id, currentUser.id))
      .returning()
      .get();
  }

  // Reminder Management Methods

  async updateReminderSettings(settings: {
    reminderEnabled?: boolean;
    reminderIntervalMinutes?: number;
    reminderTimezone?: string;
  }) {
    console.log("[updateReminderSettings] Updating settings", {
      userId: (await this.selectCurrentUser())?.id,
      settings,
    });

    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    const updateData: {
      reminderEnabled?: boolean;
      reminderIntervalMinutes?: number;
      reminderTimezone?: string;
    } = {};

    if (settings.reminderEnabled !== undefined) {
      updateData.reminderEnabled = settings.reminderEnabled;
    }
    if (settings.reminderIntervalMinutes !== undefined) {
      updateData.reminderIntervalMinutes = settings.reminderIntervalMinutes;
    }
    if (settings.reminderTimezone !== undefined) {
      updateData.reminderTimezone = settings.reminderTimezone;
    }

    const updatedUser = this.db
      .update(userTable)
      .set(updateData)
      .where(eq(userTable.id, currentUser.id))
      .returning()
      .get();

    console.log("[updateReminderSettings] User updated", {
      userId: updatedUser.id,
      reminderEnabled: updatedUser.reminderEnabled,
      reminderIntervalMinutes: updatedUser.reminderIntervalMinutes,
    });

    // If enabling reminders, schedule the first one
    if (settings.reminderEnabled === true) {
      console.log("[updateReminderSettings] Enabling reminders, scheduling first alarm");
      await this.scheduleNextReminder();
    } else if (settings.reminderEnabled === false) {
      console.log("[updateReminderSettings] Disabling reminders, canceling alarm");
      await this.cancelReminder();
    } else if (
      settings.reminderIntervalMinutes !== undefined ||
      settings.reminderTimezone !== undefined
    ) {
      // If interval, start time, or timezone changed, reschedule if reminders are enabled
      console.log("[updateReminderSettings] Settings changed, checking if reschedule needed", {
        reminderEnabled: updatedUser.reminderEnabled,
      });
      if (updatedUser.reminderEnabled) {
        console.log("[updateReminderSettings] Reminders enabled, rescheduling");
        await this.scheduleNextReminder();
      } else {
        console.log("[updateReminderSettings] Reminders disabled, not rescheduling");
      }
    }

    return updatedUser;
  }

  async getReminderSettings() {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    return {
      reminderEnabled: currentUser.reminderEnabled,
      reminderIntervalMinutes: currentUser.reminderIntervalMinutes,
      reminderTimezone: currentUser.reminderTimezone,
    };
  }

  async scheduleNextReminder() {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser || !currentUser.reminderEnabled) {
      console.log("[scheduleNextReminder] User not found or reminders disabled", {
        userId: currentUser?.id,
        reminderEnabled: currentUser?.reminderEnabled,
      });
      return;
    }

    console.log("[scheduleNextReminder] Calculating next reminder", {
      userId: currentUser.id,
      intervalMinutes: currentUser.reminderIntervalMinutes,
      timezone: currentUser.reminderTimezone,
    });

    const nextReminderTime = calculateNextReminderTime(
      currentUser.reminderIntervalMinutes,
      currentUser.reminderTimezone,
    );

    if (!nextReminderTime) {
      console.error(
        "[scheduleNextReminder] Failed to calculate next reminder time - returning null",
        {
          userId: currentUser.id,
          intervalMinutes: currentUser.reminderIntervalMinutes,
        },
      );
      return;
    }

    // Safety check: ensure we're not scheduling in the past
    const now = Date.now();
    let alarmTimeToSet = nextReminderTime;

    if (nextReminderTime <= now) {
      console.error("[scheduleNextReminder] Calculated alarm time is in the past, recalculating", {
        userId: currentUser.id,
        nextReminderTime,
        nextReminderTimeISO: new Date(nextReminderTime).toISOString(),
        now,
        nowISO: new Date(now).toISOString(),
        diffMs: nextReminderTime - now,
      });
      // Try to calculate again - this shouldn't happen if logic is correct, but handle edge case
      const recalculated = calculateNextReminderTime(
        currentUser.reminderIntervalMinutes,
        currentUser.reminderTimezone,
      );
      if (!recalculated || recalculated <= now) {
        console.error("[scheduleNextReminder] Recalculation also failed or is in past, aborting", {
          userId: currentUser.id,
          recalculated,
        });
        return;
      }
      // Use recalculated time
      alarmTimeToSet = recalculated;
      console.warn("[scheduleNextReminder] Using recalculated time", {
        userId: currentUser.id,
        recalculated,
        recalculatedISO: new Date(recalculated).toISOString(),
      });
    }

    try {
      console.log("[scheduleNextReminder] Setting alarm", {
        userId: currentUser.id,
        alarmTimeToSet,
        alarmTimeToSetISO: new Date(alarmTimeToSet).toISOString(),
        now,
        nowISO: new Date(now).toISOString(),
        diffMs: alarmTimeToSet - now,
        diffMinutes: Math.round((alarmTimeToSet - now) / (60 * 1000)),
      });
      await this.storage.setAlarm(alarmTimeToSet);

      // Verify alarm was set
      const verifyAlarm = await this.storage.getAlarm();
      if (verifyAlarm !== alarmTimeToSet) {
        console.error("[scheduleNextReminder] Alarm verification failed", {
          userId: currentUser.id,
          expected: alarmTimeToSet,
          expectedISO: new Date(alarmTimeToSet).toISOString(),
          actual: verifyAlarm,
          actualISO: verifyAlarm ? new Date(verifyAlarm).toISOString() : null,
        });
      } else {
        console.log("[scheduleNextReminder] Alarm successfully set and verified", {
          userId: currentUser.id,
          alarmTime: verifyAlarm,
          alarmTimeISO: new Date(verifyAlarm).toISOString(),
        });
      }
    } catch (error) {
      console.error("[scheduleNextReminder] Error setting alarm", {
        userId: currentUser.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to ensure we know about failures
    }
  }

  async cancelReminder() {
    const alarm = await this.storage.getAlarm();
    if (alarm) {
      await this.storage.deleteAlarm();
    }
  }

  // Alarm handler - called when reminder time is reached
  async alarm() {
    console.log("[alarm] Alarm triggered");

    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      console.error("[alarm] No current user found");
      return;
    }

    console.log("[alarm] Processing alarm for user", {
      userId: currentUser.id,
      reminderEnabled: currentUser.reminderEnabled,
    });

    if (!currentUser.reminderEnabled) {
      console.log("[alarm] Reminders disabled, skipping");
      return;
    }

    // Check if goal is met
    const goalMet = await this.checkGoalMet();
    console.log("[alarm] Goal check", { goalMet });
    if (goalMet) {
      await this.sendGoalCongrats();
      // Don't reschedule - goal is met for today
      console.log("[alarm] Goal met, not rescheduling");
      return;
    }

    // Check if user logged water recently (within last 5 minutes)
    const recentLog = await this.getRecentWaterLog(5 * 60 * 1000); // 5 minutes in ms
    console.log("[alarm] Recent log check", { recentLog });
    if (recentLog) {
      // Skip this reminder, reschedule next one
      console.log("[alarm] Recent log found, skipping reminder and rescheduling");
      try {
        await this.scheduleNextReminder();
        console.log("[alarm] Next reminder scheduled after recent log check");
      } catch (error) {
        console.error("[alarm] CRITICAL: Failed to schedule next reminder after recent log check", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
      return;
    }

    console.log("[alarm] Sending reminder message and rescheduling");
    try {
      await this.sendReminderMessage();
      console.log("[alarm] Reminder message sent successfully");
    } catch (error) {
      console.error("[alarm] Error sending reminder message, but continuing to reschedule", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Continue to reschedule even if message sending fails
    }

    try {
      await this.scheduleNextReminder();
      console.log("[alarm] Next reminder scheduled successfully");
    } catch (error) {
      console.error("[alarm] CRITICAL: Failed to schedule next reminder", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw to ensure we know about this critical failure
      throw error;
    }

    console.log("[alarm] Alarm processing complete");
  }

  // Helper Methods

  async checkGoalMet(): Promise<boolean> {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser || currentUser.goal === 0) {
      return false;
    }

    const stats = await this.getStats(Date.now());
    const totalAmount = stats?.totalAmount ? Number(stats.totalAmount) : 0;

    return totalAmount >= currentUser.goal;
  }

  async getRecentWaterLog(withinMs: number): Promise<boolean> {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      return false;
    }

    const cutoffTime = new Date(Date.now() - withinMs).toISOString();

    const recentLog = this.db
      .select()
      .from(waterLogTable)
      .where(
        and(eq(waterLogTable.userId, currentUser.id), gte(waterLogTable.createdAt, cutoffTime)),
      )
      .limit(1)
      .get();

    return !!recentLog;
  }

  async sendReminderMessage() {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      return;
    }

    const stats = await this.getStats(Date.now());
    const totalAmount = stats?.totalAmount ? Number(stats.totalAmount) : 0;

    const message = `💧 Reminder\\! You've had *${totalAmount} ml* today, goal is *${currentUser.goal} ml*\\.`;

    const bot = new Bot(this.env.BOT_TOKEN);
    const { InlineKeyboard } = await import("grammy");
    const keyboard = new InlineKeyboard()
      .text("100 ml", "log_water_100")
      .text("200 ml", "log_water_200")
      .row()
      .text("250 ml", "log_water_250")
      .text("500 ml", "log_water_500");

    try {
      await bot.api.sendMessage(currentUser.telegramId, message, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error("Error sending reminder message:", error);
    }
  }

  async sendGoalCongrats() {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      return;
    }

    const message = `🎉 Congratulations\\! You've reached your daily goal of *${currentUser.goal} ml*\\! Great job staying hydrated\\!`;

    const bot = new Bot(this.env.BOT_TOKEN);

    try {
      await bot.api.sendMessage(currentUser.telegramId, message, {
        parse_mode: "MarkdownV2",
      });
    } catch (error) {
      console.error("Error sending goal congrats message:", error);
    }
  }
}
