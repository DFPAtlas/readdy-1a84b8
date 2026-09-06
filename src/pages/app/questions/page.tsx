import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGuestQuestionsAdmin, type AdminGuestQuestion, type QuestionStatusFilter, QUESTION_CATEGORIES, CATEGORY_LABELS } from '@/hooks/useGuestQuestionsAdmin';
import { useWeddingFaqs, type AdminFaq, type FaqStatusFilter, FAQ_CATEGORIES, FAQ_CATEGORY_LABELS } from '@/hooks/useWeddingFaqs';
import { isDemoMode } from '@/demo/demoConfig';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import type { FaqRelatedLink } from '@/types/access';
import { useActiveWedding } from '@/hooks/useActiveWedding';

const TABS = [
  { key: 'inbox', label: 'Inbox', icon: 'ri-mail-line' },
  { key: 'faqs', label: 'FAQs', icon: 'ri-question-line' },
  { key: 'insights', label: 'Insights', icon: 'ri-bar-chart-line' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function QuestionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabKey) || 'inbox';

  const setTab = useCallback((tab: TabKey) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-label uppercase tracking-wider text-foreground-400 mb-1">Guest communication</p>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground-900 mb-1">Guest Questions &amp; FAQs</h1>
          <p className="text-sm text-foreground-500 max-w-2xl">
            Answer private guest questions and publish common information as FAQs that appear in the guest portal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'faqs' && <AddFaqButton />}
          {activeTab === 'inbox' && <QuestionSettingsButton />}
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards tab={activeTab} />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-background-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-foreground-900 shadow-sm'
                : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <i className={`${tab.icon} text-base`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'inbox' && <InboxTab />}
      {activeTab === 'faqs' && <FaqsTab />}
      {activeTab === 'insights' && <InsightsTab />}
    </div>
  );
}

// ── Summary Cards ──

function SummaryCards({ tab }: { tab: string }) {
  const { questions, loading: qLoading } = useGuestQuestionsAdmin();
  const { faqs, loading: fLoading } = useWeddingFaqs();

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const answeredThisWeek = questions.filter((q) => {
    if (q.status !== 'answered' || !q.responded_at) return false;
    const d = new Date(q.responded_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;
  const publishedCount = faqs.filter((f) => f.status === 'published').length;
  const helpfulTotal = faqs.reduce((s, f) => s + f.helpful_count, 0);
  const notHelpfulTotal = faqs.reduce((s, f) => s + f.not_helpful_count, 0);
  const totalFeedback = helpfulTotal + notHelpfulTotal;
  const helpfulRate = totalFeedback > 0 ? Math.round((helpfulTotal / totalFeedback) * 100) : 0;

  if (qLoading || fLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-secondary-100 p-4 animate-pulse">
            <div className="h-3 w-16 bg-secondary-200 rounded mb-2" />
            <div className="h-6 w-8 bg-secondary-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-white rounded-xl border border-secondary-100 p-4">
        <p className="text-xs text-foreground-400 font-label mb-1">Pending questions</p>
        <p className={`text-2xl font-heading font-semibold ${pendingCount > 0 ? 'text-amber-600' : 'text-foreground-900'}`}>{pendingCount}</p>
      </div>
      <div className="bg-white rounded-xl border border-secondary-100 p-4">
        <p className="text-xs text-foreground-400 font-label mb-1">Answered this week</p>
        <p className="text-2xl font-heading font-semibold text-foreground-900">{answeredThisWeek}</p>
      </div>
      <div className="bg-white rounded-xl border border-secondary-100 p-4">
        <p className="text-xs text-foreground-400 font-label mb-1">Published FAQs</p>
        <p className="text-2xl font-heading font-semibold text-foreground-900">{publishedCount}</p>
      </div>
      <div className="bg-white rounded-xl border border-secondary-100 p-4">
        <p className="text-xs text-foreground-400 font-label mb-1">FAQ helpful rate</p>
        <p className="text-2xl font-heading font-semibold text-foreground-900">{helpfulRate}%</p>
      </div>
    </div>
  );
}

// ── Inbox Tab ──

function InboxTab() {
  const { questions, loading, error, saving, answerQuestion, closeQuestion, reopenQuestion } = useGuestQuestionsAdmin();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuestionStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const filtered = useMemo(() => {
    let result = [...questions];
    if (statusFilter !== 'all') result = result.filter((q) => q.status === statusFilter);
    if (categoryFilter !== 'all') result = result.filter((q) => q.category === categoryFilter);
    if (search.trim()) { const s = search.toLowerCase(); result = result.filter((q) => q.subject.toLowerCase().includes(s) || q.message.toLowerCase().includes(s) || (q.guest_name || '').toLowerCase().includes(s)); }
    result.sort((a, b) => sort === 'newest' ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime() : new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return result;
  }, [questions, statusFilter, categoryFilter, search, sort]);

  const selected = selectedId ? questions.find((q) => q.id === selectedId) : null;

  useEffect(() => { setReplyText(''); setReplyError(''); }, [selectedId]);

  useEffect(() => {
    if (selected?.response) setReplyText(selected.response);
    else setReplyText('');
  }, [selected]);

  const handleAnswer = async () => {
    if (!selectedId || !replyText.trim()) return;
    setReplySaving(true); setReplyError('');
    try {
      await answerQuestion(selectedId, replyText.trim());
      showToast('Answer saved and visible to the guest');
    } catch (e: unknown) {
      setReplyError(e instanceof Error ? e.message : 'Failed to save answer');
    } finally { setReplySaving(false); }
  };

  const handleClose = async () => {
    if (!selectedId) return;
    try { await closeQuestion(selectedId); showToast('Question closed'); } catch { /* ignore */ }
  };

  const handleReopen = async () => {
    if (!selectedId) return;
    try { await reopenQuestion(selectedId); showToast('Question reopened'); } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white rounded-xl border border-secondary-100 p-4 animate-pulse"><div className="h-4 w-3/4 bg-secondary-200 rounded mb-2" /><div className="h-3 w-1/2 bg-secondary-100 rounded" /></div>)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-red-50 mb-4"><i className="ri-error-warning-line text-2xl text-red-400" /></div>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label cursor-pointer whitespace-nowrap">Retry</button>
      </div>
    );
  }

  const pendingUnread = questions.filter((q) => q.status === 'pending').length;

  // On mobile, show detail view if selected
  const showDetail = !!selectedId && !!selected;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left: Question list */}
      <div className={`${showDetail ? 'hidden lg:block' : ''} lg:w-[420px] flex-shrink-0`}>
        {/* Controls */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests, subjects..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as QuestionStatusFilter)} className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs text-foreground-700 bg-white cursor-pointer">
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="answered">Answered</option>
              <option value="closed">Closed</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs text-foreground-700 bg-white cursor-pointer">
              <option value="all">All categories</option>
              {QUESTION_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
            </select>
            <button onClick={() => setSort(sort === 'newest' ? 'oldest' : 'newest')} className="px-3 py-1.5 rounded-lg border border-secondary-200 text-xs text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">
              <i className={sort === 'newest' ? 'ri-sort-desc mr-1' : 'ri-sort-asc mr-1'} />{sort === 'newest' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-secondary-100">
            <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-3"><i className="ri-chat-3-line text-xl text-secondary-400" /></div>
            <p className="text-sm text-foreground-500">{questions.length === 0 ? 'No questions yet' : 'No matching questions'}</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[calc(100vh-420px)] overflow-y-auto">
            {filtered.map((q) => (
              <button
                key={q.id}
                onClick={() => { setSelectedId(q.id); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  selectedId === q.id ? 'bg-primary-50 border-primary-200' : 'bg-white border-secondary-100 hover:bg-background-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-label font-medium text-foreground-900 truncate">{q.subject}</p>
                  <span className={`flex-shrink-0 text-[10px] font-label font-medium px-1.5 py-0.5 rounded ${
                    q.status === 'pending' ? 'bg-amber-100 text-amber-700' : q.status === 'answered' ? 'bg-accent-100 text-accent-700' : 'bg-secondary-100 text-foreground-500'
                  }`}>
                    {q.status === 'pending' ? 'Pending' : q.status === 'answered' ? 'Answered' : 'Closed'}
                  </span>
                </div>
                <p className="text-xs text-foreground-500 mb-1">{q.guest_name || 'Unknown guest'} &middot; {CATEGORY_LABELS[q.category] || q.category}</p>
                <p className="text-[10px] text-foreground-400">{new Date(q.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Question detail / reply */}
      <div className={`flex-1 ${!showDetail ? 'hidden lg:block' : ''}`}>
        {!selected ? (
          <div className="bg-white rounded-xl border border-secondary-100 flex items-center justify-center h-64">
            <p className="text-sm text-foreground-400">
              {questions.length === 0 ? 'No questions to display' : 'Select a question to view details'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-secondary-100">
            {/* Mobile back button */}
            <div className="lg:hidden p-3 border-b border-secondary-100">
              <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1.5 text-sm text-foreground-600 hover:text-foreground-900 cursor-pointer">
                <i className="ri-arrow-left-line" /> Back to list
              </button>
            </div>

            <div className="p-5">
              {/* Question header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground-900 mb-1">{selected.subject}</h2>
                  <div className="flex items-center gap-3 text-xs text-foreground-500">
                    <span>{selected.guest_name || 'Unknown guest'}</span>
                    {selected.invitation_name && <span className="text-foreground-400">&middot; {selected.invitation_name}</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-label font-medium ${
                      selected.status === 'pending' ? 'bg-amber-100 text-amber-700' : selected.status === 'answered' ? 'bg-accent-100 text-accent-700' : 'bg-secondary-100 text-foreground-500'
                    }`}>{selected.status}</span>
                  </div>
                </div>
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center">
                  <i className="ri-chat-3-line text-foreground-500" />
                </span>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div><span className="text-foreground-400">Category</span><p className="text-foreground-700 font-label">{CATEGORY_LABELS[selected.category] || selected.category}</p></div>
                <div><span className="text-foreground-400">Submitted</span><p className="text-foreground-700 font-label">{new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div><span className="text-foreground-400">Response method</span><p className="text-foreground-700 font-label capitalize">{selected.preferred_response_method}</p></div>
                {selected.responded_at && <div><span className="text-foreground-400">Answered</span><p className="text-foreground-700 font-label">{new Date(selected.responded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
              </div>

              {/* Message */}
              <div className="bg-background-50 rounded-lg p-3 border border-secondary-100 mb-4">
                <p className="text-xs text-foreground-400 font-label mb-1">Message</p>
                <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* Existing answer */}
              {selected.response && selected.status !== 'pending' && (
                <div className="bg-accent-50 rounded-lg p-3 border border-accent-100 mb-4">
                  <p className="text-xs text-accent-600 font-label mb-1">Saved answer</p>
                  <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{selected.response}</p>
                </div>
              )}

              {/* Reply editor */}
              <div className="mb-4">
                <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 2000))}
                  placeholder="Write an answer that will appear in the guest portal..."
                  rows={5}
                  maxLength={2000}
                  className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                />
                <p className="text-[10px] text-foreground-400 mt-1">{replyText.length}/2000</p>
              </div>

              {replyError && <p className="text-xs text-red-600 mb-3">{replyError}</p>}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleAnswer}
                  disabled={replySaving || !replyText.trim()}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                >
                  {replySaving ? <span className="inline-flex items-center gap-1.5"><i className="ri-loader-4-line animate-spin" /> Saving...</span> : 'Save portal answer'}
                </button>
                {selected.status !== 'closed' ? (
                  <button onClick={handleClose} className="px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Close question</button>
                ) : (
                  <button onClick={handleReopen} className="px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Reopen question</button>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(replyText); showToast('Reply copied'); }}
                  className="px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-500 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-file-copy-line mr-1" /> Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-foreground-900 text-white text-sm shadow-lg animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── FAQs Tab ──

function FaqsTab() {
  const { faqs, loading, error, saving, updateFaq, duplicateFaq, archiveFaq, publishFaq, unpublishFaq, deleteFaq, reorderFaqs } = useWeddingFaqs();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<FaqStatusFilter>('all');
  const [editFaq, setEditFaq] = useState<AdminFaq | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); }, []);

  const filtered = useMemo(() => {
    let r = [...faqs];
    if (statusFilter !== 'all') r = r.filter((f) => f.status === statusFilter);
    if (categoryFilter !== 'all') r = r.filter((f) => f.category === categoryFilter);
    if (search.trim()) { const s = search.toLowerCase(); r = r.filter((f) => f.question.toLowerCase().includes(s) || f.answer.toLowerCase().includes(s)); }
    return r;
  }, [faqs, statusFilter, categoryFilter, search]);

  const handlePublish = async (id: string) => { await publishFaq(id); showToast('FAQ published'); };
  const handleUnpublish = async (id: string) => { await unpublishFaq(id); showToast('FAQ unpublished'); };
  const handleArchive = async (id: string) => { await archiveFaq(id); showToast('FAQ archived'); };
  const handleDuplicate = async (id: string) => { await duplicateFaq(id); showToast('FAQ duplicated'); };
  const handleDelete = async (id: string) => {
    const faq = faqs.find((f) => f.id === id);
    if (faq && (faq.helpful_count > 0 || faq.not_helpful_count > 0)) {
      setDeleteConfirm(id);
      return;
    }
    await deleteFaq(id);
    showToast('FAQ deleted');
    setDeleteConfirm(null);
  };
  const handleMoveUp = async (id: string) => {
    const idx = filtered.findIndex((f) => f.id === id);
    if (idx <= 0) return;
    const newIds = [...filtered.map((f) => f.id)];
    [newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
    await reorderFaqs(newIds);
  };
  const handleMoveDown = async (id: string) => {
    const idx = filtered.findIndex((f) => f.id === id);
    if (idx < 0 || idx >= filtered.length - 1) return;
    const newIds = [...filtered.map((f) => f.id)];
    [newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]];
    await reorderFaqs(newIds);
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-secondary-100 p-4 animate-pulse"><div className="h-4 w-3/4 bg-secondary-200 rounded mb-2" /><div className="h-3 w-1/2 bg-secondary-100 rounded" /></div>)}</div>;
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-700 bg-white cursor-pointer">
          <option value="all">All categories</option>
          {FAQ_CATEGORIES.map((c) => <option key={c} value={c}>{FAQ_CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FaqStatusFilter)} className="px-3 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-700 bg-white cursor-pointer">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-secondary-100">
          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4"><i className="ri-question-line text-2xl text-secondary-400" /></div>
          <h3 className="font-heading text-lg font-semibold text-foreground-900 mb-2">No FAQs yet</h3>
          <p className="text-sm text-foreground-500 mb-4">Create your first FAQ to help guests with common questions.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-secondary-100 overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-background-50 border-b border-secondary-100 text-xs text-foreground-400 font-label">
            <div className="col-span-4">Question</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Helpfulness</div>
            <div className="col-span-2">Actions</div>
          </div>

          {filtered.map((faq, idx) => {
            const total = faq.helpful_count + faq.not_helpful_count;
            const rate = total > 0 ? Math.round((faq.helpful_count / total) * 100) : 0;
            return (
              <div key={faq.id} className="md:grid md:grid-cols-12 gap-2 px-4 py-3 border-b border-secondary-50 last:border-b-0 items-center hover:bg-background-50/50 transition-colors">
                <div className="md:col-span-4 mb-1 md:mb-0">
                  <p className="text-sm font-label font-medium text-foreground-900 line-clamp-2">{faq.question}</p>
                </div>
                <div className="md:col-span-2 text-xs text-foreground-500">{FAQ_CATEGORY_LABELS[faq.category] || faq.category}</div>
                <div className="md:col-span-2">
                  <span className={`inline-block text-[10px] font-label font-medium px-1.5 py-0.5 rounded ${
                    faq.status === 'published' ? 'bg-accent-100 text-accent-700' : faq.status === 'draft' ? 'bg-secondary-100 text-foreground-500' : 'bg-secondary-50 text-foreground-400'
                  }`}>{faq.status === 'published' ? 'Published' : faq.status === 'draft' ? 'Draft' : 'Archived'}</span>
                </div>
                <div className="md:col-span-2 text-xs text-foreground-500">
                  <span className="text-accent-600">{rate}%</span>
                  <span className="text-foreground-400"> ({faq.helpful_count}/{total})</span>
                </div>
                <div className="md:col-span-2 flex items-center gap-1 flex-wrap">
                  <button onClick={() => handleMoveUp(faq.id)} disabled={idx === 0} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 disabled:opacity-30 cursor-pointer" title="Move up"><i className="ri-arrow-up-s-line text-sm" /></button>
                  <button onClick={() => handleMoveDown(faq.id)} disabled={idx === filtered.length - 1} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 disabled:opacity-30 cursor-pointer" title="Move down"><i className="ri-arrow-down-s-line text-sm" /></button>
                  <button onClick={() => { setEditFaq(faq); setShowEditor(true); }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-500 cursor-pointer" title="Edit"><i className="ri-pencil-line text-sm" /></button>
                  {faq.status !== 'published' ? (
                    <button onClick={() => handlePublish(faq.id)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent-50 text-accent-500 cursor-pointer" title="Publish"><i className="ri-eye-line text-sm" /></button>
                  ) : (
                    <button onClick={() => handleUnpublish(faq.id)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary-100 text-foreground-400 cursor-pointer" title="Unpublish"><i className="ri-eye-off-line text-sm" /></button>
                  )}
                  <button onClick={() => handleDuplicate(faq.id)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-background-100 text-foreground-400 cursor-pointer" title="Duplicate"><i className="ri-file-copy-line text-sm" /></button>
                  {faq.status !== 'archived' ? (
                    <button onClick={() => handleArchive(faq.id)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-secondary-100 text-foreground-400 cursor-pointer" title="Archive"><i className="ri-archive-line text-sm" /></button>
                  ) : (
                    <button onClick={() => handleDelete(faq.id)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500 cursor-pointer" title="Delete"><i className="ri-delete-bin-line text-sm" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAQ Editor Modal */}
      {showEditor && <FaqEditor faq={editFaq} onSave={async (data) => { if (editFaq) { await updateFaq(editFaq.id, data); showToast('FAQ updated'); } setShowEditor(false); setEditFaq(null); }} onClose={() => { setShowEditor(false); setEditFaq(null); }} />}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg border border-secondary-100">
              <h3 className="font-heading text-base font-semibold text-foreground-900 mb-2">Delete FAQ?</h3>
              <p className="text-sm text-foreground-500 mb-4">This FAQ has feedback ({faqs.find((f) => f.id === deleteConfirm)?.helpful_count || 0} helpful, {faqs.find((f) => f.id === deleteConfirm)?.not_helpful_count || 0} not helpful). Deleting it will remove all feedback data.</p>
              <div className="flex items-center gap-3">
                <button onClick={async () => { await deleteFaq(deleteConfirm); showToast('FAQ deleted'); setDeleteConfirm(null); }} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-label cursor-pointer whitespace-nowrap">Delete anyway</button>
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-lg border border-secondary-200 text-sm text-foreground-600 cursor-pointer whitespace-nowrap">Cancel</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-foreground-900 text-white text-sm shadow-lg animate-[fadeIn_0.2s_ease-out]">{toast}</div>
      )}
    </div>
  );
}

// ── FAQ Editor ──

function FaqEditor({ faq, onSave, onClose }: { faq: AdminFaq | null; onSave: (data: Partial<AdminFaq>) => Promise<void>; onClose: () => void }) {
  const { activeWedding } = useActiveWedding();
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [category, setCategory] = useState(faq?.category || 'general');
  const [status, setStatus] = useState<AdminFaq['status']>(faq?.status || 'draft');
  const [links, setLinks] = useState<FaqRelatedLink[]>(faq?.related_links || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!question.trim()) e.question = 'Question is required';
    if (!answer.trim()) e.answer = 'Answer is required';
    for (const l of links) {
      if (l.url && (l.url.startsWith('javascript:') || l.url.startsWith('data:'))) { e.links = 'Unsafe URL detected'; break; }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const data: Partial<AdminFaq> = {
        question: question.trim(), answer: answer.trim(), category,
        status, related_links: links.filter((l) => l.label && l.url),
        sort_order: faq?.sort_order || 0,
      };
      if (faq) {
        await onSave(data);
      } else {
        // New FAQ - handled by parent
        await onSave({ ...data, wedding_id: activeWedding?.id || '' });
      }
    } finally { setSaving(false); }
  };

  const addLink = () => setLinks([...links, { label: '', url: '', type: 'external' }]);
  const removeLink = (idx: number) => setLinks(links.filter((_, i) => i !== idx));
  const updateLink = (idx: number, field: keyof FaqRelatedLink, value: string) => {
    setLinks(links.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 p-4">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-lg border border-secondary-100 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b border-secondary-100">
            <h2 className="font-heading text-lg font-semibold text-foreground-900">{faq ? 'Edit FAQ' : 'Add FAQ'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer"><i className="ri-close-line" /></button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white cursor-pointer">
                {FAQ_CATEGORIES.map((c) => <option key={c} value={c}>{FAQ_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Question *</label>
              <input type="text" value={question} onChange={(e) => setQuestion(e.target.value.slice(0, 500))} maxLength={500} placeholder="What should guests wear?" className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
              {errors.question && <p className="text-xs text-red-500 mt-1">{errors.question}</p>}
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Answer *</label>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value.slice(0, 2000))} maxLength={2000} rows={4} placeholder="Write a helpful answer..." className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 placeholder:text-foreground-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
              <p className="text-[10px] text-foreground-400 mt-1">{answer.length}/2000</p>
              {errors.answer && <p className="text-xs text-red-500 mt-1">{errors.answer}</p>}
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1.5">Related links</label>
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input type="text" value={link.label} onChange={(e) => updateLink(idx, 'label', e.target.value)} placeholder="Link label" className="flex-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <input type="text" value={link.url} onChange={(e) => updateLink(idx, 'url', e.target.value)} placeholder="https://" className="flex-1 px-2.5 py-1.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  <select value={link.type || 'external'} onChange={(e) => updateLink(idx, 'type', e.target.value)} className="w-24 px-2 py-1.5 rounded-lg border border-secondary-200 text-xs text-foreground-700 bg-white cursor-pointer">
                    <option value="external">External</option>
                    <option value="internal">Internal</option>
                  </select>
                  <button onClick={() => removeLink(idx)} className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-500 cursor-pointer"><i className="ri-close-line" /></button>
                </div>
              ))}
              <button onClick={addLink} className="text-xs text-primary-600 hover:text-primary-700 font-label cursor-pointer whitespace-nowrap"><i className="ri-add-line mr-1" /> Add link</button>
              {errors.links && <p className="text-xs text-red-500 mt-1">{errors.links}</p>}
            </div>
            <div>
              <label className="block text-xs font-label font-medium text-foreground-700 mb-1">Publication status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as AdminFaq['status'])} className="w-full px-3 py-2.5 rounded-lg border border-secondary-200 text-sm text-foreground-900 bg-white cursor-pointer">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-sm font-label font-medium text-white hover:bg-primary-600 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap">{saving ? 'Saving...' : faq ? 'Save changes' : 'Create FAQ'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Add FAQ button ──

function AddFaqButton() {
  const { activeWedding } = useActiveWedding();
  const { addFaq } = useWeddingFaqs();
  const [show, setShow] = useState(false);

  const handleSave = async (data: Partial<AdminFaq>) => {
    if (!activeWedding?.id) return;
    await addFaq({
      wedding_id: activeWedding.id, category: (data.category as string) || 'general',
      question: data.question || '', answer: data.answer || '',
      related_links: data.related_links || [], is_published: data.status === 'published',
      status: data.status || 'draft', sort_order: 999,
    });
    setShow(false);
  };

  return (
    <>
      <button onClick={() => setShow(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white text-sm font-label font-medium hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap">
        <i className="ri-add-line" /> Add FAQ
      </button>
      {show && <FaqEditor faq={null} onSave={handleSave} onClose={() => setShow(false)} />}
    </>
  );
}

// ── Question settings button ──

function QuestionSettingsButton() {
  const { activeWedding } = useActiveWedding();
  const demo = useDemoDataSafe();

  const [show, setShow] = useState(false);
  const [showQuestions, setShowQuestions] = useState(true);
  const [allowGuestQuestions, setAllowGuestQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    if (demo && isDemoMode) {
      setShowQuestions(demo.state.portalSettings.show_questions);
      setAllowGuestQuestions(demo.state.portalSettings.allow_guest_questions);
    }
    setShow(true);
  }, [demo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (demo && isDemoMode) {
        demo.updatePortalSettings({ show_questions: showQuestions, allow_guest_questions: allowGuestQuestions });
      } else {
        const { supabase } = await import('@/lib/supabase');
        if (!activeWedding?.id) return;
        const { error } = await supabase.from('guest_portal_settings').upsert({
          wedding_id: activeWedding.id,
          show_questions: showQuestions,
          allow_guest_questions: allowGuestQuestions,
        }, { onConflict: 'wedding_id' });
        if (error) throw error;
      }
      setToast('Settings saved');
      setTimeout(() => setToast(null), 3000);
      setShow(false);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  return (
    <>
      <button onClick={handleOpen} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 transition-colors cursor-pointer whitespace-nowrap">
        <i className="ri-settings-3-line" /> Question settings
      </button>
      {show && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShow(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-lg border border-secondary-100">
              <div className="flex items-center justify-between p-5 border-b border-secondary-100">
                <h2 className="font-heading text-lg font-semibold text-foreground-900">Question settings</h2>
                <button onClick={() => setShow(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-50 text-foreground-400 cursor-pointer"><i className="ri-close-line" /></button>
              </div>
              <div className="p-5 space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={showQuestions} onChange={(e) => setShowQuestions(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-300" />
                  <div>
                    <p className="text-sm font-label font-medium text-foreground-900">Show Questions section in guest portal</p>
                    <p className="text-xs text-foreground-400">FAQs and the Q&amp;A page will be visible to guests</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={allowGuestQuestions} onChange={(e) => setAllowGuestQuestions(e.target.checked)} className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-300" />
                  <div>
                    <p className="text-sm font-label font-medium text-foreground-900">Allow guests to submit private questions</p>
                    <p className="text-xs text-foreground-400">Guests can ask the couple questions through the portal</p>
                  </div>
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => setShow(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-secondary-200 text-sm font-label text-foreground-600 hover:bg-background-50 cursor-pointer whitespace-nowrap">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 text-sm font-label font-medium text-white hover:bg-primary-600 disabled:opacity-40 cursor-pointer whitespace-nowrap">{saving ? 'Saving...' : 'Save settings'}</button>
                </div>
              </div>
            </div>
          </div>
          {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-foreground-900 text-white text-sm shadow-lg">{toast}</div>}
        </>
      )}
    </>
  );
}

// ── Insights Tab ──

function InsightsTab() {
  const { questions, loading: qLoading } = useGuestQuestionsAdmin();
  const { faqs, loading: fLoading } = useWeddingFaqs();

  if (qLoading || fLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl border border-secondary-100 p-4 animate-pulse"><div className="h-4 w-2/3 bg-secondary-200 rounded mb-2" /><div className="h-12 bg-secondary-100 rounded" /></div>)}</div>;
  }

  const pending = questions.filter((q) => q.status === 'pending').length;
  const answered = questions.filter((q) => q.status === 'answered').length;
  const closed = questions.filter((q) => q.status === 'closed').length;
  const total = questions.length;

  // Category breakdown
  const catCounts: Record<string, number> = {};
  questions.forEach((q) => { catCounts[q.category] = (catCounts[q.category] || 0) + 1; });
  const topCategories = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Response time
  const answeredQs = questions.filter((q) => q.status === 'answered' && q.responded_at);
  const avgHours = answeredQs.length > 0
    ? Math.round(answeredQs.reduce((s, q) => s + (new Date(q.responded_at!).getTime() - new Date(q.created_at).getTime()) / (1000 * 60 * 60), 0) / answeredQs.length)
    : 0;

  // FAQ feedback
  const sortedByHelpful = [...faqs].sort((a, b) => b.helpful_count - a.helpful_count).slice(0, 5);
  const highNotHelpful = [...faqs].filter((f) => f.not_helpful_count > 0).sort((a, b) => b.not_helpful_count - a.not_helpful_count).slice(0, 3);

  // Topic suggestions based on category clusters
  const suggestions: string[] = [];
  if (catCounts['travel'] > 0) suggestions.push('Create more travel and transport FAQs');
  if (catCounts['food'] > 0) suggestions.push('Add a dietary requirements FAQ');
  if (catCounts['dress_code'] > 0) suggestions.push('Clarify dress code details');
  if (catCounts['parking'] > 0) suggestions.push('Add parking and arrival information');
  if (catCounts['children'] > 0) suggestions.push('Update children and family guidance');
  if (catCounts['accommodation'] > 0) suggestions.push('Add accommodation booking guidance');
  if (catCounts['timings'] > 0) suggestions.push('Publish a schedule and timings FAQ');

  if (total === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-secondary-100">
        <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-full bg-secondary-100 mb-4"><i className="ri-bar-chart-line text-2xl text-secondary-400" /></div>
        <h3 className="font-heading text-lg font-semibold text-foreground-900 mb-2">No data yet</h3>
        <p className="text-sm text-foreground-500">Insights will appear once guests start submitting questions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-1">Total questions</p>
          <p className="text-2xl font-heading font-semibold text-foreground-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-1">Pending</p>
          <p className={`text-2xl font-heading font-semibold ${pending > 0 ? 'text-amber-600' : 'text-foreground-900'}`}>{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-1">Answered</p>
          <p className="text-2xl font-heading font-semibold text-foreground-900">{answered}</p>
        </div>
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-1">Avg response time</p>
          <p className="text-2xl font-heading font-semibold text-foreground-900">{avgHours > 0 ? `${avgHours}h` : '—'}</p>
        </div>
      </div>

      {/* Status distribution bar */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-3">Question status distribution</p>
          <div className="flex rounded-full h-3 overflow-hidden mb-2">
            {pending > 0 && <div className="bg-amber-400" style={{ width: `${(pending / total) * 100}%` }} />}
            {answered > 0 && <div className="bg-accent-400" style={{ width: `${(answered / total) * 100}%` }} />}
            {closed > 0 && <div className="bg-secondary-300" style={{ width: `${(closed / total) * 100}%` }} />}
          </div>
          <div className="flex items-center gap-4 text-xs text-foreground-500">
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Pending {pending}</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-accent-400 mr-1" />Answered {answered}</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-secondary-300 mr-1" />Closed {closed}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top categories */}
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-3">Top question categories</p>
          {topCategories.length === 0 ? (
            <p className="text-sm text-foreground-400">No data available</p>
          ) : (
            <div className="space-y-2">
              {topCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs text-foreground-600 w-24 truncate">{CATEGORY_LABELS[cat] || cat}</span>
                  <div className="flex-1 h-2 rounded-full bg-background-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-400" style={{ width: `${(count / Math.max(...topCategories.map(([, c]) => c))) * 100}%` }} />
                  </div>
                  <span className="text-xs text-foreground-500 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most helpful FAQs */}
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-3">Most helpful FAQs</p>
          {sortedByHelpful.length === 0 ? (
            <p className="text-sm text-foreground-400">No FAQ feedback yet</p>
          ) : (
            <div className="space-y-2">
              {sortedByHelpful.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground-700 truncate flex-1 mr-2">{f.question}</span>
                  <span className="text-xs text-accent-600 flex-shrink-0">{f.helpful_count} helpful</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* High not-helpful */}
      {highNotHelpful.length > 0 && (
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-3">FAQs needing attention (high not-helpful counts)</p>
          <div className="space-y-2">
            {highNotHelpful.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground-700 truncate flex-1 mr-2">{f.question}</span>
                <span className="text-xs text-red-500 flex-shrink-0">{f.not_helpful_count} not helpful</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-secondary-100 p-4">
          <p className="text-xs text-foreground-400 font-label mb-3">Suggestions based on question patterns</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-background-100 text-xs text-foreground-600 border border-secondary-100">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}