import React, { useRef, useEffect } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { aggregate, unitCost } from "./lib.mjs";
import {
  Kpi,
  Panel,
  Chart,
  Insight,
  Note,
  money,
  number,
  pct,
  month,
  dateLabel,
  COLORS,
  chartProps,
  toolProps,
  type Data,
} from "./ui";
import { MetricHelp } from "./Help";
import { Floor, type FloorView } from "./OperationalMap";
import { MethodReference } from "./Guidance";
import { AuditDiagnostics } from "./AuditDiagnostics";
import { MachineDimensions, ScientificReference } from "./DecisionViews";

export function Overview({
  data,
  totals,
  trend,
  scope,
  onNavigate,
  onFlag,
}: {
  data: Data;
  totals: Data;
  trend: Data[];
  scope: string;
  onNavigate: (p: string) => void;
  onFlag: (id: string) => void;
}) {
  const recommended = data.planner.recommended,
    cost = recommended.reduce(
      (s: number, e: Data) =>
        s +
        e.quantity *
          unitCost(data.actions.find((a: Data) => a.action_type_id === e.id)),
      0,
    ),
    flag = data.facts.flagMachines[0],
    manufacturer = data.decision
      ? [...data.decision.manufacturer].sort(
          (a: Data, b: Data) => b.faultsPer1000Days - a.faultsPer1000Days,
        )[0]
      : null;
  return (
    <>
      <div className="decision-strip">
        <div>
          <strong>
            Decision under review: replace the ten lowest-earning machines.
          </strong>
          <span>
            {data.decision ? "Bounded learning portfolio" : "Proposed response"}
            : {money(cost, false)} · retain{" "}
            {money(data.planner.budget - cost, false)}.{" "}
            {data.decision
              ? "Tests access, loyalty and diagnostic questions; financial maximin preserves cash."
              : "Information value is unpriced."}
          </span>
        </div>
        <button
          className="button primary"
          onClick={() => onNavigate("planner")}
        >
          Review response <ArrowRight size={15} />
        </button>
      </div>
      <div className="kpis">
        <Kpi
          label="Total wagered"
          value={money(totals.coin)}
          note="All play · includes replayed winnings"
        />
        <Kpi
          label="Actual house win"
          value={money(totals.win)}
          note={`${pct(totals.hold)} observed hold`}
        />
        <Kpi
          label="Expected house win"
          value={money(totals.theo)}
          note="Theo for the recorded amount of play"
        />
        <Kpi
          label="Availability"
          value={pct(totals.availability, 2)}
          note={`${number(totals.down)} unavailable machine-hours`}
        />
      </div>
      {data.decision && (
        <p className="scope-note">
          Recommendation uses a stated{" "}
          {money(data.decision.recommendation.riskCap, false)} modeled-downside
          policy, not an estimated causal ROI.{" "}
          <button
            className="text-button"
            onClick={() => onNavigate("opportunities")}
          >
            Review the Opportunity Register
          </button>
        </p>
      )}
      <Panel
        title="Items requiring attention"
        eyebrow="Fixed Jan–Jun 2025 findings; KPI cards and chart follow selected filters"
      >
        <div className="table-scroll">
          <table className="attention-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Evidence</th>
                <th>Interpretation</th>
                <th>Investigate</th>
              </tr>
            </thead>
            <tbody>
              {data.decision && (
                <tr>
                  <td>
                    <strong>Manufacturer reliability</strong>
                    <span className="status">Adjusted association</span>
                  </td>
                  <td>
                    {manufacturer.manufacturer}: {manufacturer.faults} fault
                    tickets; adjusted rate ratio{" "}
                    {number(manufacturer.adjustedRateRatio, 2)} versus{" "}
                    {data.decision.manufacturerModel.referenceManufacturer}.
                  </td>
                  <td>
                    Inspect recurrent faults. A broad sweep requires a separate
                    30-day break-even case.
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => onNavigate("opportunities")}
                    >
                      Review opportunities
                    </button>
                  </td>
                </tr>
              )}
              <tr>
                <td>
                  <strong>Back Forty demand</strong>
                  <span className="status">Observed association</span>
                </td>
                <td>
                  <b>{data.facts.backBottomCount}/10</b> low earners last placed
                  here.
                  <br />
                  {pct(data.closureRelative)} relative wager-rate change during
                  closure.
                </td>
                <td>
                  Access may explain part of the result; game mix and different
                  trends remain possible.
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("demand")}
                  >
                    Demand & location <ArrowRight size={13} />
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>{flag || "Payout results"}</strong>
                  <span className="status warning">Statistical review</span>
                </td>
                <td>
                  {data.facts.payoutFlags} negative payout flag after
                  game-variance and multiple-testing adjustment.
                </td>
                <td>
                  Inspect settings and meters. The flag does not establish a
                  defect.
                </td>
                <td>
                  <button
                    className="text-button"
                    disabled={!flag}
                    onClick={() => onFlag(flag)}
                  >
                    Review {flag || "machine"} · Jan–Jun{" "}
                    <ArrowRight size={13} />
                  </button>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Loyalty point pricing</strong>
                  <span className="status">Recorded change</span>
                </td>
                <td>
                  {number(data.loyalty[0].pointsPerFaceDollar, 2)} →{" "}
                  {number(data.loyalty.at(-1).pointsPerFaceDollar, 2)} points
                  per benefit dollar.
                </td>
                <td>
                  May shift persists after item/tier adjustment; guest response
                  is unmeasured.
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => onNavigate("loyalty")}
                  >
                    Loyalty costs <ArrowRight size={13} />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Daily gaming results" eyebrow={scope}>
        <Chart height={260}>
          <AreaChart data={trend}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              {...chartProps}
              tickFormatter={dateLabel}
              minTickGap={48}
            />
            <YAxis {...chartProps} width={70} tickFormatter={(v) => money(v)} />
            <Tooltip
              {...toolProps}
              labelFormatter={(v) => dateLabel(String(v))}
              formatter={(v: any, name: any) => [money(Number(v), false), name]}
            />
            <Legend />
            <Area
              name="Expected win (theo)"
              dataKey="theo"
              stroke="#28765b"
              fill="#28765b"
              fillOpacity={0.09}
            />
            <Area
              name="Actual house win"
              dataKey="win"
              stroke="#ab842f"
              fill="transparent"
            />
          </AreaChart>
        </Chart>
        <Insight details="House win = wagers minus payouts. Theo = wagers × configured house edge. Neither value includes complete business overhead.">
          Actual win differs from expected win by{" "}
          {money(totals.win - totals.theo, false)} in the selected scope.
        </Insight>
      </Panel>
    </>
  );
}

export function MachineView({
  data,
  rows,
  start,
  end,
  scores,
  fullScores,
  totals,
  scope,
  selected,
  onSelect,
  query,
  onQuery,
  sort,
  onSort,
  page,
  onPage,
  markers,
  view,
  onView,
  layoutDate,
  dates,
  onDate,
  onMethods,
  onPlan,
}: {
  data: Data;
  rows: Data[];
  start: string;
  end: string;
  scores: Data[];
  fullScores: Data[];
  totals: Data;
  scope: string;
  selected: number | null;
  onSelect: (id: number, focus?: boolean) => void;
  query: string;
  onQuery: (s: string) => void;
  sort: string;
  onSort: (s: string) => void;
  page: number;
  onPage: (n: number) => void;
  markers: Data[];
  view: FloorView;
  onView: (v: FloorView) => void;
  layoutDate: string;
  dates: string[];
  onDate: (d: string) => void;
  onMethods: () => void;
  onPlan: () => void;
}) {
  const chosen = scores.find((s) => s.machineIndex === selected),
    filtered = [...scores]
      .filter((s) =>
        `${s.id} ${s.theme} ${s.bank}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
      .sort((a, b) => a[sort] - b[sort]),
    lastPage = Math.max(0, Math.ceil(filtered.length / 12) - 1),
    current = Math.min(page, lastPage),
    visible = filtered.slice(current * 12, current * 12 + 12),
    selectedMap = markers.find((m) => m.machineIndex === selected),
    table = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const index = filtered.findIndex((s) => s.machineIndex === selected);
    if (index >= 0 && Math.floor(index / 12) !== current)
      onPage(Math.floor(index / 12));
  }, [selected]);
  return (
    <>
      <div className="metric-strip">
        <span>
          <b>{scores.length}</b> machines in period
        </span>
        <span>
          Lowest peer index{" "}
          <b>{number(Math.min(...scores.map((s) => s.index)), 2)}×</b>{" "}
          <MetricHelp term="index" />
        </span>
        <span>
          <b>{fullScores.filter((s) => s.z < 0 && s.q < 0.05).length}</b> payout
          flags across all machines <MetricHelp term="flag" />
        </span>
        <span>
          <b>{money(totals.rate, false, 2)}</b> theo / available hour
        </span>
      </div>
      <div className="machine-workspace">
        <Panel
          title="Casino floor"
          eyebrow={`Metrics: ${scope}`}
          className="map-panel"
        >
          <Floor
            data={data}
            markers={markers}
            selected={selected}
            view={view}
            onView={onView}
            onSelect={(id) => onSelect(id, false)}
            layoutDate={layoutDate}
            dates={dates}
            onDate={onDate}
          />
        </Panel>
        <Panel
          title={chosen ? `${chosen.id} · ${chosen.theme}` : "Machine dossier"}
          className="dossier-panel"
        >
          {chosen ? (
            <>
              <div className="dossier-summary">
                <span
                  className={
                    "status " +
                    (chosen.z < 0 && chosen.q < 0.05 ? "warning" : "")
                  }
                >
                  {chosen.z < 0 && chosen.q < 0.05
                    ? "Payout review recommended"
                    : "No adjusted negative payout flag"}
                </span>
                <p>
                  {chosen.z < 0 && chosen.q < 0.05
                    ? "Inspection is justified; malfunction is unproven."
                    : "Peer rank describes relative demand; it does not establish machine failure."}
                </p>
                <small>
                  Map:{" "}
                  {selectedMap
                    ? `${selectedMap.zone.name} · ${selectedMap.bank}`
                    : "not installed in the current layout"}
                </small>
              </div>
              <dl className="dossier-metrics">
                <div>
                  <dt>
                    House win <MetricHelp term="win" />
                  </dt>
                  <dd>{money(chosen.win, false)}</dd>
                </div>
                <div>
                  <dt>
                    Expected win <MetricHelp term="theo" />
                  </dt>
                  <dd>{money(chosen.theo, false)}</dd>
                </div>
                <div>
                  <dt>
                    Theo / available hour <MetricHelp term="rate" />
                  </dt>
                  <dd>{money(chosen.rate, false, 2)}</dd>
                </div>
                <div>
                  <dt>
                    Peer index <MetricHelp term="index" />
                  </dt>
                  <dd>{number(chosen.index, 2)}×</dd>
                </div>
                <div>
                  <dt>
                    Availability <MetricHelp term="availability" />
                  </dt>
                  <dd>{pct(chosen.availability, 2)}</dd>
                </div>
                <div>
                  <dt>Unavailable time</dt>
                  <dd>{number(chosen.down, 1)} h</dd>
                </div>
                <div>
                  <dt>Active days</dt>
                  <dd>{chosen.days}</dd>
                </div>
                <div>
                  <dt>
                    Peer rank · low to high <MetricHelp term="peer-rank" />
                  </dt>
                  <dd>
                    {chosen.peerRank} / {chosen.peerPopulation} · P
                    {number(chosen.peerPercentile, 0)}
                  </dd>
                </div>
                <div>
                  <dt>Available exposure</dt>
                  <dd>{number(chosen.support.availableHours, 1)} h</dd>
                </div>
                <div>
                  <dt>
                    Peer fallback days <MetricHelp term="peer-support" />
                  </dt>
                  <dd>
                    {chosen.support.fallbackDays} / {chosen.support.days}
                  </dd>
                </div>
              </dl>
              <MachineDimensions
                data={data}
                rows={rows}
                chosen={chosen}
                allScores={fullScores}
                start={start}
                end={end}
                costMedian={
                  [...scores]
                    .map((s) => s.costs / s.theo)
                    .sort((a, b) => a - b)[Math.floor(scores.length / 2)] || 0
                }
              />
              <details className="detail-block">
                <summary>Payout test and supplied costs</summary>
                <dl className="dossier-metrics">
                  <div>
                    <dt>
                      Selected-month z <MetricHelp term="z" />
                    </dt>
                    <dd>{number(chosen.z, 2)} σ</dd>
                  </div>
                  <div>
                    <dt>
                      Adjusted p (q) <MetricHelp term="q" />
                    </dt>
                    <dd>{chosen.q < 0.001 ? "<0.001" : number(chosen.q, 4)}</dd>
                  </div>
                  <div>
                    <dt>
                      Occupancy <MetricHelp term="occupied" />
                    </dt>
                    <dd>
                      {pct(
                        chosen.available
                          ? chosen.occupied / chosen.available
                          : null,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Contribution after supplied machine costs{" "}
                      <MetricHelp term="contribution" />
                    </dt>
                    <dd>{money(chosen.win - chosen.costs, false)}</dd>
                  </div>
                </dl>
                <p>
                  Game-math normal approximation; all machines in selected
                  months remain the testing family. Zone/bank filters do not
                  redefine z or q.
                </p>
              </details>
              <div className="dossier-actions">
                <button className="button primary" onClick={onPlan}>
                  Evaluate action
                </button>
                <button className="button secondary" onClick={onMethods}>
                  Evidence & methods
                </button>
              </div>
            </>
          ) : (
            <div className="empty">
              <strong>Select a machine</strong>
              <p>
                Click a floor marker or a table row. Search by ID, bank or game
                title.
              </p>
            </div>
          )}
        </Panel>
      </div>
      <Panel
        title="Machine comparison"
        eyebrow={`${filtered.length} matching machines · period statistics; last in-period location`}
        tools={
          <div className="table-tools">
            <label className="search">
              <Search size={15} />
              <input
                aria-label="Search machines"
                placeholder="Machine, game or bank"
                value={query}
                onChange={(e) => {
                  onQuery(e.target.value);
                  onPage(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filtered.length)
                    onSelect(filtered[0].machineIndex, true);
                }}
              />
            </label>
            <label className="inline-control">
              Sort
              <select
                aria-label="Sort machines"
                value={sort}
                onChange={(e) => {
                  onSort(e.target.value);
                  onPage(0);
                }}
              >
                <option value="win">Lowest actual win</option>
                <option value="index">Lowest peer index</option>
                <option value="z">Most negative payout residual</option>
                <option value="availability">Lowest availability</option>
              </select>
            </label>
          </div>
        }
      >
        <div className="table-scroll" ref={table}>
          <table className="machine-table">
            <thead>
              <tr>
                <th>Machine / game</th>
                <th>Last zone / bank</th>
                <th>House win</th>
                <th>
                  Theo / available h <MetricHelp term="rate" />
                </th>
                <th>
                  Peer index <MetricHelp term="index" />
                </th>
                <th>Availability</th>
                <th>
                  Payout q <MetricHelp term="q" />
                </th>
                <th>Assessment</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr
                  key={m.id}
                  data-row-machine={m.machineIndex}
                  className={m.machineIndex === selected ? "selected" : ""}
                  aria-selected={m.machineIndex === selected}
                  onClick={() => onSelect(m.machineIndex, true)}
                >
                  <td>
                    <button
                      className="table-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(m.machineIndex, true);
                      }}
                    >
                      {m.id}
                    </button>
                    <small>{m.theme}</small>
                  </td>
                  <td>
                    {m.zone.name}
                    <small>{m.bank}</small>
                  </td>
                  <td>{money(m.win, false)}</td>
                  <td>{money(m.rate, false, 2)}</td>
                  <td>{number(m.index, 2)}×</td>
                  <td>{pct(m.availability)}</td>
                  <td>{m.q < 0.001 ? "<.001" : number(m.q, 3)}</td>
                  <td>
                    <span
                      className={
                        "status " + (m.z < 0 && m.q < 0.05 ? "warning" : "")
                      }
                    >
                      {m.z < 0 && m.q < 0.05
                        ? "Inspect payout"
                        : `Peer rank ${m.peerRank}/${m.peerPopulation}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="empty">No machines match this search and scope.</p>
          )}
        </div>
        <div className="table-pagination">
          <span>
            {filtered.length
              ? `${current * 12 + 1}–${Math.min((current + 1) * 12, filtered.length)} of ${filtered.length}`
              : "0 results"}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Previous machine page"
              disabled={!current}
              onClick={() => onPage(current - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Next machine page"
              disabled={current >= lastPage}
              onClick={() => onPage(current + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}

export function DemandView({
  data,
  rows,
  scope,
  start,
  end,
  selectedZones,
  onZones,
  tab,
  onTab,
  onPlan,
}: {
  data: Data;
  rows: Data[];
  scope: string;
  start: string;
  end: string;
  selectedZones: string[];
  onZones: (ids: string[]) => void;
  tab: string;
  onTab: (s: string) => void;
  onPlan: () => void;
}) {
  const present = data.zones.filter((z: Data, i: number) =>
      rows.some((r) => r[2] === i),
    ),
    shown = present.filter((z: Data) => selectedZones.includes(z.zone_id)),
    monthly = data.months
      .filter((mo: string) => mo >= start && mo <= end)
      .map((mo: string) => {
        const out: Data = { month: mo };
        present.forEach((z: Data) => {
          const a = aggregate(
            rows.filter(
              (r) =>
                data.dates[r[0]].startsWith(mo) &&
                data.zones[r[2]].zone_id === z.zone_id,
            ),
          );
          out[z.name] = a.available ? a.coin / a.available : null;
        });
        return out;
      });
  return (
    <>
      <Panel
        title="Floor demand by zone"
        eyebrow={`${scope} · wagers per available machine-hour ($/h)`}
      >
        <div className="series-controls" aria-label="Zone chart series">
          {present.map((z: Data) => (
            <label key={z.zone_id}>
              <input
                type="checkbox"
                checked={selectedZones.includes(z.zone_id)}
                onChange={() =>
                  onZones(
                    selectedZones.includes(z.zone_id)
                      ? selectedZones.filter((id) => id !== z.zone_id)
                      : [...selectedZones, z.zone_id],
                  )
                }
              />
              <i
                style={{
                  background:
                    COLORS[
                      data.zones.findIndex((x: Data) => x.zone_id === z.zone_id)
                    ],
                }}
              />
              {z.name}
            </label>
          ))}
          <button
            className="text-button"
            onClick={() => onZones(present.map((z: Data) => z.zone_id))}
          >
            Show all
          </button>
        </div>
        {shown.length ? (
          <Chart height={285}>
            <LineChart data={monthly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={month} {...chartProps} />
              <YAxis
                {...chartProps}
                width={65}
                tickFormatter={(v) => money(v)}
              />
              <Tooltip
                {...toolProps}
                labelFormatter={(v) => month(String(v))}
                formatter={(v: any) => `${money(Number(v), false, 2)} / h`}
              />
              {shown.map((z: Data) => (
                <Line
                  key={z.zone_id}
                  dataKey={z.name}
                  name={z.name}
                  stroke={
                    COLORS[
                      data.zones.findIndex((x: Data) => x.zone_id === z.zone_id)
                    ]
                  }
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </Chart>
        ) : (
          <div className="empty">Select at least one zone series.</div>
        )}
        <Insight details="For each zone/month, sum wagers and divide by summed available machine-hours. This is play intensity, not unique visitors or a causal location effect.">
          Choose zone series to compare demand without hiding other floor
          filters.
        </Insight>
      </Panel>
      <Panel
        title="Back Forty walkway investigation"
        eyebrow="Fixed audit · Jan 1–Jun 30 · walkway closed Mar 3–Apr 6"
        tools={
          <button className="button secondary" onClick={onPlan}>
            Evaluate location test
          </button>
        }
      >
        <div className="closure-summary">
          <strong>{pct(data.closureRelative)}</strong>
          <p>
            Relative change in Back Forty wagers per available hour during
            closure, compared with the remaining floor.{" "}
            <b>Association; causation is not established.</b>
          </p>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Back Forty ($ / available h)</th>
                <th>Other floor ($ / available h)</th>
              </tr>
            </thead>
            <tbody>
              {data.closures.map((c: Data) => (
                <tr key={c.phase}>
                  <td>
                    {c.phase}
                    <small>
                      {dateLabel(c.start)}–{dateLabel(c.end)}
                    </small>
                  </td>
                  <td>{money(c.backRate, false, 2)}</td>
                  <td>{money(c.otherRate, false, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Insight details="(Back Forty during/before) ÷ (other floor during/before) − 1. Parallel trends are unverified; game mix, events and local trends remain competing explanations.">
          This fixed comparison does not change with the month, bank or zone
          filters above.
        </Insight>
      </Panel>
      <Panel
        title="Supporting location evidence"
        tools={
          <div className="tabs" role="tablist" aria-label="Demand context">
            {[
              ["traffic", "Traffic"],
              ["moves", "Relocations"],
              ["events", "Events & weather"],
            ].map(([id, label]) => (
              <button
                role="tab"
                aria-selected={tab === id}
                key={id}
                onClick={() => onTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <div role="tabpanel">
          {tab === "traffic" && (
            <>
              <p className="context-label">
                Selected months · whole-zone counters; bank filtering does not
                apply
              </p>
              <Chart>
                <BarChart
                  layout="vertical"
                  data={data.zones.map((z: Data) => {
                    const ts = data.traffic.filter(
                      (t: Data) =>
                        t.zone_id === z.zone_id &&
                        t.month >= start &&
                        t.month <= end,
                    );
                    return {
                      name: z.name,
                      rate:
                        ts.reduce((s: number, t: Data) => s + t.entries, 0) /
                        (ts.reduce(
                          (s: number, t: Data) => s + t.coverageMinutes,
                          0,
                        ) /
                          60),
                    };
                  })}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" {...chartProps} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    {...chartProps}
                  />
                  <Tooltip
                    {...toolProps}
                    formatter={(v: any) =>
                      `${number(Number(v), 1)} crossings / covered h`
                    }
                  />
                  <Bar
                    dataKey="rate"
                    name="Crossings / covered sensor-hour"
                    fill="#4f876d"
                    radius={[0, 3, 3, 0]}
                  />
                </BarChart>
              </Chart>
              <Insight details="Observed entries divided by covered sensor-hours. Missing counts are not treated as zero.">
                Crossings per covered sensor-hour are movements, not unique
                guests.
              </Insight>
            </>
          )}
          {tab === "moves" && (
            <>
              <p className="context-label">
                Fixed Jan–Jun audit · up to 28 days before/after each recorded
                move
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Machine / move date</th>
                      <th>From → to</th>
                      <th>Before theo / available h</th>
                      <th>After theo / available h</th>
                      <th>Peer index before → after</th>
                      <th>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.moves.map((m: Data) => (
                      <tr key={m.machine}>
                        <td>
                          {m.machine}
                          <small>{dateLabel(m.date)}</small>
                        </td>
                        <td>
                          {m.beforeZone} → {m.afterZone}
                        </td>
                        <td>{money(m.beforeRate, false, 2)}</td>
                        <td>{money(m.afterRate, false, 2)}</td>
                        <td>
                          {number(m.beforeIndex, 2)}× →{" "}
                          {number(m.afterIndex, 2)}×
                        </td>
                        <td>
                          {m.beforeDays} / {m.afterDays}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Insight>
                Four non-random moves cannot identify a general relocation
                uplift; one has only 21 post-move days.
              </Insight>
            </>
          )}
          {tab === "events" && (
            <div className="two-columns">
              <div>
                <h3 className="subheading">Event-day wager comparison</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Event</th>
                        <th>Relative difference</th>
                        <th>Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.events
                        .filter(
                          (e: Data) =>
                            e.start.slice(0, 7) <= end &&
                            e.end.slice(0, 7) >= start,
                        )
                        .map((e: Data) => (
                          <tr key={e.name}>
                            <td>
                              {e.name}
                              <small>
                                {dateLabel(e.start)} · {e.scope}
                              </small>
                            </td>
                            <td>{pct(e.relativeRate)}</td>
                            <td>{e.days}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <Insight details="Event-day actual wagers divided by expected wagers from same-month/same-weekday non-event rates, scaled to event-day available hours. Full event estimates are shown for events overlapping the selected months.">
                  Associations only; events can coincide with other changes.
                </Insight>
              </div>
              <div>
                <h3 className="subheading">NOAA weather context</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Calendar month</th>
                        <th>Mean daily max</th>
                        <th>Rain</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.weather
                        .filter((w: Data) => w.month >= start && w.month <= end)
                        .map((w: Data) => (
                          <tr key={w.month}>
                            <td>{month(w.month)} 2025</td>
                            <td>{number(w.meanDailyMaxC, 1)} °C</td>
                            <td>{number(w.rainMm, 1)} mm</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <Insight>
                  Real NOAA USW00023169 observations; calendar dates differ from
                  gaming days. Weather is excluded from the forecast.
                </Insight>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}

export function OperationsView({
  data,
  totals,
  trend,
  zoneScores,
  scope,
  onPlan,
}: {
  data: Data;
  totals: Data;
  trend: Data[];
  zoneScores: Data[];
  scope: string;
  onPlan: () => void;
}) {
  return (
    <>
      <div className="kpis">
        <Kpi
          label="Meter downtime"
          value={`${number(totals.down)} h`}
          note="Measured scheduled minus available time"
        />
        <Kpi
          label="Forgone wager proxy"
          value={money(totals.lostCoin)}
          note="Estimated play opportunity; not revenue"
        />
        <Kpi
          label="Forgone theo proxy"
          value={money(totals.lostTheo)}
          note="Estimated expected-win opportunity"
        />
        <Kpi
          label="50–150% rate sensitivity"
          value={`${money(totals.lostTheo * 0.5)}–${money(totals.lostTheo * 1.5)}`}
          note="Assumption range, not a confidence interval"
        />
      </div>
      <div className="two-columns">
        <Panel title="Unavailable machine-hours by day" eyebrow={scope}>
          <Chart>
            <BarChart data={trend}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                {...chartProps}
                tickFormatter={dateLabel}
                minTickGap={40}
              />
              <YAxis {...chartProps} tickFormatter={(v) => `${v} h`} />
              <Tooltip
                {...toolProps}
                labelFormatter={(v) => dateLabel(String(v))}
                formatter={(v: any) => `${number(Number(v), 1)} machine-hours`}
              />
              <Bar dataKey="down" name="Unavailable hours" fill="#b08b3b" />
            </BarChart>
          </Chart>
          <Insight>
            Meter hours are measured. Estimated revenue opportunity can differ
            because guests may switch machines.
          </Insight>
        </Panel>
        <Panel
          title="Estimated downtime opportunity by zone"
          eyebrow="Theo dollars · selected scope"
        >
          <Chart>
            <BarChart
              data={[...zoneScores].sort((a, b) => b.lostTheo - a.lostTheo)}
              layout="vertical"
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                {...chartProps}
                tickFormatter={(v) => money(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={115}
                {...chartProps}
              />
              <Tooltip
                {...toolProps}
                formatter={(v: any) => money(Number(v), false)}
              />
              <Bar
                dataKey="lostTheo"
                name="Forgone theo proxy"
                fill="#4f876d"
                radius={[0, 3, 3, 0]}
              />
            </BarChart>
          </Chart>
          <Insight details="Exact downtime × leave-machine-out matched peer theo per available hour. Outages are not random and substitution is unmeasured.">
            Use a realistically recoverable share when comparing an action’s
            cost.
          </Insight>
        </Panel>
      </div>
      <div className="two-columns">
        <Panel
          title="Repair queue and work duration"
          eyebrow="Fixed Jan–Jun ticket audit"
          tools={
            <button className="text-button" onClick={onPlan}>
              Evaluate staffing / maintenance <ArrowRight size={13} />
            </button>
          }
        >
          <dl className="dossier-metrics">
            <div>
              <dt>Fault repair tickets</dt>
              <dd>{number(data.operations.tickets)}</dd>
            </div>
            <div>
              <dt>
                Queued ticket-hours <MetricHelp term="queue" />
              </dt>
              <dd>{number(data.operations.waitHours, 1)} h</dd>
            </div>
            <div>
              <dt>Hands-on repair hours</dt>
              <dd>{number(data.operations.repairHours, 1)} h</dd>
            </div>
            <div>
              <dt>Median queue wait</dt>
              <dd>{number(data.operations.medianWait, 1)} h</dd>
            </div>
            <div>
              <dt>Median hands-on repair</dt>
              <dd>{number(data.operations.medianRepair, 1)} h</dd>
            </div>
          </dl>
          <Insight>
            Ticket durations can overlap and are not added to meter downtime.
          </Insight>
        </Panel>
        <Panel
          title="Unavailable hours by local clock hour"
          eyebrow="Fixed Jan–Jun hourly meter audit"
        >
          <Chart>
            <BarChart data={data.hourly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="local_hour" {...chartProps} />
              <YAxis {...chartProps} tickFormatter={(v) => `${v} h`} />
              <Tooltip
                {...toolProps}
                labelFormatter={(v) => `${v}:00 local`}
                formatter={(v: any) =>
                  `${number(Number(v), 1)} unavailable machine-hours`
                }
              />
              <Bar dataKey="down" name="Unavailable hours" fill="#668294" />
            </BarChart>
          </Chart>
          <Insight>
            Hourly meters reconcile with daily downtime; clock hour is Las Vegas
            local time.
          </Insight>
        </Panel>
      </div>
    </>
  );
}

export function GuestsView({
  data,
  guest,
  group,
  onGroup,
}: {
  data: Data;
  guest: Data;
  group: string;
  onGroup: (s: string) => void;
}) {
  return (
    <>
      <div className="guest-filter">
        <label htmlFor="guest-group">
          Guest group
          <select
            id="guest-group"
            value={group}
            onChange={(e) => onGroup(e.target.value)}
          >
            <option value="all|All tracked guests">All tracked guests</option>
            {Object.entries(data.guestGroups).map(
              ([dim, values]: [string, any]) => (
                <optgroup
                  key={dim}
                  label={dim === "home_region" ? "Home region" : "Opening tier"}
                >
                  {values.map((v: string) => (
                    <option key={v} value={`${dim}|${v}`}>
                      {v}
                    </option>
                  ))}
                </optgroup>
              ),
            )}
          </select>
        </label>
        <span>
          {number(guest.players)} tracked gamblers · {guest.group}
        </span>
      </div>
      <div className="kpis">
        <Kpi
          label="Tracked wagers"
          value={money(guest.wagers)}
          note="Carded play, including replayed winnings"
        />
        <Kpi
          label="Tracked game payouts"
          value={money(guest.payout)}
          note="Game returns, not player profit"
        />
        <Kpi
          label="Tracked player net"
          value={money(guest.net)}
          note="Payouts minus wagers · player perspective"
        />
        <Kpi
          label="Players finishing ahead"
          value={pct(guest.players ? guest.ahead / guest.players : null)}
          note={`${number(guest.ahead)} / ${number(guest.players)} tracked gamblers`}
        />
      </div>
      <div className="two-columns">
        <Panel
          title="Wager concentration"
          eyebrow="Tracked gamblers ranked by total wagers"
        >
          <Chart height={300}>
            <ComposedChart
              data={[0, 0.01, 0.05, 0.1, 0.2, 0.5, 1].map((q, i) => ({
                players: q * 100,
                wagers: i ? guest.wagerConcentration[i - 1] * 100 : 0,
                equal: q * 100,
              }))}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="players"
                type="number"
                domain={[0, 100]}
                {...chartProps}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: "Top share of ranked gamblers (%)",
                  position: "insideBottom",
                  offset: -8,
                  fontSize: 12,
                }}
                height={42}
              />
              <YAxis
                domain={[0, 100]}
                {...chartProps}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: "Cumulative wager share (%)",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
                width={75}
              />
              <Tooltip
                {...toolProps}
                labelFormatter={(v) => `Top ${v}% of tracked gamblers`}
                formatter={(v: any) => `${number(Number(v), 1)}%`}
              />
              <Area
                name="Wager share"
                dataKey="wagers"
                stroke="#28765b"
                fill="#28765b"
                fillOpacity={0.12}
              />
              <Line
                name="Equal share"
                dataKey="equal"
                stroke="#8e9d91"
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </Chart>
          <Insight>
            The top 10% by recorded wagers account for{" "}
            {pct(guest.wagerConcentration[2])} of this group’s tracked play.
          </Insight>
        </Panel>
        <Panel title="Outcome distribution" eyebrow={guest.group}>
          <dl className="dossier-metrics">
            <div>
              <dt>
                Median tracked player net <MetricHelp term="median" />
              </dt>
              <dd>{money(guest.medianNet, false)}</dd>
            </div>
            <div>
              <dt>
                Top 10% share of tracked wagers{" "}
                <MetricHelp term="concentration" />
              </dt>
              <dd>{pct(guest.wagerConcentration[2])}</dd>
            </div>
            <div>
              <dt>
                Top 10% share of positive gaming losses{" "}
                <MetricHelp term="positive-loss" />
              </dt>
              <dd>{pct(guest.top10LossShare)}</dd>
            </div>
            <div>
              <dt>
                Accounts with recorded activity <MetricHelp term="accounts" />
              </dt>
              <dd>{number(guest.accounts)}</dd>
            </div>
            <div>
              <dt>
                Tracked contribution <MetricHelp term="contribution" />
              </dt>
              <dd>{money(guest.contribution, false)}</dd>
            </div>
          </dl>
          <Insight details="Regroup players across the selected months before ranking. Loss concentration ranks max(−net,0) separately from wagering; winners do not offset that denominator. Contribution includes linked POS cash minus cogs, counting comps once.">
            Carded outcomes are incomplete. Loss concentration is not a reason
            to encourage high-loss guests to gamble more.
          </Insight>
        </Panel>
      </div>
    </>
  );
}

export function LoyaltyView({
  data,
  period,
  start,
  end,
  showMix,
  onMix,
  onPlan,
}: {
  data: Data;
  period: Data[];
  start: string;
  end: string;
  showMix: boolean;
  onMix: (v: boolean) => void;
  onPlan: () => void;
}) {
  const rows = data.loyalty.filter(
      (r: Data) => r.month >= start && r.month <= end,
    ),
    cost = period.reduce((s, r) => s + r.comp_cost_usd, 0),
    theo = period.reduce((s, r) => s + r.theo_usd, 0);
  return (
    <>
      <div className="kpis">
        <Kpi
          label="Redeemed economic cost"
          value={money(cost)}
          note="Included once in POS cost of goods"
        />
        <Kpi
          label="Redeemed menu value"
          value={money(period.reduce((s, r) => s + r.comp_face_value_usd, 0))}
          note="Face value, not cash revenue"
        />
        <Kpi
          label="Comp reinvestment"
          value={pct(theo ? cost / theo : null, 2)}
          note="Economic comp cost / all-play theo"
        />
        <Kpi
          label="Redeemed benefits"
          value={number(
            rows.reduce((s: number, r: Data) => s + r.redemptions, 0),
          )}
          note="One ledger event per linked POS redemption"
        />
      </div>
      <div className="two-columns">
        <Panel
          title="Monthly loyalty cost and menu value"
          eyebrow="Selected months · whole property"
        >
          <Chart>
            <BarChart data={rows}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={month} {...chartProps} />
              <YAxis
                {...chartProps}
                tickFormatter={(v) => money(v)}
                width={65}
              />
              <Tooltip
                {...toolProps}
                labelFormatter={(v) => month(String(v))}
                formatter={(v: any) => money(Number(v), false)}
              />
              <Legend />
              <Bar dataKey="cost" name="Economic cost" fill="#397c5d" />
              <Bar dataKey="face" name="Menu value" fill="#cfbf94" />
            </BarChart>
          </Chart>
          <Insight>
            Economic cost is {money(cost, false)} for the selected months; menu
            value is a different measure.
          </Insight>
        </Panel>
        <Panel
          title="Points charged per benefit dollar"
          eyebrow="Points redeemed / benefit face-value dollars"
          tools={
            <div className="check-control">
              <label>
                <input
                  type="checkbox"
                  checked={showMix}
                  onChange={(e) => onMix(e.target.checked)}
                />
                Fixed mix comparison
              </label>
              <MetricHelp term="standardization" />
            </div>
          }
        >
          <Chart>
            <LineChart data={rows}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={month} {...chartProps} />
              <YAxis {...chartProps} />
              <Tooltip
                {...toolProps}
                labelFormatter={(v) => month(String(v))}
                formatter={(v: any) => `${number(Number(v), 2)} points / $`}
              />
              <Legend />
              <Line
                dataKey="pointsPerFaceDollar"
                name="Realized point price"
                stroke="#a67c23"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              {showMix && (
                <Line
                  dataKey="standardizedPoints"
                  name="Fixed January item/tier mix"
                  stroke="#2b7758"
                  strokeDasharray="4 3"
                  dot={{ r: 3 }}
                />
              )}
            </LineChart>
          </Chart>
          <Insight
            details={`Standardized comparison uses January face-dollar weights across ${data.loyalty[0].standardizedCells} item × tier cells with at least 20 redemptions every month. It controls composition, not guest response.`}
          >
            {rows.length > 1
              ? `${month(rows[0].month)} → ${month(rows.at(-1).month)}: ${number(rows[0].pointsPerFaceDollar, 2)} → ${number(rows.at(-1).pointsPerFaceDollar, 2)} points per benefit dollar.`
              : `${month(rows[0].month)}: ${number(rows[0].pointsPerFaceDollar, 2)} points per benefit dollar.`}{" "}
            Lower point prices do not establish a profitable policy change.
          </Insight>
        </Panel>
      </div>
      <details className="detail-block accounting-detail">
        <summary>Cost reconciliation and composition adjustment</summary>
        <p>
          Every ledger redemption links one-to-one to a POS ticket, and recorded
          economic cost equals linked cost of goods. Contribution subtracts POS
          cogs once; comp cost is not subtracted again. Full-period totals
          reconcile to property records.
        </p>
        <p>
          The fixed item/tier comparison retains the May shift. It represents
          the supported cells and does not identify behavior, unused points
          liability or a causal policy effect.
        </p>
        <button className="button secondary" onClick={onPlan}>
          Evaluate a controlled policy test
        </button>
      </details>
    </>
  );
}

export function MethodsView({ data }: { data: Data }) {
  const m = data.model;
  return (
    <>
      <div className="model-strip">
        <div>
          <span>Validated model</span>
          <strong>{m.name}</strong>
        </div>
        <div>
          <span>Model selection</span>
          <strong>Jan–Mar → April</strong>
        </div>
        <div>
          <span>Final training</span>
          <strong>Jan 1–Apr 30 · {m.trainDays} days</strong>
        </div>
        <div>
          <span>Frozen holdout</span>
          <strong>May 1–Jun 30 · {m.testDays} days</strong>
        </div>
      </div>
      <div className="kpis">
        <Kpi
          label="Model holdout MAE"
          value={money(m.mae, false)}
          note="Average absolute daily-wager error"
        />
        <Kpi
          label="Constant baseline MAE"
          value={money(m.baselineMae, false)}
          note="Frozen Jan–Apr overall daily mean"
        />
        <Kpi
          label="MAE reduction"
          value={pct(m.improvement)}
          note="Forecast accuracy, not a profit increase"
        />
        <Kpi
          label="Paired improvement interval"
          value={`${money(m.improvementUsdCI[0])}–${money(m.improvementUsdCI[1])}`}
          note="95% interval · MAE improvement in $/day"
        />
      </div>
      <Panel
        title="Demand forecast and model validation"
        eyebrow="May–June holdout · whole-floor daily wagers"
      >
        <Chart height={300}>
          <LineChart data={m.points}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              {...chartProps}
              tickFormatter={dateLabel}
              minTickGap={40}
            />
            <YAxis {...chartProps} width={70} tickFormatter={(v) => money(v)} />
            <Tooltip
              {...toolProps}
              labelFormatter={(v) => dateLabel(String(v))}
              formatter={(v: any) => money(Number(v), false)}
            />
            <Legend />
            <Line
              dataKey="actual"
              name="Actual wagers"
              stroke="#234c38"
              dot={false}
              strokeWidth={2}
            />
            <Line
              dataKey="model"
              name="Weekday forecast"
              stroke="#b08324"
              dot={false}
            />
            <Line
              dataKey="baseline"
              name="Constant baseline"
              stroke="#8e9d91"
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </Chart>
        <Insight
          details={`Inner April MAE: full weekday mean ${money(m.innerValidation["Weekday mean"], false)}, recent-eight-week mean ${money(m.innerValidation["Recent 8-week weekday mean"], false)}. Select before May–June; refit through April 30 and freeze every prediction. Paired circular seven-day bootstrap: 2,000 draws, seed 2026. No holdout lags, future repairs, weather or later tourism revisions are used.`}
        >
          The weekday forecast outperforms the constant baseline on this
          holdout; July accuracy and action returns remain unvalidated.
        </Insight>
      </Panel>
      <Panel
        title="Recommendation evidence"
        eyebrow="Fixed Jan–Jun findings · calculations are reproducible"
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Finding / result</th>
                <th>Source and calculation</th>
                <th>Alternative / limitation</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {data.facts.backBottomCount}/10 low earners last in Back Forty
                </td>
                <td>
                  Prepared daily; sum active house win, join last location
                </td>
                <td>Short exposure, game mix and location confound raw rank</td>
                <td>Investigate before replacing</td>
              </tr>
              <tr>
                <td>Closure relative rate {pct(data.closureRelative)}</td>
                <td>Daily available-hour wager rate ratios + floor_walkways</td>
                <td>Parallel trends unverified; association only</td>
                <td>Controlled access test</td>
              </tr>
              <tr>
                <td>{data.facts.payoutFlags} negative payout flag</td>
                <td>
                  Machine-day bet² × game variance; normal tails + BH adjustment
                </td>
                <td>
                  Heavy-tail and dependence assumptions; not proof of defect
                </td>
                <td>Inspect settings and meters</td>
              </tr>
              <tr>
                <td>{money(data.facts.lostTheo)} downtime theo opportunity</td>
                <td>Scheduled minus available × matched peer rate</td>
                <td>Substitution and nonrandom outage timing</td>
                <td>Compare recoverable gain with cost</td>
              </tr>
              <tr>
                <td>May point-price shift</td>
                <td>Ledger / linked POS; fixed January item-tier weights</td>
                <td>Supported cells only; behavioral effect unidentified</td>
                <td>Controlled comp-policy pilot</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="doc-links">
          {[
            ["CLAIMS_AND_EVIDENCE.md", "Claims & Evidence"],
            ["METHODOLOGY.md", "Methodology"],
            [
              "DATA_SCIENCE_AND_TECHNICAL_REPORT.md",
              "Full data science report",
            ],
            ["AI_DISCLOSURE.md", "AI disclosure"],
            ["LIMITATIONS.md", "Limitations"],
            ["SUBMISSION.md", "Submission materials"],
          ].map(([file, label]) => (
            <a
              key={file}
              href={"/docs/" + file}
              target="_blank"
              rel="noreferrer"
            >
              {label} ↗
            </a>
          ))}
        </div>
      </Panel>
      <ScientificReference data={data} />
      <AuditDiagnostics />
      <MethodReference />
      <details className="detail-block">
        <summary>
          {data.checks.length} executed data checks and release status
        </summary>
        <ul>
          {data.checks.map((c: Data) => (
            <li key={c.name}>
              {c.passed ? "PASS" : "FAIL"} · {c.name}
            </li>
          ))}
        </ul>
        <p>
          Source {data.version} is a synthetic draft. Organizer calibration and
          some publisher evidence remain missing; raw restricted tables and
          player identities are excluded.
        </p>
      </details>
    </>
  );
}
