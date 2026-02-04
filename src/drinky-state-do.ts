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
  calculateNextDayStart,
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
      console.log("[getStats] Invalid timezone, falling back to UTC", { timezone });
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
      return;
    }

    const nextReminderTime = calculateNextReminderTime(
      currentUser.reminderIntervalMinutes,
      currentUser.reminderTimezone,
    );

    if (!nextReminderTime) {
      console.error(
        "[scheduleNextReminder] Failed to calculate next reminder time - returning null",
        JSON.stringify(
          {
            userId: currentUser.id,
            intervalMinutes: currentUser.reminderIntervalMinutes,
          },
          null,
          2,
        ),
      );
      return;
    }

    // Safety check: ensure we're not scheduling in the past
    const now = Date.now();
    let alarmTimeToSet = nextReminderTime;

    if (nextReminderTime <= now) {
      console.log(
        "[scheduleNextReminder] Calculated alarm time is in the past, recalculating",
        JSON.stringify(
          {
            userId: currentUser.id,
            nextReminderTime,
            nextReminderTimeISO: new Date(nextReminderTime).toISOString(),
            now,
            nowISO: new Date(now).toISOString(),
            diffMs: nextReminderTime - now,
          },
          null,
          2,
        ),
      );
      // Try to calculate again - this shouldn't happen if logic is correct, but handle edge case
      const recalculated = calculateNextReminderTime(
        currentUser.reminderIntervalMinutes,
        currentUser.reminderTimezone,
      );
      if (!recalculated || recalculated <= now) {
        console.error(
          "[scheduleNextReminder] Recalculation also failed or is in past, aborting",
          JSON.stringify(
            {
              userId: currentUser.id,
              recalculated,
            },
            null,
            2,
          ),
        );
        return;
      }
      // Use recalculated time
      alarmTimeToSet = recalculated;
    }

    try {
      console.log(
        "[scheduleNextReminder] Setting alarm",
        JSON.stringify(
          {
            userId: currentUser.id,
            alarmTimeToSet,
            alarmTimeToSetISO: new Date(alarmTimeToSet).toISOString(),
            now,
            nowISO: new Date(now).toISOString(),
            diffMs: alarmTimeToSet - now,
            diffMinutes: Math.round((alarmTimeToSet - now) / (60 * 1000)),
          },
          null,
          2,
        ),
      );
      await this.storage.setAlarm(alarmTimeToSet);

      // Verify alarm was set
      const verifyAlarm = await this.storage.getAlarm();
      if (verifyAlarm !== alarmTimeToSet) {
        console.error(
          "[scheduleNextReminder] Alarm verification failed",
          JSON.stringify(
            {
              userId: currentUser.id,
              expected: alarmTimeToSet,
              expectedISO: new Date(alarmTimeToSet).toISOString(),
              actual: verifyAlarm,
              actualISO: verifyAlarm ? new Date(verifyAlarm).toISOString() : null,
            },
            null,
            2,
          ),
        );
      }
    } catch (error) {
      console.error(
        "[scheduleNextReminder] Error setting alarm",
        JSON.stringify(
          {
            userId: currentUser.id,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          null,
          2,
        ),
      );
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
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      return;
    }

    if (!currentUser.reminderEnabled) {
      return;
    }

    // Check if goal is met
    const goalMet = await this.checkGoalMet();
    if (goalMet) {
      await this.sendGoalCongrats();

      const nextDayStart = calculateNextDayStart(currentUser.reminderTimezone || "UTC");
      console.log(
        "[alarm] Goal met, scheduling next alarm for tomorrow morning",
        JSON.stringify({
          userId: currentUser.id,
          nextDayStart,
          nextDayStartISO: new Date(nextDayStart).toISOString(),
        }),
      );
      await this.storage.setAlarm(nextDayStart);

      return;
    }

    // Check if user logged water recently (within last 5 minutes)
    const recentLog = await this.getRecentWaterLog(5 * 60 * 1000); // 5 minutes in ms
    if (recentLog) {
      // Skip this reminder, reschedule next one
      try {
        await this.scheduleNextReminder();
        console.log("[alarm] Next reminder scheduled after recent log check");
      } catch (error) {
        console.error(
          "[alarm] CRITICAL: Failed to schedule next reminder after recent log check",
          JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            },
            null,
            2,
          ),
        );
        throw error;
      }
      return;
    }

    try {
      await this.sendReminderMessage();
    } catch (error) {
      console.error(
        "[alarm] Error sending reminder message, but continuing to reschedule",
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          null,
          2,
        ),
      );
      // Continue to reschedule even if message sending fails
    }

    try {
      await this.scheduleNextReminder();
    } catch (error) {
      console.error(
        "[alarm] CRITICAL: Failed to schedule next reminder",
        JSON.stringify(
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          null,
          2,
        ),
      );
      // Re-throw to ensure we know about this critical failure
      throw error;
    }
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

    const message = `Reminder\\! You've had *${totalAmount} ml* today, goal is *${currentUser.goal} ml*\\.`;

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
