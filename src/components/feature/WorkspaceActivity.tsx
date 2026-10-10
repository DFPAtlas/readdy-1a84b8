import { useEffect, useState } from "react";
import AppShell from "./AppShell";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";
type Entry = {
  id: string;
  action: string;
  summary: string;
  created_at: string;
  source: string;
};
const TABLES = [
  "guest_activity_log",
  "invitation_activity_log",
  "task_activity_log",
  "budget_activity_log",
] as const;
export default function WorkspaceActivity() {
  const { weddingId } = useActiveWedding();
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(30);
  const [query, setQuery] = useState("");
  useEffect(() => {
    setLimit(30);
    setQuery("");
  }, [weddingId]);
  useEffect(() => {
    let cancelled = false;
    setRows([]);
    setError("");
    if (!weddingId) return;
    setLoading(true);
    Promise.all(
      TABLES.map((table) =>
        supabase
          .from(table)
          .select("id, action, summary, created_at")
          .eq("wedding_id", weddingId)
          .order("created_at", { ascending: false })
          .limit(limit),
      ),
    )
      .then((responses) => {
        if (cancelled) return;
        setRows(
          responses
            .flatMap((response, i) =>
              (response.data || []).map((row) => ({
                ...row,
                source: TABLES[i],
              })),
            )
            .sort((a, b) => b.created_at.localeCompare(a.created_at)),
        );
        setError(
          responses.some((response) => response.error)
            ? "Some activity could not be loaded. Please retry."
            : "",
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Activity could not be loaded. Please retry.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [weddingId, limit]);
  const filtered = rows.filter((row) =>
    `${row.action} ${row.summary}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl mb-4">Wedding activity</h1>
        <label htmlFor="activity-search" className="block mb-2 text-sm">
          Filter loaded activity
        </label>
        <input
          id="activity-search"
          type="search"
          className="border rounded-xl p-3 w-full"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="my-4" role="status">
          {loading
            ? "Loading…"
            : error || (!filtered.length ? "No recorded activity yet." : "")}
        </p>
        <ol className="space-y-3">
          {filtered.map((row) => (
            <li
              key={`${row.source}-${row.id}`}
              className="border rounded-xl p-4"
            >
              <p>{row.summary || row.action.replace(/_/g, " ")}</p>
              <time
                className="text-xs text-foreground-500"
                dateTime={row.created_at}
              >
                {new Date(row.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
        {rows.length > 0 && limit < 300 && (
          <button
            className="underline mt-5"
            disabled={loading}
            onClick={() => setLimit((l) => l + 30)}
          >
            Load older activity
          </button>
        )}
      </div>
    </AppShell>
  );
}
