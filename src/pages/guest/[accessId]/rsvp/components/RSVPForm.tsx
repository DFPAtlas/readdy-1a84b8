import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import type { RsvpEventResponse, RsvpCustomAnswer } from '@/types/access';

const SUBMIT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/submit-rsvp';

export const ATTENDANCE_OPTIONS = [
  { value: 'attending' as const, label: 'Joyfully accept', icon: 'ri-check-line', desc: 'I would love to attend' },
  { value: 'not_attending' as const, label: 'Regretfully decline', icon: 'ri-close-line', desc: 'I cannot make it' },
];

export const TRANSPORT_OPTS = [
  { value: 'needed', label: 'Need transport' },
  { value: 'not_needed', label: 'Not needed' },
  { value: 'arranged', label: 'Already arranged' },
];

export const ACCOMMODATION_OPTS = [
  { value: 'needed', label: 'Need accommodation' },
  { value: 'not_needed', label: 'Not needed' },
  { value: 'booked', label: 'Already booked' },
];

export const STEPS = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'household', label: 'Household' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'events', label: 'Events' },
  { key: 'meals', label: 'Meals' },
  { key: 'requirements', label: 'Dietary' },
  { key: 'travel', label: 'Travel' },
  { key: 'extras', label: 'Extras' },
  { key: 'review', label: 'Review' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'Select severity' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'life_threatening', label: 'Life-threatening (anaphylaxis)' },
];

export interface GuestFormState {
  response_status: 'attending' | 'not_attending' | 'maybe' | 'pending';
  ceremony_attending: boolean;
  reception_attending: boolean;
  evening_attending: boolean;
  welcome_attending: boolean;
  day_after_attending: boolean;
  event_responses: RsvpEventResponse[];
  plus_one_confirmed: boolean;
  plus_one_name: string;
  children_attending_count: number;
  children_names: string;
  meal_choice: string;
  dietary_preference: string;
  dietary_preference_other: string;
  allergies: string[];
  allergy_other: string;
  allergy_severity: string;
  cross_contamination: boolean;
  dietary_additional: string;
  step_free: boolean;
  wheelchair: boolean;
  accessible_toilet: boolean;
  carer: boolean;
  hearing_support: boolean;
  visual_support: boolean;
  quiet_area: boolean;
  seating_support: boolean;
  mobility_transport: boolean;
  accessibility_other: string;
  transport_status: string;
  accommodation_status: string;
  song_request: string;
  message_to_couple: string;
  custom_answers: Record<string, string>;
}

export function emptyForm(): GuestFormState {
  return {
    response_status: 'pending',
    ceremony_attending: true,
    reception_attending: true,
    evening_attending: true,
    welcome_attending: false,
    day_after_attending: false,
    event_responses: [],
    plus_one_confirmed: false,
    plus_one_name: '',
    children_attending_count: 0,
    children_names: '',
    meal_choice: '',
    dietary_preference: '',
    dietary_preference_other: '',
    allergies: [],
    allergy_other: '',
    allergy_severity: '',
    cross_contamination: false,
    dietary_additional: '',
    step_free: false,
    wheelchair: false,
    accessible_toilet: false,
    carer: false,
    hearing_support: false,
    visual_support: false,
    quiet_area: false,
    seating_support: false,
    mobility_transport: false,
    accessibility_other: '',
    transport_status: '',
    accommodation_status: '',
    song_request: '',
    message_to_couple: '',
    custom_answers: {},
  };
}

export function getRecipientEventFlags(recipient: Record<string, unknown>) {
  const eventMap: Record<string, { label: string; icon: string; timeLabel?: string }> = {
    ceremony: { label: 'Wedding Ceremony', icon: 'ri-heart-2-line', timeLabel: '1:00 PM' },
    reception: { label: 'Wedding Breakfast & Reception', icon: 'ri-restaurant-line', timeLabel: '3:00 PM' },
    evening: { label: 'Evening Celebration', icon: 'ri-moon-line', timeLabel: '7:00 PM' },
    welcome: { label: 'Welcome Gathering', icon: 'ri-hand-heart-line', timeLabel: '6:00 PM (day before)' },
    day_after: { label: 'Day-After Brunch', icon: 'ri-sun-line', timeLabel: '11:00 AM' },
  };
  const fieldMap: Record<string, string> = {
    ceremony: 'ceremony_included',
    reception: 'reception_included',
    evening: 'evening_included',
    welcome: 'welcome_event_included',
    day_after: 'day_after_event_included',
  };
  return Object.entries(eventMap)
    .filter(([key]) => recipient[fieldMap[key]] === true)
    .map(([key, meta]) => ({ key, ...meta, included: true }));
}

export function getFormEventField(gf: GuestFormState, eventKey: string): boolean {
  const map: Record<string, keyof GuestFormState> = {
    ceremony: 'ceremony_attending',
    reception: 'reception_attending',
    evening: 'evening_attending',
    welcome: 'welcome_attending',
    day_after: 'day_after_attending',
  };
  return !!(gf[map[eventKey]]);
}

export function setFormEventField(gf: GuestFormState, eventKey: string, val: boolean): GuestFormState {
  const map: Record<string, keyof GuestFormState> = {
    ceremony: 'ceremony_attending',
    reception: 'reception_attending',
    evening: 'evening_attending',
    welcome: 'welcome_attending',
    day_after: 'day_after_attending',
  };
  return { ...gf, [map[eventKey]]: val };
}

// ── Step Renderers ──

interface StepProps {
  gf: GuestFormState;
  currentRecipient: ReturnType<typeof useGuestPortal>['data']['recipients'][number];
  portal: ReturnType<typeof useGuestPortal>['data']['portal_settings'];
  recipients: ReturnType<typeof useGuestPortal>['data']['recipients'];
  rsvpResponses: ReturnType<typeof useGuestPortal>['data']['rsvp_responses'];
  householdEnabled: boolean;
  showTransport: boolean;
  showAccommodation: boolean;
  allowSongRequests: boolean;
  allowMessages: boolean;
  customQuestions: Array<{ key: string; label: string; type: string; options?: string[]; required?: boolean }>;
  dietaryOptions: string[];
  allergyLabels: string[];
  mealOptions: string[];
  requireMealChoices: boolean;
  activeGuestIdx: number;
  setActiveGuestIdx: (i: number) => void;
  updateGuestField: (guestId: string, field: keyof GuestFormState, value: unknown) => void;
  toggleAllergy: (guestId: string, allergy: string) => void;
  setEventAttendance: (guestId: string, eventKey: string, val: boolean) => void;
  deadline: Date | null;
  deadlinePassed: boolean;
  canSubmit: boolean;
  hasSubmitted: boolean;
  eventFlags: ReturnType<typeof getRecipientEventFlags>;
  householdMembers: typeof STEPS;
}

export function WelcomeStep({ hasSubmitted, canSubmit, deadline, householdMembers, recipients }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
          <i className="ri-heart-2-line text-3xl" />
        </div>
        <h2 className="font-heading text-xl text-foreground-900 mb-2">You are invited</h2>
        {recipients.length > 1 && (
          <p className="text-sm text-foreground-500">
            Your invitation includes {recipients.map((m) => m.preferred_name || m.guest_name).join(', ')}
          </p>
        )}
        {deadline && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-100 text-foreground-700 text-xs font-label">
            <i className="ri-calendar-line" />
            Kindly respond by {deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <button
          type="button"
          disabled={!canSubmit && !hasSubmitted}
          className="px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          Get started <i className="ri-arrow-right-line ml-1" />
        </button>
      </div>
    </div>
  );
}

export function HouseholdStep({ recipients, rsvpResponses, forms, activeGuestIdx, setActiveGuestIdx }: StepProps & { forms: Record<string, GuestFormState> }) {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg text-foreground-900">Your household</h2>
      <p className="text-sm text-foreground-500">Select a household member to respond for, then complete their RSVP. Each member can have different attendance and meal choices.</p>
      <div className="space-y-2">
        {recipients.map((m, i) => {
          const mGf = forms[m.guest_id];
          const mRsvp = rsvpResponses[m.guest_id];
          const status = mGf?.response_status === 'pending'
            ? (!mRsvp?.submitted_at ? 'Not yet started' : 'Draft saved')
            : mGf?.response_status === 'attending'
              ? 'Attending'
              : mGf?.response_status === 'not_attending'
                ? 'Declined'
                : 'Still deciding';
          const cls = mGf?.response_status === 'attending' ? 'text-emerald-600' : mGf?.response_status === 'not_attending' ? 'text-rose-600' : 'text-foreground-400';
          return (
            <button
              type="button"
              key={m.guest_id}
              onClick={() => setActiveGuestIdx(i)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors cursor-pointer ${i === activeGuestIdx ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}
            >
              <span className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-label font-semibold text-sm flex-shrink-0">
                {(m.preferred_name || m.guest_name).charAt(0)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-label text-foreground-800">{m.preferred_name || m.guest_name}</p>
                <p className={`text-xs ${cls}`}>{status}</p>
              </div>
              <i className={`ri-arrow-right-s-line text-foreground-300 ${i === activeGuestIdx ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AttendanceStep({ gf, currentRecipient, canEdit, updateGuestField }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-lg text-foreground-900">Your response</h2>
        <p className="text-sm text-foreground-500 mt-1">Responding for: <strong>{currentRecipient.preferred_name || currentRecipient.guest_name}</strong></p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ATTENDANCE_OPTIONS.map((opt) => {
          const isActive = gf.response_status === opt.value;
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => updateGuestField(currentRecipient.guest_id, 'response_status', opt.value)}
              disabled={!canEdit}
              className={`flex items-center gap-3 px-5 py-4 rounded-xl border text-sm font-label transition-all cursor-pointer ${!canEdit ? 'opacity-60' : ''} ${
                isActive
                  ? opt.value === 'attending'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 border-2'
                    : 'bg-rose-50 border-rose-300 text-rose-700 border-2'
                  : 'border-secondary-100 text-foreground-500 hover:border-secondary-300 bg-background-50'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? (opt.value === 'attending' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-secondary-100 text-foreground-400'}`}>
                <i className={`${opt.icon} text-sm`} />
              </span>
              <div className="text-left">
                <p className="font-medium text-foreground-800">{opt.label}</p>
                <p className="text-xs text-foreground-400 mt-0.5">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
      {gf.response_status === 'not_attending' && (
        <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-700">
            <i className="ri-information-line mr-1" />
            You can leave an optional message for the couple on the Extras step.
          </p>
        </div>
      )}
    </div>
  );
}

export function EventsStep({ gf, currentRecipient, eventFlags, setEventAttendance }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-lg text-foreground-900">Which events will you attend?</h2>
        <p className="text-sm text-foreground-500 mt-1">Select the events you plan to join. At least one is required to submit.</p>
      </div>
      <div className="space-y-2">
        {eventFlags.map((ef) => (
          <label
            key={ef.key}
            className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${getFormEventField(gf, ef.key) ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}
          >
            <input
              type="checkbox"
              checked={getFormEventField(gf, ef.key)}
              onChange={(e) => setEventAttendance(currentRecipient.guest_id, ef.key, e.target.checked)}
              className="w-4 h-4 rounded border-secondary-300 text-primary-500 accent-primary-500 cursor-pointer flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-label text-foreground-800">{ef.label}</span>
              {ef.timeLabel && <p className="text-xs text-foreground-400">{ef.timeLabel}</p>}
            </div>
            <i className={`${ef.icon} text-foreground-300 text-lg flex-shrink-0`} />
          </label>
        ))}
      </div>
    </div>
  );
}

export function MealsStep({ gf, currentRecipient, mealOptions, requireMealChoices, updateGuestField }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-lg text-foreground-900">Meal choice{requireMealChoices ? ' (required)' : ''}</h2>
        <p className="text-sm text-foreground-500 mt-1">Please select your preference for the wedding breakfast.</p>
      </div>
      <div className="space-y-2">
        {mealOptions.map((meal) => (
          <label
            key={meal}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${gf.meal_choice === meal ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}
          >
            <input
              type="radio"
              name={`meal_${currentRecipient.guest_id}`}
              value={meal}
              checked={gf.meal_choice === meal}
              onChange={(e) => updateGuestField(currentRecipient.guest_id, 'meal_choice', e.target.value)}
              className="w-4 h-4 accent-primary-500 cursor-pointer"
            />
            <span className="text-sm text-foreground-700">{meal}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function RequirementsStep({ gf, currentRecipient, dietaryOptions, allergyLabels, updateGuestField, toggleAllergy }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg text-foreground-900">Dietary, allergy & accessibility</h2>
        <p className="text-sm text-foreground-500 mt-1">This information helps the venue and caterers prepare. Allergy and accessibility data is treated as sensitive.</p>
      </div>

      {/* Dietary preference */}
      <div>
        <label className="block text-sm font-label font-medium text-foreground-700 mb-2">Dietary preference</label>
        <select
          value={gf.dietary_preference}
          onChange={(e) => updateGuestField(currentRecipient.guest_id, 'dietary_preference', e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
        >
          <option value="">No specific preference</option>
          {dietaryOptions.filter((o) => o !== 'No specific preference').map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="Other">Other</option>
        </select>
        {gf.dietary_preference === 'Other' && (
          <input
            type="text"
            value={gf.dietary_preference_other}
            onChange={(e) => updateGuestField(currentRecipient.guest_id, 'dietary_preference_other', e.target.value)}
            placeholder="Please specify..."
            className="mt-2 w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors"
          />
        )}
      </div>

      {/* Allergies */}
      <div>
        <label className="block text-sm font-label font-medium text-foreground-700 mb-2">
          Food allergies <span className="text-xs text-rose-400 font-normal">(sensitive)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {allergyLabels.map((allergy) => {
            const isSelected = gf.allergies.includes(allergy);
            return (
              <button
                type="button"
                key={allergy}
                onClick={() => toggleAllergy(currentRecipient.guest_id, allergy)}
                className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${isSelected ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-secondary-50 text-foreground-500 border border-secondary-100 hover:border-secondary-200'}`}
              >
                {allergy}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={gf.allergy_other}
          onChange={(e) => updateGuestField(currentRecipient.guest_id, 'allergy_other', e.target.value)}
          placeholder="Other allergy..."
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors"
        />
        {(gf.allergies.length > 0 || gf.allergy_other) && (
          <>
            <select
              value={gf.allergy_severity}
              onChange={(e) => updateGuestField(currentRecipient.guest_id, 'allergy_severity', e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label className="mt-2 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gf.cross_contamination}
                onChange={(e) => updateGuestField(currentRecipient.guest_id, 'cross_contamination', e.target.checked)}
                className="w-4 h-4 rounded border-secondary-300 text-primary-500 accent-primary-500 cursor-pointer"
              />
              <span className="text-sm text-foreground-700">Cross-contamination is a serious concern</span>
            </label>
          </>
        )}
      </div>

      {/* Additional dietary */}
      <div>
        <label className="block text-sm font-label font-medium text-foreground-700 mb-2">Additional dietary notes</label>
        <textarea
          value={gf.dietary_additional}
          onChange={(e) => updateGuestField(currentRecipient.guest_id, 'dietary_additional', e.target.value)}
          placeholder="Any other dietary requirements..."
          rows={2}
          maxLength={300}
          className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none"
        />
        <p className="text-[10px] text-foreground-300 mt-1 text-right">{gf.dietary_additional.length}/300</p>
      </div>

      {/* Accessibility */}
      <div className="pt-4 border-t border-secondary-100">
        <label className="block text-sm font-label font-medium text-foreground-700 mb-3">
          Accessibility requirements <span className="text-xs text-rose-400 font-normal">(sensitive)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: 'step_free', label: 'Step-free access needed' },
            { key: 'wheelchair', label: 'Wheelchair space required' },
            { key: 'accessible_toilet', label: 'Accessible toilet needed' },
            { key: 'carer', label: 'Carer will be attending' },
            { key: 'hearing_support', label: 'Hearing support (loop etc.)' },
            { key: 'visual_support', label: 'Visual support (large print etc.)' },
            { key: 'quiet_area', label: 'Quiet area preferred' },
            { key: 'seating_support', label: 'Special seating required' },
            { key: 'mobility_transport', label: 'Mobility/transport assistance' },
          ].map((item) => {
            const isChecked = !!(gf as unknown as Record<string, boolean>)[item.key];
            return (
              <label key={item.key} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => updateGuestField(currentRecipient.guest_id, item.key as keyof GuestFormState, e.target.checked)}
                  className="w-4 h-4 rounded border-secondary-300 text-primary-500 accent-primary-500 cursor-pointer flex-shrink-0"
                />
                <span className="text-xs text-foreground-700 leading-tight">{item.label}</span>
              </label>
            );
          })}
        </div>
        <textarea
          value={gf.accessibility_other}
          onChange={(e) => updateGuestField(currentRecipient.guest_id, 'accessibility_other', e.target.value)}
          placeholder="Any other accessibility or mobility needs..."
          rows={2}
          maxLength={300}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none"
        />
      </div>
    </div>
  );
}

export function TravelStep({ gf, currentRecipient, showTransport, showAccommodation, hasPlusOne, updateGuestField }: StepProps & { hasPlusOne: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg text-foreground-900">Travel & accommodation</h2>
        <p className="text-sm text-foreground-500 mt-1">Let the couple know your travel plans.</p>
      </div>
      {showTransport && (
        <div>
          <label className="block text-sm font-label font-medium text-foreground-700 mb-2">Transport</label>
          <div className="flex flex-wrap gap-2">
            {TRANSPORT_OPTS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => updateGuestField(currentRecipient.guest_id, 'transport_status', gf.transport_status === opt.value ? '' : opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${gf.transport_status === opt.value ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-secondary-50 text-foreground-500 border border-secondary-100 hover:border-secondary-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {showAccommodation && (
        <div>
          <label className="block text-sm font-label font-medium text-foreground-700 mb-2">Accommodation</label>
          <div className="flex flex-wrap gap-2">
            {ACCOMMODATION_OPTS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                onClick={() => updateGuestField(currentRecipient.guest_id, 'accommodation_status', gf.accommodation_status === opt.value ? '' : opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${gf.accommodation_status === opt.value ? 'bg-accent-100 text-accent-700 border border-accent-200' : 'bg-secondary-50 text-foreground-500 border border-secondary-100 hover:border-secondary-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {hasPlusOne && currentRecipient.plus_one_allowed && (
        <div className="pt-4 border-t border-secondary-100">
          <label className="block text-sm font-label font-medium text-foreground-700 mb-2">Your plus-one</label>
          <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${gf.plus_one_confirmed ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}>
            <input
              type="checkbox"
              checked={gf.plus_one_confirmed}
              onChange={(e) => updateGuestField(currentRecipient.guest_id, 'plus_one_confirmed', e.target.checked)}
              className="w-4 h-4 rounded border-secondary-300 text-primary-500 accent-primary-500 cursor-pointer"
            />
            <span className="text-sm font-label text-foreground-800">I will bring my invited plus-one</span>
          </label>
          {gf.plus_one_confirmed && currentRecipient.plus_one_status === 'approved_unnamed' && (
            <div className="mt-2 ml-7">
              <label className="block text-xs font-label font-medium text-foreground-600 mb-1">Plus-one name</label>
              <input
                type="text"
                value={gf.plus_one_name}
                onChange={(e) => updateGuestField(currentRecipient.guest_id, 'plus_one_name', e.target.value)}
                placeholder="Enter their full name"
                className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExtrasStep({ gf, currentRecipient, allowSongRequests, allowMessages, customQuestions, updateGuestField }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-lg text-foreground-900">Final touches</h2>
        <p className="text-sm text-foreground-500 mt-1">Optional extras to help make the day special.</p>
      </div>
      {allowSongRequests && (
        <div>
          <label className="block text-sm font-label font-medium text-foreground-700 mb-2">
            <i className="ri-music-line mr-1 text-foreground-400" /> Song request
          </label>
          <input
            type="text"
            value={gf.song_request}
            onChange={(e) => updateGuestField(currentRecipient.guest_id, 'song_request', e.target.value)}
            placeholder="A song that will get you on the dance floor..."
            className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors"
          />
        </div>
      )}
      {allowMessages && (
        <div>
          <label className="block text-sm font-label font-medium text-foreground-700 mb-2">
            <i className="ri-chat-heart-line mr-1 text-foreground-400" /> Message for the couple
          </label>
          <textarea
            value={gf.message_to_couple}
            onChange={(e) => updateGuestField(currentRecipient.guest_id, 'message_to_couple', e.target.value)}
            placeholder="A few words for the happy couple..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none"
          />
          <p className="text-[10px] text-foreground-300 mt-1 text-right">{gf.message_to_couple.length}/500</p>
        </div>
      )}
      {customQuestions.map((q) => (
        <div key={q.key}>
          <label className="block text-sm font-label font-medium text-foreground-700 mb-2">
            {q.label}{q.required ? <span className="text-rose-400"> *</span> : ''}
          </label>
          {q.type === 'text' && (
            <input
              type="text"
              value={gf.custom_answers[q.key] || ''}
              onChange={(e) => updateGuestField(currentRecipient.guest_id, 'custom_answers', { ...gf.custom_answers, [q.key]: e.target.value })}
              placeholder="Your answer..."
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors"
            />
          )}
          {q.type === 'select' && (
            <select
              value={gf.custom_answers[q.key] || ''}
              onChange={(e) => updateGuestField(currentRecipient.guest_id, 'custom_answers', { ...gf.custom_answers, [q.key]: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 focus:outline-none focus:border-primary-300 transition-colors cursor-pointer"
            >
              <option value="">Select...</option>
              {(q.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}
          {q.type === 'multi_select' && (
            <div className="flex flex-wrap gap-2">
              {(q.options || []).map((opt) => {
                const selected = (gf.custom_answers[q.key] || '').split(',').includes(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      const current = (gf.custom_answers[q.key] || '').split(',').filter(Boolean);
                      const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                      updateGuestField(currentRecipient.guest_id, 'custom_answers', { ...gf.custom_answers, [q.key]: next.join(',') });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${selected ? 'bg-primary-100 text-primary-700 border border-primary-200' : 'bg-secondary-50 text-foreground-500 border border-secondary-100 hover:border-secondary-200'}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ReviewStep({ gf, currentRecipient, eventFlags, mealOptions, dietaryOptions, hasPlusOne, allowSongRequests, allowMessages, allowRsvpUpdates, customQuestions }: StepProps & { hasPlusOne: boolean; allowRsvpUpdates: boolean }) {
  const isAttending = gf.response_status === 'attending' || gf.response_status === 'maybe';
  return (
    <div className="space-y-5">
      <h2 className="font-heading text-lg text-foreground-900">Review your response</h2>
      <p className="text-sm text-foreground-500">Please review before submitting. Your response is shared with the couple for wedding planning.</p>
      <div className="bg-background-50 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Response</p>
          <p className={`text-sm font-medium mt-1 ${gf.response_status === 'attending' ? 'text-emerald-700' : gf.response_status === 'not_attending' ? 'text-rose-700' : 'text-amber-700'}`}>
            <i className={`${gf.response_status === 'attending' ? 'ri-check-line' : gf.response_status === 'not_attending' ? 'ri-close-line' : 'ri-question-line'} mr-1`} />
            {gf.response_status === 'attending' ? 'Joyfully attending' : gf.response_status === 'not_attending' ? 'Regretfully declined' : 'Still deciding'}
          </p>
        </div>
        {isAttending && (
          <>
            <div className="pt-3 border-t border-secondary-200">
              <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Events attending</p>
              <div className="mt-1 space-y-1">
                {eventFlags.map((ef) => (
                  <p key={ef.key} className="text-sm text-foreground-700">
                    <i className={`${getFormEventField(gf, ef.key) ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'} mr-1.5 text-sm`} />
                    {ef.label}{ef.timeLabel ? ` — ${ef.timeLabel}` : ''}
                  </p>
                ))}
              </div>
            </div>
            {mealOptions.length > 0 && (
              <div className="pt-3 border-t border-secondary-200">
                <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Meal choice</p>
                <p className="text-sm text-foreground-700 mt-1">{gf.meal_choice || <span className="text-amber-500 italic">Not selected</span>}</p>
              </div>
            )}
            {(gf.dietary_preference || gf.allergies.length > 0) && (
              <div className="pt-3 border-t border-secondary-200">
                <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">
                  Dietary <span className="text-rose-500 bg-rose-50 px-1 py-0.5 rounded text-[10px]">Sensitive</span>
                </p>
                {gf.dietary_preference && <p className="text-sm text-foreground-700">{gf.dietary_preference}</p>}
                {gf.allergies.length > 0 && <p className="text-sm text-foreground-700">Allergies: {[...gf.allergies, gf.allergy_other].filter(Boolean).join(', ')}</p>}
                {gf.allergy_severity && <p className="text-xs text-foreground-500">Severity: {gf.allergy_severity.replace(/_/g, ' ')}</p>}
              </div>
            )}
            {(gf.transport_status || gf.accommodation_status) && (
              <div className="pt-3 border-t border-secondary-200">
                <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Travel</p>
                {gf.transport_status && <p className="text-sm text-foreground-700">Transport: {TRANSPORT_OPTS.find((o) => o.value === gf.transport_status)?.label}</p>}
                {gf.accommodation_status && <p className="text-sm text-foreground-700">Accommodation: {ACCOMMODATION_OPTS.find((o) => o.value === gf.accommodation_status)?.label}</p>}
              </div>
            )}
            {hasPlusOne && (
              <div className="pt-3 border-t border-secondary-200">
                <p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Plus-one</p>
                <p className="text-sm text-foreground-700 mt-1">
                  {gf.plus_one_confirmed ? `Bringing ${gf.plus_one_name || currentRecipient.plus_one_name || 'guest'}` : 'Attending alone'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <p className="text-xs text-foreground-400 italic">
        Your response is shared with the couple. {allowRsvpUpdates ? 'You can update it until the RSVP deadline.' : 'Contact the couple for changes after submitting.'}
      </p>
    </div>
  );
}