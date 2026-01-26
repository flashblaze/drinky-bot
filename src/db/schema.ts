import { type InferSelectModel } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
  "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_",
  24,
);

const timeStamps = {
  createdAt: text()
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text()
    .notNull()
    .$onUpdate(() => new Date().toISOString())
    .$defaultFn(() => new Date().toISOString()),
};

export const userTable = sqliteTable(
  "user",
  {
    id: text().primaryKey().$defaultFn(nanoid),
    telegramId: integer().notNull(),
    firstName: text(),
    lastName: text(),
    username: text().notNull(),
    languageCode: text().notNull(),
    ...timeStamps,
  },
  (table) => [
    index("usernameIdx").on(table.username),
    index("userIdIdx").on(table.id),
    index("telegramIdIdx").on(table.telegramId),
  ],
);

export const waterLogTable = sqliteTable("water_log", {
  id: text().primaryKey().$defaultFn(nanoid),
  userId: text().references(() => userTable.id),
  amount: integer().notNull(),
  ...timeStamps,
});

export type User = InferSelectModel<typeof userTable>;

export type WaterLog = InferSelectModel<typeof waterLogTable>;
