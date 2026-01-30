import type { Command } from "../bot/types";

export const logCommand: Command = {
  name: "log",
  description: "Log water intake. Enter /log <amount> to log water in ml",
  handler: async (ctx) => {
    if (!ctx?.message) {
      return;
    }

    if (!ctx.match) {
      await ctx.reply("Please enter the amount of water you drank in ml\\. Example: /log 250", {
        parse_mode: "MarkdownV2",
      });
      return;
    }

    const amount = Number(ctx.match);

    if (isNaN(amount)) {
      await ctx.reply("Please enter a valid amount in ml. Example: /log 250");
      return;
    }

    if (amount <= 0 || amount > 10000) {
      await ctx.reply("Please enter a valid amount in ml. Amount must be between 1 and 10000 ml.");
      return;
    }

    const stub = ctx.env.DRINKY_STATE.getByName(ctx.message.from.id.toString());
    await stub.insertWaterLog(amount);

    await ctx.reply(`💧 Logged ${amount} ml`);
  },
};
