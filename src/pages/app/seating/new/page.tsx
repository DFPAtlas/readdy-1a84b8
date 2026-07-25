import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { EventType, SeatingPlan } from '@/types/seating';
import { EVENT_TYPE_LABELS } from '@/types/seating';

const EVENT_TYPES: EventType[] = ['wedding_breakfast', 'reception', 'evening_celebration', 'ceremony', 'rehearsal_dinner', 'welcome_event', 'day_after_brunch', 'custom'];

export default function CreateSeatingPlanPage() {
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingPlans, setExistingPlans] = useState<SeatingPlan[]>([]);
  const [weddingEvents, setWeddingEvents] = useState<{ id: string; name: string; event_type: string }[]>([]);

  // Form
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState<EventType>('reception');
  const [linkedEventId, setLinkedEventId] = useState('');
  const [roomName, setRoomName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [startingLayout, setStartingLayout] = useState<'blank' | 'duplicate' | 'sample'>('blank');
  const [duplicateFromId, setDuplicateFromId] = useState('');
  const [setAsWorking, setSetAsWorking] = useState(true);

  useEffect(() => {
    if (!weddingId) return;
    const fetchRefs = async () => {
      try {
        const [plansRes, eventsRes] = await Promise.all([
          supabase.from('seating_plans').select('id, name, event_type, status').eq('wedding_id', weddingId).order('updated_at', { ascending: false }),
          supabase.from('wedding_events').select('id, name, event_type').eq('wedding_id', weddingId).eq('status', 'active').order('start_at'),
        ]);
        if (plansRes.data) setExistingPlans(plansRes.data as SeatingPlan[]);
        if (eventsRes.data) setWeddingEvents(eventsRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchRefs();
  }, [weddingId]);

  const validPlansForDuplication = existingPlans.filter((p) => p.status !== 'archived');

  const handleSubmit = async () => {
    if (!weddingId) return;
    if (!name.trim()) { setError('Plan name is required'); return; }

    setSaving(true);
    setError('');

    try {
      // If setting as working, unset current working first
      if (setAsWorking) {
        await supabase.from('seating_plans').update({ is_working: false }).eq('wedding_id', weddingId).eq('is_working', true);
      }

      const { data: newPlan, error: createErr } = await supabase.from('seating_plans').insert({
        wedding_id: weddingId,
        name: name.trim(),
        event_type: eventType,
        linked_event_id: linkedEventId || null,
        room_name: roomName.trim() || null,
        description: description.trim() || null,
        notes: notes.trim() || purpose.trim() || null,
        status: setAsWorking ? 'working' : 'draft',
        is_working: setAsWorking,
      }).select('*').single();

      if (createErr || !newPlan) throw new Error(createErr?.message || 'Failed to create plan');

      // Handle starting layout
      if (startingLayout === 'duplicate' && duplicateFromId) {
        const { data: srcTables } = await supabase.from('seating_tables').select('*').eq('plan_id', duplicateFromId);
        if (srcTables && srcTables.length > 0) {
          const newTables = srcTables.map((t: Record<string, unknown>) => ({
            plan_id: newPlan.id, wedding_id: weddingId,
            name: t.name, table_number: t.table_number, shape: t.shape, capacity: t.capacity,
            position_x: t.position_x, position_y: t.position_y, width: t.width, height: t.height,
            rotation: t.rotation, zone: t.zone, colour: t.colour, colour_key: t.colour_key, sort_order: t.sort_order,
          }));
          await supabase.from('seating_tables').insert(newTables);
        }
      } else if (startingLayout === 'sample') {
        await supabase.from('seating_tables').insert([
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Table 1', shape: 'round', capacity: 8, position_x: 300, position_y: 200, width: 120, height: 120, sort_order: 1 },
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Table 2', shape: 'round', capacity: 8, position_x: 500, position_y: 200, width: 120, height: 120, sort_order: 2 },
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Table 3', shape: 'round', capacity: 8, position_x: 700, position_y: 200, width: 120, height: 120, sort_order: 3 },
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Table 4', shape: 'round', capacity: 8, position_x: 300, position_y: 400, width: 120, height: 120, sort_order: 4 },
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Table 5', shape: 'round', capacity: 8, position_x: 500, position_y: 400, width: 120, height: 120, sort_order: 5 },
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Table 6', shape: 'round', capacity: 8, position_x: 700, position_y: 400, width: 120, height: 120, sort_order: 6 },
          { plan_id: newPlan.id, wedding_id: weddingId, name: 'Head table', shape: 'head_table', capacity: 10, position_x: 400, position_y: 50, width: 280, height: 90, sort_order: 0 },
        ]);
      }

      // Create first version
      await supabase.from('seating_plan_versions').insert({
        wedding_id: weddingId, seating_plan_id: newPlan.id, version_number: 1,
        label: 'Initial version', reason: 'Plan created', snapshot_data: {}, source_revision: 1,
      });

      // Activity log
      await supabase.from('seating_activity_log').insert({
        wedding_id: weddingId, seating_plan_id: newPlan.id, action: 'plan_created',
        summary: `Created "${name.trim()}"`, metadata: { event_type: eventType, starting_layout: startingLayout },
      });

      navigate(`/app/seating/plans/${newPlan.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setSaving(false);
    }
  };

  if (weddingLoading || loading) {
    return <AppShell><div className="max-w-lg mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate('/app/seating')} className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-700 mb-6 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" />Back to seating planner
        </button>

        <h1 className="font-heading text-2xl text-foreground-900 mb-1">Create seating plan</h1>
        <p className="text-sm text-foreground-500 mb-8">Set up a new seating plan for your wedding.</p>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-xs mb-6">
            <i className="ri-error-warning-line text-sm flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Plan name */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Plan name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Reception — Round tables" />
          </div>

          {/* Event type */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Event type <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EVENT_TYPES.map((et) => (
                <button key={et} onClick={() => setEventType(et)}
                  className={`px-3 py-2 rounded-lg border text-xs font-label text-left transition-colors cursor-pointer whitespace-nowrap ${eventType === et ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-secondary-200 text-foreground-600 hover:border-secondary-300'}`}>
                  {EVENT_TYPE_LABELS[et]}
                </button>
              ))}
            </div>
          </div>

          {/* Linked wedding event */}
          {weddingEvents.length > 0 && (
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Linked wedding event (optional)</label>
              <select value={linkedEventId} onChange={(e) => setLinkedEventId(e.target.value)} className="input-field">
                <option value="">None</option>
                {weddingEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.event_type})</option>
                ))}
              </select>
            </div>
          )}

          {/* Room / venue */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Room or venue name</label>
            <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="input-field" placeholder="e.g. The Grand Ballroom" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input-field resize-none" placeholder="Brief description of the space..." />
          </div>

          {/* Plan purpose */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Plan purpose</label>
            <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="input-field" placeholder="e.g. Main reception seating, Evening layout" />
          </div>

          {/* Starting layout */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Starting layout</label>
            <div className="space-y-2">
              {[
                { value: 'blank' as const, label: 'Blank canvas', desc: 'Start with an empty room', icon: 'ri-checkbox-blank-line' },
                { value: 'duplicate' as const, label: 'Duplicate another plan', desc: 'Copy layout from an existing plan', icon: 'ri-file-copy-line' },
                { value: 'sample' as const, label: 'Sample layout', desc: 'Editable starter with 7 tables', icon: 'ri-layout-grid-line' },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${startingLayout === opt.value ? 'border-primary-300 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'}`}>
                  <input type="radio" name="startingLayout" value={opt.value} checked={startingLayout === opt.value} onChange={() => setStartingLayout(opt.value)} className="mt-0.5 accent-primary-500 cursor-pointer" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-label text-foreground-800">{opt.label}</p>
                    <p className="text-xs text-foreground-500 mt-0.5">{opt.desc}</p>
                    {opt.value === 'duplicate' && startingLayout === 'duplicate' && (
                      <select value={duplicateFromId} onChange={(e) => setDuplicateFromId(e.target.value)} className="mt-2 input-field text-xs">
                        <option value="">Select a plan...</option>
                        {validPlansForDuplication.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field resize-none" placeholder="Any additional notes..." />
          </div>

          {/* Set as working */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={setAsWorking} onChange={(e) => setSetAsWorking(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 accent-primary-500 cursor-pointer" />
            <span className="text-sm text-foreground-700">Set as working plan after creation</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={handleSubmit} disabled={saving || !name.trim()} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap disabled:opacity-50">
              {saving ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Creating...</> : <><i className="ri-check-line mr-1.5" />Create plan</>}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}