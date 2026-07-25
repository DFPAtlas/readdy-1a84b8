import { useState, useEffect } from 'react';
import type { LocalPlace, GuestTravelPlan } from '@/types/access';

interface SaveAccommodationModalProps {
  open: boolean;
  place?: LocalPlace | null;
  existingPlan?: GuestTravelPlan | null;
  guestId: string;
  onClose: () => void;
  onSave: (data: {
    guest_id: string;
    plan_type: 'accommodation' | 'transport' | 'note';
    place_id?: string;
    check_in_date?: string;
    check_out_date?: string;
    booking_reference?: string;
    transport_needs?: string;
    notes?: string;
    plan_id?: string;
  }) => Promise<void>;
  saving: boolean;
}

export default function SaveAccommodationModal({
  open, place, existingPlan, guestId, onClose, onSave, saving,
}: SaveAccommodationModalProps) {
  const [planType, setPlanType] = useState<'accommodation' | 'transport' | 'note'>('accommodation');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [transportNeeds, setTransportNeeds] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (existingPlan) {
      setPlanType(existingPlan.plan_type);
      setCheckIn(existingPlan.check_in_date || '');
      setCheckOut(existingPlan.check_out_date || '');
      setBookingRef(existingPlan.booking_reference || '');
      setTransportNeeds(existingPlan.transport_needs || '');
      setNotes(existingPlan.notes || '');
    } else {
      setPlanType(place?.place_type === 'hotel' ? 'accommodation' : 'note');
      setCheckIn('');
      setCheckOut('');
      setBookingRef('');
      setTransportNeeds('');
      setNotes('');
    }
    setError('');
  }, [open, existingPlan, place]);

  const handleSubmit = async () => {
    setError('');
    if (planType === 'accommodation' && checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
      setError('Check-out date must be after check-in date.');
      return;
    }
    await onSave({
      guest_id: guestId,
      plan_type: planType,
      place_id: place?.id,
      check_in_date: checkIn || undefined,
      check_out_date: checkOut || undefined,
      booking_reference: bookingRef || undefined,
      transport_needs: transportNeeds || undefined,
      notes: notes || undefined,
      plan_id: existingPlan?.id,
    });
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-x-4 top-[10%] max-w-md mx-auto bg-white rounded-xl z-50 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-secondary-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-heading text-lg text-foreground-900">
            {existingPlan ? 'Edit plan' : place ? `Save ${place.name}` : 'Add travel plan'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-secondary-50 hover:text-foreground-600 transition-colors cursor-pointer"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {place && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary-50">
              <i className="ri-map-pin-line text-foreground-400 text-sm" />
              <span className="text-sm text-foreground-700 font-medium">{place.name}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-label font-semibold text-foreground-600 mb-1.5">Type</label>
            <div className="flex gap-1.5">
              {([
                { key: 'accommodation' as const, label: 'Accommodation', icon: 'ri-hotel-line' },
                { key: 'transport' as const, label: 'Transport', icon: 'ri-train-line' },
                { key: 'note' as const, label: 'Note', icon: 'ri-sticky-note-line' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPlanType(opt.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                    planType === opt.key
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <i className={`${opt.icon} text-[11px]`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {planType === 'accommodation' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-600 mb-1">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-label font-semibold text-foreground-600 mb-1">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 transition-colors"
                />
              </div>
            </div>
          )}

          {planType === 'accommodation' && (
            <div>
              <label className="block text-[11px] font-label font-semibold text-foreground-600 mb-1">
                Booking reference <span className="text-foreground-400 font-normal">(private)</span>
              </label>
              <input
                type="text"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                placeholder="e.g. HBA-123456"
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 transition-colors placeholder:text-foreground-300"
              />
              <p className="text-[10px] text-foreground-400 mt-1">Only visible to you — never shared with other guests.</p>
            </div>
          )}

          {planType === 'transport' && (
            <div>
              <label className="block text-[11px] font-label font-semibold text-foreground-600 mb-1">Transport needs</label>
              <textarea
                value={transportNeeds}
                onChange={(e) => setTransportNeeds(e.target.value)}
                rows={2}
                placeholder="e.g. Need a taxi from the station"
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 transition-colors placeholder:text-foreground-300 resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-label font-semibold text-foreground-600 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details..."
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-200 transition-colors placeholder:text-foreground-300 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-secondary-100 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-label font-medium bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <i className="ri-loader-4-line animate-spin text-xs" /> Saving...
              </span>
            ) : existingPlan ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}