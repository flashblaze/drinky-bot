import type { Command, Callback } from "./types";
import { startCommand } from "../commands/start";
import { logWaterCallbacks } from "../callbacks/log-water";
import { statsCallback } from "../callbacks/stats";
import { goalCommand } from "../commands/goal";
import { logCommand } from "../commands/log";
import { statsCommand } from "../commands/stats";
import { settingsCommand } from "../commands/settings";
import { settingsCallbacks } from "../callbacks/settings";
import { nextAlarmCallback } from "../callbacks/next-alarm";
import { devCommandsCallbacks } from "../callbacks/dev-commands";

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
  settingsCommand,
  // Add more commands here
];

export const callbacks: Callback[] = [
  ...logWaterCallbacks,
  statsCallback,
  ...settingsCallbacks,
  nextAlarmCallback,
  ...devCommandsCallbacks,
  // Add more callbacks here
];
