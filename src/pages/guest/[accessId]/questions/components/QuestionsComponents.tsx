import { useState, useCallback } from 'react';
import type { WeddingFaq, FaqCategory, FaqRelatedLink, GuestQuestion } from '@/types/access';

// ── Category config ──

export const FAQ_CATEGORY_CONFIG: Record<FaqCategory, { label: string; icon: string }> = {
  general: { label: 'General', icon: 'ri-question-line' },
  invitations: { label: 'Invitations', icon: 'ri-mail-send-line' },
  dress_code: { label: 'Dress code', icon: 'ri-t-shirt-line' },
  children: { label: 'Children', icon: 'ri-user-smile-line' },
  plus_ones: { label: 'Plus-ones', icon: 'ri-group-line' },
  travel: { label: 'Travel', icon: 'ri-plane-line' },
  accommodation: { label: 'Accommodation', icon: 'ri-hotel-line' },
  parking: { label: 'Parking', icon: 'ri-car-line' },
  accessibility: { label: 'Accessibility', icon: 'ri-wheelchair-line' },
  food: { label: 'Food &amp; drink', icon: 'ri-restaurant-line' },
  gifts: { label: 'Gifts', icon: 'ri-gift-line' },
  photos: { label: 'Photos', icon: 'ri-camera-line' },
  timings: { label: 'Timings', icon: 'ri-time-line' },
};

// ── FAQ Accordion Card ──

interface FaqCardProps {
  faq: WeddingFaq;
  onFeedback: (faqId: string, type: 'helpful' | 'not_helpful') => void;
  isMutating: boolean;
}

export function FaqCard({ faq, onFeedback, isMutating }: FaqCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleFeedback = useCallback((type: 'helpful' | 'not_helpful') => {
    if (isMutating || faq.my_feedback) return;
    onFeedback(faq.id, type);
  }, [faq.id, faq.my_feedback, isMutating, onFeedback]);

  const category = FAQ_CATEGORY_CONFIG[faq.category] || FAQ_CATEGORY_CONFIG.general;

  return (
    <div className="bg-white rounded-xl border border-secondary-100 overflow-hidden transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <i className={`${category.icon} text-sm text-foreground-500`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-label uppercase tracking-wide text-foreground-400 bg-secondary-50 px-1.5 py-0.5 rounded">
              {category.label}
            </span>
          </div>
          <h3 className="text-sm font-label font-medium text-foreground-900 pr-6">{faq.question}</h3>
        </div>
        <div className="flex-shrink-0">
          <i className={`ri-${expanded ? 'subtract' : 'add'}-line text-foreground-400 text-sm`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-15">
          <div className="pl-11">
            <p className="text-sm text-foreground-600 leading-relaxed mb-4">{faq.answer}</p>

            {/* Related links */}
            {faq.related_links && faq.related_links.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-foreground-400 font-label mb-2">Related</p>
                <div className="flex flex-wrap gap-2">
                  {faq.related_links.map((link: FaqRelatedLink, i: number) => (
                    <a
                      key={i}
                      href={link.url}
                      target={link.type === 'external' ? '_blank' : undefined}
                      rel={link.type === 'external' ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-background-50 border border-secondary-100 text-xs text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <i className={`ri-${link.type === 'external' ? 'external-link' : 'arrow-right'}-line text-[10px]`} />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-secondary-100">
              <span className="text-[10px] text-foreground-400 mr-1">Was this helpful?</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleFeedback('helpful'); }}
                disabled={isMutating || !!faq.my_feedback}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-label transition-colors cursor-pointer whitespace-nowrap ${
                  faq.my_feedback === 'helpful'
                    ? 'bg-accent-50 text-accent-600 border border-accent-200'
                    : 'bg-background-50 text-foreground-500 border border-secondary-100 hover:border-accent-200 hover:text-accent-600'
                }`}
              >
                <i className={`ri-thumb-up-line text-[10px] ${faq.my_feedback === 'helpful' ? '' : ''}`} />
                Yes{faq.helpful_count > 0 ? ` (${faq.helpful_count})` : ''}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleFeedback('not_helpful'); }}
                disabled={isMutating || !!faq.my_feedback}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-label transition-colors cursor-pointer whitespace-nowrap ${
                  faq.my_feedback === 'not_helpful'
                    ? 'bg-secondary-100 text-foreground-600 border border-secondary-200'
                    : 'bg-background-50 text-foreground-500 border border-secondary-100 hover:border-secondary-200 hover:text-foreground-600'
                }`}
              >
                <i className="ri-thumb-down-line text-[10px]" />
                No{faq.not_helpful_count > 0 ? ` (${faq.not_helpful_count})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Category filter pills ──

interface CategoryFiltersProps {
  selected: FaqCategory | 'all';
  onSelect: (cat: FaqCategory | 'all') => void;
  counts: Record<string, number>;
}

export function FaqCategoryFilters({ selected, onSelect, counts }: CategoryFiltersProps) {
  const categories: Array<{ key: FaqCategory | 'all'; label: string; icon: string }> = [
    { key: 'all', label: 'All FAQs', icon: 'ri-question-line' },
    ...Object.entries(FAQ_CATEGORY_CONFIG).map(([key, cfg]) => ({
      key: key as FaqCategory,
      label: cfg.label,
      icon: cfg.icon,
    })),
  ];

  const visible = categories.filter((c) => c.key === 'all' || (counts[c.key] || 0) > 0);

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
      {visible.map((cat) => {
        const count = cat.key === 'all'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : (counts[cat.key] || 0);
        return (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap border ${
              selected === cat.key
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-foreground-600 border-secondary-200 hover:border-secondary-300 hover:text-foreground-900'
            }`}
          >
            <i className={`${cat.icon} text-xs`} />
            {cat.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[22px] text-center ${
              selected === cat.key
                ? 'bg-white/20 text-white'
                : 'bg-secondary-100 text-foreground-500'
            }`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── My Question card (guest-submitted) ──

interface MyQuestionCardProps {
  question: GuestQuestion;
}

export function MyQuestionCard({ question }: MyQuestionCardProps) {
  const category = FAQ_CATEGORY_CONFIG[question.category as FaqCategory] || FAQ_CATEGORY_CONFIG.general;
  const isAnswered = question.status === 'answered';
  const isPending = question.status === 'pending';

  return (
    <div className="bg-white rounded-xl border border-secondary-100 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isAnswered ? 'bg-accent-50 text-accent-500' : isPending ? 'bg-secondary-100 text-foreground-400' : 'bg-secondary-50 text-foreground-400'
        }`}>
          <i className={`ri-${isAnswered ? 'chat-check' : isPending ? 'chat-3' : 'chat-off'}-line text-sm`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-label uppercase tracking-wide text-foreground-400 bg-secondary-50 px-1.5 py-0.5 rounded">
              {category.label}
            </span>
            <span className={`text-[10px] font-label font-medium px-1.5 py-0.5 rounded ${
              isAnswered ? 'bg-accent-50 text-accent-600' : isPending ? 'bg-secondary-100 text-foreground-500' : 'bg-secondary-50 text-foreground-400'
            }`}>
              {isAnswered ? 'Answered' : isPending ? 'Pending' : 'Closed'}
            </span>
          </div>
          <h3 className="text-sm font-label font-medium text-foreground-900 mb-1">{question.subject}</h3>
          <p className="text-xs text-foreground-500 leading-relaxed mb-3">{question.message}</p>

          {isAnswered && question.answer && (
            <div className="bg-secondary-50 rounded-lg p-3 border border-secondary-100">
              <p className="text-xs text-foreground-400 font-label mb-1">Response</p>
              <p className="text-sm text-foreground-700 leading-relaxed">{question.answer}</p>
              {question.answered_at && (
                <p className="text-[10px] text-foreground-400 mt-2">
                  {new Date(question.answered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </div>
        <span className="text-[10px] text-foreground-400 flex-shrink-0">
          {new Date(question.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}

// ── Ask a question form ──

interface AskQuestionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { category: string; subject: string; message: string; preferred_response_method: string }) => void;
  isSubmitting: boolean;
  error: string;
  success: boolean;
}

export function AskQuestionForm({ isOpen, onClose, onSubmit, isSubmitting, error, success }: AskQuestionFormProps) {
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [preferredMethod, setPreferredMethod] = useState('portal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    onSubmit({ category, subject: subject.trim(), message: message.trim(), preferred_response_method: preferredMethod });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-lg border border-secondary-100 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-secondary-100">
            <h2 className="font-heading text-lg font-semibold text-foreground-900">Ask a question</h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer"
            >
              <i className="ri-close-line" />
            </button>
          </div>

          {success ? (
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-accent-50 mb-4">
                <i className="ri-check-line text-2xl text-accent-500" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground-900 mb-2">Question submitted</h3>
              <p className="text-sm text-foreground-500 leading-relaxed mb-4">
                Your question has been sent to the couple. They will respond as soon as they can.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 cursor-pointer"
                >
                  {Object.entries(FAQ_CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 200))}
                  placeholder="What would you like to ask about?"
                  maxLength={200}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
                />
                <p className="text-[10px] text-foreground-400 mt-1">{subject.length}/200</p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  placeholder="Provide as much detail as you can..."
                  maxLength={500}
                  required
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 resize-none"
                />
                <p className="text-[10px] text-foreground-400 mt-1">{message.length}/500</p>
              </div>

              {/* Preferred response method */}
              <div>
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">How should we respond?</label>
                <select
                  value={preferredMethod}
                  onChange={(e) => setPreferredMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 cursor-pointer"
                >
                  <option value="portal">Through the guest portal</option>
                  <option value="email">Email</option>
                  <option value="either">Either is fine</option>
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !subject.trim() || !message.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-sm font-label font-medium text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <i className="ri-loader-4-line animate-spin" /> Submitting...
                    </span>
                  ) : 'Submit question'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// ── Support card ──

interface SupportCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: string;
}

export function SupportCard({ title, description, actionLabel, onAction, icon = 'ri-question-line' }: SupportCardProps) {
  return (
    <div className="bg-white rounded-xl border border-secondary-100 p-5 text-center">
      <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 mb-3">
        <i className={`${icon} text-xl text-primary-500`} />
      </div>
      <h3 className="font-heading text-base font-semibold text-foreground-900 mb-2">{title}</h3>
      <p className="text-sm text-foreground-500 leading-relaxed mb-4">{description}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
      >
        {actionLabel}
      </button>
    </div>
  );
}

// ── Skeleton ──

export function QuestionsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-secondary-100 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary-200" />
            <div className="flex-1">
              <div className="h-3 w-16 bg-secondary-200 rounded mb-2" />
              <div className="h-4 w-3/4 bg-secondary-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ──

export function QuestionsEmpty({ hasSearch }: { hasSearch?: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4">
        <i className="ri-question-line text-3xl text-secondary-400" />
      </div>
      <h3 className="font-heading text-lg font-semibold text-foreground-900 mb-2">
        {hasSearch ? 'No matching questions' : 'No questions yet'}
      </h3>
      <p className="text-sm text-foreground-500 max-w-sm mx-auto">
        {hasSearch
          ? 'Try adjusting your search or selecting a different category.'
          : 'The couple haven&apos;t added any FAQs yet. Check back later or send a question directly.'}
      </p>
    </div>
  );
}

// ── Disabled state ──

export function QuestionsDisabled() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
        <i className="ri-question-line text-3xl" />
      </div>
      <h1 className="font-heading text-2xl text-foreground-900 mb-3">Q&amp;A</h1>
      <p className="text-sm text-foreground-500 leading-relaxed">
        Q&amp;A is not currently available. The couple may enable it closer to the wedding day.
      </p>
    </div>
  );
}