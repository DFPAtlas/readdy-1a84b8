import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import InvitationRenderer from './InvitationRenderer';
import type { InvitationDocument, PreviewDevice } from '../types';
import type { VerifiedSender } from '../senderService';
import { formatSenderDisplay } from '../senderService';

// ── Types ──

export interface SendFormState {
  senderId: string;
  recipients: string[];
  subject: string;
  message: string;
  mode: 'now' | 'scheduled';
  scheduledFor: string | null;
  timezone: string;
}

export type SubmissionState = 'idle' | 'saving' | 'submitting' | 'success' | 'error';

export interface SubmissionResult {
  acceptedCount: number;
  rejectedCount: number;
  mode: 'now' | 'scheduled';
  error?: string;
}

interface SendPanelProps {
  document: InvitationDocument;
  assetLookup?: Map<string, string>;
  verifiedSenders: VerifiedSender[];
  sendersLoading: boolean;
  sendersError: string | null;
  onRetrySenders: () => void;
  onSend: (data: SendFormState) => Promise<void>;
  submissionState: SubmissionState;
  submissionResult: SubmissionResult | null;
  onDismissResult: () => void;
}

// ── Email validation ──

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_RECIPIENTS = 100;
const MAX_SUBJECT_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 2000;

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── Parse pasted text into email array ──

function parsePastedEmails(text: string): string[] {
  const parts = text.split(/[,;\s\n\r]+/);
  const emails: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && trimmed.includes('@') && isValidEmail(trimmed)) {
      emails.push(normalizeEmail(trimmed));
    }
  }
  return [...new Set(emails)];
}

// ── Component ──

export default function SendPanel({
  document,
  assetLookup,
  verifiedSenders,
  sendersLoading,
  sendersError,
  onRetrySenders,
  onSend,
  submissionState,
  submissionResult,
  onDismissResult,
}: SendPanelProps) {
  // ── Preview device ──
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');

  // ── Form state ──
  const [senderId, setSenderId] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'now' | 'scheduled'>('now');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('');
  const [scheduledForISO, setScheduledForISO] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Default timezone ──

  useEffect(() => {
    try {
      setScheduleTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setScheduleTimezone('UTC');
    }
  }, []);

  // ── Auto-select first verified sender ──

  useEffect(() => {
    if (verifiedSenders.length > 0 && !senderId) {
      setSenderId(verifiedSenders[0].id);
    }
  }, [verifiedSenders, senderId]);

  // ── Clear sender if it becomes invalid ──

  useEffect(() => {
    if (senderId && verifiedSenders.length > 0) {
      const stillValid = verifiedSenders.some((s) => s.id === senderId);
      if (!stillValid) {
        setSenderId(verifiedSenders[0]?.id || '');
      }
    }
  }, [verifiedSenders, senderId]);

  // ── Scale ──

  const scale = previewDevice === 'desktop' ? 0.42 : 0.28;

  // ── Can send check ──

  const hasSenders = verifiedSenders.length > 0;
  const canSend = useMemo(() => {
    return (
      senderId !== '' &&
      recipients.length > 0 &&
      subject.trim() !== '' &&
      !emailError &&
      submissionState === 'idle' &&
      hasSenders
    );
  }, [senderId, recipients, subject, emailError, submissionState, hasSenders]);

  const isBusy = submissionState === 'saving' || submissionState === 'submitting';

  // ── Add recipient ──

  const addRecipients = useCallback(
    (emails: string[]) => {
      if (emails.length === 0) return;
      setRecipients((prev) => {
        const existing = new Set(prev.map(normalizeEmail));
        const newEmails: string[] = [];
        const rejected: string[] = [];

        for (const email of emails) {
          const normalized = normalizeEmail(email);
          if (isValidEmail(normalized)) {
            if (existing.has(normalized)) {
              rejected.push(email);
            } else if (prev.length + newEmails.length >= MAX_RECIPIENTS) {
              rejected.push(email);
            } else {
              existing.add(normalized);
              newEmails.push(normalized);
            }
          } else {
            rejected.push(email);
          }
        }

        if (rejected.length > 0) {
          setEmailError(`${rejected.length} address(es) rejected (invalid, duplicate, or limit reached)`);
          // Clear error after a few seconds
          setTimeout(() => setEmailError(null), 4000);
        }

        return [...prev, ...newEmails];
      });
      setCurrentEmail('');
    },
    [],
  );

  // ── Remove recipient ──

  const removeRecipient = useCallback((email: string) => {
    setRecipients((prev) => prev.filter((e) => normalizeEmail(e) !== normalizeEmail(email)));
  }, []);

  // ── Key handlers ──

  const handleCurrentKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
        e.preventDefault();
        const trimmed = currentEmail.trim();
        if (trimmed) {
          addRecipients([trimmed]);
        }
      } else if (e.key === 'Backspace' && currentEmail === '' && recipients.length > 0) {
        removeRecipient(recipients[recipients.length - 1]);
      }
    },
    [currentEmail, recipients, addRecipients, removeRecipient],
  );

  // ── Blur commits pending email ──

  const handleBlur = useCallback(() => {
    const trimmed = currentEmail.trim();
    if (trimmed) {
      addRecipients([trimmed]);
    }
  }, [currentEmail, addRecipients]);

  // ── Paste handler ──

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData('text');
      if (pasted && (pasted.includes(',') || pasted.includes(';') || pasted.includes('\n') || pasted.includes('@'))) {
        e.preventDefault();
        const emails = parsePastedEmails(pasted);
        if (emails.length > 0) {
          addRecipients(emails);
        }
      }
    },
    [addRecipients],
  );

  // ── Schedule validation ──

  const validateSchedule = useCallback((): boolean => {
    setScheduleError(null);

    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Please select both date and time');
      return false;
    }

    const localDateStr = `${scheduleDate}T${scheduleTime}:00`;
    const localDate = new Date(localDateStr);

    if (isNaN(localDate.getTime())) {
      setScheduleError('Invalid date or time');
      return false;
    }

    const now = new Date();
    const minTime = new Date(now.getTime() + 5 * 60 * 1000);
    if (localDate < minTime) {
      setScheduleError('Must be at least 5 minutes from now');
      return false;
    }

    const maxTime = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (localDate > maxTime) {
      setScheduleError('Cannot schedule more than 12 months ahead');
      return false;
    }

    // Convert to ISO UTC
    const isoString = localDate.toISOString();
    setScheduledForISO(isoString);
    return true;
  }, [scheduleDate, scheduleTime]);

  // ── Send now ──

  const handleSendNow = useCallback(() => {
    if (!canSend) return;

    const timezone = scheduleTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const formData: SendFormState = {
      senderId,
      recipients,
      subject: subject.trim(),
      message: message.trim(),
      mode: 'now',
      scheduledFor: null,
      timezone,
    };

    onSend(formData);
  }, [canSend, senderId, recipients, subject, message, scheduleTimezone, onSend]);

  // ── Schedule submit ──

  const handleScheduleSubmit = useCallback(() => {
    if (!validateSchedule()) return;
    if (!canSend) return;

    const formData: SendFormState = {
      senderId,
      recipients,
      subject: subject.trim(),
      message: message.trim(),
      mode: 'scheduled',
      scheduledFor: scheduledForISO,
      timezone: scheduleTimezone,
    };

    onSend(formData);
  }, [canSend, senderId, recipients, subject, message, scheduleTimezone, scheduledForISO, validateSchedule, onSend]);

  // ── Format schedule confirmation ──

  const scheduleConfirmation = useMemo(() => {
    if (!scheduledForISO) return '';
    try {
      const d = new Date(scheduledForISO);
      return d.toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: scheduleTimezone,
      });
    } catch {
      return '';
    }
  }, [scheduledForISO, scheduleTimezone]);

  // ── Today's date string for min on inputs ──

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  // ── Render ──

  return (
    <div className="w-[300px] bg-white border-l border-[#eee7df] flex flex-col flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#eee7df]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#f5efe0]">
            <i className="ri-mail-send-line text-[#b8925a] text-lg" />
          </div>
          <div>
            <h3 className="font-label text-sm font-semibold text-foreground-900">
              Send Invitation
            </h3>
            <p className="text-[11px] text-foreground-400 mt-0.5">
              Preview and send to your guests
            </p>
          </div>
        </div>

        {/* Device toggle */}
        <div className="flex items-center gap-1 mt-3 bg-background-50 rounded-lg p-1">
          <button
            onClick={() => setPreviewDevice('desktop')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
              previewDevice === 'desktop'
                ? 'bg-white text-foreground-900 shadow-sm'
                : 'text-foreground-400 hover:text-foreground-600'
            }`}
          >
            <i className="ri-computer-line text-sm" />
            Desktop
          </button>
          <button
            onClick={() => setPreviewDevice('mobile')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
              previewDevice === 'mobile'
                ? 'bg-white text-foreground-900 shadow-sm'
                : 'text-foreground-400 hover:text-foreground-600'
            }`}
          >
            <i className="ri-smartphone-line text-sm" />
            Mobile
          </button>
        </div>
      </div>

      {/* Live mini-preview */}
      <div className="p-4 border-b border-[#eee7df] flex-shrink-0">
        {previewDevice === 'desktop' ? (
          <div className="bg-[#f5efe0] rounded-lg p-3 flex items-center justify-center">
            <InvitationRenderer
              document={document}
              scale={scale}
              assetLookup={assetLookup}
              interactive={false}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="bg-[#1a1a1a] rounded-[24px] p-2.5 shadow-lg">
              <div className="bg-[#f5efe0] rounded-[16px] p-2 flex items-center justify-center">
                <InvitationRenderer
                  document={document}
                  scale={scale}
                  assetLookup={assetLookup}
                  interactive={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form fields — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* From */}
        <div>
          <label className="block text-[11px] font-label font-medium text-foreground-600 mb-1.5">
            From
          </label>
          {sendersLoading ? (
            <div className="h-[36px] flex items-center px-3 border border-secondary-200 rounded-md bg-background-50">
              <i className="ri-loader-4-line animate-spin text-xs text-foreground-400 mr-2" />
              <span className="text-xs text-foreground-400">Loading senders…</span>
            </div>
          ) : sendersError ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-red-500 flex-1 truncate">{sendersError}</span>
              <button
                onClick={onRetrySenders}
                className="text-[11px] text-primary-600 cursor-pointer whitespace-nowrap hover:underline"
              >
                Retry
              </button>
            </div>
          ) : verifiedSenders.length > 0 ? (
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="input-field text-xs py-2"
              disabled={isBusy}
            >
              {verifiedSenders.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatSenderDisplay(s)}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
              <p className="text-[11px] text-amber-700 mb-1 font-medium">
                No verified sender addresses
              </p>
              <p className="text-[10px] text-amber-600">
                Verify an email address in your account settings to start sending invitations.
              </p>
            </div>
          )}
        </div>

        {/* To — email chip input */}
        <div>
          <label className="block text-[11px] font-label font-medium text-foreground-600 mb-1.5">
            To
            {recipients.length > 0 && (
              <span className="text-foreground-400 ml-1">({recipients.length})</span>
            )}
          </label>
          <div
            className={`flex flex-wrap items-center gap-1.5 p-2 border rounded-md bg-white min-h-[38px] transition-colors ${
              isBusy
                ? 'border-secondary-200 bg-background-50'
                : 'border-secondary-200 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-200/50'
            }`}
          >
            {recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-[11px] font-label"
              >
                {email}
                <button
                  onClick={() => removeRecipient(email)}
                  disabled={isBusy}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-200 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove ${email}`}
                >
                  <i className="ri-close-line text-[10px]" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              type="email"
              value={currentEmail}
              onChange={(e) => {
                setCurrentEmail(e.target.value);
                setEmailError(null);
              }}
              onKeyDown={handleCurrentKeyDown}
              onBlur={handleBlur}
              onPaste={handlePaste}
              disabled={isBusy}
              placeholder={recipients.length === 0 ? 'Enter email and press Enter' : ''}
              className="flex-1 min-w-[80px] border-none outline-none bg-transparent text-xs text-foreground-800 font-label placeholder:text-foreground-400 py-0.5 disabled:text-foreground-400"
            />
          </div>
          {emailError && (
            <p className="text-[10px] text-amber-600 mt-1">{emailError}</p>
          )}
          {recipients.length >= MAX_RECIPIENTS && (
            <p className="text-[10px] text-foreground-400 mt-1">
              Maximum {MAX_RECIPIENTS} recipients reached
            </p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[11px] font-label font-medium text-foreground-600 mb-1.5">
            Subject
            <span className="text-foreground-400 ml-1">
              ({subject.length}/{MAX_SUBJECT_LENGTH})
            </span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, MAX_SUBJECT_LENGTH))}
            disabled={isBusy}
            placeholder="e.g. You're invited to our wedding"
            className="input-field text-xs py-2 disabled:bg-background-50 disabled:text-foreground-400"
          />
          {subject.length >= MAX_SUBJECT_LENGTH && (
            <p className="text-[10px] text-amber-600 mt-1">Character limit reached</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label className="block text-[11px] font-label font-medium text-foreground-600 mb-1.5">
            Message
            <span className="text-foreground-400 ml-1">(optional, {message.length}/{MAX_MESSAGE_LENGTH})</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            disabled={isBusy}
            rows={3}
            placeholder="Add a personal message to your guests…"
            className="input-field text-xs py-2 resize-none disabled:bg-background-50 disabled:text-foreground-400"
          />
        </div>

        {/* Submission result */}
        {submissionResult && (
          <div className={`p-3 rounded-md ${
            submissionResult.error
              ? 'bg-red-50 border border-red-200'
              : 'bg-accent-50 border border-accent-200'
          }`}>
            {submissionResult.error ? (
              <>
                <p className="text-[11px] text-red-700 font-medium mb-1">
                  <i className="ri-error-warning-line mr-1" />
                  Couldn't send
                </p>
                <p className="text-[10px] text-red-600">{submissionResult.error}</p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-accent-700 font-medium mb-1">
                  <i className="ri-check-line mr-1" />
                  {submissionResult.mode === 'scheduled' ? 'Scheduled' : 'Queued to send'}
                </p>
                <p className="text-[10px] text-accent-600">
                  {submissionResult.acceptedCount} invitation{submissionResult.acceptedCount !== 1 ? 's' : ''} accepted
                  {submissionResult.rejectedCount > 0 && `, ${submissionResult.rejectedCount} rejected`}
                </p>
              </>
            )}
            <button
              onClick={onDismissResult}
              className="text-[10px] underline mt-1.5 text-foreground-500 hover:text-foreground-700 cursor-pointer whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Schedule expanded area */}
        {scheduleOpen && (
          <div className="p-3 rounded-lg bg-background-50 border border-secondary-200 space-y-3">
            <p className="text-[11px] font-label font-medium text-foreground-700">
              Schedule delivery
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-foreground-500 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={todayStr}
                  className="input-field text-[11px] py-1.5"
                  disabled={isBusy}
                />
              </div>
              <div>
                <label className="block text-[10px] text-foreground-500 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="input-field text-[11px] py-1.5"
                  disabled={isBusy}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-foreground-500 mb-1">Timezone</label>
              <input
                type="text"
                value={scheduleTimezone}
                onChange={(e) => setScheduleTimezone(e.target.value)}
                className="input-field text-[11px] py-1.5"
                disabled={isBusy}
                placeholder="e.g. Europe/London"
              />
            </div>

            {scheduleError && (
              <p className="text-[10px] text-red-500">{scheduleError}</p>
            )}

            {scheduleConfirmation && !scheduleError && (
              <p className="text-[10px] text-foreground-500">
                Scheduled for: {scheduleConfirmation}
              </p>
            )}

            <button
              onClick={handleScheduleSubmit}
              disabled={isBusy || !canSend}
              className="w-full btn-primary text-sm py-2 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-1.5" />
                  {submissionState === 'saving' ? 'Saving…' : 'Scheduling…'}
                </>
              ) : (
                <>
                  <i className="ri-calendar-check-line mr-1.5" />
                  Confirm Schedule
                </>
              )}
            </button>

            <button
              onClick={() => setScheduleOpen(false)}
              disabled={isBusy}
              className="w-full text-[11px] text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={handleSendNow}
            disabled={!canSend || isBusy}
            className="w-full btn-primary text-sm py-2.5 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-1.5" />
                {submissionState === 'saving' ? 'Saving…' : 'Sending…'}
              </>
            ) : (
              <>
                <i className="ri-send-plane-line mr-1.5" />
                Send Invitation
              </>
            )}
          </button>
          {!scheduleOpen && (
            <button
              onClick={() => setScheduleOpen(true)}
              disabled={isBusy || !hasSenders}
              className="w-full btn-ghost text-xs py-2 cursor-pointer whitespace-nowrap text-foreground-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-calendar-line mr-1.5" />
              Schedule for later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}