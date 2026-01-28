import type { Command, Callback } from "./types";
import { startCommand } from "../commands/start";
import { logWaterCallbacks } from "../callbacks/logWater";
import { statsCallback } from "../callbacks/stats";
import { goalCommand } from "../commands/goal";
import { logCommand } from "../commands/log";
import { statsCommand } from "../commands/stats";
import { reminderCommand } from "../commands/reminder";
import { reminderCallbacks } from "../callbacks/reminder";
import { currentAlarmCallback } from "../callbacks/current-alarm";

/**
 * Registry of all commands and callbacks.
 * To add a new command or callback:
 * 1. Create the handler file in commands/ or callbacks/
 * 2. Import it here
 * 3. Add it to the appropriate array
 */
export const commands: Command[] = [
  startCommand,
  goalCommand,
  logCommand,
  statsCommand,
  reminderCommand,
  // Add more commands here
];

export const callbacks: Callback[] = [
  ...logWaterCallbacks,
  statsCallback,
  ...reminderCallbacks,
  currentAlarmCallback,
  // Add more callbacks here
];
