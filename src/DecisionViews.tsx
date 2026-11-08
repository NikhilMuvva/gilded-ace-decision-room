import { useMemo } from "react";
import { Panel, Note, money, number, pct, type Data } from "./ui";
import { enumeratePortfolios, choosePortfolios } from "./decisionEngine.mjs";
import { machineDiagnostic } from "./machineDiagnostics.mjs";
import { MetricHelp } from "./Help";

function EvidenceLinks() {
  return (
    <div className="doc-links">
      <a
        href="/docs/COMPREHENSIVE_SCIENTIFIC_REPORT.md"
        target="_blank"
        rel="noreferrer"
      >
        Scientific report ↗
      </a>
      <a href="/docs/SCIENTIFIC_AUDIT.json" target="_blank" rel="noreferrer">
        Audit results ↗
      </a>
      <a href="/docs/CLAIMS_AND_EVIDENCE.md" target="_blank" rel="noreferrer">
        Claims & evidence ↗
      </a>
    </div>
  );
}
export function OpportunityView({
  data,
  onInvestigate,
  onPlan,
  query,
  setQuery,
  selected,
  setSelected,
}: {
  data: Data;
  onInvestigate: (target: Data) => void;
  onPlan: () => void;
  query: string;
  setQuery: (value: string) => void;
  selected: string;
  setSelected: (value: string) => void;
}) {
  const analysis = data.decision;
  if (!analysis)
    return (
      <Panel title="Opportunity Register">
        <Note>
          Source-matched decision evidence is unavailable. Rebuild with npm run
          data.
        </Note>
        <EvidenceLinks />
      </Panel>
    );
  const opportunities = analysis.opportunities.filter((o: Data) =>
      `${o.title} ${o.target} ${o.type}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ),
    chosen =
      analysis.opportunities.find((o: Data) => o.id === selected) ||
      analysis.opportunities[0];
  return (
    <>
      <p className="fixed-scope">
        Fixed Jan–Jun 2025 evidence · proposed actions July 1–30 · financial
        exposure is not recoverable value
      </p>
      <Panel
        title="Opportunity Register"
        eyebrow="Separate demand, economics, payout, reliability, location and information needs"
        tools={
          <input
            aria-label="Search opportunities"
            placeholder="Target or opportunity"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      >
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Opportunity / target</th>
                <th>Historical scale</th>
                <th>Evidence</th>
                <th>Next decision</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o: Data) => (
                <tr key={o.id} className={selected === o.id ? "selected" : ""}>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => setSelected(o.id)}
                    >
                      {o.title}
                    </button>
                    <small>
                      {o.target} · {o.type}
                    </small>
                  </td>
                  <td>
                    {money(o.scale)}
                    <small>{o.scaleLabel}</small>
                  </td>
                  <td>{o.strength}</td>
                  <td>{o.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!opportunities.length && (
          <p className="empty">No matching opportunities.</p>
        )}
        <Note>
          Rows represent different decision problems. There is no combined
          machine “badness” score or invented probability that an action will
          pay off.
        </Note>
      </Panel>
      <Panel
        title={chosen.title}
        eyebrow={`${chosen.target} · ${chosen.persistent ? "Repeated historical pattern" : "Inspection/information lead"}`}
      >
        <p>{chosen.evidence}</p>
        <div className="measurement-grid">
          <div>
            <h4>Economic baseline and action</h4>
            <p>
              {chosen.action
                ? `${chosen.action.entry.id} · ${money(chosen.action.base.cost, false)} · ${chosen.action.base.days} eligible days`
                : "Scheduling condition; no additional catalog spend"}
              .
            </p>
            {chosen.action && (
              <p>
                Net property effect needed to break even:{" "}
                {chosen.action.base.breakevenNetEffect == null
                  ? "Information value is unpriced"
                  : pct(chosen.action.base.breakevenNetEffect, 2)}
                .
                {chosen.action.base.impossibleWithinRecoveryPool
                  ? " This exceeds the modeled full-recovery pool."
                  : ""}
              </p>
            )}
          </div>
          <div>
            <h4>Uncertainty</h4>
            <p>{chosen.uncertainty}</p>
            <p>{chosen.causal}</p>
          </div>
          <div>
            <h4>Pre-register the test</h4>
            <p>{chosen.measurement.primary}</p>
            <p>{chosen.measurement.period}</p>
            <p>{chosen.measurement.stop}</p>
          </div>
        </div>
        <details className="detail-block">
          <summary>Sources, controls and measurement detail</summary>
          <p>Tables: {chosen.sources.join(", ")}.</p>
          <dl className="measurement-list">
            {Object.entries(chosen.measurement).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
        <div className="plan-buttons">
          <button
            className="button secondary"
            onClick={() => onInvestigate(chosen.open)}
          >
            Open full-window evidence
          </button>
          <button className="button primary" onClick={onPlan}>
            Compare investment portfolios
          </button>
        </div>
        <EvidenceLinks />
      </Panel>
    </>
  );
}

export function PortfolioBoard({
  data,
  onApply,
  riskCap,
  setRiskCap,
  selected,
  setSelected,
}: {
  data: Data;
  onApply: (entries: Data[]) => void;
  riskCap: number;
  setRiskCap: (value: number) => void;
  selected: string;
  setSelected: (value: string) => void;
}) {
  const analysis = data.decision;
  const options = useMemo(
    () =>
      analysis ? enumeratePortfolios(data, analysis, analysis.candidates) : [],
    [data, analysis],
  );
  const choices = useMemo(
    () => (options.length ? choosePortfolios(options, riskCap) : null),
    [options, riskCap],
  );
  if (!analysis || !choices) return null;
  const strategies = [
      ...analysis.strategies.filter((p: Data) => p.id !== "recommended"),
      {
        ...choices.learning,
        id: "recommended",
        name: "Bounded learning recommendation",
      },
    ],
    chosen =
      strategies.find((p: Data) => p.id === selected) || strategies.at(-1);
  const recommended = choices.learning,
    actions = chosen.scenarios.base.actions,
    zeroNet = -chosen.cost - chosen.scenarios.base.debit;
  return (
    <Panel
      title="Compare feasible investment portfolios"
      eyebrow={`${analysis.search.candidateBundles} evidence-based bundles · ${options.length} feasible combinations · July 1–30, 2025`}
    >
      <div className="portfolio-policy">
        <label>
          Maximum modeled downside for learning{" "}
          <input
            aria-label="Learning downside cap"
            type="number"
            min="0"
            max="100000"
            step="1000"
            value={riskCap}
            onChange={(e) =>
              setRiskCap(
                Math.max(0, Math.min(100000, Number(e.target.value) || 0)),
              )
            }
          />
        </label>
        <p>
          This cap and coverage objective are management policies, not
          statistically learned preferences. Financial maximin and the
          base-scenario financial comparison choose preserving cash.
        </p>
      </div>
      <div className="metric-strip">
        <span>
          Learning portfolio spend <b>{money(recommended.cost, false)}</b>
        </span>
        <span>
          Cash retained <b>{money(recommended.remaining, false)}</b>
        </span>
        <span>
          Distinct pre-registered questions <b>{recommended.channels.length}</b>
        </span>
        <span>
          Low-scenario downside <b>{money(recommended.worstDownside, false)}</b>
        </span>
      </div>
      <div className="table-wrap">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Feasible strategy</th>
              <th>Spend</th>
              <th>Remaining</th>
              <th>Low net</th>
              <th>Base net</th>
              <th>High net</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((p: Data) => (
              <tr key={p.id} className={chosen.id === p.id ? "selected" : ""}>
                <td>
                  <button
                    className="table-link"
                    onClick={() => setSelected(p.id)}
                  >
                    {p.name}
                  </button>
                </td>
                <td>{money(p.cost, false)}</td>
                <td>{money(p.remaining, false)}</td>
                {["low", "base", "high"].map((level) => (
                  <td key={level}>{money(p.scenarios[level].net, false)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>
        These are scenario-conditioned nets, not expected returns or confidence
        intervals. The learning recommendation buys evidence under the displayed
        downside cap; it is not a proven maximum-profit allocation. Ten
        purchases cost $220,000 and are infeasible; the replacement comparison
        uses ten leased replacements active on June 30.
      </Note>
      <details className="detail-block" open>
        <summary>{chosen.name}: targets, costs and break-even</summary>
        {!actions.length && (
          <p>
            No actions; $100,000 retained and quantified incremental net is
            zero.
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action / exact targets</th>
                <th>One-time / recurring</th>
                <th>Lead / eligible days</th>
                <th>Downtime / timing</th>
                <th>Base assumptions</th>
                <th>Break-even</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a: Data) => (
                <tr key={a.id}>
                  <td>
                    {a.id} × {a.quantity}
                    <small>{a.targets.join(", ")}</small>
                    {a.destinations.length > 0 && (
                      <small>To: {a.destinations.join(", ")}</small>
                    )}
                  </td>
                  <td>
                    {money(a.oneTimeCost, false)} /{" "}
                    {money(a.recurringCost, false)}
                  </td>
                  <td>
                    {a.leadDays} / {a.days} days
                  </td>
                  <td>
                    {number(a.requiredMachineDowntimeHours, 1)} machine-h
                    <small>
                      {a.startHour === null
                        ? "All-hour debit"
                        : `${a.startHour}:00 local`}
                      ; {money(a.plannedDebit, false)} debit
                    </small>
                    <small>{a.scheduleMode}</small>
                  </td>
                  <td>
                    {a.informationUnpriced
                      ? "Information value unpriced"
                      : `${pct(a.assumedEffect)} effect × ${pct(a.retainedShare, 0)} retained share`}
                    <small>Base: {money(a.base, false)}</small>
                  </td>
                  <td>
                    {a.breakevenNetEffect === null
                      ? "Unpriced information"
                      : `${pct(a.breakevenNetEffect, 2)} net property effect`}
                    {a.impossibleWithinRecoveryPool && (
                      <small>Exceeds 100% recovery</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Zero-effect net: <b>{money(zeroNet, false)}</b>. Under the base
          scenario, additional unpriced decision/information value must exceed{" "}
          <b>{money(chosen.informationValueRequired, false)}</b> to offset the
          quantified shortfall. Future July results have not been observed.
        </p>
        <button
          className="button secondary"
          onClick={() =>
            onApply(
              chosen.entries.map((e: Data, i: number) => ({
                ...e,
                effect:
                  actions[i].assumedEffect * actions[i].retainedShare * 100,
              })),
            )
          }
        >
          Load this portfolio with base assumptions
        </button>
      </details>
      <details className="detail-block">
        <summary>Search, risk policy and prospective measurement plans</summary>
        <p>{analysis.search.scope}</p>
        <p>{choices.policy}</p>
        <p>
          Positive benefits retain only the largest demand-pool and
          recovery-pool gain; negative effects all count. Avoided old contracts
          and full overhead are not silently credited. Per-target quiet
          scheduling uses at most one job per eligible day; broader sweeps fall
          back to all-hour opportunity if crew capacity is unverified.
          Relocations start at the catalog's 06:00 gaming-day boundary.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Downside cap</th>
                <th>Selected spend</th>
                <th>Questions</th>
                <th>Low-scenario downside</th>
              </tr>
            </thead>
            <tbody>
              {analysis.search.frontier.map((f: Data) => (
                <tr key={f.riskCap}>
                  <td>{money(f.riskCap, false)}</td>
                  <td>{money(f.cost, false)}</td>
                  <td>{f.channels.join(", ") || "Preserve cash"}</td>
                  <td>{money(f.worstDownside, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {Object.entries(analysis.measurementPlans).map(([key, value]) => (
          <div key={key} className="measurement-plan">
            <h4>{key}</h4>
            <dl className="measurement-list">
              {Object.entries(value as Data).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </details>
      <EvidenceLinks />
    </Panel>
  );
}

export function MachineDimensions({
  data,
  rows,
  chosen,
  allScores,
  start,
  end,
  costMedian,
}: {
  data: Data;
  rows: Data[];
  chosen: Data;
  allScores: Data[];
  start: string;
  end: string;
  costMedian: number;
}) {
  const selectedRows = useMemo(
    () => rows.filter((r) => r[1] === chosen.machineIndex),
    [rows, chosen.machineIndex],
  );
  const diagnostic = useMemo(
    () =>
      data.decision
        ? machineDiagnostic(
            data,
            data.decision,
            selectedRows,
            chosen,
            allScores,
            start,
            end,
            costMedian,
          )
        : null,
    [data, selectedRows, chosen, allScores, start, end, costMedian],
  );
  if (!diagnostic) return null;
  return (
    <details className="detail-block" open>
      <summary>Diagnostic dimensions · selected scope</summary>
      <div className="diagnostic-labels">
        {diagnostic.labels.map((label: string) => (
          <span className="status" key={label}>
            {label}
          </span>
        ))}
      </div>
      <dl className="dossier-metrics">
        <div>
          <dt>Actual contribution after supplied costs</dt>
          <dd>{money(diagnostic.actualContribution, false)}</dd>
        </div>
        <div>
          <dt>Theo less recorded supplied costs</dt>
          <dd>{money(diagnostic.theoreticalContribution, false)}</dd>
        </div>
        <div>
          <dt>
            Conditional peer index interval{" "}
            <MetricHelp term="conditional-interval" />
          </dt>
          <dd>
            {diagnostic.indexInterval
              ?.map((n: number) => number(n, 2))
              .join("–")}
            ×
          </dd>
        </div>
        <div>
          <dt>Months below peer benchmark</dt>
          <dd>
            {diagnostic.monthsBelowPeer} / {diagnostic.monthsObserved}
          </dd>
        </div>
        <div>
          <dt>Occupancy / peer occupancy</dt>
          <dd>
            {pct(diagnostic.occupancy)} /{" "}
            {number(diagnostic.relativeOccupancy, 2)}×
          </dd>
        </div>
        <div>
          <dt>Wagers / available hour</dt>
          <dd>{money(diagnostic.coinPerAvailableHour, false, 2)}</dd>
        </div>
        <div>
          <dt>Theo / occupied hour</dt>
          <dd>{money(diagnostic.theoPerOccupiedHour, false, 2)}</dd>
        </div>
        <div>
          <dt>Recorded fault tickets</dt>
          <dd>{diagnostic.faults}</dd>
        </div>
      </dl>
      {diagnostic.costBreakdown && (
        <details className="detail-block">
          <summary>Supplied cost breakdown · selected scope</summary>
          <dl className="dossier-metrics">
            {Object.entries(diagnostic.costBreakdown).map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{money(Number(value), false)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      <p className="scope-note">{diagnostic.qualification}</p>
      <p className="scope-note">
        Persistence policy: at least 56 active days, two observed months,{" "}
        {diagnostic.requiredMonths} months below comparison and a pointwise
        upper interval below 1. Cost and location dimensions remain separate.
      </p>
    </details>
  );
}

export function ScientificReference({ data }: { data: Data }) {
  const a = data.decision;
  if (!a) return null;
  return (
    <Panel
      title="Comprehensive scientific audit and decision engine"
      eyebrow={`${a.checks.length} source-to-display checks · fixed Jan–Jun 2025`}
    >
      <div className="measurement-grid">
        <div>
          <h4>Accounting and operational checks</h4>
          <p>
            Raw daily/hourly meters, effective placements, RTP/hold, exposure,
            supplied costs, actual staffing, sessions/trips, tracked outcomes,
            loyalty/POS and traffic coverage reconcile. Sources and numerical
            tolerances are recorded in the audit.
          </p>
          <p>
            All machines have positive six-month contribution after supplied
            costs; contribution is not complete profit.
          </p>
        </div>
        <div>
          <h4>Benchmark disagreement</h4>
          <p>
            Exact versus cross-zone rank correlation:{" "}
            {number(a.benchmarkValidation.exactVsCrossZoneSpearman, 3)}. First
            versus second half:{" "}
            {number(a.benchmarkValidation.firstVsSecondHalfSpearman, 3)}.
            Rankings depend on the question and location conditioning.
          </p>
          <p>{a.benchmarkValidation.benchmarkDecision}</p>
        </div>
        <div>
          <h4>Economic decision</h4>
          <p>
            {a.search.feasiblePortfolios} feasible combinations from{" "}
            {a.search.candidateBundles} evidence-based bundles. The bounded
            learning policy recommends {money(a.recommendation.cost, false)};
            quantified financial maximin preserves cash.
          </p>
          <p>Neither is a demonstrated causal optimum.</p>
        </div>
      </div>
      <details className="detail-block">
        <summary>Manufacturer, closure and tail diagnostics</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>Faults / 1,000 active days</th>
                <th>Adjusted rate ratio</th>
                <th>Interval</th>
                <th>Direct repair cost</th>
              </tr>
            </thead>
            <tbody>
              {a.manufacturer.map((m: Data) => (
                <tr key={m.manufacturer}>
                  <td>{m.manufacturer}</td>
                  <td>{number(m.faultsPer1000Days, 2)}</td>
                  <td>{number(m.adjustedRateRatio, 2)}</td>
                  <td>
                    {m.adjustedInterval
                      ?.map((n: number) => number(n, 2))
                      .join("–") || "Reference"}
                  </td>
                  <td>{money(m.repairCost, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {a.manufacturerModel.method} Dispersion:{" "}
          {number(a.manufacturerModel.dispersion, 2)}.
        </p>
        <p>
          Back Forty adjusted closure association:{" "}
          {a.closureDesign.models
            .map((m: Data) => `${pct(m.duringAssociation, 2)} (${m.name})`)
            .join("; ")}
          . Pre-period differential monthly trend:{" "}
          {pct(a.closureDesign.preDifferentialTrendPerMonth, 2)}; parallel
          trends are not established.
        </p>
        <p>
          M-1158 normal tail {number(a.payoutSensitivity.normalP, 7)};
          constructed moment-matched simulation frequency{" "}
          {number(a.payoutSensitivity.simulationTailFrequency, 7)} over{" "}
          {number(a.payoutSensitivity.draws)} draws.{" "}
          {a.payoutSensitivity.qualification}
        </p>
      </details>
      <details className="detail-block">
        <summary>
          Additional rolling-origin and nested calendar-model evaluation
        </summary>
        <p>{a.forecastResearch.decision}</p>
        <p>{a.forecastResearch.fairness}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Feb–Apr rolling-origin MAE</th>
                <th>RMSE</th>
              </tr>
            </thead>
            <tbody>
              {a.forecastResearch.summary.map((m: Data) => (
                <tr key={m.model}>
                  <td>{m.model}</td>
                  <td>{money(m.mae, false)}</td>
                  <td>{money(m.rmse, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Nested ridge alpha uses prior-data 14-day inner folds. February's
          short training history uses default alpha 1. Complete fold
          MAE/RMSE/WAPE/MASE and original May–June
          weekday/weekend/month/busy/quiet errors are in the report.
        </p>
        <p>
          Quiet-hour rule chosen from January–April:{" "}
          {a.hourValidation.twoHourWindowStart}:00 local for two hours. In the
          later historical diagnostic, opportunity debit per machine is{" "}
          {money(a.hourValidation.frozenWindowTestDebitPerMachine, false, 2)}{" "}
          versus an all-hour estimate{" "}
          {money(a.hourValidation.allHourTestDebitPerMachine, false, 2)}. This
          is a scheduling proxy.
        </p>
      </details>
      <EvidenceLinks />
    </Panel>
  );
}
