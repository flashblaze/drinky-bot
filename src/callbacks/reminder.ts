import { InlineKeyboard } from "grammy";
import type { Callback } from "../bot/types";

const INTERVALS = [
  { label: "30 min", value: 30, callback: "reminder_interval_30" },
  { label: "1 hour", value: 60, callback: "reminder_interval_60" },
  { label: "2 hours", value: 120, callback: "reminder_interval_120" },
  { label: "3 hours", value: 180, callback: "reminder_interval_180" },
] as const;

const COMMON_TIMEZONES = [
  { label: "UTC", value: "UTC", callback: "reminder_timezone_UTC" },
  { label: "EST (UTC-5)", value: "America/New_York", callback: "reminder_timezone_EST" },
  { label: "PST (UTC-8)", value: "America/Los_Angeles", callback: "reminder_timezone_PST" },
  { label: "GMT (UTC+0)", value: "Europe/London", callback: "reminder_timezone_GMT" },
  { label: "IST (UTC+5:30)", value: "Asia/Kolkata", callback: "reminder_timezone_IST" },
  { label: "JST (UTC+9)", value: "Asia/Tokyo", callback: "reminder_timezone_JST" },
] as const;

export const reminderCallbacks: Callback[] = [
  {
    pattern: "reminder_toggle",
    handler: async (ctx) => {
      if (!ctx?.callbackQuery) {
        return;
      }

      await ctx.answerCallbackQuery();

      const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
      const settings = await stub.getReminderSettings();

      await stub.updateReminderSettings({
        reminderEnabled: !settings.reminderEnabled,
      });

      const newSettings = await stub.getReminderSettings();
      const statusText = newSettings.reminderEnabled
        ? "✅ Reminders enabled"
        : "❌ Reminders disabled";

      await ctx.reply(statusText);

      // Show updated settings
      const message = `🔔 *Reminder Settings*

Status: ${newSettings.reminderEnabled ? "✅ Enabled" : "❌ Disabled"}
Interval: ${newSettings.reminderIntervalMinutes} minutes
Timezone: ${newSettings.reminderTimezone}

Use /reminder to configure\\.`;

      const keyboard = new InlineKeyboard()
        .text(newSettings.reminderEnabled ? "❌ Disable" : "✅ Enable", "reminder_toggle")
        .row()
        .text("⏱️ Interval", "reminder_interval_menu")
        .row()
        .text("🌍 Timezone", "reminder_timezone_menu")
        .row()
        .text("📊 View Settings", "reminder_status");

      await ctx.editMessageText(message, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });
    },
  },
  {
    pattern: "reminder_interval_menu",
    handler: async (ctx) => {
      if (!ctx?.callbackQuery) {
        return;
      }

      await ctx.answerCallbackQuery();

      const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
      const settings = await stub.getReminderSettings();

      const keyboard = new InlineKeyboard();
      INTERVALS.forEach((interval, index) => {
        const isSelected = settings.reminderIntervalMinutes === interval.value;
        keyboard.text(isSelected ? `✓ ${interval.label}` : interval.label, interval.callback);
        if (index % 2 === 1 || index === INTERVALS.length - 1) {
          keyboard.row();
        }
      });
      keyboard.text("◀️ Back", "reminder_status");

      await ctx.editMessageText(
        "⏱️ *Select Reminder Interval*\n\nChoose how often you want to be reminded\\.\nCurrent: *" +
          settings.reminderIntervalMinutes +
          " minutes*",
        {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        },
      );
    },
  },
  ...INTERVALS.map(
    (interval): Callback => ({
      pattern: interval.callback,
      handler: async (ctx) => {
        if (!ctx?.callbackQuery) {
          return;
        }

        await ctx.answerCallbackQuery();

        const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
        await stub.updateReminderSettings({
          reminderIntervalMinutes: interval.value,
        });

        await ctx.reply(`✅ Interval set to ${interval.label}`);

        // Return to main menu
        const settings = await stub.getReminderSettings();
        const message = `🔔 *Reminder Settings*

Status: ${settings.reminderEnabled ? "✅ Enabled" : "❌ Disabled"}
Interval: ${settings.reminderIntervalMinutes} minutes
Timezone: ${settings.reminderTimezone}

Use /reminder to configure\\.`;

        const keyboard = new InlineKeyboard()
          .text(settings.reminderEnabled ? "❌ Disable" : "✅ Enable", "reminder_toggle")
          .row()
          .text("⏱️ Interval", "reminder_interval_menu")
          .row()
          .text("🌍 Timezone", "reminder_timezone_menu")
          .row()
          .text("📊 View Settings", "reminder_status");

        await ctx.editMessageText(message, {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        });
      },
    }),
  ),
  {
    pattern: "reminder_timezone_menu",
    handler: async (ctx) => {
      if (!ctx?.callbackQuery) {
        return;
      }

      await ctx.answerCallbackQuery();

      const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
      const settings = await stub.getReminderSettings();

      const keyboard = new InlineKeyboard();
      COMMON_TIMEZONES.forEach((tz, index) => {
        const isSelected = settings.reminderTimezone === tz.value;
        keyboard.text(isSelected ? `✓ ${tz.label}` : tz.label, tz.callback);
        if (index % 2 === 1 || index === COMMON_TIMEZONES.length - 1) {
          keyboard.row();
        }
      });
      keyboard.text("◀️ Back", "reminder_status");

      await ctx.editMessageText(
        "🌍 *Select Timezone*\n\nChoose your timezone\\.\nCurrent: *" +
          settings.reminderTimezone +
          "*",
        {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        },
      );
    },
  },
  ...COMMON_TIMEZONES.map(
    (tz): Callback => ({
      pattern: tz.callback,
      handler: async (ctx) => {
        if (!ctx?.callbackQuery) {
          return;
        }

        await ctx.answerCallbackQuery();

        const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
        await stub.updateReminderSettings({
          reminderTimezone: tz.value,
        });

        await ctx.reply(`✅ Timezone set to ${tz.label}`);

        // Return to main menu
        const settings = await stub.getReminderSettings();
        const message = `🔔 *Reminder Settings*

Status: ${settings.reminderEnabled ? "✅ Enabled" : "❌ Disabled"}
Interval: ${settings.reminderIntervalMinutes} minutes
Timezone: ${settings.reminderTimezone}

Use /reminder to configure\\.`;

        const keyboard = new InlineKeyboard()
          .text(settings.reminderEnabled ? "❌ Disable" : "✅ Enable", "reminder_toggle")
          .row()
          .text("⏱️ Interval", "reminder_interval_menu")
          .row()
          .text("🌍 Timezone", "reminder_timezone_menu")
          .row()
          .text("📊 View Settings", "reminder_status");

        await ctx.editMessageText(message, {
          parse_mode: "MarkdownV2",
          reply_markup: keyboard,
        });
      },
    }),
  ),
  {
    pattern: "reminder_status",
    handler: async (ctx) => {
      if (!ctx?.callbackQuery) {
        return;
      }

      await ctx.answerCallbackQuery();

      const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
      const settings = await stub.getReminderSettings();

      const message = `🔔 *Reminder Settings*

Status: ${settings.reminderEnabled ? "✅ Enabled" : "❌ Disabled"}
Interval: ${settings.reminderIntervalMinutes} minutes
Timezone: ${settings.reminderTimezone}

Use the buttons below to configure your reminders\\.`;

      const keyboard = new InlineKeyboard()
        .text(settings.reminderEnabled ? "❌ Disable" : "✅ Enable", "reminder_toggle")
        .row()
        .text("⏱️ Interval", "reminder_interval_menu")
        .row()
        .text("🌍 Timezone", "reminder_timezone_menu")
        .row()
        .text("📊 View Settings", "reminder_status");

      await ctx.reply(message, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });
    },
  },
];
