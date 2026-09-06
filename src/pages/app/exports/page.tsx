import { useState, useMemo } from 'react';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { ExportCategory, ExportFormat, ExportPrivacy, ExportStatus, ExportRequest } from '@/types/timeline';
import { EXPORT_CATEGORY_LABELS, EXPORT_CATEGORY_ICONS, EXPORT_FORMAT_LABELS, EXPORT_PRIVACY_LABELS, EXPORT_STATUS_LABELS, EXPORT_STATUS_COLORS } from '@/types/timeline';

// ── Demo export history ──

const DEMO_EXPORT_HISTORY: ExportRequest[] = [
  { id: 'exp-1', wedding_id: 'demo', requested_by: null, export_type: 'guests_csv', status: 'completed', storage_path: null, contains_sensitive_data: true, requested_at: '2027-06-15T10:30:00', started_at: '2027-06-15T10:30:01', completed_at: '2027-06-15T10:30:05', expires_at: null, error_message: null, created_at: '2027-06-15T10:30:00', requested_by_name: 'Emma' },
  { id: 'exp-2', wedding_id: 'demo', requested_by: null, export_type: 'seating_floor_plan', status: 'completed', storage_path: null, contains_sensitive_data: false, requested_at: '2027-06-14T14:00:00', started_at: '2027-06-14T14:00:02', completed_at: '2027-06-14T14:00:10', expires_at: null, error_message: null, created_at: '2027-06-14T14:00:00', requested_by_name: 'James' },
  { id: 'exp-3', wedding_id: 'demo', requested_by: null, export_type: 'budget_csv', status: 'completed', storage_path: null, contains_sensitive_data: true, requested_at: '2027-06-10T09:15:00', started_at: '2027-06-10T09:15:01', completed_at: '2027-06-10T09:15:03', expires_at: null, error_message: null, created_at: '2027-06-10T09:15:00', requested_by_name: 'Emma' },
];

// ── Export categories with available formats ──

interface ExportOption {
  category: ExportCategory;
  label: string;
  icon: string;
  description: string;
  formats: ExportFormat[];
  privacies: ExportPrivacy[];
  count: number;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { category: 'calendar', label: 'Calendar', icon: 'ri-calendar-2-line', description: 'Download your wedding calendar in ICS or CSV format', formats: ['ics', 'csv'], privacies: ['organiser'], count: 24 },
  { category: 'timeline', label: 'Timeline', icon: 'ri-time-line', description: 'Export the wedding-day operational timeline', formats: ['pdf', 'csv', 'ics'], privacies: ['organiser', 'supplier', 'guest'], count: 12 },
  { category: 'guests', label: 'Guests & RSVP', icon: 'ri-user-line', description: 'Guest list, RSVP responses, dietary and accessibility report', formats: ['csv', 'pdf'], privacies: ['organiser', 'supplier'], count: 120 },
  { category: 'seating', label: 'Seating', icon: 'ri-layout-grid-line', description: 'Table plans, place cards, coordinator pack', formats: ['pdf', 'csv', 'png'], privacies: ['organiser', 'supplier'], count: 6 },
  { category: 'budget', label: 'Budget & Payments', icon: 'ri-money-pound-circle-line', description: 'Budget summary, expense breakdown, payment schedule', formats: ['csv', 'pdf'], privacies: ['organiser'], count: 45 },
  { category: 'suppliers', label: 'Suppliers', icon: 'ri-contacts-book-line', description: 'Supplier contacts, quotes, and document manifest', formats: ['csv', 'pdf'], privacies: ['organiser', 'supplier'], count: 12 },
  { category: 'registry', label: 'Registry', icon: 'ri-gift-line', description: 'Registry contributions and thank-you list', formats: ['csv', 'pdf'], privacies: ['organiser'], count: 8 },
  { category: 'gallery', label: 'Gallery', icon: 'ri-image-line', description: 'Gallery image manifest with captions and uploaders', formats: ['csv'], privacies: ['organiser'], count: 45 },
  { category: 'full_pack', label: 'Full planning pack', icon: 'ri-folder-zip-line', description: 'All planning documents in one export (large file)', formats: ['pdf'], privacies: ['organiser'], count: 272 },
];

// ── Generate ICS (client-side demo) ──

function generateDemoICS(privacy: ExportPrivacy): string {
  const items = [
    { title: 'Ceremony', start: '20270620T130000', end: '20270620T140000', loc: 'The Tythe Barn, Priston Mill' },
    { title: 'Drinks Reception', start: '20270620T140000', end: '20270620T160000', loc: 'Courtyard, Priston Mill' },
    { title: 'Wedding Breakfast', start: '20270620T160000', end: '20270620T180000', loc: 'The Tythe Barn' },
    { title: 'Speeches', start: '20270620T173000', end: '20270620T180000', loc: 'The Tythe Barn' },
    { title: 'Evening Reception', start: '20270620T190000', end: '20270620T233000', loc: 'The Tythe Barn' },
  ];

  if (privacy === 'supplier') {
    items.push(
      { title: 'Hair & Makeup Artists Arrive', start: '20270620T070000', end: '20270620T080000', loc: 'Bridal Suite' },
      { title: 'Florist Delivery', start: '20270620T083000', end: '20270620T090000', loc: 'Main Entrance' },
      { title: 'Photographer Arrives', start: '20270620T090000', end: '20270620T093000', loc: 'Bridal Suite' },
    );
  }

  if (privacy === 'organiser') {
    items.push(
      { title: 'Hair & Makeup Artists Arrive', start: '20270620T070000', end: '20270620T080000', loc: 'Bridal Suite' },
      { title: 'Florist Delivery', start: '20270620T083000', end: '20270620T090000', loc: 'Main Entrance' },
      { title: 'Photographer Arrives', start: '20270620T090000', end: '20270620T093000', loc: 'Bridal Suite' },
      { title: 'Groom & Groomsmen Arrive', start: '20270620T100000', end: '20270620T103000', loc: 'The Tythe Barn' },
      { title: 'Room Turnaround', start: '20270620T180000', end: '20270620T190000', loc: 'The Tythe Barn' },
    );
  }

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vowora//Wedding Calendar//EN', 'X-WR-CALNAME:Emma & James Wedding'];
  for (const item of items) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${item.title.replace(/\s/g, '-').toLowerCase()}@wedora-demo`);
    lines.push(`DTSTART:${item.start}Z`);
    lines.push(`DTEND:${item.end}Z`);
    lines.push(`SUMMARY:${item.title}`);
    lines.push(`LOCATION:${item.loc}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function generateDemoCSV(category: ExportCategory, privacy: ExportPrivacy): string {
  const BOM = '\uFEFF';

  switch (category) {
    case 'guests': {
      const headers = privacy === 'organiser'
        ? ['Name', 'Email', 'Phone', 'Guest Type', 'RSVP Status', 'Dietary', 'Allergies', 'Accessibility', 'Meal Choice', 'Household', 'Relationship', 'Wedding Party Role']
        : ['Name', 'Guest Type', 'RSVP Status', 'Dietary', 'Meal Choice', 'Table'];
      const rows = [
        ['Oliver Bennett', 'oliver@example.com', '+44 7700 900001', 'Day', 'Accepted', 'Vegetarian', 'None', 'None', 'Vegetarian option', 'Bennett Family', 'Brother of bride', 'Best Man'],
        ['Maya Patel', 'maya@example.com', '+44 7700 900002', 'Day', 'Accepted', 'None', 'Nuts', 'None', 'Standard', 'Patel Family', 'Maid of Honour', 'Maid of Honour'],
        ['Sarah & Tom Williams', 'sarah@example.com', '+44 7700 900003', 'Day', 'Accepted', 'None', 'None', 'Wheelchair', 'Standard', 'Williams Family', 'Aunt & Uncle', ''],
        ['Emily Chen', 'emily@example.com', '+44 7700 900004', 'Day', 'Pending', 'Gluten-free', 'None', 'None', 'GF option', '—', 'Friend', ''],
        ['David & Lucy Brown', 'david@example.com', '+44 7700 900005', 'Evening', 'Accepted', 'None', 'None', 'None', '—', 'Brown Family', 'Colleagues', ''],
      ];
      const all = [headers, ...rows];
      return BOM + all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    case 'budget': {
      const headers = ['Category', 'Planned', 'Committed', 'Paid', 'Outstanding', 'Variance'];
      const rows = [
        ['Venue', '8000', '7500', '5000', '2500', '-500'],
        ['Catering', '8000', '7200', '3600', '3600', '-800'],
        ['Photography', '2240', '2000', '500', '1500', '-240'],
        ['Flowers', '1280', '1400', '700', '700', '+120'],
        ['Music & Entertainment', '2240', '2000', '400', '1600', '-240'],
        ['Attire', '1600', '1850', '1200', '650', '+250'],
        ['Transport', '480', '300', '200', '100', '-180'],
        ['Contingency', '1600', '0', '0', '0', '-1600'],
      ];
      const all = [headers, ...rows];
      return BOM + all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    case 'seating': {
      const headers = ['Table', 'Guest Name', 'Seat', 'Dietary', 'Meal Choice'];
      const rows = [
        ['Top Table', 'Emma Williams', '1', 'None', 'Standard'],
        ['Top Table', 'James Mitchell', '2', 'None', 'Standard'],
        ['Top Table', 'Oliver Bennett', '3', 'Vegetarian', 'Vegetarian'],
        ['Top Table', 'Maya Patel', '4', 'None', 'Standard'],
        ['Table 1', 'Sarah Williams', '1', 'None', 'Standard'],
        ['Table 1', 'Tom Williams', '2', 'None', 'Standard'],
        ['Table 1', 'Emily Chen', '3', 'Gluten-free', 'GF option'],
        ['Table 2', 'David Brown', '1', 'None', 'Standard'],
        ['Table 2', 'Lucy Brown', '2', 'None', 'Standard'],
      ];
      const all = [headers, ...rows];
      return BOM + all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    case 'suppliers': {
      const headers = ['Business Name', 'Category', 'Status', 'Contact', 'Email', 'Phone', 'Agreed Amount', 'Balance'];
      const rows = [
        ['Priston Mill', 'Venue', 'Booked', 'Sarah Johnson', 'sarah@pristonmill.co.uk', '+44 1225 423894', '7500', '2500'],
        ['Bloom & Wild', 'Florist', 'Booked', 'Emma Rose', 'emma@bloomandwild.co.uk', '+44 20 7123 4567', '1400', '700'],
        ['The Midnight Riders', 'Music', 'Booked', 'Jack Miller', 'jack@midnightriders.co.uk', '+44 7700 123456', '2000', '1600'],
        ['Jasmine Photography', 'Photography', 'Booked', 'James Chen', 'james@jasminphoto.co.uk', '+44 7700 654321', '2000', '1500'],
      ];
      const all = [headers, ...rows];
      return BOM + all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    case 'registry': {
      const headers = ['Item', 'Contributor', 'Amount', 'Status', 'Date'];
      const rows = [
        ['KitchenAid Stand Mixer', 'Sarah Williams', '50', 'Paid', '2027-06-14'],
        ['Le Creuset Dutch Oven', 'Emily Chen', '75', 'Paid', '2027-06-10'],
        ['Honeymoon Fund', 'Oliver Bennett', '200', 'Paid', '2027-06-08'],
        ['Honeymoon Fund', 'Maya Patel', '150', 'Paid', '2027-06-05'],
        ['Honeymoon Fund', 'David Brown', '100', 'Paid', '2027-06-01'],
      ];
      const all = [headers, ...rows];
      return BOM + all.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    }
    default: {
      return BOM + '"Category","Count","Notes"\n"Items","0","Export generated by Vowora Demo"';
    }
  }
}

// ── Export Card ──

function ExportCard({
  option, onGenerate,
}: {
  option: ExportOption;
  onGenerate: (format: ExportFormat, privacy: ExportPrivacy) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(option.formats[0]);
  const [selectedPrivacy, setSelectedPrivacy] = useState<ExportPrivacy>(option.privacies[0]);

  return (
    <div className="bg-white rounded-xl border border-secondary-200 p-5 hover:border-secondary-300 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-50 text-primary-500 flex-shrink-0">
          <i className={`${option.icon} text-lg`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-label text-sm font-semibold text-foreground-900">{option.label}</h3>
          <p className="text-xs text-foreground-500 mt-0.5">{option.description}</p>
          <p className="text-[10px] text-foreground-400 mt-1">{option.count} records</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pt-3 border-t border-secondary-100">
          {/* Format */}
          <div>
            <label className="block text-[10px] font-label text-foreground-500 mb-1">Format</label>
            <div className="flex gap-1.5">
              {option.formats.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFormat(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${
                    selectedFormat === f ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-secondary-100 text-foreground-500 border border-secondary-200'
                  }`}
                >{EXPORT_FORMAT_LABELS[f]}</button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-[10px] font-label text-foreground-500 mb-1">Privacy level</label>
            <div className="flex gap-1.5 flex-wrap">
              {option.privacies.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPrivacy(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-label cursor-pointer whitespace-nowrap transition-colors ${
                    selectedPrivacy === p ? 'bg-accent-100 text-accent-700 border border-accent-200' : 'bg-secondary-100 text-foreground-500 border border-secondary-200'
                  }`}
                >{EXPORT_PRIVACY_LABELS[p]}</button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={() => onGenerate(selectedFormat, selectedPrivacy)}
            className="w-full px-4 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-download-line mr-1.5" />
            Generate {EXPORT_FORMAT_LABELS[selectedFormat]}
          </button>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap"
      >
        {expanded ? 'Less options' : 'Export options'}
        <i className={`ml-1 ${expanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// Demo Export Centre
// ═══════════════════════════════════════════

function DemoExportCentre() {
  const [toast, setToast] = useState('');
  const [generating, setGenerating] = useState(false);
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null);
  const [history, setHistory] = useState<ExportRequest[]>(DEMO_EXPORT_HISTORY);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (format: ExportFormat, privacy: ExportPrivacy, category: ExportCategory) => {
    setGenerating(true);
    setActiveGeneration(`${category}-${format}`);

    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 800));

    let filename = '';
    let content = '';
    let mimeType = '';

    if (format === 'ics') {
      content = generateDemoICS(privacy);
      filename = `wedding-${category}-${privacy}.ics`;
      mimeType = 'text/calendar;charset=utf-8';
    } else if (format === 'csv') {
      content = generateDemoCSV(category, privacy);
      filename = `wedding-${category}-${privacy}.csv`;
      mimeType = 'text/csv;charset=utf-8';
    } else {
      // PDF placeholder
      content = 'Vowora Export — PDF generation would happen server-side in production.';
      filename = `wedding-${category}-${privacy}.txt`;
      mimeType = 'text/plain';
      showToast('PDF requires server-side generation — showing preview instead');
    }

    handleDownload(content, filename, mimeType);

    // Add to history
    const newExp: ExportRequest = {
      id: `exp-${Date.now()}`,
      wedding_id: 'demo',
      requested_by: null,
      export_type: `${category}_${format}`,
      status: 'completed',
      storage_path: null,
      contains_sensitive_data: privacy === 'organiser',
      requested_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      expires_at: null,
      error_message: null,
      created_at: new Date().toISOString(),
      requested_by_name: 'You',
    };
    setHistory((prev) => [newExp, ...prev]);

    setGenerating(false);
    setActiveGeneration(null);
    showToast(`${EXPORT_FORMAT_LABELS[format]} export downloaded`);
  };

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-1">Reports and sharing</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Export Centre</h1>
            <p className="text-sm text-foreground-500 mt-1">Download your wedding planning data in PDF, CSV and calendar formats.</p>
          </div>
          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold whitespace-nowrap">Demo</span>
        </div>

        {/* Privacy info */}
        <div className="mb-6 p-4 rounded-xl bg-background-50 border border-secondary-200">
          <h3 className="font-label text-xs font-semibold text-foreground-700 mb-2">
            <i className="ri-shield-check-line mr-1 text-primary-500" />Privacy levels
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white border border-secondary-200">
              <p className="font-semibold text-foreground-900 mb-0.5">Organiser copy</p>
              <p className="text-foreground-500">Full data including internal notes, payments, and private contact details.</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-secondary-200">
              <p className="font-semibold text-foreground-900 mb-0.5">Supplier-safe copy</p>
              <p className="text-foreground-500">Relevant information only — no internal notes, payment references, or private guest data.</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-secondary-200">
              <p className="font-semibold text-foreground-900 mb-0.5">Guest-safe copy</p>
              <p className="text-foreground-500">Public information only — no contact details, dietary info, or access tokens.</p>
            </div>
          </div>
        </div>

        {/* Export cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {EXPORT_OPTIONS.map((opt) => (
            <ExportCard
              key={opt.category}
              option={opt}
              onGenerate={(format, privacy) => handleGenerate(format, privacy, opt.category)}
            />
          ))}
        </div>

        {/* Generation progress */}
        {generating && activeGeneration && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-xl bg-foreground-900 text-white text-sm shadow-lg">
            <i className="ri-loader-4-line animate-spin" />
            <span>Generating export...</span>
          </div>
        )}

        {/* Export history */}
        <div className="bg-white rounded-xl border border-secondary-200 p-5">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Recent exports</h2>
          {history.length === 0 ? (
            <p className="text-sm text-foreground-400 text-center py-8">No exports yet. Generate one above to see it here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100">
                    <th className="text-left py-2 px-2 text-xs font-label text-foreground-500">Type</th>
                    <th className="text-left py-2 px-2 text-xs font-label text-foreground-500">Requested by</th>
                    <th className="text-left py-2 px-2 text-xs font-label text-foreground-500">Date</th>
                    <th className="text-center py-2 px-2 text-xs font-label text-foreground-500">Status</th>
                    <th className="text-center py-2 px-2 text-xs font-label text-foreground-500 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((exp) => (
                    <tr key={exp.id} className="border-b border-secondary-50 hover:bg-background-50">
                      <td className="py-2 px-2 text-xs font-label text-foreground-800 capitalize">{exp.export_type.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-2 text-xs text-foreground-500">{exp.requested_by_name || '—'}</td>
                      <td className="py-2 px-2 text-xs text-foreground-500">
                        {new Date(exp.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-label ${EXPORT_STATUS_COLORS[exp.status]}`}>
                          {EXPORT_STATUS_LABELS[exp.status]}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {exp.status === 'completed' ? (
                          <span className="text-[10px] text-emerald-600 font-label">Downloaded</span>
                        ) : exp.status === 'failed' ? (
                          <button className="text-[10px] text-primary-600 hover:underline font-label cursor-pointer">Retry</button>
                        ) : (
                          <span className="text-[10px] text-foreground-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Import instructions */}
        <div className="mt-8 p-5 rounded-xl bg-background-50 border border-secondary-200">
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-3">
            <i className="ri-information-line mr-1 text-primary-500" />Importing calendar files
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-white border border-secondary-200">
              <p className="font-semibold text-foreground-900 mb-1">Google Calendar</p>
              <p className="text-foreground-500">Settings &gt; Import &amp; Export &gt; Select .ics file &gt; Import</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-secondary-200">
              <p className="font-semibold text-foreground-900 mb-1">Apple Calendar</p>
              <p className="text-foreground-500">File &gt; Import &gt; Select .ics file &gt; Choose calendar</p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-secondary-200">
              <p className="font-semibold text-foreground-900 mb-1">Outlook</p>
              <p className="text-foreground-500">File &gt; Open &amp; Export &gt; Import/Export &gt; Import .ics</p>
            </div>
          </div>
          <p className="text-[10px] text-foreground-400 mt-3">No live two-way sync is available. Re-export when your plans change.</p>
        </div>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Normal Export Centre
// ═══════════════════════════════════════════

function NormalExportCentre() {
  const { weddingId } = useActiveWedding();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-1">Reports and sharing</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Export Centre</h1>
            <p className="text-sm text-foreground-500 mt-1">Download your wedding planning data in PDF, CSV and calendar formats.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-secondary-200 p-6 text-center py-20">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-400 mb-4">
            <i className="ri-download-cloud-2-line text-xl" />
          </div>
          <h2 className="font-heading text-lg text-foreground-700 mb-1">Export generation</h2>
          <p className="text-sm text-foreground-500 mb-4">Production exports will use Supabase Edge Functions for secure server-side file generation.</p>
          <p className="text-xs text-foreground-400">Connected to wedding: <code className="px-1.5 py-0.5 rounded bg-secondary-100 text-secondary-700 font-mono text-[11px]">{weddingId || '—'}</code></p>
        </div>
      </div>
    </AppShell>
  );
}

// ── Page export ──

export default function ExportCentrePage() {
  if (isDemoMode) return <DemoExportCentre />;
  return <NormalExportCentre />;
}