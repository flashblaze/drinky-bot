import { Hono } from "hono";
import type { env } from "cloudflare:workers";
import { DrinkyState } from "./drinky-state-do";
import { setupBot } from "./bot/setup";
import { commands, callbacks } from "./bot/registry";

const app = new Hono<{ Bindings: typeof env }>();

export { DrinkyState };

app.post("/webhook", async (c) => {
  try {
    const update = await c.req.json();

    const bot = await setupBot({
      token: c.env.BOT_TOKEN,
      env: c.env,
      commands,
      callbacks,
    });

    await bot.api.setMyCommands(
      commands.map((command) => ({
        command: command.name,
        description: command.description,
      })),
    );

    // This is required for grammy to work in Cloudflare Workers. Also, this has to go after the commands are registered.
    await bot.handleUpdate(update);

    return c.json({ ok: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return c.json({ ok: false, error: "Failed to process update" }, 500);
  }
});

export default app;
