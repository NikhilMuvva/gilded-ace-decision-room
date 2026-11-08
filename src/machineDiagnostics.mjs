// Period/scope-responsive diagnostics. Fitted references and conditional uncertainty are explicit.
const caches = new WeakMap();
export function attachDecision(data, analysis) {
  if (
    !analysis ||
    analysis.schemaVersion !== 1 ||
    analysis.sourceManifestSha256 !== data.sourceManifestSha256 ||
    analysis.diagnosticRows?.length !== data.rows.length
  )
    return data;
  return { ...data, decision: analysis };
}
function index(data, analysis) {
  if (!caches.has(analysis)) {
    const rows = new Map(
      data.rows.map((r, i) => [`${r[0]}:${r[1]}`, analysis.diagnosticRows[i]]),
    );
    caches.set(analysis, { rows, fault: new Map() });
  }
  return caches.get(analysis);
}
const quantile = (values, p) => {
  const a = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!a.length) return null;
  const k = (a.length - 1) * p,
    i = Math.floor(k);
  return a[i] + (a[Math.ceil(k)] - a[i]) * (k - i);
};
function interval(data, rows, num, den) {
  if (rows.length < 2) return null;
  const grouped = new Map();
  for (const row of rows) {
    const month = data.dates[row[0]].slice(0, 7);
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month).push(row);
  }
  const groups = [...grouped.values()];
  let seed = 20261108;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const samples = [];
  for (let draw = 0; draw < 600; draw++) {
    let n = 0,
      d = 0;
    for (const group of groups) {
      let count = 0;
      while (count < group.length) {
        const start = Math.floor(random() * group.length);
        for (let k = 0; k < 7 && count < group.length; k++, count++) {
          const r = group[(start + k) % group.length];
          n += num(r);
          d += den(r);
        }
      }
    }
    if (d > 0) samples.push(n / d);
  }
  return [quantile(samples, 0.025), quantile(samples, 0.975)];
}
function tail(k, lambda) {
  if (k === 0) return 1;
  if (lambda === 0) return 0;
  let logFactorial = 0;
  for (let i = 2; i <= k; i++) logFactorial += Math.log(i);
  let term = Math.exp(k * Math.log(lambda) - lambda - logFactorial),
    sum = term;
  for (let j = k + 1; j < k + 200; j++) {
    term *= lambda / j;
    sum += term;
    if (term < Math.max(sum, 1e-100) * 1e-15) break;
  }
  return Math.min(1, sum);
}
function faultFamily(data, analysis, start, end, allScores) {
  const cache = index(data, analysis),
    key = start + "|" + end;
  if (cache.fault.has(key)) return cache.fault.get(key);
  const counts = new Map(),
    days = new Map();
  for (let i = 0; i < data.rows.length; i++) {
    const r = data.rows[i],
      month = data.dates[r[0]].slice(0, 7);
    if (month < start || month > end) continue;
    counts.set(r[1], (counts.get(r[1]) || 0) + analysis.diagnosticRows[i][2]);
    days.set(r[1], (days.get(r[1]) || 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0),
    totalDays = [...days.values()].reduce((a, b) => a + b, 0);
  const family = allScores
    .map((s) => {
      const k = counts.get(s.machineIndex) || 0,
        n = days.get(s.machineIndex) || 0,
        expected = totalDays > n ? ((total - k) / (totalDays - n)) * n : 0;
      return {
        id: s.machineIndex,
        count: k,
        days: n,
        expected,
        p: tail(k, expected),
        q: 1,
      };
    })
    .sort((a, b) => a.p - b.p);
  let q = 1;
  for (let i = family.length - 1; i >= 0; i--) {
    q = Math.min(q, (family[i].p * family.length) / (i + 1));
    family[i].q = q;
  }
  const result = new Map(family.map((s) => [s.id, s]));
  cache.fault.set(key, result);
  return result;
}
export function machineDiagnostic(
  data,
  analysis,
  rows,
  score,
  allScores,
  start,
  end,
  costMedian = 0.15,
) {
  if (!analysis || !rows.length) return null;
  const extra = index(data, analysis).rows,
    lookup = (r) => extra.get(`${r[0]}:${r[1]}`) || [0, 0, 0];
  const months = new Map();
  let expectedContribution = 0,
    expectedOccupied = 0,
    faults = 0;
  const costBreakdown =
    analysis.diagnosticColumns?.length >= 7
      ? { lease: 0, service: 0, power: 0, repair: 0 }
      : null;
  for (const r of rows) {
    const key = data.dates[r[0]].slice(0, 7),
      m = months.get(key) || {
        theo: 0,
        expected: 0,
        contribution: 0,
        expectedContribution: 0,
      };
    m.theo += r[7];
    m.expected += r[13];
    m.contribution += r[7] - r[11];
    m.expectedContribution += lookup(r)[0];
    months.set(key, m);
    expectedContribution += lookup(r)[0];
    expectedOccupied += lookup(r)[1];
    faults += lookup(r)[2];
    if (costBreakdown)
      for (const [i, key] of ["lease", "service", "power", "repair"].entries())
        costBreakdown[key] += lookup(r)[3 + i];
  }
  const ci = interval(
      data,
      rows,
      (r) => r[7],
      (r) => r[13],
    ),
    contributionCi = interval(
      data,
      rows,
      (r) => r[7] - r[11],
      (r) => lookup(r)[0],
    );
  const below = [...months.values()].filter((m) => m.theo < m.expected).length,
    contributionBelow = [...months.values()].filter(
      (m) => m.contribution < m.expectedContribution,
    ).length,
    required = Math.max(2, Math.ceil((2 * months.size) / 3));
  const labels = [];
  const enough =
    rows.length >= 56 &&
    months.size >= 2 &&
    score.support.fallbackDays / rows.length <= 0.25;
  if (!enough) labels.push("Insufficient evidence");
  if (enough && below >= required && ci?.[1] < 1)
    labels.push("Persistent low utilization");
  if (
    enough &&
    contributionBelow >= required &&
    contributionCi?.[1] < 1 &&
    score.costs / score.theo > costMedian
  )
    labels.push("Weak relative economics");
  if (score.z < 0 && score.q < 0.05) labels.push("Unusual payout behavior");
  const fault = faultFamily(data, analysis, start, end, allScores).get(
    score.machineIndex,
  );
  if (fault?.q < 0.05 && fault.count > fault.expected)
    labels.push("Excessive fault/downtime review");
  if (rows.some((r) => data.zones[r[2]].zone_id === "Z-B40"))
    labels.push("Possible location opportunity");
  if (!labels.length) labels.push("No substantial detected concern");
  return {
    labels,
    costBreakdown,
    indexInterval: ci,
    contributionInterval: contributionCi,
    actualContribution: score.win - score.costs,
    theoreticalContribution: score.theo - score.costs,
    contributionPerHour: score.available
      ? (score.theo - score.costs) / score.available
      : null,
    contributionIndex:
      expectedContribution > 0
        ? (score.theo - score.costs) / expectedContribution
        : null,
    occupancy: score.available ? score.occupied / score.available : null,
    relativeOccupancy:
      expectedOccupied > 0 ? score.occupied / expectedOccupied : null,
    coinPerAvailableHour: score.available ? score.coin / score.available : null,
    theoPerOccupiedHour: score.occupied ? score.theo / score.occupied : null,
    monthsBelowPeer: below,
    monthsObserved: months.size,
    requiredMonths: required,
    faults,
    faultFamily: fault,
    qualification:
      "Exploratory diagnostic dimensions, not a combined badness score. Intervals are pointwise and conditional on fitted peers; they do not control simultaneous error or establish intrinsic defects. Fault q uses a Poisson floor-rate null across all selected-month machines before floor filters and is sensitive to recurrent/dependent tickets.",
  };
}
