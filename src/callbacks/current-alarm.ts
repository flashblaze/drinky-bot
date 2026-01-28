import type { Callback } from "../bot/types";

export const currentAlarmCallback: Callback = {
  pattern: "get_current_alarm",
  handler: async (ctx) => {
    if (!ctx?.callbackQuery) {
      return;
    }

    await ctx.answerCallbackQuery();

    const stub = ctx.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
    const alarm = await stub.getCurrentAlarm();
    await ctx.reply(`Current alarm: ${alarm}`);
  },
};
