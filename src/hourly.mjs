// Historical hour profiles and explicit ratio denominators. No SQL or credentials.
export const HOURLY_LIMIT = 6000;
export function hourlyMetrics(row) {
  const records = Number(row.records), available = Number(row.available_seconds), occupied = Number(row.occupied_seconds);
  const theo = Number(row.theo_cents) / 100;
  if (![records, available, occupied, theo, Number(row.coin_in_cents), Number(row.payout_cents)].every(Number.isFinite))
    throw Error("Invalid hourly numeric result");
  return { entity: row.entity_id, hour: Number(row.local_hour), weekend: row.is_weekend,
    records, availableHours: available / 3600, occupiedHours: occupied / 3600,
    downtimeHours: records - available / 3600, coinInUsd: Number(row.coin_in_cents) / 100,
    payoutUsd: Number(row.payout_cents) / 100, theoUsd: theo,
    utilization: available > 0 ? occupied / available : null,
    theoPerAvailableHour: available > 0 ? theo / (available / 3600) : null };
}
export function hourProfile(rows, entity) {
  return Array.from({ length: 24 }, (_, hour) => {
    const cells = rows.filter((r) => r.entity === entity && r.hour === hour);
    const availableHours = cells.reduce((s, r) => s + r.availableHours, 0);
    const occupiedHours = cells.reduce((s, r) => s + r.occupiedHours, 0);
    const theoUsd = cells.reduce((s, r) => s + r.theoUsd, 0);
    return { hour, records: cells.reduce((s, r) => s + r.records, 0), availableHours,
      utilization: availableHours > 0 ? occupiedHours / availableHours : null,
      theoPerAvailableHour: availableHours > 0 ? theoUsd / availableHours : null };
  });
}
export function maintenanceWindows(rows, entity, duration = 2) {
  if (!Number.isInteger(duration) || duration < 1 || duration > 4) throw Error("Window must be one to four hours");
  const profile = hourProfile(rows, entity), windows = [];
  for (let start = 0; start < 24; start++) {
    const cells = Array.from({ length: duration }, (_, i) => profile[(start + i) % 24]);
    if (cells.some((c) => c.theoPerAvailableHour === null)) continue;
    windows.push({ start, end: (start + duration) % 24, duration,
      theoDebitPerRepresentativeMachine: cells.reduce((s, c) => s + c.theoPerAvailableHour, 0),
      minimumAvailableHourSupport: Math.min(...cells.map((c) => c.availableHours)),
      minimumRecords: Math.min(...cells.map((c) => c.records)) });
  }
  windows.sort((a, b) => a.theoDebitPerRepresentativeMachine - b.theoDebitPerRepresentativeMachine || a.start - b.start);
  return { low: windows[0] || null, high: windows.at(-1) || null, windows, profile };
}
