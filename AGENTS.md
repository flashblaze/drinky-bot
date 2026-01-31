# AGENTS.md - Drinky Bot

This document provides context and guidelines for AI agents working on the Drinky Bot codebase.

## Project Overview

Drinky Bot is a Telegram bot that helps users track their daily water intake. It's built as a Cloudflare Worker using serverless architecture with per-user state management via Durable Objects.

## Tech Stack

- **Runtime**: Cloudflare Workers (serverless edge computing)
- **Web Framework**: Hono - Fast, lightweight web framework
- **Bot Framework**: Grammy - Modern Telegram bot framework for TypeScript
- **Database**: Drizzle ORM with SQLite via Cloudflare Durable Objects
- **Language**: TypeScript (strict mode, ESNext)
- **Package Manager**: pnpm
- **Linting**: oxlint
- **Formatting**: oxfmt
- **Migrations**: Drizzle Kit

## Architecture

### Core Concepts

1. **Durable Objects**: Each user gets their own Durable Object instance (`DrinkyState`) that manages:
   - User data and settings
   - Water logs
   - Reminder configurations
   - Database operations (SQLite via Durable Object storage)

2. **Command/Callback Pattern**:
   - **Commands**: Slash commands (e.g., `/start`, `/log`, `/stats`)
   - **Callbacks**: Inline keyboard button interactions (e.g., `log_water`, `stats`)

3. **Registry System**: All commands and callbacks are registered in `src/bot/registry.ts` and automatically wired up in `src/bot/setup.ts`

## Project Structure

```
src/
├── bot/
│   ├── registry.ts      # Central registry of all commands and callbacks
│   ├── setup.ts         # Bot initialization and command/callback registration
│   └── types.ts         # TypeScript types for Command, Callback, BotContext
├── commands/            # Slash command handlers
│   ├── start.ts
│   ├── log.ts
│   ├── goal.ts
│   ├── stats.ts
│   └── settings.ts
├── callbacks/          # Inline keyboard callback handlers
│   ├── logWater.ts
│   ├── stats.ts
│   ├── reminder.ts
│   └── next-alarm.ts
├── db/
│   ├── schema.ts        # Drizzle ORM schema definitions
│   └── relations.ts     # Database relations
├── drinky-state-do.ts   # Durable Object class with all state management logic
└── index.ts             # Main entry point (Hono webhook handler)
```

## Key Patterns

### Adding a New Command

1. Create a file in `src/commands/` (e.g., `src/commands/mycommand.ts`)
2. Export a `Command` object with `name`, `description`, and `handler`:

```typescript
import type { Command } from "../bot/types";

export const myCommand: Command = {
  name: "mycommand",
  description: "Description shown in /help",
  handler: async (ctx) => {
    // Access Durable Object: ctx.env.DRINKY_STATE.getByName(userId)
    // Access user data: await stub.selectCurrentUser()
    // Send reply: await ctx.reply("Message")
  },
};
```

3. Import and add to `commands` array in `src/bot/registry.ts`

### Adding a New Callback

1. Create a file in `src/callbacks/` (e.g., `src/callbacks/mycallback.ts`)
2. Export a `Callback` object or array with `pattern` and `handler`:

```typescript
import type { Callback } from "../bot/types";

export const myCallback: Callback = {
  pattern: "my_callback_pattern", // or RegExp
  handler: async (ctx) => {
    await ctx.answerCallbackQuery(); // Always answer callback queries
    // Handle the callback
  },
};
```

3. Import and add to `callbacks` array in `src/bot/registry.ts`

### Accessing Durable Objects

Always access the Durable Object using the user's Telegram ID:

```typescript
const stub = ctx.env.DRINKY_STATE.getByName(ctx.message.from.id.toString());
// or for callbacks:
const stub = ctx.env.DRINKY_STATE.getByName(ctx.callbackQuery.from.id.toString());
```

4. Always use ES6 features and best practices.

### Database Operations

All database operations are methods on the `DrinkyState` Durable Object class:

- `insert(user)` - Create a new user
- `selectCurrentUser()` - Get current user
- `insertWaterLog(quantity)` - Log water intake
- `getStats(timestamp)` - Get daily stats
- `getReminderSettings()` - Get reminder configuration
- `updateReminderSettings(settings)` - Update reminder settings
- `setAlarm(timestamp)` - Schedule a reminder alarm

### Inline Keyboards

Use Grammy's `InlineKeyboard` for interactive buttons:

```typescript
import { InlineKeyboard } from "grammy";

const keyboard = new InlineKeyboard()
  .text("Button 1", "callback_data_1")
  .row() // New row
  .text("Button 2", "callback_data_2");

await ctx.reply("Message", { reply_markup: keyboard });
```

## Code Style & Conventions

1. **TypeScript**: Strict mode enabled, prefer explicit types
2. **Error Handling**: Always check for `ctx.message` or `ctx.callbackQuery` existence
3. **Callback Queries**: Always call `ctx.answerCallbackQuery()` before processing
4. **Markdown**: Use `parse_mode: "MarkdownV2"` when sending formatted messages (escape special chars)
5. **Async/Await**: Prefer async/await over promises
6. **Null Checks**: Always validate user existence before operations

## Database Schema

- **userTable**: Stores user information, goals, and reminder settings
- **waterLogTable**: Stores individual water intake logs with timestamps

Both tables use:

- Custom nanoid for IDs (24 chars, alphanumeric + underscore)
- Automatic `createdAt` and `updatedAt` timestamps
- Indexes on commonly queried fields

## Environment Variables

- `BOT_TOKEN`: Telegram bot token (required)
- Access via `ctx.env.BOT_TOKEN` in handlers

## Development Workflow

1. **Local Development**: `pnpm run dev` (uses Wrangler dev server)
2. **Database Migrations**: `pnpm run db:generate` after schema changes
3. **Linting**: `pnpm run lint` (oxlint)
4. **Formatting**: `pnpm run fmt` (oxfmt)
5. **Deployment**: `pnpm run deploy` (minified for production)

## Common Tasks

### Adding a New Database Field

1. Update schema in `src/db/schema.ts`
2. Run `pnpm run db:generate` to create migration
3. Update Durable Object methods if needed
4. Update handlers that use the new field

### Adding Reminder Logic

Reminders use Cloudflare Durable Object alarms:

- `setAlarm(timestamp)` - Schedule an alarm
- `getNextAlarm()` - Get next scheduled alarm time
- Alarms trigger the `alarm()` method in `DrinkyState`

### Query Performance

- All database queries use Drizzle ORM with proper indexes
- User lookups use indexed `telegramId` field
- Stats queries filter by date ranges with indexed `createdAt`
- Consider query performance when adding new database operations

## Testing Considerations

- Commands should handle missing `ctx.message`
- Callbacks should handle missing `ctx.callbackQuery`
- Always validate user existence before database operations
- Handle edge cases (invalid input, missing data, etc.)
- Test with different timezones for reminder functionality

## Important Notes

- **Durable Object Isolation**: Each user's data is isolated in their own Durable Object instance
- **State Persistence**: Durable Objects persist state automatically
- **Migrations**: Run automatically on Durable Object initialization
- **Webhook**: Bot receives updates via POST `/webhook` endpoint
- **Commands Registration**: Commands are registered with Telegram on each webhook call
