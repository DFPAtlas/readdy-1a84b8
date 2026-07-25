import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface DashboardCardProps {
  icon: string;
  iconBg: string;
  title: string;
  description?: string;
  children?: ReactNode;
  href?: string;
  linkLabel?: string;
  badge?: string;
  empty?: boolean;
  emptyMessage?: string;
}

export default function DashboardCard({
  icon,
  iconBg,
  title,
  description,
  children,
  href,
  linkLabel = 'View details',
  badge,
  empty,
  emptyMessage,
}: DashboardCardProps) {
  return (
    <div className="bg-white border border-secondary-100 rounded-xl p-5 md:p-6 flex flex-col transition-colors hover:border-secondary-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg flex-shrink-0 ${iconBg}`}>
            <i className={`${icon} text-sm md:text-base`} />
          </div>
          <div className="min-w-0">
            <h3 className="font-label text-sm md:text-base font-semibold text-foreground-900 truncate">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-foreground-500 mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>
        </div>
        {badge && (
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 text-[11px] font-label font-medium ml-2">
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      {empty ? (
        <div className="flex-1 flex items-center justify-center py-4">
          <p className="text-xs md:text-sm text-foreground-400 text-center italic">
            {emptyMessage || 'Coming soon'}
          </p>
        </div>
      ) : children ? (
        <div className="flex-1">{children}</div>
      ) : null}

      {/* Footer action */}
      {href && !empty && (
        <Link
          to={href}
          className="mt-3 inline-flex items-center gap-1 text-xs md:text-sm font-label font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap"
        >
          {linkLabel}
          <i className="ri-arrow-right-line text-[10px]" />
        </Link>
      )}
    </div>
  );
}