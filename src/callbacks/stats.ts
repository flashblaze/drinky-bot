import type { Callback } from "../bot/types";

export const statsCallback: Callback = {
  pattern: "stats",
  handler: async (ctx) => {
    if (!ctx?.callbackQuery) {
      return;
    }

    await ctx.answerCallbackQuery();

    const stub = ctx.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());

    // Convert Unix timestamp from seconds to milliseconds
    const timestamp = ctx.callbackQuery.message?.date
      ? ctx.callbackQuery.message.date * 1000
      : Date.now();
    const stats = await stub.getStats(timestamp);

    if (!stats) {
      await ctx.reply("No stats found");
    } else {
      await ctx.reply(`💧 You've drank *${stats.totalAmount || 0} ml* today\\.`, {
        parse_mode: "MarkdownV2",
      });
    }
  },
};
