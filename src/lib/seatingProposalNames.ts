/**
 * Turns an assistant proposal into a readable title and remembers it by id so
 * breadcrumb trails can name the proposal instead of printing a generic
 * "Proposal".
 *
 * Proposals have no title column: their identity comes from the scope they were
 * generated with ("Seat unseated only", "Full re-plan" and so on).
 */

const STORAGE_KEY = 'vowora.seating.proposalTitles';

type ProposalTitleMap = Record<string, string>;

let memory: ProposalTitleMap | null = null;

/** Scope keys used by the seating assistant, in the order the assistant offers them. */
export const PROPOSAL_SCOPE_LABELS: Record<string, string> = {
  unseated: 'Seat unseated only',
  improve: 'Improve current',
  rebalance: 'Rebalance tables',
  full: 'Full re-plan',
};

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function readStore(): ProposalTitleMap {
  if (memory) return memory;

  const map: ProposalTitleMap = {};

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

function persistStore(map: ProposalTitleMap): void {
  if (!hasWindow()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore persistence failures; the in-memory cache still works for this session.
  }
}

function humaniseScope(scope: string): string {
  const spaced = scope.replace(/[-_]+/g, ' ').trim();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Builds the proposal's own title from its scope, e.g. "Full re-plan proposal".
 * Returns undefined when the scope is missing so callers can fall back.
 */
export function proposalTitleFromScope(scope?: string | null): string | undefined {
  const key = scope?.trim();
  if (!key) return undefined;
  const base = PROPOSAL_SCOPE_LABELS[key] ?? humaniseScope(key);
  return `${base} proposal`;
}

/** Stores (or refreshes) the title for a proposal. */
export function rememberSeatingProposalTitle(
  proposalId?: string | null,
  scope?: string | null,
): void {
  const id = proposalId?.trim();
  const title = proposalTitleFromScope(scope);
  if (!id || !title) return;

  const map = readStore();
  if (map[id] === title) return;
  map[id] = title;
  persistStore(map);
}

/** Returns the remembered title for a proposal, if known. */
export function getSeatingProposalTitle(proposalId?: string | null): string | undefined {
  const id = proposalId?.trim();
  if (!id) return undefined;
  return readStore()[id];
}