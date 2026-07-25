// ── Re-exports from ActiveWeddingProvider context ──
// All existing imports from '@/hooks/useActiveWedding' continue to work unchanged.

export {
  ActiveWeddingProvider,
  useActiveWedding,
  setActiveWeddingId,
  clearActiveWedding,
} from '@/context/ActiveWeddingProvider';

export type {
  ActiveWedding,
  WeddingState,
  ActiveWeddingContextValue,
} from '@/context/ActiveWeddingProvider';