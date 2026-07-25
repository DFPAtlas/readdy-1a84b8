import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, PlanStatus, EventType } from '@/types/seating';
import { EVENT_TYPE_LABELS, PLAN_STATUS_LABELS } from '@/types/seating';

const EVENT_TYPES: EventType[] = ['wedding_breakfast', 'reception', 'evening_celebration', 'ceremony', 'rehearsal_dinner', 'welcome_event', 'day_after_brunch', 'custom'];
const STATUSES: PlanStatus[] = ['draft', 'working', 'review', 'final', 'published', 'archived'];

export default function PlanSettingsPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<Partial<SeatingPlan>>({});
  const [weddingEvents, setWeddingEvents] = useState<{ id: string; name: string }[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!weddingId || !planId) return;
    const fetchData = async () => {
      try {
        const [planRes, eventsRes] = await Promise.all([
          supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle(),
          supabase.from('wedding_events').select('id, name').eq('wedding_id', weddingId).eq('status', 'active'),
        ]);
        if (planRes.error) throw planRes.error;
        if (!planRes.data) { setError('Plan not found'); setLoading(false); return; }
        setForm(planRes.data as SeatingPlan);
        if (eventsRes.data) setWeddingEvents(eventsRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weddingId, planId]);

  const handleChange = (field: string, value: unknown) => setForm((prev) => ({ ...prev, [field]: value }));
  const handleBoolean = (field: string) => handleChange(field, !form[field as keyof typeof form]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        name: form.name,
        event_type: form.event_type,
        linked_event_id: form.linked_event_id || null,
        room_name: form.room_name || null,
        description: form.description || null,
        notes: form.notes || null,
        status: form.status,
        canvas_width: form.canvas_width,
        canvas_height: form.canvas_height,
        default_zoom: form.default_zoom,
        grid_enabled: form.grid_enabled,
        grid_size: form.grid_size,
        snap_to_grid: form.snap_to_grid,
        measurement_unit: form.measurement_unit,
        background_opacity: form.background_opacity,
        background_locked: form.background_locked,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('seating_plans').update(update).eq('id', planId);
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'plan_settings_changed', summary: 'Settings updated' });
      setToast({ msg: 'Settings saved', type: 'success' });
      setTimeout(() => setToast(null), 2500);
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : 'Failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (weddingLoading || loading) {
    return <AppShell><div className="max-w-lg mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;
  }
  if (error) {
    return <AppShell><div className="max-w-lg mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">{error}</p><button onClick={() => navigate('/app/seating')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Back</button></div></AppShell>;
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="flex items-center gap-1.5 text-xs text-foreground-500 hover:text-foreground-700 mb-6 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line" />Back to plan
        </button>
        <h1 className="font-heading text-2xl text-foreground-900 mb-1">Plan settings</h1>
        <p className="text-sm text-foreground-500 mb-8">Configure {form.name || 'this plan'}.</p>

        <div className="space-y-6">
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Plan name</label>
                <input type="text" value={form.name || ''} onChange={(e) => handleChange('name', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Event type</label>
                <select value={form.event_type || 'reception'} onChange={(e) => handleChange('event_type', e.target.value)} className="input-field cursor-pointer">
                  {EVENT_TYPES.map((et) => <option key={et} value={et}>{EVENT_TYPE_LABELS[et]}</option>)}
                </select>
              </div>
              {weddingEvents.length > 0 && (
                <div>
                  <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Linked wedding event</label>
                  <select value={form.linked_event_id || ''} onChange={(e) => handleChange('linked_event_id', e.target.value || null)} className="input-field cursor-pointer">
                    <option value="">None</option>
                    {weddingEvents.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Room / venue name</label>
                <input type="text" value={form.room_name || ''} onChange={(e) => handleChange('room_name', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Description</label>
                <textarea value={form.description || ''} onChange={(e) => handleChange('description', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Notes</label>
                <textarea value={form.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={3} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Status</label>
                <select value={form.status || 'draft'} onChange={(e) => handleChange('status', e.target.value)} className="input-field cursor-pointer">
                  {STATUSES.map((s) => <option key={s} value={s}>{PLAN_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Canvas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Canvas width</label>
                <input type="number" value={form.canvas_width || 1200} onChange={(e) => handleChange('canvas_width', Number(e.target.value))} className="input-field" min={400} max={8000} />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Canvas height</label>
                <input type="number" value={form.canvas_height || 900} onChange={(e) => handleChange('canvas_height', Number(e.target.value))} className="input-field" min={300} max={6000} />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Default zoom</label>
                <input type="number" value={form.default_zoom || 1} onChange={(e) => handleChange('default_zoom', Number(e.target.value))} className="input-field" min={0.1} max={5} step={0.1} />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Measurement unit</label>
                <select value={form.measurement_unit || 'px'} onChange={(e) => handleChange('measurement_unit', e.target.value)} className="input-field cursor-pointer">
                  <option value="px">Pixels</option>
                  <option value="cm">Centimetres</option>
                  <option value="in">Inches</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Grid</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground-700">Grid enabled</span>
                <button onClick={() => handleBoolean('grid_enabled')} className={`w-10 h-5 rounded-full transition-colors ${form.grid_enabled ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${form.grid_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground-700">Snap to grid</span>
                <button onClick={() => handleBoolean('snap_to_grid')} className={`w-10 h-5 rounded-full transition-colors ${form.snap_to_grid ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${form.snap_to_grid ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Grid size</label>
                <input type="number" value={form.grid_size || 20} onChange={(e) => handleChange('grid_size', Number(e.target.value))} className="input-field" min={5} max={200} />
              </div>
            </div>
          </div>

          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Background</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Opacity</label>
                <input type="range" min={0} max={100} value={Math.round((form.background_opacity || 1) * 100)} onChange={(e) => handleChange('background_opacity', Number(e.target.value) / 100)} className="w-full accent-primary-500 cursor-pointer" />
                <p className="text-xs text-foreground-500 mt-1">{Math.round((form.background_opacity || 1) * 100)}%</p>
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-foreground-700">Background locked</span>
                <button onClick={() => handleBoolean('background_locked')} className={`w-10 h-5 rounded-full transition-colors ${form.background_locked ? 'bg-primary-500' : 'bg-secondary-300'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${form.background_locked ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap disabled:opacity-50">
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>

        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg max-w-md text-xs font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm flex-shrink-0`} />
            <span>{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}