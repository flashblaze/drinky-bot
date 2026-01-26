/**
 * Example command handler - DELETE THIS FILE when creating your own commands
 *
 * To create a new command:
 * 1. Copy this file and rename it (e.g., help.ts, settings.ts)
 * 2. Update the command name and handler logic
 * 3. Import and add it to src/bot/registry.ts
 */

import type { Command } from "../bot/types";

export const exampleCommand: Command = {
  name: "example",
  handler: async (ctx) => {
    // Access environment variables via ctx.env
    // Access DurableObject via ctx.env.DRINKY.getByName(userId)
    // Access message data via ctx.message

    if (!ctx?.message) {
      return;
    }

    await ctx.reply("This is an example command!");
  },
};
