import { InlineKeyboard } from "grammy";
import type { Command } from "../bot/types";

export const startCommand: Command = {
  name: "start",
  description: "Register user and show welcome screen",
  handler: async (ctx) => {
    if (!ctx?.message) {
      return;
    }

    const stub = ctx.env.DRINKY_STATE.getByName(ctx.message.from.id.toString());
    const existingUser = await stub.selectCurrentUser();

    const keyboard = new InlineKeyboard()
      .text("💧 Log Water", "log_water")
      .row()
      .text("🎯 Goal", "goal")
      .row()
      .text("📊 Today's stats", "stats")
      .row()
      .text("🔔 Reminders", "reminder_status")
      .row()
      .text("Get current alarm", "get_current_alarm");

    if (existingUser) {
      const name =
        existingUser.firstName && existingUser.lastName
          ? `${existingUser.firstName} ${existingUser.lastName}`
          : existingUser.username;

      await ctx.reply(`👋 Welcome to Drinky, ${name}`, {
        reply_markup: keyboard,
      });
    } else {
      if (!ctx?.message) {
        return;
      }

      const newUser = await stub.insert({
        telegramId: ctx.message.from.id,
        username: ctx.message.from.username ?? "",
        languageCode: ctx.message.from.language_code ?? "",
        firstName: ctx.message.from.first_name,
        lastName: ctx.message.from.last_name ?? "",
      });

      const name =
        newUser.firstName && newUser.lastName
          ? `${newUser.firstName} ${newUser.lastName}`
          : newUser.username;

      await ctx.reply(`👋 Welcome to Drinky, ${name}`, {
        reply_markup: keyboard,
      });
    }
  },
};
