import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/feature/AppShell";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";
import { isDemoMode } from "@/demo/demoConfig";
const STEPS = [
  {
    title: "Thank your guests",
    text: "Use updates to write a thank-you message and share the next steps for photos.",
    path: "/app/updates",
  },
  {
    title: "Collect and review photos",
    text: "Approve guest uploads, then download the memories you want to keep.",
    path: "/app/gallery",
  },
  {
    title: "Settle suppliers and contributions",
    text: "Check final invoices, outstanding payments and gift fund contributions.",
    path: "/app/budget",
  },
  {
    title: "Keep a copy of your plans",
    text: "Download your guest list, budget and wedding-day run sheet.",
    path: "/app/exports",
  },
  {
    title: "Manage your subscription",
    text: "Review renewal dates or cancel through the billing portal when you are finished.",
    path: "/app/billing",
  },
  {
    title: "Review data retention",
    text: "Keep the information you need and request deletion when you are ready.",
    path: "/app/account/privacy",
  },
];
export default function AfterWeddingPage() {
  const { weddingId, permissions } = useActiveWedding();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  async function close() {
    if (!weddingId || !permissions.canDeleteWedding || !confirm) return;
    setBusy(true);
    if (isDemoMode)
      setMessage(
        "Demo wedding remains available. In your account this closes guest access and hides the public website.",
      );
    else {
      const { error } = await supabase.rpc("close_wedding_guest_experience", {
        p_wedding_id: weddingId,
      });
      setMessage(
        error
          ? "Guest access could not be closed. Please retry."
          : "Guest access closed and public wedding website unpublished. Your planning records are retained.",
      );
    }
    setBusy(false);
    setConfirm(false);
  }
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl mb-3">After your wedding</h1>
        <p className="mb-6">
          Save your memories and finish the practical details at your own pace.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {STEPS.map((step) => (
            <Link
              key={step.path}
              to={step.path}
              className="border rounded-xl p-5 hover:bg-primary-50"
            >
              <h2 className="font-semibold mb-2">{step.title}</h2>
              <p className="text-sm">{step.text}</p>
            </Link>
          ))}
        </div>
        {permissions.canDeleteWedding && (
          <section className="border rounded-xl p-5 mt-6">
            <h2 className="font-semibold mb-2">Close guest access</h2>
            <p className="text-sm mb-4">
              This disables the guest portal, stops RSVPs, revokes existing
              invitation links and hides your public wedding website. Download
              your memories first. Subscription cancellation is managed
              separately through billing.
            </p>
            <label className="flex gap-3 mb-4">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              I am ready to close guest access
            </label>
            <button
              className="border rounded-xl px-4 py-2 disabled:opacity-50"
              disabled={!confirm || busy}
              onClick={close}
            >
              {busy ? "Closing…" : "Close guest access"}
            </button>
          </section>
        )}
        <p role="status" className="mt-4">
          {message}
        </p>
        <Link className="underline" to="/app/support">
          Get help from support
        </Link>
      </div>
    </AppShell>
  );
}
