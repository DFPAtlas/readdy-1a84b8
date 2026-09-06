import { useState, useMemo, useCallback } from 'react';
import type { GalleryAdminAsset, GalleryAdminAlbum, GalleryModerationStatus } from '@/types/gallery';
import { MODERATION_STATUS_OPTIONS, REJECTION_REASONS } from '@/types/gallery';

interface ModerationTabProps {
  assets: GalleryAdminAsset[];
  albums: GalleryAdminAlbum[];
  saving: boolean;
  onModerate: (assetId: string, status: GalleryModerationStatus, reason?: string) => Promise<void>;
  onBulkModerate: (assetIds: string[], status: GalleryModerationStatus, reason?: string) => Promise<void>;
  onToggleWall: (assetId: string) => Promise<void>;
  showToast: (msg: string) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function ModerationTab({ assets, albums, saving, onModerate, onBulkModerate, onToggleWall, showToast }: ModerationTabProps) {
  const [queue, setQueue] = useState<'awaiting' | 'approved' | 'rejected' | 'held'>('awaiting');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState<'approve' | 'reject' | null>(null);

  const queueAssets = useMemo(() => {
    switch (queue) {
      case 'awaiting': return assets.filter((a) => ['awaiting_review', 'pending', 'scanning', 'uploading'].includes(a.moderation_status));
      case 'approved': return assets.filter((a) => a.moderation_status === 'approved');
      case 'rejected': return assets.filter((a) => a.moderation_status === 'rejected');
      case 'held': return assets.filter((a) => a.moderation_status === 'held');
      default: return [];
    }
  }, [assets, queue]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = async (status: GalleryModerationStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const reason = status === 'rejected' ? rejectReason : undefined;
    await onBulkModerate(ids, status, reason);
    setSelectedIds(new Set());
    setBulkConfirm(null);
    showToast(`${ids.length} items ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'updated'}`);
  };

  const counts = {
    awaiting: assets.filter((a) => ['awaiting_review', 'pending', 'scanning', 'uploading'].includes(a.moderation_status)).length,
    approved: assets.filter((a) => a.moderation_status === 'approved').length,
    rejected: assets.filter((a) => a.moderation_status === 'rejected').length,
    held: assets.filter((a) => a.moderation_status === 'held').length,
  };

  const statusColor = (status: string) => MODERATION_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'bg-secondary-100 text-secondary-600';
  const statusLabel = (status: string) => {
    const map: Record<string, string> = { approved: 'Approved', awaiting_review: 'Awaiting', pending: 'Pending', scanning: 'Scanning', uploading: 'Uploading', rejected: 'Rejected', held: 'Held' };
    return map[status] || status;
  };

  return (
    <div>
      {/* Queue tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {[
          { key: 'awaiting' as const, label: 'Awaiting review', count: counts.awaiting, color: 'text-amber-600' },
          { key: 'approved' as const, label: 'Approved', count: counts.approved, color: 'text-emerald-600' },
          { key: 'rejected' as const, label: 'Rejected', count: counts.rejected, color: 'text-red-600' },
          { key: 'held' as const, label: 'Held', count: counts.held, color: 'text-orange-600' },
        ].map((q) => (
          <button
            key={q.key}
            onClick={() => { setQueue(q.key); setSelectedIds(new Set()); }}
            className={`px-3 py-2 rounded-full text-xs font-label font-medium transition-colors cursor-pointer whitespace-nowrap border ${
              queue === q.key ? 'bg-primary-500 text-white border-primary-500' : 'bg-white text-foreground-600 border-secondary-200 hover:border-secondary-300'
            }`}
          >
            {q.label} <span className={queue === q.key ? 'text-white/70' : q.color}>{q.count}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && queue === 'awaiting' && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <span className="text-xs font-label text-amber-700">{selectedIds.size} selected</span>
          <button onClick={() => setBulkConfirm('approve')} className="text-[10px] px-2 py-1 rounded bg-emerald-500 text-white font-label hover:bg-emerald-600 cursor-pointer whitespace-nowrap">Approve all</button>
          <button onClick={() => setBulkConfirm('reject')} className="text-[10px] px-2 py-1 rounded bg-red-500 text-white font-label hover:bg-red-600 cursor-pointer whitespace-nowrap">Reject all</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-foreground-400 hover:text-foreground-600 cursor-pointer">Clear</button>
        </div>
      )}

      {/* Bulk confirmation */}
      {bulkConfirm && (
        <div className="mb-4 bg-white border border-secondary-200 rounded-lg p-3">
          <p className="text-xs text-foreground-700 mb-2">{bulkConfirm === 'approve' ? `Approve ${selectedIds.size} items?` : `Reject ${selectedIds.size} items?`}</p>
          {bulkConfirm === 'reject' && (
            <div className="mb-2">
              <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full px-3 py-1.5 rounded border border-secondary-200 text-xs outline-none cursor-pointer">
                <option value="">Optional reason...</option>
                {REJECTION_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkAction(bulkConfirm === 'approve' ? 'approved' : 'rejected')} className={`px-3 py-1.5 rounded text-xs font-label font-medium text-white cursor-pointer whitespace-nowrap ${bulkConfirm === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>Confirm</button>
            <button onClick={() => setBulkConfirm(null)} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {queueAssets.length === 0 ? (
        <div className="bg-white border border-secondary-100 rounded-xl p-12 text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-check-double-line text-2xl" />
          </div>
          <p className="text-sm text-foreground-500">No {queue === 'awaiting' ? 'pending' : queue} items</p>
          <p className="text-xs text-foreground-400 mt-1">
            {queue === 'awaiting' ? 'All guest uploads have been reviewed.' : queue === 'approved' ? 'No approved items in this queue.' : 'Everything looks clean.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {queueAssets.map((asset) => {
            const isSelected = selectedIds.has(asset.id);
            return (
              <div key={asset.id} className={`bg-white border rounded-xl overflow-hidden group transition-all ${isSelected ? 'border-primary-400 ring-2 ring-primary-200' : 'border-secondary-100 hover:border-secondary-300'}`}>
                <div className="relative aspect-[4/3] bg-background-50 overflow-hidden">
                  {asset.signed_url ? (
                    <img src={asset.signed_url} alt={asset.title || ''} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary-100"><i className="ri-image-line text-3xl text-foreground-300" /></div>
                  )}
                  {queue === 'awaiting' && (
                    <button onClick={() => toggleSelect(asset.id)} className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors ${isSelected ? 'bg-primary-500 text-white' : 'bg-white/80 text-foreground-400 hover:bg-white'}`}>
                      <i className={isSelected ? 'ri-check-line text-sm' : 'ri-checkbox-blank-line text-sm'} />
                    </button>
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-label font-medium ${statusColor(asset.moderation_status)}`}>{statusLabel(asset.moderation_status)}</span>
                    {asset.moderation_ai_label && (
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-600 text-[9px] font-label">{asset.moderation_ai_label}</span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground-800 line-clamp-1 mb-1">{asset.title || 'Untitled'}</p>
                  <div className="flex items-center justify-between text-[10px] text-foreground-400 mb-1">
                    <span>{asset.uploader_name || asset.source_type}</span>
                    <span>{formatDate(asset.created_at)}</span>
                  </div>
                  {asset.moderation_reason && (
                    <p className="text-[9px] text-red-500 line-clamp-1 mb-1">{asset.moderation_reason}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-secondary-100">
                    {queue === 'awaiting' && (
                      <>
                        <button onClick={() => { onModerate(asset.id, 'approved'); showToast('Approved'); }} className="flex-1 text-[10px] py-1 rounded bg-emerald-50 text-emerald-600 font-label hover:bg-emerald-100 cursor-pointer whitespace-nowrap transition-colors">Approve</button>
                        <button onClick={() => { setRejectingId(asset.id); setRejectReason(''); }} className="flex-1 text-[10px] py-1 rounded bg-red-50 text-red-600 font-label hover:bg-red-100 cursor-pointer whitespace-nowrap transition-colors">Reject</button>
                      </>
                    )}
                    {queue === 'approved' && (
                      <>
                        <button onClick={() => { onToggleWall(asset.id); showToast(asset.wall_visible ? 'Removed from wall' : 'Added to wall'); }} className={`flex-1 text-[10px] py-1 rounded font-label cursor-pointer whitespace-nowrap transition-colors ${asset.wall_visible ? 'bg-primary-50 text-primary-600' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>
                          {asset.wall_visible ? 'On wall' : 'Wall +'}
                        </button>
                        <button onClick={() => { onModerate(asset.id, 'hidden'); showToast('Hidden'); }} className="text-[10px] py-1 px-2 rounded bg-secondary-100 text-secondary-600 font-label hover:bg-secondary-200 cursor-pointer whitespace-nowrap transition-colors">Hide</button>
                      </>
                    )}
                    {(queue === 'rejected' || queue === 'held') && (
                      <button onClick={() => { onModerate(asset.id, 'awaiting_review'); showToast('Restored'); }} className="flex-1 text-[10px] py-1 rounded bg-secondary-50 text-secondary-600 font-label hover:bg-secondary-100 cursor-pointer whitespace-nowrap transition-colors">Restore</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectingId(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm mx-4 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-heading text-lg text-foreground-900 mb-3">Reject photo</h3>
            <p className="text-xs text-foreground-500 mb-3">Optionally provide a reason (visible to moderators only).</p>
            <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none cursor-pointer mb-4">
              <option value="">No specific reason</option>
              {REJECTION_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
            <div className="flex items-center gap-3">
              <button onClick={() => setRejectingId(null)} className="flex-1 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 cursor-pointer">Cancel</button>
              <button onClick={async () => { await onModerate(rejectingId, 'rejected', rejectReason || undefined); setRejectingId(null); showToast('Rejected'); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-label font-medium cursor-pointer whitespace-nowrap">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}