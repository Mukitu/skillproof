
export function snapshotFallback<T>(
  snapshot: T | null | undefined,
  joined: T | null | undefined,
  archivedLabel: string = '[Archived]',
): T | string {
  if (snapshot !== null && snapshot !== undefined && snapshot !== '') {
    return snapshot;
  }
  if (joined !== null && joined !== undefined && joined !== '') {
    return joined;
  }
  return archivedLabel;
}


export function snapshotFallbackList<T>(
  snapshot: T[] | null | undefined,
  joined: T[] | null | undefined,
  placeholder: T[] = [] as T[],
): T[] {
  if (snapshot && snapshot.length > 0) return snapshot;
  if (joined && joined.length > 0) return joined;
  return placeholder;
}


export function printable(value: unknown, fallback: string = '—'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.length > 0 ? value : fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return fallback;
}
