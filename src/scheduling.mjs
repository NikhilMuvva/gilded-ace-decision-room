export function profileWindow(rates, hours) {
  if (
    !Array.isArray(rates) ||
    rates.length !== 24 ||
    rates.some((v) => !Number.isFinite(v)) ||
    hours <= 0 ||
    hours > 24
  )
    throw Error("Invalid hourly profile");
  let best = { start: 0, debit: Infinity };
  for (let start = 0; start < 24; start++) {
    let debit = 0;
    for (let i = 0; i < Math.floor(hours); i++)
      debit += rates[(start + i) % 24];
    debit += (hours % 1) * rates[(start + Math.floor(hours)) % 24];
    if (debit < best.debit) best = { start, debit };
  }
  return best;
}
export function plannedDebit(
  data,
  machines,
  minutes,
  { actionId = "", days = 30, quantity = 1 } = {},
) {
  const average = machines.reduce(
    (sum, m) => sum + (m.hourlyTheo * minutes) / 60,
    0,
  );
  if (!minutes || !machines.length)
    return {
      debit: average,
      average,
      start: null,
      mode: "No scheduled outage",
    };
  const profiles = machines.map(
    (m) => data.decision?.juneHourlyProfiles?.[m.id],
  );
  if (profiles.some((p) => !p))
    return {
      debit: average,
      average,
      start: null,
      mode: "All-hour baseline; hourly profile unavailable",
    };
  const rates = Array.from({ length: 24 }, (_, h) =>
      profiles.reduce((s, p) => s + p[h], 0),
    ),
    hours = minutes / 60;
  if (actionId.startsWith("A-MOVE")) {
    let debit = 0;
    for (let h = 0; h < Math.floor(hours); h++) debit += rates[(6 + h) % 24];
    debit += (hours % 1) * rates[(6 + Math.floor(hours)) % 24];
    return {
      debit,
      average,
      start: 6,
      mode: "Catalog relocation boundary: 06:00 local",
    };
  }
  if (machines.length > days)
    return {
      debit: average,
      average,
      start: null,
      mode: "All-hour debit; more tasks than eligible days and quiet-work crew capacity is unverified",
    };
  const window = profileWindow(rates, hours);
  return {
    debit: window.debit,
    average,
    start: window.start,
    mode: "June quiet-hour proxy; at most one target job per eligible day assumed",
  };
}
