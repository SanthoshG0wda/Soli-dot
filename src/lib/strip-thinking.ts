/** Remove model reasoning markup before assistant text is rendered in the UI. */
export function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think\b[^>]*>[\s\S]*?(?:<\/think\s*>|$)/gi, "")
    .replace(/<\/think\s*>/gi, "")
    .replace(/<think\b[^>]*$/gi, "")
    .replace(/<\/think\b[^>]*$/gi, "");
}
