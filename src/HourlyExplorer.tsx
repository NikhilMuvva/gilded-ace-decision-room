import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Panel, Note, Chart, money, number, pct, download, chartProps, toolProps, type Data } from "./ui";
import { MetricHelp } from "./Help";
import { hourProfile, maintenanceWindows } from "./hourly.mjs";

export function HourlyExplorer({ data, start, end, zone, bank, scope, setScope, result, setResult, onNavigate }: {
  data: Data; start: string; end: string; zone: string; bank: string; scope: Data;
  setScope: (next: Data) => void; result: Data; setResult: (value: Data) => void; onNavigate: (page: string) => void;
}) {
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const request = { start, end, zone, bank, machineIds: scope.groupBy === "machine" ? scope.machineIds : [],
    groupBy: scope.groupBy, dayType: scope.dayType, hour: scope.hour === "all" ? "all" : Number(scope.hour) };
  const controller = useRef<AbortController | null>(null);
  const change = (patch: Data) => setScope({ ...scope, ...patch });
  const run = async () => {
    controller.current?.abort(); const current = new AbortController(); controller.current = current;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/hourly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal: current.signal });
      const value = await response.json();
      if (!response.ok || value.mode !== "database" || !Array.isArray(value.rows)) throw Error(value.error || "A verified database result was not returned.");
      if (!current.signal.aborted) setResult(value);
    } catch (e) {
      if (!current.signal.aborted) { setResult(null); setError(e instanceof Error ? e.message : "Hourly query could not complete."); }
    } finally { if (!current.signal.aborted) setLoading(false); }
  };
  useEffect(() => { if (!result) void run(); return () => controller.current?.abort(); }, []);
  const stale = result && JSON.stringify(result.filters) !== JSON.stringify(request);
  const groups: string[] = result ? [...new Set<string>(result.rows.map((r: Data) => r.entity))].sort() : [];
  const chosen = groups.includes(scope.compare[0]) ? scope.compare[0] : groups[0];
  const second = groups.includes(scope.compare[1]) ? scope.compare[1] : groups.find((g) => g !== chosen);
  const label = (id: string) => data.zones.find((z: Data) => z.zone_id === id)?.name || id;
  const window = result && chosen ? maintenanceWindows(result.rows, chosen, scope.duration) : null;
  const selectedWindow = window?.windows.find((w: Data) => w.start === scope.windowStart) || window?.low;
  const profiles: Data = result ? Object.fromEntries(groups.map((id) => [id, hourProfile(result.rows, id)])) : {};
  const chart = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`,
    first: profiles[chosen]?.[hour]?.[scope.metric] ?? null, second: profiles[second]?.[hour]?.[scope.metric] ?? null }));
  const maximum = Math.max(0.001, ...Object.values(profiles).flatMap((p: Data) => p.map((h: Data) => h[scope.metric] || 0)));
  return <>
    <p className="fixed-scope">Historical January–June 2025 · Tiger Data query · Las Vegas local clock · 06:00 gaming-day boundary · not live casino monitoring</p>
    <Panel title="Tiger Data Hourly Operations Explorer" eyebrow="Schedule work around productive gaming time">
      <div className="hourly-controls">
        <label>Compare by<select aria-label="Hourly grouping" value={scope.groupBy} onChange={(e) => change({ groupBy: e.target.value, compare: ["", ""] })}>
          <option value="zone">Zone</option><option value="bank">Bank</option><option value="machine">Selected machines</option>
        </select></label>
        <label>Gaming-day type<select aria-label="Hourly day type" value={scope.dayType} onChange={(e) => change({ dayType: e.target.value })}>
          <option value="all">Weekday and weekend</option><option value="weekday">Weekday only</option><option value="weekend">Weekend only</option>
        </select></label>
        <label>Clock hour<select aria-label="Hourly clock hour" value={scope.hour} onChange={(e) => change({ hour: e.target.value })}>
          <option value="all">All 24 clock hours</option>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
        </select></label>
        <label>Heatmap metric<select aria-label="Hourly metric" value={scope.metric} onChange={(e) => change({ metric: e.target.value })}>
          <option value="utilization">Occupancy / available time</option><option value="theoPerAvailableHour">Theo / available machine-hour</option>
        </select></label>
        {scope.groupBy === "machine" && [0, 1].map((slot) => <label key={slot}>Machine {slot + 1}<select aria-label={`Hourly machine ${slot + 1}`} value={scope.machineIds[slot] || ""} onChange={(e) => {
          const ids = [...scope.machineIds]; ids[slot] = e.target.value; change({ machineIds: ids.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i), compare: ["", ""] });
        }}><option value="">Choose machine</option>{data.machines.map((m: Data) => <option key={m.id} value={m.id}>{m.id} · {m.theme}</option>)}</select></label>)}
        <button className="button primary" disabled={loading || (scope.groupBy === "machine" && !scope.machineIds.length)} onClick={() => void run()}>{loading ? "Querying…" : "Query Tiger Data"}</button>
      </div>
      <p>Month, zone and bank controls above apply to the database query. Historical placements determine each observation's zone/configuration. Machine selection never reassigns its past play to its current location.</p>
      {stale && <p role="status" className="scope-note">Filters changed. Run a new query before using these earlier results.</p>}
      {error && <div role="alert" className="scope-note"><strong>Tiger Data unavailable.</strong> {error} No static reference has been relabeled as a database response. <button className="text-button" onClick={() => onNavigate("downtime")}>Open the existing availability investigation</button></div>}
      {result && <p className="scope-note">Source: {result.source} · {result.environment} · {result.service} · {number(result.importedRows)} verified imported records · {result.queryRelation} · {result.cached ? "cached historical query" : `${number(result.queryElapsedMs)} ms server request`} · {result.rows.length} result cells. Queried {new Date(result.queriedAt).toLocaleString()}. Applied period: {result.filters.start} through {result.filters.end}; zone {result.filters.zone}, bank {result.filters.bank}.</p>}
      {result?.tlsTrust === "provisional-development" && <p role="status" className="scope-note">Development service: certificate and hostname checks are enabled, using the owner's provisionally trusted CA. Its fingerprint still needs independent Tiger Data confirmation before production use.</p>}
      <Note>The copilot's existing evidence tools describe the validated dashboard. They do not execute Tiger SQL or automatically read this explorer's query results.</Note>
    </Panel>
    {result && !stale && <>
      {!groups.length ? <Panel title="No matching historical observations"><p>Try another period, placement or machine. Missing observations are not zero demand.</p></Panel> : <>
        <Panel title="Historical hour-of-day heatmap" eyebrow={scope.metric === "utilization" ? "Occupied / available seconds · darker means more occupied" : "USD theo / available machine-hour · darker means higher productive rate"}>
          <div className="table-wrap"><table className="hourly-heatmap"><thead><tr><th>{result.filters.groupBy}</th>{Array.from({ length: 24 }, (_, h) => <th key={h}>{String(h).padStart(2, "0")}</th>)}</tr></thead><tbody>
            {groups.map((id) => <tr key={id}><th>{label(id)}</th>{profiles[id].map((h: Data) => <td key={h.hour}><button
              aria-label={`${label(id)} ${h.hour}:00 ${h[scope.metric] === null ? "no available-time support" : scope.metric === "utilization" ? pct(h.utilization) : money(h.theoPerAvailableHour, false, 2)}`}
              style={{ backgroundColor: h[scope.metric] === null ? "transparent" : `hsl(153 28% ${96 - 45 * h[scope.metric] / maximum}%)` }}
              onClick={() => change({ compare: [id, second === id ? "" : second], windowStart: h.hour })}>
              {h[scope.metric] === null ? "—" : scope.metric === "utilization" ? pct(h.utilization, 0) : money(h.theoPerAvailableHour, false)}
            </button></td>)}</tr>)}
          </tbody></table></div>
          <Note>Blank means no usable available-time denominator. Rates are ratios of sums, not averages of daily percentages. Weekend means Saturday/Sunday gaming date, including the following 00:00–05:00 hours.</Note>
        </Panel>
        <Panel title="Compare historical demand patterns">
          <div className="hourly-controls">{[0, 1].map((slot) => <label key={slot}>Profile {slot + 1}<select aria-label={`Hourly comparison ${slot + 1}`} value={(slot ? second : chosen) || ""} onChange={(e) => { const ids = [chosen, second]; ids[slot] = e.target.value; change({ compare: ids }); }}>
            {groups.map((id) => <option key={id} value={id}>{label(id)}</option>)}</select></label>)}</div>
          <Chart><LineChart data={chart} {...chartProps}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="hour" interval={3} /><YAxis tickFormatter={(v) => scope.metric === "utilization" ? pct(v, 0) : money(v)} /><Tooltip {...toolProps} /><Legend /><Line dataKey="first" name={label(chosen)} stroke="#397768" dot={false} connectNulls={false} /><Line dataKey="second" name={label(second || "")} stroke="#c28a32" dot={false} connectNulls={false} /></LineChart></Chart>
          <div className="table-wrap"><table><thead><tr><th>Entity / gaming-day type</th><th>Occupied / available</th><th>Theo / available hour</th><th>Machine-hour observations</th></tr></thead><tbody>
            {[...new Set([chosen, second].filter(Boolean))].flatMap((id) => [false, true].map((weekend) => {
              const rows = result.rows.filter((r: Data) => r.entity === id && r.weekend === weekend);
              const available = rows.reduce((s: number, r: Data) => s + r.availableHours, 0), occupied = rows.reduce((s: number, r: Data) => s + r.occupiedHours, 0), theo = rows.reduce((s: number, r: Data) => s + r.theoUsd, 0);
              return <tr key={id + String(weekend)}><td>{label(id)} · {weekend ? "Weekend" : "Weekday"}</td><td>{available ? pct(occupied / available) : "—"}</td><td>{available ? money(theo / available, false, 2) : "—"}</td><td>{number(rows.reduce((s: number, r: Data) => s + r.records, 0))}</td></tr>;
            }))}
          </tbody></table></div>
        </Panel>
        <Panel title="Maintenance opportunity: lower disruption, not promised earnings">
          <div className="hourly-controls"><label>Nominal window duration<select aria-label="Maintenance window hours" value={scope.duration} onChange={(e) => change({ duration: Number(e.target.value) })}>{[1, 2, 3, 4].map((h) => <option key={h} value={h}>{h} hours</option>)}</select></label>
            <label>Inspect clock-hour template<select aria-label="Maintenance start hour" value={selectedWindow?.start ?? ""} onChange={(e) => change({ windowStart: Number(e.target.value) })}>{window?.windows.map((w: Data) => <option key={w.start} value={w.start}>{w.start}:00–{w.end}:00</option>)}</select></label></div>
          {selectedWindow && window?.low && window.high ? <>
            <p><strong>{label(chosen)}: {selectedWindow.start}:00–{selectedWindow.end}:00 local</strong> · estimated theo opportunity debit <b>{money(selectedWindow.theoDebitPerRepresentativeMachine, false, 2)}</b> per representative machine. Least-demand template: {window.low.start}:00–{window.low.end}:00, {money(window.low.theoDebitPerRepresentativeMachine, false, 2)}; highest-demand template: {window.high.start}:00–{window.high.end}:00, {money(window.high.theoDebitPerRepresentativeMachine, false, 2)}.</p>
            <p>Minimum available-hour support across the chosen clock hours: {number(selectedWindow.minimumAvailableHourSupport, 1)} hours; minimum source observations: {number(selectedWindow.minimumRecords)}. For a bank or zone this is an exposure-weighted representative machine, not a priced full-bank outage. Query individual targets before planning work.</p>
          </> : <p>Insufficient available-time coverage for a complete window. Query all hours or broaden historical support; missing hours are not free maintenance.</p>}
          <Note>Validate crew/parts availability, guest access, lead days and actual elapsed time. Relocations remain fixed to the catalog's 06:00 boundary. Spring-forward 02:00 does not exist on March 9; these are nominal local clock-hour templates, not scheduled elapsed-time guarantees. Guests may switch machines or return later; lower historical theo debit is not incremental causal profit.</Note>
          <div className="plan-buttons"><button className="button secondary" onClick={() => onNavigate("downtime")}>Inspect availability evidence</button><button className="button secondary" onClick={() => onNavigate("planner")}>Open action planner</button><button className="button secondary" onClick={() => download("gilded-ace-hourly-evidence.json", { ...result, frontendSelections: scope, selectedWindow })}>Export hourly evidence</button></div>
          <p><MetricHelp term="theo" /> <MetricHelp term="occupancy" /> <a href="/docs/TIGER_DATA_SETUP.md" target="_blank" rel="noreferrer">Tiger Data methods and verification</a></p>
        </Panel>
      </>}
    </>}
  </>;
}
