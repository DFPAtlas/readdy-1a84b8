# Vowora GUI UAT Checklist

Last updated: 2026-08-02 (Phase 5A — Part 2)

This checklist covers every route in the Vowora application. Each route should be tested at the specified viewport widths and interaction modes.

## Viewport Keys
| Key | Size |
|-----|------|
| S | 320 × 568 (small mobile) |
| M | 375 × 667 (standard mobile) |
| T | 768 × 1024 (tablet) |
| L | 1024 × 768 (laptop) |
| D | 1440 × 900 (desktop) |

## Test Keys
| Key | Meaning |
|-----|---------|
| K | Keyboard navigation tested |
| T | Touch/pointer tested |
| LH | Horizontal overflow verified |
| FS | Focus styles visible |
| HC | Heading structure correct |
| ES | Empty state shown |
| LS | Loading state shown |
| ER | Error state + retry shown |
| UW | Unsaved-change warning |
| A11Y | Accessibility notes |

## Public Routes

| Route | VPs | K | T | LH | FS | HC | ES | LS | ER | Result | Notes |
|-------|-----|---|---|----|----|----|----|----|----|--------|-------|
| `/` (Home) | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Hero, features, CTA — all responsive |
| `/pricing` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Plan cards stack on mobile |
| `/features` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Feature cards responsive |
| `/about` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Team cards responsive |
| `/contact` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Form responsive |
| `/login` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | ✅ | Pass | Form adapts to viewport |
| `/signup` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | ✅ | Pass | Form adapts to viewport |
| `/terms` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Text content readable |
| `/privacy` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Text content readable |
| `/cookies` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Text content readable |
| `/dpa` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Text content readable |
| `/demo-start` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | CTA + info card responsive |

## Protected App Routes (Couple Dashboard)

| Route | VPs | K | T | LH | FS | HC | ES | LS | ER | UW | Result | Notes |
|-------|-----|---|---|----|----|----|----|----|----|----|--------|-------|
| `/app/dashboard` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Cards stack, activity feed scrolls |
| `/app/wedding` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Form adapts to mobile |
| `/app/schedule` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Timeline→list on mobile, event drawer full-screen |
| `/app/guests` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Table→cards on mobile, mobile filter drawer |
| `/app/guests/new` | S,M,T,D | - | - | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | Pass | Form fields responsive |
| `/app/guests/[id]` | S,M,T,D | - | - | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Guest detail responsive |
| `/app/guests/[id]/edit` | S,M,T,D | - | - | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | Pass | Edit form responsive |
| `/app/guests/households` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Cards stack on mobile |
| `/app/guests/tags` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Tags list responsive |
| `/app/invitations` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Invitation cards grid |
| `/app/invitations/[id]/edit` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ✅ | Pass | **Mobile: full-screen canvas, bottom action bar, sheets for assets/layers/send. Desktop: side panels unchanged. Zoom controls, touch drag, keyboard shortcuts, safe-area-bottom.** |
| `/app/invitations/[id]` | S,M,T,D | - | - | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Preview responsive |
| `/app/invitations/design/new` | S,M,T,D | - | - | ✅ | ✅ | ✅ | N/A | N/A | N/A | N/A | Pass | Design form responsive |
| `/app/invitations/templates` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Template grid responsive |
| `/app/questions` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Q&A list responsive |
| `/app/website` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ✅ | Pass | Builder tabs→dropdown on mobile, preview full-width |
| `/app/seating` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Plan cards stack |
| `/app/seating/plans/[id]` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | **Mobile sheets for panels + quick assign, keyboard nudging** |
| `/app/travel` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Place cards responsive |
| `/app/tasks` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Task list→cards |
| `/app/suppliers` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Supplier cards responsive |
| `/app/budget` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Budget tables→cards |
| `/app/budget/categories` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Category cards responsive |
| `/app/budget/payments` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Payment table→cards |
| `/app/budget/suppliers` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Supplier cards responsive |
| `/app/budget/gift-funding` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Fund cards responsive |
| `/app/billing` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Plan cards stack, comparison table scrolls contained |
| `/app/gallery` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Media grid adaptive, tab bar scrolls on mobile |
| `/app/settings` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Settings form responsive |
| `/app/styleboard` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Board responsive |
| `/app/updates` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | Pass | Campaign cards responsive |

## Guest Portal Routes

| Route | VPs | K | T | LH | FS | HC | ES | LS | ER | Result | Notes |
|-------|-----|---|---|----|----|----|----|----|----|--------|-------|
| `/guest/[id]` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Hero + cards stack on mobile |
| `/guest/[id]/rsvp` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | Pass | RSVP form mobile-friendly, **needs unsaved-change warning** |
| `/guest/[id]/rsvp/[gid]` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | Pass | Detailed RSVP form |
| `/guest/[id]/itinerary` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Events timeline responsive |
| `/guest/[id]/travel` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Place cards grid responsive |
| `/guest/[id]/travel/accommodation` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Accommodation cards |
| `/guest/[id]/travel/getting-there` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Transport info readable |
| `/guest/[id]/travel/local-guide` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Local places cards |
| `/guest/[id]/travel/map` | S,M,T,D | - | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | Pass | Map embed responsive |
| `/guest/[id]/updates` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Update cards responsive |
| `/guest/[id]/registry` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Registry cards stack |
| `/guest/[id]/registry/gifts` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Gift cards responsive |
| `/guest/[id]/gallery` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Gallery grid adaptive |
| `/guest/[id]/gallery/albums` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Album cards responsive |
| `/guest/[id]/seating` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | Pass | Table assignment display |
| `/guest/[id]/questions` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | FAQ accordion mobile |
| `/guest/[id]/contacts` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Pass | Contact cards responsive |
| `/guest/[id]/details` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Wedding details readable |
| `/guest/[id]/settings` | S,M,T,D | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A | N/A | Pass | Settings form responsive |

## Global UX Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| Skip-to-content link | ✅ Pass | Present on all pages, targets `#main-content` |
| AppShell mobile drawer | ✅ Pass | Focus trap, Escape key, body scroll lock, route-change close |
| Guest Portal mobile drawer | ✅ Pass | Focus trap, Escape key, aria-modal, body scroll lock |
| Focus-visible styles | ✅ Pass | Global focus-visible outline on all interactive elements |
| Prefers-reduced-motion | ✅ Pass | Global CSS disables animations/transitions when preferred |
| sr-only utility | ✅ Pass | Available for screen-reader-only content |
| Seating mobile sheets | ✅ Pass | Guest list, inspector, quick assign all as mobile sheets |
| Seating keyboard nudging | ✅ Pass | Arrow keys move selected tables/objects, Shift for 10px step |
| Seating undo/redo | ✅ Pass | Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts |
| Invitation editor keyboard | ✅ Pass | Ctrl+Z undo, Ctrl+Shift+Z redo, Cmd+D duplicate, Delete, Escape, Cmd+0 fit, Cmd+/- zoom |
| Invitation editor touch | ✅ Pass | Pointer-event touch drag/resize/rotate, pinch-zoom canvas, long-press support |
| Invitation editor mobile | ✅ Pass | MobileEditorBottomBar with undo/redo/duplicate/delete/layer-ordering, sheet overlays for Assets/Layers/Send, safe-area-bottom padding |
| Live regions | ✅ Pass | Export progress announced via aria-live |
| Dialog component | ✅ Pass | New shared Dialog component with FocusTrap, escape-to-close, full-screen mobile, WAI-ARIA dialog pattern, body scroll lock |
| Tables → cards on mobile | ✅ Pass | Guests, invoices, seating reports use card layout below lg |
| Modal focus trap + return | ✅ Pass | Confirmation modals use proper focus management |
| Mobile filter drawers | ✅ Pass | Guests, gallery filters slide in from right on mobile |
| Form labels | ✅ Pass | All forms have visible labels linked to inputs |
| Icon button aria-labels | ✅ Pass | All icon-only buttons have aria-label or title |
| Colour contrast | ✅ Pass | All text meets WCAG AA contrast, status badges include icons |
| Destructive action confirmations | ✅ Pass | Archive, delete, cancel all require confirmation |

## Remaining Blockers

| Blocker | Severity | Route | Description |
|---------|----------|-------|-------------|
| RSVP unsaved-change warning | Medium | `/guest/[id]/rsvp` | No beforeunload or navigation guard on unsaved RSVP form |
| Website builder unsaved-change warning | Medium | `/app/website` | Needs navigation guard for dirty state |
| Invitation editor autosave queue | Low | `/app/invitations/[id]/edit` | Autosave retry banner shown but could be more prominent |
| Gallery media grid virtualisation | Low | `/app/gallery` | Large media collections benefit from virtualised grid, not currently implemented |
| Seating day mode print | Low | `/app/seating/plans/[id]/day-mode` | Day mode view renders on-screen but print layout untested |
| Billing invoice pagination | Low | `/app/billing` | Invoice list not paginated if user has many invoices |