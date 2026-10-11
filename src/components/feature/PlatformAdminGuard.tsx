import { NavLink } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";
import { PlatformAdminContext } from "@/context/PlatformAdminContext";
export default function PlatformAdminGuard({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAllowed(null);
    if (!user) {
      setAllowed(false);
      return;
    }
    supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled) setAllowed(!error && !!data);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  if (allowed === null)
    return (
      <p className="p-8" role="status">
        Checking administrator access…
      </p>
    );
  if (!allowed)
    return (
      <main className="p-8">
        <h1 className="text-2xl">Administrator access required</h1>
        <p className="mt-3">This page is available to Vowora platform staff.</p>
        <a className="underline block mt-4" href="/app/dashboard">
          Return to your wedding
        </a>
      </main>
    );
  return (
    <PlatformAdminContext.Provider value={true}>
      <nav aria-label="Administration" className="bg-white border-b border-secondary-100 px-4 py-3 flex flex-wrap gap-2">
        {[["operations", "Admin dashboard"], ["support", "Support"], ["incidents", "Incidents"], ["analytics", "Analytics"], ["feedback", "Feedback"], ["improvements", "Improvements"], ["releases", "Releases"], ["system-readiness", "Readiness"], ["backups", "Backups"], ["recovery", "Recovery"], ["data-protection", "Data protection"], ["performance", "Performance"]].map(([path, label]) => (
          <NavLink key={path} to={`/app/admin/${path}`} className={({isActive}) => `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-primary-50 text-primary-700 font-semibold" : "text-foreground-600 hover:bg-background-50"}`}>{label}</NavLink>
        ))}
      </nav>
      {children}
    </PlatformAdminContext.Provider>
  );
}
