import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import type { GuestHousehold, Guest } from '@/types/guest';
import { DELIVERY_METHOD_OPTIONS } from '@/types/guest';

function HouseholdInvitationCard({ householdId }: { householdId: string }) {
  const navigate = useNavigate();
  const [inv, setInv] = useState<{ id: string; internal_name: string; status: string; delivery_method: string; template?: { id: string; name: string } | null } | null>(null);
  const [loadingInv, setLoadingInv] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('invitations').select('id, internal_name, status, delivery_method, template:invitation_templates(id, name)').eq('household_id', householdId).in('status', ['draft', 'ready', 'sent']).maybeSingle();
      setInv(data || null);
      setLoadingInv(false);
    })();
  }, [householdId]);

  if (loadingInv) return <div className="card-default"><div className="flex items-center gap-2 text-sm text-foreground-400"><i className="ri-loader-4-line animate-spin" />Loading...</div></div>;

  if (!inv) {
    return (
      <div className="card-default">
        <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2 flex items-center gap-2"><i className="ri-mail-send-line text-foreground-500" />Invitation</h3>
        <p className="text-xs text-foreground-500 mb-3">No invitation created for this household yet.</p>
        <button onClick={() => navigate('/app/invitations/new')} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">Create invitation</button>
      </div>
    );
  }

  return (
    <div className="card-default">
      <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3 flex items-center gap-2"><i className="ri-mail-send-line text-foreground-500" />Invitation</h3>
      <dl className="space-y-2 text-sm">
        <div><dt className="text-xs text-foreground-500">Name</dt><dd className="text-foreground-900">{inv.internal_name}</dd></div>
        <div><dt className="text-xs text-foreground-500">Status</dt><dd className="text-foreground-700 capitalize">{inv.status}</dd></div>
        <div><dt className="text-xs text-foreground-500">Delivery</dt><dd className="text-foreground-700 capitalize">{inv.delivery_method}</dd></div>
        <div><dt className="text-xs text-foreground-500">Template</dt><dd className="text-foreground-700">{inv.template?.name || 'None'}</dd></div>
      </dl>
      <button onClick={() => navigate(`/app/invitations/${inv.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer mt-3">View invitation</button>
    </div>
  );
}

export default function HouseholdDetailPage() {
  const { householdId } = useParams();
  const navigate = useNavigate();
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<GuestHousehold | null>(null);
  const [members, setMembers] = useState<Guest[]>([]);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const [hRes, mRes] = await Promise.all([
        supabase.from('guest_households').select('*').eq('id', householdId).eq('wedding_id', weddingId).maybeSingle(),
        supabase.from('guests').select('*').eq('household_id', householdId).eq('wedding_id', weddingId).order('full_name'),
      ]);
      setHousehold(hRes.data as GuestHousehold);
      setMembers((mRes.data || []) as Guest[]);
      setLoading(false);
    })();
  }, [householdId]);

  const displayName = (g: Guest) => g.preferred_name || g.full_name || 'Unnamed';

  if (loading) return <AppShell><div className="max-w-4xl mx-auto flex items-center justify-center py-20"><div className="flex items-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading...</span></div></div></AppShell>;
  if (!household) return <AppShell><div className="max-w-4xl mx-auto text-center py-20"><p className="text-sm text-red-600 mb-4">Household not found</p><button onClick={() => navigate('/app/guests/households')} className="btn-outline text-sm cursor-pointer">Back</button></div></AppShell>;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl text-foreground-900">{household.display_name}</h1>
            <p className="text-sm text-foreground-500 mt-1">{household.formal_invitation_name || household.informal_greeting}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/app/guests/households')} className="btn-ghost text-sm cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1.5" />Back</button>
            <button onClick={() => navigate(`/app/guests/households/${householdId}/edit`)} className="btn-outline text-sm cursor-pointer whitespace-nowrap"><i className="ri-pencil-line mr-1.5" />Edit</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Members ({members.length})</h3>
              {members.length === 0 ? (
                <p className="text-sm text-foreground-400">No members in this household yet.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-background-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-label text-foreground-900">{displayName(m)} {m.last_name}</span>
                        {m.relationship_label && <span className="text-xs text-foreground-500">({m.relationship_label})</span>}
                        {m.guest_type === 'child' && <span className="px-1.5 py-0.5 rounded text-xs bg-accent-100 text-accent-700">Child</span>}
                      </div>
                      <button onClick={() => navigate(`/app/guests/${m.id}`)} className="text-xs text-primary-600 hover:text-primary-700 cursor-pointer">View</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Address</h3>
              <p className="text-sm text-foreground-700">
                {[household.address_line_1, household.address_line_2, household.city, household.county_or_region, household.postcode, household.country].filter(Boolean).join(', ') || 'No address recorded'}
              </p>
            </div>

            {household.notes && (
              <div className="card-default">
                <h3 className="font-label text-sm font-semibold text-foreground-900 mb-2">Notes</h3>
                <p className="text-sm text-foreground-600">{household.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card-default">
              <h3 className="font-label text-sm font-semibold text-foreground-900 mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-foreground-500">Delivery</dt><dd className="text-foreground-700 capitalize">{household.invitation_delivery_method}</dd></div>
                <div><dt className="text-xs text-foreground-500">Shared email</dt><dd className="text-foreground-700">{household.shared_email || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Shared phone</dt><dd className="text-foreground-700">{household.shared_phone || '—'}</dd></div>
                <div><dt className="text-xs text-foreground-500">Status</dt><dd className="text-foreground-700 capitalize">{household.status}</dd></div>
              </dl>
            </div>

            <HouseholdInvitationCard householdId={householdId || ''} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}