import { InlineKeyboard, Keyboard } from "grammy";
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
      .text("🥤 Log water", "log_water")
      .row()
      .text("📊 Today's stats", "stats")
      .row()
      .text("⚙️ Settings", "settings")
      .row()
      .text("⏰ Next alarm", "get_next_alarm");

    const isDev = ctx.env.MODE === "development";
    if (isDev) {
      keyboard.row().text("💀 Delete current user", "delete_user");
    }

    if (existingUser) {
      // Only ask for location if timezone is default UTC
      if (existingUser.reminderTimezone === "UTC") {
        const locationKeyboard = new Keyboard()
          .requestLocation("📍 Set Timezone (Send Location)")
          .resized();

        await ctx.reply("Please share your location to set your timezone correctly", {
          reply_markup: locationKeyboard,
        });
      }

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

      // Ask for location for new users
      const locationKeyboard = new Keyboard()
        .requestLocation("📍 Set Timezone (Send Location)")
        .resized();

      await ctx.reply("Please share your location to set your timezone correctly", {
        reply_markup: locationKeyboard,
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
