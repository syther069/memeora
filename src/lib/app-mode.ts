export type AppMode = 'personal' | 'business';

/** Which workspace a request is for. It only selects within the session's own data. */
export const APP_MODE_HEADER = 'x-memeora-mode';

export function isAppMode(value: unknown): value is AppMode {
  return value === 'personal' || value === 'business';
}

/** The request's workspace, or null if the header holds something unknown. No header means Personal. */
export function readAppMode(request: { headers: { get(name: string): string | null } }): AppMode | null {
  const value = request.headers.get(APP_MODE_HEADER);
  if (value === null) return 'personal';
  return isAppMode(value) ? value : null;
}

export const INVALID_MODE_MESSAGE = 'Mode must be personal or business.';
