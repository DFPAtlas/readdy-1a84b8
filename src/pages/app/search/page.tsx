import WorkspaceSearch from '@/components/feature/WorkspaceSearch';
import type * as React from "react";
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode, DEMO_CONFIG } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { HELP_ARTICLES } from '@/content/help/articles';

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface SearchResult {
  id: string;
  type: string;
  typeLabel: string;
  typeIcon: string;
  name: string;
  secondary: string;
  status: string | null;
  route: string;
  weddingName: string;
}

const RESULT_TYPES: { key: string; label: string; icon: string }[] = [
  { key: 'guest', label: 'Guests', icon: 'ri-group-line' },
  { key: 'household', label: 'Households', icon: 'ri-home-4-line' },
  { key: 'invitation', label: 'Invitations', icon: 'ri-mail-send-line' },
  { key: 'task', label: 'Tasks', icon: 'ri-calendar-check-line' },
  { key: 'supplier', label: 'Vendors', icon: 'ri-contacts-book-line' },
  { key: 'event', label: 'Events', icon: 'ri-calendar-event-line' },
  { key: 'faq', label: 'FAQs', icon: 'ri-question-line' },
  { key: 'question', label: 'Guest Questions', icon: 'ri-question-answer-line' },
  { key: 'registry', label: 'Registry', icon: 'ri-gift-line' },
  { key: 'album', label: 'Albums', icon: 'ri-image-line' },
  { key: 'payment', label: 'Payments', icon: 'ri-bank-card-line' },
  { key: 'export', label: 'Exports', icon: 'ri-download-cloud-2-line' },
  { key: 'help', label: 'Help Articles', icon: 'ri-question-line' },
];

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-foreground-900 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const RECENT_SEARCHES_KEY = 'vowora.recent-searches.v1';

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw).slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches.slice(0, 10)));
  } catch { /* ignore */ }
}

function addRecentSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const existing = loadRecentSearches().filter((s) => s.toLowerCase() !== q.toLowerCase());
  existing.unshift(q);
  saveRecentSearches(existing);
}

// ═══════════════════════════════════════════
// Demo Search
// ═══════════════════════════════════════════

function DemoSearchPage() {
  const navigate = useNavigate();
  const demoData = useDemoDataSafe();
  const state = demoData!.state;
  const WNAME = `${state.wedding.partner_one_name} & ${state.wedding.partner_two_name}`;

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build search corpus
  const allResults = useMemo((): SearchResult[] => {
    const items: SearchResult[] = [];

    // Guests
    state.guests.forEach((g) => {
      items.push({
        id: g.id,
        type: 'guest',
        typeLabel: 'Guest',
        typeIcon: 'ri-user-line',
        name: g.full_name,
        secondary: `${g.household_id ? state.households.find((h) => h.id === g.household_id)?.display_name || '' : ''} — ${g.rsvp_status || 'No RSVP'}`,
        status: g.rsvp_status,
        route: `/app/guests`,
        weddingName: WNAME,
      });
    });

    // Households
    state.households.forEach((h) => {
      items.push({
        id: h.id,
        type: 'household',
        typeLabel: 'Household',
        typeIcon: 'ri-home-4-line',
        name: h.display_name,
        secondary: `${state.guests.filter((g) => g.household_id === h.id).length} members`,
        status: null,
        route: `/app/guests/households/${h.id}`,
        weddingName: WNAME,
      });
    });

    // Tasks
    state.tasks.forEach((t) => {
      items.push({
        id: t.id,
        type: 'task',
        typeLabel: 'Task',
        typeIcon: 'ri-calendar-check-line',
        name: t.title,
        secondary: `Due ${t.due_date ? new Date(t.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No date'} — ${t.status}`,
        status: t.status,
        route: '/app/tasks',
        weddingName: WNAME,
      });
    });

    // Suppliers
    state.suppliers.forEach((s) => {
      items.push({
        id: s.id,
        type: 'supplier',
        typeLabel: 'Vendor',
        typeIcon: 'ri-contacts-book-line',
        name: s.name,
        secondary: `${s.category} — ${s.status}`,
        status: s.status,
        route: '/app/suppliers',
        weddingName: WNAME,
      });
    });

    // Events
    state.events.forEach((e) => {
      items.push({
        id: e.id,
        type: 'event',
        typeLabel: 'Event',
        typeIcon: 'ri-calendar-event-line',
        name: e.name,
        secondary: `${new Date(e.start_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${e.venue_name || e.venue_city || 'TBC'}`,
        status: e.status,
        route: '/app/schedule',
        weddingName: WNAME,
      });
    });

    // FAQs
    state.faqs.forEach((f) => {
      items.push({
        id: f.id,
        type: 'faq',
        typeLabel: 'FAQ',
        typeIcon: 'ri-question-line',
        name: f.question,
        secondary: f.category,
        status: f.is_published ? 'Published' : 'Draft',
        route: `/w/${state.wedding.slug}`,
        weddingName: WNAME,
      });
    });

    // Guest questions
    state.guestQuestions.forEach((q) => {
      const guest = state.guests.find((g) => g.id === q.guest_id);
      items.push({
        id: q.id,
        type: 'question',
        typeLabel: 'Guest Question',
        typeIcon: 'ri-question-answer-line',
        name: q.subject,
        secondary: `from ${guest?.full_name || 'Guest'} — ${q.status}`,
        status: q.status,
        route: '/app/questions',
        weddingName: WNAME,
      });
    });

    // Registry
    state.registryItems.forEach((r) => {
      items.push({
        id: r.id,
        type: 'registry',
        typeLabel: 'Registry Item',
        typeIcon: 'ri-gift-line',
        name: r.name,
        secondary: `£${r.price.toLocaleString()} — ${r.reserved ? 'Reserved' : 'Available'}`,
        status: r.reserved ? 'Reserved' : 'Available',
        route: `/w/${state.wedding.slug}`,
        weddingName: WNAME,
      });
    });

    // Albums
    state.galleryAlbums.forEach((a) => {
      const count = state.galleryItems.filter((g) => g.album_id === a.id).length;
      items.push({
        id: a.id,
        type: 'album',
        typeLabel: 'Album',
        typeIcon: 'ri-image-line',
        name: a.name,
        secondary: `${count} photos`,
        status: null,
        route: '/app/gallery',
        weddingName: WNAME,
      });
    });

    // Payments
    state.payments.forEach((p) => {
      items.push({
        id: p.id,
        type: 'payment',
        typeLabel: 'Payment',
        typeIcon: 'ri-bank-card-line',
        name: p.description,
        secondary: `£${p.amount.toLocaleString()} — ${p.status} — ${p.due_date ? new Date(p.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`,
        status: p.status,
        route: '/app/budget/payments',
        weddingName: WNAME,
      });
    });

    // Help articles
    HELP_ARTICLES.forEach((a) => {
      items.push({
        id: a.slug,
        type: 'help',
        typeLabel: 'Help Article',
        typeIcon: 'ri-question-line',
        name: a.title,
        secondary: a.summary,
        status: null,
        route: `/app/help/${a.slug}`,
        weddingName: WNAME,
      });
    });

    return items;
  }, [state]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return new Map<string, SearchResult[]>();
    const q = query.toLowerCase();
    let filtered = allResults.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.secondary.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q)
    );
    if (typeFilter.length > 0) {
      filtered = filtered.filter((r) => typeFilter.includes(r.type));
    }
    // Group by type, limit to 8 per type
    const grouped = new Map<string, SearchResult[]>();
    filtered.forEach((r) => {
      const arr = grouped.get(r.type) || [];
      if (arr.length < 8) arr.push(r);
      grouped.set(r.type, arr);
    });
    return grouped;
  }, [allResults, query, typeFilter]);

  const totalResults = useMemo(() => {
    let count = 0;
    results.forEach((arr) => { count += arr.length; });
    return count;
  }, [results]);

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    results.forEach((arr) => flat.push(...arr));
    return flat;
  }, [results]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [query, typeFilter]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, flatResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && flatResults[selectedIdx]) {
        e.preventDefault();
        const r = flatResults[selectedIdx];
        addRecentSearch(query);
        setRecentSearches(loadRecentSearches);
        navigate(r.route);
      }
    },
    [flatResults, selectedIdx, navigate, query]
  );

  const handleResultClick = (r: SearchResult) => {
    addRecentSearch(query);
    navigate(r.route);
  };

  const toggleType = (key: string) => {
    setTypeFilter((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    saveRecentSearches([]);
    setRecentSearches([]);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Search input */}
        <div className="mb-6">
          <div className="relative">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-lg" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search guests, tasks, suppliers, events..."
              className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-secondary-200 bg-white text-base text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              aria-label="Search wedding workspace"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                aria-label="Clear search"
              >
                <i className="ri-close-line text-lg" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-foreground-400">
              {query.trim()
                ? `${totalResults} result${totalResults !== 1 ? 's' : ''}`
                : `Searching ${allResults.length} records across ${RESULT_TYPES.length} categories`}
            </p>
            <kbd className="text-[10px] text-foreground-400 bg-secondary-100 px-1.5 py-0.5 rounded font-mono">
              Esc to clear
            </kbd>
          </div>
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {RESULT_TYPES.map((t) => {
            const count = allResults.filter((r) => r.type === t.key).length;
            if (count === 0) return null;
            const active = typeFilter.includes(t.key);
            return (
              <button
                key={t.key}
                onClick={() => toggleType(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-primary-500 text-background-50'
                    : typeFilter.length > 0
                    ? 'bg-background-100 text-foreground-400'
                    : 'bg-background-100 text-foreground-600 hover:bg-background-200'
                }`}
              >
                <i className={`${t.icon} text-[10px]`} />
                {t.label}
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Results or recent/empty */}
        {!query.trim() ? (
          <div>
            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-label font-semibold text-foreground-700">Recent searches</h2>
                  <button
                    onClick={clearRecent}
                    className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background-100 text-sm text-foreground-600 hover:bg-background-200 transition-colors cursor-pointer"
                    >
                      <i className="ri-time-line text-xs text-foreground-400" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { label: 'All guests', icon: 'ri-group-line', to: '/app/guests' },
                { label: 'Tasks', icon: 'ri-calendar-check-line', to: '/app/tasks' },
                { label: 'Vendors', icon: 'ri-contacts-book-line', to: '/app/suppliers' },
                { label: 'Schedule', icon: 'ri-calendar-event-line', to: '/app/schedule' },
                { label: 'Budget', icon: 'ri-money-pound-circle-line', to: '/app/budget' },
                { label: 'Invitations', icon: 'ri-mail-send-line', to: '/app/invitations' },
                { label: 'Seating', icon: 'ri-layout-grid-line', to: '/app/seating' },
                { label: 'Gallery', icon: 'ri-image-line', to: '/app/gallery' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white border border-secondary-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 flex-shrink-0">
                    <i className={`${link.icon} text-base`} />
                  </div>
                  <span className="text-sm font-label text-foreground-700">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-search-line text-2xl" />
            </div>
            <p className="text-sm font-label font-medium text-foreground-600 mb-1">No results found</p>
            <p className="text-xs text-foreground-400">
              Try a different search term or clear filters
            </p>
            <button
              onClick={() => { setQuery(''); setTypeFilter([]); }}
              className="mt-4 text-xs text-primary-600 font-label hover:text-primary-700 cursor-pointer whitespace-nowrap"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(results.entries()).map(([type, items]) => {
              const typeInfo = RESULT_TYPES.find((t) => t.key === type);
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <i className={`${typeInfo?.icon || 'ri-file-line'} text-foreground-500 text-sm`} />
                    <h3 className="text-sm font-label font-semibold text-foreground-700">{typeInfo?.label || type}</h3>
                    <span className="text-[10px] text-foreground-400">({items.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((r, idx) => {
                      const flatIdx = flatResults.indexOf(r);
                      const isSelected = flatIdx === selectedIdx;
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick(r)}
                          onMouseEnter={() => setSelectedIdx(flatIdx)}
                          className={`w-full flex items-center gap-4 p-3.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary-50 border border-primary-200'
                              : 'bg-white border border-secondary-100 hover:bg-background-50'
                          }`}
                        >
                          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 flex-shrink-0">
                            <i className={`${typeInfo?.icon || 'ri-file-line'} text-sm`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground-800 font-label font-medium truncate">
                              {highlightMatch(r.name, query)}
                            </p>
                            <p className="text-xs text-foreground-500 mt-0.5 truncate">{r.secondary}</p>
                          </div>
                          {r.status && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-label flex-shrink-0 ${
                              r.status === 'accepted' || r.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                              r.status === 'pending' || r.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                              r.status === 'declined' || r.status === 'overdue' ? 'bg-red-100 text-red-700' :
                              'bg-secondary-100 text-secondary-600'
                            }`}>
                              {r.status}
                            </span>
                          )}
                          <i className="ri-arrow-right-s-line text-foreground-300 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function SearchPage() { return isDemoMode ? <DemoSearchPage /> : <WorkspaceSearch />; }
