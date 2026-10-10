import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { DEFAULT_CATEGORIES, BENCHMARKS, type BudgetSetupProfile } from '@/types/budget';

// ── Demo setup page ──
function DemoBudgetSetupPage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground-500 mb-2">
            <button onClick={() => navigate('/app/budget')} className="hover:text-foreground-800 cursor-pointer whitespace-nowrap">Budget</button>
            <i className="ri-arrow-right-s-line text-xs" />
            <span className="text-foreground-700">Setup</span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Budget setup</h1>
        </div>

        <div className="card-default text-center py-12">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-4">
            <i className="ri-funds-line text-2xl" />
          </div>
          <h2 className="font-label text-sm font-semibold text-foreground-900 mb-2">Demo Mode</h2>
          <p className="text-sm text-foreground-500 mb-6 max-w-sm mx-auto">
            The guided budget setup wizard is available in the production application. The demo account already includes a pre-configured budget with 8 categories and 10 expenses.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => navigate('/app/budget')} className="btn-outline text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line mr-1.5" />Back to budget
            </button>
            <button onClick={() => navigate('/app/budget/categories')} className="btn-primary text-xs py-2 cursor-pointer whitespace-nowrap">
              <i className="ri-list-check mr-1.5" />View categories
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Original Supabase-backed page ──
type Step = 1 | 2 | 3;

const WEDDING_DAYS = ['Saturday', 'Sunday', 'Friday', 'Thursday', 'Wednesday', 'Tuesday', 'Monday'];
const WEDDING_MONTHS = ['June', 'July', 'August', 'September', 'May', 'October', 'April', 'November', 'March', 'December', 'February', 'January'];
const WEDDING_REGIONS = ['London', 'South East', 'South West', 'Midlands', 'North West', 'North East', 'Scotland', 'Wales', 'Northern Ireland', 'Other'];
const CEREMONY_TYPES = ['Religious', 'Civil', 'Humanist', 'Register office'];
const RECEPTION_TYPES = ['Hotel or country house', 'Barn or outdoor venue', 'Restaurant or private dining', 'Marquee or tipi', 'Village or community hall', 'At home', 'Other'];
const PLANNING_LEVELS = ['simple', 'standard', 'premium', 'custom'];

interface CategoryAllocation {
  key: string;
  name: string;
  percentage: number;
  amount: number;
}

function NormalBudgetSetupPage() {
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [plannedTotal, setPlannedTotal] = useState(20000);
  const [maximumTotal, setMaximumTotal] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [externalContributions, setExternalContributions] = useState('');
  const [honeymoonBudget, setHoneymoonBudget] = useState('');
  const [engagementRingCost, setEngagementRingCost] = useState('');
  const [honeymoonIncluded, setHoneymoonIncluded] = useState(false);
  const [engagementRingIncluded, setEngagementRingIncluded] = useState(false);
  const [contingencyMode, setContingencyMode] = useState<'inside' | 'outside' | 'disabled'>('inside');
  const [contingencyPercentage, setContingencyPercentage] = useState(10);

  const [guestCount, setGuestCount] = useState(100);
  const [weddingDay, setWeddingDay] = useState('Saturday');
  const [weddingMonth, setWeddingMonth] = useState('June');
  const [weddingRegion, setWeddingRegion] = useState('South East');
  const [ceremonyType, setCeremonyType] = useState('Civil');
  const [receptionType, setReceptionType] = useState('Hotel or country house');
  const [venueBooked, setVenueBooked] = useState(false);
  const [cateringIncludedInVenue, setCateringIncludedInVenue] = useState(true);
  const [planningLevel, setPlanningLevel] = useState('standard');

  const [categories, setCategories] = useState<CategoryAllocation[]>([]);

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('wedding_budgets')
          .select('*')
          .eq('wedding_id', weddingId)
          .maybeSingle();

        if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

        if (data) {
          setPlannedTotal(data.planned_total || 20000);
          setMaximumTotal(data.maximum_total ? String(data.maximum_total) : '');
          setSavedAmount(data.saved_amount ? String(data.saved_amount) : '');
          setExternalContributions(data.external_contributions ? String(data.external_contributions) : '');
          setContingencyMode(data.contingency_mode || 'inside');
          setContingencyPercentage(data.contingency_percentage || 10);
          setHoneymoonIncluded(data.honeymoon_included);
          setEngagementRingIncluded(data.engagement_ring_included);
          if (data.setup_profile) {
            const sp = data.setup_profile as BudgetSetupProfile;
            setGuestCount(sp.guest_count || 100);
            setWeddingDay(sp.wedding_day || 'Saturday');
            setWeddingMonth(sp.wedding_month || 'June');
            setWeddingRegion(sp.wedding_region || 'South East');
            setCeremonyType(sp.ceremony_type || 'Civil');
            setReceptionType(sp.reception_type || 'Hotel or country house');
            setVenueBooked(sp.venue_booked || false);
            setCateringIncludedInVenue(sp.catering_included_in_venue || true);
            setPlanningLevel(sp.planning_level || 'standard');
          }

          const { data: existingCats } = await supabase
            .from('budget_categories')
            .select('*')
            .eq('wedding_id', weddingId)
            .eq('status', 'active')
            .order('sort_order');

          if (existingCats && existingCats.length > 0) {
            setCategories(existingCats.map((c) => ({
              key: c.category_key,
              name: c.name,
              percentage: c.suggested_percentage,
              amount: c.planned_amount,
            })));
          } else {
            buildDefaultCategories(plannedTotal, contingencyMode, contingencyPercentage);
          }
        } else {
          buildDefaultCategories(20000, 'inside', 10);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load budget');
      } finally {
        setLoading(false);
      }
    };
    fetchExisting();
  }, []);

  const buildDefaultCategories = (total: number, mode: string, cp: number) => {
    const contPct = mode === 'disabled' ? 0 : cp;
    const availablePct = 100 - contPct;
    setCategories(DEFAULT_CATEGORIES.map((dc) => ({
      key: dc.key,
      name: dc.name,
      percentage: dc.key === 'contingency' ? contPct : Math.round(dc.percentage * availablePct / 100 * 10) / 10,
      amount: dc.key === 'contingency'
        ? ((mode === 'outside' ? 0 : total) * contPct / 100)
        : Math.round(total * (dc.percentage * availablePct / 100 / 100) * 100) / 100,
    })));
  };

  const recalculateCategories = (total: number, mode: string, cp: number) => {
    const contPct = mode === 'disabled' ? 0 : cp;
    const availablePct = 100 - contPct;
    setCategories((prev) => prev.map((c) => ({
      ...c,
      percentage: c.key === 'contingency' ? contPct : Math.round(c.percentage * availablePct / Math.max(1, 100 - (prev.find((p) => p.key === 'contingency')?.percentage || cp)) * 10) / 10,
      amount: c.key === 'contingency'
        ? ((mode === 'outside' ? 0 : total) * contPct / 100)
        : Math.round(total * (c.percentage / 100) * 100) / 100,
    })));
  };

  const handleStep2Next = () => {
    const cp = contingencyMode === 'disabled' ? 0 : contingencyPercentage;
    const baseTotal = contingencyMode === 'outside' ? plannedTotal : plannedTotal * (1 - cp / 100);
    setCategories(DEFAULT_CATEGORIES.map((dc) => {
      if (dc.key === 'contingency') {
        return { key: dc.key, name: dc.name, percentage: cp, amount: Math.round((contingencyMode === 'outside' ? 0 : plannedTotal) * cp / 100) };
      }
      return { key: dc.key, name: dc.name, percentage: dc.percentage, amount: Math.round(baseTotal * (dc.percentage / 100)) };
    }));
    setStep(3);
  };

  const handleCategoryChange = (index: number, field: 'percentage' | 'amount', value: number) => {
    const newCats = [...categories];
    newCats[index] = { ...newCats[index], [field]: value };
    if (field === 'percentage') {
      newCats[index].amount = Math.round(plannedTotal * (value / 100));
    }
    setCategories(newCats);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const profile: BudgetSetupProfile = {
        guest_count: guestCount,
        wedding_day: weddingDay,
        wedding_month: weddingMonth,
        wedding_region: weddingRegion,
        ceremony_type: ceremonyType,
        reception_type: receptionType,
        venue_booked: venueBooked,
        catering_included_in_venue: cateringIncludedInVenue,
        planning_level: planningLevel,
      };

      const { error: upsertErr } = await supabase
        .from('wedding_budgets')
        .upsert({
          wedding_id: weddingId,
          currency_code: 'GBP',
          planned_total: plannedTotal,
          maximum_total: maximumTotal ? parseFloat(maximumTotal) : null,
          saved_amount: savedAmount ? parseFloat(savedAmount) : 0,
          external_contributions: externalContributions ? parseFloat(externalContributions) : 0,
          contingency_mode: contingencyMode,
          contingency_percentage: contingencyPercentage,
          honeymoon_included: honeymoonIncluded,
          engagement_ring_included: engagementRingIncluded,
          setup_profile: profile,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'wedding_id' });

      if (upsertErr) throw upsertErr;

      const existingCats = await supabase
        .from('budget_categories')
        .select('id, category_key')
        .eq('wedding_id', weddingId)
        .eq('status', 'active');

      if (existingCats.data) {
        const toArchive = existingCats.data.filter((ec) => !categories.find((c) => c.key === ec.category_key));
        if (toArchive.length > 0) {
          await supabase.from('budget_categories').update({ status: 'archived' }).in('id', toArchive.map((t) => t.id));
        }
      }

      const catUpserts = categories.map((c, idx) => ({
        wedding_id: weddingId,
        name: c.name,
        category_key: c.key,
        suggested_percentage: c.percentage,
        planned_amount: c.amount,
        is_default: DEFAULT_CATEGORIES.some((d) => d.key === c.key),
        sort_order: idx,
        status: 'active' as const,
        updated_at: new Date().toISOString(),
      }));

      for (const cat of catUpserts) {
        await supabase
          .from('budget_categories')
          .upsert({
            ...cat,
            id: undefined,
            wedding_id: weddingId,
            category_key: cat.category_key,
          }, { onConflict: 'wedding_id,category_key' });
      }

      await supabase.from('budget_activity_log').insert({
        wedding_id: weddingId,
        action: 'budget_setup_completed',
        summary: `Budget set to £${plannedTotal.toLocaleString()} with ${categories.length} categories`,
      });

      navigate('/app/budget');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-foreground-500">
            <i className="ri-loader-4-line animate-spin text-xl" />
            <span className="text-sm">Loading budget setup...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  const contAmount = contingencyMode === 'disabled' ? 0 : Math.round(plannedTotal * (contingencyPercentage / 100));
  const effectiveTotal = contingencyMode === 'outside' ? plannedTotal : plannedTotal - contAmount;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-foreground-500 mb-2">
            <button onClick={() => navigate('/app/budget')} className="hover:text-foreground-800 cursor-pointer whitespace-nowrap">
              Budget
            </button>
            <i className="ri-arrow-right-s-line text-xs" />
            <span className="text-foreground-700">Setup</span>
          </div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Budget setup</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-label font-semibold transition-colors ${
                step === s ? 'bg-primary-500 text-white' : step > s ? 'bg-accent-500 text-white' : 'bg-secondary-100 text-foreground-400'
              }`}>
                {step > s ? <i className="ri-check-line" /> : s}
              </div>
              <span className={`text-xs font-label ${step >= s ? 'text-foreground-900' : 'text-foreground-400'} hidden sm:inline`}>
                {s === 1 ? 'Total budget' : s === 2 ? 'Profile' : 'Allocation'}
              </span>
              {s < 3 && <div className={`w-8 sm:w-16 h-px ${step > s ? 'bg-accent-400' : 'bg-secondary-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <i className="ri-error-warning-line" /> {error}
          </div>
        )}

        {/* Step 1: Total Budget */}
        {step === 1 && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-1">How much are you planning to spend on your wedding?</h2>
            <p className="text-xs text-foreground-500 mb-6">Enter your overall budget and any funds already available.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Total planned budget (£)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">£</span>
                  <input
                    type="number"
                    value={plannedTotal}
                    onChange={(e) => setPlannedTotal(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
                    placeholder="20000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Optional target maximum (£)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">£</span>
                  <input
                    type="number"
                    value={maximumTotal}
                    onChange={(e) => setMaximumTotal(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
                    placeholder="Leave blank for no limit"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1.5">Amount already saved (£)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">£</span>
                    <input type="number" value={savedAmount} onChange={(e) => setSavedAmount(e.target.value)} className="w-full pl-8 pr-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1.5">Family contributions (£)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">£</span>
                    <input type="number" value={externalContributions} onChange={(e) => setExternalContributions(e.target.value)} className="w-full pl-8 pr-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" placeholder="0" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-3">Contingency</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(['inside', 'outside', 'disabled'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setContingencyMode(m)}
                      className={`px-4 py-2 rounded-lg text-xs font-label border transition-colors cursor-pointer whitespace-nowrap ${
                        contingencyMode === m
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'border-secondary-200 text-foreground-600 hover:bg-background-100'
                      }`}
                    >
                      {m === 'inside' ? 'Inside total' : m === 'outside' ? 'On top of total' : 'Disabled'}
                    </button>
                  ))}
                </div>
                {contingencyMode !== 'disabled' && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={contingencyPercentage}
                      onChange={(e) => setContingencyPercentage(Number(e.target.value))}
                      className="w-20 px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
                      min="1"
                      max="50"
                    />
                    <span className="text-sm text-foreground-500">% = £{contAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-secondary-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={honeymoonIncluded} onChange={(e) => setHoneymoonIncluded(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-foreground-700">Include honeymoon in wedding budget</span>
                </label>
                {honeymoonIncluded && (
                  <div className="relative ml-7">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">£</span>
                    <input type="number" value={honeymoonBudget} onChange={(e) => setHoneymoonBudget(e.target.value)} className="w-48 pl-8 pr-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" placeholder="Honeymoon budget" />
                  </div>
                )}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={engagementRingIncluded} onChange={(e) => setEngagementRingIncluded(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-foreground-700">Include engagement ring in wedding budget</span>
                </label>
                {engagementRingIncluded && (
                  <div className="relative ml-7">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-sm">£</span>
                    <input type="number" value={engagementRingCost} onChange={(e) => setEngagementRingCost(e.target.value)} className="w-48 pl-8 pr-4 py-2.5 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" placeholder="Ring cost" />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={() => setStep(2)} className="px-6 py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                  Continue <i className="ri-arrow-right-line ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Wedding Profile */}
        {step === 2 && (
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-1">Tell us about your wedding</h2>
            <p className="text-xs text-foreground-500 mb-6">This helps us create a more tailored budget allocation.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Estimated guest count</label>
                <input type="number" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="w-full sm:w-48 px-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors" min="1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1.5">Day of the week</label>
                  <select value={weddingDay} onChange={(e) => setWeddingDay(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer">
                    {WEDDING_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1.5">Month</label>
                  <select value={weddingMonth} onChange={(e) => setWeddingMonth(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer">
                    {WEDDING_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Region</label>
                <select value={weddingRegion} onChange={(e) => setWeddingRegion(e.target.value)} className="w-full sm:w-64 px-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer">
                  {WEDDING_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1.5">Ceremony type</label>
                  <select value={ceremonyType} onChange={(e) => setCeremonyType(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer">
                    {CEREMONY_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-label text-foreground-600 mb-1.5">Reception type</label>
                  <select value={receptionType} onChange={(e) => setReceptionType(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-secondary-200 bg-white text-sm font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors cursor-pointer">
                    {RECEPTION_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-secondary-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={venueBooked} onChange={(e) => setVenueBooked(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-foreground-700">Venue booked</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={cateringIncludedInVenue} onChange={(e) => setCateringIncludedInVenue(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm text-foreground-700">Catering included in venue</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-label text-foreground-600 mb-1.5">Planning level</label>
                <div className="flex flex-wrap gap-2">
                  {PLANNING_LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setPlanningLevel(l)}
                      className={`px-4 py-2 rounded-lg text-xs font-label border transition-colors cursor-pointer capitalize whitespace-nowrap ${
                        planningLevel === l
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'border-secondary-200 text-foreground-600 hover:bg-background-100'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 text-sm font-label text-foreground-600 hover:text-foreground-900 cursor-pointer whitespace-nowrap">
                  <i className="ri-arrow-left-line mr-1" /> Back
                </button>
                <button onClick={handleStep2Next} className="px-6 py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                  Continue to allocation <i className="ri-arrow-right-line ml-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Allocation */}
        {step === 3 && (
          <>
            <div className="card-default mb-6">
              <h2 className="font-label text-sm font-semibold text-foreground-900 mb-1">Suggested allocation</h2>
              <p className="text-xs text-foreground-500 mb-4">
                Based on a total of <strong className="text-foreground-900">£{plannedTotal.toLocaleString()}</strong>.
                {contingencyMode !== 'disabled' && <> Contingency is <strong className="text-foreground-900">{contingencyPercentage}%</strong> ({contingencyMode === 'outside' ? 'on top of' : 'inside'} the total).</>}
                Edit any category before saving.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100">
                      <th className="text-left py-2 px-2 text-xs font-label text-foreground-500">Category</th>
                      <th className="text-right py-2 px-2 text-xs font-label text-foreground-500 w-24">%</th>
                      <th className="text-right py-2 px-2 text-xs font-label text-foreground-500 w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat, idx) => (
                      <tr key={cat.key} className={`border-b border-secondary-50 ${cat.key === 'contingency' ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-2.5 px-2">
                          <span className="text-xs font-label text-foreground-800">{cat.name}</span>
                          {cat.key === 'contingency' && <span className="ml-2 text-xs text-amber-600 font-label">(recommended {contingencyPercentage}%)</span>}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <input
                            type="number"
                            value={cat.percentage}
                            onChange={(e) => handleCategoryChange(idx, 'percentage', Number(e.target.value))}
                            className="w-16 text-right px-2 py-1.5 rounded border border-secondary-200 bg-white text-xs font-label text-foreground-900 focus:outline-none focus:border-primary-400 transition-colors"
                            min="0"
                            max="100"
                            step="0.5"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span className="text-xs font-label text-foreground-700">£{cat.amount.toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Benchmarks panel */}
            <div className="card-default mb-6 border-amber-200 bg-amber-50/30">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-information-line text-amber-600 text-sm" />
                <h3 className="font-label text-sm font-semibold text-foreground-900">UK wedding planning benchmarks</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-foreground-600">
                <div>
                  <p>Typical UK wedding: <strong>£{BENCHMARKS.typical_low.toLocaleString()} – £{BENCHMARKS.typical_high.toLocaleString()}</strong></p>
                  <p>Example average: £{BENCHMARKS.example_average.toLocaleString()}</p>
                  <p>Venue alone: ~£{BENCHMARKS.venue_alone.toLocaleString()}</p>
                  <p>Venue with catering: ~£{BENCHMARKS.venue_with_catering.toLocaleString()}</p>
                  <p>Per-head: £{BENCHMARKS.per_head_low} – £{BENCHMARKS.per_head_high}</p>
                </div>
                <div>
                  <p>50 guests or fewer: ~£{BENCHMARKS.fifty_or_fewer.toLocaleString()}</p>
                  <p>150+ guests: ~£{BENCHMARKS.one_fifty_plus.toLocaleString()}</p>
                  <p>Saturday: ~£{BENCHMARKS.saturday.toLocaleString()}</p>
                  <p>Tuesday: ~£{BENCHMARKS.tuesday.toLocaleString()}</p>
                  <p>London: ~£{BENCHMARKS.london.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-foreground-400 mt-3 italic">
                These figures are planning benchmarks, not quotes. Real costs vary by supplier, location, date, guest count and wedding style.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 text-sm font-label text-foreground-600 hover:text-foreground-900 cursor-pointer whitespace-nowrap">
                <i className="ri-arrow-left-line mr-1" /> Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-primary-500 text-white rounded-lg text-sm font-label font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {saving ? (
                  <span className="flex items-center gap-2"><i className="ri-loader-4-line animate-spin" /> Saving...</span>
                ) : (
                  <span>Save budget <i className="ri-check-line ml-1" /></span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

// ── Page export ──
export default function BudgetSetupPage() {
  if (isDemoMode) return <DemoBudgetSetupPage />;
  return <NormalBudgetSetupPage />;
}