import { Hono } from "hono";
import { Bot } from "grammy";
import type { env } from "cloudflare:workers";

const app = new Hono<{ Bindings: typeof env }>();

const createBot = (token: string) => {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply("Bot under construction");
  });

  return bot;
};

app.post("/webhook", async (c) => {
  try {
    const update = await c.req.json();
    const bot = createBot(c.env.BOT_TOKEN);
    await bot.init();

    // This is required for grammy to work in Cloudflare Workers
    await bot.handleUpdate(update);

    return c.json({ ok: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return c.json({ ok: false, error: "Failed to process update" }, 500);
  }
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

export default app;
