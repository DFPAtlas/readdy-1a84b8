import type * as React from "react";
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDemoDataSafe } from '@/demo/useDemoDataSafe';
import { useDemoTheme } from '@/hooks/useDemoTheme';

export default function DemoGuestPortalShell({ children }: { children: React.ReactNode }) {
  const { accessId } = useParams();
  const navigate = useNavigate();
  const demo = useDemoDataSafe();
  const basePath = `/guest/${accessId}`;
  const wedding = demo?.state.wedding;

  // Apply demo theme colours from settings
  useDemoTheme();

  const handleLeave = () => navigate('/');

  return (
    <div className="min-h-screen bg-background-50 flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-secondary-100">
        <div className="max-w-6xl mx-auto flex items-center h-14 px-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link to={basePath} className="font-heading text-lg font-semibold text-foreground-900 truncate cursor-pointer whitespace-nowrap">
              {wedding ? `${wedding.partner_one_name} & ${wedding.partner_two_name}` : 'Wedding'}
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-label hidden sm:inline-block">Demo Guest View</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleLeave} className="text-xs text-foreground-400 hover:text-foreground-600 cursor-pointer whitespace-nowrap flex items-center gap-1">
              <i className="ri-logout-box-line" /> Leave
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-secondary-100 bg-white">
        <p className="text-xs text-foreground-400">
          {wedding ? `${wedding.partner_one_name} & ${wedding.partner_two_name}` : ''}{' '}
          {wedding?.wedding_date ? `· ${new Date(wedding.wedding_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
        </p>
        <p className="text-[10px] text-foreground-300 mt-1">Demo mode — this is a private demonstration portal.</p>
      </footer>
    </div>
  );
}