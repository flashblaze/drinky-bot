import type { Command, Callback } from "./types";
import { startCommand } from "../commands/start";
import { logWaterCallbacks } from "../callbacks/logWater";
import { statsCallback } from "../callbacks/stats";

/**
 * Registry of all commands and callbacks.
 * To add a new command or callback:
 * 1. Create the handler file in commands/ or callbacks/
 * 2. Import it here
 * 3. Add it to the appropriate array
 */
export const commands: Command[] = [
  startCommand,
  // Add more commands here
];

export const callbacks: Callback[] = [
  ...logWaterCallbacks,
  statsCallback,
  // Add more callbacks here
];
