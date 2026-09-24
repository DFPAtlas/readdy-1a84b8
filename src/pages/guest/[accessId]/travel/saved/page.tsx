import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { LocalPlace, GuestTravelPlan } from '@/types/access';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';

function formatDateGB(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const SAVE_PLAN_URL_PATTERN = edgeFunctionUrl('save-travel-plan');

export default function GuestSavedTravelPage() {
  const { accessId } = useParams();
  const basePath = `/guest/${accessId}`;
  const { data, loading, error, refresh } = useGuestPortal();

  const places = data?.localPlaces || [];
  const travelPlans = data?.travelPlans || [];
  const settings = data?.portal_settings;
  const firstRecipient = data?.recipients?.[0];
  const wedding = data?.wedding;

  const [editingPlan, setEditingPlan] = useState<GuestTravelPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const savedAccommodation = useMemo(() => travelPlans.find((p) => p.plan_type === 'accommodation'), [travelPlans]);
  const savedTransport = useMemo(() => travelPlans.find((p) => p.plan_type === 'transport'), [travelPlans]);
  const savedNotes = useMemo(() => travelPlans.filter((p) => p.plan_type === 'note'), [travelPlans]);

  const handleSave = useCallback(async (saveData: {
    guest_id: string;
    plan_type: 'accommodation' | 'transport' | 'note';
    place_id?: string;
    check_in_date?: string;
    check_out_date?: string;
    booking_reference?: string;
    transport_needs?: string;
    notes?: string;
    plan_id?: string;
    travel_method?: string;
    parking_required?: boolean;
    shuttle_required?: boolean;
  }) => {
    setSaving(true);
    setSaveError('');

    try {
      const res = await fetch(SAVE_PLAN_URL_PATTERN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...saveData, session_hash: accessId }),
      });

      const result = await res.json();

      if (!result.success) {
        setSaveError(result.error || 'Failed to save.');
        return;
      }

      setEditingPlan(null);
      await refresh();
    } catch {
      setSaveError('Could not connect to the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [accessId, refresh]);

  const handleDelete = useCallback(async (planId: string) => {
    setSaving(true);
    try {
      const res = await fetch(SAVE_PLAN_URL_PATTERN, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, session_hash: accessId }),
      });
      if (res.ok) await refresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [accessId, refresh]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-3">
            <i className="ri-loader-4-line animate-spin text-xl" />
          </div>
          <p className="text-sm text-foreground-500">Loading your travel details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">{error || 'Could not load your travel details.'}</p>
      </div>
    );
  }

  if (!settings?.show_travel) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">Travel information is not currently available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">My Travel Plans</h1>
          <p className="text-sm text-foreground-500">
            Your saved accommodation, transport and travel notes for {wedding?.partner_one_name} &amp; {wedding?.partner_two_name}&rsquo;s wedding.
          </p>
        </div>
        <Link
          to={`${basePath}/travel`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-xs" /> Back
        </Link>
      </div>

      {/* ── Accommodation ── */}
      <section className="mb-8">
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-hotel-line text-foreground-400" />
          My Accommodation
        </h2>
        {savedAccommodation ? (
          <div className="bg-white rounded-lg border border-secondary-200/70 p-5">
            <AccommodationPlanCard
              plan={savedAccommodation}
              place={places.find((p) => p.id === savedAccommodation.place_id)}
              onEdit={() => setEditingPlan(savedAccommodation)}
              onDelete={() => handleDelete(savedAccommodation.id)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-secondary-200/70 border-dashed p-8 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-3">
              <i className="ri-hotel-line text-xl" />
            </div>
            <h3 className="text-sm font-label font-semibold text-foreground-600 mb-1">No accommodation saved</h3>
            <p className="text-xs text-foreground-400 mb-3">Save where you're staying to keep all your travel details in one place.</p>
            <Link
              to={`${basePath}/travel/accommodation`}
              className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
            >
              Browse accommodation <i className="ri-arrow-right-line text-[10px]" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Transport ── */}
      <section className="mb-8">
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-train-line text-foreground-400" />
          My Transport
        </h2>
        {savedTransport ? (
          <div className="bg-white rounded-lg border border-secondary-200/70 p-5">
            <TransportPlanCard
              plan={savedTransport}
              onEdit={() => setEditingPlan(savedTransport)}
              onDelete={() => handleDelete(savedTransport.id)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-secondary-200/70 border-dashed p-8 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-3">
              <i className="ri-train-line text-xl" />
            </div>
            <h3 className="text-sm font-label font-semibold text-foreground-600 mb-1">No transport details saved</h3>
            <p className="text-xs text-foreground-400 mb-3">Add your travel method, arrival and departure times.</p>
            <button
              onClick={() => setEditingPlan({ id: '', guest_id: firstRecipient?.guest_id || '', plan_type: 'transport' })}
              className="inline-flex items-center gap-1 text-xs font-label text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line" /> Add transport details
            </button>
          </div>
        )}
      </section>

      {/* ── Saved Places ── */}
      {data.savedLocations.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-bookmark-line text-foreground-400" />
            Saved Places
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.savedLocations.map((sl) => {
              const place = places.find((p) => p.id === sl.travel_location_id);
              if (!place) return null;
              return (
                <div key={sl.id} className="flex items-center gap-2 bg-white rounded-lg border border-secondary-200/70 p-3">
                  <div className="w-8 h-8 rounded-md bg-secondary-50 overflow-hidden flex-shrink-0">
                    {place.image_url ? (
                      <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-secondary-300">
                        <i className="ri-map-pin-line text-xs" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-label font-medium text-foreground-800 truncate">{place.name}</p>
                    <p className="text-[10px] text-foreground-500 capitalize">{place.place_type.replace('_', ' ')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Travel Notes ── */}
      <section className="mb-8">
        <h2 className="font-heading text-lg text-foreground-900 mb-4 flex items-center gap-2">
          <i className="ri-sticky-note-line text-foreground-400" />
          Travel Notes
        </h2>
        {savedNotes.length > 0 ? (
          <div className="space-y-2">
            {savedNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg border border-secondary-200/70 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-foreground-600">{note.notes || note.transport_needs || 'No details'}</p>
                  <p className="text-[10px] text-foreground-400 mt-1">
                    {note.created_at ? formatDateShort(note.created_at) : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0"
                >
                  <i className="ri-delete-bin-line text-xs" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-secondary-200/70 border-dashed p-8 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-3">
              <i className="ri-sticky-note-line text-xl" />
            </div>
            <p className="text-xs text-foreground-400">No travel notes yet. Add notes about your journey.</p>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ──

function AccommodationPlanCard({ plan, place, onEdit, onDelete }: {
  plan: GuestTravelPlan;
  place?: LocalPlace;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {place?.image_url && (
        <div className="w-full sm:w-40 h-32 rounded-lg overflow-hidden bg-secondary-50 flex-shrink-0">
          <img src={place.image_url} alt={place.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-label font-semibold text-foreground-900">
              {plan.custom_accommodation_name || place?.name || 'Accommodation'}
            </h3>
            {place && <p className="text-xs text-foreground-500">{[place.city, place.country].filter(Boolean).join(', ')}</p>}
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer" title="Edit">
              <i className="ri-edit-line text-xs" />
            </button>
            <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Remove">
              <i className="ri-delete-bin-line text-xs" />
            </button>
          </div>
        </div>

        {(plan.check_in_date || plan.check_out_date) && (
          <div className="flex flex-wrap gap-4 mt-3">
            {plan.check_in_date && (
              <div>
                <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Check-in</p>
                <p className="text-xs text-foreground-700">{formatDateGB(plan.check_in_date)}</p>
              </div>
            )}
            {plan.check_out_date && (
              <div>
                <p className="text-[10px] font-label font-semibold text-foreground-400 uppercase tracking-wide">Check-out</p>
                <p className="text-xs text-foreground-700">{formatDateGB(plan.check_out_date)}</p>
              </div>
            )}
          </div>
        )}

        {plan.booking_reference && (
          <p className="text-[11px] text-foreground-500 mt-2">
            <i className="ri-key-line text-xs mr-1 text-foreground-400" />
            Ref: {plan.booking_reference}
          </p>
        )}
        {plan.notes && <p className="text-xs text-foreground-500 mt-1">{plan.notes}</p>}
      </div>
    </div>
  );
}

function TransportPlanCard({ plan, onEdit, onDelete }: {
  plan: GuestTravelPlan;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-label font-semibold text-foreground-900">
            {plan.travel_method || 'Transport details'}
          </h3>
          <div className="flex flex-wrap gap-4 mt-2">
            {plan.travel_method && (
              <span className="inline-flex items-center gap-1 text-xs text-foreground-600">
                <i className="ri-car-line text-foreground-400" />
                {plan.travel_method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            )}
            {plan.parking_required && (
              <span className="inline-flex items-center gap-1 text-xs text-foreground-600">
                <i className="ri-parking-box-line text-foreground-400" /> Parking required
              </span>
            )}
            {plan.shuttle_required && (
              <span className="inline-flex items-center gap-1 text-xs text-foreground-600">
                <i className="ri-bus-line text-foreground-400" /> Shuttle required
              </span>
            )}
          </div>
          {plan.arrival_at && (
            <p className="text-xs text-foreground-500 mt-1">
              <i className="ri-calendar-check-line text-xs mr-1 text-foreground-400" />
              Arriving: {formatDateGB(plan.arrival_at)}
            </p>
          )}
          {plan.departure_at && (
            <p className="text-xs text-foreground-500 mt-1">
              <i className="ri-calendar-close-line text-xs mr-1 text-foreground-400" />
              Departing: {formatDateGB(plan.departure_at)}
            </p>
          )}
          {plan.transport_needs && <p className="text-xs text-foreground-600 mt-2">{plan.transport_needs}</p>}
          {plan.notes && <p className="text-xs text-foreground-500 mt-1">{plan.notes}</p>}
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={onEdit} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer" title="Edit">
            <i className="ri-edit-line text-xs" />
          </button>
          <button onClick={onDelete} className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Remove">
            <i className="ri-delete-bin-line text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}