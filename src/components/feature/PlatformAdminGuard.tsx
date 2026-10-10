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
      {children}
    </PlatformAdminContext.Provider>
  );
}
