import { InlineKeyboard } from "grammy";
import type { Command } from "../bot/types";
import { escapeMarkdown } from "../utils";

export const settingsCommand: Command = {
  name: "settings",
  description: "View and configure settings",
  handler: async (ctx) => {
    if (!ctx?.message) {
      return;
    }

    const stub = ctx.env.DRINKY_STATE.getByName(ctx.message.from.id.toString());
    const currentUser = await stub.selectCurrentUser();

    if (!currentUser) {
      await ctx.reply("User not found. Please run /start first.");
      return;
    }

    const settings = await stub.getReminderSettings();

    const statusText = settings.reminderEnabled ? "✅ Enabled" : "❌ Disabled";
    const intervalText = `${settings.reminderIntervalMinutes} minutes`;
    const timezoneText = escapeMarkdown(settings.reminderTimezone);

    const message = `
Status: ${statusText}
Interval: ${intervalText}
Timezone: ${timezoneText}

Use the buttons below to configure your settings\\.`;

    const keyboard = new InlineKeyboard()
      .text(settings.reminderEnabled ? "❌ Disable" : "✅ Enable", "reminder_toggle")
      .row()
      .text("⏱️ Interval", "reminder_interval_menu")
      .row()
      .text("🌍 Timezone", "reminder_timezone_menu");

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  },
};
