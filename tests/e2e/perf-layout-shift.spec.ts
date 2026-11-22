/**
 * Layout stability (CLS) across every public, guest and app route.
 *
 * Each route loads with fixture data. Layout shifts are summed for 4 seconds,
 * excluding shifts caused by input. The Core Web Vitals "good" threshold is 0.1.
 * Runs in the full route sweep job (@sweep).
 */
import { test, expect } from '@playwright/test';
import { mockBackend, seedBrowserState } from './helpers/smokeHarness';
import { APP_ROUTES, GUEST_ROUTES, PUBLIC_ROUTES, type SmokeRoute } from './helpers/smokeRoutes';

const CLS_BUDGET = 0.1;

async function measure(page: import('@playwright/test').Page, route: SmokeRoute, authenticated: boolean) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number; __shifts: string[] };
    w.__cls = 0;
    w.__shifts = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: Array<{ node?: Node }> }>) {
        if (entry.hadRecentInput) continue;
        w.__cls += entry.value;
        const node = entry.sources?.[0]?.node as Element | undefined;
        w.__shifts.push(`${entry.value.toFixed(3)} ${node?.tagName || '?'}.${String(node?.className || '').split(' ').slice(0, 3).join('.')}`);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await seedBrowserState(page, { authenticated });
  await mockBackend(page);
  await page.goto(route.path);
  await page.waitForTimeout(4000);
  return page.evaluate(() => {
    const w = window as unknown as { __cls: number; __shifts: string[] };
    return { cls: w.__cls, shifts: w.__shifts.slice(0, 5) };
  });
}

const groups: Array<[string, SmokeRoute[], boolean]> = [
  ['public', PUBLIC_ROUTES, false],
  ['guest', GUEST_ROUTES, false],
  ['app', APP_ROUTES, true],
];

for (const [group, routes, authenticated] of groups) {
  for (const route of routes) {
    test(`@sweep layout stays stable: ${group} ${route.path}`, async ({ page }) => {
      const { cls, shifts } = await measure(page, route, authenticated);
      expect(cls, `CLS ${cls.toFixed(3)} on ${route.path}: ${shifts.join(' | ')}`).toBeLessThan(CLS_BUDGET);
    });
  }
}
