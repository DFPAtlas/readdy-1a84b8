import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { supabase } from '@/lib/supabase';
import { useActiveWedding } from '@/hooks/useActiveWedding';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';

const DEFAULT_ELEMENTS: Record<string, Record<string, string>> = {
  flowers: { florist: '', bouquetStyle: '', flowerTypes: '', colorPalette: '', decorNotes: '' },
  rings: { brideRing: '', groomRing: '', jeweler: '', notes: '' },
  food: { caterer: '', menuStyle: '', starter: '', mainOptions: '', dessert: '', eveningFood: '', cake: '', drinksPackage: '', dietaryAccommodations: '' },
  brideAttire: { designer: '', boutique: '', dressStyle: '', veil: '', shoes: '', accessories: '', hairAndMakeup: '' },
  bridesmaidsAttire: { count: '', designer: '', dressStyle: '', shoes: '', accessories: '', hairAndMakeup: '' },
  groomAttire: { tailor: '', suitStyle: '', shirt: '', tie: '', shoes: '', accessories: '' },
  groomsmenAttire: { count: '', suitStyle: '', tie: '', shoes: '', accessories: '' },
};

function buildElementsFromRows(rows: { section: string; field_name: string; field_value: string }[]) {
  const result: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!result[row.section]) result[row.section] = {};
    result[row.section][row.field_name] = row.field_value || '';
  }
  return result;
}

// ═══════════════════════════════════════════
// Demo Wedding Details
// ═══════════════════════════════════════════

function DemoWeddingDetailsPage() {
  const demo = useDemoDataSafe();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const w = demo?.state.wedding;
  const venues = demo?.state.venues ?? [];

  const [form, setForm] = useState({
    partnerOneName: w?.partner_one_name || '',
    partnerTwoName: w?.partner_two_name || '',
    weddingTitle: w?.title || '',
    weddingDate: w?.wedding_date || '',
    timezone: w?.timezone || 'Europe/London',
    dressCode: w?.dress_code || '',
    welcomeMessage: w?.welcome_message || '',
    contactInformation: w?.contact_information || '',
    parkingNotes: w?.parking_notes || '',
    accessibilityNotes: w?.accessibility_notes || '',
    childrenPolicy: w?.children_policy || '',
    plusOnePolicy: w?.plus_one_policy || '',
  });

  const [elements, setElements] = useState<Record<string, Record<string, string>>>(DEFAULT_ELEMENTS);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleElementChange = (section: string, field: string, value: string) => {
    setElements((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaving(true);
    demo?.updateWedding({
      partner_one_name: form.partnerOneName,
      partner_two_name: form.partnerTwoName,
      title: form.weddingTitle,
      wedding_date: form.weddingDate,
      timezone: form.timezone,
      dress_code: form.dressCode,
      welcome_message: form.welcomeMessage,
      contact_information: form.contactInformation,
      parking_notes: form.parkingNotes,
      accessibility_notes: form.accessibilityNotes,
      children_policy: form.childrenPolicy,
      plus_one_policy: form.plusOnePolicy,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const formatDateInput = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding details</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-label font-semibold">Demo Account</span>
            </div>
            <p className="text-sm text-foreground-500 mt-1">Edit the information shown to your guests</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>

        {/* Help banner */}
        <div className="mb-8 px-4 py-3.5 rounded-xl bg-accent-50 border border-accent-100 flex items-start gap-3">
          <div className="w-6 h-6 flex items-center justify-center text-accent-600 flex-shrink-0 mt-0.5">
            <i className="ri-lightbulb-line text-base" />
          </div>
          <div>
            <p className="text-sm font-label font-medium text-accent-900">How wedding details work</p>
            <p className="text-xs text-accent-700 mt-0.5 leading-relaxed">Everything you fill in here flows through to the guest-facing website and portal — couple names, date, venue, dress code, welcome message and day-of details. Hit &ldquo;Save changes&rdquo; to update. This is demo data; changes are not stored permanently.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Couple details */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Couple details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">First partner&rsquo;s name</label>
                <input type="text" value={form.partnerOneName} onChange={(e) => handleChange('partnerOneName', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Second partner&rsquo;s name</label>
                <input type="text" value={form.partnerTwoName} onChange={(e) => handleChange('partnerTwoName', e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding title</label>
              <input type="text" value={form.weddingTitle} onChange={(e) => handleChange('weddingTitle', e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Date & Timezone */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Date &amp; timezone</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding date</label>
                <input type="date" value={formatDateInput(form.weddingDate)} onChange={(e) => handleChange('weddingDate', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
                <select value={form.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="input-field">
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Venues */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Venues</h2>
            {venues.map((v) => (
              <div key={v.id} className="mb-4 last:mb-0">
                <p className="text-xs font-label font-medium text-primary-600 uppercase mb-2">{v.venue_type}</p>
                <p className="text-sm text-foreground-900 font-medium">{v.name}</p>
                <p className="text-xs text-foreground-500 mt-0.5">
                  {[v.address_line_1, v.city, v.postcode, v.country].filter(Boolean).join(', ')}
                </p>
              </div>
            ))}
            <Link to="/app/travel" className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-label mt-3 cursor-pointer hover:text-primary-700">
              <i className="ri-add-line" /> Add or edit venues
            </Link>
          </div>

          {/* Dress code */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Dress code</h2>
            <input type="text" value={form.dressCode} onChange={(e) => handleChange('dressCode', e.target.value)} className="input-field" placeholder="e.g. Formal — black tie optional" />
          </div>

          {/* Welcome message */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Welcome message</h2>
            <textarea value={form.welcomeMessage} onChange={(e) => handleChange('welcomeMessage', e.target.value)} rows={4} className="input-field resize-none" placeholder="Write a warm welcome message for your guests..." />
          </div>

          {/* Contact */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Contact information</h2>
            <input type="text" value={form.contactInformation} onChange={(e) => handleChange('contactInformation', e.target.value)} className="input-field" placeholder="How should guests reach you?" />
          </div>

          {/* Parking */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Parking notes</h2>
            <textarea value={form.parkingNotes} onChange={(e) => handleChange('parkingNotes', e.target.value)} rows={3} className="input-field resize-none" placeholder="Tell guests about parking options..." />
          </div>

          {/* Accessibility */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Accessibility notes</h2>
            <textarea value={form.accessibilityNotes} onChange={(e) => handleChange('accessibilityNotes', e.target.value)} rows={3} className="input-field resize-none" placeholder="Any accessibility information guests should know..." />
          </div>

          {/* Policies */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Guest policies</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Children policy</label>
                <textarea value={form.childrenPolicy} onChange={(e) => handleChange('childrenPolicy', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Plus-one policy</label>
                <textarea value={form.plusOnePolicy} onChange={(e) => handleChange('plusOnePolicy', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
            </div>
          </div>

          {/* Section divider */}
          <div className="pt-2">
            <h2 className="font-heading text-lg text-foreground-900 mb-1">Wedding day elements</h2>
            <p className="text-xs text-foreground-500 mb-6">Track all the details that make your day unique</p>
          </div>

          {/* Flowers & Decor */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-flower-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Flowers &amp; decor</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Florist</label>
                <input type="text" value={elements.flowers?.florist || ''} onChange={(e) => handleElementChange('flowers', 'florist', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Bouquet style</label>
                <input type="text" value={elements.flowers?.bouquetStyle || ''} onChange={(e) => handleElementChange('flowers', 'bouquetStyle', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Flower types</label>
                <input type="text" value={elements.flowers?.flowerTypes || ''} onChange={(e) => handleElementChange('flowers', 'flowerTypes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Colour palette</label>
                <input type="text" value={elements.flowers?.colorPalette || ''} onChange={(e) => handleElementChange('flowers', 'colorPalette', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Decor notes</label>
                <textarea value={elements.flowers?.decorNotes || ''} onChange={(e) => handleElementChange('flowers', 'decorNotes', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
            </div>
          </div>

          {/* Rings */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-heart-2-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Rings</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Bride&rsquo;s ring</label>
                <input type="text" value={elements.rings?.brideRing || ''} onChange={(e) => handleElementChange('rings', 'brideRing', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Groom&rsquo;s ring</label>
                <input type="text" value={elements.rings?.groomRing || ''} onChange={(e) => handleElementChange('rings', 'groomRing', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Jeweller</label>
                <input type="text" value={elements.rings?.jeweler || ''} onChange={(e) => handleElementChange('rings', 'jeweler', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Notes</label>
                <input type="text" value={elements.rings?.notes || ''} onChange={(e) => handleElementChange('rings', 'notes', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Food & Menu */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-restaurant-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Food &amp; menu</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Caterer</label>
                <input type="text" value={elements.food?.caterer || ''} onChange={(e) => handleElementChange('food', 'caterer', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Menu style</label>
                <input type="text" value={elements.food?.menuStyle || ''} onChange={(e) => handleElementChange('food', 'menuStyle', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Starter</label>
                <input type="text" value={elements.food?.starter || ''} onChange={(e) => handleElementChange('food', 'starter', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Main options</label>
                <textarea value={elements.food?.mainOptions || ''} onChange={(e) => handleElementChange('food', 'mainOptions', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dessert</label>
                <input type="text" value={elements.food?.dessert || ''} onChange={(e) => handleElementChange('food', 'dessert', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Evening food</label>
                <input type="text" value={elements.food?.eveningFood || ''} onChange={(e) => handleElementChange('food', 'eveningFood', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding cake</label>
                <input type="text" value={elements.food?.cake || ''} onChange={(e) => handleElementChange('food', 'cake', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Drinks package</label>
                <input type="text" value={elements.food?.drinksPackage || ''} onChange={(e) => handleElementChange('food', 'drinksPackage', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dietary accommodations</label>
                <input type="text" value={elements.food?.dietaryAccommodations || ''} onChange={(e) => handleElementChange('food', 'dietaryAccommodations', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Bride's Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-t-shirt-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Bride&rsquo;s attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Designer</label>
                <input type="text" value={elements.brideAttire?.designer || ''} onChange={(e) => handleElementChange('brideAttire', 'designer', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Boutique</label>
                <input type="text" value={elements.brideAttire?.boutique || ''} onChange={(e) => handleElementChange('brideAttire', 'boutique', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dress style</label>
                <textarea value={elements.brideAttire?.dressStyle || ''} onChange={(e) => handleElementChange('brideAttire', 'dressStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Veil</label>
                <input type="text" value={elements.brideAttire?.veil || ''} onChange={(e) => handleElementChange('brideAttire', 'veil', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.brideAttire?.shoes || ''} onChange={(e) => handleElementChange('brideAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.brideAttire?.accessories || ''} onChange={(e) => handleElementChange('brideAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Hair &amp; makeup</label>
                <input type="text" value={elements.brideAttire?.hairAndMakeup || ''} onChange={(e) => handleElementChange('brideAttire', 'hairAndMakeup', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Bridesmaids' Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-women-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Bridesmaids&rsquo; attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Number of bridesmaids</label>
                <input type="text" value={elements.bridesmaidsAttire?.count || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'count', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Designer</label>
                <input type="text" value={elements.bridesmaidsAttire?.designer || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'designer', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dress style</label>
                <textarea value={elements.bridesmaidsAttire?.dressStyle || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'dressStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.bridesmaidsAttire?.shoes || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.bridesmaidsAttire?.accessories || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Hair &amp; makeup</label>
                <input type="text" value={elements.bridesmaidsAttire?.hairAndMakeup || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'hairAndMakeup', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Groom's Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-men-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Groom&rsquo;s attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Tailor</label>
                <input type="text" value={elements.groomAttire?.tailor || ''} onChange={(e) => handleElementChange('groomAttire', 'tailor', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shirt</label>
                <input type="text" value={elements.groomAttire?.shirt || ''} onChange={(e) => handleElementChange('groomAttire', 'shirt', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Suit style</label>
                <textarea value={elements.groomAttire?.suitStyle || ''} onChange={(e) => handleElementChange('groomAttire', 'suitStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Tie</label>
                <input type="text" value={elements.groomAttire?.tie || ''} onChange={(e) => handleElementChange('groomAttire', 'tie', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.groomAttire?.shoes || ''} onChange={(e) => handleElementChange('groomAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.groomAttire?.accessories || ''} onChange={(e) => handleElementChange('groomAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Groomsmen Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-team-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Groomsmen attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Number of groomsmen</label>
                <input type="text" value={elements.groomsmenAttire?.count || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'count', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Tie</label>
                <input type="text" value={elements.groomsmenAttire?.tie || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'tie', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Suit style</label>
                <textarea value={elements.groomsmenAttire?.suitStyle || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'suitStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.groomsmenAttire?.shoes || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.groomsmenAttire?.accessories || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ═══════════════════════════════════════════
// Normal (Supabase) Wedding Details
// ═══════════════════════════════════════════

function NormalWeddingDetailsPage() {
  const { weddingId } = useActiveWedding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    partnerOneName: '',
    partnerTwoName: '',
    weddingTitle: '',
    weddingDate: '',
    timezone: 'Europe/London',
    dressCode: '',
    welcomeMessage: '',
    contactInformation: '',
    parkingNotes: '',
    accessibilityNotes: '',
    childrenPolicy: '',
    plusOnePolicy: '',
  });
  const [elements, setElements] = useState<Record<string, Record<string, string>>>(DEFAULT_ELEMENTS);
  const [venues, setVenues] = useState<{ id: string; venue_type: string; name: string; address_line_1: string; city: string; postcode: string; country: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!weddingId) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const [weddingRes, elementsRes, venuesRes] = await Promise.all([
          supabase.from('weddings').select('*').eq('id', weddingId).maybeSingle(),
          supabase.from('wedding_elements').select('section, field_name, field_value').eq('wedding_id', weddingId),
          supabase.from('wedding_venues').select('*').eq('wedding_id', weddingId),
        ]);

        if (cancelled) return;

        if (weddingRes.error) throw weddingRes.error;
        if (elementsRes.error) throw elementsRes.error;
        if (venuesRes.error) throw venuesRes.error;

        const w = weddingRes.data;
        if (w) {
          setForm({
            partnerOneName: w.partner_one_name || '',
            partnerTwoName: w.partner_two_name || '',
            weddingTitle: w.title || '',
            weddingDate: w.wedding_date || '',
            timezone: w.timezone || 'Europe/London',
            dressCode: w.dress_code || '',
            welcomeMessage: w.welcome_message || '',
            contactInformation: w.contact_information || '',
            parkingNotes: w.parking_notes || '',
            accessibilityNotes: w.accessibility_notes || '',
            childrenPolicy: w.children_policy || '',
            plusOnePolicy: w.plus_one_policy || '',
          });
        }

        if (elementsRes.data && elementsRes.data.length > 0) {
          const built = buildElementsFromRows(elementsRes.data);
          setElements({ ...DEFAULT_ELEMENTS, ...built });
        }

        setVenues(venuesRes.data || []);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load wedding data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [weddingId]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleElementChange = (section: string, field: string, value: string) => {
    setElements((prev) => ({
      ...prev,
      [section]: { ...(prev[section] || {}), [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!weddingId) return;
    setSaving(true);
    try {
      const { error: wErr } = await supabase.from('weddings').update({
        partner_one_name: form.partnerOneName,
        partner_two_name: form.partnerTwoName,
        title: form.weddingTitle,
        wedding_date: form.weddingDate || null,
        timezone: form.timezone,
        dress_code: form.dressCode,
        welcome_message: form.welcomeMessage,
        contact_information: form.contactInformation,
        parking_notes: form.parkingNotes,
        accessibility_notes: form.accessibilityNotes,
        children_policy: form.childrenPolicy,
        plus_one_policy: form.plusOnePolicy,
        updated_at: new Date().toISOString(),
      }).eq('id', weddingId);

      if (wErr) throw wErr;

      const existingRows = await supabase.from('wedding_elements').select('id, section, field_name').eq('wedding_id', weddingId);
      if (existingRows.error) throw existingRows.error;

      const toUpsert: { wedding_id: string; section: string; field_name: string; field_value: string }[] = [];
      for (const [section, fields] of Object.entries(elements)) {
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
          toUpsert.push({
            wedding_id: weddingId,
            section,
            field_name: fieldName,
            field_value: fieldValue,
          });
        }
      }

      if (toUpsert.length > 0) {
        const { error: eErr } = await supabase.from('wedding_elements').upsert(toUpsert, {
          onConflict: 'wedding_id, section, field_name',
        });
        if (eErr) throw eErr;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
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
            <span className="text-sm">Loading wedding details...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto text-center py-20">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-primary-600 cursor-pointer hover:text-primary-700 whitespace-nowrap">
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl text-foreground-900">Wedding details</h1>
            <p className="text-sm text-foreground-500 mt-1">Edit the information shown to your guests</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Couple details */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Couple details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">First partner&rsquo;s name</label>
                <input type="text" value={form.partnerOneName} onChange={(e) => handleChange('partnerOneName', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Second partner&rsquo;s name</label>
                <input type="text" value={form.partnerTwoName} onChange={(e) => handleChange('partnerTwoName', e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding title</label>
              <input type="text" value={form.weddingTitle} onChange={(e) => handleChange('weddingTitle', e.target.value)} className="input-field" />
            </div>
          </div>

          {/* Date & Timezone */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Date &amp; timezone</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding date</label>
                <input type="date" value={form.weddingDate} onChange={(e) => handleChange('weddingDate', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Timezone</label>
                <select value={form.timezone} onChange={(e) => handleChange('timezone', e.target.value)} className="input-field">
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Venues */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Venues</h2>
            {venues.map((v) => (
              <div key={v.id} className="mb-4 last:mb-0">
                <p className="text-xs font-label font-medium text-primary-600 uppercase mb-2">{v.venue_type}</p>
                <p className="text-sm text-foreground-900 font-medium">{v.name}</p>
                <p className="text-xs text-foreground-500 mt-0.5">
                  {[v.address_line_1, v.city, v.postcode, v.country].filter(Boolean).join(', ')}
                </p>
              </div>
            ))}
            <Link to="/app/travel" className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-label mt-3 cursor-pointer hover:text-primary-700">
              <i className="ri-add-line" /> Add or edit venues
            </Link>
          </div>

          {/* Dress code */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Dress Code</h2>
            <input type="text" value={form.dressCode} onChange={(e) => handleChange('dressCode', e.target.value)} className="input-field" placeholder="e.g. Formal — black tie optional" />
          </div>

          {/* Welcome message */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Welcome message</h2>
            <textarea value={form.welcomeMessage} onChange={(e) => handleChange('welcomeMessage', e.target.value)} rows={4} className="input-field resize-none" placeholder="Write a warm welcome message for your guests..." />
          </div>

          {/* Contact */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Contact information</h2>
            <input type="text" value={form.contactInformation} onChange={(e) => handleChange('contactInformation', e.target.value)} className="input-field" placeholder="How should guests reach you?" />
          </div>

          {/* Parking */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Parking notes</h2>
            <textarea value={form.parkingNotes} onChange={(e) => handleChange('parkingNotes', e.target.value)} rows={3} className="input-field resize-none" placeholder="Tell guests about parking options..." />
          </div>

          {/* Accessibility */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Accessibility notes</h2>
            <textarea value={form.accessibilityNotes} onChange={(e) => handleChange('accessibilityNotes', e.target.value)} rows={3} className="input-field resize-none" placeholder="Any accessibility information guests should know..." />
          </div>

          {/* Policies */}
          <div className="card-default">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Guest policies</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Children policy</label>
                <textarea value={form.childrenPolicy} onChange={(e) => handleChange('childrenPolicy', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Plus-one policy</label>
                <textarea value={form.plusOnePolicy} onChange={(e) => handleChange('plusOnePolicy', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
            </div>
          </div>

          {/* Section divider */}
          <div className="pt-2">
            <h2 className="font-heading text-lg text-foreground-900 mb-1">Wedding day elements</h2>
            <p className="text-xs text-foreground-500 mb-6">Track all the details that make your day unique</p>
          </div>

          {/* Flowers & Decor */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-flower-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Flowers &amp; decor</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Florist</label>
                <input type="text" value={elements.flowers?.florist || ''} onChange={(e) => handleElementChange('flowers', 'florist', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Bouquet style</label>
                <input type="text" value={elements.flowers?.bouquetStyle || ''} onChange={(e) => handleElementChange('flowers', 'bouquetStyle', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Flower types</label>
                <input type="text" value={elements.flowers?.flowerTypes || ''} onChange={(e) => handleElementChange('flowers', 'flowerTypes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Colour palette</label>
                <input type="text" value={elements.flowers?.colorPalette || ''} onChange={(e) => handleElementChange('flowers', 'colorPalette', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Decor notes</label>
                <textarea value={elements.flowers?.decorNotes || ''} onChange={(e) => handleElementChange('flowers', 'decorNotes', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
            </div>
          </div>

          {/* Rings */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-heart-2-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Rings</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Bride&rsquo;s ring</label>
                <input type="text" value={elements.rings?.brideRing || ''} onChange={(e) => handleElementChange('rings', 'brideRing', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Groom&rsquo;s ring</label>
                <input type="text" value={elements.rings?.groomRing || ''} onChange={(e) => handleElementChange('rings', 'groomRing', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Jeweller</label>
                <input type="text" value={elements.rings?.jeweler || ''} onChange={(e) => handleElementChange('rings', 'jeweler', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Notes</label>
                <input type="text" value={elements.rings?.notes || ''} onChange={(e) => handleElementChange('rings', 'notes', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Food & Menu */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-restaurant-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Food &amp; menu</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Caterer</label>
                <input type="text" value={elements.food?.caterer || ''} onChange={(e) => handleElementChange('food', 'caterer', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Menu style</label>
                <input type="text" value={elements.food?.menuStyle || ''} onChange={(e) => handleElementChange('food', 'menuStyle', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Starter</label>
                <input type="text" value={elements.food?.starter || ''} onChange={(e) => handleElementChange('food', 'starter', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Main options</label>
                <textarea value={elements.food?.mainOptions || ''} onChange={(e) => handleElementChange('food', 'mainOptions', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dessert</label>
                <input type="text" value={elements.food?.dessert || ''} onChange={(e) => handleElementChange('food', 'dessert', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Evening food</label>
                <input type="text" value={elements.food?.eveningFood || ''} onChange={(e) => handleElementChange('food', 'eveningFood', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Wedding cake</label>
                <input type="text" value={elements.food?.cake || ''} onChange={(e) => handleElementChange('food', 'cake', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Drinks package</label>
                <input type="text" value={elements.food?.drinksPackage || ''} onChange={(e) => handleElementChange('food', 'drinksPackage', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dietary accommodations</label>
                <input type="text" value={elements.food?.dietaryAccommodations || ''} onChange={(e) => handleElementChange('food', 'dietaryAccommodations', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Bride's Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-t-shirt-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Bride&rsquo;s attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Designer</label>
                <input type="text" value={elements.brideAttire?.designer || ''} onChange={(e) => handleElementChange('brideAttire', 'designer', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Boutique</label>
                <input type="text" value={elements.brideAttire?.boutique || ''} onChange={(e) => handleElementChange('brideAttire', 'boutique', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dress style</label>
                <textarea value={elements.brideAttire?.dressStyle || ''} onChange={(e) => handleElementChange('brideAttire', 'dressStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Veil</label>
                <input type="text" value={elements.brideAttire?.veil || ''} onChange={(e) => handleElementChange('brideAttire', 'veil', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.brideAttire?.shoes || ''} onChange={(e) => handleElementChange('brideAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.brideAttire?.accessories || ''} onChange={(e) => handleElementChange('brideAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Hair &amp; makeup</label>
                <input type="text" value={elements.brideAttire?.hairAndMakeup || ''} onChange={(e) => handleElementChange('brideAttire', 'hairAndMakeup', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Bridesmaids' Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-women-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Bridesmaids&rsquo; attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Number of bridesmaids</label>
                <input type="text" value={elements.bridesmaidsAttire?.count || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'count', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Designer</label>
                <input type="text" value={elements.bridesmaidsAttire?.designer || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'designer', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Dress style</label>
                <textarea value={elements.bridesmaidsAttire?.dressStyle || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'dressStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.bridesmaidsAttire?.shoes || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.bridesmaidsAttire?.accessories || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Hair &amp; makeup</label>
                <input type="text" value={elements.bridesmaidsAttire?.hairAndMakeup || ''} onChange={(e) => handleElementChange('bridesmaidsAttire', 'hairAndMakeup', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Groom's Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-men-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Groom&rsquo;s attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Tailor</label>
                <input type="text" value={elements.groomAttire?.tailor || ''} onChange={(e) => handleElementChange('groomAttire', 'tailor', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shirt</label>
                <input type="text" value={elements.groomAttire?.shirt || ''} onChange={(e) => handleElementChange('groomAttire', 'shirt', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Suit style</label>
                <textarea value={elements.groomAttire?.suitStyle || ''} onChange={(e) => handleElementChange('groomAttire', 'suitStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Tie</label>
                <input type="text" value={elements.groomAttire?.tie || ''} onChange={(e) => handleElementChange('groomAttire', 'tie', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.groomAttire?.shoes || ''} onChange={(e) => handleElementChange('groomAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.groomAttire?.accessories || ''} onChange={(e) => handleElementChange('groomAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>

          {/* Groomsmen Attire */}
          <div className="card-default">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent-100 flex items-center justify-center">
                <i className="ri-team-line text-accent-600 text-lg" />
              </div>
              <h2 className="font-label text-sm font-semibold text-foreground-900">Groomsmen attire</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Number of groomsmen</label>
                <input type="text" value={elements.groomsmenAttire?.count || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'count', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Tie</label>
                <input type="text" value={elements.groomsmenAttire?.tie || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'tie', e.target.value)} className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Suit style</label>
                <textarea value={elements.groomsmenAttire?.suitStyle || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'suitStyle', e.target.value)} rows={2} className="input-field resize-none" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Shoes</label>
                <input type="text" value={elements.groomsmenAttire?.shoes || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'shoes', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Accessories</label>
                <input type="text" value={elements.groomsmenAttire?.accessories || ''} onChange={(e) => handleElementChange('groomsmenAttire', 'accessories', e.target.value)} className="input-field" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Export ──
export default function WeddingDetailsPage() {
  if (isDemoMode) return <DemoWeddingDetailsPage />;
  return <NormalWeddingDetailsPage />;
}