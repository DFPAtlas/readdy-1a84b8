import { useState } from 'react';
import type { ObjectType } from '@/types/seating';
import { OBJECT_TYPE_LABELS, OBJECT_TYPE_ICONS } from '@/types/seating';

interface Props { onClose: () => void; onAdd: (type: ObjectType, name: string) => void; }

const CATEGORIES: { label: string; items: ObjectType[] }[] = [
  { label: 'Furniture', items: ['stage', 'dance_floor', 'dj_area', 'band_area', 'bar', 'buffet', 'cake_table', 'gift_table', 'guest_book', 'photo_booth', 'sweet_table', 'lounge'] },
  { label: 'Services', items: ['registration', 'cloakroom', 'toilets'] },
  { label: 'Safety', items: ['emergency_exit', 'fire_equipment'] },
  { label: 'Structure', items: ['wall', 'door', 'window', 'column'] },
  { label: 'Planning', items: ['accessible_route', 'no_table_zone'] },
  { label: 'Custom', items: ['custom_label', 'custom_rectangle', 'custom_circle'] },
];

export default function AddRoomObjectModal({ onClose, onAdd }: Props) {
  const [selected, setSelected] = useState<ObjectType>('dance_floor');
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base text-foreground-900">Add room object</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat.label} className="mb-4">
            <p className="text-[10px] text-foreground-400 uppercase tracking-wide mb-2">{cat.label}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {cat.items.map((item) => (
                <button key={item} onClick={() => { setSelected(item); setName(OBJECT_TYPE_LABELS[item]); }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors cursor-pointer ${selected === item ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'}`}>
                  <i className={`${OBJECT_TYPE_ICONS[item]} text-sm`} />
                  <span className="text-[9px] font-label leading-tight text-center">{OBJECT_TYPE_LABELS[item]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <label className="block text-xs font-label font-medium text-foreground-700 mb-1 mt-2">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={OBJECT_TYPE_LABELS[selected]}
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 mb-5" />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
          <button onClick={() => onAdd(selected, name.trim() || OBJECT_TYPE_LABELS[selected])}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">Add object</button>
        </div>
      </div>
    </div>
  );
}