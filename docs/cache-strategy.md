# Cache Strategy — Vowora

**Date:** 2026-08-05
**Version:** 1.0

---

## Overview

This document defines what Vowora caches, where, for how long, and how invalidation works. All caching decisions must respect:
- Wedding-scoped data isolation
- Authentication boundaries
- Guest token privacy
- RLS enforcement

---

## Cache Layers

### 1. Browser HTTP Cache (CDN)

**Cached:**
- Static assets (JS bundles, CSS, fonts, icons)
- Public images (hero images, marketing assets)
- Public wedding website HTML (if not authenticated)

**Not cached:**
- Authenticated page responses
- Guest portal pages
- Invitation landing pages
- Admin pages
- API responses from Supabase

**Cache duration:**
- Static assets: 1 year (fingerprinted via Vite build)
- Public pages: 1 hour (with revalidation)

---

### 2. Supabase Realtime Cache (Client-side)

**Not a cache per se** — Realtime delivers live updates. Data is stored in React component state, not a shared cache.

**Invalidation:**
- Realtime subscription teardown on unmount
- Active wedding change clears all state
- Manual refresh via UI button
- Stale data replaced by Realtime events

---

### 3. Demo Mode Local Storage

**Cached:** Demo wedding state (guest list, tasks, seating, etc.)
**Key:** `vowora.demo.state.v1`
**Duration:** Session — cleared on logout or reset
**Invalidation:** Reset button, logout, version bump

---

### 4. Supabase Auth Session

**Cached:** JWT token, refresh token
**Duration:** Configurable via Supabase Auth settings
**Storage:** localStorage (with Supabase SDK)

---

### 5. Client-side React State

**Not a cache** — React state is ephemeral and wedding-scoped.

---

## What Must NOT Be Cached

| Data Type | Reason |
|---|---|
| Authenticated dashboards | Contains per-wedding private data |
| Guest token pages | Tokens are single-use / time-limited |
| RSVP responses | May change, must reflect current state |
| Invitations | May expire or be revoked |
| Private exports | Contains PII, must require authentication |
| Draft website data | Not yet published, must not leak |
| Billing records | Financial data, must be current |
| Guest contact details | PII, must not be cached |
| Collaborator lists | May change, must be current |

---

## Cache Invalidation Rules

### Static Assets
- Vite build fingerprints assets with content hash
- New deployment → new URLs → old cache naturally expires

### Public Pages
- CDN cache: 1 hour max-age
- Revalidate on new deployment (ETag/Last-Modified)

### Supabase Data
- No server-side caching of authenticated data
- Client revalidates on:
  - Navigation to page
  - Realtime subscription event
  - Manual refresh action
  - Active wedding change

---

## Wedding Scope Isolation

**Rule:** Never cache data in a way that could be served to a different wedding.

**Enforcement:**
- All Supabase queries include `wedding_id` filter
- RLS enforces wedding-scoped access at database level
- Realtime channels are wedding-scoped (`wedding:{id}:*`)
- React state is per-component, not global

---

## Performance Implications

### Without caching:
- Every page load hits Supabase → consistent but potentially slow

### With appropriate caching:
- Static assets served from CDN (fast)
- Public wedding pages served quickly
- Authenticated pages always fetch fresh data (necessary for correctness)

### Trade-offs:
- No cache = always correct, potentially slower
- Aggressive cache = faster, risk of stale/leaked data
- **Vowora's approach:** Cache only what's safe, always fetch fresh for authenticated data

---

## Future Improvements

1. **SWR (stale-while-revalidate) for public wedding pages:**
   - Serve cached version immediately
   - Revalidate in background
   - Only for public, non-authenticated pages

2. **Memoisation for expensive client computations:**
   - Already applied via `useMemo` for filtered lists
   - Consider `React.memo` for pure-UI components if profiling shows benefit

3. **Service Worker for offline support:**
   - Cache static shell + public assets
   - Never cache authenticated data
   - Low priority — wedding planning is inherently online

---

*This strategy prioritises data correctness and privacy over raw speed. Wedding data isolation is never compromised for performance.*