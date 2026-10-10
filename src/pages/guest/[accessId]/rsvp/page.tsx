import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { isDemoMode } from '@/demo/demoConfig';
import { useGuestPortal } from '@/hooks/useGuestPortal';
import {
  STEPS,
  emptyForm,
  getRecipientEventFlags,
  getFormEventField,
  setFormEventField,
  GuestFormState,
  WelcomeStep,
  HouseholdStep,
  AttendanceStep,
  EventsStep,
  MealsStep,
  RequirementsStep,
  TravelStep,
  ExtrasStep,
  ReviewStep,
} from './components/RSVPForm';
import { edgeFunctionUrl } from '@/lib/edgeFunctions';
import type { RsvpCustomAnswer } from '@/types/access';

const SUBMIT_URL = edgeFunctionUrl('submit-rsvp');

// ── Normal Mode ──

function NormalRSVPPage() {
  const { data, refresh } = useGuestPortal();
  const navigate = useNavigate();
  const { accessId } = useParams<{ accessId: string }>();
  const [step, setStep] = useState(0);
  const [activeGuestIdx, setActiveGuestIdx] = useState(0);
  const [forms, setForms] = useState<Record<string, GuestFormState>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'error' | 'success'>('idle');
  const [serverError, setServerError] = useState('');
  const [submissionResult, setSubmissionResult] = useState<{ message: string; is_update: boolean; is_late: boolean } | null>(null);

  // ── Unsaved-change guard ──
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);

  const markDirty = useCallback(() => {
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      setIsDirty(true);
    }
  }, []);

  const clearDirty = useCallback(() => {
    isDirtyRef.current = false;
    setIsDirty(false);
  }, []);

  // beforeunload — browser tab close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // useBlocker — in-app navigation guard
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const portal = data?.portal_settings;
  const recipients = data?.recipients || [];
  const invitation = data?.invitation;
  const rsvpResponses = data?.rsvp_responses || {};
  const deadline = invitation?.rsvp_deadline ? new Date(invitation.rsvp_deadline) : null;
  const deadlinePassed = deadline ? new Date() > new Date(new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate(), 23, 59, 59)) : false;
  const allowLateRsvp = portal?.allow_late_rsvp === true;
  const canSubmit = !deadlinePassed || allowLateRsvp;
  const rsvpEnabled = portal?.rsvp_enabled !== false;
  const householdEnabled = portal?.household_rsvp_enabled === true;
  const showTransport = portal?.show_transport !== false;
  const showAccommodation = portal?.show_accommodation !== false;
  const allowSongRequests = portal?.allow_song_requests !== false;
  const allowMessages = portal?.allow_messages !== false;
  const customQuestions = portal?.custom_questions || [];
  const dietaryOptions: string[] = (portal?.dietary_options as string[]) || ['Vegetarian', 'Vegan', 'Pescatarian', 'Halal', 'Kosher', 'Gluten-free', 'Dairy-free', 'No specific preference'];
  const allergyLabels: string[] = (portal?.allergy_labels as string[]) || ['Peanuts', 'Tree nuts', 'Shellfish', 'Fish', 'Dairy', 'Eggs', 'Wheat/Gluten', 'Soy', 'Sesame'];
  const mealOptions: string[] = (portal?.meal_options as string[]) || [];
  const requireMealChoices = portal?.require_meal_choices === true;
  const allowRsvpUpdates = portal?.allow_rsvp_updates !== false;

  const currentRecipient = recipients[activeGuestIdx] || recipients[0];
  const basePath = `/guest/${accessId}`;

  // Initialise forms from existing RSVP data
  useEffect(() => {
    if (recipients.length === 0) return;
    const initial: Record<string, GuestFormState> = {};
    recipients.forEach((r) => {
      if (forms[r.guest_id]) return;
      const existing = rsvpResponses[r.guest_id];
      if (existing && existing.response_status) {
        const sd = existing.structured_dietary;
        const sa = existing.structured_accessibility;
        initial[r.guest_id] = {
          ...emptyForm(),
          response_status: existing.response_status as 'attending' | 'not_attending' | 'maybe',
          ceremony_attending: existing.ceremony_attending,
          reception_attending: existing.reception_attending,
          evening_attending: existing.evening_attending,
          welcome_attending: existing.welcome_attending,
          day_after_attending: existing.day_after_attending,
          plus_one_confirmed: existing.plus_one_confirmed,
          plus_one_name: existing.plus_one_name || '',
          children_attending_count: existing.children_attending_count || 0,
          children_names: existing.children_names || '',
          meal_choice: existing.meal_choice || '',
          dietary_preference: (sd as { preference?: string } | null)?.preference || '',
          allergies: (sd as { allergies?: string[] } | null)?.allergies || [],
          allergy_severity: (sd as { allergy_severity?: string } | null)?.allergy_severity || '',
          cross_contamination: (sd as { cross_contamination_concern?: boolean } | null)?.cross_contamination_concern || false,
          dietary_additional: (sd as { additional_notes?: string } | null)?.additional_notes || '',
          step_free: (sa as { step_free_access?: boolean } | null)?.step_free_access || false,
          wheelchair: (sa as { wheelchair_space?: boolean } | null)?.wheelchair_space || false,
          accessible_toilet: (sa as { accessible_toilet?: boolean } | null)?.accessible_toilet || false,
          carer: (sa as { carer_attending?: boolean } | null)?.carer_attending || false,
          hearing_support: (sa as { hearing_support?: boolean } | null)?.hearing_support || false,
          visual_support: (sa as { visual_support?: boolean } | null)?.visual_support || false,
          quiet_area: (sa as { quiet_area?: boolean } | null)?.quiet_area || false,
          seating_support: (sa as { seating_support?: boolean } | null)?.seating_support || false,
          mobility_transport: (sa as { mobility_transport?: boolean } | null)?.mobility_transport || false,
          accessibility_other: (sa as { other_notes?: string } | null)?.other_notes || '',
          transport_status: existing.transport_status || '',
          accommodation_status: existing.accommodation_status || '',
          song_request: existing.song_request || '',
          message_to_couple: existing.message_to_couple || '',
          custom_answers: (existing.custom_answers || []).reduce((acc: Record<string, string>, a: RsvpCustomAnswer) => {
            acc[a.question_key] = a.answer || '';
            return acc;
          }, {}),
        };
      } else {
        initial[r.guest_id] = emptyForm();
      }
    });
    if (Object.keys(initial).length > 0) setForms((prev) => ({ ...prev, ...initial }));
  }, [recipients]);

  const updateGuestField = useCallback((guestId: string, field: keyof GuestFormState, value: unknown) => {
    markDirty();
    setForms((prev) => {
      const gf = prev[guestId];
      if (!gf) return prev;
      return { ...prev, [guestId]: { ...gf, [field]: value } };
    });
  }, [markDirty]);

  const toggleAllergy = useCallback((guestId: string, allergy: string) => {
    markDirty();
    setForms((prev) => {
      const gf = prev[guestId];
      if (!gf) return prev;
      const curr = [...gf.allergies];
      const idx = curr.indexOf(allergy);
      if (idx >= 0) curr.splice(idx, 1);
      else curr.push(allergy);
      return { ...prev, [guestId]: { ...gf, allergies: curr } };
    });
  }, [markDirty]);

  const setEventAttendance = useCallback((guestId: string, eventKey: string, val: boolean) => {
    markDirty();
    setForms((prev) => {
      const gf = prev[guestId];
      if (!gf) return prev;
      return { ...prev, [guestId]: setFormEventField(gf, eventKey, val) };
    });
  }, [markDirty]);

  function buildDietaryText(gf: GuestFormState): string {
    const parts: string[] = [];
    if (gf.dietary_preference) parts.push(`Preference: ${gf.dietary_preference}${gf.dietary_preference_other ? ` (${gf.dietary_preference_other})` : ''}`);
    if (gf.allergies.length > 0) {
      const list = [...gf.allergies];
      if (gf.allergy_other) list.push(gf.allergy_other);
      parts.push(`Allergies: ${list.join(', ')}`);
    }
    if (gf.allergy_severity) parts.push(`Severity: ${gf.allergy_severity}`);
    if (gf.cross_contamination) parts.push('Cross-contamination concern');
    if (gf.dietary_additional) parts.push(gf.dietary_additional);
    return parts.join('; ');
  }

  function buildAccessibilityText(gf: GuestFormState): string {
    const items: string[] = [];
    if (gf.step_free) items.push('Step-free access');
    if (gf.wheelchair) items.push('Wheelchair space');
    if (gf.accessible_toilet) items.push('Accessible toilet');
    if (gf.carer) items.push('Carer attending');
    if (gf.hearing_support) items.push('Hearing support');
    if (gf.visual_support) items.push('Visual support');
    if (gf.quiet_area) items.push('Quiet area preferred');
    if (gf.seating_support) items.push('Seating support');
    if (gf.mobility_transport) items.push('Mobility/transport assistance');
    if (gf.accessibility_other) items.push(gf.accessibility_other);
    return items.join('; ');
  }

  const handleSubmit = useCallback(async (saveDraft: boolean) => {
    if (!currentRecipient) return;
    const gf = forms[currentRecipient.guest_id];
    if (!gf) return;

    if (!saveDraft && gf.response_status === 'attending') {
      const eventFlags = getRecipientEventFlags(currentRecipient as unknown as unknown as Record<string, unknown>);
      const anySelected = eventFlags.some((ef) => getFormEventField(gf, ef.key));
      if (!anySelected) { setServerError('Please select at least one event you plan to attend.'); return; }
      if (requireMealChoices && mealOptions.length > 0 && !gf.meal_choice) {
        setServerError('Please select a meal choice.'); return;
      }
    }

    setSubmitStatus('submitting');
    setServerError('');
    let sessionHash = '';
    try { sessionHash = sessionStorage.getItem('vowora_guest_session') || ''; } catch { /* ignore */ }

    try {
      const dietaryText = buildDietaryText(gf);
      const accessibilityText = buildAccessibilityText(gf);
      const payload = {
        session_hash: sessionHash,
        guest_responses: {
          [currentRecipient.guest_id]: {
            response_status: gf.response_status,
            ceremony_attending: gf.ceremony_attending,
            reception_attending: gf.reception_attending,
            evening_attending: gf.evening_attending,
            welcome_attending: gf.welcome_attending,
            day_after_attending: gf.day_after_attending,
            event_responses: gf.event_responses.map(({ event_id, attendance_status, meal_option_id }) => ({ event_id, attendance_status, meal_option_id })),
            plus_one_confirmed: gf.plus_one_confirmed,
            plus_one_name: gf.plus_one_name || null,
            children_attending_count: gf.children_attending_count,
            children_names: gf.children_names || null,
            meal_choice: gf.meal_choice || null,
            dietary_requirements: dietaryText || null,
            allergy_notes: gf.allergies.length > 0 ? gf.allergies.join(', ') : null,
            accessibility_notes: accessibilityText || null,
            structured_dietary: {
              preference: gf.dietary_preference || null,
              preference_other: gf.dietary_preference_other || null,
              allergies: gf.allergies,
              allergy_other: gf.allergy_other || null,
              allergy_severity: gf.allergy_severity || null,
              cross_contamination_concern: gf.cross_contamination,
              additional_notes: gf.dietary_additional || null,
            },
            structured_accessibility: {
              step_free_access: gf.step_free,
              wheelchair_space: gf.wheelchair,
              accessible_toilet: gf.accessible_toilet,
              carer_attending: gf.carer,
              hearing_support: gf.hearing_support,
              visual_support: gf.visual_support,
              quiet_area: gf.quiet_area,
              seating_support: gf.seating_support,
              mobility_transport: gf.mobility_transport,
              other_notes: gf.accessibility_other || null,
            },
            transport_status: gf.transport_status || null,
            accommodation_status: gf.accommodation_status || null,
            song_request: gf.song_request || null,
            message_to_couple: gf.message_to_couple || null,
            custom_answers: customQuestions
              .map((q) => ({ question_key: q.key, question_label: q.label, answer: gf.custom_answers[q.key] || '', answer_type: q.type }))
              .filter((a) => a.answer),
          },
        },
        save_draft: saveDraft,
        idempotency_key: saveDraft ? undefined : crypto.randomUUID(),
      };

      const res = await fetch(SUBMIT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();

      if (res.ok && result.success) {
        if (saveDraft) {
          clearDirty();
          setSubmitStatus('idle');
          setSubmissionResult({ message: 'Your draft has been saved.', is_update: false, is_late: false });
        } else {
          clearDirty();
          setSubmitStatus('success');
          setSubmissionResult({ message: result.message || 'Thank you! Your RSVP has been received.', is_update: result.is_update || false, is_late: result.is_late || false });
          refresh();
        }
      } else {
        setSubmitStatus('error');
        setServerError(result.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitStatus('error');
      setServerError('Could not submit. Please try again.');
    }
  }, [forms, currentRecipient, refresh]);

  const goToStep = useCallback((s: number) => {
    setStep(s);
    setServerError('');
    if (submitStatus !== 'success') setSubmitStatus('idle');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [submitStatus]);

  // Early returns
  if (!rsvpEnabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-6"><i className="ri-mail-close-line text-3xl" /></div>
        <h1 className="font-heading text-2xl text-foreground-900 mb-3">RSVP Not Available</h1>
        <p className="text-sm text-foreground-500">The couple have not yet opened RSVPs. Please check back later.</p>
        <button onClick={() => navigate(basePath)} className="mt-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line" /> Back to dashboard</button>
      </div>
    );
  }

  if (!currentRecipient) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-sm text-foreground-500">No invitation recipients found.</p>
        <button onClick={() => navigate(basePath)} className="mt-4 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line" /> Back to dashboard</button>
      </div>
    );
  }

  const gf = forms[currentRecipient.guest_id];
  if (!gf) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="flex items-center justify-center gap-3 text-foreground-500"><i className="ri-loader-4-line animate-spin text-xl" /><span className="text-sm">Loading RSVP form...</span></div>
      </div>
    );
  }

  const isAttending = gf.response_status === 'attending' || gf.response_status === 'maybe';
  const hasPlusOne = currentRecipient.plus_one_allowed === true;
  const hasSubmitted = !!(rsvpResponses[currentRecipient.guest_id]?.submitted_at && !rsvpResponses[currentRecipient.guest_id]?.is_draft);
  const canEdit = !hasSubmitted || allowRsvpUpdates;
  const eventFlags = getRecipientEventFlags(currentRecipient as unknown as unknown as Record<string, unknown>);

  const visibleSteps = STEPS.filter((s) => {
    if (s.key === 'meals') return isAttending && mealOptions.length > 0;
    if (s.key === 'requirements') return isAttending;
    if (s.key === 'travel') return isAttending && (showTransport || showAccommodation);
    if (s.key === 'extras') return isAttending && (allowSongRequests || allowMessages || customQuestions.length > 0);
    if (s.key === 'household') return householdEnabled && recipients.length > 1;
    return true;
  });

  const currentStepKey = visibleSteps[step]?.key;

  // Success state
  if (submitStatus === 'success' && submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center bg-white rounded-2xl border border-secondary-100 p-8 md:p-12">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-6"><i className="ri-check-double-line text-4xl" /></div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-3">{submissionResult.is_update ? 'Your RSVP has been updated!' : 'Thank you — your RSVP has been received!'}</h1>
          <p className="text-sm text-foreground-500 mb-2">{submissionResult.message}</p>
          {submissionResult.is_late && <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-label mb-4"><i className="ri-timer-line" /> Submitted after the deadline</div>}
          <div className="bg-background-50 rounded-xl p-5 mb-6">
            <p className="text-sm text-foreground-700">{isAttending ? <><i className="ri-check-line text-emerald-500 mr-1" /><strong>{currentRecipient.preferred_name || currentRecipient.guest_name}</strong> — Joyfully attending</> : <><i className="ri-close-line text-foreground-400 mr-1" /><strong>{currentRecipient.preferred_name || currentRecipient.guest_name}</strong> — Regretfully declined</>}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate(basePath)} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-home-4-line" /> Back to dashboard</button>
            {canEdit && <button onClick={() => { setSubmitStatus('idle'); setSubmissionResult(null); }} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-edit-line mr-1" /> Edit response</button>}
          </div>
        </div>
      </div>
    );
  }

  // Build step props
  const stepProps = {
    gf, currentRecipient, portal, recipients, rsvpResponses, householdEnabled, showTransport, showAccommodation,
    allowSongRequests, allowMessages, customQuestions, dietaryOptions, allergyLabels, mealOptions, requireMealChoices,
    activeGuestIdx, setActiveGuestIdx, updateGuestField, toggleAllergy, setEventAttendance,
    deadline, deadlinePassed, canSubmit, hasSubmitted, eventFlags,
    householdMembers: recipients,
  } as const;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-foreground-400 mb-1">
          <button onClick={() => navigate(basePath)} className="hover:text-foreground-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Dashboard</button>
          <span>/</span>
          <span className="text-foreground-600 font-medium">RSVP</span>
        </div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mt-2">{hasSubmitted ? 'Your RSVP' : 'RSVP & your details'}</h1>
        {hasSubmitted && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-label">
            <i className="ri-check-double-line" /> Submitted on {new Date(rsvpResponses[currentRecipient.guest_id].submitted_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
        {deadline && (
          <div className={`inline-flex items-center gap-1.5 mt-2 ${hasSubmitted ? 'ml-2' : ''} px-3 py-1 rounded-full text-xs font-label ${deadlinePassed ? 'bg-rose-50 text-rose-600' : 'bg-secondary-100 text-foreground-600'}`}>
            <i className={`${deadlinePassed ? 'ri-error-warning-line' : 'ri-calendar-line'} text-xs`} />
            {deadlinePassed ? 'Deadline passed — ' : 'Respond by '}{deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
        {!canSubmit && !hasSubmitted && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700"><i className="ri-error-warning-line mr-1.5" />The RSVP deadline has passed. Please contact the couple directly.</div>
        )}
      </div>

      {/* Progress stepper */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-2">
        {visibleSteps.map((s, i) => (
          <button key={s.key} onClick={() => goToStep(i)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${i === step ? 'bg-primary-500 text-white' : i < step ? 'bg-primary-50 text-primary-600' : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200'}`}>
            {i < step ? <i className="ri-check-line text-xs" /> : <span className="text-[10px]">{i + 1}</span>}{s.label}
          </button>
        ))}
      </div>

      {/* Household tabs */}
      {currentStepKey === 'household' && recipients.length > 1 && (
        <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1">
          {recipients.map((r, i) => (
            <button key={r.guest_id} onClick={() => setActiveGuestIdx(i)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${i === activeGuestIdx ? 'bg-accent-100 text-accent-700 border border-accent-200' : 'bg-secondary-50 text-foreground-500 hover:bg-secondary-100'}`}>
              <span className="w-5 h-5 rounded-full bg-background-50 flex items-center justify-center text-[10px]">{(r.preferred_name || r.guest_name).charAt(0)}</span>
              {r.preferred_name || r.guest_name}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {submitStatus === 'error' && serverError && (
        <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-sm text-rose-700">
          <i className="ri-error-warning-line flex-shrink-0 mt-0.5" /><span>{serverError}</span>
          <button onClick={() => { setServerError(''); setSubmitStatus('idle'); }} className="ml-auto flex-shrink-0 cursor-pointer text-rose-400 hover:text-rose-600"><i className="ri-close-line" /></button>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-secondary-100 p-6 md:p-8">
        {currentStepKey === 'welcome' && <WelcomeStep {...stepProps} />}
        {currentStepKey === 'household' && <HouseholdStep {...stepProps} forms={forms} />}
        {currentStepKey === 'attendance' && <AttendanceStep {...stepProps} canEdit={canEdit} />}
        {currentStepKey === 'events' && isAttending && <EventsStep {...stepProps} />}
        {currentStepKey === 'meals' && isAttending && <MealsStep {...stepProps} />}
        {currentStepKey === 'requirements' && isAttending && <RequirementsStep {...stepProps} />}
        {currentStepKey === 'travel' && isAttending && <TravelStep {...stepProps} hasPlusOne={hasPlusOne} />}
        {currentStepKey === 'extras' && isAttending && <ExtrasStep {...stepProps} />}
        {currentStepKey === 'review' && <ReviewStep {...stepProps} hasPlusOne={hasPlusOne} allowRsvpUpdates={allowRsvpUpdates} />}

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-secondary-100 flex items-center justify-between">
          <button onClick={() => step > 0 ? goToStep(step - 1) : navigate(basePath)} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line mr-1" />{step === 0 ? 'Dashboard' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {!canSubmit && !hasSubmitted ? (
              <button onClick={() => navigate(basePath)} className="px-5 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Back to dashboard</button>
            ) : step < visibleSteps.length - 1 ? (
              <button onClick={() => goToStep(step + 1)} className="px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                {currentStepKey === 'welcome' ? 'Get started' : 'Next'} <i className="ri-arrow-right-line ml-1" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => handleSubmit(true)} disabled={submitStatus === 'submitting'} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {submitStatus === 'submitting' ? <><i className="ri-loader-4-line animate-spin mr-1" />Saving...</> : 'Save draft'}
                </button>
                <button onClick={() => handleSubmit(false)} disabled={submitStatus === 'submitting'} className="px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
                  {submitStatus === 'submitting' ? <><i className="ri-loader-4-line animate-spin mr-1.5" />Submitting...</> : <><i className="ri-check-double-line mr-1.5" />Submit RSVP</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-foreground-400">Your RSVP data is shared only with the couple. Allergy and accessibility information is marked as sensitive.</p>

      {/* ── Navigation-blocker confirmation dialog ── */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="rsvp-leave-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => blocker.reset?.()} />
          <div className="relative bg-white rounded-2xl border border-secondary-100 p-6 md:p-8 max-w-md w-full shadow-lg">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
              <i className="ri-error-warning-line text-2xl" />
            </div>
            <h3 id="rsvp-leave-title" className="font-heading text-lg text-foreground-900 text-center mb-2">Leave without saving?</h3>
            <p className="text-sm text-foreground-500 text-center mb-6">You have unsaved changes to your RSVP. If you leave now, your changes will be lost.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => { clearDirty(); blocker.proceed?.(); }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-label font-medium hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Leave page
              </button>
              <button
                onClick={() => blocker.reset?.()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Demo Mode ──

const DEMO_STEPS = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'events', label: 'Events' },
  { key: 'meal', label: 'Meal' },
  { key: 'plusone', label: 'Plus-one' },
  { key: 'review', label: 'Review' },
];

const MEAL_OPTIONS = ['Roast chicken', 'Seasonal vegetarian', 'Vegan garden plate', "Children's meal"];

function DemoRSVPPage() {
  const navigate = useNavigate();
  const { accessId } = useParams<{ accessId: string }>();
  const demo = useDemoDataSafe();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const state = demo?.state;
  const guestObj = state?.guests.find((g) => g.id === 'demo-guest-oliver') || null;

  const [form, setForm] = useState<{
    response_status: 'accepted' | 'declined' | 'pending';
    ceremony_attending: boolean;
    reception_attending: boolean;
    evening_attending: boolean;
    meal_choice: string;
    dietary_requirements: string;
    allergy_notes: string;
    accessibility_notes: string;
    plus_one_confirmed: boolean;
    plus_one_name: string;
    message: string;
    song_request: string;
  }>(() => ({
    response_status: (guestObj?.rsvp_status === 'accepted' ? 'accepted' : guestObj?.rsvp_status === 'declined' ? 'declined' : 'pending'),
    ceremony_attending: guestObj?.rsvp_ceremony_attending ?? (state?.invitationRecipients.find((r) => r.guest_id === 'demo-guest-oliver')?.ceremony_included ?? true),
    reception_attending: guestObj?.rsvp_reception_attending ?? (state?.invitationRecipients.find((r) => r.guest_id === 'demo-guest-oliver')?.reception_included ?? true),
    evening_attending: guestObj?.rsvp_evening_attending ?? (state?.invitationRecipients.find((r) => r.guest_id === 'demo-guest-oliver')?.evening_included ?? true),
    meal_choice: guestObj?.meal_choice || '',
    dietary_requirements: guestObj?.dietary_requirements || '',
    allergy_notes: guestObj?.allergy_notes || '',
    accessibility_notes: guestObj?.accessibility_notes || '',
    plus_one_confirmed: guestObj?.rsvp_plus_one_confirmed ?? false,
    plus_one_name: guestObj?.plus_one_name || '',
    message: guestObj?.rsvp_message || '',
    song_request: guestObj?.rsvp_song_request || '',
  }));

  // ── Unsaved-change guard ──
  const [isDemoDirty, setIsDemoDirty] = useState(false);
  const isDemoDirtyRef = useRef(false);

  const markDemoDirty = useCallback(() => {
    if (!isDemoDirtyRef.current) {
      isDemoDirtyRef.current = true;
      setIsDemoDirty(true);
    }
  }, []);

  const clearDemoDirty = useCallback(() => {
    isDemoDirtyRef.current = false;
    setIsDemoDirty(false);
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDemoDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const demoBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDemoDirty && currentLocation.pathname !== nextLocation.pathname
  );

  if (!demo || !state) {
    return (<div className="max-w-2xl mx-auto px-4 py-16 text-center"><div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-6"><i className="ri-error-warning-line text-3xl" /></div><h1 className="font-heading text-2xl text-foreground-900 mb-3">Demo Not Available</h1><p className="text-sm text-foreground-500">Demo mode must be active to use this page.</p></div>);
  }

  if (!guestObj) {
    return (<div className="max-w-2xl mx-auto px-4 py-16 text-center"><p className="text-sm text-red-600">Oliver Bennett not found in demo data.</p></div>);
  }

  const { submitDemoRsvp } = demo;
  const basePath = `/guest/${accessId}`;
  const guest = guestObj;
  const invitation = state.invitations.find((i) => i.id === 'demo-inv-bennett');
  const recip = state.invitationRecipients.find((r) => r.guest_id === 'demo-guest-oliver');
  const alreadySubmitted = !!guest.rsvp_submitted_at;
  const update = (field: string, value: unknown) => { markDemoDirty(); setForm((prev) => ({ ...prev, [field]: value })); };
  const isAttending = form.response_status === 'accepted';
  const hasPlusOne = recip?.plus_one_allowed ?? false;
  const deadline = invitation?.rsvp_deadline ? new Date(invitation.rsvp_deadline) : null;
  const showCeremony = recip?.ceremony_included ?? false;
  const showReception = recip?.reception_included ?? false;
  const showEvening = recip?.evening_included ?? false;
  const dateDisplay = state.wedding.wedding_date ? new Date(state.wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const visibleSteps = DEMO_STEPS.filter((s) => {
    if (s.key === 'events') return isAttending;
    if (s.key === 'meal') return isAttending;
    if (s.key === 'plusone') return isAttending && hasPlusOne;
    return true;
  });

  const handleSubmit = async () => {
    setSubmitting(true); setServerError('');
    if (isAttending && !form.ceremony_attending && !form.reception_attending && !form.evening_attending) {
      setServerError('Please select at least one event you plan to attend.'); setSubmitting(false); return;
    }
    await new Promise((r) => setTimeout(r, 1000));
    submitDemoRsvp('demo-guest-oliver', {
      response_status: form.response_status as 'accepted' | 'declined',
      ceremony_attending: form.ceremony_attending, reception_attending: form.reception_attending, evening_attending: form.evening_attending,
      meal_choice: form.meal_choice, dietary_requirements: form.dietary_requirements, allergy_notes: form.allergy_notes,
      accessibility_notes: form.accessibility_notes, plus_one_confirmed: form.plus_one_confirmed, plus_one_name: form.plus_one_name,
      message: form.message, song_request: form.song_request,
    });
    clearDemoDirty();
    setSubmitting(false);
    navigate(`${basePath}/rsvp/confirmation`);
  };

  const goToStep = (s: number) => { setStep(s); setServerError(''); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-foreground-400 mb-1"><button onClick={() => navigate(basePath)} className="hover:text-foreground-600 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" />Dashboard</button><span>/</span><span className="text-foreground-600 font-medium">RSVP</span></div>
        <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mt-2">{alreadySubmitted ? 'Your RSVP' : 'RSVP to the wedding'}</h1>
        <p className="text-sm text-foreground-500 mt-1">For {guest.preferred_name} {guest.last_name}</p>
        {alreadySubmitted && <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-label"><i className="ri-check-double-line" /> Submitted on {new Date(guest.rsvp_submitted_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
        {deadline && <div className="inline-flex items-center gap-1.5 mt-2 ml-2 px-3 py-1 rounded-full bg-secondary-100 text-foreground-600 text-xs font-label"><i className="ri-calendar-line text-xs" />Respond by {deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
      </div>

      <div className="mb-8 flex items-center gap-1 overflow-x-auto pb-2">
        {visibleSteps.map((s, i) => (<button key={s.key} onClick={() => goToStep(i)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${i === step ? 'bg-primary-500 text-white' : i < step ? 'bg-primary-50 text-primary-600' : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200'}`}>{i < step ? <i className="ri-check-line text-xs" /> : <span className="text-[10px]">{i + 1}</span>}{s.label}</button>))}
      </div>

      <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-label"><i className="ri-shield-check-line" /> Demo Guest View</div>

      {serverError && (<div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-sm text-rose-700"><i className="ri-error-warning-line flex-shrink-0 mt-0.5" /><span>{serverError}</span><button onClick={() => setServerError('')} className="ml-auto flex-shrink-0 cursor-pointer text-rose-400 hover:text-rose-600"><i className="ri-close-line" /></button></div>)}

      <div className="bg-white rounded-2xl border border-secondary-100 p-6 md:p-8">
        {visibleSteps[step]?.key === 'welcome' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-5"><i className="ri-heart-2-line text-4xl" /></div>
              <p className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">{state.wedding.partner_one_name} <span className="text-xl font-light">&amp;</span> {state.wedding.partner_two_name}</p>
              <p className="text-sm text-foreground-500 mt-1">{dateDisplay}</p>
              {state.venues.find((v) => v.venue_type === 'ceremony')?.name && <p className="text-sm text-foreground-400 mt-1">{state.venues.find((v) => v.venue_type === 'ceremony')?.name} &bull; {state.venues.find((v) => v.venue_type === 'reception')?.name}</p>}
              {deadline && <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-100 text-foreground-700 text-xs font-label"><i className="ri-calendar-line" />Kindly respond by {deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>}
            </div>
            <div className="flex justify-center"><button onClick={() => goToStep(1)} className="px-8 py-3 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">Respond to invitation <i className="ri-arrow-right-line ml-2" /></button></div>
          </div>
        )}

        {visibleSteps[step]?.key === 'attendance' && (
          <div className="space-y-5">
            <div><h2 className="font-heading text-lg text-foreground-900">Will you be joining Emma &amp; James?</h2><p className="text-sm text-foreground-500 mt-1">Responding for: <strong>{guest.preferred_name} {guest.last_name}</strong></p></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: 'accepted' as const, label: 'Joyfully accept', icon: 'ri-check-line', desc: 'I would love to attend' },
                { value: 'declined' as const, label: 'Regretfully decline', icon: 'ri-close-line', desc: 'I cannot make it' },
              ].map((opt) => {
                const isActive = form.response_status === opt.value;
                return (
                  <button key={opt.value} onClick={() => update('response_status', opt.value)} className={`flex items-center gap-3 px-5 py-4 rounded-xl border text-sm font-label transition-all cursor-pointer ${isActive ? (opt.value === 'accepted' ? 'bg-emerald-50 border-emerald-300 text-emerald-700 border-2' : 'bg-rose-50 border-rose-300 text-rose-700 border-2') : 'border-secondary-100 text-foreground-500 hover:border-secondary-300 bg-background-50'}`}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? (opt.value === 'accepted' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-secondary-100 text-foreground-400'}`}><i className={`${opt.icon} text-sm`} /></span>
                    <div className="text-left"><p className="font-medium text-foreground-800">{opt.label}</p><p className="text-xs text-foreground-400 mt-0.5">{opt.desc}</p></div>
                  </button>
                );
              })}
            </div>
            {form.response_status === 'declined' && <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100"><p className="text-xs text-amber-700">You can leave an optional message for the couple on the review screen.</p></div>}
          </div>
        )}

        {visibleSteps[step]?.key === 'events' && isAttending && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg text-foreground-900">Which events will you attend?</h2>
            <p className="text-sm text-foreground-500">Select the events you plan to join. At least one is required.</p>
            <div className="space-y-2">
              {[{ key: 'ceremony', show: showCeremony, label: 'Wedding Ceremony', time: '1:00 PM', venue: state.venues.find((v) => v.venue_type === 'ceremony')?.name || "St Mary's Church" },
                { key: 'reception', show: showReception, label: 'Wedding Breakfast & Reception', time: '3:00 PM', venue: state.venues.find((v) => v.venue_type === 'reception')?.name || 'The Orangery' },
                { key: 'evening', show: showEvening, label: 'Evening Celebration', time: '7:00 PM', venue: state.venues.find((v) => v.venue_type === 'reception')?.name || 'The Orangery' }]
                .filter((e) => e.show).map((e) => {
                  const checked = (form as unknown as Record<string, boolean>)[`${e.key}_attending`];
                  return (
                    <label key={e.key} className="flex items-center gap-3 p-4 rounded-xl border border-secondary-100 bg-background-50 hover:border-secondary-200 cursor-pointer transition-colors">
                      <input type="checkbox" checked={checked} onChange={(ev) => update(`${e.key}_attending`, ev.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 accent-primary-500 cursor-pointer" />
                      <div><span className="text-sm font-label text-foreground-800">{e.label}</span><p className="text-xs text-foreground-400">{e.venue} &middot; {e.time}</p></div>
                    </label>
                  );
                })}
            </div>
          </div>
        )}

        {visibleSteps[step]?.key === 'meal' && isAttending && (
          <div className="space-y-5">
            <div><h2 className="font-heading text-lg text-foreground-900">Meal choice</h2><p className="text-sm text-foreground-500">Please select your preference for the wedding breakfast.</p></div>
            <div className="space-y-2">{MEAL_OPTIONS.map((meal) => (
              <label key={meal} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.meal_choice === meal ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}>
                <input type="radio" name="meal" value={meal} checked={form.meal_choice === meal} onChange={(e) => update('meal_choice', e.target.value)} className="w-4 h-4 accent-primary-500 cursor-pointer" />
                <span className="text-sm text-foreground-700">{meal}</span>
              </label>
            ))}</div>
            <div className="pt-4 border-t border-secondary-100"><label className="block text-sm font-label font-medium text-foreground-700 mb-2">Dietary requirements</label><textarea value={form.dietary_requirements} onChange={(e) => update('dietary_requirements', e.target.value)} placeholder="Any dietary preferences or requirements..." rows={2} maxLength={300} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none" /><p className="text-[10px] text-foreground-300 mt-1 text-right">{form.dietary_requirements.length}/300</p></div>
            <div><label className="block text-sm font-label font-medium text-foreground-700 mb-2">Food allergies <span className="text-xs text-rose-400 font-normal">(sensitive)</span></label><textarea value={form.allergy_notes} onChange={(e) => update('allergy_notes', e.target.value)} placeholder="Please list any food allergies and their severity..." rows={2} maxLength={300} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none" /></div>
            <div><label className="block text-sm font-label font-medium text-foreground-700 mb-2">Accessibility requirements</label><textarea value={form.accessibility_notes} onChange={(e) => update('accessibility_notes', e.target.value)} placeholder="Any accessibility or mobility needs..." rows={2} maxLength={300} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none" /></div>
          </div>
        )}

        {visibleSteps[step]?.key === 'plusone' && isAttending && hasPlusOne && (
          <div className="space-y-5">
            <div><h2 className="font-heading text-lg text-foreground-900">Your plus-one</h2><p className="text-sm text-foreground-500">You have been invited to bring a guest.</p></div>
            <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${form.plus_one_confirmed ? 'border-primary-300 bg-primary-50' : 'border-secondary-100 bg-background-50 hover:border-secondary-200'}`}><input type="checkbox" checked={form.plus_one_confirmed} onChange={(e) => update('plus_one_confirmed', e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 accent-primary-500 cursor-pointer" /><span className="text-sm font-label text-foreground-800">I will bring my invited plus-one</span></label>
            {form.plus_one_confirmed && (<div className="pl-7"><label className="block text-sm font-label font-medium text-foreground-700 mb-1">Plus-one name</label><input type="text" value={form.plus_one_name} onChange={(e) => update('plus_one_name', e.target.value)} placeholder="Enter their full name" className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors" />{!form.plus_one_name && <p className="text-xs text-foreground-400 mt-1">Suggested: {guest.plus_one_name || "Your guest's name"}</p>}</div>)}
          </div>
        )}

        {visibleSteps[step]?.key === 'review' && (
          <div className="space-y-5">
            <h2 className="font-heading text-lg text-foreground-900">Review your response</h2>
            <p className="text-sm text-foreground-500">Please review before submitting.</p>
            <div className="bg-background-50 rounded-xl p-5 space-y-4">
              <div><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Attendance</p><p className={`text-sm font-medium mt-1 ${form.response_status === 'accepted' ? 'text-emerald-700' : 'text-rose-700'}`}>{form.response_status === 'accepted' ? '✦ Joyfully attending' : '✦ Regretfully declined'}</p></div>
              {isAttending && (<>
                <div className="pt-3 border-t border-secondary-200"><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Events attending</p><div className="mt-1 space-y-1">{showCeremony && <p className="text-sm text-foreground-700"><i className={`${form.ceremony_attending ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'} mr-1.5 text-sm`} />Wedding Ceremony</p>}{showReception && <p className="text-sm text-foreground-700"><i className={`${form.reception_attending ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'} mr-1.5 text-sm`} />Wedding Breakfast</p>}{showEvening && <p className="text-sm text-foreground-700"><i className={`${form.evening_attending ? 'ri-checkbox-circle-fill text-emerald-500' : 'ri-checkbox-blank-circle-line text-foreground-300'} mr-1.5 text-sm`} />Evening Celebration</p>}</div></div>
                <div className="pt-3 border-t border-secondary-200"><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Meal</p><p className="text-sm text-foreground-700 mt-1">{form.meal_choice || 'Not selected'}</p></div>
                {form.dietary_requirements && <div><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Dietary</p><p className="text-sm text-foreground-700 mt-1">{form.dietary_requirements}</p></div>}
                {form.allergy_notes && <div><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Allergies <span className="text-rose-500 bg-rose-50 px-1 py-0.5 rounded text-[10px]">Sensitive</span></p><p className="text-sm text-foreground-700 mt-1">{form.allergy_notes}</p></div>}
                {form.accessibility_notes && <div><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Accessibility</p><p className="text-sm text-foreground-700 mt-1">{form.accessibility_notes}</p></div>}
                {hasPlusOne && <div className="pt-3 border-t border-secondary-200"><p className="text-xs font-label text-foreground-400 uppercase tracking-wider">Plus-one</p><p className="text-sm text-foreground-700 mt-1">{form.plus_one_confirmed ? `Bringing ${form.plus_one_name || guest.plus_one_name || 'guest'}` : 'Attending alone'}</p></div>}
              </>)}
              <div className="pt-3 border-t border-secondary-200"><label className="block text-xs font-label text-foreground-400 uppercase tracking-wider mb-1">Optional message</label><textarea value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="A few words for Emma & James..." rows={2} maxLength={500} className="w-full px-3 py-2 rounded-lg border border-secondary-200 bg-white text-sm text-foreground-900 placeholder:text-foreground-300 focus:outline-none focus:border-primary-300 transition-colors resize-none" /></div>
            </div>
            <p className="text-xs text-foreground-400 italic">Your response is shared with the couple. You can update it until the RSVP deadline.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-secondary-100 flex items-center justify-between">
          <button onClick={() => step > 0 ? goToStep(step - 1) : navigate(basePath)} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"><i className="ri-arrow-left-line mr-1" /> {step === 0 ? 'Dashboard' : 'Back'}</button>
          <div className="flex items-center gap-2">
            {step < visibleSteps.length - 1 ? (
              <button onClick={() => goToStep(step + 1)} disabled={!form.response_status || form.response_status === 'pending'} className="px-5 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">Continue <i className="ri-arrow-right-line ml-1" /></button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || form.response_status === 'pending'} className="px-6 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">{submitting ? <><i className="ri-loader-4-line animate-spin mr-1.5" /> Submitting...</> : <><i className="ri-check-double-line mr-1.5" /> Submit RSVP</>}</button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-foreground-400">Demo mode — your response is saved on this device only.</p>

      {/* ── Navigation-blocker confirmation dialog ── */}
      {demoBlocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="demo-rsvp-leave-title">
          <div className="absolute inset-0 bg-black/40" onClick={() => demoBlocker.reset?.()} />
          <div className="relative bg-white rounded-2xl border border-secondary-100 p-6 md:p-8 max-w-md w-full shadow-lg">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
              <i className="ri-error-warning-line text-2xl" />
            </div>
            <h3 id="demo-rsvp-leave-title" className="font-heading text-lg text-foreground-900 text-center mb-2">Leave without saving?</h3>
            <p className="text-sm text-foreground-500 text-center mb-6">You have unsaved changes to your RSVP. If you leave now, your changes will be lost.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => { clearDemoDirty(); demoBlocker.proceed?.(); }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-label font-medium hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Leave page
              </button>
              <button
                onClick={() => demoBlocker.reset?.()}
                className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RSVPPage() {
  if (isDemoMode) return <DemoRSVPPage />;
  return <NormalRSVPPage />;
}