import type { Command } from "../bot/types";

export const goalCommand: Command = {
  name: "goal",
  description: "Set your goal. Enter /goal <goal> to set your goal in ml",
  handler: async (ctx) => {
    if (!ctx?.message) {
      return;
    }

    if (!ctx.match) {
      const stub = ctx.env.DRINKY.getByName(ctx.message.from.id.toString());
      const currentUser = await stub.selectCurrentUser();
      if (!currentUser) {
        await ctx.reply("User not found");
        return;
      }
      await ctx.reply(
        `Your current goal is *${currentUser.goal} ml*\\.\nPlease enter your goal in ml\\. Example: /goal 1000`,
        { parse_mode: "MarkdownV2" },
      );
      return;
    }

    const transformed = Number(ctx.match);

    if (isNaN(transformed)) {
      await ctx.reply("Please enter a valid goal in ml. Example: /goal 1000");
      return;
    }

    if (transformed < 0 || transformed > 10000) {
      await ctx.reply("Please enter a valid goal in ml. Goal must be between 0 and 10000 ml.");
      return;
    }

    const stub = ctx.env.DRINKY.getByName(ctx.message.from.id.toString());
    await stub.updateGoal(transformed);

    await ctx.reply(`Goal set to ${transformed} ml`);
  },
};
