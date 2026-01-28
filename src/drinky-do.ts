import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import migrations from "../drizzle/migrations";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { userTable, waterLogTable } from "./db/schema";
import { relations } from "./db/relations";
import { and, desc, eq, gte, lt, sum } from "drizzle-orm";
import { Bot } from "grammy";

export class Drinky extends DurableObject {
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

    // oxlint-disable-next-line typescript/no-floating-promises
    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();
    });
  }

  async _migrate() {
    // oxlint-disable-next-line typescript/no-floating-promises
    migrate(this.db, migrations);
  }

  async insert(user: typeof userTable.$inferInsert) {
    return this.db.insert(userTable).values(user).returning().get();
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

    const date = new Date(timestamp);
    const startOfDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

    const dayStart = startOfDay.toISOString();
    const nextDayStart = startOfNextDay.toISOString();

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
    reminderStartTime?: string;
    reminderTimezone?: string;
  }) {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }

    const updateData: {
      reminderEnabled?: boolean;
      reminderIntervalMinutes?: number;
      reminderStartTime?: string;
      reminderTimezone?: string;
    } = {};

    if (settings.reminderEnabled !== undefined) {
      updateData.reminderEnabled = settings.reminderEnabled;
    }
    if (settings.reminderIntervalMinutes !== undefined) {
      updateData.reminderIntervalMinutes = settings.reminderIntervalMinutes;
    }
    if (settings.reminderStartTime !== undefined) {
      updateData.reminderStartTime = settings.reminderStartTime;
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
    if (settings.reminderEnabled) {
      await this.scheduleNextReminder();
    } else if (!settings.reminderEnabled) {
      await this.cancelReminder();
    } else if (
      settings.reminderIntervalMinutes !== undefined ||
      settings.reminderStartTime !== undefined
    ) {
      // If interval or start time changed, reschedule
      if (updatedUser.reminderEnabled) {
        await this.scheduleNextReminder();
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
      reminderStartTime: currentUser.reminderStartTime,
      reminderTimezone: currentUser.reminderTimezone,
    };
  }

  async scheduleNextReminder() {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser || !currentUser.reminderEnabled) {
      return;
    }

    const nextReminderTime = this.calculateNextReminderTime(
      currentUser.reminderStartTime,
      currentUser.reminderIntervalMinutes,
      currentUser.reminderTimezone,
    );

    if (nextReminderTime) {
      await this.storage.setAlarm(nextReminderTime);
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
      // Don't reschedule - goal is met for today
      return;
    }

    // Check if user logged water recently (within last 5 minutes)
    const recentLog = await this.getRecentWaterLog(5 * 60 * 1000); // 5 minutes in ms
    if (recentLog) {
      // Skip this reminder, reschedule next one
      await this.scheduleNextReminder();
      return;
    }

    await this.sendReminderMessage();
    await this.scheduleNextReminder();
  }

  // Helper Methods

  calculateNextReminderTime(
    startTime: string,
    intervalMinutes: number,
    _timezone: string,
  ): number | null {
    try {
      const [hours, minutes] = startTime.split(":").map(Number);
      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        return null;
      }

      const now = new Date();

      const todayStart = new Date(now);
      todayStart.setUTCHours(hours, minutes, 0, 0);

      // If start time hasn't occurred today yet, schedule for start time today
      if (todayStart > now) {
        return todayStart.getTime();
      }

      // Calculate how many minutes have passed since start time today
      const minutesSinceStart = Math.floor((now.getTime() - todayStart.getTime()) / (60 * 1000));

      // Calculate which interval we're in (0-indexed)
      const currentInterval = Math.floor(minutesSinceStart / intervalMinutes);

      // Calculate next interval time
      const nextIntervalMinutes = (currentInterval + 1) * intervalMinutes;
      const nextReminder = new Date(todayStart);
      nextReminder.setUTCMinutes(nextReminder.getUTCMinutes() + nextIntervalMinutes);

      // If next reminder would be tomorrow (past midnight), schedule for start time tomorrow
      if (nextReminder.getUTCDate() !== todayStart.getUTCDate()) {
        const tomorrowStart = new Date(todayStart);
        tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
        return tomorrowStart.getTime();
      }

      return nextReminder.getTime();
    } catch (error) {
      console.error("Error calculating next reminder time:", error);
      return null;
    }
  }

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
