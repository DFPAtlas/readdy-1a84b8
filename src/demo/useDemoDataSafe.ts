import { useContext } from 'react';
import { DemoDataContext } from '@/demo/DemoDataProvider';
import type { DemoDataContextValue } from '@/demo/DemoDataProvider';

/**
 * Safe version of useDemoData — returns null when DemoDataProvider is
 * not in the tree (e.g. non-demo mode). Does not throw.
 *
 * Use this in pages that may render in both demo and non-demo modes.
 */
export function useDemoDataSafe(): DemoDataContextValue | null {
  return useContext(DemoDataContext);
}