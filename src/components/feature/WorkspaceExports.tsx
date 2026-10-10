import { useState } from "react";
import AppShell from "./AppShell";
import { useActiveWedding } from "@/hooks/useActiveWedding";
import { supabase } from "@/lib/supabase";
import { calendarExport, downloadText, makeCsv } from "@/lib/planningExports";
const EXPORTS = [
  {
    key: "timeline",
    label: "Wedding-day run sheet",
    table: "wedding_timeline_items",
    columns: [
      "title",
      "timeline_date",
      "start_at",
      "end_at",
      "location",
      "responsible_contact",
      "shared_notes",
      "status",
    ],
  },
  {
    key: "guests",
    label: "Guest list and RSVPs",
    table: "guests",
    columns: [
      "full_name",
      "email",
      "mobile_phone",
      "rsvp_status",
      "ceremony_invited",
      "reception_invited",
      "evening_invited",
    ],
  },
  {
    key: "catering",
    label: "Catering and accessibility",
    table: "guests",
    columns: [
      "full_name",
      "rsvp_status",
      "meal_choice",
      "dietary_requirements",
      "allergy_notes",
      "accessibility_needs",
    ],
  },
  {
    key: "budget",
    label: "Budget expenses",
    table: "budget_expenses",
    columns: [
      "title",
      "planned_amount",
      "quoted_amount",
      "agreed_amount",
      "amount_paid",
      "status",
    ],
  },
  {
    key: "suppliers",
    label: "Supplier contacts",
    table: "wedding_suppliers",
    columns: ["business_name", "category", "website", "status"],
  },
  {
    key: "calendar",
    label: "Wedding calendar",
    table: "wedding_events",
    columns: ["id", "name", "start_at", "end_at", "description"],
  },
] as const;
export default function WorkspaceExports() {
  const { weddingId, permissions } = useActiveWedding();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<{
    title: string;
    columns: readonly string[];
    rows: Record<string, unknown>[];
  } | null>(null);
  async function run(config: (typeof EXPORTS)[number], printable = false) {
    if (!weddingId || !permissions.canExportPrivateData || busy) return;
    setBusy(config.key);
    setMessage("");
    setReport(null);
    try {
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; offset <= 100000; offset += 500) {
        const { data, error } = await supabase
          .from(config.table)
          .select([...new Set(["id", ...config.columns])].join(","))
          .eq("wedding_id", weddingId)
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        if (offset === 100000 && data?.length)
          throw new Error(
            "Export exceeds 100,000 records; request an archive through Support.",
          );
        rows.push(...((data || []) as unknown as Record<string, unknown>[]));
        if (!data || data.length < 500) break;
      }
      if (!rows.length) {
        setMessage("No saved records to export yet.");
        return;
      }
      if (printable)
        setReport({ title: config.label, columns: config.columns, rows });
      else {
        downloadText(
          config.key === "calendar"
            ? calendarExport(rows)
            : makeCsv(rows, [...config.columns]),
          `vowora-${config.key}-${new Date().toISOString().slice(0, 10)}.${config.key === "calendar" ? "ics" : "csv"}`,
          config.key === "calendar"
            ? "text/calendar;charset=utf-8"
            : "text/csv;charset=utf-8",
        );
        setMessage(`${config.label} downloaded.`);
      }
    } catch {
      setMessage("The export could not be loaded. Please retry.");
    } finally {
      setBusy("");
    }
  }
  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        <div className="print:hidden">
          <h1 className="font-heading text-3xl mb-3">
            Export your wedding plans
          </h1>
          <p className="mb-6">
            Download saved data, or open a printable report and choose Save as
            PDF in your browser. Catering reports contain personal guest
            information.
          </p>
          {!permissions.canExportPrivateData ? (
            <p>Your wedding role does not allow private data exports.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {EXPORTS.map((config) => (
                <div key={config.key} className="border rounded-xl p-5">
                  <h2 className="font-semibold mb-3">{config.label}</h2>
                  <button
                    className="underline mr-5 disabled:opacity-50"
                    disabled={!!busy || !weddingId}
                    onClick={() => run(config)}
                  >
                    {busy === config.key
                      ? "Preparing…"
                      : config.key === "calendar"
                        ? "Download calendar"
                        : "Download CSV"}
                  </button>
                  {config.key !== "calendar" && (
                    <button
                      className="underline disabled:opacity-50"
                      disabled={!!busy || !weddingId}
                      onClick={() => run(config, true)}
                    >
                      Printable report
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p role="status" className="my-4">
            {message}
          </p>
        </div>
        {report && (
          <section id="wedding-export-report" className="mt-6">
            <style>{`@media print {body *{visibility:hidden} #wedding-export-report,#wedding-export-report *{visibility:visible} #wedding-export-report{position:absolute;left:0;top:0;width:100%} #wedding-export-report button{display:none}}`}</style>
            <h2 className="font-heading text-2xl mb-3">{report.title}</h2>
            <button
              className="underline mb-4 print:hidden"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {report.columns.map((c) => (
                      <th key={c} className="text-left border p-2">
                        {c.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, i) => (
                    <tr key={i}>
                      {report.columns.map((c) => (
                        <td key={c} className="border p-2">
                          {String(row[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
