# Drinky Bot

A Telegram bot that helps you track your daily water intake and stay hydrated. Set daily goals, log your water consumption, view statistics, and receive automated reminders to drink water throughout the day.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/flashblaze/drinky-bot)

## Features

- **Log Water Intake**: Track your daily water consumption with simple commands
- **Set Daily Goals**: Define and track your hydration goals
- **View Statistics**: Check your daily water intake progress
- **Smart Reminders**: Get automated reminders at customizable intervals to help you stay hydrated

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **API Framework**: [Hono](https://hono.dev/)
- **Bot Framework**: [Grammy](https://grammy.dev/)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) with SQLite via [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Linting and Formatting**: [oxc](https://oxc.rs/)

## Setup

### Prerequisites

- Node.js (v22 or higher)
- pnpm
- Cloudflare account with Workers and Durable Objects enabled
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

### Installation

```bash
pnpm install
```

### Development

1. Copy `.dev.vars.example` to `.dev.vars`

- Add your `BOT_TOKEN`:
- Set `MODE` to `development` when running locally. You can skip when deploying to Cloudflare.

```bash
cp .dev.vars.example .dev.vars
```

2. Start the development server:

```bash
pnpm run dev
```

### Deployment

Deploy to Cloudflare Workers:

```bash
pnpm run deploy
```

### Type Generation

Generate TypeScript types for Cloudflare bindings:

```bash
pnpm run cf-typegen
```

This generates the `CloudflareBindings` type that should be used when instantiating Hono:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

### Database Migrations

Generate new migrations after schema changes:

```bash
pnpm run db:generate
```
