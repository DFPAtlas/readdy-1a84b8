import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';
import { preparePhotoForUpload } from '@/lib/sharedPhotoLink';
import { usePageSeo } from '@/hooks/usePageSeo';

// Wedding-wide photo upload page, opened from the live photo wall QR code or a
// printed table card. Everything goes through the gallery-shared-upload Edge
// Function, and every photo waits for the couple's approval.
const UPLOAD_URL = edgeFunctionUrl('gallery-shared-upload');
const MAX_FILES = 10;
const NAME_KEY = 'vowora.sharedUpload.name';

interface LinkStatus {
  title: string;
  window: 'open' | 'not_open' | 'closed';
  photos_allowed: boolean;
  max_bytes: number;
}
type FileState = 'waiting' | 'uploading' | 'done' | 'error';

function readSavedName(): string {
  try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

export default function SharedPhotoUploadPage() {
  const { token } = useParams<{ token: string }>();
  usePageSeo({ title: 'Share your photos — Vowora', description: 'Send your wedding photos to the couple.', path: '/photos', noindex: true });
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [mode, setMode] = useState<'loading' | 'unavailable' | 'error' | 'ready'>('loading');
  const [name, setName] = useState(readSavedName);
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [states, setStates] = useState<FileState[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'status', token }) })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.available) { setStatus(data as LinkStatus); setMode('ready'); }
        else setMode(res.status === 404 ? 'unavailable' : 'error');
      })
      .catch(() => { if (!cancelled) setMode('error'); });
    return () => { cancelled = true; };
  }, [token]);

  const chooseFiles = (list: FileList | null) => {
    const chosen = Array.from(list || []).filter((f) => f.type.startsWith('image/'));
    setMessage(chosen.length > MAX_FILES ? `You can share up to ${MAX_FILES} photos at a time — we've picked the first ${MAX_FILES}.` : '');
    const kept = chosen.slice(0, MAX_FILES);
    setFiles(kept);
    setStates(kept.map(() => 'waiting'));
    setDoneCount(0);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !files.length || busy) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) { setMessage('Please add your name so the couple know who shared the photos.'); return; }
    try { localStorage.setItem(NAME_KEY, trimmed); } catch { /* optional convenience */ }
    setBusy(true);
    setMessage('');
    let ok = 0;
    const next = [...states];
    for (let i = 0; i < files.length; i++) {
      if (next[i] === 'done') { ok++; continue; }
      next[i] = 'uploading';
      setStates([...next]);
      try {
        const blob = await preparePhotoForUpload(files[i]);
        const form = new FormData();
        form.append('token', token);
        form.append('name', trimmed);
        if (caption.trim()) form.append('caption', caption.trim());
        form.append('file', blob, blob === files[i] ? files[i].name : 'photo.jpg');
        const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) { next[i] = 'done'; ok++; }
        else {
          next[i] = 'error';
          setMessage(String(data.error || 'Some photos could not be uploaded.'));
          if (res.status === 429) { setStates([...next]); break; }
        }
      } catch {
        next[i] = 'error';
        setMessage('Could not reach the upload service. Check your connection and try again.');
      }
      setStates([...next]);
    }
    setDoneCount(ok);
    setBusy(false);
  };

  const shell = (children: ReactNode) => (
    <main className="min-h-screen bg-background-50 flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">{children}</div>
    </main>
  );

  if (mode === 'loading') return shell(<p className="text-sm text-foreground-500 text-center"><i className="ri-loader-4-line animate-spin mr-2" />Loading…</p>);
  if (mode === 'unavailable') return shell(
    <div className="text-center">
      <i className="ri-link-unlink text-3xl text-foreground-300" />
      <h1 className="font-heading text-xl text-foreground-900 mt-2">This link isn&apos;t active</h1>
      <p className="text-sm text-foreground-500 mt-2">The couple may have switched it off or replaced it. If you have a personal invitation link, you can share photos from its Gallery page.</p>
    </div>,
  );
  if (mode === 'error' || !status) return shell(
    <div className="text-center">
      <h1 className="font-heading text-xl text-foreground-900">Something went wrong</h1>
      <p className="text-sm text-foreground-500 mt-2">Please refresh the page or try again in a moment.</p>
    </div>,
  );

  const closedText = !status.photos_allowed
    ? 'Photo sharing is switched off for now.'
    : status.window === 'not_open' ? "Photo sharing hasn't opened yet — check back on the day."
    : status.window === 'closed' ? 'Photo sharing has closed. Thank you!' : '';
  const allDone = files.length > 0 && doneCount === files.length;

  return shell(
    <>
      <p className="text-[11px] font-label uppercase tracking-widest text-foreground-400 text-center">Share your photos</p>
      <h1 className="font-heading text-2xl text-foreground-900 text-center mt-1">{status.title}</h1>
      {closedText ? (
        <p className="text-sm text-foreground-600 text-center mt-4">{closedText}</p>
      ) : allDone ? (
        <div className="text-center mt-6">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><i className="ri-check-line text-2xl" /></div>
          <p className="text-sm text-foreground-800 mt-3">Thank you! {doneCount === 1 ? 'Your photo has' : `Your ${doneCount} photos have`} been sent to the couple.</p>
          <p className="text-xs text-foreground-500 mt-1">They&apos;ll appear once the couple approve them.</p>
          <button type="button" onClick={() => { setFiles([]); setStates([]); setCaption(''); setDoneCount(0); }} className="mt-5 px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-700 cursor-pointer">Share more photos</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="uploader-name" className="block text-xs font-label text-foreground-600 mb-1">Your name</label>
            <input id="uploader-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" required
              className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg" placeholder="So the couple know who to thank" />
          </div>
          <div>
            <label htmlFor="photo-files" className="block text-xs font-label text-foreground-600 mb-1">Photos (up to {MAX_FILES})</label>
            <input id="photo-files" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple
              onChange={(e) => chooseFiles(e.target.files)} className="w-full text-sm" />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex justify-between text-xs text-foreground-600">
                    <span className="truncate mr-2">{f.name}</span>
                    <span>{states[i] === 'done' ? '✓ Sent' : states[i] === 'uploading' ? 'Uploading…' : states[i] === 'error' ? 'Failed' : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="photo-caption" className="block text-xs font-label text-foreground-600 mb-1">Caption <span className="text-foreground-400">(optional)</span></label>
            <input id="photo-caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200}
              className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg" placeholder="e.g. First dance!" />
          </div>
          {message && <p role="alert" className="text-xs text-red-600">{message}</p>}
          <button type="submit" disabled={busy || files.length === 0}
            className="w-full py-3 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold disabled:opacity-50 cursor-pointer">
            {busy ? 'Sending…' : files.length > 1 ? `Send ${files.length} photos` : 'Send photo'}
          </button>
          <p className="text-[11px] text-foreground-400 text-center">Photos are sent privately to the couple and only appear after they approve them. Location details are removed where your browser allows.</p>
        </form>
      )}
    </>,
  );
}
