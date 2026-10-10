import { useState } from "react";
import AppShell from "@/components/feature/AppShell";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";
import { isDemoMode } from "@/demo/demoConfig";
export default function CustomerSupportPage() {
  const { weddingId } = useActiveWedding();
  const [category, setCategory] = useState("other");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit() {
    setBusy(true);
    setMessage("");
    if (isDemoMode) {
      setMessage(
        "Demo request prepared. Switch to your account to submit a support request.",
      );
      setBusy(false);
      return;
    }
    const { data, error } = await supabase.rpc(
      "submit_customer_support_request",
      {
        p_wedding_id: weddingId,
        p_category: category,
        p_subject: subject.trim(),
        p_details: details.trim(),
      },
    );
    if (error)
      setMessage(
        "Your request could not be submitted. Please retry, or contact support@vowora.uk.",
      );
    else {
      setMessage(
        `Support request ${data} received. Keep this reference when contacting us.`,
      );
      setSubject("");
      setDetails("");
    }
    setBusy(false);
  }
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl mb-4">Contact support</h1>
        <p className="mb-6">
          Tell us what happened and which page you were using. Include an
          invitation reference if helpful. Keep passwords, payment details and
          guest medical information out of your message.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="block">
            Topic
            <select
              className="block w-full border rounded-xl p-3 mt-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "billing",
                "authentication",
                "invitations",
                "rsvp",
                "website",
                "gallery",
                "registry",
                "guest_access",
                "other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Subject
            <input
              className="block w-full border rounded-xl p-3 mt-2"
              required
              maxLength={160}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block">
            What do you need help with?
            <textarea
              className="block w-full border rounded-xl p-3 mt-2"
              required
              minLength={10}
              maxLength={4000}
              rows={6}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
          <button
            className="rounded-xl px-5 py-3 bg-primary-600 text-white disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Submitting…" : "Submit support request"}
          </button>
        </form>
        <p role="status" className="mt-4">
          {message}
        </p>
      </div>
    </AppShell>
  );
}
