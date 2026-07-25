import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface LookupResult { guest_name: string; table_number: number | null; table_name: string; seat_label: string | null; }

export default function PublicTableLookupPage() {
  const { slug } = useParams<{ slug: string }>();

  const [searchName, setSearchName] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [weddingName, setWeddingName] = useState('');
  const [mode, setMode] = useState<'disabled' | 'form' | 'result' | 'not_found'>('form');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: wedding } = await supabase.from('weddings').select('id, partner_one_name, partner_two_name, slug').eq('slug', slug).maybeSingle();
      if (wedding) {
        setWeddingName(((wedding as { partner_one_name: string; partner_two_name: string }).partner_one_name || '') + ' & ' + ((wedding as { partner_one_name: string; partner_two_name: string }).partner_two_name || ''));
        const weddingId = (wedding as { id: string }).id;

        const { data: pub } = await supabase.from('seating_publications').select('id, lookup_settings').eq('wedding_id', weddingId).eq('status', 'published').order('published_at', { ascending: false }).limit(1).maybeSingle();
        if (!pub) { setMode('disabled'); return; }

        const lookup = (pub as { lookup_settings: Record<string, unknown> | null }).lookup_settings || {};
        if ((lookup as Record<string, unknown>).mode !== 'name_code') { setMode('disabled'); return; }
        setMode('form');
      } else {
        setMode('disabled');
      }
    })();
  }, [slug]);

  const handleSearch = useCallback(async () => {
    if (!searchName.trim() || !slug) return;
    setSearched(true);
    setError('');
    setResult(null);

    try {
      const { data: wedding } = await supabase.from('weddings').select('id').eq('slug', slug).maybeSingle();
      if (!wedding) { setMode('disabled'); return; }
      const weddingId = (wedding as { id: string }).id;

      // Hash the lookup code for comparison
      const encoder = new TextEncoder();
      const data = encoder.encode((lookupCode || '').trim().toLowerCase());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Find active lookup code
      const { data: code } = await supabase.from('seating_lookup_codes').select('guest_id').eq('wedding_id', weddingId).eq('code_hash', hashHex).eq('status', 'active').maybeSingle();

      if (!code) {
        await supabase.from('seating_lookup_activity').insert({ wedding_id: weddingId, event_type: 'lookup_not_found', security_metadata: { slug, method: 'name_code' } });
        setMode('not_found');
        return;
      }

      // Find the guest's seating
      const { data: guest } = await supabase.from('guests').select('id, full_name').eq('id', (code as { guest_id: string }).guest_id).maybeSingle();
      const { data: assign } = await supabase.from('seating_assignments').select('table_id, seating_seat_id').eq('wedding_id', weddingId).eq('guest_id', (code as { guest_id: string }).guest_id).maybeSingle();

      if (!assign || !guest) {
        await supabase.from('seating_lookup_activity').insert({ wedding_id: weddingId, event_type: 'lookup_not_found', security_metadata: { slug } });
        setMode('not_found');
        return;
      }

      const guestName = (guest as { full_name: string }).full_name;
      if (searchName.trim().toLowerCase() !== guestName.toLowerCase()) {
        await supabase.from('seating_lookup_activity').insert({ wedding_id: weddingId, event_type: 'lookup_not_found', security_metadata: { slug } });
        setMode('not_found');
        return;
      }

      const { data: table } = await supabase.from('seating_tables').select('table_number, name').eq('id', (assign as { table_id: string }).table_id).maybeSingle();
      const { data: seat } = await supabase.from('seating_seats').select('seat_label').eq('id', (assign as { seating_seat_id: string }).seating_seat_id).maybeSingle();

      setResult({
        guest_name: guestName,
        table_number: (table as { table_number: number | null } | null)?.table_number || null,
        table_name: (table as { name: string } | null)?.name || '',
        seat_label: (seat as { seat_label: string | null } | null)?.seat_label || null,
      });
      setMode('result');

      await supabase.from('seating_lookup_activity').insert({ wedding_id: weddingId, event_type: 'lookup_found', security_metadata: { slug } });
    } catch {
      setMode('not_found');
    }
  }, [searchName, lookupCode, slug]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <div className="min-h-screen bg-background-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl text-foreground-900 mb-2">Table lookup</h1>
          {weddingName && <p className="text-sm text-foreground-500">{weddingName}</p>}
        </div>

        {mode === 'disabled' && (
          <div className="card-default text-center py-12">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4"><i className="ri-lock-line text-2xl" /></div>
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Table lookup is not available</h2>
            <p className="text-xs text-foreground-500">The couple hasn&rsquo;t published a seating plan or has disabled public lookup.</p>
          </div>
        )}

        {(mode === 'form' || mode === 'not_found') && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Find your table</h2>
            <p className="text-xs text-foreground-500 mb-4">Enter your full name exactly as it appears on your invitation, plus your personal lookup code.</p>

            {mode === 'not_found' && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                <i className="ri-error-warning-line mr-1" />We couldn&rsquo;t find a match. Please check your name and code, or ask the couple for help.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-foreground-400 font-label block mb-1">Full name</label>
                <input type="text" value={searchName} onChange={(e) => setSearchName(e.target.value)} onKeyDown={handleKeyDown} placeholder="e.g. Jane Smith" className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="text-[10px] text-foreground-400 font-label block mb-1">Lookup code</label>
                <input type="text" value={lookupCode} onChange={(e) => setLookupCode(e.target.value)} onKeyDown={handleKeyDown} placeholder="Your personal code" className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-400" />
              </div>
              <button onClick={handleSearch} className="w-full py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">Find my table</button>
            </div>
          </div>
        )}

        {mode === 'result' && result && (
          <div className="card-default text-center">
            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-50 text-accent-600 mb-4"><i className="ri-map-pin-line text-2xl" /></div>
            <p className="text-sm text-foreground-500 mb-1">Welcome, {result.guest_name}</p>
            <h2 className="font-heading text-3xl font-bold text-foreground-900 mb-1">Table {result.table_number || result.table_name}</h2>
            {result.table_name && result.table_number && <p className="text-sm text-foreground-500 mb-3">{result.table_name}</p>}
            {result.seat_label && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background-50 border border-secondary-200 mt-2">
                <i className="ri-map-pin-line text-accent-600 text-sm" />
                <span className="text-sm font-label font-medium text-foreground-700">Seat: {result.seat_label}</span>
              </div>
            )}
            <button onClick={() => { setMode('form'); setSearched(false); setResult(null); setSearchName(''); setLookupCode(''); }} className="mt-6 text-xs text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap">Look up another guest</button>
          </div>
        )}

        <p className="text-center text-[11px] text-foreground-400 mt-6">This information is private. Please do not share.</p>
      </div>
    </div>
  );
}