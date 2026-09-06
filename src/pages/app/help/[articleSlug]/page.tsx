import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { getArticle, HELP_ARTICLES, HELP_CATEGORIES } from '@/content/help/articles';
import type { HelpArticle } from '@/content/help/articles';

const RECENT_KEY = 'wedora.help.recentSlugs';

function addRecentSlug(slug: string) {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const slugs: string[] = raw ? JSON.parse(raw) : [];
    const filtered = slugs.filter((s) => s !== slug);
    filtered.unshift(slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 6)));
  } catch { /* ignore */ }
}

function ArticleCard({ article }: { article: HelpArticle }) {
  const cat = HELP_CATEGORIES.find((c) => c.key === article.category);
  return (
    <Link
      to={`/app/help/${article.slug}`}
      className="block p-4 rounded-xl bg-white border border-secondary-200/70 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer group"
    >
      <h4 className="text-sm font-label font-semibold text-foreground-900 group-hover:text-primary-700 transition-colors">{article.title}</h4>
      <p className="text-xs text-foreground-500 mt-1 line-clamp-2">{article.summary}</p>
      {cat && (
        <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-label bg-background-100 text-foreground-500">
          {cat.label}
        </span>
      )}
    </Link>
  );
}

export default function HelpArticlePage() {
  const { articleSlug } = useParams<{ articleSlug: string }>();
  const navigate = useNavigate();
  const [helpfulState, setHelpfulState] = useState<'idle' | 'yes' | 'no'>('idle');
  const [feedbackReason, setFeedbackReason] = useState('');

  const article = useMemo(() => (articleSlug ? getArticle(articleSlug) : undefined), [articleSlug]);

  const category = article ? HELP_CATEGORIES.find((c) => c.key === article.category) : undefined;

  const relatedArticles = useMemo(
    () => (article ? article.relatedSlugs.map((s) => HELP_ARTICLES.find((a) => a.slug === s)).filter(Boolean) as HelpArticle[] : []),
    [article],
  );

  // Find prev/next articles in the same category
  const { prevArticle, nextArticle } = useMemo(() => {
    if (!article) return { prevArticle: undefined, nextArticle: undefined };
    const siblings = HELP_ARTICLES.filter((a) => a.category === article.category).sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = siblings.findIndex((a) => a.slug === article.slug);
    return {
      prevArticle: idx > 0 ? siblings[idx - 1] : undefined,
      nextArticle: idx < siblings.length - 1 ? siblings[idx + 1] : undefined,
    };
  }, [article]);

  useEffect(() => {
    if (articleSlug) {
      addRecentSlug(articleSlug);
      window.scrollTo({ top: 0, behavior: 'instant' });
      setHelpfulState('idle');
      setFeedbackReason('');
    }
  }, [articleSlug]);

  if (!article) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto text-center py-20">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-6">
            <i className="ri-question-line text-2xl" />
          </div>
          <h1 className="font-heading text-2xl text-foreground-900 mb-3">Article not found</h1>
          <p className="text-sm text-foreground-500 mb-8 max-w-sm mx-auto">
            The article you are looking for does not exist or may have been moved.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/app/help" className="btn-primary cursor-pointer whitespace-nowrap">
              <i className="ri-arrow-left-line mr-1.5" /> Back to Help Centre
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-foreground-400 mb-6">
          <Link to="/app/help" className="hover:text-foreground-600 transition-colors cursor-pointer">Help Centre</Link>
          <i className="ri-arrow-right-s-line text-sm" />
          {category && <Link to={`/app/help#cat-${category.key}`} className="hover:text-foreground-600 transition-colors cursor-pointer">{category.label}</Link>}
        </div>

        {/* Header */}
        <div className="mb-8">
          {category && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-100 text-foreground-600 text-[11px] font-label font-medium mb-3">
              <i className={`${category.icon} text-xs`} />{category.label}
            </span>
          )}
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-3">{article.title}</h1>
          <p className="text-sm text-foreground-500 leading-relaxed">{article.summary}</p>
          <p className="text-[11px] text-foreground-400 font-label mt-3">Last updated: {article.updatedDate}</p>
        </div>

        {/* Main content */}
        <div
          className="prose prose-sm max-w-none mb-10 bg-white border border-secondary-200/70 rounded-xl p-6 md:p-8 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:text-foreground-900 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-700 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-foreground-700 [&_ul]:mb-4 [&_li]:mb-1.5 [&_strong]:text-foreground-900"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {/* Helpful feedback */}
        <div className="rounded-xl bg-white border border-secondary-200/70 p-6 mb-8">
          <p className="text-sm font-label font-semibold text-foreground-900 mb-3">Was this helpful?</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHelpfulState('yes')}
              className={`px-4 py-2 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                helpfulState === 'yes' ? 'bg-accent-100 text-accent-700 border border-accent-300' : 'border border-secondary-200 text-foreground-600 hover:bg-background-100'
              }`}
            >
              <i className={`${helpfulState === 'yes' ? 'ri-thumb-up-fill' : 'ri-thumb-up-line'} mr-1.5`} /> Yes, this helped
            </button>
            <button
              onClick={() => setHelpfulState(helpfulState === 'no' ? 'idle' : 'no')}
              className={`px-4 py-2 rounded-lg text-sm font-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                helpfulState === 'no' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'border border-secondary-200 text-foreground-600 hover:bg-background-100'
              }`}
            >
              <i className={`${helpfulState === 'no' ? 'ri-thumb-down-fill' : 'ri-thumb-down-line'} mr-1.5`} /> No, I still need help
            </button>
          </div>

          {helpfulState === 'no' && (
            <div className="mt-4 pt-4 border-t border-secondary-100">
              <p className="text-xs text-foreground-500 mb-2">What could be improved? (optional)</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {['Instructions unclear', 'Steps out of date', 'Feature missing', 'Error not covered', 'Other'].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setFeedbackReason(reason === feedbackReason ? '' : reason)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-label transition-colors cursor-pointer whitespace-nowrap ${
                      feedbackReason === reason ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'border border-secondary-200 text-foreground-600 hover:bg-background-100'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Link to="/contact" className="text-xs text-primary-600 font-label font-medium hover:text-primary-700 cursor-pointer whitespace-nowrap">
                <i className="ri-mail-line mr-1" /> Contact support instead
              </Link>
            </div>
          )}

          {helpfulState === 'yes' && (
            <p className="text-xs text-emerald-600 mt-2">Thanks for your feedback!</p>
          )}
        </div>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <div className="mb-8">
            <h3 className="font-label text-sm font-semibold text-foreground-900 mb-4">Related articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relatedArticles.map((ra) => (
                <ArticleCard key={ra.slug} article={ra} />
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-secondary-100">
          <div>
            {prevArticle ? (
              <Link to={`/app/help/${prevArticle.slug}`} className="flex items-center gap-2 text-sm text-foreground-600 hover:text-primary-600 transition-colors cursor-pointer">
                <i className="ri-arrow-left-line" />
                <span className="hidden sm:inline">{prevArticle.title}</span>
                <span className="sm:hidden">Previous</span>
              </Link>
            ) : <div />}
          </div>
          <div>
            {nextArticle ? (
              <Link to={`/app/help/${nextArticle.slug}`} className="flex items-center gap-2 text-sm text-foreground-600 hover:text-primary-600 transition-colors cursor-pointer">
                <span className="hidden sm:inline">{nextArticle.title}</span>
                <span className="sm:hidden">Next</span>
                <i className="ri-arrow-right-line" />
              </Link>
            ) : <div />}
          </div>
        </div>

        {/* Still need help footer */}
        <div className="mt-8 text-center p-6 rounded-xl bg-background-50 border border-secondary-200/70">
          <p className="text-sm text-foreground-600 mb-3">Didn't find what you were looking for?</p>
          <Link to="/contact" className="btn-outline cursor-pointer whitespace-nowrap text-sm">
            <i className="ri-mail-line mr-1.5" /> Contact support
          </Link>
        </div>
      </div>
    </AppShell>
  );
}