import { Bot } from "grammy";
import type { env } from "cloudflare:workers";
import tzLookup from "tz-lookup";
import type { Command, Callback, BotContext } from "./types";

export interface BotConfig {
  token: string;
  env: typeof env;
  commands: Command[];
  callbacks: Callback[];
}

export const setupBot = async (config: BotConfig): Promise<Bot> => {
  const bot = new Bot(config.token);

  // Register all commands
  for (const command of config.commands) {
    bot.command(command.name, async (ctx) => {
      const botContext = ctx as BotContext;
      botContext.env = config.env;
      await command.handler(botContext);
    });
  }

  // Register all callbacks
  for (const callback of config.callbacks) {
    bot.callbackQuery(callback.pattern, async (ctx) => {
      const botContext = ctx as BotContext;
      botContext.env = config.env;
      await callback.handler(botContext);
    });
  }

  bot.on(":location", async (ctx) => {
    if (!ctx.message?.location || !ctx.from?.id) {
      return;
    }

    const { latitude, longitude } = ctx.message.location;
    const timezone = tzLookup(latitude, longitude);
    const botContext = ctx as BotContext;
    botContext.env = config.env;

    const stub = botContext.env.DRINKY_STATE.getByName(ctx.from.id.toString());
    await stub.updateReminderSettings({
      reminderTimezone: timezone,
    });

    await ctx.reply(`Timezone set to ${timezone}`, {
      reply_markup: { remove_keyboard: true },
    });
  });

  await bot.init();
  return bot;
};
