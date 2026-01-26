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
      const currentUser = await stub.selectCurrentUser();
      if (!currentUser) {
        await ctx.reply("User not found");
        return;
      }
      await ctx.reply(
        `You've drank *${stats.totalAmount || 0} ml* today\\.\nYour goal is to drink *${currentUser.goal} ml* every day\\.`,
        {
          parse_mode: "MarkdownV2",
        },
      );
    }
  },
};
