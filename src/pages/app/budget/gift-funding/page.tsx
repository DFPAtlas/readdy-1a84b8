import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import { formatMinor, toMinor, toMajor } from '@/lib/budgetMoney';
import type { CurrencyCode } from '@/lib/budgetMoney';

const CONNECT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/gift-fund-connect';

type ConnectStatus = 'not_connected' | 'onboarding' | 'action_required' | 'ready' | 'payouts_paused' | 'error' | 'loading';

interface FundAccount {
  status: ConnectStatus;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements_due: boolean;
  account_id?: string;
}

interface Fund {
  id: string;
  title: string;
  description: string | null;
  category: string;
  target_amount_minor: number | null;
  currency: string;
  is_active: boolean;
  is_public: boolean;
  raised_amount?: number;
  contributor_count?: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'honeymoon', label: 'Honeymoon', icon: 'ri-plane-line' },
  { value: 'new_home', label: 'New Home', icon: 'ri-home-4-line' },
  { value: 'furniture', label: 'Furniture', icon: 'ri-sofa-line' },
  { value: 'wedding', label: 'Wedding', icon: 'ri-cake-line' },
  { value: 'experiences', label: 'Experiences', icon: 'ri-compass-3-line' },
  { value: 'charity', label: 'Charity', icon: 'ri-heart-pulse-line' },
  { value: 'future_together', label: 'Future Together', icon: 'ri-rocket-line' },
  { value: 'custom', label: 'Custom', icon: 'ri-heart-line' },
];

const FUND_CATEGORY_LABEL: Record<string, string> = {
  honeymoon: 'Honeymoon',
  new_home: 'New Home',
  furniture: 'Furniture',
  wedding: 'Wedding',
  experiences: 'Experiences',
  charity: 'Charity',
  future_together: 'Future Together',
  custom: 'Custom',
};

export default function GiftFundingSetupPage() {
  const navigate = useNavigate();
  const { wedding } = useActiveWedding();
  const weddingId = wedding?.id;

  const [accountStatus, setAccountStatus] = useState<FundAccount>({ status: 'loading', onboarding_complete: false, charges_enabled: false, payouts_enabled: false, requirements_due: false });
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Create fund modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('custom');
  const [newTarget, setNewTarget] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const loadData = useCallback(async () => {
    if (!weddingId) return;
    setLoading(true);
    setError('');

    try {
      // Get Connect account status
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Please log in.'); setLoading(false); return; }

      const token = session.access_token;
      const statusRes = await fetch(CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'status', wedding_id: weddingId }),
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setAccountStatus(statusData);
      }

      // Get funds
      const { data: fundData, error: fundErr } = await supabase
        .from('gift_funds')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });

      if (!fundErr && fundData) {
        // Get contribution totals
        const fundIds = fundData.map((f: { id: string }) => f.id);
        let contribMap = new Map<string, { total: number; count: number }>();

        if (fundIds.length > 0) {
          const { data: contribs } = await supabase
            .from('gift_fund_contributions')
            .select('fund_id, amount_minor, refunded_amount_minor, payment_status')
            .in('fund_id', fundIds)
            .eq('payment_status', 'paid');

          (contribs || []).forEach((c: { fund_id: string; amount_minor: number; refunded_amount_minor: number }) => {
            const existing = contribMap.get(c.fund_id) || { total: 0, count: 0 };
            existing.total += (c.amount_minor || 0) - (c.refunded_amount_minor || 0);
            existing.count += 1;
            contribMap.set(c.fund_id, existing);
          });
        }

        setFunds(fundData.map((f: Record<string, unknown>) => ({
          id: f.id as string,
          title: f.title as string,
          description: f.description as string || null,
          category: f.category as string,
          target_amount_minor: f.target_amount_minor ? Number(f.target_amount_minor) : null,
          currency: (f.currency as string) || 'gbp',
          is_active: !!(f.is_active),
          is_public: !!(f.is_public),
          raised_amount: contribMap.get(f.id as string)?.total || 0,
          contributor_count: contribMap.get(f.id as string)?.count || 0,
          created_at: f.created_at as string,
        })));
      }
    } catch (err) {
      console.error('Failed to load gift funding:', err);
      setError('Could not load gift funding data.');
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOnboard = async () => {
    setOnboardingLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(CONNECT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'onboard', wedding_id: weddingId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const err = await res.json();
        setError(err.error || 'Could not start onboarding.');
      }
    } catch {
      setError('Network error during onboarding.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleCreateFund = async () => {
    if (!newTitle.trim() || !weddingId) return;
    setCreateLoading(true);
    setCreateError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCreateError('Please log in.'); setCreateLoading(false); return; }

      const fundData: Record<string, unknown> = {
        wedding_id: weddingId,
        title: newTitle.trim().slice(0, 80),
        category: newCategory,
        currency: 'gbp',
        is_active: false,
        is_public: true,
      };

      if (newDescription.trim()) {
        fundData.description = newDescription.trim().slice(0, 600);
      }

      if (newTarget && Number(newTarget) > 0) {
        fundData.target_amount_minor = toMinor(Number(newTarget));
      }

      const { error: insertErr } = await supabase.from('gift_funds').insert(fundData);

      if (insertErr) {
        setCreateError('Could not create fund.');
      } else {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewTarget('');
        setNewCategory('custom');
        loadData();
      }
    } catch {
      setCreateError('Network error.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleActive = async (fundId: string, currentActive: boolean) => {
    if (!currentActive && accountStatus.status !== 'ready') return;

    await supabase.from('gift_funds').update({ is_active: !currentActive }).eq('id', fundId);
    loadData();
  };

  const handleTogglePublic = async (fundId: string, currentPublic: boolean) => {
    await supabase.from('gift_funds').update({ is_public: !currentPublic }).eq('id', fundId);
    loadData();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-secondary-100 rounded-lg" />
        <div className="h-32 bg-secondary-100 rounded-xl" />
        <div className="h-40 bg-secondary-100 rounded-xl" />
      </div>
    );
  }

  const canActivateFunds = accountStatus.status === 'ready';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => navigate('/app/budget')} className="text-xs text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap mb-2 flex items-center gap-1">
            <i className="ri-arrow-left-line" />Back to budget
          </button>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Gift Fund</h1>
          <p className="text-sm text-foreground-500">Let your guests contribute directly to your future together.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {/* Stripe Connect Status */}
      <div className="bg-white rounded-xl border border-secondary-100 p-5 md:p-6 mb-6">
        <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Payment Account</h2>

        {accountStatus.status === 'loading' ? (
          <div className="flex items-center gap-3">
            <i className="ri-loader-4-line animate-spin text-foreground-400" />
            <span className="text-sm text-foreground-500">Checking account status...</span>
          </div>
        ) : accountStatus.status === 'not_connected' ? (
          <div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-bank-line text-lg text-foreground-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-900 mb-1">Set up your payment account</p>
                <p className="text-xs text-foreground-500 leading-relaxed">
                  To receive gift contributions, you need to connect a Stripe account. It only takes a few minutes.
                  Stripe handles all payments securely — we never see your bank details.
                </p>
              </div>
            </div>
            <button
              onClick={handleOnboard}
              disabled={onboardingLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              {onboardingLoading ? (
                <><i className="ri-loader-4-line animate-spin" /> Connecting...</>
              ) : (
                <>Set up gift funding <i className="ri-arrow-right-line" /></>
              )}
            </button>
          </div>
        ) : accountStatus.status === 'onboarding' || accountStatus.status === 'action_required' ? (
          <div>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-time-line text-lg text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">Account setup in progress</p>
                <p className="text-xs text-amber-600 leading-relaxed">
                  {accountStatus.requirements_due
                    ? 'Stripe needs additional information to verify your account. Please complete the remaining steps.'
                    : 'Your account is being verified. This usually takes a few minutes.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleOnboard}
              disabled={onboardingLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-label font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              {accountStatus.requirements_due ? 'Complete verification' : 'Continue setup'}
            </button>
          </div>
        ) : accountStatus.status === 'ready' ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-check-line text-lg text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800 mb-1">Payment account ready</p>
              <p className="text-xs text-emerald-600 leading-relaxed">
                Your Stripe account is connected and verified. You can now activate gift funds and receive contributions.
              </p>
            </div>
          </div>
        ) : accountStatus.status === 'payouts_paused' ? (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line text-lg text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800 mb-1">Payouts paused</p>
              <p className="text-xs text-red-600 leading-relaxed">
                Your payouts are currently paused. Please check your Stripe dashboard for details.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line text-lg text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-red-800 mb-1">Something went wrong</p>
              <p className="text-xs text-red-600">We could not verify your account status. Please try again.</p>
            </div>
          </div>
        )}
      </div>

      {/* Funds List */}
      <div className="bg-white rounded-xl border border-secondary-100 p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-label text-sm font-semibold text-foreground-900">Your funds</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line" /> Create fund
          </button>
        </div>

        {funds.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
              <i className="ri-heart-line text-2xl text-foreground-400" />
            </div>
            <p className="text-sm text-foreground-500">No funds created yet. Create your first gift fund to start receiving contributions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {funds.map((fund) => (
              <div key={fund.id} className="flex items-center gap-4 p-4 rounded-lg bg-background-50 border border-secondary-100">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <i className={`${CATEGORIES.find((c) => c.value === fund.category)?.icon || 'ri-heart-line'} text-sm text-primary-500`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground-900 truncate">{fund.title}</p>
                    <span className="px-1.5 py-0.5 rounded-full bg-secondary-100 text-[10px] text-foreground-500 font-label capitalize whitespace-nowrap">
                      {FUND_CATEGORY_LABEL[fund.category] || fund.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-500 mt-1">
                    {fund.raised_amount != null && (
                      <span>{formatMinor(fund.raised_amount, 'GBP' as CurrencyCode)} raised</span>
                    )}
                    {fund.contributor_count != null && fund.contributor_count > 0 && (
                      <span>{fund.contributor_count} {fund.contributor_count === 1 ? 'gift' : 'gifts'}</span>
                    )}
                    {fund.target_amount_minor && (
                      <span>Target: {formatMinor(fund.target_amount_minor, 'GBP' as CurrencyCode)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleTogglePublic(fund.id, fund.is_public)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-label border transition-colors cursor-pointer whitespace-nowrap ${
                      fund.is_public ? 'bg-secondary-100 text-foreground-600 border-secondary-200' : 'bg-foreground-50 text-foreground-400 border-foreground-200'
                    }`}
                  >
                    {fund.is_public ? 'Public' : 'Hidden'}
                  </button>
                  <button
                    onClick={() => handleToggleActive(fund.id, fund.is_active)}
                    disabled={!fund.is_active && !canActivateFunds}
                    className={`px-3 py-1.5 rounded-lg text-xs font-label border transition-colors cursor-pointer whitespace-nowrap ${
                      fund.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : !canActivateFunds
                          ? 'bg-secondary-50 text-foreground-300 border-secondary-100 cursor-not-allowed'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {fund.is_active ? 'Active' : 'Draft'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Fund Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-semibold text-foreground-900">Create Gift Fund</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary-100 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Title *</label>
                <input
                  type="text"
                  maxLength={80}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Honeymoon fund"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setNewCategory(cat.value)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-label border transition-colors cursor-pointer whitespace-nowrap ${
                        newCategory === cat.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-secondary-200 text-foreground-500 hover:border-secondary-300'
                      }`}
                    >
                      <i className={`${cat.icon} text-[10px]`} /> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Description</label>
                <textarea
                  maxLength={600}
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What this fund is for..."
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Target amount (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-400">£</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full pl-7 pr-4 py-2.5 text-sm rounded-lg border border-secondary-200 bg-white text-foreground-900 placeholder:text-foreground-400 focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              {newCategory === 'charity' && (
                <div className="p-3 rounded-lg bg-secondary-50 border border-secondary-100">
                  <p className="text-xs text-foreground-600">
                    This gift is paid to the couple, who are responsible for passing it to their chosen charity.
                  </p>
                </div>
              )}

              {createError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{createError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-secondary-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFund}
                  disabled={!newTitle.trim() || createLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {createLoading ? 'Creating...' : 'Create fund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legal disclaimer */}
      <p className="text-center text-[11px] text-foreground-350 mt-8 max-w-lg mx-auto leading-relaxed">
        Gift contributions are voluntary payments to the couple and do not provide ownership, financial returns or rewards.
        Payments are processed securely by Stripe. We do not store or have access to your bank details.
      </p>
    </div>
  );
}