/** Convert a wedding-local clock time to UTC without treating summer time as GMT. */
export function weddingLocalToUtc(
  date: string,
  time: string,
  zone: string,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("Invalid wedding date or time");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  if (
    hour > 23 ||
    minute > 59 ||
    new Date(desired).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid wedding date or time");
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const localStamp = (utc: number) => {
    const p = Object.fromEntries(
      formatter.formatToParts(new Date(utc)).map((p) => [p.type, p.value]),
    );
    return Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
    );
  };
  let candidate = desired;
  for (let i = 0; i < 4; i++) {
    const delta = desired - localStamp(candidate);
    if (!delta) break;
    candidate += delta;
  }
  const matches = [candidate - 3600000, candidate, candidate + 3600000].filter(
    (value) => localStamp(value) === desired,
  );
  if (!matches.length)
    throw new Error(
      "That local time does not exist because the clocks change. Choose another time.",
    );
  return new Date(Math.min(...matches)).toISOString();
}
