import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeddingWebsiteBuilder } from '@/hooks/useWeddingWebsiteBuilder';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { PUBLIC_SITE_HOST } from '@/lib/env';
import { useSubscription } from '@/hooks/useSubscription';
import type { BillingPlanKey } from '@/types/billing';

// ── Domain status types ──
type DomainStatus = 'none' | 'awaiting_dns' | 'verifying' | 'verified' | 'certificate_pending' | 'active' | 'misconfigured' | 'failed' | 'removing';
type DomainType = 'vowora' | 'custom';

interface DomainState {
  type: DomainType;
  hostname: string;
  normalizedHostname: string;
  status: DomainStatus;
  primary: boolean;
  dnsRecords: DnsRecord[];
  verifiedAt: string | null;
  activatedAt: string | null;
  failureCode: string | null;
}

interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT';
  host: string;
  value: string;
  ttl: number;
}

// ── RESERVED_SLUGS ──
const RESERVED = ['admin', 'app', 'api', 'login', 'signup', 'guest', 'w', 'live-wall', 'invite', 'demo-start', 'www', 'mail', 'help', 'status', 'blog', 'docs', 'support', 'shop', 'store'];

function normalizeHostname(raw: string): string {
  let cleaned = raw.trim().toLowerCase();
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  // Strip path
  const pathIdx = cleaned.indexOf('/');
  if (pathIdx > -1) cleaned = cleaned.substring(0, pathIdx);
  // Strip port
  const portIdx = cleaned.lastIndexOf(':');
  if (portIdx > 0) cleaned = cleaned.substring(0, portIdx);
  return cleaned;
}

function isValidHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;
  // Reject IP addresses
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
  // Reject localhost
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
  // Basic hostname pattern
  const hostnameRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
  return hostnameRegex.test(hostname);
}

function demoDnsRecords(hostname: string): DnsRecord[] {
  return [
    { type: 'CNAME', host: hostname, value: 'sites.vowora.uk', ttl: 3600 },
    { type: 'TXT', host: `_vowora.${hostname}`, value: `vowora-verify=${hostname.replace(/\./g, '-')}`, ttl: 3600 },
  ];
}

export default function WebsiteDomainPage() {
  const navigate = useNavigate();
  const { activeWedding } = useActiveWedding();
  const { draftConfig, slugAvailable, slugChecking, setSlug, checkSlug, saveDraft, publishStatus } = useWeddingWebsiteBuilder();
  const { subscription } = useSubscription(activeWedding?.id || null);

  const [domain, setDomain] = useState<DomainState>({
    type: 'vowora',
    hostname: '',
    normalizedHostname: '',
    status: 'none',
    primary: false,
    dnsRecords: [],
    verifiedAt: null,
    activatedAt: null,
    failureCode: null,
  });
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [connectStep, setConnectStep] = useState<'idle' | 'enter' | 'dns' | 'checking'>('idle');
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [slugChanged, setSlugChanged] = useState(false);
  const [oldSlug, setOldSlug] = useState('');
  const [slugSaveStatus, setSlugSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [slugChangeConfirm, setSlugChangeConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const currentSlug = draftConfig?.slug || '';
  const hasCustomDomain = domain.type === 'custom' && domain.status === 'active';
  const currentPlan = (subscription?.planKey || 'free') as BillingPlanKey;
  const canUseCustomDomain = currentPlan === 'luxury';
  const isPublished = publishStatus === 'published';
  const voworaUrl = currentSlug ? `/w/${currentSlug}` : '';
  const fullVoworaUrl = currentSlug ? `${PUBLIC_SITE_HOST}/w/${currentSlug}` : '';

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Handle slug change ──
  const handleSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    setSlug(sanitized);
    if (!slugChanged) {
      setOldSlug(currentSlug);
      setSlugChanged(true);
    }
  };

  const handleSlugBlur = () => {
    if (draftConfig?.slug) checkSlug(draftConfig.slug);
  };

  const handleSaveSlug = async () => {
    if (RESERVED.includes(currentSlug)) {
      showToast('error', 'This slug is reserved. Please choose another.');
      return;
    }
    if (currentSlug.length < 3) {
      showToast('error', 'Slug must be at least 3 characters.');
      return;
    }
    setSlugSaveStatus('saving');
    try {
      await saveDraft();
      setSlugSaveStatus('saved');
      showToast('success', slugChanged && oldSlug ? `Slug changed from /w/${oldSlug} to /w/${currentSlug}` : 'Slug saved');
      setSlugChanged(false);
      setTimeout(() => setSlugSaveStatus('idle'), 2000);
    } catch {
      setSlugSaveStatus('error');
      showToast('error', 'Failed to save slug');
    }
  };

  // ── Custom domain flow ──
  const startConnect = () => {
    setConnectStep('enter');
    setCustomDomainInput('');
    setDomainError(null);
  };

  const handleDomainSubmit = () => {
    const normalized = normalizeHostname(customDomainInput);
    if (!normalized) {
      setDomainError('Please enter a valid domain');
      return;
    }
    if (!isValidHostname(normalized)) {
      setDomainError('Invalid hostname. Use format: www.yourdomain.com');
      return;
    }
    // In demo mode, simulate DNS setup
    if (isDemoMode) {
      setDomain({
        type: 'custom',
        hostname: customDomainInput.trim(),
        normalizedHostname: normalized,
        status: 'awaiting_dns',
        primary: false,
        dnsRecords: demoDnsRecords(normalized),
        verifiedAt: null,
        activatedAt: null,
        failureCode: null,
      });
      setConnectStep('dns');
      setDomainError(null);
      return;
    }
    setDomainError('Custom wedding domains require hosting configuration. Open Support to request setup; no DNS records have been generated.');
  };

  const checkVerification = async () => {
    if (isDemoMode) {
      setConnectStep('checking');
      await new Promise((r) => setTimeout(r, 1500));
      setDomain((prev) => ({ ...prev, status: 'active', primary: true, verifiedAt: new Date().toISOString(), activatedAt: new Date().toISOString() }));
      setConnectStep('idle');
      showToast('success', 'Domain verified and active!');
      return;
    }
    showToast('error', 'Domain verification requires hosting setup. Please contact Support.');
  };

  const removeDomain = async () => {
    setRemoveConfirm(false);
    setDomain((prev) => ({ ...prev, status: 'removing' }));
    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 800));
    }
    setDomain({
      type: 'vowora',
      hostname: '',
      normalizedHostname: '',
      status: 'none',
      primary: false,
      dnsRecords: [],
      verifiedAt: null,
      activatedAt: null,
      failureCode: null,
    });
    setConnectStep('idle');
    showToast('success', 'Custom domain removed. Your Vowora address is still active.');
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  const statusLabels: Record<DomainStatus, { label: string; color: string; icon: string }> = {
    none: { label: 'Not configured', color: 'bg-secondary-100 text-secondary-600', icon: 'ri-link-unlink' },
    awaiting_dns: { label: 'Awaiting DNS', color: 'bg-amber-100 text-amber-700', icon: 'ri-time-line' },
    verifying: { label: 'Verifying...', color: 'bg-secondary-100 text-secondary-600', icon: 'ri-loader-4-line animate-spin' },
    verified: { label: 'DNS Verified', color: 'bg-emerald-100 text-emerald-700', icon: 'ri-check-double-line' },
    certificate_pending: { label: 'SSL Pending', color: 'bg-amber-100 text-amber-700', icon: 'ri-shield-line' },
    active: { label: 'Active', color: 'bg-accent-100 text-accent-700', icon: 'ri-check-line' },
    misconfigured: { label: 'Misconfigured', color: 'bg-red-100 text-red-700', icon: 'ri-error-warning-line' },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: 'ri-close-circle-line' },
    removing: { label: 'Removing...', color: 'bg-secondary-100 text-secondary-600', icon: 'ri-loader-4-line animate-spin' },
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-label font-medium text-foreground-400 uppercase tracking-wider mb-1">Wedding website</p>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-2">Domain</h1>
        <p className="text-sm text-foreground-600">
          Manage your wedding website address. You can use a free Vowora subdomain or connect your own custom domain.
        </p>
      </div>

      {/* ── Vowora Address ── */}
      <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500">
            <i className="ri-global-line text-sm" />
          </div>
          <div>
            <h2 className="font-label text-sm font-semibold text-foreground-900">Vowora address</h2>
            <p className="text-xs text-foreground-400">Your free wedding page URL</p>
          </div>
        </div>

        {/* Slug editor */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-label font-medium text-foreground-500 mb-1.5">Website slug</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-foreground-400 whitespace-nowrap">vowora.uk/w/</span>
              <input
                type="text"
                value={currentSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                onBlur={handleSlugBlur}
                className="flex-1 px-3 py-2 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 font-mono"
                placeholder="emma-and-james"
              />
            </div>
            {slugChecking && <p className="text-[10px] text-foreground-400 mt-1">Checking...</p>}
            {!slugChecking && slugAvailable === true && <p className="text-[10px] text-emerald-600 mt-1">Available</p>}
            {!slugChecking && slugAvailable === false && <p className="text-[10px] text-red-500 mt-1">Already taken</p>}
            {currentSlug && currentSlug.length < 3 && <p className="text-[10px] text-foreground-400 mt-1">At least 3 characters</p>}
            {RESERVED.includes(currentSlug) && <p className="text-[10px] text-red-500 mt-1">This slug is reserved</p>}
          </div>

          {slugChanged && oldSlug && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <i className="ri-alert-line" />
                Changing from <span className="font-mono font-medium">/w/{oldSlug}</span> to <span className="font-mono font-medium">/w/{currentSlug}</span>
              </p>
              <p className="text-[10px] text-amber-600 mt-1">Previously shared links using the old address will stop working.</p>
            </div>
          )}

          <button
            onClick={handleSaveSlug}
            disabled={slugSaveStatus === 'saving' || (!slugChanged && slugSaveStatus === 'idle')}
            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {slugSaveStatus === 'saving' ? 'Saving...' : slugSaveStatus === 'saved' ? 'Saved' : 'Save slug'}
          </button>
        </div>

        {/* Live URL display */}
        {currentSlug && isPublished && (
          <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-label text-foreground-400 mb-0.5">Live URL</p>
              <p className="text-sm text-primary-600 font-mono truncate">{fullVoworaUrl}</p>
            </div>
            <button
              onClick={() => window.open(`/w/${currentSlug}`, '_blank')}
              className="px-3 py-1.5 text-xs rounded-lg border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              <i className="ri-external-link-line mr-1" /> Open
            </button>
            <button
              onClick={() => { navigator.clipboard.writeText(fullVoworaUrl); showToast('success', 'URL copied'); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
            >
              <i className="ri-file-copy-line mr-1" /> Copy
            </button>
          </div>
        )}
        {!isPublished && currentSlug && (
          <div className="mt-4 pt-4 border-t border-secondary-100">
            <p className="text-xs text-foreground-400 flex items-center gap-1.5">
              <i className="ri-information-line" />
              Publish your website to make this URL live.
            </p>
          </div>
        )}
      </div>

      {/* ── Custom Domain ── */}
      <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary-50 text-secondary-600">
            <i className="ri-links-line text-sm" />
          </div>
          <div>
            <h2 className="font-label text-sm font-semibold text-foreground-900">Custom domain</h2>
            <p className="text-xs text-foreground-400">Use your own domain name</p>
          </div>
          {domain.type === 'custom' && (
            <span className={`ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-label font-medium ${statusLabels[domain.status].color}`}>
              {statusLabels[domain.status].label}
            </span>
          )}
        </div>

        {/* Plan gate */}
        {!canUseCustomDomain && domain.type === 'vowora' && (
          <div className="bg-background-50 border border-secondary-100 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 flex-shrink-0">
                <i className="ri-vip-crown-line text-sm" />
              </div>
              <div>
                <p className="text-sm font-label font-semibold text-foreground-900 mb-1">Available on Luxury</p>
                <p className="text-xs text-foreground-500 mb-3">Custom domains require the Vowora Luxury plan. Upgrade to connect your own domain.</p>
                <button
                  onClick={() => navigate('/app/billing')}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  View plans
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No custom domain yet */}
        {canUseCustomDomain && domain.type === 'vowora' && connectStep === 'idle' && (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3">
              <i className="ri-links-line text-xl" />
            </div>
            <p className="text-sm text-foreground-500 mb-4">No custom domain connected yet.</p>
            <button
              onClick={startConnect}
              className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line mr-1.5" /> Connect domain
            </button>
          </div>
        )}

        {/* Domain entry step */}
        {canUseCustomDomain && connectStep === 'enter' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-label font-medium text-foreground-500 mb-1.5">Enter your domain</label>
              <input
                type="text"
                value={customDomainInput}
                onChange={(e) => { setCustomDomainInput(e.target.value); setDomainError(null); }}
                placeholder="www.ourwedding.co.uk"
                className="w-full px-3 py-2.5 text-sm border border-secondary-200 rounded-lg bg-white text-foreground-900 font-mono"
                onKeyDown={(e) => { if (e.key === 'Enter') handleDomainSubmit(); }}
              />
              {domainError && <p className="text-[10px] text-red-500 mt-1">{domainError}</p>}
              <p className="text-[10px] text-foreground-400 mt-1.5">Enter your domain name without http:// or https://</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDomainSubmit}
                className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Continue
              </button>
              <button
                onClick={() => { setConnectStep('idle'); setDomainError(null); }}
                className="px-4 py-2.5 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* DNS instructions */}
        {(connectStep === 'dns' || connectStep === 'checking') && domain.dnsRecords.length > 0 && (
          <div className="space-y-4">
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <i className="ri-information-line text-primary-500 text-sm mt-0.5" />
                <div>
                  <p className="text-sm font-label font-semibold text-primary-800">Configure your DNS</p>
                  <p className="text-xs text-primary-600 mt-0.5">Add these records in your domain provider&apos;s DNS settings. Changes may take a few minutes to propagate.</p>
                </div>
              </div>

              <div className="space-y-2">
                {domain.dnsRecords.map((rec, idx) => (
                  <div key={idx} className="bg-white border border-primary-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded bg-secondary-100 text-foreground-600 text-[10px] font-mono font-bold">{rec.type}</span>
                      <button
                        onClick={() => copyToClipboard(rec.value, idx)}
                        className="text-[10px] text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"
                      >
                        <i className={copiedIndex === idx ? 'ri-check-line' : 'ri-file-copy-line'} /> {copiedIndex === idx ? 'Copied' : 'Copy value'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[10px] text-foreground-400 mb-0.5">Host / Name</p>
                        <p className="text-xs font-mono text-foreground-900 bg-background-50 rounded px-2 py-1 break-all">{rec.host}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-foreground-400 mb-0.5">Value / Target</p>
                        <p className="text-xs font-mono text-foreground-900 bg-background-50 rounded px-2 py-1 break-all">{rec.value}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-foreground-400 mb-0.5">TTL</p>
                        <p className="text-xs text-foreground-600">{rec.ttl} seconds (Auto)</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={checkVerification}
                disabled={connectStep === 'checking'}
                className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {connectStep === 'checking' ? (
                  <><i className="ri-loader-4-line animate-spin mr-1.5" /> Checking...</>
                ) : (
                  'Check again'
                )}
              </button>
              <button
                onClick={() => { setConnectStep('enter'); setCustomDomainInput(domain.hostname); }}
                className="px-4 py-2.5 text-sm text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>

            {domain.status === 'misconfigured' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 flex items-center gap-1.5">
                  <i className="ri-error-warning-line" />
                  DNS records not found. Make sure they are added correctly at your domain provider.
                </p>
              </div>
            )}

            {isDemoMode && (
              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                <i className="ri-information-line" />
                Demo mode — verification is simulated. No real DNS records are checked.
              </p>
            )}
          </div>
        )}

        {/* Active custom domain */}
        {domain.type === 'custom' && domain.status === 'active' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 flex-shrink-0">
                  <i className="ri-check-double-line text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-label font-semibold text-emerald-800">Domain active</p>
                  <p className="text-xs text-emerald-600 mt-0.5 break-all">{domain.hostname}</p>
                  <p className="text-[10px] text-emerald-500 mt-1">
                    SSL active · Verified {domain.verifiedAt ? new Date(domain.verifiedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => window.open(`https://${domain.hostname}`, '_blank')}
                className="px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
              >
                <i className="ri-external-link-line mr-1.5" /> Open website
              </button>
              <button
                onClick={checkVerification}
                className="px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1.5" /> Re-check status
              </button>
              <button
                onClick={() => setConnectStep('dns')}
                className="px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 hover:bg-background-100 cursor-pointer transition-colors whitespace-nowrap"
              >
                <i className="ri-list-check mr-1.5" /> View DNS records
              </button>
              <button
                onClick={() => setRemoveConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-200 text-xs font-label text-red-600 hover:bg-red-50 cursor-pointer transition-colors whitespace-nowrap"
              >
                <i className="ri-delete-bin-line mr-1.5" /> Remove domain
              </button>
            </div>
          </div>
        )}

        {/* Remove confirmation */}
        {removeConfirm && (
          <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={() => setRemoveConfirm(false)}>
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-label font-semibold text-foreground-900 mb-2">Remove custom domain?</h3>
              <p className="text-xs text-foreground-500 mb-1">Your website will still be available at your Vowora address:</p>
              <p className="text-xs font-mono text-primary-600 mb-3">{fullVoworaUrl}</p>
              <p className="text-xs text-foreground-400 mb-4">Shared links using the custom domain will stop working.</p>
              <div className="flex items-center gap-2 justify-end">
                <button onClick={() => setRemoveConfirm(false)} className="px-4 py-2 text-xs font-label rounded-lg border border-secondary-200 text-foreground-600 hover:bg-background-100 cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={removeDomain} className="px-4 py-2 text-xs font-label rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer whitespace-nowrap">Remove</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Help note ── */}
      {domain.type === 'custom' && domain.status !== 'active' && !isDemoMode && (
        <div className="mt-5 bg-background-50 border border-secondary-100 rounded-xl p-4">
          <p className="text-xs text-foreground-500 flex items-start gap-2">
            <i className="ri-information-line text-foreground-400 mt-0.5" />
            <span>Automated domain verification is not available in all environments. If you have configured your DNS records correctly, contact support to finalise activation.</span>
          </p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-label shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-accent-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}