import type { Context } from "grammy";
import type { env } from "cloudflare:workers";

export interface BotContext extends Context {
  env: typeof env;
}

export type CommandHandler = (ctx: BotContext) => Promise<void>;
export type CallbackHandler = (ctx: BotContext) => Promise<void>;

export interface Command {
  name: string;
  description: string;
  handler: CommandHandler;
}

export interface Callback {
  pattern: string | RegExp;
  handler: CallbackHandler;
}
