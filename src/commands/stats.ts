import type { Command } from "../bot/types";

export const statsCommand: Command = {
  name: "stats",
  description: "Show today's water intake statistics",
  handler: async (ctx) => {
    if (!ctx?.message) {
      return;
    }

    const stub = ctx.env.DRINKY.getByName(ctx.message.from.id.toString());

    const timestamp = ctx.message.date ? ctx.message.date * 1000 : Date.now();
    const stats = await stub.getStats(timestamp);

    if (!stats) {
      await ctx.reply("No stats found");
      return;
    }

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
  },
};
