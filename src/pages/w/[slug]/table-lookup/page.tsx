import type * as React from "react";
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

// All lookups go through the seating-table-lookup Edge Function: guest and seating
// tables are never readable by anonymous visitors.
const LOOKUP_URL = edgeFunctionUrl('seating-table-lookup');

interface LookupResult { guest_name: string; table_number: number | null; table_name: string; seat_label: string | null; }
type Mode = 'loading' | 'disabled' | 'form' | 'not_found' | 'rate_limited' | 'error' | 'result';

async function callLookup(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(LOOKUP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Lookup unavailable');
  return res.json();
}

export default function PublicTableLookupPage() {
  const { slug } = useParams<{ slug: string }>();

  const [searchName, setSearchName] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [weddingName, setWeddingName] = useState('');
  const [mode, setMode] = useState<Mode>('loading');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!slug) { setMode('disabled'); return; }
    let cancelled = false;
    callLookup({ action: 'status', slug })
      .then((data) => {
        if (cancelled) return;
        if (data.available) { setWeddingName(String(data.couple || '')); setMode('form'); }
        else setMode('disabled');
      })
      .catch(() => { if (!cancelled) setMode('error'); });
    return () => { cancelled = true; };
  }, [slug]);

  const handleSearch = useCallback(async () => {
    if (!slug || !searchName.trim() || !lookupCode.trim() || searching) return;
    setSearching(true);
    setResult(null);
    try {
      const data = await callLookup({ action: 'lookup', slug, name: searchName, code: lookupCode });
      if (!data.available) setMode('disabled');
      else if (data.rate_limited) setMode('rate_limited');
      else if (data.found) {
        setResult({
          guest_name: String(data.guest_name || ''),
          table_number: (data.table_number as number | null) ?? null,
          table_name: String(data.table_name || ''),
          seat_label: (data.seat_label as string | null) ?? null,
        });
        setMode('result');
      } else setMode('not_found');
    } catch {
      setMode('error');
    } finally {
      setSearching(false);
    }
  }, [searchName, lookupCode, slug, searching]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };
  const reset = () => { setMode('form'); setResult(null); setSearchName(''); setLookupCode(''); };

  return (
    <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl text-foreground-900 mb-2">Find your table</h1>
          {weddingName && <p className="text-sm text-foreground-500">{weddingName}</p>}
        </div>

        {mode === 'loading' && (
          <div className="card-default text-center py-12 text-sm text-foreground-500">Loading…</div>
        )}

        {mode === 'disabled' && (
          <div className="card-default text-center py-12">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-lock-line text-2xl" /></div>
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Table lookup is not available</h2>
            <p className="text-xs text-foreground-500">The couple hasn&rsquo;t published their seating plan, or table lookup is switched off.</p>
            {slug && <Link to={`/w/${slug}`} className="inline-block mt-4 text-xs text-primary-600 hover:text-primary-700">Back to the wedding website</Link>}
          </div>
        )}

        {mode === 'error' && (
          <div className="card-default text-center py-12">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Something went wrong</h2>
            <p className="text-xs text-foreground-500 mb-4">Table lookup is temporarily unavailable. Please try again in a moment.</p>
            <button onClick={() => window.location.reload()} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">Try again</button>
          </div>
        )}

        {(mode === 'form' || mode === 'not_found' || mode === 'rate_limited') && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Find your table</h2>
            <p className="text-xs text-foreground-500 mb-4">Enter your name as it appears on your invitation, plus the personal table code the couple gave you.</p>

            {mode === 'not_found' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700" role="alert">
                <i className="ri-error-warning-line mr-1" />We couldn&rsquo;t find a match. Please check your name and code, or ask the couple for help.
              </div>
            )}
            {mode === 'rate_limited' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700" role="alert">
                <i className="ri-time-line mr-1" />Too many attempts. Please wait 15 minutes and try again, or ask the couple for help.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="lookup-name" className="text-[10px] text-foreground-400 font-label block mb-1">Full name</label>
                <input id="lookup-name" type="text" autoComplete="name" value={searchName} onChange={(e) => setSearchName(e.target.value)} onKeyDown={handleKeyDown} placeholder="e.g. Jane Smith" className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label htmlFor="lookup-code" className="text-[10px] text-foreground-400 font-label block mb-1">Table code</label>
                <input id="lookup-code" type="text" autoComplete="off" autoCapitalize="characters" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} onKeyDown={handleKeyDown} placeholder="e.g. ABC-234" className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:border-primary-400 uppercase tracking-wider" />
              </div>
              <button onClick={handleSearch} disabled={searching || mode === 'rate_limited' || !searchName.trim() || !lookupCode.trim()} className="w-full py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                {searching ? 'Searching…' : 'Find my table'}
              </button>
            </div>
          </div>
        )}

        {mode === 'result' && result && (
          <div className="card-default text-center">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-50 text-accent-600 mb-4"><i className="ri-map-pin-line text-2xl" /></div>
            <p className="text-sm text-foreground-500 mb-1">Welcome, {result.guest_name}</p>
            <h2 className="font-heading text-3xl font-bold text-foreground-900 mb-1">{result.table_number ? `Table ${result.table_number}` : result.table_name}</h2>
            {result.table_name && result.table_number && <p className="text-sm text-foreground-500 mb-3">{result.table_name}</p>}
            {result.seat_label && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background-50 border border-secondary-200 mt-2">
                <i className="ri-map-pin-line text-accent-600 text-sm" />
                <span className="text-sm font-label font-medium text-foreground-700">Seat: {result.seat_label}</span>
              </div>
            )}
            <button onClick={reset} className="block mx-auto mt-6 text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">Look up another guest</button>
          </div>
        )}

        <p className="text-center text-[11px] text-foreground-400 mt-6">Your table code is personal. Please don&rsquo;t share it.</p>
      </div>
    </div>
  );
}
