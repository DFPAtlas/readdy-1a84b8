import { useState, useMemo, useCallback, useEffect } from 'react';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { useWeddingEvents } from '@/hooks/useWeddingEvents';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { TimelineItem, TimelineFormData, TimelineValidation, TimelineCategory, TimelineVisibility, TimelineStatus } from '@/types/timeline';
import { TIMELINE_CATEGORY_LABELS, TIMELINE_CATEGORY_ICONS, TIMELINE_STATUS_LABELS, TIMELINE_STATUS_COLORS, TIMELINE_PRIORITY_COLORS, TIMELINE_VISIBILITY_LABELS, EMPTY_TIMELINE_FORM } from '@/types/timeline';

// ── Demo Timeline Data ──

const DEMO_TIMELINE_ITEMS: TimelineItem[] = [
  { id: 'ti-1', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Hair & makeup artists arrive', category: 'hair_makeup', start_at: '2027-06-20T07:00:00', end_at: '2027-06-20T08:00:00', duration_min: 60, description: 'Bridal party hair and makeup at the venue', location: 'Bridal Suite, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Sarah (MUA)', internal_notes: 'Confirm arrival time 1 week before', shared_notes: null, visibility: 'private', status: 'confirmed', priority: 'high', sort_order: 1, created_at: '', updated_at: '' },
  { id: 'ti-2', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Florist delivers bouquets', category: 'delivery', start_at: '2027-06-20T08:30:00', end_at: '2027-06-20T09:00:00', duration_min: 30, description: 'Bridal bouquet, bridesmaid bouquets, buttonholes', location: 'Main entrance, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Bloom & Wild', internal_notes: 'Check buttonhole count matches groomsmen', shared_notes: null, visibility: 'private', status: 'confirmed', priority: 'high', sort_order: 2, created_at: '', updated_at: '' },
  { id: 'ti-3', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Photographer arrives', category: 'photography', start_at: '2027-06-20T09:00:00', end_at: '2027-06-20T09:30:00', duration_min: 30, description: 'Getting-ready shots of bridal party', location: 'Bridal Suite, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'James (Photographer)', internal_notes: 'Shot list in shared folder', shared_notes: 'Photos of details: rings, dress, shoes, invitations', visibility: 'supplier', status: 'confirmed', priority: 'high', sort_order: 3, created_at: '', updated_at: '' },
  { id: 'ti-4', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Groom & groomsmen arrive', category: 'setup', start_at: '2027-06-20T10:00:00', end_at: '2027-06-20T10:30:00', duration_min: 30, description: 'Meet at the Tythe Barn, final check on setup', location: 'The Tythe Barn, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'James (Groom)', internal_notes: 'Rings with best man', shared_notes: null, visibility: 'collaborator', status: 'confirmed', priority: 'high', sort_order: 4, created_at: '', updated_at: '' },
  { id: 'ti-5', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Ceremony', category: 'ceremony_action', start_at: '2027-06-20T13:00:00', end_at: '2027-06-20T14:00:00', duration_min: 60, description: 'Wedding ceremony in the Tythe Barn', location: 'The Tythe Barn, Priston Mill', wedding_event_id: 'demo-event-ceremony', supplier_id: null, assigned_user_id: null, responsible_contact: 'Registrar', internal_notes: 'Music: Canon in D for entrance, Signed Sealed Delivered for exit', shared_notes: null, visibility: 'guest', status: 'confirmed', priority: 'high', sort_order: 10, created_at: '', updated_at: '', linked_event_name: 'Ceremony', linked_event_time: '13:00', linked_event_venue: 'The Tythe Barn' },
  { id: 'ti-6', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Drinks reception & photos', category: 'reception_action', start_at: '2027-06-20T14:00:00', end_at: '2027-06-20T16:00:00', duration_min: 120, description: 'Canapés and drinks in the courtyard, group photos', location: 'Courtyard, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'James (Photographer)', internal_notes: 'Group shot list with ushers', shared_notes: 'Canapés and welcome drinks served', visibility: 'guest', status: 'confirmed', priority: 'medium', sort_order: 11, created_at: '', updated_at: '' },
  { id: 'ti-7', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Wedding breakfast', category: 'catering', start_at: '2027-06-20T16:00:00', end_at: '2027-06-20T18:00:00', duration_min: 120, description: '3-course meal in the Tythe Barn', location: 'The Tythe Barn, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Catering manager', internal_notes: 'Top table: couple + parents + best man + maid of honour', shared_notes: null, visibility: 'guest', status: 'confirmed', priority: 'medium', sort_order: 12, created_at: '', updated_at: '' },
  { id: 'ti-8', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Speeches', category: 'speech', start_at: '2027-06-20T17:30:00', end_at: '2027-06-20T18:00:00', duration_min: 30, description: "Father of the bride, groom, best man", location: 'The Tythe Barn, Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Toastmaster', internal_notes: 'Order: Emma\'s dad, James, Tom (best man). Keep to 5 min each.', shared_notes: null, visibility: 'guest', status: 'confirmed', priority: 'medium', sort_order: 13, created_at: '', updated_at: '' },
  { id: 'ti-9', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Room turnaround', category: 'room_turnaround', start_at: '2027-06-20T18:00:00', end_at: '2027-06-20T19:00:00', duration_min: 60, description: 'Move tables, set up dance floor and band equipment', location: 'The Tythe Barn', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Venue coordinator', internal_notes: 'Band needs 45 min soundcheck', shared_notes: null, visibility: 'private', status: 'confirmed', priority: 'high', sort_order: 14, created_at: '', updated_at: '' },
  { id: 'ti-10', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Evening reception begins', category: 'entertainment', start_at: '2027-06-20T19:00:00', end_at: '2027-06-20T19:30:00', duration_min: 30, description: 'First dance, then band set 1', location: 'The Tythe Barn', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'The Midnight Riders (band)', internal_notes: 'First dance song: "At Last" by Etta James', shared_notes: null, visibility: 'guest', status: 'confirmed', priority: 'medium', sort_order: 15, created_at: '', updated_at: '' },
  { id: 'ti-11', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Evening food served', category: 'catering', start_at: '2027-06-20T21:00:00', end_at: '2027-06-20T22:00:00', duration_min: 60, description: 'Pizza and grazing table', location: 'Courtyard', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Catering manager', internal_notes: 'Vegan pizza option confirmed', shared_notes: null, visibility: 'guest', status: 'confirmed', priority: 'low', sort_order: 16, created_at: '', updated_at: '' },
  { id: 'ti-12', wedding_id: 'demo', timeline_date: '2027-06-20', title: 'Carriages', category: 'transport', start_at: '2027-06-20T23:30:00', end_at: '2027-06-20T23:45:00', duration_min: 15, description: 'Last dance, taxis arrive', location: 'Priston Mill', wedding_event_id: null, supplier_id: null, assigned_user_id: null, responsible_contact: 'Taxi company', internal_notes: 'Pre-booked: 6 cars at 23:30', shared_notes: null, visibility: 'guest', status: 'confirmed', priority: 'medium', sort_order: 17, created_at: '', updated_at: '' },
];

// ── Helpers ──

function formatTimeSimple(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(mins: number | null): string {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Validation ──

function validateTimeline(items: TimelineItem[]): TimelineValidation[] {
  const validations: TimelineValidation[] = [];
  const sorted = [...items].sort((a, b) => (a.start_at || '').localeCompare(b.start_at || ''));

  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];

    // Missing start time
    if (!curr.start_at) {
      validations.push({
        id: `val-missing-time-${curr.id}`,
        type: 'missing_duration',
        message: `"${curr.title}" has no start time`,
        itemIds: [curr.id],
        severity: 'warning',
      });
    }

    // Missing location for guest-facing items
    if ((curr.visibility === 'guest' || curr.visibility === 'supplier') && !curr.location) {
      validations.push({
        id: `val-missing-loc-${curr.id}`,
        type: 'missing_location',
        message: `"${curr.title}" is shared but has no location`,
        itemIds: [curr.id],
        severity: 'warning',
      });
    }

    // Gap detection
    if (curr.end_at && next?.start_at) {
      const gapMs = new Date(next.start_at).getTime() - new Date(curr.end_at).getTime();
      if (gapMs > 30 * 60 * 1000) {
        validations.push({
          id: `val-gap-${curr.id}-${next.id}`,
          type: 'gap',
          message: `${Math.round(gapMs / 60000)}min gap between "${curr.title}" and "${next.title}"`,
          itemIds: [curr.id, next.id],
          severity: 'info',
        });
      }
    }

    // Private notes in shareable item
    if (curr.visibility !== 'private' && curr.internal_notes) {
      validations.push({
        id: `val-private-${curr.id}`,
        type: 'private_in_shareable',
        message: `"${curr.title}" has internal notes but is shared with ${TIMELINE_VISIBILITY_LABELS[curr.visibility]}`,
        itemIds: [curr.id],
        severity: 'info',
      });
    }
  }

  return validations;
}

// ── Timeline Item Card ──

function TimelineCard({
  item, isFirst, isLast, onEdit, onMoveUp, onMoveDown,
}: {
  item: TimelineItem; isFirst: boolean; isLast: boolean;
  onEdit: (item: TimelineItem) => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  return (
    <div className="flex gap-3 group">
      {/* Time column */}
      <div className="w-14 flex-shrink-0 text-right pt-1">
        <p className="text-xs font-label font-semibold text-foreground-700">{formatTimeSimple(item.start_at)}</p>
        {item.end_at && (
          <p className="text-[10px] text-foreground-400">{formatTimeSimple(item.end_at)}</p>
        )}
        {item.duration_min && (
          <p className="text-[9px] text-foreground-400">{formatDuration(item.duration_min)}</p>
        )}
      </div>

      {/* Timeline line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-0.5 flex-1 ${isFirst ? 'bg-transparent' : 'bg-secondary-200'}`} />
        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${item.category === 'ceremony_action' ? 'border-primary-500 bg-primary-100' : 'border-secondary-300 bg-white'}`} />
        <div className={`w-0.5 flex-1 ${isLast ? 'bg-transparent' : 'bg-secondary-200'}`} />
      </div>

      {/* Content card */}
      <div
        onClick={() => onEdit(item)}
        className={`flex-1 min-w-0 mb-3 p-3 rounded-xl border cursor-pointer transition-all ${
          item.status === 'completed' ? 'bg-emerald-50/50 border-emerald-200' :
          item.status === 'cancelled' ? 'bg-red-50/30 border-red-200 line-through opacity-60' :
          'bg-white border-secondary-200 hover:border-secondary-300 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <i className={`${TIMELINE_CATEGORY_ICONS[item.category]} text-xs ${item.category === 'ceremony_action' ? 'text-primary-500' : 'text-foreground-400'}`} />
            <p className="text-sm font-label font-semibold text-foreground-900">{item.title}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-label ${TIMELINE_STATUS_COLORS[item.status]}`}>
              {TIMELINE_STATUS_LABELS[item.status]}
            </span>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 cursor-pointer disabled:opacity-30" title="Move up">
              <i className="ri-arrow-up-s-line text-xs" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 cursor-pointer disabled:opacity-30" title="Move down">
              <i className="ri-arrow-down-s-line text-xs" />
            </button>
          </div>
        </div>

        {item.description && <p className="text-xs text-foreground-500 mb-1.5 line-clamp-2">{item.description}</p>}

        <div className="flex items-center gap-3 flex-wrap text-[10px] text-foreground-400">
          {item.location && <span><i className="ri-map-pin-line mr-0.5" />{item.location}</span>}
          {item.responsible_contact && <span><i className="ri-user-line mr-0.5" />{item.responsible_contact}</span>}
          {item.linked_event_name && (
            <span className="text-primary-600"><i className="ri-link mr-0.5" />{item.linked_event_name}</span>
          )}
          {item.visibility !== 'private' && (
            <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-600">{TIMELINE_VISIBILITY_LABELS[item.visibility]}</span>
          )}
        </div>

        {/* Move buttons on mobile (always visible) */}
        <div className="flex items-center gap-1 mt-2 lg:hidden">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="px-2 py-1 rounded text-[10px] font-label text-foreground-500 hover:bg-background-100 cursor-pointer disabled:opacity-30 whitespace-nowrap">
            <i className="ri-arrow-up-s-line mr-0.5" />Up
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="px-2 py-1 rounded text-[10px] font-label text-foreground-500 hover:bg-background-100 cursor-pointer disabled:opacity-30 whitespace-nowrap">
            <i className="ri-arrow-down-s-line mr-0.5" />Down
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Item Editor Drawer ──

function ItemEditorDrawer({
  open, item, onSave, onClose, onDelete, events,
}: {
  open: boolean; item: TimelineItem | null; onSave: (data: TimelineFormData) => void; onClose: () => void;
  onDelete: (id: string) => void; events: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<TimelineFormData>(EMPTY_TIMELINE_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title,
        category: item.category,
        start_at: item.start_at || '',
        end_at: item.end_at || '',
        duration_min: item.duration_min,
        description: item.description || '',
        location: item.location || '',
        wedding_event_id: item.wedding_event_id,
        supplier_id: item.supplier_id,
        assigned_user_id: item.assigned_user_id,
        responsible_contact: item.responsible_contact || '',
        internal_notes: item.internal_notes || '',
        shared_notes: item.shared_notes || '',
        visibility: item.visibility,
        status: item.status,
        priority: item.priority,
      });
    } else {
      setForm({ ...EMPTY_TIMELINE_FORM, start_at: '', end_at: '' });
    }
    setErrors([]);
  }, [item, open]);

  if (!open) return null;

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push('Title is required');
    if (form.start_at && form.end_at && form.start_at >= form.end_at) errs.push('End time must be after start time');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-t-2xl lg:rounded-2xl w-full lg:max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-secondary-100 flex-shrink-0">
          <h3 className="font-heading text-base text-foreground-900">{item ? 'Edit timeline item' : 'Add timeline item'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 cursor-pointer">
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. First dance" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TimelineCategory }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
              {(Object.keys(TIMELINE_CATEGORY_LABELS) as TimelineCategory[]).map((c) => (
                <option key={c} value={c}>{TIMELINE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Start & End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-label text-foreground-600 mb-1">Start time</label>
              <input type="datetime-local" value={form.start_at ? form.start_at.slice(0, 16) : ''} onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-xs font-label text-foreground-600 mb-1">End time</label>
              <input type="datetime-local" value={form.end_at ? form.end_at.slice(0, 16) : ''} onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. The Tythe Barn" />
          </div>

          {/* Responsible contact */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Responsible contact</label>
            <input type="text" value={form.responsible_contact} onChange={(e) => setForm((f) => ({ ...f, responsible_contact: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" placeholder="e.g. Sarah (MUA)" />
          </div>

          {/* Linked event */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Linked wedding event</label>
            <select value={form.wedding_event_id || ''} onChange={(e) => setForm((f) => ({ ...f, wedding_event_id: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
              <option value="">None</option>
              {events.map((evt) => <option key={evt.id} value={evt.id}>{evt.name}</option>)}
            </select>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Visibility</label>
            <select value={form.visibility} onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as TimelineVisibility }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
              {(Object.keys(TIMELINE_VISIBILITY_LABELS) as TimelineVisibility[]).map((v) => (
                <option key={v} value={v}>{TIMELINE_VISIBILITY_LABELS[v]}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TimelineStatus }))}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
              {(Object.keys(TIMELINE_STATUS_LABELS) as TimelineStatus[]).map((s) => (
                <option key={s} value={s}>{TIMELINE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Priority</label>
            <div className="flex gap-2">
              {(['high', 'medium', 'low'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-label cursor-pointer whitespace-nowrap capitalize transition-colors ${
                    form.priority === p ? TIMELINE_PRIORITY_COLORS[p] + ' font-semibold' : 'bg-secondary-100 text-foreground-400'
                  }`}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 resize-none" />
          </div>

          {/* Internal notes */}
          <div>
            <label className="block text-xs font-label text-foreground-600 mb-1">Internal notes (organiser only)</label>
            <textarea value={form.internal_notes} onChange={(e) => setForm((f) => ({ ...f, internal_notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 resize-none" />
          </div>

          {/* Shared notes */}
          {form.visibility !== 'private' && (
            <div>
              <label className="block text-xs font-label text-foreground-600 mb-1">Shared notes ({TIMELINE_VISIBILITY_LABELS[form.visibility]})</label>
              <textarea value={form.shared_notes} onChange={(e) => setForm((f) => ({ ...f, shared_notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400 resize-none" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-secondary-100 flex-shrink-0">
          <div>
            {item && (
              <button onClick={() => onDelete(item.id)} className="px-3 py-2 text-xs font-label text-red-600 hover:bg-red-50 rounded-lg cursor-pointer whitespace-nowrap">
                <i className="ri-delete-bin-line mr-1" />Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">
              Cancel
            </button>
            <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap">
              <i className="ri-check-line mr-1" />{item ? 'Update' : 'Add item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Validation Panel ──

function ValidationPanel({ validations, onDismiss }: { validations: TimelineValidation[]; onDismiss: (id: string) => void }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = validations.filter((v) => !dismissed.has(v.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-label text-xs font-semibold text-amber-800">
          <i className="ri-alert-line mr-1" />{visible.length} validation note{visible.length !== 1 ? 's' : ''}
        </h3>
      </div>
      <div className="space-y-1.5">
        {visible.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-2 text-xs text-amber-700">
            <span>{v.message}</span>
            <button onClick={() => setDismissed((s) => new Set(s).add(v.id))} className="text-amber-400 hover:text-amber-600 flex-shrink-0 cursor-pointer">
              <i className="ri-close-line" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Demo Timeline Page
// ═══════════════════════════════════════════

function DemoTimelinePage() {
  const demo = useDemoDataSafe();
  const [items, setItems] = useState<TimelineItem[]>(() => {
    try {
      const saved = localStorage.getItem('vowora-demo-timeline');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEMO_TIMELINE_ITEMS;
  });
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterVis, setFilterVis] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState('2027-06-20');

  const state = demo?.state;
  const events = (state?.events || []).map((e) => ({ id: e.id, name: e.name }));

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('vowora-demo-timeline', JSON.stringify(items));
  }, [items]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const sorted = useMemo(() => {
    let filtered = items.filter((i) => i.timeline_date === selectedDate);
    if (filterCat !== 'all') filtered = filtered.filter((i) => i.category === filterCat);
    if (filterVis !== 'all') filtered = filtered.filter((i) => i.visibility === filterVis);
    return [...filtered].sort((a, b) => a.sort_order - b.sort_order);
  }, [items, selectedDate, filterCat, filterVis]);

  const validations = useMemo(() => validateTimeline(sorted), [sorted]);

  const handleSave = (form: TimelineFormData) => {
    if (editingItem) {
      setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...form, updated_at: new Date().toISOString() } : i));
      showToast('Item updated');
    } else {
      const newItem: TimelineItem = {
        id: `ti-${Date.now()}`,
        wedding_id: 'demo',
        timeline_date: selectedDate,
        ...form,
        sort_order: items.filter((i) => i.timeline_date === selectedDate).length + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, newItem]);
      showToast('Item added');
    }
    setDrawerOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDrawerOpen(false);
    setEditingItem(null);
    showToast('Item deleted');
  };

  const handleMove = (id: string, dir: number) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const updated = [...prev];
      const tmp = updated[idx].sort_order;
      updated[idx] = { ...updated[idx], sort_order: updated[swapIdx].sort_order, updated_at: new Date().toISOString() };
      updated[swapIdx] = { ...updated[swapIdx], sort_order: tmp, updated_at: new Date().toISOString() };
      return updated;
    });
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setDrawerOpen(true);
  };

  const handleExportICS = () => {
    const icsLines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vowora//Wedding Timeline//EN'];
    for (const item of sorted) {
      if (!item.start_at) continue;
      const dtStart = item.start_at.replace(/[-:]/g, '').slice(0, 15) + 'Z';
      const dtEnd = item.end_at ? item.end_at.replace(/[-:]/g, '').slice(0, 15) + 'Z' : dtStart;
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`UID:${item.id}@vowora-demo`);
      icsLines.push(`DTSTART:${dtStart}`);
      icsLines.push(`DTEND:${dtEnd}`);
      icsLines.push(`SUMMARY:${item.title}`);
      if (item.location) icsLines.push(`LOCATION:${item.location}`);
      if (item.description) icsLines.push(`DESCRIPTION:${item.description.replace(/\n/g, '\\n')}`);
      icsLines.push('END:VEVENT');
    }
    icsLines.push('END:VCALENDAR');
    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-day-timeline.ics';
    a.click();
    URL.revokeObjectURL(url);
    showToast('ICS export downloaded');
  };

  return (
    <AppShell>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-accent-500 text-white text-sm font-label font-medium shadow-lg whitespace-nowrap">
          <i className="ri-check-line mr-2" />{toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-1">Day-of planning</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding-Day Timeline</h1>
            <p className="text-sm text-foreground-500 mt-1">Build a detailed operational run sheet for your wedding day.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold">Demo</span>
            <button onClick={handleExportICS} className="px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-download-line mr-1" />Export .ics
            </button>
            <button onClick={handleOpenCreate} className="px-3 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1" />Add item
            </button>
          </div>
        </div>

        {/* Validation */}
        <ValidationPanel validations={validations} onDismiss={() => {}} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-400" />
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="all">All categories</option>
            {(Object.keys(TIMELINE_CATEGORY_LABELS) as TimelineCategory[]).map((c) => (
              <option key={c} value={c}>{TIMELINE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select value={filterVis} onChange={(e) => setFilterVis(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-700 focus:outline-none cursor-pointer">
            <option value="all">All visibility</option>
            {(Object.keys(TIMELINE_VISIBILITY_LABELS) as TimelineVisibility[]).map((v) => (
              <option key={v} value={v}>{TIMELINE_VISIBILITY_LABELS[v]}</option>
            ))}
          </select>
          <span className="text-xs text-foreground-400 ml-auto">{sorted.length} item{sorted.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Timeline */}
        {sorted.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-secondary-200">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
              <i className="ri-time-line text-xl" />
            </div>
            <h2 className="font-heading text-lg text-foreground-700 mb-1">No timeline items</h2>
            <p className="text-sm text-foreground-500 mb-6">Add your first timeline item to start building the run sheet.</p>
            <button onClick={handleOpenCreate} className="px-5 py-2.5 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 cursor-pointer whitespace-nowrap">
              <i className="ri-add-line mr-1" />Add first item
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-secondary-200 p-4 md:p-6">
            {sorted.map((item, idx) => (
              <TimelineCard
                key={item.id}
                item={item}
                isFirst={idx === 0}
                isLast={idx === sorted.length - 1}
                onEdit={(it) => { setEditingItem(it); setDrawerOpen(true); }}
                onMoveUp={() => handleMove(item.id, -1)}
                onMoveDown={() => handleMove(item.id, 1)}
              />
            ))}
          </div>
        )}

        {/* Editor drawer */}
        <ItemEditorDrawer
          open={drawerOpen}
          item={editingItem}
          onSave={handleSave}
          onClose={() => { setDrawerOpen(false); setEditingItem(null); }}
          onDelete={handleDelete}
          events={events}
        />
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Normal (production) Timeline Page
// ═══════════════════════════════════════════

function NormalTimelinePage() {
  const { weddingId } = useActiveWedding();
  const eventsHook = useWeddingEvents();

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterVis, setFilterVis] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');

  const events = eventsHook.events.map((e) => ({ id: e.id, name: e.name }));

  useEffect(() => {
    setLoading(true);
    // Placeholder — Supabase fetch will be added when connected
    setItems([]);
    setLoading(false);
  }, [weddingId]);

  const sorted = useMemo(() => {
    let filtered = selectedDate ? items.filter((i) => i.timeline_date === selectedDate) : items;
    if (filterCat !== 'all') filtered = filtered.filter((i) => i.category === filterCat);
    if (filterVis !== 'all') filtered = filtered.filter((i) => i.visibility === filterVis);
    return [...filtered].sort((a, b) => a.sort_order - b.sort_order);
  }, [items, selectedDate, filterCat, filterVis]);

  const validations = useMemo(() => validateTimeline(sorted), [sorted]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading timeline...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-1">Day-of planning</p>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding-Day Timeline</h1>
            <p className="text-sm text-foreground-500 mt-1">Build a detailed operational run sheet for your wedding day.</p>
          </div>
        </div>

        <ValidationPanel validations={validations} onDismiss={() => {}} />

        <div className="bg-white rounded-xl border border-secondary-200 p-6 text-center py-20">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-400 mb-4">
            <i className="ri-time-line text-xl" />
          </div>
          <h2 className="font-heading text-lg text-foreground-700 mb-1">Timeline coming soon</h2>
          <p className="text-sm text-foreground-500 mb-4">The production timeline will sync with your Supabase timeline_items table.</p>
        </div>
      </div>
    </AppShell>
  );
}

// ── Page export ──

export default function TimelinePage() {
  if (isDemoMode) return <DemoTimelinePage />;
  return <NormalTimelinePage />;
}