/**
 * Remembers seating plan names by id so breadcrumb trails can name the plan
 * instead of printing a generic "Seating plan".
 *
 * Backed by an in-memory map plus sessionStorage, so a sub-page loaded directly
 * (or after a reload) can still resolve the plan name without a network round trip.
 */

const STORAGE_KEY = 'vowora.seating.planNames';

type PlanNameMap = Record<string, string>;

let memory: PlanNameMap | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function readStore(): PlanNameMap {
  if (memory) return memory;

  const map: PlanNameMap = {};

  if (hasWindow()) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
            if (typeof value === 'string' && value.trim()) map[key] = value.trim();
          });
        }
      }
    } catch {
      // Storage can be unavailable (private mode / quota) – fall back to memory only.
    }
  }

  memory = map;
  return memory;
}

function persistStore(map: PlanNameMap): void {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore persistence failures; the in-memory cache still works for this session.
  }
}

/** Stores (or refreshes) the display name for a seating plan. */
export function rememberSeatingPlanName(
  planId?: string | null,
  name?: string | null,
): void {
  const id = planId?.trim();
  const label = name?.trim();
  if (!id || !label) return;

  const map = readStore();
  if (map[id] === label) return;
  map[id] = label;
  persistStore(map);
}

/** Returns the remembered display name for a seating plan, if known. */
export function getSeatingPlanName(planId?: string | null): string | undefined {
  const id = planId?.trim();
  if (!id) return undefined;
  return readStore()[id];
}