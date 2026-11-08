// All variable values are bound parameters. Identifiers come from fixed maps.
export function normalizeHourlyRequest(body, data) {
  const fail = (message) => { const e = Error(message); e.code = "invalid_request"; throw e; };
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((k) => !["start", "end", "zone", "bank", "machineIds", "groupBy", "dayType", "hour"].includes(k))) fail("Unexpected hourly request fields.");
  const { start, end, zone = "all", bank = "all", machineIds = [], groupBy = "zone", dayType = "all", hour = "all" } = body;
  if (!data.months.includes(start) || !data.months.includes(end) || start > end) fail("Select a valid January–June 2025 month range.");
  if (zone !== "all" && !data.zones.some((z) => z.zone_id === zone)) fail("Unknown historical zone.");
  if (bank !== "all" && !data.locations.some((l) => l.bank_id === bank)) fail("Unknown historical bank.");
  if (!Array.isArray(machineIds) || machineIds.length > 4 || new Set(machineIds).size !== machineIds.length || machineIds.some((id) => !data.machines.some((m) => m.id === id))) fail("Select at most four known machines.");
  if (!["zone", "bank", "machine"].includes(groupBy) || (groupBy === "machine" && !machineIds.length)) fail("Machine profiles require selected machines.");
  if (!["all", "weekday", "weekend"].includes(dayType)) fail("Unknown gaming-day type.");
  if (hour !== "all" && (!Number.isInteger(hour) || hour < 0 || hour > 23)) fail("Hour must be 0–23 or all.");
  return { start, end, zone, bank, machineIds, groupBy, dayType, hour };
}
export function safeSchema(value = "dashboard_hourly") {
  if (!/^[a-z][a-z0-9_]{0,55}$/.test(value)) throw Error("Invalid database schema configuration");
  return value;
}
export function buildHourlyQuery(filters, { schema = "dashboard_hourly", raw = false } = {}) {
  safeSchema(schema);
  const entity = { zone: "zone_id", bank: "bank_id", machine: "machine_id" }[filters.groupBy];
  if (!entity) throw Error("Unknown hourly grouping");
  raw ||= filters.machineIds.length > 0 || filters.groupBy === "machine";
  const table = `${schema}.${raw ? "machine_hour" : "bank_hourly"}`;
  const stamp = raw ? "hour_start_utc" : "bucket_utc";
  const end = new Date(Date.UTC(Number(filters.end.slice(0, 4)), Number(filters.end.slice(5)), 1)).toISOString().slice(0, 10);
  const where = `${raw ? "active AND " : ""}
    ${stamp} >= (($1::date + TIME '06:00') AT TIME ZONE 'America/Los_Angeles')
    AND ${stamp} < (($2::date + TIME '06:00') AT TIME ZONE 'America/Los_Angeles')
    AND gaming_date >= $1::date AND gaming_date < $2::date
    AND ($3::text IS NULL OR zone_id=$3) AND ($4::text IS NULL OR bank_id=$4)
    ${raw ? "AND (cardinality($5::text[])=0 OR machine_id=ANY($5::text[]))" : "AND cardinality($5::text[])=0"}
    AND ($6::text='all' OR is_weekend=($6::text='weekend'))
    AND ($7::int IS NULL OR local_hour=$7)`;
  return { text: `SELECT ${entity} AS entity_id,local_hour,is_weekend,
    ${raw ? "count(*)" : "sum(records)"} AS records,
    sum(available_seconds) AS available_seconds,sum(occupied_seconds) AS occupied_seconds,
    sum(coin_in_cents) AS coin_in_cents,sum(payout_cents) AS payout_cents,
    sum(${raw ? "coin_in_cents*(1-configured_rtp)" : "theo_cents"}) AS theo_cents
    FROM ${table} WHERE ${where}
    GROUP BY ${entity},local_hour,is_weekend ORDER BY 1,2,3 LIMIT 6001`,
    values: [filters.start + "-01", end, filters.zone === "all" ? null : filters.zone,
      filters.bank === "all" ? null : filters.bank, filters.machineIds, filters.dayType,
      filters.hour === "all" ? null : filters.hour], relation: raw ? "raw hypertable" : "bank/hour continuous aggregate" };
}
