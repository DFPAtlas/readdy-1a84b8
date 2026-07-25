import { useState } from 'react';
import type { SeatingPlan } from '@/types/seating';

interface Props {
  plan: SeatingPlan;
  planId: string;
  onClose: () => void;
  onUpdate: (updates: Partial<SeatingPlan>) => Promise<void>;
}

const HALL_PRESETS = [
  { label: 'Intimate (30-50 guests)', w: 800, h: 600 },
  { label: 'Medium (50-80 guests)', w: 1000, h: 700 },
  { label: 'Standard (80-120 guests)', w: 1200, h: 900 },
  { label: 'Large (120-180 guests)', w: 1400, h: 1000 },
  { label: 'Grand (180-250 guests)', w: 1600, h: 1200 },
  { label: 'Marquee (250+ guests)', w: 2000, h: 1400 },
];

const RATIOS = [
  { label: '4:3', w: 1200, h: 900 },
  { label: '3:2', w: 1200, h: 800 },
  { label: '16:9', w: 1600, h: 900 },
  { label: 'Square', w: 1000, h: 1000 },
  { label: '2:1', w: 1600, h: 800 },
];

export default function RoomSettingsModal({ plan, onClose, onUpdate }: Props) {
  const [roomName, setRoomName] = useState(plan.room_name || '');
  const [canvasW, setCanvasW] = useState(plan.canvas_width || 1200);
  const [canvasH, setCanvasH] = useState(plan.canvas_height || 900);
  const [gridSize, setGridSize] = useState(plan.grid_size || 20);
  const [unit, setUnit] = useState(plan.measurement_unit || 'px');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({ room_name: roomName || null, canvas_width: canvasW, canvas_height: canvasH, grid_size: gridSize, measurement_unit: unit });
    setSaving(false);
    onClose();
  };

  const applyPreset = (w: number, h: number) => {
    setCanvasW(w);
    setCanvasH(h);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base text-foreground-900">Room settings</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
        </div>

        <div className="space-y-5">
          {/* Room name */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Room / venue name</label>
            <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. Grand Ballroom"
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400" />
          </div>

          {/* Hall size presets */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Hall size presets</label>
            <div className="grid grid-cols-3 gap-2">
              {HALL_PRESETS.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p.w, p.h)}
                  className={`px-2 py-2 rounded-lg border text-[10px] font-label leading-tight transition-colors cursor-pointer whitespace-nowrap ${canvasW === p.w && canvasH === p.h ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-secondary-200 text-foreground-600 hover:border-secondary-300 hover:bg-background-50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom dimensions */}
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Custom dimensions</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-foreground-500 mb-1">Width</label>
                <input type="number" value={canvasW} onChange={(e) => setCanvasW(Number(e.target.value))} min={400} max={8000}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm focus:outline-none focus:border-primary-400" />
              </div>
              <div>
                <label className="block text-[10px] text-foreground-500 mb-1">Height</label>
                <input type="number" value={canvasH} onChange={(e) => setCanvasH(Number(e.target.value))} min={300} max={6000}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm focus:outline-none focus:border-primary-400" />
              </div>
            </div>
          </div>

          {/* Aspect ratio quick picks */}
          <div>
            <label className="block text-[10px] text-foreground-500 mb-1.5">Aspect ratio (keeps width, adjusts height)</label>
            <div className="flex gap-1.5 flex-wrap">
              {RATIOS.map((r) => (
                <button key={r.label} onClick={() => setCanvasH(Math.round(canvasW * (r.h / r.w)))}
                  className="px-2 py-1 rounded border border-secondary-200 text-[10px] font-label text-foreground-600 hover:border-secondary-300 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid & unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-foreground-500 mb-1">Grid size</label>
              <input type="number" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} min={5} max={200}
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm focus:outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-[10px] text-foreground-500 mb-1">Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm cursor-pointer focus:outline-none focus:border-primary-400">
                <option value="px">Pixels</option><option value="cm">Centimetres</option><option value="in">Inches</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
            {saving ? 'Saving...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}