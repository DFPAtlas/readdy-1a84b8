/** Prevent spreadsheet formula execution while preserving CSV quoting. */
export function csvCell(value: unknown): string {
  let text =
    value == null
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function makeCsv(
  rows: Record<string, unknown>[],
  columns: string[],
): string {
  return (
    "\uFEFF" +
    [
      columns.map(csvCell).join(","),
      ...rows.map((row) =>
        columns.map((column) => csvCell(row[column])).join(","),
      ),
    ].join("\r\n")
  );
}
export function downloadText(text: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function calendarExport(events: Record<string, unknown>[]): string {
  const escape = (value: unknown) =>
    String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/[,;]/g, "\\$&");
  const stamp = (value: unknown) =>
    new Date(String(value))
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d+Z$/, "Z");
  const fold = (line: string) => {
    const lines: string[] = [];
    let current = "";
    let bytes = 0;
    for (const char of line) {
      const size = new TextEncoder().encode(char).length;
      if (bytes + size > 75) {
        lines.push(current);
        current = " ";
        bytes = 1;
      }
      current += char;
      bytes += size;
    }
    lines.push(current);
    return lines.join("\r\n");
  };
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vowora//Wedding Planner//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const event of events) {
    if (!event.start_at || Number.isNaN(Date.parse(String(event.start_at))))
      continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escape(event.id)}@vowora.uk`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(event.start_at)}`,
    );
    if (event.end_at && !Number.isNaN(Date.parse(String(event.end_at))))
      lines.push(`DTEND:${stamp(event.end_at)}`);
    lines.push(
      `SUMMARY:${escape(event.name || event.title)}`,
      `DESCRIPTION:${escape(event.description)}`,
      `LOCATION:${escape(event.location)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
