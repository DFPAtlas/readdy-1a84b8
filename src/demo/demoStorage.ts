import { DEMO_CONFIG } from './demoConfig';
import type { DemoState } from './demoTypes';

export function loadDemoState(): DemoState | null {
  try {
    const raw = localStorage.getItem(DEMO_CONFIG.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed._version !== DEMO_CONFIG.storageVersion) return null;
    if (!parsed._state) return null;
    return parsed._state as DemoState;
  } catch {
    return null;
  }
}

export function saveDemoState(state: DemoState): void {
  try {
    const payload = {
      _version: DEMO_CONFIG.storageVersion,
      _lastSaved: new Date().toISOString(),
      _state: state,
    };
    localStorage.setItem(DEMO_CONFIG.storageKey, JSON.stringify(payload));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function clearDemoState(): void {
  try {
    localStorage.removeItem(DEMO_CONFIG.storageKey);
  } catch {
    // ignore
  }
}

export function getLastInitialised(): string | null {
  try {
    const raw = localStorage.getItem(DEMO_CONFIG.storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed._lastSaved || null;
  } catch {
    return null;
  }
}