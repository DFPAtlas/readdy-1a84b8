import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthProvider';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { RELEASE_VERSION } from '@/lib/env';

// ── Types ──

type ReleaseStatus = 'planned' | 'deploying' | 'live' | 'rolled_back' | 'superseded';

interface OperationalRelease {
  id: string;
  version: string;
  status: ReleaseStatus;
  release_date: string | null;
  git_ref: string | null;
  migration_version: string | null;
  release_owner: string | null;
  summary: string | null;
  included_fixes: string | null;
  known_issues: string | null;
  edge_function_versions: any;
  frontend_deployment_ref: string | null;
  verification_results: string | null;
  rollback_notes: string | null;
  previous_stable_version: string | null;
  created_at: string;
  updated_at: string;
}

// ── Helpers ──

function statusStyle(s: ReleaseStatus): string {
  return { planned: 'bg-blue-100 text-blue-700', deploying: 'bg-amber-100 text-amber-700', live: 'bg-green-100 text-green-700', rolled_back: 'bg-red-100 text-red-700', superseded: 'bg-gray-100 text-gray-500' }[s];
}

// ── Main component ──

export default function ReleasesPage() {
  const { profile } = useAuth();
  const { membership } = useActiveWedding();
  const isAuthorised = membership?.role === 'owner' || membership?.role === 'partner';
  const isDemo = isDemoMode;

  const [releases, setReleases] = useState<OperationalRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<OperationalRelease | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formVersion, setFormVersion] = useState('');
  const [formStatus, setFormStatus] = useState<ReleaseStatus>('planned');
  const [formSummary, setFormSummary] = useState('');
  const [formFixes, setFormFixes] = useState('');
  const [formKnownIssues, setFormKnownIssues] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formGitRef, setFormGitRef] = useState('');
  const [formPrevVersion, setFormPrevVersion] = useState('');
  const [formRollback, setFormRollback] = useState('');
  const [formVerification, setFormVerification] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Hotfix form
  const [showHotfix, setShowHotfix] = useState(false);
  const [hotfixBase, setHotfixBase] = useState('');
  const [hotfixProblem, setHotfixProblem] = useState('');
  const [hotfixFix, setHotfixFix] = useState('');
  const [hotfixFiles, setHotfixFiles] = useState('');
  const [hotfixMigration, setHotfixMigration] = useState(false);

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.from('operational_releases').select('*').order('created_at', { ascending: false }).limit(30);
      if (err) throw err;
      setReleases((data || []) as OperationalRelease[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load releases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  const handleCreate = async () => {
    if (!formVersion.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      const { error: err } = await supabase.from('operational_releases').insert({
        version: formVersion.trim(),
        status: formStatus,
        summary: formSummary.trim() || null,
        included_fixes: formFixes.trim() || null,
        known_issues: formKnownIssues.trim() || null,
        release_owner: formOwner.trim() || null,
        git_ref: formGitRef.trim() || null,
        previous_stable_version: formPrevVersion.trim() || null,
        rollback_notes: formRollback.trim() || null,
        verification_results: formVerification.trim() || null,
        release_date: formStatus === 'live' ? new Date().toISOString() : null,
      });
      if (err) throw err;
      setShowForm(false);
      setFormVersion(''); setFormStatus('planned'); setFormSummary(''); setFormFixes(''); setFormKnownIssues(''); setFormOwner(''); setFormGitRef(''); setFormPrevVersion(''); setFormRollback(''); setFormVerification('');
      fetchReleases();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create release');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ReleaseStatus) => {
    try {
      const upd: Partial<OperationalRelease> & { updated_at: string } = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === 'live') (upd as any).release_date = new Date().toISOString();
      const { error: err } = await supabase.from('operational_releases').update(upd).eq('id', id);
      if (err) throw err;
      fetchReleases();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    }
  };

  const handleHotfix = async () => {
    if (!hotfixBase.trim() || !hotfixProblem.trim()) return;
    setSaving(true);
    const hotfixVersion = `${hotfixBase.trim()}-hotfix-${Math.random().toString(36).slice(2, 5)}`;
    try {
      const { error: err } = await supabase.from('operational_releases').insert({
        version: hotfixVersion,
        status: 'live',
        summary: `HOTFIX: ${hotfixFix.trim() || hotfixProblem.trim().slice(0, 80)}`,
        included_fixes: hotfixFix.trim() || null,
        known_issues: hotfixProblem.trim(),
        release_owner: profile?.email || 'operator',
        rollback_notes: hotfixMigration ? 'Migration required — rollback via DB restore' : 'No migration — safe to revert',
        release_date: new Date().toISOString(),
        previous_stable_version: hotfixBase.trim(),
      });
      if (err) throw err;
      setShowHotfix(false);
      setHotfixBase(''); setHotfixProblem(''); setHotfixFix(''); setHotfixFiles(''); setHotfixMigration(false);
      fetchReleases();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create hotfix');
    } finally {
      setSaving(false);
    }
  };

  // ── Access gates ──

  if (isDemo) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6"><i className="ri-tools-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Release Centre</h1>
          <p className="text-sm text-foreground-500 mb-6">Release management is not available in demo mode.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to dashboard</Link>
        </div>
      </div>
    );
  }

  if (!isAuthorised) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-600 mb-6"><i className="ri-shield-check-line text-2xl" /></div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Access Restricted</h1>
          <p className="text-sm text-foreground-500 mb-6">Only wedding owners and partners can access release management.</p>
          <Link to="/app/dashboard" className="text-sm text-primary-500 font-label hover:underline cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back to dashboard</Link>
        </div>
      </div>
    );
  }

  // ── Render ──

  const liveRelease = releases.find((r) => r.status === 'live');
  const previousStable = releases.find((r) => r.status === 'superseded' || (r.status === 'live' && r.version !== liveRelease?.version));

  return (
    <div className="min-h-screen bg-background-50">
      <header className="h-16 bg-white border-b border-secondary-100 flex items-center px-4 md:px-6">
        <Link to="/app/dashboard" className="font-heading text-xl font-semibold text-foreground-900 cursor-pointer">Vowora</Link>
        <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-label font-medium bg-secondary-100 text-secondary-700 uppercase tracking-wide">Releases</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/app/admin/operations" className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Operations</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-label text-foreground-400 uppercase tracking-wide mb-1">Deployment History</p>
            <h1 className="font-heading text-2xl text-foreground-900">Release Centre</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowHotfix(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-sm font-label font-medium hover:bg-orange-200 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-tools-line" />Hotfix
            </button>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
              <i className="ri-add-line" />New Release
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 mb-6 flex items-center gap-2">
            <i className="ri-error-warning-line text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchReleases} className="ml-auto text-xs text-red-600 underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Current release banner */}
        {liveRelease && (
          <div className="p-5 rounded-lg bg-green-50 border border-green-200 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-green-100 text-green-700"><i className="ri-rocket-line text-xl" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-lg text-foreground-900">v{liveRelease.version}</span>
                  <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${statusStyle('live')}`}>Live</span>
                </div>
                {liveRelease.summary && <p className="text-sm text-foreground-600 mt-1">{liveRelease.summary}</p>}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-foreground-400">
                  {liveRelease.release_date && <span>Released: {new Date(liveRelease.release_date).toLocaleString()}</span>}
                  {liveRelease.release_owner && <span>Owner: {liveRelease.release_owner}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hotfix form */}
        {showHotfix && (
          <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
            <h2 className="font-heading text-lg text-foreground-900 mb-4">Create Hotfix</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Base Release *</label>
                <input value={hotfixBase} onChange={(e) => setHotfixBase(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="e.g. 2026.08.04.1" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Problem *</label>
                <input value={hotfixProblem} onChange={(e) => setHotfixProblem(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="What broke?" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Fix Summary</label>
                <input value={hotfixFix} onChange={(e) => setHotfixFix(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="What was changed?" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Changed Files</label>
                <input value={hotfixFiles} onChange={(e) => setHotfixFiles(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="src/pages/..., supabase/..." />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="hotfix-migration" checked={hotfixMigration} onChange={(e) => setHotfixMigration(e.target.checked)} className="rounded" />
                <label htmlFor="hotfix-migration" className="text-sm text-foreground-700 cursor-pointer">Migration required</label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleHotfix} disabled={saving || !hotfixBase.trim() || !hotfixProblem.trim()} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-label font-medium hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">
                {saving ? 'Creating...' : 'Deploy Hotfix'}
              </button>
              <button onClick={() => setShowHotfix(false)} className="px-4 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Cancel</button>
            </div>
          </div>
        )}

        {/* New release form */}
        {showForm && (
          <div className="p-5 rounded-lg bg-white border border-secondary-200 mb-8">
            <h2 className="font-heading text-lg text-foreground-900 mb-4">New Release</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Version *</label>
                <input value={formVersion} onChange={(e) => setFormVersion(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="e.g. 2026.08.04.1" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as ReleaseStatus)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm bg-white outline-none cursor-pointer">
                  <option value="planned">Planned</option>
                  <option value="deploying">Deploying</option>
                  <option value="live">Live</option>
                  <option value="rolled_back">Rolled Back</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Git Ref</label>
                <input value={formGitRef} onChange={(e) => setFormGitRef(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="Commit hash or tag" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Previous Stable</label>
                <input value={formPrevVersion} onChange={(e) => setFormPrevVersion(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="For rollback reference" />
              </div>
              <div>
                <label className="block text-xs font-label text-foreground-500 mb-1">Release Owner</label>
                <input value={formOwner} onChange={(e) => setFormOwner(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none" placeholder="owner@vowora.uk" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Summary</label>
                <textarea value={formSummary} onChange={(e) => setFormSummary(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" placeholder="Release highlights" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Included Fixes</label>
                <textarea value={formFixes} onChange={(e) => setFormFixes(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" placeholder="What was fixed or added" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Known Issues</label>
                <textarea value={formKnownIssues} onChange={(e) => setFormKnownIssues(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" placeholder="Issues found during verification" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Rollback Notes</label>
                <textarea value={formRollback} onChange={(e) => setFormRollback(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" placeholder="How to roll back this release" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label text-foreground-500 mb-1">Verification Results</label>
                <textarea value={formVerification} onChange={(e) => setFormVerification(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-sm outline-none resize-none" placeholder="Smoke test and verification results" />
              </div>
            </div>
            {createError && <p className="text-xs text-red-600 mb-3">{createError}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleCreate} disabled={saving || !formVersion.trim()} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap">{saving ? 'Saving...' : 'Create Release'}</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap">Cancel</button>
            </div>
          </div>
        )}

        {/* Release timeline */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-white border border-secondary-100 animate-pulse">
                <div className="h-4 bg-secondary-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-secondary-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4"><i className="ri-git-branch-line text-xl" /></div>
            <p className="font-label font-medium text-sm text-foreground-900">No releases recorded</p>
            <p className="text-xs text-foreground-400 mt-1">Create your first release record above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {releases.map((rel) => (
              <div key={rel.id} className={`p-4 rounded-lg bg-white border cursor-pointer transition-colors ${selectedRelease?.id === rel.id ? 'border-primary-300 bg-primary-50/30' : 'border-secondary-100 hover:border-secondary-300'}`} onClick={() => setSelectedRelease(selectedRelease?.id === rel.id ? null : rel)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-label font-semibold text-sm text-foreground-900">v{rel.version}</span>
                      <span className={`text-[10px] font-label font-semibold uppercase px-1.5 py-0.5 rounded ${statusStyle(rel.status)}`}>{rel.status.replace('_', ' ')}</span>
                    </div>
                    {rel.summary && <p className="text-xs text-foreground-500">{rel.summary.slice(0, 120)}</p>}
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-foreground-400 flex-wrap">
                      {rel.release_date && <span>{new Date(rel.release_date).toLocaleDateString()}</span>}
                      {rel.release_owner && <span>{rel.release_owner}</span>}
                      {rel.git_ref && <span className="font-mono">{rel.git_ref.slice(0, 8)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {rel.status === 'planned' && (
                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(rel.id, 'deploying'); }} className="px-2 py-1 rounded text-[10px] font-label bg-amber-100 text-amber-700 hover:bg-amber-200 cursor-pointer whitespace-nowrap">Deploy</button>
                    )}
                    {rel.status === 'deploying' && (
                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(rel.id, 'live'); }} className="px-2 py-1 rounded text-[10px] font-label bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer whitespace-nowrap">Mark Live</button>
                    )}
                    {rel.status === 'live' && (
                      <button onClick={(e) => { e.stopPropagation(); handleStatusChange(rel.id, 'rolled_back'); }} className="px-2 py-1 rounded text-[10px] font-label bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer whitespace-nowrap">Rollback</button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedRelease?.id === rel.id && (
                  <div className="mt-4 pt-4 border-t border-secondary-100" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {rel.included_fixes && (
                        <div>
                          <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Included Fixes</p>
                          <p className="text-sm text-foreground-700">{rel.included_fixes}</p>
                        </div>
                      )}
                      {rel.known_issues && (
                        <div>
                          <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Known Issues</p>
                          <p className="text-sm text-foreground-700">{rel.known_issues}</p>
                        </div>
                      )}
                      {rel.rollback_notes && (
                        <div>
                          <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Rollback Notes</p>
                          <p className="text-sm text-foreground-700">{rel.rollback_notes}</p>
                        </div>
                      )}
                      {rel.verification_results && (
                        <div>
                          <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Verification</p>
                          <p className="text-sm text-foreground-700">{rel.verification_results}</p>
                        </div>
                      )}
                      {rel.previous_stable_version && (
                        <div>
                          <p className="text-[10px] font-label text-foreground-400 uppercase mb-0.5">Previous Stable</p>
                          <p className="text-sm text-foreground-700">v{rel.previous_stable_version}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rollback readiness */}
        {previousStable && (
          <div className="mt-8 p-4 rounded-lg bg-background-100 border border-secondary-200">
            <h3 className="font-label font-semibold text-sm text-foreground-900 mb-2"><i className="ri-arrow-go-back-line mr-1.5" />Rollback Ready</h3>
            <p className="text-xs text-foreground-500">Previous stable version <span className="font-mono font-medium">v{previousStable.version}</span> is available for rollback.</p>
          </div>
        )}
      </div>
    </div>
  );
}