import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppShell from '@/components/feature/AppShell';
import { isDemoMode } from '@/demo/demoConfig';
import { HELP_CATEGORIES, HELP_ARTICLES, searchArticles, getCategoryArticleCount } from '@/content/help/articles';
import type { HelpArticle } from '@/content/help/articles';

const RECENT_KEY = 'vowora.help.recentSlugs';

function getRecentSlugs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSlug(slug: string) {
  const slugs = getRecentSlugs().filter((s) => s !== slug);
  slugs.unshift(slug);
  localStorage.setItem(RECENT_KEY, JSON.stringify(slugs.slice(0, 6)));
}

function ArticleCard({ article }: { article: HelpArticle }) {
  const cat = HELP_CATEGORIES.find((c) => c.key === article.category);
  return (
    <Link
      to={`/app/help/${article.slug}`}
      className="block p-5 rounded-xl bg-white border border-secondary-200/70 hover:border-primary-200 hover:bg-primary-50/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-label font-semibold text-foreground-900 group-hover:text-primary-700 transition-colors">{article.title}</h3>
          <p className="text-xs text-foreground-500 mt-1.5 line-clamp-2 leading-relaxed">{article.summary}</p>
          <div className="flex items-center gap-2 mt-3">
            {cat && (
              <span className="px-2 py-0.5 rounded text-[10px] font-label bg-background-100 text-foreground-500 whitespace-nowrap">
                <i className={`${cat.icon} mr-1 text-[10px]`} />{cat.label}
              </span>
            )}
            <span className="text-[10px] text-foreground-400 font-label">{article.updatedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function HelpPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [recentSlugs, setRecentSlugs] = useState<string[]>(getRecentSlugs);

  const searchResults = useMemo(() => (query.trim().length >= 2 ? searchArticles(query) : []), [query]);

  const recentArticles = useMemo(
    () => recentSlugs.map((s) => HELP_ARTICLES.find((a) => a.slug === s)).filter(Boolean) as HelpArticle[],
    [recentSlugs],
  );

  const popularArticles = useMemo(
    () => HELP_ARTICLES.filter((a) => ['welcome-to-vowora', 'adding-guests', 'creating-invitations', 'rsvp-flow', 'setting-up-budget', 'seating-plans']).sort((a, b) => a.sortOrder - b.sortOrder),
    [],
  );

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-label text-foreground-400 uppercase tracking-widest mb-2">Help &amp; support</p>
          <h1 className="font-heading text-3xl md:text-4xl text-foreground-900 mb-2">Help Centre</h1>
          <p className="text-sm text-foreground-500 max-w-lg">
            Find answers, learn how to use Vowora, and get help when you need it.
          </p>
        </div>

        {/* Search */}
        <div className="mb-10">
          <div className="relative max-w-2xl">
            <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-foreground-400 text-lg" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles..."
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-secondary-200 bg-white text-foreground-900 text-sm placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer">
                <i className="ri-close-line" />
              </button>
            )}
          </div>
        </div>

        {/* Search results */}
        {query.trim().length >= 2 && (
          <div className="mb-10">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-12 bg-white border border-secondary-200/70 rounded-xl">
                <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-background-100 text-foreground-300 mb-3">
                  <i className="ri-search-line text-lg" />
                </div>
                <p className="text-sm text-foreground-500">No articles found</p>
                <p className="text-xs text-foreground-400 mt-1">Try different keywords or browse by category below</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent articles */}
        {!query && recentArticles.length > 0 && (
          <div className="mb-10">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Recently viewed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentArticles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>
        )}

        {/* Browse by category */}
        {!query && (
          <div className="mb-10">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Browse by category</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {HELP_CATEGORIES.map((cat) => {
                const count = getCategoryArticleCount(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setQuery('');
                      const el = document.getElementById(`cat-${cat.key}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white border border-secondary-200/70 hover:border-primary-200 transition-all text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500 flex-shrink-0">
                      <i className={`${cat.icon} text-base`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-label font-semibold text-foreground-900">{cat.label}</p>
                      <p className="text-xs text-foreground-500 mt-0.5 line-clamp-1">{cat.description}</p>
                      <p className="text-[10px] text-foreground-400 mt-1.5">{count} article{count !== 1 ? 's' : ''}</p>
                    </div>
                    <i className="ri-arrow-down-s-line text-foreground-300 flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Articles by category (visible when not searching) */}
        {!query &&
          HELP_CATEGORIES.map((cat) => {
            const articles = HELP_ARTICLES.filter((a) => a.category === cat.key).sort((a, b) => a.sortOrder - b.sortOrder);
            if (articles.length === 0) return null;
            return (
              <div key={cat.key} id={`cat-${cat.key}`} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-background-100 text-foreground-500">
                    <i className={`${cat.icon} text-sm`} />
                  </div>
                  <h2 className="font-label text-sm font-semibold text-foreground-900">{cat.label}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {articles.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              </div>
            );
          })}

        {/* Popular topics */}
        {!query && (
          <div className="mb-10">
            <h2 className="font-label text-sm font-semibold text-foreground-900 mb-4">Popular topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {popularArticles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>
        )}

        {/* Still need help */}
        <div className="rounded-2xl bg-white border border-secondary-200/70 p-8 text-center">
          <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-primary-50 text-primary-500 mb-4">
            <i className="ri-question-answer-line text-xl" />
          </div>
          <h3 className="font-heading text-lg text-foreground-900 mb-2">Still need help?</h3>
          <p className="text-sm text-foreground-500 max-w-sm mx-auto mb-4">
            If you can't find what you're looking for, send us a message and we'll get back to you.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/contact" className="btn-primary cursor-pointer whitespace-nowrap text-sm">
              <i className="ri-mail-line mr-1.5" /> Contact support
            </Link>
            <Link to="/app/getting-started" className="btn-outline cursor-pointer whitespace-nowrap text-sm">
              <i className="ri-guide-line mr-1.5" /> Setup checklist
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}