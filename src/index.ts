import { Hono } from "hono";
import { Bot, InlineKeyboard } from "grammy";
import type { env } from "cloudflare:workers";
import { DurableObject } from "cloudflare:workers";
import { drizzle, DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import migrations from "../drizzle/migrations";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { userTable, waterLogTable } from "./db/schema";
import { relations } from "./db/relations";
import { desc, eq, sum } from "drizzle-orm";

const app = new Hono<{ Bindings: typeof env }>();

export class Drinky extends DurableObject {
  storage: DurableObjectStorage;
  db: DrizzleSqliteDODatabase<any>;

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.db = drizzle(this.storage, { logger: false, relations });
    // Make sure all migrations complete before accepting queries.
    // Otherwise you will need to run `this.migrate()` in any function
    // that accesses the Drizzle database `this.db`.

    // oxlint-disable-next-line typescript/no-floating-promises
    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();
    });
  }

  async insert(user: typeof userTable.$inferInsert) {
    return this.db.insert(userTable).values(user).returning().get();
  }

  async insertWaterLog(quantity: number) {
    const currentUser = await this.selectCurrentUser();
    if (!currentUser) {
      throw new Error("User not found");
    }
    return this.db
      .insert(waterLogTable)
      .values({
        amount: quantity,
        userId: currentUser.id,
      })
      .returning()
      .get();
  }

  async getStats() {
    const currentUser = await this.selectCurrentUser();
    console.log(currentUser, "currentUser");
    if (!currentUser) {
      throw new Error("User not found");
    }
    const stats = this.db
      .select({
        totalAmount: sum(waterLogTable.amount),
      })
      .from(waterLogTable)
      .where(eq(waterLogTable.userId, currentUser.id))
      .orderBy(desc(waterLogTable.createdAt))
      .get();
    return stats;
  }

  async selectCurrentUser() {
    return this.db.select().from(userTable).get();
  }

  async _migrate() {
    // oxlint-disable-next-line typescript/no-floating-promises
    migrate(this.db, migrations);
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
      if (!ctx?.message) {
        return;
      }
      const stub = c.env.DRINKY.getByName(ctx.message.from.id.toString());
      const existingUser = await stub.selectCurrentUser();
      if (existingUser) {
        const name =
          existingUser.firstName && existingUser.lastName
            ? `${existingUser.firstName} ${existingUser.lastName}`
            : existingUser.username;
        const keyboard = new InlineKeyboard()
          .text("💧 Log Water", "log_water")
          .row()
          .text("📊 Stats", "stats");

        await ctx.reply(`👋 Welcome to Drinky ${name}!\n\nTrack your daily hydration easily.`, {
          reply_markup: keyboard,
        });
      } else {
        if (!ctx?.message) {
          return;
        }
        const newUser = await stub.insert({
          telegramId: ctx.message.from.id,
          username: ctx.message.from.username ?? "",
          languageCode: ctx.message.from.language_code ?? "",
          firstName: ctx.message.from.first_name,
          lastName: ctx.message.from.last_name ?? "",
        });
        const name =
          newUser.firstName && newUser.lastName
            ? `${newUser.firstName} ${newUser.lastName}`
            : newUser.username;
        const keyboard = new InlineKeyboard()
          .text("💧 Log Water", "log_water")
          .row()
          .text("📊 Stats", "stats");

        await ctx.reply(`👋 Welcome to Drinky ${name}!\n\nTrack your daily hydration easily.`, {
          reply_markup: keyboard,
        });
      }
    });

    bot.callbackQuery("log_water", async (ctx) => {
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
    });

    bot.callbackQuery("log_water_100", async (ctx) => {
      await ctx.answerCallbackQuery();

      const stub = c.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
      await stub.insertWaterLog(100);
      await ctx.reply("💧 Logged 100 ml");
    });

    bot.callbackQuery("log_water_200", async (ctx) => {
      await ctx.answerCallbackQuery();
      const stub = c.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
      await stub.insertWaterLog(200);
      await ctx.reply("💧 Logged 200 ml");
    });

    bot.callbackQuery("log_water_250", async (ctx) => {
      await ctx.answerCallbackQuery();
      const stub = c.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
      await stub.insertWaterLog(250);
      await ctx.reply("💧 Logged 250 ml");
    });

    bot.callbackQuery("log_water_500", async (ctx) => {
      await ctx.answerCallbackQuery();
      const stub = c.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
      await stub.insertWaterLog(500);
      await ctx.reply("💧 Logged 500 ml");
    });

    bot.callbackQuery("stats", async (ctx) => {
      await ctx.answerCallbackQuery();

      const stub = c.env.DRINKY.getByName(ctx.callbackQuery.from.id.toString());
      const stats = await stub.getStats();

      if (!stats) {
        await ctx.reply("No stats found");
      } else {
        await ctx.reply(`📊 Total amount: ${stats.totalAmount} ml`);
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
