import type * as React from "react";
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { BackgroundAsset } from '@/types/seating';

interface Props {
  planId: string;
  weddingId: string;
  currentBg: BackgroundAsset | null;
  onClose: () => void;
  onUpdate: (bg: BackgroundAsset | null) => void;
}

export default function BackgroundUploader({ planId, weddingId, currentBg, onClose, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [opacity, setOpacity] = useState(currentBg?.opacity ?? 1);
  const [scale, setScale] = useState(currentBg?.scale_factor ?? 1);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) { setError('Only PNG, JPEG, and WebP files are supported.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File size must be under 10 MB.'); return; }

    setUploading(true); setError('');
    try {
      const safeName = `floorplans/${planId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadErr } = await supabase.storage.from('wedding-assets').upload(safeName, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('wedding-assets').getPublicUrl(safeName);

      if (currentBg?.id) {
        await supabase.from('seating_background_assets').update({
          storage_path: urlData.publicUrl, original_filename: file.name, mime_type: file.type,
          file_size: file.size, updated_at: new Date().toISOString(),
        }).eq('id', currentBg.id);
        onUpdate({ ...currentBg, storage_path: urlData.publicUrl, original_filename: file.name, mime_type: file.type, file_size: file.size });
      } else {
        const { data, error: insErr } = await supabase.from('seating_background_assets').insert({
          wedding_id: weddingId, seating_plan_id: planId, storage_path: urlData.publicUrl,
          original_filename: file.name, mime_type: file.type, file_size: file.size,
        }).select('*').single();
        if (insErr) throw insErr;
        if (data) onUpdate(data as BackgroundAsset);
      }
      await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'background_uploaded', summary: `Uploaded ${file.name}` });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleRemove = async () => {
    if (!currentBg) return;
    await supabase.from('seating_background_assets').delete().eq('id', currentBg.id);
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'background_removed', summary: 'Background removed' });
    onUpdate(null);
  };

  const handleOpacityChange = async (v: number) => {
    setOpacity(v);
    if (currentBg?.id) await supabase.from('seating_background_assets').update({ opacity: v }).eq('id', currentBg.id);
    if (currentBg) onUpdate({ ...currentBg, opacity: v });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading text-base text-foreground-900">Floor plan background</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-600 cursor-pointer"><i className="ri-close-line" /></button>
        </div>

        {currentBg ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-background-50 p-3 text-center">
              <p className="text-xs font-label text-foreground-700">{currentBg.original_filename || 'Uploaded'}</p>
              <p className="text-[10px] text-foreground-400 mt-0.5">{currentBg.mime_type} · {currentBg.file_size ? `${Math.round(currentBg.file_size / 1024)} KB` : ''}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-foreground-600">Opacity</span><span className="text-xs font-label">{Math.round(opacity * 100)}%</span></div>
              <input type="range" min={0} max={100} value={Math.round(opacity * 100)} onChange={(e) => handleOpacityChange(Number(e.target.value) / 100)} className="w-full accent-primary-500 cursor-pointer" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-foreground-600">Scale</span><span className="text-xs font-label">{scale}×</span></div>
              <input type="range" min={0.1} max={3} step={0.1} value={scale} onChange={(e) => { setScale(Number(e.target.value)); if (currentBg?.id) supabase.from('seating_background_assets').update({ scale_factor: Number(e.target.value) }).eq('id', currentBg.id); }} className="w-full accent-primary-500 cursor-pointer" />
            </div>

            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-1 px-3 py-2 text-xs font-label border border-secondary-200 rounded-lg hover:bg-background-50 cursor-pointer whitespace-nowrap disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
              <button onClick={handleRemove} className="flex-1 px-3 py-2 text-xs font-label border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer whitespace-nowrap">Remove</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="rounded-lg border-2 border-dashed border-secondary-200 p-8 text-center mb-4 cursor-pointer hover:border-primary-300 transition-colors" onClick={() => fileRef.current?.click()}>
              <i className="ri-image-add-line text-2xl text-foreground-300 mb-2 block" />
              <p className="text-xs text-foreground-500 mb-1">{uploading ? 'Uploading...' : 'Click to upload'}</p>
              <p className="text-[10px] text-foreground-400">PNG, JPEG, WebP · Max 10 MB</p>
            </div>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <button onClick={onClose} className="w-full px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Close</button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
      </div>
    </div>
  );
}