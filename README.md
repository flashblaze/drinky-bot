# Drinky Bot 💧

A Telegram bot that helps you track your daily water intake and stay hydrated. Set daily goals, log your water consumption, view statistics, and receive automated reminders to drink water throughout the day.

## Features

- 💧 **Log Water Intake**: Track your daily water consumption with simple commands
- 🎯 **Set Daily Goals**: Define and track your hydration goals
- 📊 **View Statistics**: Check your daily water intake progress
- ⏰ **Smart Reminders**: Get automated reminders at customizable intervals to help you stay hydrated
- 🎉 **Goal Celebrations**: Receive congratulatory messages when you reach your daily goal

## Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless edge computing platform
- **Web Framework**: [Hono](https://hono.dev/) - Fast, lightweight web framework
- **Bot Framework**: [Grammy](https://grammy.dev/) - Modern Telegram bot framework for TypeScript
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) with SQLite via [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Linting**: [oxlint](https://oxc-project.github.io/docs/lint/)
- **Formatting**: [oxfmt](https://oxc-project.github.io/docs/formatter/)
- **Database Migrations**: Drizzle Kit

## Architecture

The bot uses Cloudflare Durable Objects to provide persistent, per-user storage. Each user gets their own Durable Object instance that manages their water logs, goals, and reminder settings. This architecture ensures:

- **Data Isolation**: Each user's data is stored separately
- **Consistency**: Strong consistency guarantees for user data
- **Scalability**: Automatic scaling with Cloudflare's edge network
- **Reliability**: Built-in persistence and state management

## Setup

### Prerequisites

- Node.js (v18 or higher)
- pnpm
- Cloudflare account with Workers and Durable Objects enabled
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

### Installation

```bash
pnpm install
```

### Development

1. Copy `.dev.vars.example` to `.dev.vars` and add your `BOT_TOKEN`:

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
