import type { Callback } from "../bot/types";

export const devCommandsCallbacks: Callback[] = [
  {
    pattern: "delete_user",
    handler: async (ctx) => {
      if (!ctx?.callbackQuery) {
        return;
      }

      await ctx.answerCallbackQuery();

      const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
      await stub.deleteUser();

      await ctx.reply("User deleted.");
    },
  },
];
