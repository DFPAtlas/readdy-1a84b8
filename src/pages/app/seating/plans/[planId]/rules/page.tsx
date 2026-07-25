import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { supabase } from '@/lib/supabase';
import type { SeatingPlan, SeatingRule, SeatingGroup, GuestInfo, TableWithData, RuleType, RuleStrength } from '@/types/seating';
import { RULE_TYPE_LABELS, RULE_STRENGTH_LABELS, RULE_STRENGTH_COLOURS, GROUP_TYPE_LABELS } from '@/types/seating';

const RULE_CATEGORIES: { label: string; types: RuleType[] }[] = [
  { label: 'Together', types: ['keep_together', 'prefer_together', 'same_table', 'adjacent_seats', 'couple_together', 'household_together'] },
  { label: 'Apart', types: ['keep_apart', 'prefer_apart'] },
  { label: 'Placement', types: ['preferred_table', 'avoid_table', 'preferred_zone', 'avoid_zone', 'same_zone'] },
  { label: 'Proximity', types: ['near_head_table', 'away_from_speakers', 'near_exit', 'near_accessible_route', 'near_toilets', 'quiet_area'] },
  { label: 'Accessibility', types: ['wheelchair_required', 'high_chair_required', 'child_with_guardian'] },
  { label: 'Special', types: ['wedding_party_placement', 'supplier_table', 'custom'] },
];

const DEFAULT_RULE_SUGGESTIONS: { name: string; type: RuleType; description: string }[] = [
  { name: 'Keep couples together', type: 'couple_together', description: 'Automatically keep named couples at the same table' },
  { name: 'Keep children with guardians', type: 'child_with_guardian', description: 'Seat children at the same table as their guardians' },
  { name: 'Keep households together', type: 'household_together', description: 'Keep household members at the same table where capacity allows' },
  { name: 'Place wheelchair users in wheelchair spaces', type: 'wheelchair_required', description: 'Assign guests with accessibility needs to wheelchair spaces' },
  { name: 'Place high chair guests in high chair seats', type: 'high_chair_required', description: 'Assign guests needing high chairs to high chair seats' },
  { name: 'Keep suppliers at supplier tables', type: 'supplier_table', description: 'Place suppliers at supplier-designated tables' },
  { name: 'Couple at head or sweetheart table', type: 'preferred_table', description: 'Place the couple at the head or sweetheart table' },
];

export default function SeatingRulesPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { weddingId, loading: weddingLoading } = useActiveWedding();

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [rules, setRules] = useState<SeatingRule[]>([]);
  const [groups, setGroups] = useState<SeatingGroup[]>([]);
  const [tables, setTables] = useState<TableWithData[]>([]);
  const [allGuests, setAllGuests] = useState<GuestInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  // Create form
  const [formName, setFormName] = useState('');
  const [formRuleType, setFormRuleType] = useState<RuleType>('keep_together');
  const [formStrength, setFormStrength] = useState<RuleStrength>('medium');
  const [formHard, setFormHard] = useState(false);
  const [formReason, setFormReason] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflictingRules, setConflictingRules] = useState<{ rule1: SeatingRule; rule2: SeatingRule; reason: string }[]>([]);

  const fetchData = useCallback(async () => {
    if (!weddingId || !planId) return;
    setLoading(true);
    try {
      const { data: planData } = await supabase.from('seating_plans').select('*').eq('id', planId).eq('wedding_id', weddingId).maybeSingle();
      if (!planData) { navigate('/app/seating'); return; }
      setPlan(planData as SeatingPlan);

      const [{ data: rulesData }, { data: groupsData }, { data: tablesData }, { data: guestsData }] = await Promise.all([
        supabase.from('seating_rules').select('*').eq('wedding_id', weddingId).or(`seating_plan_id.eq.${planId}, seating_plan_id.is.null`).eq('status', 'active'),
        supabase.from('seating_groups').select('*').eq('wedding_id', weddingId).eq('status', 'active'),
        supabase.from('seating_tables').select('*').eq('plan_id', planId),
        supabase.from('guests').select('id, full_name, guest_type, rsvp_status, household_id, relationship_label, wedding_party_role, accessibility_needs').eq('wedding_id', weddingId).eq('status', 'active'),
      ]);

      setRules((rulesData || []) as SeatingRule[]);
      setGroups((groupsData || []) as SeatingGroup[]);
      setTables((tablesData || []) as TableWithData[]);
      setAllGuests((guestsData || []) as GuestInfo[]);
    } catch { /* */ } finally { setLoading(false); }
  }, [weddingId, planId, navigate]);

  useEffect(() => { if (weddingId && planId) fetchData(); }, [weddingId, planId, fetchData]);

  const handleCreate = async () => {
    if (!formName.trim()) { setFormError('Rule name is required'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('seating_rules').insert({
      wedding_id: weddingId, seating_plan_id: planId, name: formName,
      rule_type: formRuleType, source_type: 'group', source_id: '00000000-0000-0000-0000-000000000000',
      target_type: 'guest', strength: formStrength, is_hard_constraint: formHard,
      reason: formReason || null, status: 'active',
    }).select('*').single();
    if (error) { setFormError(error.message); setSaving(false); return; }
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'rule_created', summary: `Created rule "${formName}"` });
    setShowCreate(false); resetForm(); setSaving(false);
    setToast({ msg: 'Rule created', type: 'success' }); fetchData();
  };

  const handleCreateSuggestion = async (name: string, type: RuleType) => {
    const { error } = await supabase.from('seating_rules').insert({
      wedding_id: weddingId, seating_plan_id: planId, name,
      rule_type: type, source_type: 'group', source_id: '00000000-0000-0000-0000-000000000000',
      target_type: 'guest', strength: 'high', is_hard_constraint: false,
      reason: 'Auto-generated from existing data', status: 'active',
    });
    if (error) { setToast({ msg: error.message, type: 'error' }); return; }
    await supabase.from('seating_activity_log').insert({ wedding_id: weddingId, seating_plan_id: planId, action: 'rule_created', summary: `Created suggested rule "${name}"` });
    setToast({ msg: 'Suggested rule created', type: 'success' }); fetchData();
  };

  const handleDisable = async (ruleId: string) => {
    await supabase.from('seating_rules').update({ status: 'disabled', updated_at: new Date().toISOString() }).eq('id', ruleId);
    setToast({ msg: 'Rule disabled', type: 'success' }); fetchData();
  };

  const handleArchive = async (ruleId: string) => {
    await supabase.from('seating_rules').update({ status: 'archived', archived_at: new Date().toISOString() }).eq('id', ruleId);
    setToast({ msg: 'Rule archived', type: 'success' }); fetchData();
  };

  const resetForm = () => {
    setFormName(''); setFormRuleType('keep_together'); setFormStrength('medium');
    setFormHard(false); setFormReason(''); setFormError('');
  };

  // Detect conflicting rules
  const checkConflicts = useCallback(() => {
    const conflicts: { rule1: SeatingRule; rule2: SeatingRule; reason: string }[] = [];
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const a = rules[i]; const b = rules[j];
        if (a.rule_type === 'keep_together' && b.rule_type === 'keep_apart' && a.source_id === b.source_id && a.target_id === b.target_id) {
          conflicts.push({ rule1: a, rule2: b, reason: 'Keep together and keep apart cannot both apply to the same guests' });
        }
        if (a.rule_type === 'preferred_table' && b.rule_type === 'avoid_table' && a.target_id === b.target_id && a.source_id === b.source_id) {
          conflicts.push({ rule1: a, rule2: b, reason: 'Same table is both preferred and avoided' });
        }
        if (a.rule_type === 'preferred_zone' && b.rule_type === 'avoid_zone' && a.target_id === b.target_id && a.source_id === b.source_id) {
          conflicts.push({ rule1: a, rule2: b, reason: 'Same zone is both preferred and avoided' });
        }
      }
    }
    setConflictingRules(conflicts);
  }, [rules]);

  useEffect(() => { checkConflicts(); }, [checkConflicts]);

  if (weddingLoading || loading) return <AppShell><div className="h-[calc(100vh-80px)] flex items-center justify-center"><i className="ri-loader-4-line animate-spin" /></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate(`/app/seating/plans/${planId}`)} className="text-xs text-foreground-400 hover:text-foreground-600 mb-1 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Back to workspace</button>
            <h1 className="font-heading text-xl text-foreground-900">Seating Rules</h1>
            <p className="text-xs text-foreground-500 mt-0.5">{plan?.name} — Define how guests should be seated</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSuggestions(true)} className="px-3 py-2 border border-secondary-200 text-foreground-600 rounded-lg text-xs font-label hover:bg-background-50 cursor-pointer whitespace-nowrap"><i className="ri-lightbulb-line mr-1" />Suggestions</button>
            <button onClick={() => { resetForm(); setShowCreate(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label font-semibold hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1" />Create rule</button>
          </div>
        </div>

        {/* Conflict warnings */}
        {conflictingRules.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 space-y-2">
            <div className="flex items-center gap-2"><i className="ri-error-warning-line text-red-600 text-sm" /><span className="text-xs font-label font-semibold text-red-700">Conflicting rules detected ({conflictingRules.length})</span></div>
            {conflictingRules.map((c, i) => (
              <div key={i} className="text-[11px] text-red-700 flex items-start gap-1.5">
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{c.reason}: <strong>{c.rule1.name}</strong> and <strong>{c.rule2.name}</strong></span>
              </div>
            ))}
          </div>
        )}

        {rules.length === 0 ? (
          <div className="text-center py-16 bg-background-50 rounded-xl border border-secondary-100">
            <i className="ri-file-list-3-line text-3xl text-foreground-200 mb-3 block" />
            <p className="text-sm text-foreground-500 mb-1">No rules defined</p>
            <p className="text-xs text-foreground-400 mb-4">Create rules to control how guests are seated</p>
            <button onClick={() => setShowSuggestions(true)} className="px-4 py-2 bg-primary-500 text-white rounded-lg text-xs font-label cursor-pointer whitespace-nowrap">Generate suggestions</button>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <i className={`${getRuleIcon(rule.rule_type)} text-sm text-foreground-400 flex-shrink-0`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className="text-xs font-label font-semibold text-foreground-800 truncate">{rule.name}</span><span className="text-[10px] text-foreground-400 bg-background-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">{RULE_TYPE_LABELS[rule.rule_type]}</span></div>
                    {rule.reason && <p className="text-[10px] text-foreground-400 truncate">{rule.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[9px] font-label px-1.5 py-0.5 rounded-full whitespace-nowrap ${RULE_STRENGTH_COLOURS[rule.strength]}`}>{RULE_STRENGTH_LABELS[rule.strength]}</span>
                  {rule.is_hard_constraint && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">Hard</span>}
                  <button onClick={() => handleDisable(rule.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-300 hover:text-amber-600 cursor-pointer" title="Disable"><i className="ri-toggle-line text-xs" /></button>
                  <button onClick={() => handleArchive(rule.id)} className="w-6 h-6 flex items-center justify-center rounded text-foreground-300 hover:text-red-600 cursor-pointer" title="Archive"><i className="ri-archive-line text-xs" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions modal */}
        {showSuggestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowSuggestions(false)}>
            <div className="bg-white rounded-xl p-5 w-full max-w-md mx-4 shadow-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-base text-foreground-900 mb-1">Suggested Rules</h2>
              <p className="text-[11px] text-foreground-500 mb-4">Based on your guest data, we suggest these rules. Review and confirm the ones you want to create.</p>
              <div className="space-y-2">
                {DEFAULT_RULE_SUGGESTIONS.filter((s) => !rules.some((r) => r.name === s.name)).map((sug) => (
                  <div key={sug.name} className="flex items-start gap-3 p-3 rounded-lg border border-secondary-100 hover:bg-background-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-label font-semibold text-foreground-800">{sug.name}</p>
                      <p className="text-[10px] text-foreground-500">{sug.description}</p>
                      <span className="text-[9px] text-foreground-400 bg-background-100 px-1 py-0.5 rounded-full">{RULE_TYPE_LABELS[sug.type]}</span>
                    </div>
                    <button onClick={() => handleCreateSuggestion(sug.name, sug.type)} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-[10px] font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap">Create</button>
                  </div>
                ))}
                {DEFAULT_RULE_SUGGESTIONS.filter((s) => !rules.some((r) => r.name === s.name)).length === 0 && (
                  <p className="text-xs text-foreground-400 text-center py-4">All suggested rules have been created</p>
                )}
              </div>
              <button onClick={() => setShowSuggestions(false)} className="w-full mt-4 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 cursor-pointer whitespace-nowrap">Close</button>
            </div>
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="font-heading text-lg text-foreground-900 mb-4">Create Rule</h2>
              {formError && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg mb-3">{formError}</p>}
              <div className="space-y-3">
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Rule name *</label><input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" placeholder="e.g. Keep university friends together" /></div>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Rule type</label>
                  <select value={formRuleType} onChange={(e) => setFormRuleType(e.target.value as RuleType)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400">
                    {RULE_CATEGORIES.map((cat) => (
                      <optgroup key={cat.label} label={cat.label}>
                        {cat.types.map((t) => <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Strength</label><select value={formStrength} onChange={(e) => setFormStrength(e.target.value as RuleStrength)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400">{Object.entries(RULE_STRENGTH_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formHard} onChange={(e) => setFormHard(e.target.checked)} className="accent-primary-500" /><span className="text-xs text-foreground-700">Hard constraint (must not be violated)</span></label>
                <div><label className="text-[11px] font-label text-foreground-600 block mb-1">Reason (optional)</label><input type="text" value={formReason} onChange={(e) => setFormReason(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-secondary-200 text-xs focus:outline-none focus:border-primary-400" placeholder="Why this rule matters" /></div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="flex-1 px-4 py-2 rounded-lg border border-secondary-200 text-xs font-label text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
                <button onClick={handleCreate} disabled={saving} className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-xs font-label font-semibold hover:bg-primary-600 cursor-pointer whitespace-nowrap disabled:opacity-50">{saving ? 'Creating...' : 'Create rule'}</button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-xs font-label ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
            <i className={`${toast.type === 'success' ? 'ri-check-line' : 'ri-error-warning-line'} text-sm`} />{toast.msg}
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function getRuleIcon(ruleType: RuleType): string {
  switch (ruleType) {
    case 'keep_together': case 'prefer_together': return 'ri-link';
    case 'keep_apart': case 'prefer_apart': return 'ri-separator';
    case 'same_table': return 'ri-layout-grid-line';
    case 'adjacent_seats': return 'ri-contrast-2-line';
    case 'preferred_table': return 'ri-star-line';
    case 'avoid_table': return 'ri-forbid-line';
    case 'preferred_zone': case 'avoid_zone': case 'same_zone': return 'ri-map-pin-line';
    case 'near_head_table': return 'ri-vip-crown-line';
    case 'near_exit': return 'ri-door-open-line';
    case 'near_accessible_route': return 'ri-wheelchair-line';
    case 'near_toilets': return 'ri-door-lock-line';
    case 'wheelchair_required': return 'ri-wheelchair-line';
    case 'high_chair_required': return 'ri-user-3-line';
    case 'child_with_guardian': return 'ri-parent-line';
    case 'couple_together': return 'ri-heart-line';
    case 'household_together': return 'ri-home-line';
    case 'wedding_party_placement': return 'ri-team-line';
    case 'supplier_table': return 'ri-restaurant-line';
    default: return 'ri-file-list-3-line';
  }
}