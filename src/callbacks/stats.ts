import type { Callback } from "../bot/types";

export const statsCallback: Callback = {
  pattern: "stats",
  handler: async (ctx) => {
    if (!ctx?.callbackQuery) {
      return;
    }

    await ctx.answerCallbackQuery();

    const stub = ctx.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
    const stats = await stub.getStats();

    if (!stats) {
      await ctx.reply("No stats found");
    } else {
      await ctx.reply(`📊 Total amount: ${stats.totalAmount} ml`);
    }
  },
};
