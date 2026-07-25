import { useGuestPortal } from '@/hooks/useGuestPortal';
import { useParams } from 'react-router-dom';
import { useState, useCallback, useMemo } from 'react';
import type { FaqCategory } from '@/types/access';
import {
  FaqCard,
  FaqCategoryFilters,
  MyQuestionCard,
  AskQuestionForm,
  SupportCard,
  QuestionsSkeleton,
  QuestionsEmpty,
  QuestionsDisabled,
} from './components/QuestionsComponents';

const INTERACT_URL = 'https://msisc09taib8ral0g0f1.helloreaddy.com/functions/v1/guest-question-interact';

export default function GuestQuestionsPage() {
  const { accessId } = useParams();
  const { data, loading, error, refresh } = useGuestPortal();
  const [activeCategory, setActiveCategory] = useState<FaqCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskForm, setShowAskForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [mutatingFaqId, setMutatingFaqId] = useState<string | null>(null);

  const questionsData = data?.questions;
  const portalSettings = data?.portal_settings;
  const primaryGuest = data?.recipients?.[0];
  const faqs = questionsData?.faqs || [];
  const myQuestions = questionsData?.my_questions || [];

  // Compute category counts
  const categoryCounts: Record<string, number> = {};
  faqs.forEach((f) => {
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
  });

  // Search + filter
  const filteredFaqs = useMemo(() => {
    let result = faqs;
    if (activeCategory !== 'all') {
      result = result.filter((f) => f.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      );
    }
    return result;
  }, [faqs, activeCategory, searchQuery]);

  const handleFaqFeedback = useCallback(async (faqId: string, feedbackType: 'helpful' | 'not_helpful') => {
    if (!primaryGuest) return;
    setMutatingFaqId(faqId);

    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_hash: accessId,
          action: 'faq_feedback',
          faq_id: faqId,
          guest_id: primaryGuest.guest_id,
          feedback_type: feedbackType,
        }),
      });
      const result = await res.json();
      if (result?.ok) await refresh();
    } catch {
      /* ignore */
    } finally {
      setMutatingFaqId(null);
    }
  }, [accessId, primaryGuest, refresh]);

  const handleAskQuestion = useCallback(async (formData: {
    category: string;
    subject: string;
    message: string;
    preferred_response_method: string;
  }) => {
    if (!primaryGuest) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(INTERACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_hash: accessId,
          action: 'ask_question',
          guest_id: primaryGuest.guest_id,
          ...formData,
        }),
      });
      const result = await res.json();

      if (result?.ok) {
        setSubmitSuccess(true);
        await refresh();
      } else {
        setSubmitError(result?.message || result?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('We could not send your question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [accessId, primaryGuest, refresh]);

  const handleCloseForm = useCallback(() => {
    setShowAskForm(false);
    setSubmitSuccess(false);
    setSubmitError('');
  }, []);

  // Loading
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="text-center mb-10">
          <div className="h-8 w-48 bg-secondary-200 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-64 bg-secondary-100 rounded mx-auto animate-pulse" />
        </div>
        <div className="mb-6 flex gap-1.5 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-7 w-20 bg-secondary-200 rounded-full animate-pulse" />
          ))}
        </div>
        <QuestionsSkeleton />
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 text-secondary-400 mb-4">
          <i className="ri-error-warning-line text-2xl" />
        </div>
        <p className="text-sm text-red-600">{error || 'Could not load Q&amp;A.'}</p>
      </div>
    );
  }

  // Disabled
  if (!portalSettings?.show_questions) {
    return <QuestionsDisabled />;
  }

  const showSupportCard = faqs.length === 0 && myQuestions.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-1">Questions &amp; Answers</h1>
          <p className="text-sm text-foreground-500">
            {faqs.length > 0
              ? `${faqs.length} question${faqs.length !== 1 ? 's' : ''} answered`
              : 'Everything you need to know about the wedding'}
          </p>
        </div>
        {portalSettings?.allow_guest_questions && (
          <button
            onClick={() => setShowAskForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-chat-3-line" />
            Ask a question
          </button>
        )}
      </div>

      {/* Search bar */}
      {faqs.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
              >
                <i className="ri-close-line text-sm" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category filters */}
      {faqs.length > 0 && !searchQuery && (
        <FaqCategoryFilters
          selected={activeCategory}
          onSelect={setActiveCategory}
          counts={categoryCounts}
        />
      )}

      {/* FAQ list */}
      {faqs.length === 0 ? (
        showSupportCard ? (
          <QuestionsEmpty />
        ) : null
      ) : filteredFaqs.length === 0 ? (
        <QuestionsEmpty hasSearch />
      ) : (
        <div className="space-y-3 mb-10">
          {filteredFaqs.map((faq) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              onFeedback={handleFaqFeedback}
              isMutating={mutatingFaqId === faq.id}
            />
          ))}
        </div>
      )}

      {/* My questions */}
      {myQuestions.length > 0 && (
        <div className="mb-10">
          <h2 className="font-heading text-lg font-semibold text-foreground-900 mb-4 flex items-center gap-2">
            <i className="ri-chat-3-line text-foreground-500" />
            Your questions
          </h2>
          <div className="space-y-3">
            {myQuestions.map((q) => (
              <MyQuestionCard key={q.id} question={q} />
            ))}
          </div>
        </div>
      )}

      {/* Support card — only when no FAQs exist */}
      {showSupportCard && portalSettings?.allow_guest_questions && (
        <div className="max-w-sm mx-auto mt-8">
          <SupportCard
            title="Need help?"
            description="Can&rsquo;t find what you&rsquo;re looking for? Send your question directly to the couple and we&rsquo;ll get back to you."
            actionLabel="Ask a question"
            onAction={() => setShowAskForm(true)}
          />
        </div>
      )}

      {/* Ask question modal */}
      <AskQuestionForm
        isOpen={showAskForm}
        onClose={handleCloseForm}
        onSubmit={handleAskQuestion}
        isSubmitting={isSubmitting}
        error={submitError}
        success={submitSuccess}
      />

      {/* Privacy note */}
      <p className="text-center text-[11px] text-foreground-350 mt-8 max-w-md mx-auto leading-relaxed">
        Questions are private to your invitation. The couple will not share your personal details with other guests.
      </p>
    </div>
  );
}