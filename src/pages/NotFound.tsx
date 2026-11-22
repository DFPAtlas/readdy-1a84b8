import { Link, useLocation } from "react-router-dom";
import { usePageSeo } from '@/hooks/usePageSeo';

export default function NotFound() {
  usePageSeo({
    title: 'Page Not Found — Vowora',
    description: 'The page you are looking for could not be found.',
    path: '/404',
    noindex: true,
  });

  const location = useLocation();
  
  return (
    <div className="relative flex flex-col items-center justify-center h-screen text-center px-4">
      <p
        className="absolute bottom-0 text-9xl md:text-[12rem] font-black text-gray-50 select-none pointer-events-none z-0"
        aria-hidden="true"
      >
        404
      </p>
      <div className="relative z-10">
        <h1 className="text-xl md:text-2xl font-semibold mt-6">Page not found</h1>
        <p className="mt-2 text-base text-gray-400 font-mono">{location.pathname}</p>
        <p className="mt-4 text-lg md:text-xl text-gray-500">The page you are looking for does not exist or has moved.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-label font-medium text-white hover:bg-primary-600 transition-colors cursor-pointer">
          Back to Vowora
        </Link>
      </div>
    </div>
  );
}