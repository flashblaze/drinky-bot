import { InlineKeyboard } from "grammy";
import type { Command } from "../bot/types";

export const reminderCommand: Command = {
  name: "reminder",
  description: "Configure water reminder settings",
  handler: async (ctx) => {
    if (!ctx?.message) {
      return;
    }

    const stub = ctx.env.DRINKY.getByName(ctx.message.from.id.toString());
    const currentUser = await stub.selectCurrentUser();

    if (!currentUser) {
      await ctx.reply("User not found. Please run /start first.");
      return;
    }

    const settings = await stub.getReminderSettings();

    const statusText = settings.reminderEnabled ? "✅ Enabled" : "❌ Disabled";
    const intervalText = `${settings.reminderIntervalMinutes} minutes`;
    const timeText = settings.reminderStartTime;
    const timezoneText = settings.reminderTimezone;

    const message = `🔔 *Reminder Settings*

Status: ${statusText}
Interval: ${intervalText}
Start Time: ${timeText}
Timezone: ${timezoneText}

Use the buttons below to configure your reminders\\.`;

    const keyboard = new InlineKeyboard()
      .text(settings.reminderEnabled ? "❌ Disable" : "✅ Enable", "reminder_toggle")
      .row()
      .text("⏱️ Interval", "reminder_interval_menu")
      .row()
      .text("🕐 Start Time", "reminder_time_menu")
      .row()
      .text("🌍 Timezone", "reminder_timezone_menu")
      .row()
      .text("📊 View Settings", "reminder_status");

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  },
};
