import { Hono } from "hono";
import { Bot } from "grammy";
import type { env } from "cloudflare:workers";
import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import migrations from "../drizzle/migrations";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { userTable } from "./db/schema";

const app = new Hono<{ Bindings: typeof env }>();

export class Drinky extends DurableObject {
  storage: DurableObjectStorage;
  db: DrizzleSqliteDODatabase<any>;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.db = drizzle(this.storage, { logger: false });
    // Make sure all migrations complete before accepting queries.
    // Otherwise you will need to run `this.migrate()` in any function
    // that accesses the Drizzle database `this.db`.
    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();
    });
  }

  async insert(user: typeof userTable.$inferInsert) {
    return this.db.insert(userTable).values(user).returning().get();
  }
  async selectCurrentUser() {
    return this.db.select().from(userTable).get();
  }
  async _migrate() {
    migrate(this.db, migrations);
  }

  async deleteAll() {
    await this.db.delete(userTable);
  }
}

const createBot = (token: string) => {
  const bot = new Bot(token);

  return bot;
};

app.post("/webhook", async (c) => {
  try {
    const update = await c.req.json();
    const bot = createBot(c.env.BOT_TOKEN);
    await bot.init();

    bot.command("start", async (ctx) => {
      const stub = c.env.DRINKY.getByName(update.message.from.id.toString());
      const existingUser = await stub.selectCurrentUser();
      if (existingUser) {
        await ctx.reply("You are already registered");
      } else {
        await ctx.reply("You aren't registered yet. Registering you now...");
        const newUser = await stub.insert({
          telegramId: update.message.from.id,
          username: update.message.from.username,
          languageCode: update.message.from.language_code,
          firstName: update.message.from.first_name,
          lastName: update.message.from.last_name,
        });
        const name =
          newUser.firstName && newUser.lastName
            ? `${newUser.firstName} ${newUser.lastName}`
            : newUser.username;
        await ctx.reply(`Welcome ${name}`);
      }
    });

    // This is required for grammy to work in Cloudflare Workers. Also, this has to go after the commands are registered.
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
