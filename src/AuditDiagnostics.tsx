import React, { useEffect, useState } from "react";
import { Panel, Note, number, money, pct, type Data } from "./ui";
export function AuditDiagnostics() {
  const [audit, setAudit] = useState<Data>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/data/diagnostics.json")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => {
        if (active && d.peerSensitivity) setAudit(d);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (!audit)
    return (
      <p className="scope-note">
        {failed
          ? "Independent diagnostics unavailable; the primary analysis remains usable."
          : "Independent diagnostics: see the audit appendix below."}{" "}
        <a href="/docs/ALGORITHM_AUDIT.json" target="_blank" rel="noreferrer">
          Audit results ↗
        </a>
      </p>
    );
  const peer = audit.peerSensitivity.find((p: Data) => p.minimumHours === 24),
    loyalty = audit.loyaltySensitivity.find(
      (p: Data) => p.minimumRedemptions === 20,
    );
  return (
    <Panel
      title="Robustness and calibration diagnostics"
      eyebrow="Independent CSV-source recomputation · fixed Jan–Jun 2025"
    >
      <div className="metric-strip">
        <span>
          <b>
            {peer.fallbackDays} / {audit.totals.activeRows}
          </b>{" "}
          peer fallback days (
          {pct(peer.fallbackDays / audit.totals.activeRows, 3)})
        </span>
        <span>
          <b>{pct(loyalty.januaryFaceCoverage, 2)}</b> January loyalty
          face-value coverage
        </span>
      </div>
      <details className="detail-block">
        <summary>Peer support and payout qualifications</summary>
        <p>
          0/24/96-hour cutoffs leave the whole-period minimum peer index at{" "}
          {number(peer.minIndex, 4)}×. At zero hours, zero-denominator cells
          still require fallback. The former 0.80× screen is not a calibrated
          failure boundary.
        </p>
        <p>
          M-1158 accumulates its adjusted flag across six months. Jan–Mar, April
          and May–June do not individually survive the 5% multiple-testing
          policy. Across-machine z-score sample SD:{" "}
          {number(audit.payout.sampleSdZ, 3)}.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hypothetical variance multiplier</th>
                <th>M-1158 z</th>
                <th>Adjusted q</th>
              </tr>
            </thead>
            <tbody>
              {audit.payout.varianceSensitivity.map((s: Data) => (
                <tr key={s.varianceMultiplier}>
                  <td>{s.varianceMultiplier}×</td>
                  <td>{number(s.m1158Z, 3)}</td>
                  <td>{number(s.m1158Q, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>{audit.payout.qualification}</Note>
      </details>
      <details className="detail-block">
        <summary>Closure and relocation window sensitivity</summary>
        <p>
          {audit.closureSensitivity
            .map((s: Data) => `${s.window}: ${pct(s.relativeChange, 2)}`)
            .join("; ")}
          . Both are associations, not causal effects.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Move</th>
                <th>14-day ratio</th>
                <th>21-day ratio</th>
                <th>28-day ratio</th>
              </tr>
            </thead>
            <tbody>
              {audit.moveSensitivity.map((m: Data) => (
                <tr key={m.machine}>
                  <td>
                    {m.machine} · {m.date}
                  </td>
                  {m.windows.map((w: Data) => (
                    <td key={w.days}>{number(w.ratio, 3)}×</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          After/before theo per available hour. Four historical moves do not
          establish a general relocation benefit.
        </Note>
      </details>
      <details className="detail-block">
        <summary>Loyalty coverage and downtime variability</summary>
        <p>
          {loyalty.cells} supported item × tier cells cover{" "}
          {pct(loyalty.januaryFaceCoverage, 2)} of January face value. Minimum
          counts 1–100 retain a June/January fixed-mix ratio near{" "}
          {number(loyalty.juneJanuaryRatio, 3)}.
        </p>
        <p>
          Historical downtime proxy resampling interval:{" "}
          {money(audit.downtimeResampling.interval[0], false)}–
          {money(audit.downtimeResampling.interval[1], false)}; 5,000 circular
          seven-day draws, seed 2026. This measures variability of the
          historical proxy. The separate 50–150% band is a hypothetical rate
          scenario. Neither estimates recoverable contribution; zero incremental
          gain remains possible.
        </p>
      </details>
      <details className="detail-block">
        <summary>Forecast diagnostics and maintenance scheduling</summary>
        <p>
          The existing weekday mean remains selected by April. Additional
          candidates were reviewed retrospectively; May–June has already been
          examined and cannot become a new untouched test.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>April MAE ($ / day)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(audit.forecast.aprilValidationMae).map(
                ([name, value]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{money(Number(value), false)}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <p>
          Lower predicted daily wagers suggest quieter weekdays for planned
          maintenance:{" "}
          {audit.forecast.lowDemandWeekdays
            .slice(0, 3)
            .map(
              (d: Data) =>
                `${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][d.weekday]} (${money(d.predictedDailyWagers, false)})`,
            )
            .join(", ")}
          . This is a scheduling heuristic from frozen January–April weekday
          means; it does not predict outage cost or action ROI.
        </p>
      </details>
      <div className="doc-links">
        <a href="/docs/PARAMETER_REGISTER.md" target="_blank" rel="noreferrer">
          Parameter register ↗
        </a>
        <a href="/docs/ALGORITHM_AUDIT.json" target="_blank" rel="noreferrer">
          Recomputed results ↗
        </a>
      </div>
    </Panel>
  );
}
