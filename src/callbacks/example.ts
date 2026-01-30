/**
 * Example callback handler - DELETE THIS FILE when creating your own callbacks
 *
 * To create a new callback:
 * 1. Copy this file and rename it (e.g., settings.ts, help.ts)
 * 2. Update the callback pattern and handler logic
 * 3. Import and add it to src/bot/registry.ts
 */

import type { Callback } from "../bot/types";

export const exampleCallback: Callback = {
  pattern: "example_callback", // Can also be a RegExp for pattern matching
  handler: async (ctx) => {
    // Always answer callback queries to remove loading state
    await ctx.answerCallbackQuery();

    // Access environment variables via ctx.env
    // Access DurableObject via ctx.env.DRINKY_STATE.getByName(userId)
    // Access callback data via ctx.callbackQuery

    await ctx.reply("This is an example callback.");
  },
};
