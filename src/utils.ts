/**
 * Escapes special characters for Telegram MarkdownV2 format.
 * All special characters must be escaped: _ * [ ] ( ) ~ ` > # + - = | { } . !
 * @param text - Text to escape
 * @returns Escaped text safe for MarkdownV2
 */
export function escapeMarkdown(text: string): string {
  // Escape all MarkdownV2 special characters
  // Characters that need escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
  // Note: Backslashes are handled separately since they're used for escaping
  return text
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&"); // Then escape other special chars
}
