import type { Callback } from "../bot/types";

export const nextAlarmCallback: Callback = {
  pattern: "get_next_alarm",
  handler: async (ctx) => {
    if (!ctx?.callbackQuery) {
      return;
    }

    await ctx.answerCallbackQuery();

    const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
    const alarm = await stub.getNextAlarm();
    await ctx.reply(`Next alarm: ${alarm}`);
  },
};
