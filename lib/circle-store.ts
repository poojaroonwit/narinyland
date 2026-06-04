/**
 * Module-level store for the active AppKit circle/world ID.
 * Shared between React context (AuthProvider) and services/api.ts.
 */
let _activeCircleId: string | null = null;

export function getActiveCircleId(): string | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('narinyland_circle_id');
    return stored || _activeCircleId;
  }
  return _activeCircleId;
}

export function setActiveCircleId(id: string | null): void {
  _activeCircleId = id;
  if (typeof window !== 'undefined') {
    if (id) {
      localStorage.setItem('narinyland_circle_id', id);
      document.cookie = `narinyland_circle_id=${encodeURIComponent(id)}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`;
    } else {
      localStorage.removeItem('narinyland_circle_id');
      document.cookie = 'narinyland_circle_id=; Max-Age=0; Path=/; SameSite=Lax';
    }
  }
}
