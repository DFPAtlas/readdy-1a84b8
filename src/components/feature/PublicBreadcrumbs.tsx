import Breadcrumbs from '@/components/base/Breadcrumbs';
import type { PageBreadcrumbItem } from '@/hooks/usePageSeo';

interface PublicBreadcrumbsProps {
  items: PageBreadcrumbItem[];
  /** Container classes so the trail lines up with each page's content width. */
  className?: string;
}

/**
 * Discreet visible trail for public marketing pages.
 *
 * Reuses the shared semantic Breadcrumbs (nav > ol > li, aria-current="page").
 * Structured data is emitted separately by usePageSeo from the same config,
 * so the visible trail and the BreadcrumbList markup always stay identical.
 */
export default function PublicBreadcrumbs({ items, className = '' }: PublicBreadcrumbsProps) {
  if (items.length < 2) return null;

  return (
    <div className={className}>
      <Breadcrumbs items={items.map(({ label, path }) => ({ label, to: path }))} />
    </div>
  );
}