import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "./AppShell";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";

const SOURCES = [
  {
    table: "guests",
    column: "full_name",
    label: "Guest",
    path: "/app/guests/",
  },
  {
    table: "guest_households",
    column: "display_name",
    label: "Household",
    path: "/app/guests/households",
  },
  {
    table: "invitations",
    column: "internal_name",
    label: "Invitation",
    path: "/app/invitations/",
  },
  {
    table: "wedding_events",
    column: "name",
    label: "Event",
    path: "/app/schedule",
  },
  {
    table: "wedding_suppliers",
    column: "business_name",
    label: "Supplier",
    path: "/app/suppliers",
  },
  {
    table: "wedding_tasks",
    column: "title",
    label: "Task",
    path: "/app/tasks",
  },
] as const;
type Result = { id: string; name: string; label: string; path: string };
export default function WorkspaceSearch() {
  const { weddingId } = useActiveWedding();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setResults([]);
    setError("");
    setLoading(false);
    if (!weddingId || query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      const term = query.trim().replace(/[\\%_]/g, "\\$&");
      const responses = await Promise.all(
        SOURCES.map((source) =>
          supabase
            .from(source.table)
            .select(`id, ${source.column}`)
            .eq("wedding_id", weddingId)
            .ilike(source.column, `%${term}%`)
            .limit(15),
        ),
      );
      if (cancelled) return;
      setResults(
        responses.flatMap((response, index) => {
          const source = SOURCES[index];
          return (response.data || []).map((row) => ({
            id: String(row.id),
            name: String(row[source.column] || "Untitled"),
            label: source.label,
            path: source.path.endsWith("/")
              ? source.path + row.id
              : source.path,
          }));
        }),
      );
      setError(
        responses.some((response) => response.error)
          ? "Some results could not be loaded. Try again or open the relevant planning page."
          : "",
      );
      setLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, weddingId]);
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl mb-4">Search your wedding</h1>
        <label htmlFor="workspace-search" className="block text-sm mb-2">
          Guests, invitations, events, tasks and suppliers
        </label>
        <input
          id="workspace-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded-xl p-3"
          placeholder="Enter at least two characters"
        />
        <div aria-live="polite" className="mt-4">
          {loading
            ? "Searching…"
            : error ||
              (query.trim().length >= 2 && !results.length
                ? "No matching results."
                : "")}
        </div>
        <ul className="mt-4 space-y-2">
          {results.map((result) => (
            <li key={`${result.label}-${result.id}`}>
              <Link
                className="block border rounded-xl p-4 hover:bg-primary-50"
                to={result.path}
              >
                <span className="text-xs text-foreground-500">
                  {result.label}
                </span>
                <p>{result.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
