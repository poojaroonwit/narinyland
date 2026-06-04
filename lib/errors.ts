export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return String(error);
}

export function getErrorField(error: unknown, field: string): unknown {
  if (!error || typeof error !== 'object') return undefined;
  return (error as Record<string, unknown>)[field];
}
