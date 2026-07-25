import { useState } from 'react';
import type { TableShape } from '@/types/seating';

interface Props {
  onClose: () => void;
  onAdd: (shape: TableShape, name: string, capacity: number, width: number, height: number, colour: string) => void;
}

const SHAPES: { value: TableShape; label: string; icon: string; defaultW: number; defaultH: number; defaultCap: number }[] = [
  { value: 'round', label: 'Round', icon: 'ri-circle-line', defaultW: 120, defaultH: 120, defaultCap: 8 },
  { value: 'oval', label: 'Oval', icon: 'ri-shape-line', defaultW: 160, defaultH: 100, defaultCap: 10 },
  { value: 'square', label: 'Square', icon: 'ri-square-line', defaultW: 120, defaultH: 120, defaultCap: 8 },
  { value: 'rectangular', label: 'Rectangle', icon: 'ri-checkbox-blank-line', defaultW: 180, defaultH: 100, defaultCap: 10 },
  { value: 'banquet', label: 'Banquet', icon: 'ri-window-line', defaultW: 300, defaultH: 90, defaultCap: 16 },
  { value: 'head_table', label: 'Head table', icon: 'ri-vip-crown-line', defaultW: 280, defaultH: 80, defaultCap: 10 },
  { value: 'sweetheart', label: 'Sweetheart', icon: 'ri-heart-line', defaultW: 80, defaultH: 80, defaultCap: 2 },
];

const COLOURS = [
  { value: 'rose', bg: 'bg-rose-300' },
  { value: 'sage', bg: 'bg-emerald-300' },
  { value: 'lavender', bg: 'bg-violet-300' },
  { value: 'amber', bg: 'bg-amber-300' },
  { value: 'sky', bg: 'bg-sky-300' },
];

export default function AddTableModal({ onClose, onAdd }: Props) {
  const [shape, setShape] = useState<TableShape>('round');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(120);
  const [colour, setColour] = useState('sage');

  const activeShape = SHAPES.find((s) => s.value === shape)!;

  const handleShapeSelect = (s: typeof SHAPES[number]) => {
    setShape(s.value);
    setWidth(s.defaultW);
    setHeight(s.defaultH);
    setCapacity(s.defaultCap);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base text-foreground-900">Add table</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
        </div>

        {/* Shapes */}
        <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Shape</label>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {SHAPES.map((s) => (
            <button key={s.value} onClick={() => handleShapeSelect(s)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors cursor-pointer ${shape === s.value ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>
              <i className={`${s.icon} text-sm`} /><span className="text-[10px] font-label">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Name */}
        <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Table name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Table 14"
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 mb-4" />

        {/* Capacity */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Capacity</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setCapacity(Math.max(1, capacity - 1))} className="w-7 h-7 flex items-center justify-center rounded border border-secondary-200 text-foreground-500 hover:bg-background-50 cursor-pointer"><i className="ri-subtract-line text-xs" /></button>
              <input type="number" value={capacity} onChange={(e) => setCapacity(Math.max(1, Math.min(50, Number(e.target.value))))}
                className="w-12 text-center px-1 py-1.5 rounded border border-secondary-200 bg-white text-sm font-label focus:outline-none focus:border-primary-400" />
              <button onClick={() => setCapacity(Math.min(50, capacity + 1))} className="w-7 h-7 flex items-center justify-center rounded border border-secondary-200 text-foreground-500 hover:bg-background-50 cursor-pointer"><i className="ri-add-line text-xs" /></button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Table number</label>
            <input type="number" placeholder="Optional" className="w-full px-3 py-1.5 rounded border border-secondary-200 bg-white text-sm focus:outline-none focus:border-primary-400" />
          </div>
        </div>

        {/* Size */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Width (px)</label>
            <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} min={60} max={800}
              className="w-full px-3 py-1.5 rounded border border-secondary-200 bg-white text-sm focus:outline-none focus:border-primary-400" />
          </div>
          <div>
            <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Height (px)</label>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} min={60} max={400}
              className="w-full px-3 py-1.5 rounded border border-secondary-200 bg-white text-sm focus:outline-none focus:border-primary-400" />
          </div>
        </div>

        {/* Colour */}
        <label className="block text-xs font-label font-medium text-foreground-700 mb-2">Colour</label>
        <div className="flex gap-2 mb-5">
          {COLOURS.map((c) => (
            <button key={c.value} onClick={() => setColour(c.value)}
              className={`w-8 h-8 rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${colour === c.value ? 'border-foreground-700 scale-110 ring-2 ring-offset-1 ring-foreground-300' : 'border-transparent'} ${c.bg}`}
              title={c.value} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={() => onAdd(shape, name.trim() || `Table`, capacity, width, height, colour)}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">Add table</button>
        </div>
      </div>
    </div>
  );
}