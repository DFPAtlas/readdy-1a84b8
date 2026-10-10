import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";

export default function JoinWeddingPage() {
  const { token } = useParams();
  const { user, loading, refreshProfile } = useAuth();
  const { refreshWeddings, selectWedding } = useActiveWedding();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destination = `/join/${encodeURIComponent(token || "")}`;

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const { data, error: failure } = await supabase.functions.invoke(
        "settings-invite-member",
        { body: { action: "accept_invite", token } },
      );
      if (failure || !data?.success)
        throw new Error(
          data?.error ||
            "We could not accept this invitation. Check the invited email address or ask the couple for a new link.",
        );
      await refreshProfile();
      await refreshWeddings();
      await selectWedding(data.weddingId);
      navigate("/app/dashboard", { replace: true });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background-50 flex items-center justify-center p-6">
      <section className="w-full max-w-lg bg-white rounded-xl border border-secondary-100 p-8">
        <Link to="/" className="font-heading text-2xl">
          Vowora
        </Link>
        <h1 className="font-heading text-2xl mt-6 mb-3">
          Join a wedding workspace
        </h1>
        <p className="text-foreground-600 mb-6">
          Accept the couple’s invitation using the email address they invited.
          You will join their existing wedding with the permissions they chose.
        </p>
        {loading ? (
          <p>Loading your account…</p>
        ) : !user ? (
          <div className="flex flex-col gap-3">
            <Link
              className="btn-primary text-center"
              to={`/login?redirect=${encodeURIComponent(destination)}`}
            >
              Sign in to accept
            </Link>
            <Link
              className="btn-outline text-center"
              to={`/signup?redirect=${encodeURIComponent(destination)}`}
            >
              Create an account
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4">Signed in as {user.email}</p>
            <button
              className="btn-primary"
              disabled={busy || !token}
              onClick={accept}
            >
              {busy ? "Joining…" : "Accept invitation"}
            </button>
            <Link
              to={`/login?redirect=${encodeURIComponent(destination)}`}
              className="block mt-4 underline"
            >
              Use a different account
            </Link>
          </>
        )}
        {error && (
          <p role="alert" className="mt-5 text-red-700">
            {error}
          </p>
        )}
        <p className="mt-6 text-sm text-foreground-500">
          Expired or cancelled invitation? Ask the couple to resend it.
        </p>
      </section>
    </main>
  );
}
