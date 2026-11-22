import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  /** Omit on the final item – the current page is never linked to itself. */
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  /** Emit matching BreadcrumbList structured data. Only for public, indexable pages. */
  jsonLd?: boolean;
  /** Tighter sizing for in-bar trails inside full-screen workspaces. */
  compact?: boolean;
}

function absoluteUrl(to?: string): string | undefined {
  if (!to) return undefined;
  if (/^https?:\/\//i.test(to)) return to;
  if (typeof window === 'undefined') return to;
  return `${window.location.origin}${to}`;
}

/**
 * Semantic breadcrumb trail: nav[aria-label] > ol > li, with the final crumb
 * marked aria-current="page". Long labels truncate instead of overflowing.
 */
export default function Breadcrumbs({ items, className = '', jsonLd = false, compact = false }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  const schema = jsonLd
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => {
          const url = absoluteUrl(item.to);
          return {
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            ...(url ? { item: url } : {}),
          };
        }),
      }
    : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className={`${compact ? '' : 'w-full'} ${className}`}>
        <ol
          className={
            compact
              ? 'flex flex-wrap items-center gap-x-1 gap-y-0 text-[10px] font-label leading-tight'
              : 'flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-label'
          }
        >
          {items.map((item, index) => {
            const isLast = index === lastIndex;
            const isLinked = !isLast && Boolean(item.to);
            return (
              <li key={`${item.label}-${index}`} className={`flex items-center min-w-0 ${compact ? 'gap-1' : 'gap-1.5'}`}>
                {index > 0 && (
                  <i
                    aria-hidden="true"
                    className={`ri-arrow-right-s-line flex-shrink-0 text-foreground-300 ${compact ? 'text-[9px]' : 'text-[11px]'}`}
                  />
                )}
                {isLinked ? (
                  <Link
                    to={item.to as string}
                    className={`truncate text-foreground-500 transition-colors hover:text-foreground-900 cursor-pointer whitespace-nowrap ${
                      compact ? 'max-w-[5rem] sm:max-w-[8rem]' : 'max-w-[9rem] sm:max-w-[16rem]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={`truncate whitespace-nowrap ${
                      compact ? 'max-w-[7rem] sm:max-w-[11rem]' : 'max-w-[11rem] sm:max-w-[20rem]'
                    } ${isLast ? 'font-medium text-foreground-800' : 'text-foreground-400'}`}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {schema && <script type="application/ld+json">{JSON.stringify(schema)}</script>}
    </>
  );
}