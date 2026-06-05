function isDebugEnabled(): boolean {
  return process.env.NARINYLAND_DEBUG === 'true' || process.env.NODE_ENV === 'development';
}

export function debugLog(message: string, details?: unknown): void {
  if (!isDebugEnabled()) return;
  if (details === undefined) {
    console.log(message);
    return;
  }
  console.log(message, details);
}

export function debugWarn(message: string, details?: unknown): void {
  if (!isDebugEnabled()) return;
  if (details === undefined) {
    console.warn(message);
    return;
  }
  console.warn(message, details);
}
