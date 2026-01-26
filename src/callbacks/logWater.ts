import { InlineKeyboard } from "grammy";
import type { Callback } from "../bot/types";

const WATER_AMOUNTS = [
  { label: "100 ml", value: 100, callback: "log_water_100" },
  { label: "200 ml", value: 200, callback: "log_water_200" },
  { label: "250 ml", value: 250, callback: "log_water_250" },
  { label: "500 ml", value: 500, callback: "log_water_500" },
] as const;

export const logWaterCallbacks: Callback[] = [
  {
    pattern: "log_water",
    handler: async (ctx) => {
      await ctx.answerCallbackQuery();
      const keyboard = new InlineKeyboard()
        .text("100 ml", "log_water_100")
        .text("200 ml", "log_water_200")
        .row()
        .text("250 ml", "log_water_250")
        .text("500 ml", "log_water_500");

      await ctx.reply("💧 Choose amount", {
        reply_markup: keyboard,
      });
    },
  },
  ...WATER_AMOUNTS.map(
    (amount): Callback => ({
      pattern: amount.callback,
      handler: async (ctx) => {
        if (!ctx?.callbackQuery) {
          return;
        }

        await ctx.answerCallbackQuery();
        const stub = ctx.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
        await stub.insertWaterLog(amount.value);
        await ctx.reply(`💧 Logged ${amount.label}`);
      },
    }),
  ),
];
