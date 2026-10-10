import { useEffect, useState } from "react";
import AppShell from "@/components/feature/AppShell";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";
import { useDemoDataSafe } from "@/demo/useDemoDataSafe";
const DEFAULTS = {
  portal_enabled: true,
  rsvp_enabled: true,
  household_rsvp_enabled: true,
  require_meal_choices: false,
  allow_song_requests: true,
  allow_messages: true,
  allow_late_rsvp: false,
  allow_rsvp_updates: true,
};
const LABELS: Record<keyof typeof DEFAULTS, string> = {
  portal_enabled: "Enable the guest portal",
  rsvp_enabled: "Accept RSVP responses",
  household_rsvp_enabled: "Allow one guest to respond for their household",
  require_meal_choices: "Require a meal choice for attending guests",
  allow_song_requests: "Collect song requests",
  allow_messages: "Collect guest messages",
  allow_late_rsvp: "Accept responses after the invitation deadline",
  allow_rsvp_updates: "Allow guests to update their response",
};
export default function RsvpSettingsPage() {
  const { weddingId, permissions } = useActiveWedding();
  const demo = useDemoDataSafe();
  const [settings, setSettings] = useState(DEFAULTS);
  const [meals, setMeals] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    setMessage("");
    setSettings(DEFAULTS);
    setMeals("");
    setLoading(true);
    if (demo) {
      const p = demo.state.portalSettings;
      setSettings({ ...DEFAULTS, ...p });
      setMeals((p.meal_options || []).join("\n"));
      setLoading(false);
      return;
    }
    if (!weddingId) {
      setLoading(false);
      return;
    }
    supabase
      .from("guest_portal_settings")
      .select("*")
      .eq("wedding_id", weddingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error)
          setMessage("RSVP settings could not be loaded. Refresh to retry.");
        else if (data) {
          setSettings(
            Object.fromEntries(
              Object.keys(DEFAULTS).map((key) => [
                key,
                data[key] ?? DEFAULTS[key],
              ]),
            ) as typeof DEFAULTS,
          );
          setMeals((data.meal_options || []).join("\n"));
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weddingId, !!demo]);
  async function save() {
    if (!permissions.canManageInvitations || !weddingId) return;
    const meal_options = [
      ...new Set(
        meals
          .split("\n")
          .map((m) => m.trim())
          .filter(Boolean),
      ),
    ];
    if (settings.require_meal_choices && !meal_options.length) {
      setMessage(
        "Add at least one meal option, or turn off required meal choices.",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    if (demo) {
      demo.updatePortalSettings({ ...settings, meal_options });
      setMessage("RSVP settings saved in the demo.");
    } else {
      const { error } = await supabase
        .from("guest_portal_settings")
        .upsert(
          {
            wedding_id: weddingId,
            ...settings,
            meal_options,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "wedding_id" },
        );
      setMessage(
        error
          ? "Settings could not be saved. Please retry."
          : "RSVP settings saved.",
      );
    }
    setSaving(false);
  }
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl mb-3">RSVP settings</h1>
        <p className="mb-6">
          Set what your guests can submit. Each invitation has its own response
          deadline.
        </p>
        {loading ? (
          <p>Loading settings…</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-5"
          >
            {(Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[]).map((key) => (
              <label key={key} className="flex gap-3">
                <input
                  type="checkbox"
                  checked={settings[key]}
                  disabled={!permissions.canManageInvitations || saving}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, [key]: e.target.checked }))
                  }
                />
                <span>{LABELS[key]}</span>
              </label>
            ))}
            <label className="block">
              Meal options, one per line
              <textarea
                className="block border rounded-xl p-3 w-full mt-2"
                rows={5}
                value={meals}
                disabled={!permissions.canManageInvitations || saving}
                onChange={(e) => setMeals(e.target.value)}
              />
            </label>
            <button
              className="rounded-xl bg-primary-600 text-white px-5 py-3 disabled:opacity-50"
              disabled={saving || !permissions.canManageInvitations}
            >
              {saving ? "Saving…" : "Save RSVP settings"}
            </button>
          </form>
        )}
        <p role="status" className="mt-4">
          {message}
        </p>
      </div>
    </AppShell>
  );
}
