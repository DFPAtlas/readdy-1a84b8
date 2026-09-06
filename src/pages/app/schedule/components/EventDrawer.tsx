import { useState, useRef, useEffect } from 'react';
import type { WeddingEvent, WeddingVenue } from '@/hooks/useWeddingEvents';
import { EVENT_TYPE_OPTIONS, EVENT_VISIBILITY_OPTIONS } from '@/hooks/useWeddingEvents';
import { useActiveWedding } from '@/hooks/useActiveWedding';

interface EventDrawerProps {
  event: WeddingEvent | null;
  venues: WeddingVenue[];
  onSave: (data: Partial<WeddingEvent>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export default function EventDrawer({ event, venues, onSave, onClose, saving }: EventDrawerProps) {
  const { wedding } = useActiveWedding();
  const isEditing = !!event;
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // ── Form state ──
  const [name, setName] = useState(event?.name || '');
  const [eventType, setEventType] = useState(event?.event_type || 'ceremony');
  const [description, setDescription] = useState(event?.description || '');
  const [guestDescription, setGuestDescription] = useState(event?.guest_description || '');
  const [startAt, setStartAt] = useState(event?.start_at ? event.start_at.slice(0, 16) : '');
  const [endAt, setEndAt] = useState(event?.end_at ? event.end_at.slice(0, 16) : '');
  const [venueId, setVenueId] = useState(event?.venue_id || '');
  const [dressCode, setDressCode] = useState(event?.dress_code || '');
  const [arrivalOffset, setArrivalOffset] = useState(String(event?.arrival_offset_minutes ?? 0));
  const [parkingNotes, setParkingNotes] = useState(event?.parking_notes || '');
  const [transportNotes, setTransportNotes] = useState(event?.transport_notes || '');
  const [accessibilityNotes, setAccessibilityNotes] = useState(event?.accessibility_notes || '');
  const [childrenNotes, setChildrenNotes] = useState(event?.children_notes || '');
  const [visibility, setVisibility] = useState(event?.visibility || 'public');
  const [revealAt, setRevealAt] = useState(event?.reveal_at ? event.reveal_at.slice(0, 16) : '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const selectedVenue = venues.find((v) => v.id === venueId);
  const timezone = wedding?.timezone || 'Europe/London';

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dirty, onClose]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Event name is required';
    if (!eventType) errors.eventType = 'Event type is required';
    if (startAt && endAt && endAt <= startAt) errors.endAt = 'End time must be after start time';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const startAtFull = startAt ? new Date(startAt).toISOString() : null;
    const endAtFull = endAt ? new Date(endAt).toISOString() : null;
    const revealAtFull = revealAt ? new Date(revealAt).toISOString() : null;

    await onSave({
      name: name.trim(),
      event_type: eventType,
      description: description.trim() || null,
      guest_description: guestDescription.trim() || null,
      start_at: startAtFull,
      end_at: endAtFull,
      venue_id: venueId || null,
      dress_code: dressCode.trim() || null,
      arrival_offset_minutes: parseInt(arrivalOffset, 10) || 0,
      parking_notes: parkingNotes.trim() || null,
      transport_notes: transportNotes.trim() || null,
      accessibility_notes: accessibilityNotes.trim() || null,
      children_notes: childrenNotes.trim() || null,
      visibility,
      reveal_at: visibility === 'reveal_on_date' ? revealAtFull : null,
    });
  };

  const markDirty = () => { if (!dirty) setDirty(true); };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => {
        if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return;
        onClose();
      }} />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-xl flex flex-col overflow-hidden animate-[slideInRight_0.25s_ease-out]"
        role="dialog"
        aria-label={isEditing ? 'Edit event' : 'Add event'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 flex-shrink-0">
          <h2 className="font-heading text-lg text-foreground-900">
            {isEditing ? 'Edit event' : 'Add event'}
          </h2>
          <button
            onClick={() => {
              if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return;
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-600 cursor-pointer transition-colors"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* A. Basics */}
          <fieldset>
            <legend className="text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider mb-3">Basics</legend>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Event name <span className="text-red-400">*</span></label>
                <input
                  ref={firstInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); markDirty(); }}
                  placeholder="e.g. Wedding Ceremony"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-primary-400 ${formErrors.name ? 'border-red-300 bg-red-50' : 'border-secondary-200'}`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Event type <span className="text-red-400">*</span></label>
                <select
                  value={eventType}
                  onChange={(e) => { setEventType(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white focus:outline-none focus:border-primary-400 cursor-pointer"
                >
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Internal description</label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                  placeholder="Notes for you and your planner..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Guest-facing description</label>
                <textarea
                  value={guestDescription}
                  onChange={(e) => { setGuestDescription(e.target.value); markDirty(); }}
                  placeholder="What guests will see in their itinerary..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Start date &amp; time</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => { setStartAt(e.target.value); markDirty(); }}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">End date &amp; time</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => { setEndAt(e.target.value); markDirty(); }}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:border-primary-400 ${formErrors.endAt ? 'border-red-300 bg-red-50' : 'border-secondary-200'}`}
                  />
                  {formErrors.endAt && <p className="text-xs text-red-500 mt-1">{formErrors.endAt}</p>}
                </div>
              </div>
              <p className="text-[10px] text-foreground-400">Timezone: {timezone}</p>
            </div>
          </fieldset>

          {/* B. Venue */}
          <fieldset>
            <legend className="text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider mb-3">Venue</legend>
            <div className="space-y-3">
              <select
                value={venueId}
                onChange={(e) => { setVenueId(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white focus:outline-none focus:border-primary-400 cursor-pointer"
              >
                <option value="">No venue selected</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {selectedVenue && (
                <div className="p-3 rounded-lg bg-background-50 border border-secondary-100 text-xs text-foreground-500">
                  <p className="font-label font-medium text-foreground-700">{selectedVenue.name}</p>
                  {selectedVenue.address_line_1 && <p>{selectedVenue.address_line_1}</p>}
                  <p>
                    {[selectedVenue.city, selectedVenue.county_or_region, selectedVenue.postcode].filter(Boolean).join(', ')}
                  </p>
                  {selectedVenue.country && <p>{selectedVenue.country}</p>}
                </div>
              )}
            </div>
          </fieldset>

          {/* C. Guest information */}
          <fieldset>
            <legend className="text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider mb-3">Guest information</legend>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Dress code</label>
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => { setDressCode(e.target.value); markDirty(); }}
                  placeholder="e.g. Formal — black tie optional"
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Suggested arrival lead time (minutes)</label>
                <input
                  type="number"
                  value={arrivalOffset}
                  onChange={(e) => { setArrivalOffset(e.target.value); markDirty(); }}
                  min="0"
                  max="120"
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Parking notes</label>
                <textarea
                  value={parkingNotes}
                  onChange={(e) => { setParkingNotes(e.target.value); markDirty(); }}
                  placeholder="Parking information for guests..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Transport notes</label>
                <textarea
                  value={transportNotes}
                  onChange={(e) => { setTransportNotes(e.target.value); markDirty(); }}
                  placeholder="Public transport, shuttles, taxi info..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Accessibility notes</label>
                <textarea
                  value={accessibilityNotes}
                  onChange={(e) => { setAccessibilityNotes(e.target.value); markDirty(); }}
                  placeholder="Accessibility information for guests..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1">Children notes</label>
                <textarea
                  value={childrenNotes}
                  onChange={(e) => { setChildrenNotes(e.target.value); markDirty(); }}
                  placeholder="Information about children at this event..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>
            </div>
          </fieldset>

          {/* D. Audience and visibility */}
          <fieldset>
            <legend className="text-xs font-label font-semibold text-foreground-500 uppercase tracking-wider mb-3">Audience &amp; visibility</legend>
            <div className="space-y-3">
              <select
                value={visibility}
                onChange={(e) => { setVisibility(e.target.value); markDirty(); }}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white focus:outline-none focus:border-primary-400 cursor-pointer"
              >
                {EVENT_VISIBILITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {visibility === 'reveal_on_date' && (
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1">Reveal date &amp; time <span className="text-red-400">*</span></label>
                  <input
                    type="datetime-local"
                    value={revealAt}
                    onChange={(e) => { setRevealAt(e.target.value); markDirty(); }}
                    className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
              )}
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-100 bg-background-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            {isEditing && event?.status === 'published' && (
              <span className="text-xs text-emerald-600 font-label flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Published
              </span>
            )}
            {dirty && (
              <span className="text-xs text-amber-600 font-label">Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary-500 text-background-50 text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <i className="ri-loader-4-line animate-spin" />
                  Saving...
                </span>
              ) : isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}