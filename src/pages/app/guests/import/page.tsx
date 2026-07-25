import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useGuestService } from '@/hooks/useGuestService';
import { isDemoMode } from '@/demo/demoConfig';

type ImportStep = 'upload' | 'mapping' | 'validate' | 'results';

interface ColumnMapping {
  csvHeader: string;
  dbField: string;
}

interface ImportRow {
  index: number;
  data: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
}

const CSV_FIELD_OPTIONS = [
  { value: '', label: '— Skip —' },
  { value: 'full_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'preferred_name', label: 'Preferred name' },
  { value: 'email', label: 'Email' },
  { value: 'mobile_phone', label: 'Mobile' },
  { value: 'guest_type', label: 'Guest type' },
  { value: 'invitation_group', label: 'Invitation group' },
  { value: 'relationship_label', label: 'Relationship' },
  { value: 'plus_one_status', label: 'Plus-one' },
  { value: 'address_line_1', label: 'Address line 1' },
  { value: 'city', label: 'Town/City' },
  { value: 'postcode', label: 'Postcode' },
  { value: 'dietary_requirements', label: 'Dietary notes' },
  { value: 'accessibility_notes', label: 'Accessibility notes' },
  { value: 'household_name', label: 'Household name' },
  { value: 'private_notes', label: 'Private notes' },
  { value: 'wedding_party_role', label: 'Wedding party role' },
];

function DemoImportPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4"><i className="ri-information-line text-2xl" /></div>
        <h3 className="font-heading text-lg text-foreground-700 mb-2">Guest import is unavailable in Demo Mode</h3>
        <p className="text-sm text-foreground-500 mb-6 max-w-md mx-auto">
          The CSV import feature requires a live database connection. In Demo Mode, add guests one at a time through the Add Guest form.
        </p>
        <button onClick={() => navigate('/app/guests/new')} className="btn-primary text-sm cursor-pointer mr-3"><i className="ri-add-line mr-1.5" />Add guest</button>
        <button onClick={() => navigate('/app/guests')} className="btn-outline text-sm cursor-pointer">Back to guests</button>
      </div>
    </AppShell>
  );
}

export default function ImportPage() {
  if (isDemoMode) return <DemoImportPage />;
  return <NormalImportPage />;
}

function NormalImportPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const svc = useGuestService();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchId] = useState(() => `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [defaultGroup, setDefaultGroup] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState({ imported: 0, skipped: 0, failed: 0 });
  const [resultErrors, setResultErrors] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) { setError('CSV must have a header row and at least one data row'); return; }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"' && !inQuotes) { inQuotes = true; }
        else if (line[i] === '"' && inQuotes) { inQuotes = false; }
        else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += line[i]; }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(parseLine);
    setCsvHeaders(headers);
    setCsvRows(rows.slice(0, 100));

    const autoMappings = headers.map((h) => {
      const lower = h.toLowerCase();
      let dbField = '';
      if (lower.includes('first') || lower === 'name') dbField = 'full_name';
      else if (lower.includes('last') || lower === 'surname') dbField = 'last_name';
      else if (lower.includes('prefer')) dbField = 'preferred_name';
      else if (lower === 'email') dbField = 'email';
      else if (lower.includes('mobile') || lower.includes('phone') || lower.includes('tel')) dbField = 'mobile_phone';
      else if (lower.includes('type')) dbField = 'guest_type';
      else if (lower.includes('group') || lower.includes('category')) dbField = 'invitation_group';
      else if (lower.includes('relation')) dbField = 'relationship_label';
      else if (lower.includes('plus') || lower.includes('+1')) dbField = 'plus_one_status';
      else if (lower.includes('address') && lower.includes('1')) dbField = 'address_line_1';
      else if (lower.includes('city') || lower.includes('town')) dbField = 'city';
      else if (lower.includes('postcode') || lower.includes('zip')) dbField = 'postcode';
      else if (lower.includes('diet') || lower.includes('food')) dbField = 'dietary_requirements';
      else if (lower.includes('access')) dbField = 'accessibility_notes';
      else if (lower.includes('household')) dbField = 'household_name';
      else if (lower.includes('note') && lower.includes('private')) dbField = 'private_notes';
      else if (lower.includes('party') || lower.includes('role')) dbField = 'wedding_party_role';
      return { csvHeader: h, dbField };
    });

    setMappings(autoMappings);
    setStep('mapping');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('File must be under 5 MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  const validateRows = () => {
    const rows: ImportRow[] = csvRows.map((row, idx) => {
      const data: Record<string, string> = {};
      const errors: string[] = [];
      mappings.forEach((m) => {
        if (m.dbField) {
          const colIdx = csvHeaders.indexOf(m.csvHeader);
          data[m.dbField] = (row[colIdx] || '').trim();
        }
      });

      if (!data.full_name) errors.push('Missing first name');

      let status: 'valid' | 'warning' | 'error' = 'valid';
      if (errors.length > 0) status = 'error';
      else if (!data.email && !data.mobile_phone) status = 'warning';

      return { index: idx, data, status, errors };
    });

    setImportRows(rows);
    setStep('validate');
  };

  const handleImport = async () => {
    setImporting(true);

    const validRows = importRows.filter((r) => r.status !== 'error');
    const skipped = importRows.filter((r) => r.status === 'error').length;

    const result = await svc.importGuests(
      validRows.map((r) => ({ ...r.data, invitation_group: r.data.invitation_group || defaultGroup })),
      defaultGroup,
    );

    const finalSkipped = skipped + result.skipped;
    setResults({ imported: result.imported, skipped: finalSkipped, failed: result.failed });
    setResultErrors(result.errors);
    setStep('results');
    setImporting(false);

    await svc.recordActivity('imported', `Imported ${result.imported} guests via CSV`, {
      metadata: { batch_id: batchId, imported: result.imported, skipped: finalSkipped, failed: result.failed },
    });

    // Record import job
    await supabase.from('guest_import_jobs').insert({
      wedding_id: weddingId,
      source_filename: 'csv_import',
      status: 'completed',
      total_rows: csvRows.length,
      imported_rows: result.imported,
      skipped_rows: finalSkipped,
      error_rows: result.failed,
      mapping_config: { batch_id: batchId },
    });
  };

  const updateMapping = (csvHeader: string, dbField: string) => {
    setMappings((prev) => prev.map((m) => (m.csvHeader === csvHeader ? { ...m, dbField } : m)));
  };

  const sampleCSV = 'First name,Last name,Email,Mobile,Guest type,Invitation group,Relationship\nEmma,Williams,emma@email.com,+44 7700 900000,adult,Family,Bride\nJames,Chen,james@email.com,+44 7700 900001,adult,Family,Groom\nSarah,Jones,sarah@email.com,,adult,Friends,Maid of Honour\n';

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {feedback && <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-label ${feedback.type === 'success' ? 'bg-accent-50 text-accent-700 border border-accent-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{feedback.message}</div>}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">Import guests</h1>
            <p className="text-sm text-foreground-500 mt-1">Upload a CSV file to add multiple guests at once.</p>
          </div>
          <button onClick={() => navigate('/app/guests')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {['upload', 'mapping', 'validate', 'results'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-label ${step === s ? 'bg-primary-500 text-white' : step === 'results' || ['upload','mapping','validate'].indexOf(step) > ['upload','mapping','validate'].indexOf(s) ? 'bg-accent-500 text-white' : 'bg-secondary-100 text-secondary-500'}`}>
                {step === 'results' || ['upload','mapping','validate'].indexOf(step) > ['upload','mapping','validate'].indexOf(s) ? <i className="ri-check-line" /> : i + 1}
              </div>
              <span className="text-xs text-foreground-500 capitalize hidden sm:inline">{s}</span>
              {i < 3 && <div className="w-8 h-px bg-secondary-200 hidden sm:block" />}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">{error}</div>}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="card-default">
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-500 mb-4"><i className="ri-upload-cloud-2-line text-2xl" /></div>
              <h3 className="font-heading text-lg text-foreground-700 mb-2">Upload your guest CSV</h3>
              <p className="text-sm text-foreground-500 mb-6 max-w-md mx-auto">Upload a CSV file with your guest data. The first row should contain column headers.</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary text-sm cursor-pointer"><i className="ri-upload-line mr-1.5" />Choose CSV file</button>
              <p className="text-xs text-foreground-400 mt-3">Maximum file size: 5 MB</p>
            </div>

            <div className="mt-6 p-4 bg-background-50 rounded-lg">
              <h4 className="text-sm font-label font-semibold text-foreground-800 mb-2">Sample CSV format</h4>
              <pre className="text-xs text-foreground-600 overflow-x-auto whitespace-pre font-mono bg-white p-3 rounded border border-secondary-200">{sampleCSV}</pre>
              <button onClick={() => { const blob = new Blob([sampleCSV], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'wedora_sample_guests.csv'; a.click(); }} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer mt-2 inline-block">Download sample CSV</button>
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <>
            <div className="card-default mb-6">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Map columns</h3>
              <p className="text-xs text-foreground-500 mb-4">Match your CSV columns to Wedora guest fields. Auto-detected where possible.</p>
              <div className="space-y-3">
                {mappings.map((m) => (
                  <div key={m.csvHeader} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-label text-foreground-700 w-full sm:w-48 flex-shrink-0">{m.csvHeader}</span>
                    <i className="ri-arrow-right-line text-foreground-400 hidden sm:block" />
                    <select className="input-field text-sm flex-1" value={m.dbField} onChange={(e) => updateMapping(m.csvHeader, e.target.value)}>
                      {CSV_FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Default invitation group (for guests without one)</label>
                <select className="input-field text-sm w-auto" value={defaultGroup} onChange={(e) => setDefaultGroup(e.target.value)}>
                  <option value="">— None —</option>
                  <option value="Family">Family</option>
                  <option value="Wedding party">Wedding party</option>
                  <option value="Friends">Friends</option>
                  <option value="Work">Work</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep('upload')} className="btn-outline text-sm cursor-pointer">Back</button>
              <button onClick={validateRows} className="btn-primary text-sm cursor-pointer">Validate &amp; review</button>
            </div>
          </>
        )}

        {/* Step 3: Validate */}
        {step === 'validate' && (
          <>
            <div className="card-default mb-6 overflow-hidden p-0">
              <div className="p-4 border-b border-secondary-100 flex flex-wrap items-center gap-4">
                <span className="text-sm font-label text-foreground-700">{importRows.length} rows</span>
                <span className="text-xs text-accent-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-500" />{importRows.filter((r) => r.status === 'valid').length} valid</span>
                <span className="text-xs text-amber-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{importRows.filter((r) => r.status === 'warning').length} warnings</span>
                <span className="text-xs text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{importRows.filter((r) => r.status === 'error').length} errors</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100 bg-background-50">
                      <th className="text-left px-4 py-2 text-xs font-label text-foreground-500">#</th>
                      <th className="text-left px-4 py-2 text-xs font-label text-foreground-500">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-label text-foreground-500">Email</th>
                      <th className="text-left px-4 py-2 text-xs font-label text-foreground-500">Group</th>
                      <th className="text-left px-4 py-2 text-xs font-label text-foreground-500">Status</th>
                      <th className="text-left px-4 py-2 text-xs font-label text-foreground-500">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-50">
                    {importRows.slice(0, 20).map((row) => (
                      <tr key={row.index}>
                        <td className="px-4 py-2 text-xs text-foreground-500">{row.index + 1}</td>
                        <td className="px-4 py-2 text-xs text-foreground-800">{row.data.full_name} {row.data.last_name}</td>
                        <td className="px-4 py-2 text-xs text-foreground-600">{row.data.email || '—'}</td>
                        <td className="px-4 py-2 text-xs text-foreground-600">{row.data.invitation_group || (defaultGroup ? <span className="text-foreground-400">{defaultGroup} (default)</span> : '—')}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${row.status === 'valid' ? 'bg-accent-100 text-accent-700' : row.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{row.status}</span></td>
                        <td className="px-4 py-2 text-xs text-red-500">{row.errors.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 20 && <p className="px-4 py-2 text-xs text-foreground-400">Showing 20 of {importRows.length} rows</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setStep('mapping')} className="btn-outline text-sm cursor-pointer">Back</button>
              <button onClick={handleImport} disabled={importing} className="btn-primary text-sm cursor-pointer">
                {importing ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Importing...</> : `Import ${importRows.filter((r) => r.status !== 'error').length} guests`}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Results */}
        {step === 'results' && (
          <div className="card-default p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-accent-100 text-accent-600 mb-4"><i className="ri-check-line text-2xl" /></div>
              <h3 className="font-heading text-lg text-foreground-700 mb-2">Import complete</h3>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div><span className="text-2xl font-heading font-semibold text-accent-600">{results.imported}</span><p className="text-xs text-foreground-500">Imported</p></div>
                <div><span className="text-2xl font-heading font-semibold text-amber-500">{results.skipped}</span><p className="text-xs text-foreground-500">Skipped</p></div>
                <div><span className="text-2xl font-heading font-semibold text-red-500">{results.failed}</span><p className="text-xs text-foreground-500">Failed</p></div>
              </div>
            </div>
            {resultErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-100 max-h-40 overflow-y-auto">
                <p className="text-xs font-label font-semibold text-red-700 mb-2">Errors ({resultErrors.length})</p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {resultErrors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {resultErrors.length > 10 && <li className="text-foreground-400">...and {resultErrors.length - 10} more</li>}
                </ul>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep('upload'); setCsvHeaders([]); setCsvRows([]); setMappings([]); setImportRows([]); setResultErrors([]); }} className="btn-outline text-sm cursor-pointer">Import another file</button>
              <button onClick={() => navigate('/app/guests')} className="btn-primary text-sm cursor-pointer">View guests</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}